import { ChatMessage } from "@/types/game";

const PREFIX = "lotr_chat_";
const MAX_MESSAGES = 200;

export function loadChatMessages(roomId: number): ChatMessage[] {
  if (!roomId) return [];
  try {
    const stored = localStorage.getItem(`${PREFIX}${roomId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveChatMessage(roomId: number, message: ChatMessage): void {
  if (!roomId) return;
  try {
    const messages = loadChatMessages(roomId);
    messages.push(message);
    // Cap to last MAX_MESSAGES to avoid bloat
    const trimmed = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(`${PREFIX}${roomId}`, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}
