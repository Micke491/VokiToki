package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoURI     string
	DBName       string
	JWTSecret    string
	Port         string
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	EmailFrom    string
	RedisURL     string
	RedisToken   string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, reading from environment variables")
	}

	AppConfig = &Config{
		MongoURI:   getEnv("MONGODB_URI", ""),
		DBName:     getEnv("DB_NAME", "chat-app"),
		JWTSecret:  getEnv("JWT_SECRET", ""),
		Port:       getEnv("PORT", "8080"),
		SMTPHost:   getEnv("SMTP_HOST", ""),
		SMTPPort:   getEnv("SMTP_PORT", "587"),
		SMTPUser:   getEnv("SMTP_USER", ""),
		SMTPPass:   getEnv("SMTP_PASS", ""),
		EmailFrom:  getEnv("EMAIL_FROM", ""),
		RedisURL:   getEnv("REDIS_URL", ""),
		RedisToken: getEnv("REDIS_TOKEN", ""),
	}

	if AppConfig.MongoURI == "" || AppConfig.JWTSecret == "" {
		log.Fatal("Critical environment variables missing (MONGODB_URI or JWT_SECRET)")
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
