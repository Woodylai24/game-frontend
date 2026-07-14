"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameSessionData, GameWsEvent } from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import TicTacToeBoard from "@/components/TicTacToeBoard";
import LotrGameView from "@/components/lotr/LotrGameView";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params.sessionId);
  const { user, loading, isAuthenticated } = useAuth();
  const { reconnectCount } = useConnectionStatus();

  const [sessionData, setSessionData] = useState<GameSessionData | null>(null);
  const [error, setError] = useState("");
  const [gameType, setGameType] = useState<string>("");

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
      // which triggers the subscription effects (useLotrGame + the page's own).
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
  const initialReconnectSeen = useRef(false);
  useEffect(() => {
    if (reconnectCount === 0) return;
    if (!initialReconnectSeen.current) {
      initialReconnectSeen.current = true;
      return;
    }
    fetchSession();
  }, [reconnectCount, fetchSession]);

  useEffect(() => {
    if (!sessionData) return;
    const unsub = webSocketService.subscribeToGameEvents(
      sessionData.roomId,
      (event: GameWsEvent) => { handleGameEvent(event); },
    );
    return unsub;
  }, [sessionData?.roomId]);

  useEffect(() => {
    if (sessionData?.roomCode) {
      apiFetch(`/api/rooms/code/${sessionData.roomCode}`)
        .then(r => r.json())
        .then(room => setGameType(room.gameType || ""))
        .catch(() => setError("Failed to load game"));
    }
  }, [sessionData?.roomCode]);

  const handleGameEvent = useCallback(
    (event: GameWsEvent) => {
      switch (event.event) {
        case "move":
          setSessionData((prev) =>
            prev ? { ...prev, board: event.board, currentPlayerOrder: event.currentPlayerOrder, currentTurn: event.currentTurn, gameStatus: event.gameStatus as GameSessionData["gameStatus"] } : prev,
          );
          break;
        case "game_ended":
          setSessionData((prev) =>
            prev ? { ...prev, gameStatus: event.gameStatus as GameSessionData["gameStatus"], winnerUsername: event.winnerUsername, ...(event.gameSession ? { players: event.gameSession.players } : {}) } : prev,
          );
          break;
        case "return_to_lobby":
          router.push(`/room/${sessionData?.roomCode}`);
          break;
      }
    },
    [sessionData?.roomCode, router],
  );

  const handleCellClick = (row: number, col: number) => {
    if (!sessionData) return;
    webSocketService.makeMove(sessionData.roomId, username, row, col);
  };

  const handleBackToRoom = () => {
    if (sessionData) router.push(`/room/${sessionData.roomCode}`);
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">Back to Home</button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // gameType is resolved from the room record (the effect at sessionData?.roomCode).
  // Until it arrives, hold on the loading screen so we don't flash the wrong game
  // board — the default branch below renders Tic-Tac-Toe, which is wrong for LOTR.
  if (!gameType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
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
        onBackToRoom={handleBackToRoom}
      />
    );
  }

  const isFinished = sessionData.gameStatus === "FINISHED";
  const isDraw = isFinished && sessionData.winnerUsername === null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">{isFinished ? "Game Over" : "Game in Progress"}</h1>
              <p className="text-sm text-gray-600">Session #{sessionId}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Playing as: {username}</span>
              <button onClick={handleBackToRoom} className="text-sm bg-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300">Back to Room</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {isFinished && (
            <div className="text-center mb-6">
              <div className="text-2xl font-bold">
                {isDraw ? <span className="text-yellow-600">Game Over — Draw!</span> : <span className="text-green-600">Game Over — {sessionData.winnerUsername} wins!</span>}
              </div>
            </div>
          )}
          <TicTacToeBoard board={sessionData.board} currentPlayerOrder={sessionData.currentPlayerOrder} players={sessionData.players} username={username} gameStatus={sessionData.gameStatus} winnerUsername={sessionData.winnerUsername} isDraw={isDraw} onCellClick={handleCellClick} />
        </div>
      </main>
    </div>
  );
}
