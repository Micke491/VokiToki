package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func SyncData(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	sinceStr := c.Query("since")
	var since time.Time
	var err error
	if sinceStr != "" {
		since, err = time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			since, err = time.Parse(time.RFC3339Nano, sinceStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid since timestamp format. Use RFC3339"})
				return
			}
		}
	} else {
		since = time.Unix(0, 0)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chatFilter := bson.M{
		"participants": currentUser.ID,
		"hiddenBy":     bson.M{"$nin": []bson.ObjectID{currentUser.ID}},
	}
	cursor, err := db.ChatCollection.Find(ctx, chatFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active chats"})
		return
	}
	defer cursor.Close(ctx)

	var chats []models.Chat
	if err = cursor.All(ctx, &chats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode chats"})
		return
	}

	var chatIDs []bson.ObjectID
	for _, chat := range chats {
		chatIDs = append(chatIDs, chat.ID)
	}

	syncMessages := []gin.H{}
	syncRooms := []gin.H{}

	if len(chatIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"messages": syncMessages,
			"chats":    syncRooms,
		})
		return
	}

	msgFilter := bson.M{
		"chatId":    bson.M{"$in": chatIDs},
		"deletedBy": bson.M{"$ne": currentUser.ID},
		"$or": []bson.M{
			{"updatedAt": bson.M{"$gt": since}},
			{"createdAt": bson.M{"$gt": since}},
		},
	}
	msgCursor, err := db.MessageCollection.Find(ctx, msgFilter)
	if err == nil {
		defer msgCursor.Close(ctx)
		var messages []models.Message
		if err = msgCursor.All(ctx, &messages); err == nil {
			senderIDsMap := make(map[bson.ObjectID]bool)
			for _, msg := range messages {
				senderIDsMap[msg.Sender] = true
			}
			var senderIDs []bson.ObjectID
			for id := range senderIDsMap {
				senderIDs = append(senderIDs, id)
			}
			userCache := make(map[bson.ObjectID]models.User)
			if len(senderIDs) > 0 {
				uCursor, err := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": senderIDs}}, options.Find().SetProjection(bson.M{"username": 1, "avatar": 1, "name": 1}))
				if err == nil {
					var senders []models.User
					uCursor.All(ctx, &senders)
					for _, u := range senders {
						userCache[u.ID] = u
					}
					uCursor.Close(ctx)
				}
			}

			for _, msg := range messages {
				sender, ok := userCache[msg.Sender]
				if !ok {
					sender.Username = "Deleted User"
				}
				storyExpired := false
				if msg.StoryExpiresAt != nil && time.Now().After(*msg.StoryExpiresAt) {
					storyExpired = true
				}
				msgMap := gin.H{
					"_id":                  msg.ID,
					"chatId":               msg.ChatID,
					"sender":               sender,
					"senderUsername":       msg.SenderUsername,
					"text":                 msg.Text,
					"read":                 msg.Read,
					"status":               msg.Status,
					"deliveredTo":          msg.DeliveredTo,
					"readBy":               msg.ReadBy,
					"isEdited":             msg.IsEdited,
					"editedAt":             msg.EditedAt,
					"originalText":         msg.OriginalText,
					"isDeletedForEveryone": msg.IsDeletedForEveryone,
					"deletedForEveryoneAt": msg.DeletedForEveryoneAt,
					"isPinned":             msg.IsPinned,
					"mediaUrl":             msg.MediaURL,
					"mediaType":            msg.MediaType,
					"mediaPublicId":        msg.MediaPublicID,
					"isForwarded":          msg.IsForwarded,
					"isSystemMessage":      msg.IsSystemMessage,
					"reactions":            msg.Reactions,
					"createdAt":            msg.CreatedAt,
					"updatedAt":            msg.UpdatedAt,
					"storyId":              msg.StoryID,
					"storyMediaUrl":        msg.StoryMediaURL,
					"storyMediaType":       msg.StoryMediaType,
					"storyCaption":         msg.StoryCaption,
					"storyExpiresAt":       msg.StoryExpiresAt,
					"storyExpired":         storyExpired,
				}
				syncMessages = append(syncMessages, msgMap)
			}
		}
	}

	var updatedChats []models.Chat
	for _, chat := range chats {
		if chat.UpdatedAt.After(since) {
			updatedChats = append(updatedChats, chat)
		}
	}

	if len(updatedChats) > 0 {
		partIDsMap := make(map[bson.ObjectID]bool)
		for _, chat := range updatedChats {
			for _, pid := range chat.Participants {
				partIDsMap[pid] = true
			}
		}
		var partIDs []bson.ObjectID
		for id := range partIDsMap {
			partIDs = append(partIDs, id)
		}

		userCache := make(map[bson.ObjectID]models.User)
		if len(partIDs) > 0 {
			uCursor, err := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": partIDs}}, options.Find().SetProjection(bson.M{"username": 1, "avatar": 1, "name": 1, "email": 1}))
			if err == nil {
				var users []models.User
				uCursor.All(ctx, &users)
				for _, u := range users {
					userCache[u.ID] = u
				}
				uCursor.Close(ctx)
			}
		}

		for _, chat := range updatedChats {
			var chatParticipants []models.User
			for _, pid := range chat.Participants {
				if u, found := userCache[pid]; found {
					chatParticipants = append(chatParticipants, u)
				}
			}

			formattedParts := make([]gin.H, len(chatParticipants))
			for i, u := range chatParticipants {
				usernameVal := u.Username
				if usernameVal == "" {
					usernameVal = "Unknown User"
				}
				formattedParts[i] = gin.H{
					"_id":      u.ID.Hex(),
					"username": usernameVal,
					"avatar":   u.Avatar,
					"email":    u.Email,
					"name":     u.Name,
				}
			}

			chatMap := gin.H{
				"_id":                  chat.ID,
				"name":                 chat.Name,
				"isGroupChat":          chat.IsGroupChat,
				"groupAdmin":           chat.GroupAdmin,
				"avatar":               chat.Avatar,
				"participants":         formattedParts,
				"participantUsernames": chat.ParticipantUsernames,
				"lastMessage":          chat.LastMessage,
				"hiddenBy":             chat.HiddenBy,
				"createdAt":            chat.CreatedAt,
				"updatedAt":            chat.UpdatedAt,
			}
			syncRooms = append(syncRooms, chatMap)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": syncMessages,
		"chats":    syncRooms,
	})
}
