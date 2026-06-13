package services

import (
	"context"
	"log"
	"os"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"go.mongodb.org/mongo-driver/v2/bson"
	"google.golang.org/api/option"
)

var fcmClient *messaging.Client

func InitFCM() {
	ctx := context.Background()
	var app *firebase.App
	var err error

	serviceAccountJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
	if serviceAccountJSON != "" {
		opt := option.WithCredentialsJSON([]byte(serviceAccountJSON))
		app, err = firebase.NewApp(ctx, nil, opt)
	} else {
		app, err = firebase.NewApp(ctx, nil)
	}

	if err != nil {
		log.Printf("WARNING: Failed to initialize Firebase App: %v", err)
		return
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		log.Printf("WARNING: Failed to get FCM Messaging client: %v", err)
		return
	}
	fcmClient = client
	log.Println("Firebase Cloud Messaging (FCM) initialized successfully")
}

func SendPushNotification(ctx context.Context, userIDs []bson.ObjectID, chatID bson.ObjectID, title, body string, data map[string]string) {
	if fcmClient == nil {
		return
	}

	var activeRecipientIDs []bson.ObjectID
	if !chatID.IsZero() {
		userCursor, err := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": userIDs}})
		if err == nil {
			var users []models.User
			if err := userCursor.All(ctx, &users); err == nil {
				for _, u := range users {
					isMuted := false
					for _, mc := range u.MutedChats {
						if mc.ChatID == chatID && mc.MutedUntil.After(time.Now()) {
							isMuted = true
							break
						}
					}
					if !isMuted {
						activeRecipientIDs = append(activeRecipientIDs, u.ID)
					}
				}
			}
		} else {
			activeRecipientIDs = userIDs
		}
	} else {
		activeRecipientIDs = userIDs
	}

	if len(activeRecipientIDs) == 0 {
		return
	}

	cursor, err := db.SessionCollection.Find(ctx, bson.M{
		"userId":   bson.M{"$in": activeRecipientIDs},
		"fcmToken": bson.M{"$exists": true, "$ne": ""},
	})
	if err != nil {
		log.Printf("Failed to query FCM tokens: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var sessions []models.Session
	if err := cursor.All(ctx, &sessions); err != nil {
		log.Printf("Failed to decode sessions for FCM: %v", err)
		return
	}

	var tokens []string
	for _, s := range sessions {
		if s.FCMToken != "" {
			tokens = append(tokens, s.FCMToken)
		}
	}

	if len(tokens) == 0 {
		return
	}

	var androidConfig *messaging.AndroidConfig
	var apnsConfig *messaging.APNSConfig

	if data != nil && data["type"] == "call" {
		androidConfig = &messaging.AndroidConfig{
			Priority: "high",
		}
		apnsConfig = &messaging.APNSConfig{
			Headers: map[string]string{
				"apns-priority": "10",
				"apns-topic":    "your.app.bundle.id.voip",
			},
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					ContentAvailable: true,
				},
			},
		}
	}

	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data:    data,
		Android: androidConfig,
		APNS:    apnsConfig,
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		response, err := fcmClient.SendEachForMulticast(bgCtx, message)
		if err != nil {
			log.Printf("FCM multicast send error: %v", err)
			return
		}
		log.Printf("Successfully sent %d FCM notifications (failures: %d)", response.SuccessCount, response.FailureCount)
	}()
}
