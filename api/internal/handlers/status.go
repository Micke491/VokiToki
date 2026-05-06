package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type StatusUpdateRequest struct {
	IsOnline *bool `json:"isOnline"`
}

func UpdateStatus(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	var req StatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	isOnline := true
	if req.IsOnline != nil {
		isOnline = *req.IsOnline
	}

	lastSeen := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var updatedUser models.User
	err := db.UserCollection.FindOneAndUpdate(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$set": bson.M{
			"isOnline": isOnline,
			"lastSeen": lastSeen,
		}},
	).Decode(&updatedUser)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	userIDStr := authUser.ID.Hex()
	utils.TriggerPusher("user-"+userIDStr, "status-updated", map[string]interface{}{
		"userId":   userIDStr,
		"isOnline": isOnline,
		"lastSeen": lastSeen,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"isOnline": isOnline,
		"lastSeen": lastSeen,
	})
}

func GetStatus(c *gin.Context) {
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"isOnline": user.IsOnline,
		"lastSeen": user.LastSeen,
	})
}
