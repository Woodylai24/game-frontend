"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/game";

interface Props {
  messages: ChatMessage[];
  username: string;
  onSend: (message: string) => void;
  onClose: () => void;
}

export default function ChatBottomSheet({ messages, username, onSend, onClose }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-gray-900 rounded-t-xl w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200">Chat</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px]"
        >
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No messages yet</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className={`font-medium ${msg.username === username ? "text-sky-400" : "text-gray-400"}`}>
                  {msg.username}:
                </span>
                <span className="text-gray-200 ml-2">{msg.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-gray-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-gray-800 text-gray-200 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
