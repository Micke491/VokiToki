package handlers

import (
	"context"
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
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "Invalid input: " + err.Error()})
		return
	}

	email := strings.ToLower(req.Email)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingUser models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "User already exists"})
		return
	}

	err = db.UserCollection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Username already taken"})
		return
	}

	hashedPassword, err := services.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error securing password"})
		return
	}

	newUser := models.User{
		ID:           bson.NewObjectID(),
		Username:     req.Username,
		Email:        email,
		Password:     hashedPassword,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		IsBanned:     false,
		IsOnline:     false,
		Status:       "Hey there!",
		ReadReceipts: true,
		Theme:        "dark",
	}

	_, err = db.UserCollection.InsertOne(ctx, newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user"})
		return
	}

	token, err := services.GenerateToken(newUser.ID.Hex(), newUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"token":   token,
	})
}
