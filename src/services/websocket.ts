import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { GameRoom, ChatMessage, GameWsEvent } from "@/types/game";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface StompFrame {
  headers: Record<string, string>;
  body: string;
}

interface StompMessage {
  body: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

/**
 * A subscription registered with the service. The raw callback receives the
 * raw STOMP message; each subscribe* wrapper handles JSON parsing before
 * calling the user-supplied callback.
 *
 * On reconnect, stompSub goes stale (the old STOMP session is gone) and must
 * be recreated — see resubscribeAll().
 */
interface SubscriptionRecord {
  destination: string;
  callback: (message: StompMessage) => void;
  stompSub: { unsubscribe: () => void } | null;
}

export class WebSocketService {
  private client: Client | null = null;
  private connected = false;
  private username: string | null = null;

  // Subscription registry — tracks every active subscription so it can be
  // replayed after a reconnect. This fixes two bugs:
  //   1. subscribe-before-connect race (refresh): subscriptions registered
  //      while disconnected are stored here and activated on connect.
  //   2. silent reconnect (issue #7): STOMP auto-reconnects but old
  //      subscriptions are dead; resubscribeAll() recreates them.
  private subscriptions = new Map<number, SubscriptionRecord>();
  private nextSubId = 1;

  private connectionStatus: ConnectionStatus = "disconnected";
  private reconnectCount = 0;
  private stateListeners = new Set<(status: ConnectionStatus) => void>();

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.emitStateChange("connecting");

      this.client = new Client({
        webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str: string) => {
          console.log("STOMP: " + str);
        },
        reconnectDelay: 5000,
        // Heartbeat 4s/4s — must match the server's WebSocketConfig
        // (setHeartbeatValue([4000, 4000])). When either side stops hearing
        // from the other for ~2 intervals (~8s), STOMP tears down the session
        // → the server's PresenceEventListener fires on SessionDisconnectEvent
        // → the user's green dot goes gray. This is what makes ungraceful
        // disconnects detectable quickly. @stomp/stompjs does NOT relax its
        // read deadline to a slower server-offered interval, so both sides
        // must agree on 4s.
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      // Fires on initial connect AND on every auto-reconnect.
      // Presence is now server-driven: the backend's PresenceEventListener
      // fires on real SessionConnectedEvent (handshake complete), so we no
      // longer send an explicit /app/user/connect here.
      this.client.onConnect = () => {
        console.log("Connected to WebSocket");
        this.connected = true;
        this.reconnectCount++;
        this.resubscribeAll();
        this.emitStateChange("connected");
        resolve();
      };

      // Fires on graceful STOMP disconnect (e.g. deactivate on logout).
      // STOMP won't auto-reconnect after this.
      this.client.onDisconnect = () => {
        console.log("Disconnected from WebSocket");
        this.connected = false;
        this.emitStateChange("disconnected");
      };

      // Fires when the underlying WebSocket closes for ANY reason — including
      // abrupt drops (backend restart, network loss) where onDisconnect does
      // NOT fire. With reconnectDelay > 0, STOMP will retry after 5s, so we
      // emit "connecting" rather than "disconnected".
      this.client.onWebSocketClose = () => {
        console.log("WebSocket closed");
        if (this.connected) {
          this.connected = false;
          // Null out stale subscription handles — they belonged to the dead
          // STOMP session and must be recreated on reconnect.
          this.subscriptions.forEach((sub) => {
            sub.stompSub = null;
          });
          this.emitStateChange("connecting");
        }
      };

      this.client.onStompError = (frame: StompFrame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
        reject(new Error("Failed to connect to WebSocket"));
      };

      this.client.activate();
    });
  }

  disconnect(): void {
    // Presence is now server-driven: the backend's PresenceEventListener fires
    // on real SessionDisconnectEvent (which deactivate() triggers), so we no
    // longer send an explicit /app/user/disconnect here.
    if (this.client) {
      this.client.deactivate();
    }
    this.connected = false;
    this.username = null;
    this.subscriptions.clear();
    this.reconnectCount = 0;
    this.emitStateChange("disconnected");
  }

  isConnected(): boolean {
    return this.connected;
  }

  setUsername(username: string): void {
    this.username = username;
  }

  /**
   * Register a listener for connection status changes. The callback is
   * immediately invoked with the current status, then on every transition.
   * Returns an unsubscribe function.
   */
  onStateChange(callback: (status: ConnectionStatus) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  getReconnectCount(): number {
    return this.reconnectCount;
  }

  private emitStateChange(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.stateListeners.forEach((cb) => cb(status));
  }

  /**
   * Recreate STOMP subscriptions for every registered record. Called from
   * onConnect — both initial connect and reconnects.
   */
  private resubscribeAll(): void {
    if (!this.client || !this.connected) return;
    this.subscriptions.forEach((record) => {
      record.stompSub = this.client!.subscribe(
        record.destination,
        record.callback,
      );
    });
  }

  /**
   * Register a subscription in the registry. If already connected, subscribes
   * immediately; otherwise the subscription is stored and activated on the
   * next onConnect. Returns a cleanup function.
   *
   * This replaces the old `if (!this.connected) return () => {}` early-return
   * that silently dropped subscriptions attempted before connect.
   */
  private registerSubscription(
    destination: string,
    callback: (message: StompMessage) => void,
  ): () => void {
    const id = this.nextSubId++;
    const record: SubscriptionRecord = { destination, callback, stompSub: null };

    if (this.connected && this.client) {
      record.stompSub = this.client.subscribe(destination, callback);
    }

    this.subscriptions.set(id, record);

    return () => {
      const existing = this.subscriptions.get(id);
      if (existing?.stompSub) {
        existing.stompSub.unsubscribe();
      }
      this.subscriptions.delete(id);
    };
  }

  joinRoom(
    roomId: number,
    roomCode: string,
    username: string,
    password?: string,
  ): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/join`,
      body: JSON.stringify({
        roomCode,
        password: password || "",
      }),
    });
  }

  leaveRoom(roomId: number, username: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/leave`,
      body: JSON.stringify({}),
    });
  }

  startGame(roomId: number, hostUsername: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/start`,
      body: JSON.stringify({}),
    });
  }

  sendChatMessage(roomId: number, username: string, message: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/chat`,
      body: JSON.stringify({ message }),
    });
  }

  toggleReady(roomId: number, username: string, ready: boolean): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/ready`,
      body: JSON.stringify({ ready: ready.toString() }),
    });
  }

  makeMove(roomId: number, username: string, row: number, col: number): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/move`,
      body: JSON.stringify({ row, col }),
    });
  }

  returnToLobby(roomId: number, username: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/return-to-lobby`,
      body: JSON.stringify({}),
    });
  }

  subscribeToRoomPlayers(
    roomId: number,
    callback: (room: GameRoom) => void,
  ): () => void {
    return this.registerSubscription(
      `/topic/room/${roomId}/players`,
      (message: StompMessage) => {
        const room: GameRoom = JSON.parse(message.body);
        callback(room);
      },
    );
  }

  subscribeToRoomChat(
    roomId: number,
    callback: (message: ChatMessage) => void,
  ): () => void {
    return this.registerSubscription(
      `/topic/room/${roomId}/chat`,
      (message: StompMessage) => {
        const chatMessage: ChatMessage = JSON.parse(message.body);
        callback(chatMessage);
      },
    );
  }

  subscribeToGameEvents(
    roomId: number,
    callback: (event: GameWsEvent) => void,
  ): () => void {
    return this.registerSubscription(
      `/topic/room/${roomId}/game`,
      (message: StompMessage) => {
        const event = JSON.parse(message.body);
        callback(event);
      },
    );
  }

  subscribeToReadyStatus(
    roomId: number,
    callback: (data: { username: string; ready: boolean }) => void,
  ): () => void {
    return this.registerSubscription(
      `/topic/room/${roomId}/ready`,
      (message: StompMessage) => {
        const data = JSON.parse(message.body);
        callback(data);
      },
    );
  }

  subscribeToUserJoinResponse(
    username: string,
    callback: (response: unknown) => void,
  ): () => void {
    return this.registerSubscription(
      `/topic/user/${username}/join`,
      (message: StompMessage) => {
        const response = JSON.parse(message.body);
        callback(response);
      },
    );
  }

  subscribe<T>(
    destination: string,
    callback: (data: T) => void,
  ): () => void {
    return this.registerSubscription(destination, (message: StompMessage) => {
      const data: T = JSON.parse(message.body);
      callback(data);
    });
  }

}

export const webSocketService = new WebSocketService();
