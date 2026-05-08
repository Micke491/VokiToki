package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func GetMyProfile(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
		}
		return
	}

	now := time.Now()
	cursor, err := db.StoryCollection.Find(ctx, bson.M{
		"userId":    authUser.ID,
		"expiresAt": bson.M{"$gt": now},
	}, options.Find().SetSort(bson.M{"createdAt": -1}))

	var stories []bson.M
	if err == nil {
		var rawStories []models.Story
		if err := cursor.All(ctx, &rawStories); err == nil {
			for _, s := range rawStories {
				viewedBy := make([]bson.M, 0, len(s.ViewedBy))
				for _, v := range s.ViewedBy {
					var viewerUser models.User
					opts := options.FindOne().SetProjection(bson.M{"username": 1, "avatar": 1})
					viewerErr := db.UserCollection.FindOne(ctx, bson.M{"_id": v.UserID}, opts).Decode(&viewerUser)
					viewerEntry := bson.M{
						"userId":   v.UserID.Hex(),
						"viewedAt": v.ViewedAt,
					}
					if viewerErr == nil {
						viewerEntry["user"] = bson.M{
							"username": viewerUser.Username,
							"avatar":   viewerUser.Avatar,
						}
					}
					viewedBy = append(viewedBy, viewerEntry)
				}
				stories = append(stories, bson.M{
					"_id":       s.ID,
					"mediaUrl":  s.MediaURL,
					"mediaType": s.MediaType,
					"caption":   s.Caption,
					"createdAt": s.CreatedAt,
					"expiresAt": s.ExpiresAt,
					"viewedBy":  viewedBy,
				})
			}
		}
	}
	if stories == nil {
		stories = []bson.M{}
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"_id":              user.ID,
			"username":         user.Username,
			"email":            user.Email,
			"name":             user.Name,
			"bio":              user.Bio,
			"avatar":           user.Avatar,
			"links":            user.Links,
			"location":         user.Location,
			"status":           user.Status,
			"lastSeen":         user.LastSeen,
			"isOnline":         user.IsOnline,
			"readReceipts":     user.ReadReceipts,
			"theme":            user.Theme,
			"twoFactorEnabled": user.TwoFactorEnabled,
			"createdAt":        user.CreatedAt,
		},
		"stories": stories,
	})
}

type UpdateProfileFullRequest struct {
	Username string             `json:"username"`
	Name     string             `json:"name"`
	Bio      string             `json:"bio"`
	Avatar   string             `json:"avatar"`
	Location string             `json:"location"`
	Status   string             `json:"status"`
	Links    []models.UserLink  `json:"links"`
}

func UpdateMyProfile(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	var req UpdateProfileFullRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	setFields := bson.M{"updatedAt": time.Now()}

	if req.Username != "" && req.Username != authUser.Username {
		var existing models.User
		err := db.UserCollection.FindOne(ctx, bson.M{
			"username": bson.M{"$regex": "^" + req.Username + "$", "$options": "i"},
			"_id":      bson.M{"$ne": authUser.ID},
		}).Decode(&existing)
		if err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username is already taken"})
			return
		}
		setFields["username"] = req.Username
	}

	if req.Name != "" {
		setFields["name"] = req.Name
	}
	if req.Bio != "" {
		setFields["bio"] = req.Bio
	}
	if req.Avatar != "" {
		setFields["avatar"] = req.Avatar
	}
	if req.Location != "" {
		setFields["location"] = req.Location
	}
	if req.Status != "" {
		setFields["status"] = req.Status
	}
	if req.Links != nil {
		setFields["links"] = req.Links
	}

	var updatedUser models.User
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	err := db.UserCollection.FindOneAndUpdate(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$set": setFields},
		opts,
	).Decode(&updatedUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
	}

	go notifyProfileUpdated(authUser.ID, updatedUser)

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user": gin.H{
			"_id":              updatedUser.ID,
			"username":         updatedUser.Username,
			"email":            updatedUser.Email,
			"name":             updatedUser.Name,
			"bio":              updatedUser.Bio,
			"avatar":           updatedUser.Avatar,
			"links":            updatedUser.Links,
			"location":         updatedUser.Location,
			"status":           updatedUser.Status,
			"readReceipts":     updatedUser.ReadReceipts,
			"theme":            updatedUser.Theme,
			"twoFactorEnabled": updatedUser.TwoFactorEnabled,
		},
	})
}

func notifyProfileUpdated(userID bson.ObjectID, user models.User) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := db.ChatCollection.Find(ctx, bson.M{"participants": userID})
	if err != nil {
		return
	}
	var chats []models.Chat
	cursor.All(ctx, &chats)

	seen := map[string]bool{}
	payload := gin.H{
		"userId":   userID.Hex(),
		"username": user.Username,
		"name":     user.Name,
		"avatar":   user.Avatar,
		"status":   user.Status,
	}

	for _, chat := range chats {
		for _, p := range chat.Participants {
			id := p.Hex()
			if id != userID.Hex() && !seen[id] {
				seen[id] = true
				utils.TriggerPusher("user-"+id, "profile-updated", payload)
			}
		}
	}
}

func DeleteMyStory(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	storyID := c.Query("storyId")

	if storyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "storyId query parameter is required"})
		return
	}

	storyOID, err := bson.ObjectIDFromHex(storyID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := db.StoryCollection.DeleteOne(ctx, bson.M{
		"_id":    storyOID,
		"userId": authUser.ID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
		return
	}
	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Story not found or not yours to delete"})
		return
	}

	go notifyStoryDeleted(authUser.ID, storyOID)

	c.JSON(http.StatusOK, gin.H{"message": "Story deleted successfully"})
}

func notifyStoryDeleted(userID bson.ObjectID, storyID bson.ObjectID) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chatCursor, err := db.ChatCollection.Find(ctx, bson.M{"participants": userID})
	if err != nil {
		return
	}
	var chats []models.Chat
	chatCursor.All(ctx, &chats)

	seen := map[string]bool{}
	payload := gin.H{
		"storyId": storyID.Hex(),
		"userId":  userID.Hex(),
	}

	for _, chat := range chats {
		for _, p := range chat.Participants {
			id := p.Hex()
			if id != userID.Hex() && !seen[id] {
				seen[id] = true
				utils.TriggerPusher("user-"+id, "story-deleted", payload)
			}
		}
	}
	// Also notify the user themselves for cross-tab sync
	utils.TriggerPusher("user-"+userID.Hex(), "story-deleted", payload)
}

func GetUserProfile(c *gin.Context) {
	targetUserIDStr := c.Param("userId")

	targetID, err := bson.ObjectIDFromHex(strings.TrimSpace(targetUserIDStr))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	opts := options.FindOne().SetProjection(bson.M{
		"password":             0,
		"email":                0,
		"resetPasswordToken":   0,
		"resetPasswordExpires": 0,
		"twoFactorSecret":      0,
	})
	if err := db.UserCollection.FindOne(ctx, bson.M{"_id": targetID}, opts).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
		}
		return
	}

	now := time.Now()
	activeStoriesCount, _ := db.StoryCollection.CountDocuments(ctx, bson.M{
		"userId":    targetID,
		"expiresAt": bson.M{"$gt": now},
	})

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"_id":                user.ID,
			"username":           user.Username,
			"name":               user.Name,
			"bio":                user.Bio,
			"avatar":             user.Avatar,
			"location":           user.Location,
			"links":              user.Links,
			"status":             user.Status,
			"lastSeen":           user.LastSeen,
			"isOnline":           user.IsOnline,
			"createdAt":          user.CreatedAt,
			"activeStoriesCount": activeStoriesCount,
		},
	})
}
