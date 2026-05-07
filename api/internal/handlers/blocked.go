package handlers

import (
	"context"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func GetBlockedUsers(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userDoc struct {
		BlockedUsers []bson.ObjectID `bson:"blockedUsers"`
	}
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&userDoc)
	if err != nil || len(userDoc.BlockedUsers) == 0 {
		c.JSON(http.StatusOK, gin.H{"blockedUsers": []models.User{}})
		return
	}

	cursor, err := db.UserCollection.Find(ctx, bson.M{
		"_id": bson.M{"$in": userDoc.BlockedUsers},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
		return
	}
	defer cursor.Close(ctx)

	var blockedUsers []struct {
		ID       bson.ObjectID `bson:"_id" json:"_id"`
		Username string        `bson:"username" json:"username"`
		Avatar   string        `bson:"avatar" json:"avatar"`
	}
	if err = cursor.All(ctx, &blockedUsers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blockedUsers": blockedUsers})
}