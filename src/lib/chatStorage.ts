import { ChatMessage } from "@/types/game";

// Keyed by the room's public session code (NOT the numeric DB id, which is not
// exposed to the client). Chatrooms are room-scoped, not game-scoped, so the
// prefix is the generic "chat_" rather than a game-specific one.
const PREFIX = "chat_";
const MAX_MESSAGES = 200;

export function loadChatMessages(roomCode: string): ChatMessage[] {
  if (!roomCode) return [];
  try {
    const stored = localStorage.getItem(`${PREFIX}${roomCode}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveChatMessage(roomCode: string, message: ChatMessage): void {
  if (!roomCode) return;
  try {
    const messages = loadChatMessages(roomCode);
    messages.push(message);
    // Cap to last MAX_MESSAGES to avoid bloat
    const trimmed = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(`${PREFIX}${roomCode}`, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}
