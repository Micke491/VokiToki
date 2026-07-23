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

type MuteRequest struct {
	ChatID        string `json:"chatId" binding:"required"`
	DurationHours int    `json:"durationHours"` 
}

func MuteChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	var req MuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	chatOID, err := bson.ObjectIDFromHex(req.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	var mutedUntil time.Time
	if req.DurationHours == -1 {
		mutedUntil = time.Now().AddDate(100, 0, 0)
	} else {
		mutedUntil = time.Now().Add(time.Duration(req.DurationHours) * time.Hour)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := db.ChatCollection.CountDocuments(ctx, bson.M{"_id": chatOID, "participants": authUser.ID})
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found or access denied"})
		return
	}

	_, _ = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$pull": bson.M{"mutedChats": bson.M{"chatId": chatOID}}},
	)
	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$push": bson.M{"mutedChats": models.MutedChat{ChatID: chatOID, MutedUntil: mutedUntil}}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mute chat"})
		return
	}

	utils.Broadcast("user-"+authUser.ID.Hex(), "chat-muted", gin.H{"chatId": chatOID.Hex()})
	c.JSON(http.StatusOK, gin.H{"message": "Chat muted successfully", "mutedUntil": mutedUntil})
}

func UnmuteChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	chatIDStr := c.Query("chatId")
	chatOID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$pull": bson.M{"mutedChats": bson.M{"chatId": chatOID}}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unmute chat"})
		return
	}

	utils.Broadcast("user-"+authUser.ID.Hex(), "chat-unmuted", gin.H{"chatId": chatOID.Hex()})
	c.JSON(http.StatusOK, gin.H{"message": "Chat unmuted"})
}

func GetMutedChats(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user preferences"})
		return
	}

	activeMutes := []models.MutedChat{}
	now := time.Now()
	for _, m := range user.MutedChats {
		if m.MutedUntil.After(now) {
			activeMutes = append(activeMutes, m)
		}
	}

	c.JSON(http.StatusOK, gin.H{"mutedChats": activeMutes})
}

type SessionResponse struct {
	ID         bson.ObjectID `json:"_id"`
	UserID     bson.ObjectID `json:"userId"`
	Device     string        `json:"device"`
	IP         string        `json:"ip"`
	LastActive time.Time     `json:"lastActive"`
	IsCurrent  bool          `json:"isCurrent"`
}

func GetActiveSessions(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := db.SessionCollection.Find(ctx, bson.M{"userId": authUser.ID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}
	defer cursor.Close(ctx)

	var sessions []models.Session
	if err = cursor.All(ctx, &sessions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read sessions"})
		return
	}

	var currentSessionID bson.ObjectID
	if sessID, exists := c.Get("sessionId"); exists {
		if id, ok := sessID.(bson.ObjectID); ok {
			currentSessionID = id
		}
	}

	sessionResponses := make([]SessionResponse, 0, len(sessions))
	for _, s := range sessions {
		sessionResponses = append(sessionResponses, SessionResponse{
			ID:         s.ID,
			UserID:     s.UserID,
			Device:     s.Device,
			IP:         s.IP,
			LastActive: s.LastActive,
			IsCurrent:  !currentSessionID.IsZero() && s.ID == currentSessionID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessionResponses})
}

func RevokeSession(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	sessionIDStr := c.Param("id")
	sessionOID, err := bson.ObjectIDFromHex(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Session ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var sess models.Session
	err = db.SessionCollection.FindOneAndDelete(ctx, bson.M{"_id": sessionOID, "userId": authUser.ID}).Decode(&sess)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke session"})
		return
	}

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "session_token:"+sess.Token)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session revoked"})
}

type PinRequest struct {
	ChatID string `json:"chatId" binding:"required"`
}

func PinChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	var req PinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	chatOID, err := bson.ObjectIDFromHex(req.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := db.ChatCollection.CountDocuments(ctx, bson.M{"_id": chatOID, "participants": authUser.ID})
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found or access denied"})
		return
	}

	_, _ = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$pull": bson.M{"pinnedChats": chatOID}},
	)
	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$push": bson.M{"pinnedChats": chatOID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to pin chat"})
		return
	}

	utils.Broadcast("user-"+authUser.ID.Hex(), "chat-pinned", gin.H{"chatId": chatOID.Hex()})
	c.JSON(http.StatusOK, gin.H{"message": "Chat pinned successfully"})
}

func UnpinChat(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	
	chatIDStr := c.Query("chatId")
	if chatIDStr == "" {
		var req PinRequest
		if err := c.ShouldBindJSON(&req); err == nil {
			chatIDStr = req.ChatID
		}
	}

	chatOID, err := bson.ObjectIDFromHex(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Chat ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$pull": bson.M{"pinnedChats": chatOID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unpin chat"})
		return
	}

	utils.Broadcast("user-"+authUser.ID.Hex(), "chat-unpinned", gin.H{"chatId": chatOID.Hex()})
	c.JSON(http.StatusOK, gin.H{"message": "Chat unpinned"})
}

func GetPinnedChats(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user preferences"})
		return
	}

	pinnedChats := []string{}
	for _, id := range user.PinnedChats {
		pinnedChats = append(pinnedChats, id.Hex())
	}

	c.JSON(http.StatusOK, gin.H{"pinnedChats": pinnedChats})
}

