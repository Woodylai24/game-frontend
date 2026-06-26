"use client";

import { LotrPlayerSide } from "@/types/lotr";

interface Props {
  currentChapter: number;
  currentTurnPlayer: LotrPlayerSide;
  isMyTurn: boolean;
  isFinished: boolean;
  isDraw: boolean;
  winnerSide?: LotrPlayerSide;
  mySide?: string;
  players?: { username: string; side: string }[];
  onBackToRoom?: () => void;
}

export default function InfoBar({ currentChapter, currentTurnPlayer, isMyTurn, isFinished, isDraw, winnerSide, mySide, players, onBackToRoom }: Props) {
  const chapterLabel = currentChapter > 3 ? "Game Finished" : `Chapter ${["I", "II", "III"][currentChapter - 1] || "?"}`;
  const playerName = (side: LotrPlayerSide) =>
    players?.find(p => p.side === side)?.username ?? (side === "FELLOWSHIP" ? "Fellowship" : "Sauron");

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-yellow-400 font-bold text-sm">{chapterLabel}</div>
        {isFinished ? (
          <div className="text-sm font-bold">
            {isDraw ? (
              <span className="text-yellow-400">Game Over — Draw!</span>
            ) : winnerSide === mySide ? (
              <span className="text-green-400">Victory!</span>
            ) : (
              <span className="text-red-400">Defeat — {winnerSide ? playerName(winnerSide) : "?"} wins</span>
            )}
          </div>
        ) : isMyTurn ? (
          <div className="text-sm font-bold text-green-400 animate-pulse">Your Turn</div>
        ) : (
          <div className="text-sm text-gray-400">Waiting for {playerName(currentTurnPlayer)}...</div>
        )}
      </div>
      {isFinished && onBackToRoom ? (
        <button
          onClick={onBackToRoom}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold"
        >
          Back to Room
        </button>
      ) : (
        <div className="text-xs text-gray-500">
          Turn: {playerName(currentTurnPlayer)}
        </div>
      )}
    </div>
  );
}
