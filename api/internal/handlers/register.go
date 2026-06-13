package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "Validation failed: " + err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	username := strings.TrimSpace(req.Username)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existing models.User
	err := db.UserCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"email": email},
			{"username": bson.M{"$regex": "^" + username + "$", "$options": "i"}},
		},
	}).Decode(&existing)

	if err == nil {
		if strings.ToLower(existing.Email) == email {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Email is already in use"})
		} else {
			c.JSON(http.StatusConflict, gin.H{"message": "Username is already taken"})
		}
		return
	}

	hashedPassword, err := services.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal server error"})
		return
	}

	newUser := models.User{
		ID:               bson.NewObjectID(),
		Username:         username,
		Email:            email,
		Password:         hashedPassword,
		Role:             "user",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		IsBanned:         false,
		ReadReceipts:     true,
		Theme:            "dark",
		BlockedUsers:     []bson.ObjectID{},
		MutedChats:       []models.MutedChat{},
		PinnedChats:      []bson.ObjectID{},
		Links:            []models.UserLink{},
		TwoFactorEnabled: false,
		AutoPlayGifs:     true,
		AutoPlayVoice:    true,
		Followers:        []bson.ObjectID{},
		Following:        []bson.ObjectID{},
		FollowRequests:   []bson.ObjectID{},
		SentFollowRequests: []bson.ObjectID{},
		StoryPrivacy:     "everyone",
	}

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.InsertOne(ctx, newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create account"})
		return
	}

	token, err := services.GenerateToken(newUser.ID.Hex(), newUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate session"})
		return
	}

	ctxBg := context.Background()
	session := models.Session{
		ID:         bson.NewObjectID(),
		UserID:     newUser.ID,
		Token:      token,
		Device:     c.Request.UserAgent(),
		IP:         c.ClientIP(),
		LastActive: time.Now(),
	}
	db.SessionCollection.InsertOne(ctxBg, session)

	if db.RedisClient != nil {
		tokenCacheKey := "session_token:" + token
		sessJSON, _ := json.Marshal(session)
		db.RedisClient.Set(ctxBg, tokenCacheKey, sessJSON, 7*24*time.Hour)
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"token":   token,
		"user":    newUser,
	})
}
