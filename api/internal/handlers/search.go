package handlers

import (
	"net/http"
	"chat-app/internal/models"
	"chat-app/internal/services" 
	"github.com/gin-gonic/gin"
)

func SearchUsers(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	query := c.Query("username")

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	users, err := services.SearchUsers(c.Request.Context(), authUser.ID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	if users == nil {
		users = []models.User{}
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}