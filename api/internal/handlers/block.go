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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type BlockRequest struct {
	TargetUserID string `json:"targetUserId" binding:"required"`
}

func BlockUser(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	var req BlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	targetID, err := bson.ObjectIDFromHex(req.TargetUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target user ID"})
		return
	}

	if targetID == authUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot block yourself"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx, 
		bson.M{"_id": authUser.ID}, 
		bson.M{"$addToSet": bson.M{"blockedUsers": targetID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOneAndUpdate(ctx,
		bson.M{
			"participants": bson.M{"$all": bson.A{authUser.ID, targetID}},
			"isGroupChat":  false,
		},
		bson.M{"$addToSet": bson.M{"hiddenBy": authUser.ID}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&chat)

	if err == nil {
		utils.TriggerPusher("user-"+authUser.ID.Hex(), "chat-removed", gin.H{"chatId": chat.ID.Hex()})
		utils.TriggerPusher("chat-"+chat.ID.Hex(), "user-blocked", gin.H{"blockedBy": authUser.ID.Hex()})
	}

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
		db.RedisClient.Del(ctx, "user_auth:"+req.TargetUserID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "User blocked"})
}

func UnblockUser(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	var req BlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	targetID, err := bson.ObjectIDFromHex(req.TargetUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx, 
		bson.M{"_id": authUser.ID}, 
		bson.M{"$pull": bson.M{"blockedUsers": targetID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "user_auth:"+authUser.ID.Hex())
		db.RedisClient.Del(ctx, "user_auth:"+req.TargetUserID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unblocked"})
}