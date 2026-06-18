package cache

import (
	"context"
	"time"
	"chat-app/internal/db"
	"github.com/redis/go-redis/v9"
)

func Get(ctx context.Context, key string) (string, error) {
	if db.RedisClient == nil {
		return "", nil
	}
	val, err := db.RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	return val, err
}

func Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	if db.RedisClient == nil {
		return nil
	}
	return db.RedisClient.Set(ctx, key, value, expiration).Err()
}

func Delete(ctx context.Context, keys ...string) error {
	if db.RedisClient == nil {
		return nil
	}
	return db.RedisClient.Del(ctx, keys...).Err()
}

func InvalidatePattern(ctx context.Context, pattern string) error {
	if db.RedisClient == nil {
		return nil
	}
	iter := db.RedisClient.Scan(ctx, 0, pattern, 1000).Iterator()
	var keys []string
	
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}

	if len(keys) > 0 {
		return db.RedisClient.Del(ctx, keys...).Err()
	}
	return nil
}

func GetMany(ctx context.Context, keys []string) (map[string]string, error) {
	if db.RedisClient == nil {
		return make(map[string]string), nil
	}
	result := make(map[string]string)
	vals, err := db.RedisClient.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	for i, key := range keys {
		if val, ok := vals[i].(string); ok {
			result[key] = val
		}
	}

	return result, nil
}

func Increment(ctx context.Context, key string) (int64, error) {
	if db.RedisClient == nil {
		return 0, nil
	}
	return db.RedisClient.Incr(ctx, key).Result()
}