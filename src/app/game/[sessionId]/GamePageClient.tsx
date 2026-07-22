"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GameSessionData } from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import LotrGameView from "@/components/lotr/LotrGameView";
import TicTacToeGameView from "@/components/TicTacToeGameView";

export default function GamePageClient() {
  const router = useRouter();
  // Static export caveat: useParams() returns the placeholder value ("_")
  // baked into the prerendered HTML, not the real URL segment (a known,
  // long-standing Next.js limitation with output: 'export'). Read the path
  // directly and parse it instead. Path looks like "/game/<code>/".
  // sessionId is the random session code (string) — never coerce with Number().
  const pathname = usePathname();
  const sessionId = pathname.split("/")[2];
  const { user, loading, isAuthenticated } = useAuth();
  const { reconnectCount } = useConnectionStatus();

  const [sessionData, setSessionData] = useState<GameSessionData | null>(null);
  const [error, setError] = useState("");

  // Latest roomId/roomCode from sessionData, kept in a ref so the reconnect
  // effect below can read them without depending on sessionData (which would
  // re-trigger the effect every time fetchSession updates sessionData — an
  // infinite loop, since the effect itself calls fetchSession). Only
  // reconnectCount should drive that effect's re-execution.
  const sessionRoomRef = useRef<{ roomId: number; roomCode: string } | null>(null);
  useEffect(() => {
    if (sessionData) {
      sessionRoomRef.current = { roomId: sessionData.roomId, roomCode: sessionData.roomCode };
    } else {
      sessionRoomRef.current = null;
    }
  }, [sessionData]);

  const username = user?.username || "";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const fetchSession = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/game-sessions/${sessionId}`);
      if (response.status === 403) {
        setError("You are not a player in this game");
        return;
      }
      if (response.status === 404) {
        setError("Game session not found");
        return;
      }
      if (!response.ok) {
        setError("Failed to load game session");
        return;
      }
      const data: GameSessionData = await response.json();
      setSessionData(data);
    } catch {
      setError("Failed to load game session");
    }
  }, [sessionId]);

  const connectWs = useCallback(async () => {
    if (!username) return;
    if (!webSocketService.isConnected()) {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        return;
      }
      await webSocketService.connect(token);
      webSocketService.setUsername(username);
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const init = async () => {
      // Connect WS BEFORE fetching session. fetchSession() sets sessionData,
      // which triggers the subscription effects (useLotrGame + the TTT hook).
      // If connect runs after, those effects fire while disconnected. The
      // subscription registry in websocket.ts now queues them regardless, but
      // connect-first is the correct, intent-revealing order.
      await connectWs();
      await fetchSession();
    };
    init();
  }, [username, fetchSession, connectWs]);

  // Re-sync session state after a WS reconnect (skips the initial connect —
  // the mount effect above already fetched). Messages broadcast during the
  // outage are lost (in-memory broker), so we re-pull to get the latest state.
  //
  // Defensive re-join: we re-send /app/room/{roomId}/join before fetchSession.
  // With the Player.DISCONNECTED status removed (#21 cleanup), this is no
  // longer load-bearing — the player stays ACTIVE across a WS drop, so
  // /lotr/state won't 403. But the re-join is harmless (backend idempotently
  // reactivates an already-ACTIVE player) and keeps the flow robust against
  // any future membership-state change. sessionData carries both roomId and
  // roomCode (set by the initial fetchSession).
  //
  // IMPORTANT: this effect's deps are reconnectCount + identity inputs only.
  // sessionData must NOT be a dep — the effect calls fetchSession (which
  // setSessionData's), so depending on sessionData creates an infinite loop
  // (reconnect -> joinRoom -> broadcast -> fetchSession -> setSessionData ->
  // effect re-fires -> joinRoom again -> ...). Read roomId/roomCode via ref.
  const initialReconnectSeen = useRef(false);
  useEffect(() => {
    if (reconnectCount === 0) return;
    if (!initialReconnectSeen.current) {
      initialReconnectSeen.current = true;
      return;
    }
    const sessionRoom = sessionRoomRef.current;
    if (sessionRoom) {
      webSocketService.joinRoom(sessionRoom.roomId, sessionRoom.roomCode, username);
    }
    fetchSession();
  }, [reconnectCount, fetchSession, username]);

  // gameType comes from the session itself (an immutable snapshot taken at
  // createSession time), NOT from the room. The host can switch the room's
  // game after this session finishes; reading room.gameType would render the
  // finished session under the wrong view and crash.
  const gameType = sessionData?.gameType ?? "";

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">Back to Home</button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // gameType is resolved from the room record (the effect at sessionData?.roomCode).
  // Until it arrives, hold on the loading screen so we don't flash the wrong game
  // board before we know which view to render.
  if (!gameType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameType === "LOTR") {
    return (
      <LotrGameView
        sessionId={sessionId}
        roomId={sessionData.roomId}
        username={username}
        onBackToRoom={() => router.push(`/room/${sessionData.roomCode}`)}
      />
    );
  }

  // Default: Tic-Tac-Toe (dev only — hidden from the prod build and rejected
  // server-side under the prod profile).
  return (
    <TicTacToeGameView session={sessionData} username={username} />
  );
}
