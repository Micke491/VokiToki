package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type BroadcastMessage struct {
	Channel string      `json:"channel"`
	Event   string      `json:"event"`
	Data    interface{} `json:"data"`
}

type Client struct {
	UserID    string
	Conn      *websocket.Conn
	Channels  map[string]bool
	Send      chan []byte
	done      chan struct{}
	closeOnce sync.Once
	mu        sync.Mutex
}

func (c *Client) Subscribe(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Channels[channel] = true
}

func (c *Client) Unsubscribe(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.Channels, channel)
}

// Close safely terminates the client connection and signals to goroutines
func (c *Client) Close() {
	c.closeOnce.Do(func() {
		close(c.done)
		c.Conn.Close()
	})
}

type Hub struct {
	clients    map[*Client]bool
	channels   map[string]map[*Client]bool
	broadcast  chan BroadcastMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var GlobalHub *Hub

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		broadcast:  make(chan BroadcastMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close() 
				
				client.mu.Lock()
				for ch := range client.Channels {
					if h.channels[ch] != nil {
						delete(h.channels[ch], client)
						if len(h.channels[ch]) == 0 {
							delete(h.channels, ch)
						}
					}
				}
				client.mu.Unlock()
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			clientsInChannel, ok := h.channels[message.Channel]
			var clientsToNotify []*Client
			if ok {
				for client := range clientsInChannel {
					clientsToNotify = append(clientsToNotify, client)
				}
			}
			h.mu.RUnlock()

			if len(clientsToNotify) > 0 {
				payload, err := json.Marshal(message)
				if err != nil {
					log.Printf("Error marshaling broadcast: %v", err)
					continue
				}
				for _, client := range clientsToNotify {
					select {
					case client.Send <- payload:
					default:
						// If the client write buffer is full, close their connection.
						// The readPump will catch this, exit, and safely trigger the unregister channel.
						client.Close()
					}
				}
			}
		}
	}
}

func (h *Hub) Broadcast(channel, event string, data interface{}) {
	msg := BroadcastMessage{
		Channel: channel,
		Event:   event,
		Data:    data,
	}
	h.broadcast <- msg
}

func (h *Hub) Subscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.channels[channel] == nil {
		h.channels[channel] = make(map[*Client]bool)
	}
	h.channels[channel][client] = true
	client.Subscribe(channel)
}

func (h *Hub) Unsubscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.channels[channel]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.channels, channel)
		}
	}
	client.Unsubscribe(channel)
}
