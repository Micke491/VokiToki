package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"chat-app/internal/cache"
	"chat-app/internal/db"
	"chat-app/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type SearchResult struct {
	Users    []models.User `json:"users"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"pageSize"`
	HasMore  bool          `json:"hasMore"`
}

func SearchUsers(ctx context.Context, currentUserID bson.ObjectID, query string) ([]models.User, error) {
	res, err := SearchUsersOptimized(ctx, currentUserID, query, 1, 15)
	if err != nil {
		return nil, err
	}
	return res.Users, nil
}

func SearchUsersOptimized(ctx context.Context, currentUserID bson.ObjectID, query string, page int, pageSize int) (*SearchResult, error) {
	currentUser, err := getUserWithCache(ctx, currentUserID)
	if err != nil {
		return nil, err
	}

	excludedIDs := []bson.ObjectID{currentUserID}
	excludedIDs = append(excludedIDs, currentUser.BlockedUsers...)

	blockedByUsers, _ := getUsersWhoBlockedMe(ctx, currentUserID)
	excludedIDs = append(excludedIDs, blockedByUsers...)

	filter := bson.M{
		"_id": bson.M{"$nin": excludedIDs},
	}

	if query != "" {
		if len(query) >= 2 {
			filter["$text"] = bson.M{"$search": query}
		} else {
			filter["username"] = bson.M{
				"$regex":   "^" + query,
				"$options": "i",
			}
		}
	}

	skip := int64((page - 1) * pageSize)

	opts := options.Find().
		SetProjection(bson.M{
			"_id":      1,
			"username": 1,
			"name":     1,
			"avatar":   1,
		}).
		SetSkip(skip).
		SetLimit(int64(pageSize)).
		SetBatchSize(int32(pageSize))

	if query != "" && len(query) >= 2 {
		opts.SetSort(bson.M{"score": bson.M{"$meta": "textScore"}})
	}

	cursor, err := db.UserCollection.Find(ctx, filter, opts)
	if err != nil {
		if query != "" && len(query) >= 2 {
			delete(filter, "$text")
			filter["$or"] = []bson.M{
				{"username": bson.M{"$regex": query, "$options": "i"}},
				{"name": bson.M{"$regex": query, "$options": "i"}},
			}
			opts.SetSort(nil)
			cursor, err = db.UserCollection.Find(ctx, filter, opts)
		}
		
		if err != nil {
			return nil, err
		}
	}
	defer cursor.Close(ctx)

	var users []models.User = []models.User{}
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	totalCount, _ := db.UserCollection.CountDocuments(ctx, filter)

	return &SearchResult{
		Users:    users,
		Total:    totalCount,
		Page:     page,
		PageSize: pageSize,
		HasMore:  int64(len(users)) == int64(pageSize),
	}, nil
}

func GetSuggestedContactsCached(ctx context.Context, currentUserID bson.ObjectID) ([]models.User, error) {
	cacheKey := fmt.Sprintf("suggested_contacts:%s", currentUserID.Hex())
	
	if cached, err := cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var users []models.User
		if err := json.Unmarshal([]byte(cached), &users); err == nil {
			return users, nil
		}
	}

	pipeline := bson.A{
		bson.M{
			"$match": bson.M{
				"participants": currentUserID,
				"isGroupChat":  false,
			},
		},
		bson.M{
			"$sort": bson.M{"updatedAt": -1},
		},
		bson.M{
			"$limit": 10,
		},
		bson.M{
			"$unwind": "$participants",
		},
		bson.M{
			"$match": bson.M{
				"participants": bson.M{"$ne": currentUserID},
			},
		},
		bson.M{
			"$lookup": bson.M{
				"from":         "users",
				"localField":   "participants",
				"foreignField": "_id",
				"as":           "user",
			},
		},
		bson.M{
			"$unwind": "$user",
		},
		bson.M{
			"$project": bson.M{
				"_id":      "$user._id",
				"username": "$user.username",
				"name":     "$user.name",
				"avatar":   "$user.avatar",
			},
		},
		bson.M{
			"$limit": 10,
		},
	}

	cursor, err := db.ChatCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User = []models.User{}
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	if len(users) > 0 {
		if data, err := json.Marshal(users); err == nil {
			_ = cache.Set(ctx, cacheKey, string(data), 1*time.Hour)
		}
	}

	return users, nil
}

func GetRecommendedUsersCached(ctx context.Context, currentUserID bson.ObjectID) ([]models.User, error) {
	cacheKey := fmt.Sprintf("recommended_users:%s", currentUserID.Hex())
	
	if cached, err := cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var users []models.User
		if err := json.Unmarshal([]byte(cached), &users); err == nil {
			return users, nil
		}
	}

	currentUser, err := getUserWithCache(ctx, currentUserID)
	if err != nil {
		return nil, err
	}

	excludedIDs := []bson.ObjectID{currentUserID}
	excludedIDs = append(excludedIDs, currentUser.BlockedUsers...)

	pipeline := bson.A{
		bson.M{
			"$match": bson.M{
				"_id": bson.M{"$nin": excludedIDs},
			},
		},
		bson.M{
			"$sample": bson.M{"size": 15},
		},
		bson.M{
			"$project": bson.M{
				"_id":      1,
				"username": 1,
				"name":     1,
				"avatar":   1,
			},
		},
	}

	cursor, err := db.UserCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User = []models.User{}
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	if len(users) > 0 {
		if data, err := json.Marshal(users); err == nil {
			_ = cache.Set(ctx, cacheKey, string(data), 30*time.Minute)
		}
	}

	return users, nil
}

func getUserWithCache(ctx context.Context, userID bson.ObjectID) (*models.User, error) {
	cacheKey := fmt.Sprintf("user:%s", userID.Hex())
	
	if cached, err := cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var user models.User
		if err := json.Unmarshal([]byte(cached), &user); err == nil {
			return &user, nil
		}
	}

	var user models.User
	err := db.UserCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return nil, err
	}

	if data, err := json.Marshal(user); err == nil {
		_ = cache.Set(ctx, cacheKey, string(data), 24*time.Hour)
	}

	return &user, nil
}

func getUsersWhoBlockedMe(ctx context.Context, currentUserID bson.ObjectID) ([]bson.ObjectID, error) {
	cursor, err := db.UserCollection.Find(ctx, bson.M{
		"blockedUsers": currentUserID,
	}, options.Find().SetProjection(bson.M{"_id": 1}).SetBatchSize(1000))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID bson.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	ids := make([]bson.ObjectID, len(results))
	for i, r := range results {
		ids[i] = r.ID
	}

	return ids, nil
}