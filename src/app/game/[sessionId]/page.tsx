"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameSessionData, GameWsEvent } from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import TicTacToeBoard from "@/components/TicTacToeBoard";
import { useLotrGame } from "@/hooks/useLotrGame";
import LotrGameBoard from "@/components/lotr/LotrGameBoard";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params.sessionId);
  const { user, loading, isAuthenticated } = useAuth();

  const [sessionData, setSessionData] = useState<GameSessionData | null>(null);
  const [error, setError] = useState("");
  const [gameType, setGameType] = useState<string>("");

  // Also check if LOTR state loads successfully as fallback
  const username = user?.username || "";

  const lotr = useLotrGame(sessionId, sessionData?.roomId ?? 0, username);

  // If LOTR state loaded successfully, it's a LOTR game
  useEffect(() => {
    if (lotr.lotrState && !gameType) {
      setGameType("LOTR");
    }
  }, [lotr.lotrState]);

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
      await fetchSession();
      await connectWs();
    };
    init();
  }, [username, fetchSession, connectWs]);

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
        .catch(() => {});
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

  if (gameType === "LOTR" && lotr.lotrState) {
    const isLotrFinished = lotr.gameStatus === "FINISHED";
    return (
      <div className="min-h-screen bg-gray-950">
        {lotr.error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
            {lotr.error}
          </div>
        )}
        {isLotrFinished && (
          <div className="fixed top-4 right-4 z-50">
            <button onClick={handleBackToRoom}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
              Back to Room
            </button>
          </div>
        )}
        <LotrGameBoard
          state={lotr.lotrState}
          isMyTurn={lotr.isMyTurn}
          mySide={lotr.mySide as "FELLOWSHIP" | "SAURON" | undefined}
          gameStatus={lotr.gameStatus}
          players={lotr.players}
          onTakeCard={lotr.takeCard}
          onTakeLandmark={lotr.takeLandmark}
          isManeuverPhase={lotr.isManeuverPhase}
          pendingManeuvers={lotr.lotrState?.pendingManeuvers ?? []}
          onResolveManeuver={lotr.resolveManeuver}
          isPickDiscardPhase={lotr.isPickDiscardPhase}
          isRemoveFortressPhase={lotr.isRemoveFortressPhase}
          isPlaceUnitPhase={lotr.isPlaceUnitPhase}
          resolvePickDiscard={lotr.resolvePickDiscard}
          resolveRemoveFortress={lotr.resolveRemoveFortress}
          resolvePlaceUnit={lotr.resolvePlaceUnit}
          discardPile={lotr.lotrState?.discardPile ?? []}
          isLandmarkPhase={lotr.isLandmarkPhase}
          landmarkSubPhase={lotr.lotrState?.landmarkSubPhase ?? null}
          onResolveLandmark={lotr.resolveLandmark}
          isAlliancePhase={lotr.isAlliancePhase}
          allianceDrawnTokens={lotr.lotrState?.allianceDrawnTokens ?? []}
          allianceTriggerType={lotr.lotrState?.allianceTriggerType ?? null}
          allianceRace={lotr.lotrState?.allianceRace ?? null}
          onResolveAlliance={lotr.resolveAlliance}
          isAllianceEffectPhase={lotr.isAllianceEffectPhase}
          onResolveAllianceEffect={lotr.resolveAllianceEffect}
        />
      </div>
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
