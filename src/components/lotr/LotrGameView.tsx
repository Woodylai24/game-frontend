"use client";

import { useState } from "react";
import { LotrGameProvider, useLotrGameContext } from "@/context/LotrGameContext";
import { useChat } from "@/hooks/useChat";
import LotrGameBoard from "./LotrGameBoard";
import PlayerAidModal from "./PlayerAidModal";
import ChatBottomSheet from "./ChatBottomSheet";

interface LotrGameViewProps {
  sessionId: string;
  roomCode: string;
  username: string;
  onBackToRoom: () => void;
}

/**
 * Top-level LOTR game screen. Owns the {@link LotrGameProvider} (which in turn
 * owns `useLotrGame`) plus the non-game concerns that live on this screen —
 * chat and the sticky Player Aid / Chat modals.
 *
 * Split into two pieces because the provider can't consume its own context:
 * `LotrGameView` renders the provider and owns chat/modal state; the internal
 * `LotrGameScreen` is the actual ctx consumer for the error banner and the
 * chat's player list.
 */
export default function LotrGameView({
  sessionId,
  roomCode,
  username,
  onBackToRoom,
}: LotrGameViewProps) {
  return (
    <LotrGameProvider
      sessionId={sessionId}
      roomCode={roomCode}
      username={username}
      onBackToRoom={onBackToRoom}
    >
      <LotrGameScreen roomCode={roomCode} username={username} />
    </LotrGameProvider>
  );
}

function LotrGameScreen({
  roomCode,
  username,
}: {
  roomCode: string;
  username: string;
}) {
  const { error, players } = useLotrGameContext();
  const chat = useChat(roomCode, username);
  const [showPlayerAid, setShowPlayerAid] = useState(false);
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
          {error}
        </div>
      )}
      <LotrGameBoard />

      {/* Sticky action buttons */}
      <div className="fixed bottom-4 right-4 z-30 flex gap-2">
        <button
          onClick={() => setShowPlayerAid(true)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-medium shadow-lg border border-gray-700"
        >
          Player Aid
        </button>
        <button
          onClick={() => setShowChat(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg"
        >
          Chat
        </button>
      </div>

      {/* Mobile spacer so content can scroll past sticky buttons */}
      <div className="h-16 lg:hidden" />

      {/* Modals */}
      {showPlayerAid && (
        <PlayerAidModal onClose={() => setShowPlayerAid(false)} />
      )}
      {showChat && (
        <ChatBottomSheet
          messages={chat.messages}
          username={username}
          onSend={chat.sendMessage}
          onClose={() => setShowChat(false)}
          players={players}
        />
      )}
    </div>
  );
}
