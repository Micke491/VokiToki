package middleware

import (
	"fmt"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
)

func GeminiRateLimiter() gin.HandlerFunc {
	const (
		rpmLimit = 10
		rpdLimit = 1000

		rpmWindow = time.Minute
		rpdWindow = 24 * time.Hour

		prefixRPM = "gemini:rpm"
		prefixRPD = "gemini:rpd"
	)

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

		ctx := c.Request.Context()

		rpmKey := fmt.Sprintf("%s:%s", prefixRPM, identifier)
		rpmCount, err := db.RedisClient.Incr(ctx, rpmKey).Result()
		if err != nil {
			c.Next()
			return
		}
		if rpmCount == 1 {
			db.RedisClient.Expire(ctx, rpmKey, rpmWindow)
		}

		if int(rpmCount) > rpmLimit {
			rpmTTL, _ := db.RedisClient.TTL(ctx, rpmKey).Result()
			retryAfter := int(rpmTTL.Seconds())
			if retryAfter <= 0 {
				retryAfter = 60
			}

			db.RedisClient.Decr(ctx, rpmKey)

			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rpmLimit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(rpmTTL).Unix()))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":      "You've reached the AI message limit. Please wait a moment before sending another message.",
				"limitType":  "rpm",
				"limit":      rpmLimit,
				"window":     "minute",
				"retryAfter": retryAfter,
			})
			c.Abort()
			return
		}

		rpdKey := fmt.Sprintf("%s:%s", prefixRPD, identifier)
		rpdCount, err := db.RedisClient.Incr(ctx, rpdKey).Result()
		if err != nil {
			c.Next()
			return
		}
		if rpdCount == 1 {
			db.RedisClient.Expire(ctx, rpdKey, rpdWindow)
		}

		if int(rpdCount) > rpdLimit {
			rpdTTL, _ := db.RedisClient.TTL(ctx, rpdKey).Result()
			retryAfter := int(rpdTTL.Seconds())
			if retryAfter <= 0 {
				retryAfter = 3600 
			}

			db.RedisClient.Decr(ctx, rpdKey)

			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rpdLimit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(rpdTTL).Unix()))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":      "You've reached the daily AI message limit (1,000 messages/day). Your limit resets automatically.",
				"limitType":  "rpd",
				"limit":      rpdLimit,
				"window":     "day",
				"retryAfter": retryAfter,
			})
			c.Abort()
			return
		}

		rpmRemaining := rpmLimit - int(rpmCount)
		rpdRemaining := rpdLimit - int(rpdCount)
		if rpmRemaining < 0 {
			rpmRemaining = 0
		}
		if rpdRemaining < 0 {
			rpdRemaining = 0
		}

		c.Header("X-RateLimit-RPM-Remaining", fmt.Sprintf("%d", rpmRemaining))
		c.Header("X-RateLimit-RPD-Remaining", fmt.Sprintf("%d", rpdRemaining))

		c.Next()
	}
}
