"use client";

import { useEffect, useRef, useState } from "react";
import { LotrPlayerSide } from "@/types/lotr";
import { useLotrGameContext } from "@/context/LotrGameContext";

/** Format elapsed ms as m:ss. */
function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InfoBar() {
  const { state, isMyTurn, isFinished, isDraw, winnerSide, mySide, players, onBackToRoom, playerTimeRemaining } = useLotrGameContext();
  const currentChapter = state.currentChapter;
  const currentTurnPlayer = state.currentTurnPlayer;

  const chapterLabel = currentChapter > 3 ? "Game Finished" : `Chapter ${["I", "II", "III"][currentChapter - 1] || "?"}`;
  const playerName = (side: LotrPlayerSide) =>
    players?.find(p => p.side === side)?.username ?? (side === "FELLOWSHIP" ? "Fellowship" : "Sauron");

  // Count-up shown only when the timer is disabled (untimed games). Anchored to
  // the client mount time — it is a local "elapsed this session" convenience,
  // not authoritative (restarts from 0 on refresh). Timed games show per-player
  // countdowns in PlayerPanel instead, so nothing is shown here.
  const isTimed = playerTimeRemaining !== undefined;
  const mountRef = useRef(Date.now());
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isTimed || isFinished) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isTimed, isFinished]);
  const elapsed = isTimed || isFinished ? null : Date.now() - mountRef.current;

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
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {elapsed !== null && (
            <span className="tabular-nums" title="Elapsed time">
              {formatElapsed(elapsed)}
            </span>
          )}
          <span>Turn: {playerName(currentTurnPlayer)}</span>
        </div>
      )}
    </div>
  );
}
