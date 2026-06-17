package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID                   bson.ObjectID        `bson:"_id,omitempty" json:"_id"`
	Username             string               `bson:"username" json:"username"`
	Email                string               `bson:"email" json:"email"`
	Password             string               `bson:"password" json:"-"`
	Role                 string               `bson:"role" json:"role"`
	Bio                  string               `bson:"bio" json:"bio"`
	Avatar               string               `bson:"avatar" json:"avatar"`
	Name                 string               `bson:"name" json:"name"`
	PublicKey            string               `bson:"publicKey" json:"publicKey"`
	ReadReceipts         bool                 `bson:"readReceipts" json:"readReceipts"`
	BlockedUsers         []bson.ObjectID      `bson:"blockedUsers" json:"blockedUsers"`
	TwoFactorEnabled     bool                 `bson:"twoFactorEnabled" json:"twoFactorEnabled"`
	TwoFactorSecret      string               `bson:"twoFactorSecret" json:"twoFactorSecret"`
	Theme                string               `bson:"theme" json:"theme"`
	IsBanned             bool                 `bson:"isBanned" json:"isBanned"`
	MutedChats           []MutedChat          `bson:"mutedChats" json:"mutedChats"`
	PinnedChats          []bson.ObjectID      `bson:"pinnedChats" json:"pinnedChats"`
	ResetPasswordToken   *string              `bson:"resetPasswordToken,omitempty" json:"resetPasswordToken,omitempty"`
	ResetPasswordExpires *time.Time           `bson:"resetPasswordExpires,omitempty" json:"resetPasswordExpires,omitempty"`
	Links                []UserLink           `bson:"links" json:"links"`
	Location             string               `bson:"location" json:"location"`
	Gender               string               `bson:"gender" json:"gender"`
	TimeoutUntil         *time.Time           `bson:"timeoutUntil,omitempty" json:"timeoutUntil,omitempty"`
	CreatedAt            time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt            time.Time            `bson:"updatedAt" json:"updatedAt"`
	DefaultWallpaper     string               `bson:"defaultWallpaper" json:"defaultWallpaper"`
	AutoPlayGifs         bool                 `bson:"autoPlayGifs" json:"autoPlayGifs"`
	AutoPlayVoice        bool                 `bson:"autoPlayVoice" json:"autoPlayVoice"`
	Followers            []bson.ObjectID      `bson:"followers" json:"followers"`
	Following            []bson.ObjectID      `bson:"following" json:"following"`
	FollowRequests       []bson.ObjectID      `bson:"followRequests" json:"followRequests"`
	SentFollowRequests   []bson.ObjectID      `bson:"sentFollowRequests" json:"sentFollowRequests"`
	StoryPrivacy         string               `bson:"storyPrivacy" json:"storyPrivacy"`
	BotPersona           string               `bson:"botPersona" json:"botPersona"`
}

type MutedChat struct {
	ChatID     bson.ObjectID `bson:"chatId" json:"chatId"`
	MutedUntil time.Time     `bson:"mutedUntil" json:"mutedUntil"`
}

type UserLink struct {
	Label string `bson:"label" json:"label"`
	URL   string `bson:"url" json:"url"`
}