package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type BotMessage struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Role      string        `bson:"role" json:"role"` 
	Text      string        `bson:"text" json:"text"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
}

type BotChat struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	Title     string        `bson:"title" json:"title"`
	Messages  []BotMessage  `bson:"messages" json:"messages"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time     `bson:"updatedAt" json:"updatedAt"`
}
