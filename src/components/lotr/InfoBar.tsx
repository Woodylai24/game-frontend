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
}

export default function InfoBar({ currentChapter, currentTurnPlayer, isMyTurn, isFinished, isDraw, winnerSide, mySide }: Props) {
  const chapterLabel = currentChapter > 3 ? "Game Finished" : `Chapter ${["I", "II", "III"][currentChapter - 1] || "?"}`;

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
              <span className="text-red-400">Defeat — {winnerSide === "FELLOWSHIP" ? "Fellowship" : "Sauron"} wins</span>
            )}
          </div>
        ) : isMyTurn ? (
          <div className="text-sm font-bold text-green-400 animate-pulse">⚔️ Your Turn</div>
        ) : (
          <div className="text-sm text-gray-400">Waiting for {currentTurnPlayer === "FELLOWSHIP" ? "Fellowship" : "Sauron"}...</div>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Turn: {currentTurnPlayer === "FELLOWSHIP" ? "🗡️" : "👁️"}
      </div>
    </div>
  );
}
