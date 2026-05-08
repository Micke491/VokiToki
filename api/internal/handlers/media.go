package handlers

import (
	"net/http"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/config"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

func ListMedia(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Query("chatId")
	chatID, _ := bson.ObjectIDFromHex(chatIDStr)

	var chat models.Chat
	err := db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}
	isPart := false
	for _, p := range chat.Participants {
		if p == currentUser.ID {
			isPart = true
			break
		}
	}
	if !isPart {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	urlRegex := `https?://[^\s$.?#].[^\s]*`

	filter := bson.M{
		"chatId":               chatID,
		"deletedBy":            bson.M{"$ne": currentUser.ID},
		"isDeletedForEveryone": false,
		"$or": []bson.M{
			{"mediaUrl": bson.M{"$exists": true, "$ne": ""}, "mediaType": bson.M{"$ne": "audio"}},
			{"text": bson.M{"$regex": urlRegex, "$options": "i"}},
		},
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetProjection(bson.M{"text": 1, "mediaUrl": 1, "mediaType": 1, "mediaPublicId": 1, "createdAt": 1, "sender": 1})
	cursor, err := db.MessageCollection.Find(c, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch media"})
		return
	}
	defer cursor.Close(c)

	messages := []bson.M{}
	cursor.All(c, &messages)

	for i, msg := range messages {
		senderID := msg["sender"].(bson.ObjectID)
		var sender models.User
		db.UserCollection.FindOne(c, bson.M{"_id": senderID}, options.FindOne().SetProjection(bson.M{"username": 1, "avatar": 1})).Decode(&sender)
		messages[i]["sender"] = sender
	}

	c.JSON(http.StatusOK, messages)
}

func UploadMedia(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	cld, err := cloudinary.NewFromURL(config.AppConfig.CloudinaryURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cloudinary configuration error"})
		return
	}

	resp, err := cld.Upload.Upload(c, src, uploader.UploadParams{
		Folder: "chat_media",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed", "details": err.Error()})
		return
	}

	mediaType := "image"
	if resp.ResourceType == "video" {
		mediaType = "video"
	} else if resp.Format == "mp3" || resp.Format == "wav" {
		mediaType = "audio"
	}

	c.JSON(http.StatusOK, gin.H{
		"url":       resp.SecureURL,
		"mediaType": mediaType,
		"publicId":  resp.PublicID,
	})
}
