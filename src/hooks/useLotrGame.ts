"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/services/api";
import { webSocketService } from "@/services/websocket";
import { LotrStateResponse, LotrGameState } from "@/types/lotr";

export function useLotrGame(sessionId: number, roomId: number, username: string) {
  const [lotrState, setLotrState] = useState<LotrGameState | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("IN_PROGRESS");
  const [players, setPlayers] = useState<LotrStateResponse["players"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchState = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/state`);
      if (!res.ok) {
        setError("Failed to load LOTR game state");
        return;
      }
      const data: LotrStateResponse = await res.json();
      setLotrState(data.parsedState);
      setGameStatus(data.gameStatus);
      setPlayers(data.players);
    } catch {
      setError("Failed to load LOTR game state");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = webSocketService.subscribeToGameEvents(roomId, (event) => {
      const e = event as unknown as Record<string, unknown>;
      if (e.parsedState) {
        setLotrState(e.parsedState as LotrGameState);
      }
      if (e.gameStatus) {
        setGameStatus(e.gameStatus as string);
      }
      if (e.event === "game_ended") {
        setGameStatus("FINISHED");
      }
    });
    return unsub;
  }, [roomId]);

  const takeCard = useCallback(async (cardSlotId: number, playOrDiscard: "PLAY" | "DISCARD", chosenRegion?: string) => {
    try {
      const body: Record<string, unknown> = { cardSlotId, playOrDiscard };
      if (chosenRegion) body.chosenRegion = chosenRegion;
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/take-card`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Action failed" }));
        throw new Error(err.error || "Action failed");
      }
      const data: LotrStateResponse = await res.json();
      setLotrState(data.parsedState);
      setGameStatus(data.gameStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
      setTimeout(() => setError(""), 3000);
    }
  }, [sessionId]);

  const takeLandmark = useCallback(async (tileId: string) => {
    try {
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/take-landmark`, {
        method: "POST",
        body: JSON.stringify({ tileId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Action failed" }));
        throw new Error(err.error || "Action failed");
      }
      const data: LotrStateResponse = await res.json();
      setLotrState(data.parsedState);
      setGameStatus(data.gameStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
      setTimeout(() => setError(""), 3000);
    }
  }, [sessionId]);

  const mySide = players.find(p => p.username === username)?.side as "FELLOWSHIP" | "SAURON" | undefined;
  const isMyTurn = lotrState?.currentTurnPlayer === mySide;

  return { lotrState, gameStatus, players, loading, error, isMyTurn, mySide, takeCard, takeLandmark, setError };
}
