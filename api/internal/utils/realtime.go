package utils

import (
	"chat-app/internal/ws"
)

func Broadcast(channel, event string, data interface{}) {
	if ws.GlobalHub != nil {
		ws.GlobalHub.Broadcast(channel, event, data)
	}
}
