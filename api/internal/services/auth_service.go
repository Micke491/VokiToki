package services

import (
	"crypto/rand"
	"errors"
	"math/big"
	"sync"
	"time"

	"context"
	"chat-app/internal/db"
	"chat-app/internal/config"
	"github.com/golang-jwt/jwt/v5"
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
		db.RedisClient.Set(ctx, key, code, exp)
		return
	}
	twoFaCacheMu.Lock()
	twoFaCache[key] = cacheItem{value: code, expiresAt: time.Now().Add(exp)}
	twoFaCacheMu.Unlock()
}

func Get2FACode(ctx context.Context, key string) (string, error) {
	if db.RedisClient != nil {
		return db.RedisClient.Get(ctx, key).Result()
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
		return
	}
	twoFaCacheMu.Lock()
	delete(twoFaCache, key)
	twoFaCacheMu.Unlock()
}

type TokenPayload struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, email string) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &TokenPayload{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
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
	expirationTime := time.Now().Add(10 * time.Minute)
	claims := &TokenPayload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func GenerateTrustedDeviceToken(userID string) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &TokenPayload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
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
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			panic(err) 
		}
		b[i] = charset[n.Int64()]
	}
	return string(b)
}