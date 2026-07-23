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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type LoginRequest struct {
	Email      string `json:"email" binding:"required"`
	Password   string `json:"password" binding:"required"`
	RememberMe bool   `json:"rememberMe"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email and password are required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	email := strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
		return
	}

	if !user.IsEmailVerified {
		c.JSON(http.StatusForbidden, gin.H{"message": "Please verify your email address before logging in."})
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

	if user.TwoFactorEnabled {
		trustedToken := c.GetHeader("X-Trusted-Device-Token")
		if trustedToken == "" {
			if cookie, err := c.Cookie("trusted_device"); err == nil {
				trustedToken = cookie
			}
		}

		if trustedToken != "" && services.ValidateTrustedDeviceToken(trustedToken, user.ID.Hex()) {
		} else {
			timeoutKey := "2fa_login_timeout:" + user.ID.Hex()
			if _, err := services.Get2FACode(ctx, timeoutKey); err == nil {
				c.JSON(http.StatusTooManyRequests, gin.H{"message": "Please wait 15 seconds before requesting another code."})
				return
			}

			code := services.GenerateRandomCode(6)
			
			services.Store2FACode(ctx, timeoutKey, "1", 15*time.Second)
			services.Store2FACode(ctx, "2fa_login:"+user.ID.Hex(), code, 10*time.Minute)
			
			go services.SendEmail(user.Email, "Your Login Code", "Your 2FA login code is: "+code)

			tempToken, err := services.GenerateTempToken(user.ID.Hex())
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate session"})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"requires_2fa": true,
				"temp_token":   tempToken,
				"message":      "2FA code sent to your email",
			})
			return
		}
	}

	token, err := services.GenerateToken(user.ID.Hex(), user.Email, req.RememberMe)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate session"})
		return
	}

	ctxBg := context.Background()
	// Native clients send a friendly label (e.g. "iPhone 15 Pro (iOS 17.2)") via
	// X-Device-Name; browsers only have a raw User-Agent. Prefer the friendly label.
	device := c.GetHeader("X-Device-Name")
	if device == "" {
		device = c.Request.UserAgent()
	}
	ip := c.ClientIP()

	// Upsert session by userId+device+IP to prevent duplicate entries
	filter := bson.M{"userId": user.ID, "device": device, "ip": ip}
	update := bson.M{
		"$set": bson.M{
			"token":      token,
			"lastActive": time.Now(),
		},
		"$setOnInsert": bson.M{
			"_id":    bson.NewObjectID(),
			"userId": user.ID,
			"device": device,
			"ip":     ip,
		},
	}
	upsertTrue := true
	db.SessionCollection.UpdateOne(ctxBg, filter, update, options.UpdateOne().SetUpsert(upsertTrue))

	// Re-fetch the upserted session to get its ID for caching
	var session models.Session
	db.SessionCollection.FindOne(ctxBg, bson.M{"token": token}).Decode(&session)

	if db.RedisClient != nil {
		tokenCacheKey := "session_token:" + token
		sessJSON, _ := json.Marshal(session)
		cacheTTL := 7 * 24 * time.Hour
		if req.RememberMe {
			cacheTTL = 0 // no expiry
		}
		db.RedisClient.Set(ctxBg, tokenCacheKey, sessJSON, cacheTTL)
	}

	db.UserCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"updatedAt": time.Now(),
		},
	})

	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, "user_auth:"+user.ID.Hex())
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}
