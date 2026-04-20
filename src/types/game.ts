export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  authProvider: string;
}

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
  activeGameSessionId: number | null;
  gameFinished?: boolean;
}

export interface CreateRoomRequest {
  roomName: string;
  gameType: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
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

export type Board = (string | null)[][];

export interface PlayerSymbolInfo {
  username: string;
  symbol: "X" | "O";
}

export interface GameSessionData {
  id: number;
  roomId: number;
  roomCode: string;
  board: Board;
  currentPlayerOrder: number;
  currentTurn: number;
  gameStatus: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED";
  winnerUsername: string | null;
  players: PlayerSymbolInfo[];
}

export interface GameStartedEvent {
  event: "game_started";
  gameSession: GameSessionData;
  board: Board;
  currentPlayerOrder: number;
}

export interface MoveEvent {
  event: "move";
  board: Board;
  currentPlayerOrder: number;
  gameStatus: string;
  currentTurn: number;
}

export interface GameEndedEvent {
  event: "game_ended";
  board: Board;
  gameStatus: string;
  winnerUsername: string | null;
  isDraw: boolean;
  gameSession: GameSessionData;
}

export interface ReturnToLobbyEvent {
  event: "return_to_lobby";
  room: GameRoom;
}

export type GameWsEvent = GameStartedEvent | MoveEvent | GameEndedEvent | ReturnToLobbyEvent;
