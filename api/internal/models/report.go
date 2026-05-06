package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Report struct {
	ID         bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	ReporterID bson.ObjectID `bson:"reporterId" json:"reporterId"`
	TargetID   bson.ObjectID `bson:"targetId" json:"targetId"`
	TargetType string        `bson:"targetType" json:"targetType"`
	Category   string        `bson:"category" json:"category"`
	Details    string        `bson:"details,omitempty" json:"details,omitempty"`
	Status     string        `bson:"status" json:"status"`
	AdminNotes string        `bson:"adminNotes,omitempty" json:"adminNotes,omitempty"`
	CreatedAt  time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time     `bson:"updatedAt" json:"updatedAt"`
}
