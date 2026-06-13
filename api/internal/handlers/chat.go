package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func GetChats(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	log.Printf("Fetching chats for user: %s (%s)", currentUser.Username, currentUser.ID.Hex())

	filter := bson.M{
		"participants": currentUser.ID,
		"hiddenBy":     bson.M{"$nin": []bson.ObjectID{currentUser.ID}},
		"$or": []bson.M{
			{"status": "accepted"},
			{"status": bson.M{"$exists": false}}, // Fallback for old chats
			{"initiatorId": currentUser.ID},
		},
	}

	opts := options.Find().SetSort(bson.M{"updatedAt": -1})
	cursor, err := db.ChatCollection.Find(c, filter, opts)
	if err != nil {
		log.Printf("Error finding chats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch chats"})
		return
	}
	defer cursor.Close(c)

	var chats []bson.M
	if err = cursor.All(c, &chats); err != nil {
		log.Printf("Error decoding chats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to decode chats"})
		return
	}

	userIDsMap := make(map[bson.ObjectID]bool)
	lastMessageIDsMap := make(map[bson.ObjectID]bool)
	var chatIDs []bson.ObjectID

	for _, chat := range chats {
		if chatID, ok := chat["_id"].(bson.ObjectID); ok {
			chatIDs = append(chatIDs, chatID)
		}
		if participantIDs, ok := chat["participants"].(bson.A); ok {
			for _, pid := range participantIDs {
				if id, valid := pid.(bson.ObjectID); valid {
					userIDsMap[id] = true
				}
			}
		}
		if lastMsgID, ok := chat["lastMessage"].(bson.ObjectID); ok {
			lastMessageIDsMap[lastMsgID] = true
		}
	}

	var userIDs []bson.ObjectID
	for id := range userIDsMap {
		userIDs = append(userIDs, id)
	}

	userCache := make(map[bson.ObjectID]models.User)
	if len(userIDs) > 0 {
		cursor, err := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": userIDs}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
		if err == nil {
			var users []models.User
			cursor.All(c, &users)
			for _, u := range users {
				userCache[u.ID] = u
			}
			cursor.Close(c)
		}
	}

	var lastMessageIDs []bson.ObjectID
	for id := range lastMessageIDsMap {
		lastMessageIDs = append(lastMessageIDs, id)
	}

	messageCache := make(map[bson.ObjectID]models.Message)
	if len(lastMessageIDs) > 0 {
		cursor, err := db.MessageCollection.Find(c, bson.M{"_id": bson.M{"$in": lastMessageIDs}})
		if err == nil {
			var msgs []models.Message
			cursor.All(c, &msgs)
			for _, m := range msgs {
				messageCache[m.ID] = m
				if _, ok := userCache[m.Sender]; !ok {
					var sender models.User
					db.UserCollection.FindOne(c, bson.M{"_id": m.Sender}, options.FindOne().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1})).Decode(&sender)
					userCache[m.Sender] = sender
				}
			}
			cursor.Close(c)
		}
	}

	unreadCounts := make(map[bson.ObjectID]int32)
	if len(chatIDs) > 0 {
		pipeline := bson.A{
			bson.M{"$match": bson.M{
				"chatId":        bson.M{"$in": chatIDs},
				"sender":        bson.M{"$ne": currentUser.ID},
				"readBy.userId": bson.M{"$ne": currentUser.ID},
			}},
			bson.M{"$group": bson.M{
				"_id":   "$chatId",
				"count": bson.M{"$sum": 1},
			}},
		}
		cursor, err := db.MessageCollection.Aggregate(c, pipeline)
		if err == nil {
			var results []struct {
				ID    bson.ObjectID `bson:"_id"`
				Count int32         `bson:"count"`
			}
			cursor.All(c, &results)
			for _, res := range results {
				unreadCounts[res.ID] = res.Count
			}
			cursor.Close(c)
		}
	}

	result := []gin.H{} 
	for _, chat := range chats {
		chatID, ok := chat["_id"].(bson.ObjectID)
		if !ok {
			continue
		}

		if participantIDs, ok := chat["participants"].(bson.A); ok {
			var participants []models.User
			for _, pid := range participantIDs {
				if id, valid := pid.(bson.ObjectID); valid {
					if user, found := userCache[id]; found {
						participants = append(participants, user)
					}
				}
			}
			chat["participants"] = participants
		}

		if lastMsgID, ok := chat["lastMessage"].(bson.ObjectID); ok {
			if lastMsg, found := messageCache[lastMsgID]; found {
				sender := userCache[lastMsg.Sender]
				msgMap := bson.M{
					"_id":             lastMsg.ID,
					"text":            lastMsg.Text,
					"sender":          sender,
					"createdAt":       lastMsg.CreatedAt,
					"mediaType":       lastMsg.MediaType,
					"isSystemMessage": lastMsg.IsSystemMessage,
				}
				chat["lastMessage"] = msgMap
			}
		}

		chat["unreadCount"] = unreadCounts[chatID]
		result = append(result, gin.H(chat))
	}

	c.JSON(http.StatusOK, result)
}

func CreateChat(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		RecipientID string `json:"recipientId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Recipient ID is required"})
		return
	}

	recipientID, err := bson.ObjectIDFromHex(body.RecipientID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid recipient ID"})
		return
	}

	var recipient models.User
	err = db.UserCollection.FindOne(c, bson.M{"_id": recipientID}).Decode(&recipient)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Recipient not found"})
		return
	}

	iBlockedThem := false
	for _, id := range currentUser.BlockedUsers {
		if id == recipientID {
			iBlockedThem = true
			break
		}
	}
	theyBlockedMe := false
	for _, id := range recipient.BlockedUsers {
		if id == currentUser.ID {
			theyBlockedMe = true
			break
		}
	}

	if iBlockedThem || theyBlockedMe {
		c.JSON(http.StatusForbidden, gin.H{"message": "This user is not available"})
		return
	}

	filter := bson.M{
		"participants": bson.M{"$all": []bson.ObjectID{currentUser.ID, recipientID}},
		"isGroupChat":  false,
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, filter).Decode(&chat)

	if err == nil {
		db.ChatCollection.UpdateOne(c, bson.M{"_id": chat.ID}, bson.M{"$pull": bson.M{"hiddenBy": currentUser.ID}})
		
		var populatedParticipants []models.User
		pCursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": chat.Participants}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
		pCursor.All(c, &populatedParticipants)
		
		c.JSON(http.StatusOK, gin.H{
			"_id":          chat.ID,
			"participants": populatedParticipants,
			"isGroupChat":  chat.IsGroupChat,
			"status":       chat.Status,
			"initiatorId":  chat.InitiatorID,
			"createdAt":    chat.CreatedAt,
			"updatedAt":    chat.UpdatedAt,
		})
		return
	}

	newChat := models.Chat{
		ID:                   bson.NewObjectID(),
		IsGroupChat:          false,
		Participants:         []bson.ObjectID{currentUser.ID, recipientID},
		ParticipantUsernames: []string{currentUser.Username, recipient.Username},
		HiddenBy:             []bson.ObjectID{},
		Status:               "pending",
		InitiatorID:          &currentUser.ID,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	_, err = db.ChatCollection.InsertOne(c, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create chat"})
		return
	}

	c.JSON(http.StatusOK, newChat)
}

func CreateGroupChat(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		Name         string   `json:"name"`
		Participants []string `json:"participants"`
		Avatar       *string  `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body"})
		return
	}

	if body.Name == "" || len(body.Participants) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Group name and at least 2 other participants are required"})
		return
	}

	var participantIDs []bson.ObjectID
	participantIDs = append(participantIDs, currentUser.ID)
	for _, idStr := range body.Participants {
		id, err := bson.ObjectIDFromHex(idStr)
		if err == nil {
			participantIDs = append(participantIDs, id)
		}
	}

	uniqueIDs := make(map[bson.ObjectID]bool)
	var finalIDs []bson.ObjectID
	for _, id := range participantIDs {
		if !uniqueIDs[id] {
			uniqueIDs[id] = true
			finalIDs = append(finalIDs, id)
		}
	}

	if len(finalIDs) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "A group chat must have at least 3 participants"})
		return
	}

	cursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": finalIDs}})
	var users []models.User
	cursor.All(c, &users)

	if len(users) != len(finalIDs) {
		c.JSON(http.StatusNotFound, gin.H{"message": "One or more users not found"})
		return
	}

	var activeIDs []bson.ObjectID
	var activeUsernames []string
	var pendingIDs []bson.ObjectID
	var pendingUsernames []string

	for _, u := range users {
		if u.ID == currentUser.ID {
			activeIDs = append(activeIDs, u.ID)
			activeUsernames = append(activeUsernames, u.Username)
		} else if hasConnection(currentUser, u.ID) {
			activeIDs = append(activeIDs, u.ID)
			activeUsernames = append(activeUsernames, u.Username)
		} else {
			pendingIDs = append(pendingIDs, u.ID)
			pendingUsernames = append(pendingUsernames, u.Username)
		}
	}

	newChat := models.Chat{
		ID:                   bson.NewObjectID(),
		Name:                 &body.Name,
		IsGroupChat:          true,
		GroupAdmin:           &currentUser.ID,
		Avatar:               body.Avatar,
		Participants:         activeIDs,
		ParticipantUsernames: activeUsernames,
		PendingParticipants:  pendingIDs,
		PendingUsernames:     pendingUsernames,
		Status:               "accepted",
		InitiatorID:          &currentUser.ID,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	_, err := db.ChatCollection.InsertOne(c, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create group chat"})
		return
	}

	c.JSON(http.StatusCreated, newChat)
}

func GetChatById(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	isParticipant := false
	for _, p := range chat.Participants {
		if p == currentUser.ID {
			isParticipant = true
			break
		}
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	var participants []models.User
	cursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": chat.Participants}}, options.Find().SetProjection(bson.M{"username": 1, "email": 1, "avatar": 1}))
	cursor.All(c, &participants)

	c.JSON(http.StatusOK, gin.H{
		"_id":                  chat.ID,
		"name":                 chat.Name,
		"isGroupChat":          chat.IsGroupChat,
		"groupAdmin":           chat.GroupAdmin,
		"avatar":               chat.Avatar,
		"participants":         formatParticipants(participants),
		"participantUsernames": chat.ParticipantUsernames,
		"createdAt":            chat.CreatedAt,
		"updatedAt":            chat.UpdatedAt,
	})
}

func UpdateGroupChat(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	var body struct {
		Name       *string `json:"name"`
		Avatar     *string `json:"avatar"`
		GroupAdmin *string `json:"groupAdmin"`
	}
	c.ShouldBindJSON(&body)

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !chat.IsGroupChat {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a group chat"})
		return
	}

	if chat.GroupAdmin == nil || *chat.GroupAdmin != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	update := bson.M{"$set": bson.M{"updatedAt": time.Now()}}
	set := update["$set"].(bson.M)
	systemMsg := ""

	if body.Name != nil {
		set["name"] = *body.Name
		systemMsg = currentUser.Username + " updated the group name"
	}
	if body.Avatar != nil {
		set["avatar"] = *body.Avatar
		systemMsg = currentUser.Username + " updated the group avatar"
	}
	if body.GroupAdmin != nil {
		newAdminID, _ := bson.ObjectIDFromHex(*body.GroupAdmin)
		isPart := false
		for _, p := range chat.Participants {
			if p == newAdminID {
				isPart = true
				break
			}
		}
		if !isPart {
			c.JSON(http.StatusBadRequest, gin.H{"error": "New admin must be a participant"})
			return
		}
		set["groupAdmin"] = newAdminID
		var newAdmin models.User
		db.UserCollection.FindOne(c, bson.M{"_id": newAdminID}).Decode(&newAdmin)
		systemMsg = currentUser.Username + " promoted " + newAdmin.Username + " to admin"
	}

	var newSysMsg models.Message
	if systemMsg != "" {
		newSysMsg = models.Message{
			ID:              bson.NewObjectID(),
			ChatID:          chatID,
			Sender:          currentUser.ID,
			SenderUsername: currentUser.Username,
			Text:            systemMsg,
			IsSystemMessage: true,
			Status:         "sent",
			Read:           false,
			ReadBy:         []models.ReadByEntry{},
			DeliveredTo:    []bson.ObjectID{},
			Reactions:      []models.Reaction{},
			DeletedBy:      []bson.ObjectID{},
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
	}

	session, err := db.MongoClient.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database session"})
		return
	}
	defer session.EndSession(c.Request.Context())

	err = mongo.WithSession(c.Request.Context(), session, func(sc context.Context) error {
		if err := session.StartTransaction(); err != nil {
			return err
		}

		_, err = db.ChatCollection.UpdateOne(sc, bson.M{"_id": chatID}, update)
		if err != nil {
			return err
		}

		if systemMsg != "" {
			_, err = db.MessageCollection.InsertOne(sc, newSysMsg)
			if err != nil {
				return err
			}
		}

		return session.CommitTransaction(sc)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update chat"})
		return
	}

	var updatedChat models.Chat
	db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&updatedChat)

	var participants []models.User
	pCursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": updatedChat.Participants}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
	if pCursor != nil {
		pCursor.All(c, &participants)
	}

	chatMap := gin.H{
		"_id":                  updatedChat.ID.Hex(),
		"name":                 updatedChat.Name,
		"isGroupChat":          updatedChat.IsGroupChat,
		"groupAdmin":           nil,
		"avatar":               updatedChat.Avatar,
		"participants":         formatParticipants(participants),
		"participantUsernames": updatedChat.ParticipantUsernames,
		"createdAt":            updatedChat.CreatedAt,
		"updatedAt":            updatedChat.UpdatedAt,
	}
	if updatedChat.GroupAdmin != nil {
		chatMap["groupAdmin"] = updatedChat.GroupAdmin.Hex()
	}

	utils.TriggerPusher("chat-"+chatIDStr, "chat-updated", chatMap)

	var populatedSysMsg gin.H
	if systemMsg != "" {
		populatedSysMsg = gin.H{
			"_id":             newSysMsg.ID.Hex(),
			"chatId":          chatIDStr,
			"sender": gin.H{
				"_id":      currentUser.ID.Hex(),
				"username": currentUser.Username,
				"avatar":   currentUser.Avatar,
			},
			"text":            newSysMsg.Text,
			"isSystemMessage": true,
			"createdAt":       newSysMsg.CreatedAt,
		}
		utils.TriggerPusher("chat-"+chatIDStr, "receive-message", populatedSysMsg)
	}

	for _, pid := range updatedChat.Participants {
		utils.TriggerPusher("user-"+pid.Hex(), "chat-update", gin.H{
			"chatId":       chatIDStr,
			"name":         updatedChat.Name,
			"avatar":       updatedChat.Avatar,
			"participants": formatParticipants(participants),
			"lastMessage":  populatedSysMsg,
		})
	}

	c.JSON(http.StatusOK, chatMap)
}

func RemoveParticipant(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	var body struct {
		UserID string `json:"userId"`
	}
	c.ShouldBindJSON(&body)
	targetID, err := bson.ObjectIDFromHex(body.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target User ID format"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !chat.IsGroupChat || chat.GroupAdmin == nil || *chat.GroupAdmin != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	var targetUser models.User
	db.UserCollection.FindOne(c, bson.M{"_id": targetID}).Decode(&targetUser)

	systemMsg := currentUser.Username + " removed " + targetUser.Username + " from the chat"

	newParticipants := []bson.ObjectID{}
	for _, p := range chat.Participants {
		if p != targetID {
			newParticipants = append(newParticipants, p)
		}
	}

	newUsernames := []string{}
	for _, u := range chat.ParticipantUsernames {
		if u != targetUser.Username {
			newUsernames = append(newUsernames, u)
		}
	}

	newSysMsg := models.Message{
		ID:              bson.NewObjectID(),
		ChatID:          chatID,
		Sender:          currentUser.ID,
		SenderUsername: currentUser.Username,
		Text:            systemMsg,
		IsSystemMessage: true,
		Status:         "sent",
		Read:           false,
		ReadBy:         []models.ReadByEntry{},
		DeliveredTo:    []bson.ObjectID{},
		Reactions:      []models.Reaction{},
		DeletedBy:      []bson.ObjectID{},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	session, err := db.MongoClient.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database session"})
		return
	}
	defer session.EndSession(c.Request.Context())

	err = mongo.WithSession(c.Request.Context(), session, func(sc context.Context) error {
		if err := session.StartTransaction(); err != nil {
			return err
		}

		_, err = db.ChatCollection.UpdateOne(sc, bson.M{"_id": chatID}, bson.M{
			"$set": bson.M{
				"participants":         newParticipants,
				"participantUsernames": newUsernames,
				"updatedAt":            time.Now(),
			},
		})
		if err != nil {
			return err
		}

		_, err = db.MessageCollection.InsertOne(sc, newSysMsg)
		if err != nil {
			return err
		}

		return session.CommitTransaction(sc)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove participant"})
		return
	}

	var updatedChat models.Chat
	db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&updatedChat)

	var participants []models.User
	pCursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": updatedChat.Participants}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
	if pCursor != nil {
		pCursor.All(c, &participants)
	}

	chatMap := gin.H{
		"_id":                  updatedChat.ID.Hex(),
		"name":                 updatedChat.Name,
		"isGroupChat":          updatedChat.IsGroupChat,
		"groupAdmin":           nil,
		"avatar":               updatedChat.Avatar,
		"participants":         formatParticipants(participants),
		"participantUsernames": updatedChat.ParticipantUsernames,
		"createdAt":            updatedChat.CreatedAt,
		"updatedAt":            updatedChat.UpdatedAt,
	}
	if updatedChat.GroupAdmin != nil {
		chatMap["groupAdmin"] = updatedChat.GroupAdmin.Hex()
	}

	populatedSysMsg := gin.H{
		"_id":             newSysMsg.ID.Hex(),
		"chatId":          chatIDStr,
		"sender": gin.H{
			"_id":      currentUser.ID.Hex(),
			"username": currentUser.Username,
			"avatar":   currentUser.Avatar,
			"email":    currentUser.Email,
		},
		"text":            newSysMsg.Text,
		"isSystemMessage": true,
		"createdAt":       newSysMsg.CreatedAt,
		"updatedAt":       newSysMsg.UpdatedAt,
		"status":          "sent",
		"read":            false,
	}
	utils.TriggerPusher("chat-"+chatIDStr, "receive-message", populatedSysMsg)

	utils.TriggerPusher("chat-"+chatIDStr, "chat-updated", chatMap)
	for _, pid := range updatedChat.Participants {
		utils.TriggerPusher("user-"+pid.Hex(), "chat-update", gin.H{
			"chatId":       chatIDStr,
			"name":         updatedChat.Name,
			"avatar":       updatedChat.Avatar,
			"participants": formatParticipants(participants),
			"lastMessage":  populatedSysMsg,
		})
	}
	utils.TriggerPusher("user-"+body.UserID, "chat-removed", gin.H{"chatId": chatIDStr})

	c.JSON(http.StatusOK, chatMap)
}

func LeaveChat(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := db.ChatCollection.CountDocuments(ctx, bson.M{"_id": chatID, "participants": currentUser.ID})
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found or access denied"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !chat.IsGroupChat {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a group chat"})
		return
	}

	newParticipants := []bson.ObjectID{}
	for _, p := range chat.Participants {
		if p != currentUser.ID {
			newParticipants = append(newParticipants, p)
		}
	}

	if len(newParticipants) == 0 {
		db.ChatCollection.DeleteOne(c, bson.M{"_id": chatID})
		c.JSON(http.StatusOK, gin.H{"message": "Chat deleted as everyone left"})
		return
	}

	newAdmin := chat.GroupAdmin
	if chat.GroupAdmin != nil && *chat.GroupAdmin == currentUser.ID {
		newAdmin = &newParticipants[0]
	}

	newUsernames := []string{}
	for _, u := range chat.ParticipantUsernames {
		if u != currentUser.Username {
			newUsernames = append(newUsernames, u)
		}
	}

	systemMsg := currentUser.Username + " left the chat"
	newSysMsg := models.Message{
		ID:              bson.NewObjectID(),
		ChatID:          chatID,
		Sender:          currentUser.ID,
		SenderUsername: currentUser.Username,
		Text:            systemMsg,
		IsSystemMessage: true,
		Status:         "sent",
		Read:           false,
		ReadBy:         []models.ReadByEntry{},
		DeliveredTo:    []bson.ObjectID{},
		Reactions:      []models.Reaction{},
		DeletedBy:      []bson.ObjectID{},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	session, err := db.MongoClient.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database session"})
		return
	}
	defer session.EndSession(c.Request.Context())

	err = mongo.WithSession(c.Request.Context(), session, func(sc context.Context) error {
		if err := session.StartTransaction(); err != nil {
			return err
		}

		_, err = db.ChatCollection.UpdateOne(sc, bson.M{"_id": chatID}, bson.M{
			"$set": bson.M{
				"participants":         newParticipants,
				"participantUsernames": newUsernames,
				"groupAdmin":           newAdmin,
				"updatedAt":            time.Now(),
			},
		})
		if err != nil {
			return err
		}

		_, err = db.MessageCollection.InsertOne(sc, newSysMsg)
		if err != nil {
			return err
		}

		return session.CommitTransaction(sc)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave chat"})
		return
	}

	utils.TriggerPusher("chat-"+chatIDStr, "chat-updated", chat)
	utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-removed", gin.H{"chatId": chatIDStr})
	utils.TriggerPusher("chat-"+chatIDStr, "receive-message", newSysMsg)

	c.JSON(http.StatusOK, gin.H{"message": "Left chat"})
}

func AddParticipant(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("chatId")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	var body struct {
		UserIDs []string `json:"userIds"`
	}
	c.ShouldBindJSON(&body)

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if !chat.IsGroupChat {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a group chat"})
		return
	}

	isParticipant := false
	for _, p := range chat.Participants {
		if p == currentUser.ID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	var newActiveIDs []bson.ObjectID
	var newActiveUsernames []string
	var newPendingIDs []bson.ObjectID
	var newPendingUsernames []string

	for _, idStr := range body.UserIDs {
		id, err := bson.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}
		exists := false
		for _, p := range chat.Participants {
			if p == id {
				exists = true
				break
			}
		}
		for _, p := range chat.PendingParticipants {
			if p == id {
				exists = true
				break
			}
		}

		if !exists {
			var u models.User
			db.UserCollection.FindOne(c, bson.M{"_id": id}).Decode(&u)
			if hasConnection(currentUser, id) {
				newActiveIDs = append(newActiveIDs, id)
				newActiveUsernames = append(newActiveUsernames, u.Username)
			} else {
				newPendingIDs = append(newPendingIDs, id)
				newPendingUsernames = append(newPendingUsernames, u.Username)
			}
		}
	}

	if len(newActiveIDs) == 0 && len(newPendingIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No new users to add"})
		return
	}

	allParticipants := append(chat.Participants, newActiveIDs...)
	allUsernames := append(chat.ParticipantUsernames, newActiveUsernames...)
	allPending := append(chat.PendingParticipants, newPendingIDs...)
	allPendingUsernames := append(chat.PendingUsernames, newPendingUsernames...)

	db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{
		"$set": bson.M{
			"participants":         allParticipants,
			"participantUsernames": allUsernames,
			"pendingParticipants":  allPending,
			"pendingUsernames":     allPendingUsernames,
			"updatedAt":            time.Now(),
		},
	})

	var updatedChat models.Chat
	db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&updatedChat)

	var participants []models.User
	pCursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": updatedChat.Participants}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
	if pCursor != nil {
		pCursor.All(c, &participants)
	}

	chatMap := gin.H{
		"_id":                  updatedChat.ID.Hex(),
		"name":                 updatedChat.Name,
		"isGroupChat":          updatedChat.IsGroupChat,
		"groupAdmin":           nil,
		"avatar":               updatedChat.Avatar,
		"participants":         formatParticipants(participants),
		"participantUsernames": updatedChat.ParticipantUsernames,
		"createdAt":            updatedChat.CreatedAt,
		"updatedAt":            updatedChat.UpdatedAt,
	}
	if updatedChat.GroupAdmin != nil {
		chatMap["groupAdmin"] = updatedChat.GroupAdmin.Hex()
	}

	var populatedSysMsg gin.H
	if len(newActiveIDs) > 0 {
		systemMsg := "@" + currentUser.Username + " added " + joinStrings(newActiveUsernames) + " to the chat"
		newSysMsg := models.Message{
			ID:              bson.NewObjectID(),
			ChatID:          chatID,
			Sender:          currentUser.ID,
			SenderUsername: currentUser.Username,
			Text:            systemMsg,
			IsSystemMessage: true,
			Status:         "sent",
			Read:           false,
			ReadBy:         []models.ReadByEntry{},
			DeliveredTo:    []bson.ObjectID{},
			Reactions:      []models.Reaction{},
			DeletedBy:      []bson.ObjectID{},
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		db.MessageCollection.InsertOne(c, newSysMsg)

		populatedSysMsg = gin.H{
			"_id":             newSysMsg.ID.Hex(),
			"chatId":          chatIDStr,
			"sender": gin.H{
				"_id":      currentUser.ID.Hex(),
				"username": currentUser.Username,
				"avatar":   currentUser.Avatar,
				"email":    currentUser.Email,
			},
			"text":            newSysMsg.Text,
			"isSystemMessage": true,
			"createdAt":       newSysMsg.CreatedAt,
			"updatedAt":       newSysMsg.UpdatedAt,
			"status":          "sent",
			"read":            false,
		}
		utils.TriggerPusher("chat-"+chatIDStr, "receive-message", populatedSysMsg)
	}

	utils.TriggerPusher("chat-"+chatIDStr, "chat-updated", chatMap)
	for _, pid := range updatedChat.Participants {
		utils.TriggerPusher("user-"+pid.Hex(), "chat-update", gin.H{
			"chatId":       chatIDStr,
			"name":         updatedChat.Name,
			"avatar":       updatedChat.Avatar,
			"participants": formatParticipants(participants),
			"lastMessage":  populatedSysMsg,
		})
	}

	for _, pid := range newPendingIDs {
		utils.TriggerPusher("user-"+pid.Hex(), "chat-update", gin.H{
			"chatId":       chatIDStr,
			"name":         updatedChat.Name,
			"avatar":       updatedChat.Avatar,
			"participants": formatParticipants(participants),
			"lastMessage":  nil,
		})
	}

	c.JSON(http.StatusOK, chatMap)
}

func HideChat(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("id")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := db.ChatCollection.CountDocuments(ctx, bson.M{"_id": chatID, "participants": currentUser.ID})
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found or access denied"})
		return
	}

	_, err = db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{
		"$addToSet": bson.M{"hiddenBy": currentUser.ID},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to hide chat"})
		return
	}

	utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-removed", gin.H{"chatId": chatIDStr})

	c.JSON(http.StatusOK, gin.H{"message": "Chat hidden"})
}

func TypingIndicator(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	var body struct {
		ChatID   string `json:"chatId"`
		Username string `json:"username"`
		IsTyping bool   `json:"isTyping"`
	}
	c.ShouldBindJSON(&body)

	event := "user-stopped-typing"
	if body.IsTyping {
		event = "user-typing"
	}

	utils.TriggerPusher("chat-"+body.ChatID, event, gin.H{
		"username": body.Username,
		"userId":   currentUser.ID.Hex(),
	})

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func joinStrings(s []string) string {
	res := ""
	for i, v := range s {
		res += v
		if i < len(s)-1 {
			res += ", "
		}
	}
	return res
}

func formatParticipants(users []models.User) []gin.H {
	res := make([]gin.H, len(users))
	for i, u := range users {
		res[i] = gin.H{
			"_id":      u.ID.Hex(),
			"username": usernameCheck(u.Username),
			"avatar":   u.Avatar,
			"email":    u.Email,
			"name":     u.Name,
		}
	}
	return res
}

func usernameCheck(username string) string {
	if username == "" {
		return "Unknown User"
	}
	return username
}

func GetChatRequests(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser, ok := userObj.(models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	filter := bson.M{
		"hiddenBy": bson.M{"$nin": []bson.ObjectID{currentUser.ID}},
		"$or": []bson.M{
			{
				"participants": currentUser.ID,
				"isGroupChat":  false,
				"status":       "pending",
				"initiatorId":  bson.M{"$ne": currentUser.ID},
			},
			{
				"pendingParticipants": currentUser.ID,
				"isGroupChat":         true,
			},
		},
	}

	opts := options.Find().SetSort(bson.M{"updatedAt": -1})
	cursor, err := db.ChatCollection.Find(c, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch chat requests"})
		return
	}
	defer cursor.Close(c)

	var chats []bson.M
	if err = cursor.All(c, &chats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to decode chats"})
		return
	}

	userIDsMap := make(map[bson.ObjectID]bool)
	var chatIDs []bson.ObjectID

	for _, chat := range chats {
		if chatID, ok := chat["_id"].(bson.ObjectID); ok {
			chatIDs = append(chatIDs, chatID)
		}
		if participantIDs, ok := chat["participants"].(bson.A); ok {
			for _, pid := range participantIDs {
				if id, valid := pid.(bson.ObjectID); valid {
					userIDsMap[id] = true
				}
			}
		}
	}

	var userIDs []bson.ObjectID
	for id := range userIDsMap {
		userIDs = append(userIDs, id)
	}

	userCache := make(map[bson.ObjectID]models.User)
	if len(userIDs) > 0 {
		cursor, err := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": userIDs}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
		if err == nil {
			var users []models.User
			cursor.All(c, &users)
			for _, u := range users {
				userCache[u.ID] = u
			}
			cursor.Close(c)
		}
	}

	result := []gin.H{} 
	for _, chat := range chats {
		if participantIDs, ok := chat["participants"].(bson.A); ok {
			var participants []models.User
			for _, pid := range participantIDs {
				if id, valid := pid.(bson.ObjectID); valid {
					if user, found := userCache[id]; found {
						participants = append(participants, user)
					}
				}
			}
			chat["participants"] = participants
		}
		result = append(result, gin.H(chat))
	}

	c.JSON(http.StatusOK, result)
}

func AcceptChatRequest(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("id")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if chat.IsGroupChat {
		isPending := false
		for _, p := range chat.PendingParticipants {
			if p == currentUser.ID {
				isPending = true
				break
			}
		}
		if !isPending {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You do not have a pending invitation to this group chat"})
			return
		}

		newPending := []bson.ObjectID{}
		for _, p := range chat.PendingParticipants {
			if p != currentUser.ID {
				newPending = append(newPending, p)
			}
		}

		newPendingUsernames := []string{}
		for _, u := range chat.PendingUsernames {
			if u != currentUser.Username {
				newPendingUsernames = append(newPendingUsernames, u)
			}
		}

		newParticipants := append(chat.Participants, currentUser.ID)
		newParticipantUsernames := append(chat.ParticipantUsernames, currentUser.Username)

		_, err = db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{
			"$set": bson.M{
				"participants":         newParticipants,
				"participantUsernames": newParticipantUsernames,
				"pendingParticipants":  newPending,
				"pendingUsernames":     newPendingUsernames,
				"updatedAt":            time.Now(),
			},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept group chat request"})
			return
		}

		systemMsg := "@" + currentUser.Username + " joined the chat"
		newSysMsg := models.Message{
			ID:              bson.NewObjectID(),
			ChatID:          chatID,
			Sender:          currentUser.ID,
			SenderUsername: currentUser.Username,
			Text:            systemMsg,
			IsSystemMessage: true,
			Status:         "sent",
			Read:           false,
			ReadBy:         []models.ReadByEntry{},
			DeliveredTo:    []bson.ObjectID{},
			Reactions:      []models.Reaction{},
			DeletedBy:      []bson.ObjectID{},
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		db.MessageCollection.InsertOne(c, newSysMsg)

		populatedSysMsg := gin.H{
			"_id":             newSysMsg.ID.Hex(),
			"chatId":          chatIDStr,
			"sender": gin.H{
				"_id":      currentUser.ID.Hex(),
				"username": currentUser.Username,
				"avatar":   currentUser.Avatar,
				"email":    currentUser.Email,
			},
			"text":            newSysMsg.Text,
			"isSystemMessage": true,
			"createdAt":       newSysMsg.CreatedAt,
			"updatedAt":       newSysMsg.UpdatedAt,
			"status":          "sent",
			"read":            false,
		}

		var participants []models.User
		pCursor, _ := db.UserCollection.Find(c, bson.M{"_id": bson.M{"$in": newParticipants}}, options.Find().SetProjection(bson.M{"username": 1, "name": 1, "avatar": 1, "email": 1}))
		if pCursor != nil {
			pCursor.All(c, &participants)
		}

		chatMap := gin.H{
			"_id":                  chat.ID.Hex(),
			"name":                 chat.Name,
			"isGroupChat":          chat.IsGroupChat,
			"groupAdmin":           nil,
			"avatar":               chat.Avatar,
			"participants":         formatParticipants(participants),
			"participantUsernames": newParticipantUsernames,
			"createdAt":            chat.CreatedAt,
			"updatedAt":            time.Now(),
		}
		if chat.GroupAdmin != nil {
			chatMap["groupAdmin"] = chat.GroupAdmin.Hex()
		}

		utils.TriggerPusher("chat-"+chatIDStr, "receive-message", populatedSysMsg)
		utils.TriggerPusher("chat-"+chatIDStr, "chat-updated", chatMap)

		for _, pid := range newParticipants {
			utils.TriggerPusher("user-"+pid.Hex(), "chat-update", gin.H{
				"chatId":       chatIDStr,
				"name":         chat.Name,
				"avatar":       chat.Avatar,
				"participants": formatParticipants(participants),
				"lastMessage":  populatedSysMsg,
			})
		}
		utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-accepted", gin.H{"chatId": chatIDStr})

		c.JSON(http.StatusOK, gin.H{"message": "Joined group chat"})
		return
	}

	_, err = db.ChatCollection.UpdateOne(c, bson.M{
		"_id":          chatID,
		"participants": currentUser.ID,
		"status":       "pending",
	}, bson.M{
		"$set": bson.M{"status": "accepted", "updatedAt": time.Now()},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to accept chat"})
		return
	}

	utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-accepted", gin.H{"chatId": chatIDStr})

	c.JSON(http.StatusOK, gin.H{"message": "Chat accepted"})
}

func RejectChatRequest(c *gin.Context) {
	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)
	chatIDStr := c.Param("id")
	chatID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	var chat models.Chat
	err = db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	if chat.IsGroupChat {
		isPending := false
		for _, p := range chat.PendingParticipants {
			if p == currentUser.ID {
				isPending = true
				break
			}
		}
		if !isPending {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You do not have a pending invitation to this group chat"})
			return
		}

		newPending := []bson.ObjectID{}
		for _, p := range chat.PendingParticipants {
			if p != currentUser.ID {
				newPending = append(newPending, p)
			}
		}

		newPendingUsernames := []string{}
		for _, u := range chat.PendingUsernames {
			if u != currentUser.Username {
				newPendingUsernames = append(newPendingUsernames, u)
			}
		}

		_, err = db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{
			"$set": bson.M{
				"pendingParticipants": newPending,
				"pendingUsernames":    newPendingUsernames,
				"updatedAt":           time.Now(),
			},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject group chat request"})
			return
		}

		utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-rejected", gin.H{"chatId": chatIDStr})

		c.JSON(http.StatusOK, gin.H{"message": "Group invitation rejected"})
		return
	}

	_, err = db.ChatCollection.UpdateOne(c, bson.M{
		"_id":          chatID,
		"participants": currentUser.ID,
		"status":       "pending",
	}, bson.M{
		"$set": bson.M{"status": "rejected", "updatedAt": time.Now()},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to reject chat"})
		return
	}

	utils.TriggerPusher("user-"+currentUser.ID.Hex(), "chat-rejected", gin.H{"chatId": chatIDStr})

	c.JSON(http.StatusOK, gin.H{"message": "Chat rejected"})
}

func hasConnection(u1 models.User, u2ID bson.ObjectID) bool {
	for _, id := range u1.Followers {
		if id == u2ID {
			return true
		}
	}
	for _, id := range u1.Following {
		if id == u2ID {
			return true
		}
	}
	return false
}
