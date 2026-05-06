package services

import (
	"context"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func SearchUsers(ctx context.Context, currentUserID bson.ObjectID, query string) ([]models.User, error) {
	var currentUser models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": currentUserID}).Decode(&currentUser)
	if err != nil {
		return nil, err
	}

	excludedIDs := []bson.ObjectID{currentUserID}
	excludedIDs = append(excludedIDs, currentUser.BlockedUsers...)

	cursor, err := db.UserCollection.Find(ctx, bson.M{"blockedUsers": currentUserID})
	if err == nil {
		var usersWhoBlockedMe []models.User
		if err := cursor.All(ctx, &usersWhoBlockedMe); err == nil {
			for _, u := range usersWhoBlockedMe {
				excludedIDs = append(excludedIDs, u.ID)
			}
		}
	}

	filter := bson.M{
		"username": bson.M{"$regex": query, "$options": "i"},
		"_id":      bson.M{"$nin": excludedIDs},
	}

	findOpts := options.Find().SetLimit(15)
	cur, err := db.UserCollection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}

	var results []models.User
	if err := cur.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}