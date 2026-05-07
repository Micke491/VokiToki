package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type StoryViewer struct {
	UserID   bson.ObjectID `bson:"userId" json:"userId"`
	ViewedAt time.Time     `bson:"viewedAt" json:"viewedAt"`
	User     *StoryViewerUser `bson:"-" json:"user,omitempty"`
}

type StoryViewerUser struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

type Story struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	MediaURL  string        `bson:"mediaUrl" json:"mediaUrl"`
	MediaType string        `bson:"mediaType" json:"mediaType"`
	Caption   string        `bson:"caption,omitempty" json:"caption,omitempty"`
	ViewedBy  []StoryViewer `bson:"viewedBy" json:"viewedBy"`
	ExpiresAt time.Time     `bson:"expiresAt" json:"expiresAt"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
}
