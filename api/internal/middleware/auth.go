package middleware

import (
	"context"
	"net/http"
	"strings"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			if cookie, err := c.Cookie("token"); err == nil {
				tokenString = cookie
			}
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

		var user models.User
		objectID, _ := bson.ObjectIDFromHex(claims.UserID)
		err = db.UserCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&user)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Database error"})
			}
			c.Abort()
			return
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
