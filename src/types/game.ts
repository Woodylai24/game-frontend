export interface User {
  id: number;
  username: string;
  displayName: string;
  isOnline: boolean;
  createdAt: string;
  lastActive: string;
}

export interface Player {
  id: number;
  username: string;
  displayName: string;
  playerOrder: number;
  status: "ACTIVE" | "DISCONNECTED" | "LEFT" | "KICKED";
  joinedAt: string;
  isReady: boolean;
  score: number;
}

export interface GameRoom {
  id: number;
  roomName: string;
  roomCode: string;
  gameType: string;
  status: "WAITING" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED";
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  createdAt: string;
  hostUsername: string;
  players: Player[];
}

export interface CreateRoomRequest {
  roomName: string;
  gameType: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  hostUsername: string;
}

export interface JoinRoomRequest {
  username: string;
  password?: string;
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

export interface GameEvent {
  type:
    | "PLAYER_JOINED"
    | "PLAYER_LEFT"
    | "GAME_STARTED"
    | "GAME_ENDED"
    | "PLAYER_READY"
    | "CHAT_MESSAGE";
  data: unknown;
  timestamp: number;
}
