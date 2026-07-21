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
  activeGameSessionId: string | null;
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

/**
 * Generic game-session data — shared by all games.
 *
 * Per-game state lives in {@code gameState} as an opaque JSON string; each
 * game's frontend parses it according to its own type (e.g. TicTacToeState
 * for TTT). Previously this carried TTT-specific fields (board,
 * currentPlayerOrder, currentTurn, PlayerSymbolInfo) that leaked TTT
 * assumptions into every game's session shape.
 */
export interface GameSessionData {
  id: string;
  roomId: number;
  roomCode: string;
  gameStatus: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED";
  gameState: string;
  winnerUsername: string | null;
}

export interface GameStartedEvent {
  event: "game_started";
  gameSession: GameSessionData;
}

export interface MoveEvent {
  event: "move";
  gameSession: GameSessionData;
}

export interface GameEndedEvent {
  event: "game_ended";
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
