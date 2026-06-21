package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type BotAttachment struct {
	Type       string `bson:"type" json:"type"`           
	MimeType   string `bson:"mimeType" json:"mimeType"`      
	FileName   string `bson:"fileName" json:"fileName"`
	ThumbnailB64 string `bson:"thumbnailB64,omitempty" json:"thumbnailB64,omitempty"` 
}

type BotMessage struct {
	ID          bson.ObjectID   `bson:"_id,omitempty" json:"_id"`
	Role        string          `bson:"role" json:"role"`
	Text        string          `bson:"text" json:"text"`
	Attachments []BotAttachment `bson:"attachments,omitempty" json:"attachments,omitempty"`
	CreatedAt   time.Time       `bson:"createdAt" json:"createdAt"`
}

type BotChat struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	Title     string        `bson:"title" json:"title"`
	Pinned    bool          `bson:"pinned" json:"pinned"`
	Messages  []BotMessage  `bson:"messages" json:"messages"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time     `bson:"updatedAt" json:"updatedAt"`
}