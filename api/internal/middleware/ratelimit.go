package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"chat-app/internal/db"
	"github.com/gin-gonic/gin"
)

func RateLimiter(limit int, window time.Duration, prefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if db.RedisClient == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("%s:%s", prefix, ip)
		ctx := context.Background()

		count, err := db.RedisClient.Get(ctx, key).Int()
		if err != nil && err.Error() != "redis: nil" {
			c.Next()
			return
		}

		if count >= limit {
			reset, _ := db.RedisClient.TTL(ctx, key).Result()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"message": "Too many attempts. Please try again soon.",
			})
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(reset).Unix()))
			c.Abort()
			return
		}

		if count == 0 {
			db.RedisClient.Set(ctx, key, 1, window)
		} else {
			db.RedisClient.Incr(ctx, key)
		}

		c.Next()
	}
}
