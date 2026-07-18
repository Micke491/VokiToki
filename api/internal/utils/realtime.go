package utils

import (
	"context"
	"encoding/json"
	"log"

	"chat-app/internal/db"
	"chat-app/internal/ws"
)

const RedisPubSubChannel = ws.RedisPubSubChannel

func InitRedisPubSub() {
	if db.RedisClient == nil {
		log.Println("Redis client is not initialized. WebSockets will only work on this single local server.")
		return
	}

	ctx := context.Background()
	pubsub := db.RedisClient.Subscribe(ctx, RedisPubSubChannel)

	go func() {
		ch := pubsub.Channel()
		for msg := range ch {
			var payload ws.BroadcastMessage
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err == nil {
				if ws.GlobalHub != nil {
					ws.GlobalHub.Broadcast(payload.Channel, payload.Event, payload.Data)
				}
			} else {
				log.Printf("Failed to unmarshal Redis PubSub message: %v\n", err)
			}
		}
	}()
	log.Println("Started Redis Pub/Sub for WebSockets. Cross-server messaging is ACTIVE.")
}

func Broadcast(channel, event string, data interface{}) {
	ws.Dispatch(channel, event, data)
}
