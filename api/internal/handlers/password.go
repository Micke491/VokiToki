package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordExecution struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

func RequestPasswordReset(c *gin.Context) {
	var req PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid email is required"})
		return
	}

	email := strings.ToLower(req.Email)
	blindMessage := "If an account with that email exists, a password reset link has been sent."

	var user models.User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := db.UserCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusOK, gin.H{"message": blindMessage})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	resetToken := hex.EncodeToString(tokenBytes)
	hash := sha256.Sum256([]byte(resetToken))
	resetTokenHash := hex.EncodeToString(hash[:])

	expires := time.Now().Add(1 * time.Hour)
	_, err = db.UserCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"resetPasswordToken":   resetTokenHash,
			"resetPasswordExpires": expires,
		},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reset token"})
		return
	}

	resetURL := fmt.Sprintf("%s/auth-pages/reset-password/%s", config.AppConfig.AppURL, resetToken)

	emailBody := services.GeneratePasswordResetEmail(user.Username, resetURL)
	err = services.SendEmail(user.Email, "Password Reset Request", emailBody)
	if err != nil {
		db.UserCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
			"$unset": bson.M{
				"resetPasswordToken":   "",
				"resetPasswordExpires": "",
			},
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": blindMessage})
}

func ExecutePasswordReset(c *gin.Context) {
	var req ResetPasswordExecution
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash := sha256.Sum256([]byte(req.Token))
	resetTokenHash := hex.EncodeToString(hash[:])

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{
		"resetPasswordToken":   resetTokenHash,
		"resetPasswordExpires": bson.M{"$gt": time.Now()},
	}).Decode(&user)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	hashedPassword, err := services.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error securing password"})
		return
	}

	_, err = db.UserCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"password":  hashedPassword,
			"updatedAt": time.Now(),
		},
		"$unset": bson.M{
			"resetPasswordToken":   "",
			"resetPasswordExpires": "",
		},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
		return
	}

	successBody := fmt.Sprintf(`
		<div style="font-family: sans-serif; padding: 20px;">
			<h2>Password Changed Successfully</h2>
			<p>Hi %s,</p>
			<p>Your password has been updated. If this wasn't you, contact support immediately.</p>
		</div>
	`, user.Username)
	services.SendEmail(user.Email, "Password Reset Successful", successBody)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successful"})
}
