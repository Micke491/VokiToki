package main

import (
	"log"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/db"
	"chat-app/internal/handlers"
	"chat-app/internal/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadConfig()
	db.ConnectMongo()
	db.ConnectRedis()
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Authorization", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now()})
	})
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", middleware.RateLimiter(5, 5*time.Minute, "auth:register"), handlers.Register)
		auth.POST("/login", middleware.RateLimiter(10, 5*time.Minute, "auth:login"), handlers.Login)
		
		auth.POST("/password-reset-request", middleware.RateLimiter(3, 10*time.Minute, "auth:reset-request"), handlers.RequestPasswordReset)
		auth.POST("/reset-password", middleware.RateLimiter(5, 10*time.Minute, "auth:reset-execute"), handlers.ExecutePasswordReset)
	}
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/me", func(c *gin.Context) {
			user, _ := c.Get("user")
			c.JSON(200, gin.H{"user": user})
		})
	}

	log.Printf("Server starting on port %s", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
