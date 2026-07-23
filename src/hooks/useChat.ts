"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/game";
import { webSocketService } from "@/services/websocket";
import { loadChatMessages, saveChatMessage } from "@/lib/chatStorage";

export function useChat(roomCode: string, username: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load persisted messages on mount
  useEffect(() => {
    if (!roomCode) return;
    setMessages(loadChatMessages(roomCode));
  }, [roomCode]);

  // Subscribe to WS chat for this room
  useEffect(() => {
    if (!roomCode) return;
    const unsub = webSocketService.subscribeToRoomChat(roomCode, (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      saveChatMessage(roomCode, message);
    });
    return unsub;
  }, [roomCode]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomCode || !text.trim()) return;
      webSocketService.sendChatMessage(roomCode, username, text.trim());
      // Note: the message will come back via WS subscription and get saved there.
      // This avoids double-saving if the WS echoes our own message.
    },
    [roomCode, username],
  );

  return { messages, sendMessage };
}
