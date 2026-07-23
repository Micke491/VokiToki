package services

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"chat-app/internal/db"
	"chat-app/internal/models"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send"

var expoHTTPClient = &http.Client{Timeout: 10 * time.Second}

type expoMessage struct {
	To        string            `json:"to"`
	Title     string            `json:"title"`
	Body      string            `json:"body"`
	Data      map[string]string `json:"data,omitempty"`
	Sound     string            `json:"sound,omitempty"`
	ChannelID string            `json:"channelId,omitempty"`
	Priority  string            `json:"priority,omitempty"`
}

type expoTicketResponse struct {
	Data []struct {
		Status  string `json:"status"`
		ID      string `json:"id"`
		Message string `json:"message"`
		Details struct {
			Error string `json:"error"`
		} `json:"details"`
	} `json:"data"`
}

func SendPushNotification(ctx context.Context, userIDs []bson.ObjectID, chatID bson.ObjectID, category, title, body string, data map[string]string) {
	if len(userIDs) == 0 {
		return
	}

	activeRecipientIDs := filterRecipients(ctx, userIDs, chatID, category)
	if len(activeRecipientIDs) == 0 {
		return
	}

	cursor, err := db.SessionCollection.Find(ctx, bson.M{
		"userId":        bson.M{"$in": activeRecipientIDs},
		"expoPushToken": bson.M{"$exists": true, "$ne": ""},
	})
	if err != nil {
		log.Printf("Failed to query Expo push tokens: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var sessions []models.Session
	if err := cursor.All(ctx, &sessions); err != nil {
		log.Printf("Failed to decode sessions for push: %v", err)
		return
	}

	channelID := "default"
	priority := "default"
	if category == models.NotifyCall {
		channelID = "calls"
		priority = "high"
	}

	messages := make([]expoMessage, 0, len(sessions))
	tokensByIndex := make([]string, 0, len(sessions))
	for _, s := range sessions {
		if s.ExpoPushToken == "" {
			continue
		}
		messages = append(messages, expoMessage{
			To:        s.ExpoPushToken,
			Title:     title,
			Body:      body,
			Data:      data,
			Sound:     "default",
			ChannelID: channelID,
			Priority:  priority,
		})
		tokensByIndex = append(tokensByIndex, s.ExpoPushToken)
	}

	if len(messages) == 0 {
		return
	}

	go sendExpoBatches(messages, tokensByIndex)
}

func filterRecipients(ctx context.Context, userIDs []bson.ObjectID, chatID bson.ObjectID, category string) []bson.ObjectID {
	userCursor, err := db.UserCollection.Find(ctx, bson.M{"_id": bson.M{"$in": userIDs}})
	if err != nil {
		return userIDs
	}
	var users []models.User
	if err := userCursor.All(ctx, &users); err != nil {
		return userIDs
	}

	var out []bson.ObjectID
	for _, u := range users {
		if !u.NotificationPrefs.Allows(category) {
			continue
		}
		if !chatID.IsZero() {
			muted := false
			for _, mc := range u.MutedChats {
				if mc.ChatID == chatID && mc.MutedUntil.After(time.Now()) {
					muted = true
					break
				}
			}
			if muted {
				continue
			}
		}
		out = append(out, u.ID)
	}
	return out
}

func sendExpoBatches(messages []expoMessage, tokens []string) {
	const batchSize = 100
	for start := 0; start < len(messages); start += batchSize {
		end := start + batchSize
		if end > len(messages) {
			end = len(messages)
		}
		postExpoBatch(messages[start:end], tokens[start:end])
	}
}

func postExpoBatch(batch []expoMessage, tokens []string) {
	payload, err := json.Marshal(batch)
	if err != nil {
		log.Printf("Expo push marshal error: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushEndpoint, bytes.NewReader(payload))
	if err != nil {
		log.Printf("Expo push request error: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := expoHTTPClient.Do(req)
	if err != nil {
		log.Printf("Expo push send error: %v", err)
		return
	}
	defer resp.Body.Close()

	var ticket expoTicketResponse
	if err := json.NewDecoder(resp.Body).Decode(&ticket); err != nil {
		log.Printf("Expo push response decode error: %v", err)
		return
	}

	ok := 0
	for i, t := range ticket.Data {
		if t.Status == "ok" {
			ok++
			continue
		}
		if t.Details.Error == "DeviceNotRegistered" && i < len(tokens) {
			pruneExpoToken(tokens[i])
		}
	}
	log.Printf("Expo push: sent %d/%d", ok, len(batch))
}

func pruneExpoToken(token string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := db.SessionCollection.UpdateMany(ctx,
		bson.M{"expoPushToken": token},
		bson.M{"$set": bson.M{"expoPushToken": ""}},
	)
	if err != nil {
		log.Printf("Failed to prune Expo token: %v", err)
	}
}
