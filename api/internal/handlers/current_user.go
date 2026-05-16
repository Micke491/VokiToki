package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	
)

func GetCurrentUser(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func DeleteCurrentUser(c *gin.Context) {
    authUser := c.MustGet("user").(models.User)

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := db.UserCollection.DeleteOne(ctx, bson.M{"_id": authUser.ID})
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
        return
    }
    
    if result.DeletedCount == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    if db.RedisClient != nil {
        db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
    }

    c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

type UpdateProfileRequest struct {
	Username string `json:"username"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

func UpdateCurrentUser(c *gin.Context) {
    authUser := c.MustGet("user").(models.User)

    var req UpdateProfileRequest
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

    if req.Bio != "" {
        setFields["bio"] = req.Bio
    }
    if req.Avatar != "" {
        setFields["avatar"] = req.Avatar
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

    c.JSON(http.StatusOK, gin.H{
        "message": "Profile updated successfully",
        "user":    updatedUser, 
    })
}