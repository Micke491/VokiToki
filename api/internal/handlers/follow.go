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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func FollowUser(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	targetIDStr := c.Param("id")
	targetID, err := bson.ObjectIDFromHex(targetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": targetID, "followers": bson.M{"$ne": authUser.ID}, "followRequests": bson.M{"$ne": authUser.ID}},
		bson.M{"$addToSet": bson.M{"followRequests": authUser.ID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send follow request"})
		return
	}

	if result.ModifiedCount > 0 {
		db.UserCollection.UpdateOne(ctx,
			bson.M{"_id": authUser.ID},
			bson.M{"$addToSet": bson.M{"sentFollowRequests": targetID}},
		)

		utils.TriggerPusher("user-"+targetIDStr, "follow-request-received", gin.H{
			"requesterId": authUser.ID.Hex(),
			"requester":   authUser,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Follow request sent"})
}

func UnfollowUser(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	targetIDStr := c.Param("id")
	targetID, err := bson.ObjectIDFromHex(targetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Remove the relationship in both directions (bilateral disconnect)
	db.UserCollection.UpdateOne(ctx, bson.M{"_id": authUser.ID}, bson.M{
		"$pull": bson.M{
			"following":          targetID,
			"followers":          targetID,
			"sentFollowRequests": targetID,
			"followRequests":     targetID,
		},
	})
	db.UserCollection.UpdateOne(ctx, bson.M{"_id": targetID}, bson.M{
		"$pull": bson.M{
			"followers":          authUser.ID,
			"following":          authUser.ID,
			"followRequests":     authUser.ID,
			"sentFollowRequests": authUser.ID,
		},
	})

	utils.TriggerPusher("user-"+authUser.ID.Hex(), "follow-updated", gin.H{"userId": targetIDStr})
	utils.TriggerPusher("user-"+targetIDStr, "follow-updated", gin.H{"userId": authUser.ID.Hex()})

	c.JSON(http.StatusOK, gin.H{"message": "Action successful"})
}

func AcceptFollowRequest(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	requesterIDStr := c.Param("id")
	requesterID, err := bson.ObjectIDFromHex(requesterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{
			"$pull":     bson.M{"followRequests": requesterID},
			"$addToSet": bson.M{"followers": requesterID, "following": requesterID},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept request"})
		return
	}

	db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": requesterID},
		bson.M{
			"$pull":     bson.M{"sentFollowRequests": authUser.ID},
			"$addToSet": bson.M{"following": authUser.ID, "followers": authUser.ID},
		},
	)

	utils.TriggerPusher("user-"+authUser.ID.Hex(), "follow-request-received", gin.H{})
	utils.TriggerPusher("user-"+authUser.ID.Hex(), "follow-updated", gin.H{"userId": requesterIDStr})
	utils.TriggerPusher("user-"+requesterIDStr, "follow-updated", gin.H{"userId": authUser.ID.Hex()})

	c.JSON(http.StatusOK, gin.H{"message": "Request accepted"})
}

func RejectFollowRequest(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)
	requesterIDStr := c.Param("id")
	requesterID, err := bson.ObjectIDFromHex(requesterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": authUser.ID},
		bson.M{"$pull": bson.M{"followRequests": requesterID}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject request"})
		return
	}

	db.UserCollection.UpdateOne(ctx,
		bson.M{"_id": requesterID},
		bson.M{"$pull": bson.M{"sentFollowRequests": authUser.ID}},
	)

	utils.TriggerPusher("user-"+authUser.ID.Hex(), "follow-request-received", gin.H{})
	utils.TriggerPusher("user-"+requesterIDStr, "follow-updated", gin.H{"userId": authUser.ID.Hex()})

	c.JSON(http.StatusOK, gin.H{"message": "Request rejected"})
}

func GetFollowRequests(c *gin.Context) {
	authUser := c.MustGet("user").(models.User)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	db.UserCollection.FindOne(ctx, bson.M{"_id": authUser.ID}).Decode(&user)

	if len(user.FollowRequests) == 0 {
		c.JSON(http.StatusOK, gin.H{"requests": []models.User{}})
		return
	}

	cursor, _ := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": user.FollowRequests}}, options.Find().SetProjection(bson.M{"username": 1, "avatar": 1, "name": 1}))
	var requests []models.User
	cursor.All(ctx, &requests)

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}
