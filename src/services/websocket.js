/**
 * WebSocket service placeholder for real-time cluster telemetry.
 * Connects when VITE_WS_URL is provided, or gracefully dispatches
 * local simulation telemetry.
 */
class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.wsUrl = import.meta.env.VITE_WS_URL || null;
  }

  connect() {
    if (!this.wsUrl) {
      // Running standalone frontend simulation
      this.isConnected = true;
      return;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emit('connection', { status: 'connected' });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch {
          // ignore malformed payloads
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('disconnection', { status: 'disconnected' });
        // Auto-reconnect after 3s
        setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (err) => {
        this.emit('error', err);
      };
    } catch {
      this.isConnected = false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter((cb) => cb !== callback);
    this.listeners.set(event, filtered);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => cb(data));
    }
  }

  send(type, payload) {
    if (this.socket && this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export const wsService = new WebSocketService();
