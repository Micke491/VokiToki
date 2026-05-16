package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/livekit/protocol/auth"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var (
	ctx        = context.Background()
	localCache sync.Map
)

func setCache(key string, value string, duration time.Duration) {
	if db.RedisClient != nil {
		db.RedisClient.Set(ctx, key, value, duration)
	} else {
		localCache.Store(key, value)
		go func() {
			time.Sleep(duration)
			localCache.Delete(key)
		}()
	}
}

func getCache(key string) (string, error) {
	if db.RedisClient != nil {
		return db.RedisClient.Get(ctx, key).Result()
	}
	if val, ok := localCache.Load(key); ok {
		return val.(string), nil
	}
	return "", fmt.Errorf("not found")
}

func delCache(key string) {
	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, key)
	} else {
		localCache.Delete(key)
	}
}

type CallState struct {
	CallID       string `json:"call_id"`
	CallerID     string `json:"caller_id"`
	CalleeID     string `json:"callee_id"`
	CallType     string `json:"call_type"`
	Status       string `json:"status"`
	CallerName   string `json:"caller_name"`
	CallerAvatar string `json:"caller_avatar"`
	ChatID       string `json:"chat_id"`
}

type InitiateCallReq struct {
	CallID       string `json:"call_id"`
	CallerID     string `json:"caller_id"`
	CalleeID     string `json:"callee_id"`
	CallType     string `json:"call_type"`
	CallerName   string `json:"caller_name"`
	CallerAvatar string `json:"caller_avatar"`
	ChatID       string `json:"chat_id"`
}

type CallActionReq struct {
	CallID string `json:"call_id"`
	UserID string `json:"user_id"`
}

func InitiateCall(c *gin.Context) {
	var req InitiateCallReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	callID := req.CallID
	if callID == "" {
		callID = uuid.New().String()
	}

	val, err := getCache("call:" + callID)
	if err == nil && strings.Contains(val, "cancelled") {
		c.JSON(http.StatusOK, gin.H{"message": "Call was cancelled before it started"})
		return
	}

	isGroupCall := req.CalleeID == ""
	state := CallState{
		CallID:       callID,
		CallerID:     req.CallerID,
		CalleeID:     req.CalleeID,
		CallType:     req.CallType,
		Status:       "ringing",
		CallerName:   req.CallerName,
		CallerAvatar: req.CallerAvatar,
		ChatID:       req.ChatID,
	}

	stateJSON, _ := json.Marshal(state)

	setCache("call:"+callID, string(stateJSON), 60*time.Second)
	setCache("user_status:"+req.CallerID, "busy", 60*time.Second)
	if !isGroupCall {
		setCache("user_status:"+req.CalleeID, "busy", 60*time.Second)
	}

	if isGroupCall {
		chatID, _ := bson.ObjectIDFromHex(req.ChatID)
		var chat models.Chat
		db.ChatCollection.FindOne(c, bson.M{"_id": chatID}).Decode(&chat)
		for _, pID := range chat.Participants {
			if pID.Hex() == req.CallerID {
				continue
			}
			utils.TriggerPusher("user-"+pID.Hex(), "incoming_call", map[string]interface{}{
				"call_id":       callID,
				"caller_id":     req.CallerID,
				"call_type":     req.CallType,
				"caller_name":   req.CallerName,
				"caller_avatar": req.CallerAvatar,
				"chat_id":       req.ChatID,
			})
		}
	} else {
		utils.TriggerPusher("user-"+req.CalleeID, "incoming_call", map[string]interface{}{
			"call_id":       callID,
			"caller_id":     req.CallerID,
			"call_type":     req.CallType,
			"caller_name":   req.CallerName,
			"caller_avatar": req.CallerAvatar,
			"chat_id":       req.ChatID,
		})
	}

	userObj, _ := c.Get("user")
	currentUser := userObj.(models.User)

	if req.ChatID != "" {
		chatID, err := bson.ObjectIDFromHex(req.ChatID)
		if err == nil {
			callMsg := models.Message{
				ID:              bson.NewObjectID(),
				ChatID:          chatID,
				Sender:          currentUser.ID,
				SenderUsername:  currentUser.Username,
				Text:            fmt.Sprintf("%s started a %s call", currentUser.Username, req.CallType),
				MediaType:       "call",
				MediaPublicID:   callID,
				IsSystemMessage: false,
				Status:          "sent",
				Read:            false,
				ReadBy:          []models.ReadByEntry{},
				DeliveredTo:     []bson.ObjectID{},
				Reactions:       []models.Reaction{},
				DeletedBy:       []bson.ObjectID{},
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}

			_, insertErr := db.MessageCollection.InsertOne(c, callMsg)
			if insertErr == nil {
				db.ChatCollection.UpdateOne(c, bson.M{"_id": chatID}, bson.M{
					"$set": bson.M{
						"lastMessage": callMsg.ID,
						"updatedAt":   time.Now(),
					},
				})

				populatedMsg := gin.H{
					"_id":            callMsg.ID,
					"chatId":         callMsg.ChatID,
					"sender":         gin.H{"_id": currentUser.ID, "username": currentUser.Username, "avatar": currentUser.Avatar},
					"senderUsername": callMsg.SenderUsername,
					"text":           callMsg.Text,
					"mediaType":      callMsg.MediaType,
					"mediaPublicId":  callMsg.MediaPublicID,
					"status":         callMsg.Status,
					"createdAt":      callMsg.CreatedAt.Format(time.RFC3339),
				}
				utils.TriggerPusher("chat-"+req.ChatID, "receive-message", populatedMsg)
				utils.TriggerPusher("user-"+req.CalleeID, "chat-update", gin.H{
					"chatId":      req.ChatID,
					"lastMessage": populatedMsg,
					"unreadCount": 1,
				})
			} else {
				log.Printf("Failed to insert call message: %v\n", insertErr)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Call initiated", "call_id": callID})
}

func AcceptCall(c *gin.Context) {
	var req CallActionReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	val, err := getCache("call:" + req.CallID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Call not found or expired"})
		return
	}

	var state CallState
	json.Unmarshal([]byte(val), &state)

	state.Status = "active"
	stateJSON, _ := json.Marshal(state)
	setCache("call:"+req.CallID, string(stateJSON), 2*time.Hour)
	setCache("user_status:"+state.CallerID, "busy", 2*time.Hour)
	if state.CalleeID != "" {
		setCache("user_status:"+state.CalleeID, "busy", 2*time.Hour)
	}

	callerName := state.CallerName
	if callerName == "" {
		callerObjID, err := bson.ObjectIDFromHex(state.CallerID)
		if err == nil {
			var caller models.User
			db.UserCollection.FindOne(c, bson.M{"_id": callerObjID}).Decode(&caller)
			callerName = caller.Username
		}
		if callerName == "" {
			callerName = "Caller"
		}
	}

	isCaller := req.UserID == state.CallerID

	var participantName string
	userObjID, _ := bson.ObjectIDFromHex(req.UserID)
	var user models.User
	db.UserCollection.FindOne(c, bson.M{"_id": userObjID}).Decode(&user)
	participantName = user.Username
	if participantName == "" {
		participantName = "User"
	}

	responseToken := generateLiveKitToken(req.CallID, req.UserID, participantName)

	if !isCaller {
		utils.TriggerPusher("user-"+state.CallerID, "call_accepted", map[string]interface{}{
			"call_id": req.CallID,
			"token":   generateLiveKitToken(req.CallID, state.CallerID, state.CallerName),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Call accepted",
		"token":   responseToken,
	})
}

func RejectCall(c *gin.Context) {
	var req CallActionReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	val, err := getCache("call:" + req.CallID)
	if err == nil {
		var state CallState
		json.Unmarshal([]byte(val), &state)

		delCache("user_status:" + state.CallerID)
		delCache("user_status:" + state.CalleeID)
		delCache("call:" + req.CallID)

		utils.TriggerPusher("user-"+state.CallerID, "call_rejected", map[string]interface{}{
			"call_id": req.CallID,
		})

		var msg models.Message
		err = db.MessageCollection.FindOne(c, bson.M{"mediaPublicId": req.CallID, "mediaType": "call"}).Decode(&msg)
		if err == nil {
			db.MessageCollection.UpdateOne(c, bson.M{"_id": msg.ID}, bson.M{
				"$set": bson.M{
					"text":      "Call Ended",
					"updatedAt": time.Now(),
				},
			})
			msg.Text = "Call Ended"
			var sender models.User
			db.UserCollection.FindOne(c, bson.M{"_id": msg.Sender}).Decode(&sender)

			populatedMsg := gin.H{
				"_id":            msg.ID,
				"chatId":         msg.ChatID,
				"sender":         gin.H{"_id": sender.ID, "username": sender.Username, "avatar": sender.Avatar},
				"senderUsername": msg.SenderUsername,
				"text":           msg.Text,
				"mediaType":      msg.MediaType,
				"mediaPublicId":  msg.MediaPublicID,
				"createdAt":      msg.CreatedAt,
				"updatedAt":      time.Now(),
			}
			utils.TriggerPusher("chat-"+msg.ChatID.Hex(), "message-updated", populatedMsg)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Call rejected"})
}

func EndCall(c *gin.Context) {
	var req CallActionReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	val, err := getCache("call:" + req.CallID)
	if err == nil {
		var state CallState
		json.Unmarshal([]byte(val), &state)

		delCache("user_status:" + state.CallerID)
		delCache("user_status:" + state.CalleeID)
		delCache("call:" + req.CallID)

		otherUserID := state.CallerID
		if req.UserID == state.CallerID {
			otherUserID = state.CalleeID
		}

		utils.TriggerPusher("user-"+otherUserID, "call_ended", map[string]interface{}{
			"call_id": req.CallID,
		})

		var msg models.Message
		err = db.MessageCollection.FindOne(c, bson.M{"mediaPublicId": req.CallID, "mediaType": "call"}).Decode(&msg)
		if err == nil {
			db.MessageCollection.UpdateOne(c, bson.M{"_id": msg.ID}, bson.M{
				"$set": bson.M{
					"text":      "Call Ended",
					"updatedAt": time.Now(),
				},
			})
			msg.Text = "Call Ended"
			var sender models.User
			db.UserCollection.FindOne(c, bson.M{"_id": msg.Sender}).Decode(&sender)

			populatedMsg := gin.H{
				"_id":            msg.ID,
				"chatId":         msg.ChatID,
				"sender":         gin.H{"_id": sender.ID, "username": sender.Username, "avatar": sender.Avatar},
				"senderUsername": msg.SenderUsername,
				"text":           msg.Text,
				"mediaType":      msg.MediaType,
				"mediaPublicId":  msg.MediaPublicID,
				"createdAt":      msg.CreatedAt,
				"updatedAt":      time.Now(),
			}
			utils.TriggerPusher("chat-"+msg.ChatID.Hex(), "message-updated", populatedMsg)
		}
	} else {
		setCache("call:"+req.CallID, `{"status": "cancelled"}`, 60*time.Second)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Call ended"})
}

func generateLiveKitToken(roomName string, participantIdentity string, participantName string) string {
	apiKey := config.AppConfig.LiveKitAPIKey
	apiSecret := config.AppConfig.LiveKitAPISecret

	if apiKey == "" || apiSecret == "" {
		log.Println("Error: LiveKit credentials not found in config")
		return ""
	}

	at := auth.NewAccessToken(apiKey, apiSecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     roomName,
	}
	at.AddGrant(grant).
		SetIdentity(participantIdentity).
		SetName(participantName).
		SetValidFor(2 * time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		log.Println("Error generating token:", err)
		return ""
	}
	return token
}