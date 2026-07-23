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

type PreferencesRequest struct {
	Theme            *string `json:"theme"`
	ReadReceipts     *bool   `json:"readReceipts"`
	DefaultWallpaper *string `json:"defaultWallpaper"`
	AutoPlayGifs     *bool   `json:"autoPlayGifs"`
	AutoPlayVoice    *bool   `json:"autoPlayVoice"`
	StoryPrivacy     *string `json:"storyPrivacy"`
	BotPersona       *string `json:"botPersona"`

	NotificationPrefs *models.NotificationPrefs `json:"notificationPrefs"`
}

func UpdatePreferences(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	var req PreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	updates := bson.M{"updatedAt": time.Now()}
	if req.Theme != nil {
		updates["theme"] = *req.Theme
	}
	if req.ReadReceipts != nil {
		updates["readReceipts"] = *req.ReadReceipts
	}
	if req.DefaultWallpaper != nil {
		updates["defaultWallpaper"] = *req.DefaultWallpaper
	}
	if req.AutoPlayGifs != nil {
		updates["autoPlayGifs"] = *req.AutoPlayGifs
	}
	if req.AutoPlayVoice != nil {
		updates["autoPlayVoice"] = *req.AutoPlayVoice
	}
	if req.StoryPrivacy != nil {
		updates["storyPrivacy"] = *req.StoryPrivacy
	}
	if req.BotPersona != nil {
		updates["botPersona"] = *req.BotPersona
	}
	if req.NotificationPrefs != nil {
		updates["notificationPrefs"] = *req.NotificationPrefs
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedUser models.User
	err := db.UserCollection.FindOneAndUpdate(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$set": updates},
		opts, 
	).Decode(&updatedUser)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Preferences updated successfully",
		"user":    updatedUser,
	})
}
