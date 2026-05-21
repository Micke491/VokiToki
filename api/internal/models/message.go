package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ReadByEntry struct {
	UserID bson.ObjectID `bson:"userId" json:"userId"`
	ReadAt time.Time     `bson:"readAt" json:"readAt"`
}

type Reaction struct {
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	Emoji     string        `bson:"emoji" json:"emoji"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
}

type Message struct {
	ID                   bson.ObjectID   `bson:"_id,omitempty" json:"_id"`
	ChatID               bson.ObjectID   `bson:"chatId" json:"chatId"`
	Sender               bson.ObjectID   `bson:"sender" json:"sender"`
	SenderUsername       string          `bson:"senderUsername" json:"senderUsername"`
	Text                 string          `bson:"text" json:"text"`
	Read                 bool            `bson:"read" json:"read"`
	Status               string          `bson:"status" json:"status"` // sent, delivered, seen
	DeliveredTo          []bson.ObjectID `bson:"deliveredTo" json:"deliveredTo"`
	ReadBy               []ReadByEntry   `bson:"readBy" json:"readBy"`
	IsEdited             bool            `bson:"isEdited" json:"isEdited"`
	EditedAt             *time.Time      `bson:"editedAt,omitempty" json:"editedAt,omitempty"`
	OriginalText         string          `bson:"originalText,omitempty" json:"originalText,omitempty"`
	IsDeletedForEveryone bool            `bson:"isDeletedForEveryone" json:"isDeletedForEveryone"`
	DeletedBy            []bson.ObjectID `bson:"deletedBy" json:"deletedBy"`
	DeletedForEveryoneAt *time.Time      `bson:"deletedForEveryoneAt,omitempty" json:"deletedForEveryoneAt,omitempty"`
	IsPinned             bool            `bson:"isPinned" json:"isPinned"`
	ReplyTo              *bson.ObjectID  `bson:"replyTo,omitempty" json:"replyTo,omitempty"`
	MediaURL             string          `bson:"mediaUrl,omitempty" json:"mediaUrl,omitempty"`
	MediaType            string          `bson:"mediaType,omitempty" json:"mediaType,omitempty"`
	MediaPublicID        string          `bson:"mediaPublicId,omitempty" json:"mediaPublicId,omitempty"`
	IsForwarded          bool            `bson:"isForwarded" json:"isForwarded"`
	StoryID              *bson.ObjectID  `bson:"storyId,omitempty" json:"storyId,omitempty"`
	StoryMediaURL        string          `bson:"storyMediaUrl,omitempty" json:"storyMediaUrl,omitempty"`
	StoryMediaType       string          `bson:"storyMediaType,omitempty" json:"storyMediaType,omitempty"`
	StoryCaption         string          `bson:"storyCaption,omitempty" json:"storyCaption,omitempty"`
	StoryExpiresAt       *time.Time      `bson:"storyExpiresAt,omitempty" json:"storyExpiresAt,omitempty"`
	IsSystemMessage      bool            `bson:"isSystemMessage" json:"isSystemMessage"`
	Reactions            []Reaction      `bson:"reactions" json:"reactions"`
	CreatedAt            time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt            time.Time       `bson:"updatedAt" json:"updatedAt"`
}
