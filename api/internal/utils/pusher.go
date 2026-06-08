package utils

import (
	"log"

	"chat-app/internal/config"

	"github.com/pusher/pusher-http-go/v5"
)

var pusherClient *pusher.Client

func getPusherClient() *pusher.Client {
	if pusherClient == nil {
		cfg := config.AppConfig
		if cfg.PusherAppID == "" || cfg.PusherKey == "" || cfg.PusherSecret == "" {
			return nil
		}
		pusherClient = &pusher.Client{
			AppID:   cfg.PusherAppID,
			Key:     cfg.PusherKey,
			Secret:  cfg.PusherSecret,
			Cluster: cfg.PusherCluster,
			Secure:  true,
		}
	}
	return pusherClient
}

func TriggerPusher(channel, event string, data interface{}) {
	client := getPusherClient()
	if client == nil {
		return
	}

	go func() {
		err := client.Trigger(channel, event, data)
		if err != nil {
			log.Printf("Pusher trigger error on channel %s: %v", channel, err)
		}
	}()
}
