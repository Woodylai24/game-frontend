"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { GameRoom, Player, ChatMessage } from "@/types/game";
import { webSocketService } from "@/services/websocket";

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;
  const username = searchParams.get("username") || "";

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // WebSocket subscriptions cleanup functions
  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<
    (() => void)[]
  >([]);

  const connectAndJoinRoom = useCallback(
    async (roomPassword?: string) => {
      if (!username) {
        setError("Username is required");
        return;
      }

      try {
        // Connect to WebSocket if not already connected
        if (!webSocketService.isConnected()) {
          await webSocketService.connect(username);
        }
        setIsConnected(true);

        // Fetch room details first
        const response = await fetch(
          `http://localhost:8080/api/rooms/code/${roomCode}`,
        );
        if (!response.ok) {
          if (response.status === 404) {
            setError("Room not found");
          } else {
            setError("Failed to fetch room details");
          }
          return;
        }

        const roomData: GameRoom = await response.json();
        setRoom(roomData);

        // Check if room is private and password is needed
        if (roomData.isPrivate && !roomPassword) {
          setShowPasswordPrompt(true);
          return;
        }

        // Set up WebSocket subscriptions
        const unsubscribes: (() => void)[] = [];

        // Subscribe to room updates
        const unsubscribeRoomPlayers = webSocketService.subscribeToRoomPlayers(
          roomData.id,
          (updatedRoom) => {
            setRoom(updatedRoom);
          },
        );
        unsubscribes.push(unsubscribeRoomPlayers);

        // Subscribe to chat messages
        const unsubscribeChat = webSocketService.subscribeToRoomChat(
          roomData.id,
          (message) => {
            setChatMessages((prev) => [...prev, message]);
          },
        );
        unsubscribes.push(unsubscribeChat);

        // Subscribe to ready status updates
        const unsubscribeReady = webSocketService.subscribeToReadyStatus(
          roomData.id,
          (data) => {
            console.log("Ready status update:", data);
          },
        );
        unsubscribes.push(unsubscribeReady);

        // Subscribe to join response
        const unsubscribeJoinResponse =
          webSocketService.subscribeToUserJoinResponse(
            username,
            (response: unknown) => {
              const res = response as { success?: boolean; message?: string };
              if (res.success) {
                console.log("Successfully joined room");
              } else {
                setError(res.message || "Failed to join room");
              }
            },
          );
        unsubscribes.push(unsubscribeJoinResponse);

        setUnsubscribeFunctions(unsubscribes);

        // Join the room
        webSocketService.joinRoom(
          roomData.id,
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

  useEffect(() => {
    connectAndJoinRoom();

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      if (room) {
        webSocketService.leaveRoom(room.id, username);
      }
    };
  }, [connectAndJoinRoom]);

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
      webSocketService.leaveRoom(room.id, username);
    }
    window.location.href = "/";
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) return;
    setShowPasswordPrompt(false);
    connectAndJoinRoom(password);
  };

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Private Room</h1>
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
                onClick={() => (window.location.href = "/")}
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
            onClick={() => (window.location.href = "/")}
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
              <button
                onClick={handleLeaveRoom}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Area */}
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
                  {room.status}
                </span>
              </div>

              {room.status === "WAITING" ? (
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
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Game in Progress
                  </h3>
                  <p className="text-gray-600">
                    Game implementation will be added here
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
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
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isReady && (
                        <span className="text-green-600 text-sm">✓ Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
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
                          {msg.username}:
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
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
