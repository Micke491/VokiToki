package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func CheckBlockStatus(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	chatID, _ := bson.ObjectIDFromHex(c.Query("chatId"))

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var chat models.Chat
	if err := db.ChatCollection.FindOne(ctx, bson.M{"_id": chatID}).Decode(&chat); err != nil || chat.IsGroupChat {
		c.JSON(http.StatusOK, gin.H{"blocked": false})
		return
	}

	var otherID bson.ObjectID
	for _, p := range chat.Participants {
		if p != authUser.ID {
			otherID = p
			break
		}
	}

	blockedByMe, _ := db.UserCollection.CountDocuments(ctx, bson.M{"_id": authUser.ID, "blockedUsers": otherID})
	
	blockedByThem, _ := db.UserCollection.CountDocuments(ctx, bson.M{"_id": otherID, "blockedUsers": authUser.ID})

	c.JSON(http.StatusOK, gin.H{
		"blocked":       (blockedByMe > 0 || blockedByThem > 0),
		"blockedByMe":   blockedByMe > 0,
		"blockedByThem": blockedByThem > 0,
	})
}