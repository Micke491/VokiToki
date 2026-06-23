import { getAuthToken } from './storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws';

export class Channel {
  name: string;
  callbacks: Record<string, Function[]>;
  client: RealtimeClient;

  constructor(name: string, client: RealtimeClient) {
    this.name = name;
    this.client = client;
    this.callbacks = {};
  }

  bind(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  unbind(event: string, callback?: Function) {
    if (!this.callbacks[event]) return;
    if (callback) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    } else {
      this.callbacks[event] = [];
    }
  }

  trigger(event: string, data: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }
}

export class RealtimeClient {
  ws: WebSocket | null = null;
  channels: Record<string, Channel> = {};
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 1000;
  pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    const token = getAuthToken();
    if (!token) {
        return;
    }

    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      Object.keys(this.channels).forEach(channelName => {
        this.send({ action: 'subscribe', channel: channelName });
      });
    };

    this.ws.onmessage = (event) => {
      const messages = event.data.split('\n');
      for (const msgData of messages) {
        if (!msgData) continue;
        try {
          const message = JSON.parse(msgData);
          if (message.channel && message.event) {
            const channel = this.channels[message.channel];
            if (channel) {
              channel.trigger(message.event, message.data);
            }
          }
        } catch (err) {
          console.error('Failed to parse websocket message', err);
        }
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log("Max reconnect attempts reached.");
        return;
    }
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
        this.connect();
    }
  }

  subscribe(channelName: string): Channel {
    if (!this.channels[channelName]) {
      this.channels[channelName] = new Channel(channelName, this);
    }
    
    const token = getAuthToken();
    if (token && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      this.connect();
    }

    this.send({ action: 'subscribe', channel: channelName });
    
    return this.channels[channelName];
  }

  unsubscribe(channelName: string) {
    if (this.channels[channelName]) {
      delete this.channels[channelName];
      this.send({ action: 'unsubscribe', channel: channelName });
    }
  }
}

export const wsClient = typeof window !== 'undefined' ? new RealtimeClient() : null;
