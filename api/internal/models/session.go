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
	ExpoPushToken string     `bson:"expoPushToken,omitempty" json:"expoPushToken,omitempty"`
	LastActive time.Time     `bson:"lastActive" json:"lastActive"`
}