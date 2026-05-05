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

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email and password are required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	email := strings.ToLower(req.Email)

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	if user.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{"message": "This account has been banned"})
		return
	}

	if user.TimeoutUntil != nil && user.TimeoutUntil.After(time.Now()) {
		c.JSON(http.StatusForbidden, gin.H{
			"message": "Your account is temporarily suspended until " + user.TimeoutUntil.Format(time.RFC1123),
		})
		return
	}

	if !services.ComparePassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	token, err := services.GenerateToken(user.ID.Hex(), user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
	})
}
