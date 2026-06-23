package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"
	"chat-app/internal/models"
	"chat-app/internal/services"
	"github.com/gin-gonic/gin"
)

func SearchUsers(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	
	query := c.DefaultQuery("username", "")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "20")
	
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	result, err := services.SearchUsersOptimized(ctx, authUser.ID, query, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func GetSuggestedContacts(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	contacts, err := services.GetSuggestedContactsCached(ctx, authUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suggested contacts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"contacts": contacts})
}

func GetRecommendedUsers(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	recommended, err := services.GetRecommendedUsersCached(ctx, authUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recommended users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": recommended})
}
