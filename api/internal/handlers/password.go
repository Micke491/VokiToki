package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
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
	if err != nil && err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": blindMessage})

	if err == nil {
		ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel2()

		tokenBytes := make([]byte, 32)
		rand.Read(tokenBytes)
		resetToken := hex.EncodeToString(tokenBytes)
		hash := sha256.Sum256([]byte(resetToken))
		resetTokenHash := hex.EncodeToString(hash[:])

		expires := time.Now().Add(1 * time.Hour)
		result, updateErr := db.UserCollection.UpdateOne(ctx2, bson.M{"_id": user.ID}, bson.M{
			"$set": bson.M{
				"resetPasswordToken":   resetTokenHash,
				"resetPasswordExpires": expires,
			},
		})

		if updateErr != nil || result.MatchedCount == 0 {
			var count int64
			if result != nil {
				count = result.MatchedCount
			}
			log.Printf("ERROR: failed to save reset token for user %s: err=%v matched=%d", user.ID.Hex(), updateErr, count)
			return
		}
		log.Printf("DEBUG: Reset token stored for user=%s hash=%s", user.ID.Hex(), resetTokenHash[:8])

		go func(u models.User, token string) {
			bgCtx, bgCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer bgCancel()

			resetURL := fmt.Sprintf("%s/auth-pages/reset-password/%s", config.AppConfig.AppURL, token)
			emailBody := services.GeneratePasswordResetEmail(u.Username, resetURL)

			if sendErr := services.SendEmail(u.Email, "Password Reset Request", emailBody); sendErr != nil {
				log.Printf("ERROR: failed to send password reset email to %s: %v", u.Email, sendErr)
				db.UserCollection.UpdateOne(bgCtx, bson.M{"_id": u.ID}, bson.M{
					"$unset": bson.M{
						"resetPasswordToken":   "",
						"resetPasswordExpires": "",
					},
				})
			}
		}(user, resetToken)
	}
}

func ExecutePasswordReset(c *gin.Context) {
	var req ResetPasswordExecution
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash := sha256.Sum256([]byte(req.Token))
	resetTokenHash := hex.EncodeToString(hash[:])
	log.Printf("DEBUG: Looking for reset token hash=%s", resetTokenHash[:8])

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	log.Printf("DEBUG: ExecutePasswordReset looking for hash=%s, now=%v", resetTokenHash[:8], time.Now())
	var count int64
	count, _ = db.UserCollection.CountDocuments(ctx, bson.M{"resetPasswordToken": resetTokenHash})
	log.Printf("DEBUG: Documents with that token hash: %d", count)

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
