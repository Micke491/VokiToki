package services

import (
	"context"
	"errors"
	"math/big"
	"crypto/rand"
	"log"
	"sync"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type cacheItem struct {
	value     string
	expiresAt time.Time
}

var (
	twoFaCache   = make(map[string]cacheItem)
	twoFaCacheMu sync.Mutex
)

func Store2FACode(ctx context.Context, key, code string, exp time.Duration) {
	if db.RedisClient != nil {
		err := db.RedisClient.Set(ctx, key, code, exp).Err()
		if err == nil {
			return // Redis write succeeded
		}
		log.Printf("WARN: Redis Store2FACode failed for key=%s, falling back to memory: %v", key, err)
		// fall through to in-memory
	}
	twoFaCacheMu.Lock()
	twoFaCache[key] = cacheItem{value: code, expiresAt: time.Now().Add(exp)}
	twoFaCacheMu.Unlock()
}

func Get2FACode(ctx context.Context, key string) (string, error) {
	if db.RedisClient != nil {
		val, err := db.RedisClient.Get(ctx, key).Result()
		if err == nil {
			return val, nil
		}
		if err != redis.Nil {
			log.Printf("WARN: Redis Get2FACode failed for key=%s, falling back to memory: %v", key, err)
			// fall through to in-memory on real errors
		} else {
			// Key genuinely doesn't exist in Redis — check memory too
			// (in case it was stored in memory due to a previous Redis failure)
		}
	}
	twoFaCacheMu.Lock()
	item, exists := twoFaCache[key]
	if exists && time.Now().After(item.expiresAt) {
		delete(twoFaCache, key)
		exists = false
	}
	twoFaCacheMu.Unlock()
	if !exists {
		return "", errors.New("not found")
	}
	return item.value, nil
}

func Delete2FACode(ctx context.Context, key string) {
	if db.RedisClient != nil {
		db.RedisClient.Del(ctx, key)
	}
	twoFaCacheMu.Lock()
	delete(twoFaCache, key)
	twoFaCacheMu.Unlock()
}

// --- JWT ---

type TokenPayload struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, email string) (string, error) {
	claims := &TokenPayload{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func VerifyToken(tokenString string) (*TokenPayload, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenPayload{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*TokenPayload); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

func GenerateTempToken(userID string) (string, error) {
	claims := &TokenPayload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func GenerateTrustedDeviceToken(userID string) (string, error) {
	claims := &TokenPayload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func ValidateTrustedDeviceToken(tokenString, expectedUserID string) bool {
	claims, err := VerifyToken(tokenString)
	if err != nil {
		return false
	}
	return claims.UserID == expectedUserID
}

func GenerateRandomCode(length int) string {
	const charset = "0123456789"
	b := make([]byte, length)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}