package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type Confirm2FARequest struct {
	Code string `json:"code" binding:"required"`
}

type VerifyLogin2FARequest struct {
	TempToken      string `json:"temp_token" binding:"required"`
	Code           string `json:"code" binding:"required"`
	RememberDevice bool   `json:"rememberDevice"`
}

type Disable2FARequest struct {
	Password string `json:"password" binding:"required"`
}

func RequestEnable2FA(c *gin.Context) {
	u, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := u.(models.User).ID.Hex()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	objectID, _ := bson.ObjectIDFromHex(userID)
	if err := db.UserCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.TwoFactorEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA is already enabled"})
		return
	}

	timeoutKey := "2fa_timeout:" + userID
	if _, err := services.Get2FACode(ctx, timeoutKey); err == nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Please wait 15 seconds before requesting another code."})
		return
	}

	code := services.GenerateRandomCode(6)

	services.Store2FACode(ctx, timeoutKey, "1", 15*time.Second)
	services.Store2FACode(ctx, "2fa_enable:"+user.ID.Hex(), code, 10*time.Minute)

	services.SendEmail(user.Email, "Your 2FA Setup Code", "Your 2FA setup code is: "+code)

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent to your email"})
}

func ConfirmEnable2FA(c *gin.Context) {
	u, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := u.(models.User).ID.Hex()

	var req Confirm2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	redisKey := "2fa_enable:" + userID
	storedCode, err := services.Get2FACode(ctx, redisKey)
	if err != nil || storedCode != req.Code {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired code"})
		return
	}

	services.Delete2FACode(ctx, redisKey)

	objectID, _ := bson.ObjectIDFromHex(userID)
	_, err = db.UserCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{"twoFactorEnabled": true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable 2FA"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Two-Factor Authentication enabled successfully"})
}

func Disable2FA(c *gin.Context) {
	u, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := u.(models.User).ID.Hex()

	var req Disable2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	objectID, _ := bson.ObjectIDFromHex(userID)
	if err := db.UserCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if !services.ComparePassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
		return
	}

	_, err := db.UserCollection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{"twoFactorEnabled": false},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable 2FA"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Two-Factor Authentication disabled successfully"})
}

func VerifyLogin2FA(c *gin.Context) {
	var req VerifyLogin2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	claims, err := services.VerifyToken(req.TempToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired, please login again"})
		return
	}

	userID := claims.UserID
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	redisKey := "2fa_login:" + userID
	storedCode, err := services.Get2FACode(ctx, redisKey)
	if err != nil || storedCode != req.Code {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired code"})
		return
	}

	services.Delete2FACode(ctx, redisKey)

	var user models.User
	objectID, _ := bson.ObjectIDFromHex(userID)
	err = db.UserCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	token, err := services.GenerateToken(user.ID.Hex(), user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session"})
		return
	}

	ctxBg := context.Background()
	session := models.Session{
		ID:         bson.NewObjectID(),
		UserID:     user.ID,
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

	var trustedToken string
	if req.RememberDevice {
		var err error
		trustedToken, err = services.GenerateTrustedDeviceToken(user.ID.Hex())
		if err == nil {
			c.SetSameSite(http.SameSiteNoneMode)
			c.SetCookie("trusted_device", trustedToken, 7*24*3600, "/", "", true, true)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":              "Login successful",
		"token":                token,
		"user":                 user,
		"trusted_device_token": trustedToken,
	})
}
