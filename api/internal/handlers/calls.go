package handlers

import (
	"net/http"
	"time"
	"fmt"
	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"github.com/livekit/protocol/auth"
)

func NotifyCall(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		ChatID       string `json:"chatId"`
		CallType     string `json:"callType"`
		CallerName   string `json:"callerName"`
		CallerAvatar string `json:"callerAvatar"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	chatID, _ := bson.ObjectIDFromHex(body.ChatID)
	var chat models.Chat
	err := db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !chat.IsGroupChat {
		var otherID bson.ObjectID
		for _, p := range chat.Participants {
			if p != currentUser.ID {
				otherID = p
				break
			}
		}
		if !otherID.IsZero() {
			var otherUser models.User
			db.UserCollection.FindOne(c, bson.M{"_id": otherID}).Decode(&otherUser)
			for _, id := range currentUser.BlockedUsers {
				if id == otherID {
					c.JSON(http.StatusForbidden, gin.H{"error": "You cannot call this user."})
					return
				}
			}
			for _, id := range otherUser.BlockedUsers {
				if id == currentUser.ID {
					c.JSON(http.StatusForbidden, gin.H{"error": "You cannot call this user."})
					return
				}
			}
		}
	}

	utils.TriggerPusher("chat-"+body.ChatID, "call:incoming", gin.H{
		"chatId":       body.ChatID,
		"callType":     body.CallType,
		"callerName":   body.CallerName,
		"callerAvatar": body.CallerAvatar,
		"callerId":     currentUser.ID.Hex(),
	})

	filter := bson.M{
		"chatId":    chatID,
		"mediaType": "call",
		"text":      bson.M{"$not": bson.M{"$regex": "Ended", "$options": "i"}},
	}
	var existingMsg models.Message
	err = db.MessageCollection.FindOne(c, filter, options.FindOne().SetSort(bson.M{"createdAt": -1})).Decode(&existingMsg)

	if err != nil {
		fmt.Printf("No active call message found for chat %s, creating new one\n", body.ChatID)
		newMsg := models.Message{
			ID:              bson.NewObjectID(),
			ChatID:          chatID,
			Sender:          currentUser.ID,
			Text:            body.CallType + " call",
			MediaType:       "call",
			Status:          "sent",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		_, insertErr := db.MessageCollection.InsertOne(c, newMsg)
		if insertErr != nil {
			fmt.Printf("Failed to insert call message: %v\n", insertErr)
		}
		
		db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{"$set": bson.M{"lastMessage": newMsg.ID, "updatedAt": time.Now(), "hiddenBy": []bson.ObjectID{}}})
		
		var sender models.User
		db.UserCollection.FindOne(c, bson.M{"_id": currentUser.ID}, options.FindOne().SetProjection(bson.M{"_id": 1, "username": 1, "avatar": 1})).Decode(&sender)
		
		populatedMsg := gin.H{
			"_id":       newMsg.ID,
			"chatId":    chatID,
			"sender":    sender,
			"text":      newMsg.Text,
			"mediaType": "call",
			"createdAt": newMsg.CreatedAt,
		}
		utils.TriggerPusher("chat-"+body.ChatID, "receive-message", populatedMsg)
	} else {
		fmt.Printf("Active call message already exists for chat %s: %s\n", body.ChatID, existingMsg.ID.Hex())
	}

	for _, pid := range chat.Participants {
		utils.TriggerPusher("user-"+pid.Hex(), "call:incoming", gin.H{
			"chatId":       body.ChatID,
			"callType":     body.CallType,
			"callerName":   body.CallerName,
			"callerAvatar": body.CallerAvatar,
			"callerId":     currentUser.ID.Hex(),
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func CreateRoom(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		ChatID   string `json:"chatId"`
		Username string `json:"username"`
	}
	c.ShouldBindJSON(&body)

	cfg := config.AppConfig
	if cfg.LiveKitAPIKey == "" || cfg.LiveKitAPISecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LiveKit missing configuration"})
		return
	}

	at := auth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     body.ChatID,
	}
	at.AddGrant(grant).
		SetIdentity(fmt.Sprintf("%s_%s", body.Username, currentUser.ID.Hex())).
		SetName(body.Username)

	token, err := at.ToJWT()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"serverUrl": cfg.LiveKitURL,
	})
}

func EndCall(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		ChatID   string `json:"chatId"`
		CallType string `json:"callType"`
	}
	c.ShouldBindJSON(&body)
	chatID, _ := bson.ObjectIDFromHex(body.ChatID)
	
	lastMsgFilter := bson.M{
		"chatId":    chatID,
		"mediaType": "call",
		"text":      bson.M{"$not": bson.M{"$regex": "Ended", "$options": "i"}},
	}
	var lastMsg models.Message
	err := db.MessageCollection.FindOne(c, lastMsgFilter, options.FindOne().SetSort(bson.M{"createdAt": -1})).Decode(&lastMsg)

	endedText := body.CallType + " call Ended"
	if err == nil {
		fmt.Printf("Updating existing call message %s to 'Ended' for chat %s\n", lastMsg.ID.Hex(), body.ChatID)
		lastMsg.Text = endedText
		db.MessageCollection.UpdateOne(c, bson.M{"_id": lastMsg.ID}, bson.M{"$set": bson.M{"text": lastMsg.Text}})
		
		// Populate sender for Pusher to avoid "Unknown"
		var sender models.User
		db.UserCollection.FindOne(c, bson.M{"_id": lastMsg.Sender}, options.FindOne().SetProjection(bson.M{"_id": 1, "username": 1, "avatar": 1})).Decode(&sender)
		
		populatedMsg := gin.H{
			"_id":       lastMsg.ID,
			"chatId":    body.ChatID,
			"sender":    sender,
			"text":      lastMsg.Text,
			"mediaType": "call",
			"createdAt": lastMsg.CreatedAt,
			"updatedAt": time.Now(),
		}
		utils.TriggerPusher("chat-"+body.ChatID, "message-updated", populatedMsg)
	} else {

		fmt.Printf("No active call message found to end for chat %s, checking for recent 'Ended' message\n", body.ChatID)
		
		recentFilter := bson.M{
			"chatId":    chatID,
			"mediaType": "call",
			"text":      bson.M{"$regex": "Ended", "$options": "i"},
			"createdAt": bson.M{"$gt": time.Now().Add(-30 * time.Second)}, 
		}
		count, _ := db.MessageCollection.CountDocuments(c, recentFilter)
		
		if count == 0 {
			newMsg := models.Message{
				ID:              bson.NewObjectID(),
				ChatID:          chatID,
				Sender:          currentUser.ID,
				Text:            endedText,
				MediaType:       "call",
				Status:          "sent",
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}
			db.MessageCollection.InsertOne(c, newMsg)
			db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{"$set": bson.M{"lastMessage": newMsg.ID, "updatedAt": time.Now(), "hiddenBy": []bson.ObjectID{}}})
			
			var sender models.User
			db.UserCollection.FindOne(c, bson.M{"_id": currentUser.ID}, options.FindOne().SetProjection(bson.M{"_id": 1, "username": 1, "avatar": 1})).Decode(&sender)
			
			populatedMsg := gin.H{
				"_id":       newMsg.ID,
				"chatId":    body.ChatID,
				"sender":    sender,
				"text":      newMsg.Text,
				"mediaType": "call",
				"createdAt": newMsg.CreatedAt,
			}
			utils.TriggerPusher("chat-"+body.ChatID, "receive-message", populatedMsg)
		}
	}

	utils.TriggerPusher("chat-"+body.ChatID, "call:ended", gin.H{"chatId": body.ChatID})
	
	var chat models.Chat
	db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	for _, p := range chat.Participants {
		utils.TriggerPusher("user-"+p.Hex(), "call:ended", gin.H{"chatId": body.ChatID})
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
