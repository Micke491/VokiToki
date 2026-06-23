package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func GetAllStories(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chatCursor, err := db.ChatCollection.Find(ctx, bson.M{"participants": authUser.ID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}
	var chats []models.Chat
	if err := chatCursor.All(ctx, &chats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}

	contactSet := map[string]bool{authUser.ID.Hex(): true}
	for _, chat := range chats {
		for _, p := range chat.Participants {
			if p.Hex() != authUser.ID.Hex() {
				contactSet[p.Hex()] = true
			}
		}
	}
	for _, f := range authUser.Following {
		contactSet[f.Hex()] = true
	}
	contactOIDs := make([]bson.ObjectID, 0, len(contactSet))
	for id := range contactSet {
		if oid, err := bson.ObjectIDFromHex(id); err == nil {
			contactOIDs = append(contactOIDs, oid)
		}
	}

	now := time.Now()

	pipeline := bson.A{
		bson.M{"$match": bson.M{
			"expiresAt": bson.M{"$gt": now},
			"userId":    bson.M{"$in": contactOIDs},
		}},
		bson.M{"$lookup": bson.M{
			"from":         "users",
			"localField":   "userId",
			"foreignField": "_id",
			"as":           "user",
		}},
		bson.M{"$unwind": "$user"},
		bson.M{"$sort": bson.M{"createdAt": -1}},
	}

	cursor, err := db.StoryCollection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}

	type storyAggResult struct {
		ID        bson.ObjectID       `bson:"_id"`
		UserID    bson.ObjectID       `bson:"userId"`
		MediaURL  string              `bson:"mediaUrl"`
		MediaType string              `bson:"mediaType"`
		Caption   string              `bson:"caption"`
		ViewedBy  []models.StoryViewer `bson:"viewedBy"`
		CreatedAt time.Time           `bson:"createdAt"`
		ExpiresAt time.Time           `bson:"expiresAt"`
		User      struct {
			ID           bson.ObjectID   `bson:"_id"`
			Username     string          `bson:"username"`
			Avatar       string          `bson:"avatar"`
			StoryPrivacy string          `bson:"storyPrivacy"`
			Followers    []bson.ObjectID `bson:"followers"`
		} `bson:"user"`
	}

	var rawResults []storyAggResult
	if err := cursor.All(ctx, &rawResults); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}

	var results []storyAggResult
	for _, s := range rawResults {
		if s.User.ID == authUser.ID {
			results = append(results, s)
			continue
		}
		if s.User.StoryPrivacy == "followers" {
			isFollower := false
			for _, followerID := range s.User.Followers {
				if followerID == authUser.ID {
					isFollower = true
					break
				}
			}
			if !isFollower {
				continue
			}
		}
		results = append(results, s)
	}

	viewerIDs := map[string]bool{}
	for _, s := range results {
		for _, v := range s.ViewedBy {
			viewerIDs[v.UserID.Hex()] = true
		}
	}
	viewerMap := map[string]bson.M{}
	if len(viewerIDs) > 0 {
		vOIDs := make([]bson.ObjectID, 0, len(viewerIDs))
		for id := range viewerIDs {
			if oid, err := bson.ObjectIDFromHex(id); err == nil {
				vOIDs = append(vOIDs, oid)
			}
		}
		opts := options.Find().SetProjection(bson.M{"username": 1, "avatar": 1})
		vCursor, err := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": vOIDs}}, opts)
		if err == nil {
			var viewers []models.User
			if err := vCursor.All(ctx, &viewers); err == nil {
				for _, v := range viewers {
					viewerMap[v.ID.Hex()] = bson.M{"username": v.Username, "avatar": v.Avatar}
				}
			}
		}
	}

	currentUID := authUser.ID.Hex()
	type storyUserGroup struct {
		User    bson.M   `json:"user"`
		Stories []bson.M `json:"stories"`
	}

	groupOrder := []string{}
	groupMap := map[string]*storyUserGroup{}

	for _, s := range results {
		uid := s.User.ID.Hex()
		if _, ok := groupMap[uid]; !ok {
			groupOrder = append(groupOrder, uid)
			groupMap[uid] = &storyUserGroup{
				User: bson.M{
					"_id":      s.User.ID,
					"username": s.User.Username,
					"avatar":   s.User.Avatar,
				},
				Stories: []bson.M{},
			}
		}

		viewedByList := make([]bson.M, 0, len(s.ViewedBy))
		viewed := false
		for _, v := range s.ViewedBy {
			vEntry := bson.M{
				"userId":   v.UserID,
				"viewedAt": v.ViewedAt,
			}
			if info, ok := viewerMap[v.UserID.Hex()]; ok {
				vEntry["user"] = info
			}
			viewedByList = append(viewedByList, vEntry)
			if v.UserID.Hex() == currentUID {
				viewed = true
			}
		}

		groupMap[uid].Stories = append(groupMap[uid].Stories, bson.M{
			"_id":       s.ID,
			"mediaUrl":  s.MediaURL,
			"mediaType": s.MediaType,
			"caption":   s.Caption,
			"createdAt": s.CreatedAt,
			"expiresAt": s.ExpiresAt,
			"viewedBy":  viewedByList,
			"viewed":    viewed,
		})
	}

	storiesArr := make([]storyUserGroup, 0, len(groupOrder))
	for _, uid := range groupOrder {
		storiesArr = append(storiesArr, *groupMap[uid])
	}

	c.JSON(http.StatusOK, gin.H{"stories": storiesArr})
}

func CreateStory(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	isImage := strings.HasPrefix(contentType, "image/")
	isVideo := strings.HasPrefix(contentType, "video/")

	if !isImage && !isVideo {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only images and videos are allowed"})
		return
	}

	maxSize := int64(10 * 1024 * 1024)
	if isVideo {
		maxSize = 50 * 1024 * 1024
	}
	if header.Size > maxSize {
		limit := "10MB"
		if isVideo {
			limit = "50MB"
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("File size exceeds %s limit", limit)})
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	resourceType := "image"
	if isVideo {
		resourceType = "video"
	}

	uploadResult, err := uploadStoryToCloudinary(fileBytes, config.AppConfig.CloudinaryURL, resourceType)
	if err != nil {
		log.Printf("Story cloudinary upload error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	caption := strings.TrimSpace(c.PostForm("caption"))
	mediaType := "image"
	if isVideo {
		mediaType = "video"
	}

	expiresAt := time.Now().Add(3 * time.Hour)
	story := models.Story{
		UserID:    authUser.ID,
		MediaURL:  uploadResult.SecureURL,
		MediaType: mediaType,
		Caption:   caption,
		ViewedBy:  []models.StoryViewer{},
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}

	result, err := db.StoryCollection.InsertOne(ctx, story)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}
	story.ID = result.InsertedID.(bson.ObjectID)

	var user models.User
	db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID},
		options.FindOne().SetProjection(bson.M{"username": 1, "avatar": 1}),
	).Decode(&user)

	go notifyNewStory(authUser.ID, story, user)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"story": gin.H{
			"_id":       story.ID,
			"mediaUrl":  story.MediaURL,
			"mediaType": story.MediaType,
			"caption":   story.Caption,
			"createdAt": story.CreatedAt,
			"expiresAt": story.ExpiresAt,
		},
	})
}

func notifyNewStory(userID bson.ObjectID, story models.Story, user models.User) {
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
		"storyId":   story.ID.Hex(),
		"userId":    userID.Hex(),
		"mediaUrl":  story.MediaURL,
		"mediaType": story.MediaType,
		"caption":   story.Caption,
		"createdAt": story.CreatedAt,
		"user": gin.H{
			"username": user.Username,
			"avatar":   user.Avatar,
		},
	}

	for _, chat := range chats {
		for _, p := range chat.Participants {
			id := p.Hex()
			if id != userID.Hex() && !seen[id] {
				seen[id] = true
				utils.Broadcast("user-"+id, "story-new", payload)
			}
		}
	}
	utils.Broadcast("user-"+userID.Hex(), "story-new", payload)
}

func GetUserStories(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	targetUserIDStr := c.Param("userId")

	targetID, err := bson.ObjectIDFromHex(strings.TrimSpace(targetUserIDStr))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if authUser.ID.Hex() != targetID.Hex() {
		count, _ := db.ChatCollection.CountDocuments(ctx, bson.M{
			"participants": bson.M{"$all": bson.A{authUser.ID, targetID}},
		})
		if count == 0 {
			c.JSON(http.StatusOK, gin.H{"stories": []bson.M{}})
			return
		}
	}

	var targetUser models.User
	db.UserCollection.FindOne(ctx, bson.M{"_id": targetID},
		options.FindOne().SetProjection(bson.M{"username": 1, "avatar": 1, "storyPrivacy": 1, "followers": 1}),
	).Decode(&targetUser)

	if targetUser.StoryPrivacy == "followers" && authUser.ID != targetID {
		isFollower := false
		for _, followerID := range targetUser.Followers {
			if followerID == authUser.ID {
				isFollower = true
				break
			}
		}
		if !isFollower {
			c.JSON(http.StatusOK, gin.H{
				"user": gin.H{
					"_id":      targetUser.ID,
					"username": targetUser.Username,
					"avatar":   targetUser.Avatar,
				},
				"stories": []bson.M{},
			})
			return
		}
	}

	now := time.Now()
	cursor, err := db.StoryCollection.Find(ctx, bson.M{
		"userId":    targetID,
		"expiresAt": bson.M{"$gt": now},
	}, options.Find().SetSort(bson.M{"createdAt": 1}))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}

	var stories []models.Story
	if err := cursor.All(ctx, &stories); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stories"})
		return
	}

	currentUID := authUser.ID.Hex()
	storiesOut := make([]bson.M, 0, len(stories))
	for _, s := range stories {
		viewed := false
		for _, v := range s.ViewedBy {
			if v.UserID.Hex() == currentUID {
				viewed = true
				break
			}
		}
		storiesOut = append(storiesOut, bson.M{
			"_id":       s.ID,
			"mediaUrl":  s.MediaURL,
			"mediaType": s.MediaType,
			"caption":   s.Caption,
			"createdAt": s.CreatedAt,
			"expiresAt": s.ExpiresAt,
			"viewed":    viewed,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"_id":      targetUser.ID,
			"username": targetUser.Username,
			"avatar":   targetUser.Avatar,
		},
		"stories": storiesOut,
	})
}

func MarkStoryViewed(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	targetUserIDStr := c.Param("userId")

	targetID, err := bson.ObjectIDFromHex(strings.TrimSpace(targetUserIDStr))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		StoryID string `json:"storyId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Story ID required"})
		return
	}

	storyOID, err := bson.ObjectIDFromHex(req.StoryID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var story models.Story
	err = db.StoryCollection.FindOne(ctx, bson.M{
		"_id":       storyOID,
		"userId":    targetID,
		"expiresAt": bson.M{"$gt": time.Now()},
	}).Decode(&story)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Story not found"})
		return
	}

	viewerID := authUser.ID.Hex()
	for _, v := range story.ViewedBy {
		if v.UserID.Hex() == viewerID {
			c.JSON(http.StatusOK, gin.H{"success": true})
			return
		}
	}

	viewedAt := time.Now()
	_, err = db.StoryCollection.UpdateOne(ctx,
		bson.M{"_id": storyOID},
		bson.M{"$push": bson.M{"viewedBy": bson.M{
			"userId":   authUser.ID,
			"viewedAt": viewedAt,
		}}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark story as viewed"})
		return
	}

	payload := gin.H{
		"storyId":  storyOID.Hex(),
		"viewedBy": viewerID,
		"viewedAt": viewedAt,
		"user": gin.H{
			"username": authUser.Username,
			"avatar":   authUser.Avatar,
		},
	}

	go utils.Broadcast("user-"+targetID.Hex(), "story-viewed", payload)
	go utils.Broadcast("user-"+viewerID, "story-viewed", payload)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

type storyUploadResult struct {
	SecureURL string `json:"secure_url"`
	PublicID  string `json:"public_id"`
}

func uploadStoryToCloudinary(data []byte, cloudinaryURL, resourceType string) (*storyUploadResult, error) {
	trimmed := strings.TrimPrefix(cloudinaryURL, "cloudinary://")
	atIdx := strings.LastIndex(trimmed, "@")
	if atIdx == -1 {
		return nil, fmt.Errorf("invalid CLOUDINARY_URL format")
	}
	cloudName := trimmed[atIdx+1:]
	credentials := trimmed[:atIdx]
	colonIdx := strings.Index(credentials, ":")
	if colonIdx == -1 {
		return nil, fmt.Errorf("invalid CLOUDINARY_URL credentials")
	}
	apiKey := credentials[:colonIdx]
	apiSecret := credentials[colonIdx+1:]

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)

	fw, err := mw.CreateFormFile("file", "story_media")
	if err != nil {
		return nil, err
	}
	if _, err = fw.Write(data); err != nil {
		return nil, err
	}
	_ = mw.WriteField("folder", "stories")
	mw.Close()

	uploadURL := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/%s/upload", cloudName, resourceType)
	req, err := http.NewRequest(http.MethodPost, uploadURL, &body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.SetBasicAuth(apiKey, apiSecret)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cloudinary error %d: %s", resp.StatusCode, string(respBody))
	}

	var res storyUploadResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

func StartStoryCleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	log.Println("Story cleanup service started")
	
	for range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		now := time.Now()
		
		result, err := db.StoryCollection.DeleteMany(ctx, bson.M{
			"expiresAt": bson.M{"$lt": now},
		})
		
		if err != nil {
			log.Printf("Error cleaning up expired stories: %v", err)
		} else if result.DeletedCount > 0 {
			log.Printf("Cleaned up %d expired stories", result.DeletedCount)
		}
		cancel()
	}
}
