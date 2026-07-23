"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GameSessionData, GameWsEvent, Player } from "@/types/game";
import { TicTacToeState, PlayerSymbolInfo } from "@/types/tictactoe";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";

/**
 * Tic-Tac-Toe game hook.
 *
 * Unlike LOTR (which uses REST for moves), TTT is entirely WebSocket-driven:
 * moves go out via `makeMove`, and state comes back via the game-event
 * subscription. This hook owns the WS subscription, the move dispatch, and the
 * session state that's specific to the TTT screen.
 *
 * The session page still owns the initial REST fetch (`GET /api/game-sessions`)
 * and WS connect — those are session-level concerns shared by all games. This
 * hook takes the already-fetched session + roomCode and handles everything from
 * there.
 *
 * Player→symbol mapping: TTT convention is playerOrder 0 = "X", 1 = "O". The
 * players list comes from the room record (not the session DTO, which is now
 * generic). We fetch it once on mount.
 */
export function useTicTacToeGame(session: GameSessionData, username: string) {
  const router = useRouter();
  const [currentSession, setCurrentSession] = useState<GameSessionData>(session);
  const [players, setPlayers] = useState<PlayerSymbolInfo[]>([]);
  const [currentPlayerOrder, setCurrentPlayerOrder] = useState(0);
  const [error, setError] = useState("");

  // Fetch the room's player list to map usernames to X/O symbols. The session
  // DTO no longer carries PlayerSymbolInfo (that was TTT leakage), so we pull
  // from the room record where players live generically.
  useEffect(() => {
    apiFetch(`/api/rooms/code/${session.roomCode}`)
      .then((r) => r.json())
      .then((room) => {
        const activePlayers: Player[] = room.players ?? [];
        const sorted = [...activePlayers].sort((a, b) => a.playerOrder - b.playerOrder);
        setPlayers(
          sorted.map((p) => ({
            username: p.username,
            symbol: (p.playerOrder === 0 ? "X" : "O") as "X" | "O",
          })),
        );
      })
      .catch(() => setError("Failed to load game"));
  }, [session.roomCode]);

  // Subscribe to game events for this room. The session-level WS connect
  // (in the page) has already run by the time this hook mounts.
  useEffect(() => {
    const unsub = webSocketService.subscribeToGameEvents(
      currentSession.roomCode,
      (event: GameWsEvent) => { handleGameEvent(event); },
    );
    return unsub;
  }, [currentSession.roomCode]);

  const handleGameEvent = useCallback(
    (event: GameWsEvent) => {
      switch (event.event) {
        case "move":
          setCurrentSession((prev) =>
            prev ? { ...prev, ...event.gameSession } : prev,
          );
          // The backend tracks currentPlayerOrder on the entity; the WS event's
          // gameSession DTO no longer carries it. We derive the next order locally:
          // TTT alternates between 0 and 1.
          setCurrentPlayerOrder((prev) => (prev + 1) % 2);
          break;
        case "game_ended":
          setCurrentSession((prev) =>
            prev
              ? {
                  ...prev,
                  ...event.gameSession,
                  gameStatus: event.gameStatus as GameSessionData["gameStatus"],
                  winnerUsername: event.winnerUsername,
                }
              : prev,
          );
          break;
        case "return_to_lobby":
          router.push(`/room/${currentSession.roomCode}`);
          break;
      }
    },
    [currentSession.roomCode, router],
  );

  const makeMove = useCallback(
    (row: number, col: number) => {
      webSocketService.makeMove(currentSession.roomCode, username, row, col);
    },
    [currentSession.roomCode, username],
  );

  const backToRoom = useCallback(() => {
    router.push(`/room/${currentSession.roomCode}`);
  }, [currentSession.roomCode, router]);

  // Parse the gameState JSON into a typed TTT state.
  const ttState: TicTacToeState = (() => {
    try {
      const parsed = JSON.parse(currentSession.gameState);
      return {
        board: parsed.board ?? [[null, null, null], [null, null, null], [null, null, null]],
        moves: parsed.moves ?? [],
      };
    } catch {
      return { board: [[null, null, null], [null, null, null], [null, null, null]], moves: [] };
    }
  })();

  return {
    session: currentSession,
    ttState,
    players,
    currentPlayerOrder,
    username,
    error,
    setError,
    makeMove,
    backToRoom,
  };
}
