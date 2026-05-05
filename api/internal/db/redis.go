package db

import (
	"context"
	"log"

	"chat-app/internal/config"
	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func ConnectRedis() {
	if config.AppConfig.RedisURL == "" {
		log.Println("Redis URL not provided, rate limiting will be disabled or use mock")
		return
	}

	opt, err := redis.ParseURL(config.AppConfig.RedisURL)
	if err != nil {
		log.Printf("Failed to parse Redis URL: %v. Rate limiting might fail.\n", err)
		return
	}

	RedisClient = redis.NewClient(opt)

	ctx := context.Background()
	_, err = RedisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("Failed to connect to Redis: %v\n", err)
	} else {
		log.Println("Successfully connected to Redis")
	}
}
