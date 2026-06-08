package models

import (
	"time"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type Session struct {
	ID         bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID     bson.ObjectID `bson:"userId" json:"userId"`
	Token      string        `bson:"token" json:"token"`
	Device     string        `bson:"device" json:"device"`
	IP         string        `bson:"ip" json:"ip"`
	FCMToken   string        `bson:"fcmToken,omitempty" json:"fcmToken,omitempty"`
	LastActive time.Time     `bson:"lastActive" json:"lastActive"`
}