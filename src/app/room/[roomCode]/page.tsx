"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GameRoom,
  ChatMessage,
  GameWsEvent,
} from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import { loadChatMessages, saveChatMessage } from "@/lib/chatStorage";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const { user, loading, isAuthenticated, isGuest } = useAuth();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<
    (() => void)[]
  >([]);
  const [intentionalLeave, setIntentionalLeave] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  // Ref guard: prevents double join during React Strict Mode's synchronous
  // mount→unmount→remount cycle (setHasJoined is async, arrives too late)
  const joinInitiatedRef = useRef(false);

  const username = user?.username || "";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const connectAndJoinRoom = useCallback(
    async (roomPassword?: string) => {
      if (!username) {
        setError("Not authenticated");
        return;
      }

      try {
        if (!webSocketService.isConnected()) {
          const token = localStorage.getItem("token");
          if (!token) {
            setError("Not authenticated");
            return;
          }
          await Promise.race([
            webSocketService.connect(token),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000)),
          ]);
          webSocketService.setUsername(username);
        }

        const response = await apiFetch(`/api/rooms/code/${roomCode}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Room not found");
          } else {
            setError("Failed to fetch room details");
          }
          return;
        }

        const roomData: GameRoom = await response.json();

        // Check if user is already a player in this room (e.g., room creator)
        const isAlreadyPlayer = roomData.players.some((p) => p.username === username);

        if (roomData.isPrivate && !roomPassword && !isAlreadyPlayer) {
          setRoom(roomData); // Show room name for password prompt
          setShowPasswordPrompt(true);
          return;
        }

        const roomId = roomData.id;
        const unsubscribes: (() => void)[] = [];

        // Subscribe to all room topics upfront
        // subscribeToRoomPlayers uses @SubscribeMapping which returns initial room data,
        // but we only set room state after join confirmation
        let joinConfirmed = false;
        let pendingRoomData: GameRoom | null = null;

        const unsubscribeRoomPlayers = webSocketService.subscribeToRoomPlayers(
          roomId,
          (updatedRoom) => {
            // Only show room data after join is confirmed
            if (joinConfirmed) {
              setRoom(updatedRoom);
            } else {
              pendingRoomData = updatedRoom;
            }
          },
        );
        unsubscribes.push(unsubscribeRoomPlayers);

        const unsubscribeChat = webSocketService.subscribeToRoomChat(
          roomId,
          (message) => {
            setChatMessages((prev) => [...prev, message]);
            saveChatMessage(roomId, message);
          },
        );
        unsubscribes.push(unsubscribeChat);

        const unsubscribeReady = webSocketService.subscribeToReadyStatus(
          roomId,
          (data) => {
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    players: prev.players.map((p) =>
                      p.username === data.username
                        ? { ...p, isReady: data.ready }
                        : p,
                    ),
                  }
                : prev,
            );
          },
        );
        unsubscribes.push(unsubscribeReady);

        const unsubscribeGameEvents =
          webSocketService.subscribeToGameEvents(roomId, (event) => {
            handleGameEvent(event);
          });
        unsubscribes.push(unsubscribeGameEvents);

        const unsubscribeJoinResponse =
          webSocketService.subscribeToUserJoinResponse(
            username,
            (joinRes: unknown) => {
              const res = joinRes as { success?: boolean; message?: string; error?: string; room?: GameRoom };
              if (res.success) {
                joinConfirmed = true;
                setHasJoined(true);
                // Use room from join response, or the pending data from @SubscribeMapping
                setRoom(res.room || pendingRoomData || roomData);
                // Load persisted chat messages
                setChatMessages(loadChatMessages(roomId));
                setUnsubscribeFunctions(unsubscribes);
              } else {
                // Join failed (e.g., wrong password) — clean up subscriptions
                unsubscribes.forEach((fn) => fn());
                setError(res.error || res.message || "Failed to join room");
              }
            },
          );
        unsubscribes.push(unsubscribeJoinResponse);

        // Send join with password
        webSocketService.joinRoom(
          roomId,
          roomCode,
          username,
          roomPassword,
        );
      } catch (error) {
        console.error("Failed to connect and join room:", error);
        setError("Failed to connect to room");
      }
    },
    [roomCode, username],
  );

  const handleGameEvent = useCallback(
    (event: GameWsEvent) => {
      switch (event.event) {
        case "game_started":
          if (event.gameSession?.id) {
            router.push(`/game/${event.gameSession.id}`);
          }
          break;
        case "game_ended":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  ...prev,
                  gameFinished: true,
                  activeGameSessionId: event.gameSession?.id ?? prev.activeGameSessionId,
                }
              : prev,
          );
          break;
        case "return_to_lobby":
          setRoom(event.room);
          break;
      }
    },
    [router],
  );

  useEffect(() => {
    if (username && !intentionalLeave && !hasJoined && !joinInitiatedRef.current) {
      joinInitiatedRef.current = true;
      connectAndJoinRoom();
    }

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [connectAndJoinRoom, intentionalLeave, hasJoined]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !room) return;

    webSocketService.sendChatMessage(room.id, username, newMessage.trim());
    setNewMessage("");
  };

  const handleToggleReady = () => {
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.username === username);
    const newReadyState = !currentPlayer?.isReady;

    webSocketService.toggleReady(room.id, username, newReadyState);
  };

  const handleStartGame = () => {
    if (!room) return;

    webSocketService.startGame(room.id, username);
  };

  const handleLeaveRoom = () => {
    if (room) {
      setIntentionalLeave(true);
      setHasJoined(false);
      joinInitiatedRef.current = false;
      webSocketService.leaveRoom(room.id, username);
    }
    router.push("/");
  };

  const handleReturnToLobby = () => {
    if (!room) return;
    webSocketService.returnToLobby(room.id, username);
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) return;
    setShowPasswordPrompt(false);
    connectAndJoinRoom(password);
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            Private Room
          </h1>
          <p className="text-gray-600 text-center mb-4">
            This room requires a password to join.
          </p>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => router.push("/")}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find((p) => p.username === username);
  const isHost = room.hostUsername === username;
  const allPlayersReady =
    room.players.length >= 2 && room.players.every((p) => p.isReady);
  const isGameFinished = room.gameFinished === true;
  const isGameActive = room.status === "IN_PROGRESS" || isGameFinished;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">{room.roomName}</h1>
              <p className="text-sm text-gray-600">
                Room Code: {room.roomCode}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Playing as: {username}
              </span>
              {isGuest && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              )}
              <button
                onClick={handleLeaveRoom}
                disabled={isGameActive}
                className={`text-sm ${
                  isGameActive
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-red-600 hover:text-red-800"
                }`}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Game: {room.gameType}</h2>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    room.status === "WAITING"
                      ? "bg-yellow-100 text-yellow-800"
                      : room.status === "IN_PROGRESS"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {room.status === "WAITING"
                    ? "Waiting"
                    : room.status === "IN_PROGRESS"
                      ? "In Progress"
                      : isGameFinished
                        ? "Finished"
                        : room.status}
                </span>
              </div>

              {room.status === "WAITING" ? (
                <>
                {isGameFinished && room.activeGameSessionId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Game Finished!</h3>
                    <button
                      onClick={() => router.push(`/game/${room.activeGameSessionId}`)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
                    >
                      View Result
                    </button>
                  </div>
                )}
                <div className="text-center py-12">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Waiting for players...
                    </h3>
                    <p className="text-gray-600">
                      {room.players.length} of {room.maxPlayers} players joined
                    </p>
                  </div>

                  <div className="space-y-4">
                    {currentPlayer && (
                      <button
                        onClick={handleToggleReady}
                        className={`px-6 py-2 rounded-md font-medium ${
                          currentPlayer.isReady
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {currentPlayer.isReady ? "Ready ✓" : "Mark as Ready"}
                      </button>
                    )}

                    {isHost && allPlayersReady && (
                      <div>
                        <button
                          onClick={handleStartGame}
                          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
                        >
                          Start Game
                        </button>
                      </div>
                    )}

                    {isHost && !allPlayersReady && (
                      <p className="text-sm text-gray-500">
                        All players must be ready before you can start the game
                      </p>
                    )}
                  </div>
                </div>
                </>
              ) : room.status === "IN_PROGRESS" ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-green-700 mb-2">
                      Game in Progress
                    </h3>
                    <p className="text-gray-600">
                      The game has started! Click below to enter the game.
                    </p>
                  </div>
                  {room.activeGameSessionId && (
                    <button
                      onClick={() =>
                        router.push(`/game/${room.activeGameSessionId}`)
                      }
                      className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
                    >
                      Enter Game
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">
                Players ({room.players.length}/{room.maxPlayers})
              </h3>
              <div className="space-y-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          player.status === "ACTIVE"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                      <span className="font-medium">{player.displayName}</span>
                      {player.username === room.hostUsername && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Host
                        </span>
                      )}
                      {isGameActive && (
                        <span
                          className={`text-xs font-bold ${player.playerOrder === 0 ? "text-blue-600" : "text-red-600"}`}
                        >
                          {player.playerOrder === 0 ? "X" : "O"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isReady && (
                        <span className="text-green-600 text-sm">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Chat</h3>
              <div className="space-y-4">
                <div className="h-64 overflow-y-auto border border-gray-200 rounded p-3 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-500 text-sm">No messages yet...</p>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-blue-600">
                          {msg.username === username ? "You:" : `${msg.username}:`}
                        </span>
                        <span className="ml-2">{msg.message}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
