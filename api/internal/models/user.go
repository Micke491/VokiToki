package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID                   bson.ObjectID        `bson:"_id,omitempty" json:"id"`
	Username             string               `bson:"username" json:"username"`
	Email                string               `bson:"email" json:"email"`
	Password             string               `bson:"password" json:"-"`
	Bio                  string               `bson:"bio" json:"bio"`
	Avatar               string               `bson:"avatar" json:"avatar"`
	Name                 string               `bson:"name" json:"name"`
	PublicKey            string               `bson:"publicKey" json:"publicKey"`
	ReadReceipts         bool                 `bson:"readReceipts" json:"readReceipts"`
	BlockedUsers         []bson.ObjectID      `bson:"blockedUsers" json:"blockedUsers"`
	TwoFactorEnabled     bool                 `bson:"twoFactorEnabled" json:"twoFactorEnabled"`
	TwoFactorSecret      string               `bson:"twoFactorSecret" json:"twoFactorSecret"`
	Theme                string               `bson:"theme" json:"theme"` // 'light' | 'dark' | 'system'
	IsBanned             bool                 `bson:"isBanned" json:"isBanned"`
	MutedChats           []MutedChat          `bson:"mutedChats" json:"mutedChats"`
	ResetPasswordToken   *string              `bson:"resetPasswordToken,omitempty" json:"resetPasswordToken,omitempty"`
	ResetPasswordExpires *time.Time           `bson:"resetPasswordExpires,omitempty" json:"resetPasswordExpires,omitempty"`
	Links                []UserLink           `bson:"links" json:"links"`
	Location             string               `bson:"location" json:"location"`
	Status               string               `bson:"status" json:"status"`
	LastSeen             *time.Time           `bson:"lastSeen,omitempty" json:"lastSeen,omitempty"`
	IsOnline             bool                 `bson:"isOnline" json:"isOnline"`
	TimeoutUntil         *time.Time           `bson:"timeoutUntil,omitempty" json:"timeoutUntil,omitempty"`
	CreatedAt            time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt            time.Time            `bson:"updatedAt" json:"updatedAt"`
}

type MutedChat struct {
	ChatID     bson.ObjectID `bson:"chatId" json:"chatId"`
	MutedUntil time.Time     `bson:"mutedUntil" json:"mutedUntil"`
}

type UserLink struct {
	Label string `bson:"label" json:"label"`
	URL   string `bson:"url" json:"url"`
}
