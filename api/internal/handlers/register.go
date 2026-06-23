package handlers

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=30"`
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

	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_.-]+$`, username)
	if !matched {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username can only contain letters, numbers, underscores, dots, and hyphens"})
		return
	}

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

	verificationToken := services.GenerateRandomCode(32)
	verificationExpires := time.Now().Add(24 * time.Hour)

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
		IsEmailVerified:  false,
		EmailVerificationToken: &verificationToken,
		EmailVerificationExpires: &verificationExpires,
	}

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.InsertOne(ctx, newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create account"})
		return
	}

	appURL := "http://localhost:3000"
	if config.AppConfig != nil && config.AppConfig.AppURL != "" {
		appURL = config.AppConfig.AppURL
	}
	verifyLink := appURL + "/verify-email?token=" + verificationToken
	emailBody := services.GenerateVerificationEmail(newUser.Username, verifyLink)
	
	go services.SendEmail(newUser.Email, "Verify Your Email Address", emailBody)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Registration successful. Please check your email to verify your account.",
		"user":    newUser,
	})
}
