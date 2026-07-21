"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/services/api";
import { webSocketService } from "@/services/websocket";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { LotrStateResponse, LotrGameState } from "@/types/lotr";

export function useLotrGame(sessionId: string, roomId: number, username: string) {
  const { reconnectCount } = useConnectionStatus();
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

  // Re-fetch full LOTR state after a WS reconnect (skips the initial connect —
  // the mount effect above already fetched). Moves made during the outage are
  // not broadcast (in-memory broker), so we re-pull parsedState to resync.
  const initialReconnectSeen = useRef(false);
  useEffect(() => {
    if (reconnectCount === 0) return;
    if (!initialReconnectSeen.current) {
      initialReconnectSeen.current = true;
      return;
    }
    fetchState();
  }, [reconnectCount, fetchState]);

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
  const isManeuverPhase = lotrState?.maneuverPhase === true && lotrState?.maneuverPlayer === mySide;
  const isBonusPhase = lotrState?.bonusPhase === true && lotrState?.bonusPlayer === mySide;
  const isLandmarkPhase = lotrState?.landmarkPhase === true && lotrState?.landmarkPlayer === mySide;
  const isAlliancePhase = lotrState?.alliancePhase === true && lotrState?.alliancePlayer === mySide;
  const isAllianceEffectPhase = lotrState?.allianceEffectPhase === true && lotrState?.allianceEffectPlayer === mySide;
  const isPickDiscardPhase = lotrState?.pickDiscardPhase === true && lotrState?.pickDiscardPhasePlayer === mySide;
  const isRemoveFortressPhase = lotrState?.removeFortressPhase === true && lotrState?.removeFortressPhasePlayer === mySide;
  const isPlaceUnitPhase = lotrState?.placeUnitPhase === true && lotrState?.placeUnitPhasePlayer === mySide;

  const resolveManeuver = useCallback(async (maneuverType: string, targetRegion?: string, fromRegion?: string, toRegion?: string) => {
    try {
      const body: Record<string, unknown> = { maneuverType };
      if (targetRegion) body.targetRegion = targetRegion;
      if (fromRegion) body.fromRegion = fromRegion;
      if (toRegion) body.toRegion = toRegion;
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-maneuver`, {
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

  const resolveBonus = useCallback(async (bonusPosition: number, targetRegion?: string, action?: string) => {
    try {
      const body: Record<string, unknown> = { bonusPosition };
      if (action === "SKIP") {
        body.action = "SKIP";
      } else {
        body.action = "RESOLVE";
        if (targetRegion) body.targetRegion = targetRegion;
      }
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-bonus`, {
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

  const resolvePickDiscard = useCallback(async (action: string, cardDefId?: string) => {
    try {
      const body: Record<string, unknown> = { action };
      if (cardDefId) body.cardDefId = cardDefId;
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-pick-discard`, {
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

  const resolveRemoveFortress = useCallback(async (action: string, targetRegion?: string) => {
    try {
      const body: Record<string, unknown> = { action };
      if (targetRegion) body.targetRegion = targetRegion;
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-remove-fortress`, {
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

  const resolvePlaceUnit = useCallback(async (action: string, targetRegion?: string) => {
    try {
      const body: Record<string, unknown> = { action };
      if (targetRegion) body.targetRegion = targetRegion;
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-place-unit`, {
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

  const resolveLandmark = useCallback(async (action: string, data?: Record<string, string>) => {
    try {
      const body: Record<string, unknown> = { action };
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          body[key] = value;
        }
      }
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-landmark`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Action failed" }));
        throw new Error(err.error || "Action failed");
      }
      const resp: LotrStateResponse = await res.json();
      setLotrState(resp.parsedState);
      setGameStatus(resp.gameStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
      setTimeout(() => setError(""), 3000);
    }
  }, [sessionId]);

  const resolveAlliance = useCallback(async (tokenId: string) => {
    try {
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-alliance`, {
        method: "POST",
        body: JSON.stringify({ tokenId }),
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

  const resolveAllianceEffect = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await apiFetch(`/api/game-sessions/${sessionId}/lotr/resolve-alliance-effect`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Action failed" }));
        throw new Error(err.error || "Action failed");
      }
      const resp: LotrStateResponse = await res.json();
      setLotrState(resp.parsedState);
      setGameStatus(resp.gameStatus);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
      setTimeout(() => setError(""), 3000);
    }
  }, [sessionId]);

  return { lotrState, gameStatus, players, loading, error, isMyTurn, mySide, isManeuverPhase, isBonusPhase, isLandmarkPhase, isAlliancePhase, isAllianceEffectPhase, isPickDiscardPhase, isRemoveFortressPhase, isPlaceUnitPhase, takeCard, takeLandmark, resolveManeuver, resolveBonus, resolvePickDiscard, resolveRemoveFortress, resolvePlaceUnit, resolveLandmark, resolveAlliance, resolveAllianceEffect, setError };
}
