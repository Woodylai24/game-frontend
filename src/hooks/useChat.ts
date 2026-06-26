"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/game";
import { webSocketService } from "@/services/websocket";
import { loadChatMessages, saveChatMessage } from "@/lib/chatStorage";

export function useChat(roomId: number, username: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load persisted messages on mount
  useEffect(() => {
    if (!roomId) return;
    setMessages(loadChatMessages(roomId));
  }, [roomId]);

  // Subscribe to WS chat for this room
  useEffect(() => {
    if (!roomId) return;
    const unsub = webSocketService.subscribeToRoomChat(roomId, (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      saveChatMessage(roomId, message);
    });
    return unsub;
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomId || !text.trim()) return;
      webSocketService.sendChatMessage(roomId, username, text.trim());
      // Note: the message will come back via WS subscription and get saved there.
      // This avoids double-saving if the WS echoes our own message.
    },
    [roomId, username],
  );

  return { messages, sendMessage };
}
