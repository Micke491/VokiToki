package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type DeviceTokenRequest struct {
	ExpoPushToken string `json:"expoPushToken" binding:"required"`
}

func UpdateDeviceToken(c *gin.Context) {
	var req DeviceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload, expoPushToken is required"})
		return
	}

	sessIDVal, exists := c.Get("sessionId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	sessID, ok := sessIDVal.(bson.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid session ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var session models.Session
	err := db.SessionCollection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": sessID},
		bson.M{"$set": bson.M{"expoPushToken": req.ExpoPushToken}},
	).Decode(&session)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update device token"})
		return
	}

	if db.RedisClient != nil {
		tokenCacheKey := "session_token:" + session.Token
		session.ExpoPushToken = req.ExpoPushToken
		sessJSON, err := json.Marshal(session)
		if err == nil {
			db.RedisClient.Set(ctx, tokenCacheKey, sessJSON, 7*24*time.Hour)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device token updated successfully"})
}
