package middleware

import (
	"fmt"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
)

func RateLimiter(limit int, window time.Duration, prefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if db.RedisClient == nil {
			c.Next()
			return
		}

		identifier := c.ClientIP()
		if userObj, exists := c.Get("user"); exists {
			if user, ok := userObj.(models.User); ok {
				identifier = user.ID.Hex()
			}
		}

		key := fmt.Sprintf("%s:%s", prefix, identifier)
		ctx := c.Request.Context()

		count, err := db.RedisClient.Incr(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}

		if count == 1 {
			db.RedisClient.Expire(ctx, key, window)
		}

		if int(count) > limit {
			reset, _ := db.RedisClient.TTL(ctx, key).Result()
			
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(reset).Unix()))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}