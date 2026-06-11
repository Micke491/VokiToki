package handlers

import (
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func UpsertDraft(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	var body struct {
		ChatID string `json:"chatId"`
		Text   string `json:"text"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body"})
		return
	}

	chatID, err := bson.ObjectIDFromHex(body.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid chat ID"})
		return
	}

	if body.Text == "" {
		db.DraftCollection.DeleteOne(c, bson.M{
			"userId": currentUser.ID,
			"chatId": chatID,
		})
		c.JSON(http.StatusOK, gin.H{"message": "Draft cleared"})
		return
	}

	filter := bson.M{
		"userId": currentUser.ID,
		"chatId": chatID,
	}

	update := bson.M{
		"$set": bson.M{
			"text":      body.Text,
			"updatedAt": time.Now(),
		},
		"$setOnInsert": bson.M{
			"userId": currentUser.ID,
			"chatId": chatID,
		},
	}

	opts := options.UpdateOne().SetUpsert(true)
	_, err = db.DraftCollection.UpdateOne(c, filter, update, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save draft"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Draft saved"})
}

func GetDraft(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	chatIDStr := c.Query("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid chat ID"})
		return
	}

	var draft models.Draft
	err = db.DraftCollection.FindOne(c, bson.M{
		"userId": currentUser.ID,
		"chatId": chatID,
	}).Decode(&draft)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"text": ""})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"text":      draft.Text,
		"updatedAt": draft.UpdatedAt,
	})
}

func DeleteDraft(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	chatIDStr := c.Query("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid chat ID"})
		return
	}

	db.DraftCollection.DeleteOne(c, bson.M{
		"userId": currentUser.ID,
		"chatId": chatID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Draft deleted"})
}
