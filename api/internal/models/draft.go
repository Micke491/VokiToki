package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Draft struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	ChatID    bson.ObjectID `bson:"chatId" json:"chatId"`
	Text      string        `bson:"text" json:"text"`
	UpdatedAt time.Time     `bson:"updatedAt" json:"updatedAt"`
}
