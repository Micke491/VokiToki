package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"
	"chat-app/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type CreateReportRequest struct {
	TargetID   string `json:"targetId" binding:"required"`
	TargetType string `json:"targetType" binding:"required"`
	Category   string `json:"category" binding:"required"`
	Details    string `json:"details"`
}

func CreateReport(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	var req CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing required fields"})
		return
	}

	targetOID, err := bson.ObjectIDFromHex(req.TargetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid target ID"})
		return
	}

	validTypes := map[string]bool{"user": true, "message": true, "story": true}
	if !validTypes[req.TargetType] {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid target type"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	report := models.Report{
		ReporterID: authUser.ID,
		TargetID:   targetOID,
		TargetType: req.TargetType,
		Category:   req.Category,
		Details:    req.Details,
		Status:     "pending",
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	result, err := db.ReportCollection.InsertOne(ctx, report)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal Server Error", "error": err.Error()})
		return
	}

	report.ID = result.InsertedID.(bson.ObjectID)

	go utils.Broadcast("admin-reports", "new-report", gin.H{
		"reportId":   report.ID.Hex(),
		"category":   report.Category,
		"targetType": report.TargetType,
		"createdAt":  report.CreatedAt,
	})

	c.JSON(http.StatusCreated, report)
}
