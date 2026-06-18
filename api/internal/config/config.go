package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoURI      string
	DBName        string
	JWTSecret     string
	Port          string
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPass      string
	EmailFrom     string
	RedisURL      string
	RedisToken    string
	CloudinaryURL string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
	PusherAppID   string
	PusherKey     string
	PusherSecret  string
	PusherCluster string
	Environment   string
	LiveKitAPIKey    string
	LiveKitAPISecret string
	LiveKitURL       string
	AppURL           string
	GeminiAPIKey     string
}

var AppConfig *Config

func LoadConfig() {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using system environment variables")
    }

	AppConfig = &Config{
		MongoURI:      getEnv("MONGODB_URI", ""),
		DBName:        getEnv("DB_NAME", "chat-app"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		Port:          getEnv("PORT", "8080"),
		SMTPHost:      getEnv("SMTP_HOST", ""),
		SMTPPort:      getEnv("SMTP_PORT", "587"),
		SMTPUser:      getEnv("SMTP_USER", ""),
		SMTPPass:      getEnv("SMTP_PASS", ""),
		EmailFrom:     getEnv("EMAIL_FROM", ""),
		RedisURL:      getEnv("REDIS_URL", ""),
		RedisToken:    getEnv("REDIS_TOKEN", ""),
		CloudinaryURL: getEnv("CLOUDINARY_URL", ""),
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
		PusherAppID:   getEnv("PUSHER_APP_ID", ""),
		PusherKey:     getEnv("PUSHER_KEY", ""),
		PusherSecret:  getEnv("PUSHER_SECRET", ""),
		PusherCluster: getEnv("PUSHER_CLUSTER", "mt1"),
		Environment:   getEnv("APP_ENV", "development"),
		LiveKitAPIKey:    getEnv("LIVEKIT_API_KEY", ""),
		LiveKitAPISecret: getEnv("LIVEKIT_API_SECRET", ""),
		LiveKitURL:       getEnv("NEXT_PUBLIC_LIVEKIT_URL", ""),
		AppURL:           getEnv("APP_URL", "https://chat-app-gules-six-81.vercel.app"),
		GeminiAPIKey:     getEnv("GEMINI_API_KEY", ""),
	}

	requiredVars := map[string]string{
        "MONGODB_URI":   AppConfig.MongoURI,
        "JWT_SECRET":    AppConfig.JWTSecret,
        "PUSHER_APP_ID": AppConfig.PusherAppID,
		"PUSHER_KEY": AppConfig.PusherKey,
		"PUSHER_SECRET":  AppConfig.PusherSecret,
		"PUSHER_CLUSTER": AppConfig.PusherCluster,
		"LIVEKIT_API_KEY": AppConfig.LiveKitAPIKey,
		"LIVEKIT_API_SECRET": AppConfig.LiveKitAPISecret,
		"APP_URL": AppConfig.AppURL,
	}

    for name, value := range requiredVars {
        if value == "" {
            if AppConfig.Environment == "production" {
                log.Fatalf("CRITICAL: Missing required environment variable: %s", name)
            } else {
                log.Printf("WARNING: Missing optional environment variable: %s", name)
            }
        }
    }
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}