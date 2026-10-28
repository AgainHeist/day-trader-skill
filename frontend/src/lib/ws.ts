type Handler = (event: any) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<Handler>> = new Map();
  private url: string;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private pingTimer: any = null;

  constructor() {
    const wsBase = import.meta.env.VITE_WS_URL || '';
    if (wsBase) {
      this.url = wsBase.replace(/^http/, 'ws') + '/ws';
    } else {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${proto}//${window.location.host}/ws`;
      // Dev fallback to localhost:8000
      if (window.location.port === '5173') {
        this.url = 'ws://localhost:8000/ws';
      }
    }
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('system.status', { status: 'Connected' });
        this.pingTimer = setInterval(() => this.send({ type: 'ping', timestamp: Date.now() }), 25000);
      };
      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          this.emit(data.type || 'message', data);
          this.emit('*', data);
        } catch { this.emit('*', { raw: ev.data }); }
      };
      this.ws.onclose = () => {
        clearInterval(this.pingTimer);
        this.emit('system.status', { status: 'Reconnecting' });
        if (this.shouldReconnect) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), delay);
        } else {
          this.emit('system.status', { status: 'Offline' });
        }
      };
      this.ws.onerror = () => {
        // let onclose handle reconnect
      };
    } catch {}
  }

  disconnect() {
    this.shouldReconnect = false;
    clearInterval(this.pingTimer);
    try { this.ws?.close(); } catch {}
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(eventType: string, handler: Handler) {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach(h => { try{ h(data); } catch{} });
    if (type !== '*') this.handlers.get('*')?.forEach(h => { try{ h(data); } catch{} });
  }
}

export const ws = new WSManager();
export function useWS() { return ws; }
