package middleware

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
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else if cookie, err := c.Cookie("token"); err == nil {
			tokenString = cookie
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}

		claims, err := services.VerifyToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
			c.Abort()
			return
		}

		cacheKey := "user_auth:" + claims.UserID
		if db.RedisClient != nil {
			cachedStatus, _ := db.RedisClient.Get(c, cacheKey).Result()
			if cachedStatus == "banned" {
				c.JSON(http.StatusForbidden, gin.H{"message": "Account is banned"})
				c.Abort()
				return
			}
		}

		var user models.User
		objectID, _ := bson.ObjectIDFromHex(claims.UserID)
		
		opts := options.FindOne().SetProjection(bson.M{
			"_id":          1,
			"username":     1,
			"avatar":       1,
			"isBanned":     1,
			"blockedUsers": 1, 
		})

		err = db.UserCollection.FindOne(c, bson.M{"_id": objectID}, opts).Decode(&user)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Database error"})
			}
			c.Abort()
			return
		}

		if db.RedisClient != nil {
			status := "active"
			if user.IsBanned {
				status = "banned"
			}
			db.RedisClient.Set(context.Background(), cacheKey, status, 10*time.Minute)
		}

		if user.IsBanned {
			c.JSON(http.StatusForbidden, gin.H{"message": "Account is banned"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}