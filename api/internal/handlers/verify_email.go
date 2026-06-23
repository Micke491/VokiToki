package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Verification token is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"emailVerificationToken": token}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid or expired verification token"})
		return
	}

	if user.EmailVerificationExpires != nil && user.EmailVerificationExpires.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Verification token has expired. Please request a new one."})
		return
	}

	_, err = db.UserCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"isEmailVerified": true,
			"updatedAt":       time.Now(),
		},
		"$unset": bson.M{
			"emailVerificationToken":   "",
			"emailVerificationExpires": "",
		},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to verify email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully. You can now log in."})
}
