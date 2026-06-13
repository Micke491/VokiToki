package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Chat struct {
	ID                   bson.ObjectID   `bson:"_id,omitempty" json:"_id"`
	Name                 *string         `bson:"name" json:"name"`
	IsGroupChat          bool            `bson:"isGroupChat" json:"isGroupChat"`
	GroupAdmin           *bson.ObjectID  `bson:"groupAdmin,omitempty" json:"groupAdmin,omitempty"`
	Avatar               *string         `bson:"avatar" json:"avatar"`
	Participants         []bson.ObjectID `bson:"participants" json:"participants"`
	ParticipantUsernames []string        `bson:"participantUsernames" json:"participantUsernames"`
	PendingParticipants []bson.ObjectID `bson:"pendingParticipants,omitempty" json:"pendingParticipants,omitempty"`
	PendingUsernames    []string        `bson:"pendingUsernames,omitempty" json:"pendingUsernames,omitempty"`
	LastMessage          *bson.ObjectID  `bson:"lastMessage,omitempty" json:"lastMessage,omitempty"`
	HiddenBy             []bson.ObjectID `bson:"hiddenBy" json:"hiddenBy"`
	Status               string          `bson:"status,omitempty" json:"status,omitempty"`
	InitiatorID          *bson.ObjectID  `bson:"initiatorId,omitempty" json:"initiatorId,omitempty"`
	CreatedAt            time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt            time.Time       `bson:"updatedAt" json:"updatedAt"`
}