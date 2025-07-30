import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { GameRoom, ChatMessage } from "@/types/game";

interface StompFrame {
  headers: Record<string, string>;
  body: string;
}

interface StompMessage {
  body: string;
}

export class WebSocketService {
  private client: Client | null = null;
  private connected = false;
  private username: string | null = null;

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {},
      debug: (str: string) => {
        console.log("STOMP: " + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log("Connected to WebSocket");
      this.connected = true;
      if (this.username) {
        this.sendUserConnect(this.username);
      }
    };

    this.client.onDisconnect = () => {
      console.log("Disconnected from WebSocket");
      this.connected = false;
    };

    this.client.onStompError = (frame: StompFrame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };
  }

  connect(username: string): Promise<void> {
    this.username = username;
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.client!.onConnect = () => {
        console.log("Connected to WebSocket");
        this.connected = true;
        this.sendUserConnect(username);
        resolve();
      };

      this.client!.onStompError = (frame: StompFrame) => {
        console.error("Connection error:", frame);
        reject(new Error("Failed to connect to WebSocket"));
      };

      this.client!.activate();
    });
  }

  disconnect(): void {
    if (this.username) {
      this.sendUserDisconnect(this.username);
    }
    if (this.client) {
      this.client.deactivate();
    }
    this.connected = false;
    this.username = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Room-related methods
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
        username,
        roomCode,
        password: password || "",
      }),
    });
  }

  leaveRoom(roomId: number, username: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/leave`,
      body: JSON.stringify({ username }),
    });
  }

  startGame(roomId: number, hostUsername: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/start`,
      body: JSON.stringify({ hostUsername }),
    });
  }

  sendChatMessage(roomId: number, username: string, message: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/chat`,
      body: JSON.stringify({ username, message }),
    });
  }

  toggleReady(roomId: number, username: string, ready: boolean): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: `/app/room/${roomId}/ready`,
      body: JSON.stringify({ username, ready: ready.toString() }),
    });
  }

  // Subscription methods
  subscribeToRoomPlayers(
    roomId: number,
    callback: (room: GameRoom) => void,
  ): () => void {
    if (!this.connected) return () => {};

    const subscription = this.client!.subscribe(
      `/topic/room/${roomId}/players`,
      (message: StompMessage) => {
        const room: GameRoom = JSON.parse(message.body);
        callback(room);
      },
    );

    return () => subscription.unsubscribe();
  }

  subscribeToRoomChat(
    roomId: number,
    callback: (message: ChatMessage) => void,
  ): () => void {
    if (!this.connected) return () => {};

    const subscription = this.client!.subscribe(
      `/topic/room/${roomId}/chat`,
      (message: StompMessage) => {
        const chatMessage: ChatMessage = JSON.parse(message.body);
        callback(chatMessage);
      },
    );

    return () => subscription.unsubscribe();
  }

  subscribeToGameEvents(
    roomId: number,
    callback: (event: unknown) => void,
  ): () => void {
    if (!this.connected) return () => {};

    const subscription = this.client!.subscribe(
      `/topic/room/${roomId}/game`,
      (message: StompMessage) => {
        const event = JSON.parse(message.body);
        callback(event);
      },
    );

    return () => subscription.unsubscribe();
  }

  subscribeToReadyStatus(
    roomId: number,
    callback: (data: { username: string; ready: boolean }) => void,
  ): () => void {
    if (!this.connected) return () => {};

    const subscription = this.client!.subscribe(
      `/topic/room/${roomId}/ready`,
      (message: StompMessage) => {
        const data = JSON.parse(message.body);
        callback(data);
      },
    );

    return () => subscription.unsubscribe();
  }

  subscribeToUserJoinResponse(
    username: string,
    callback: (response: unknown) => void,
  ): () => void {
    if (!this.connected) return () => {};

    const subscription = this.client!.subscribe(
      `/user/${username}/queue/room/join`,
      (message: StompMessage) => {
        const response = JSON.parse(message.body);
        callback(response);
      },
    );

    return () => subscription.unsubscribe();
  }

  // Private methods
  private sendUserConnect(username: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: "/app/user/connect",
      body: JSON.stringify({ username }),
    });
  }

  private sendUserDisconnect(username: string): void {
    if (!this.connected) return;

    this.client!.publish({
      destination: "/app/user/disconnect",
      body: JSON.stringify({ username }),
    });
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
