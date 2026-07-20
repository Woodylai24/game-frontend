"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  GameRoom,
  ChatMessage,
  GameWsEvent,
} from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import { loadChatMessages, saveChatMessage } from "@/lib/chatStorage";

export default function RoomPageClient() {
  const router = useRouter();
  // Static export caveat: useParams() returns the placeholder value ("_")
  // baked into the prerendered HTML, not the real URL segment (a known,
  // long-standing Next.js limitation with output: 'export'). Read the path
  // directly and parse it instead. Path looks like "/room/<code>/".
  const pathname = usePathname();
  const roomCode = decodeURIComponent(pathname.split("/")[2] || "");
  const { user, loading, isAuthenticated, isGuest } = useAuth();
  const { reconnectCount } = useConnectionStatus();

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
        // Holds every subscription created during this join attempt. The
        // join-response subscription is added immediately; room-scoped
        // subscriptions are added once join succeeds. All are registered with
        // setUnsubscribeFunctions so the effect cleanup un-subscribes them on unmount.
        const unsubscribes: (() => void)[] = [];

        // Subscribe to the join-response topic first, THEN send the join.
        // The backend's StompAuthInterceptor rejects room-scoped subscriptions
        // from non-members, so we must wait for join confirmation before
        // subscribing to /topic/room/{roomId}/* topics.
        unsubscribes.push(
          webSocketService.subscribeToUserJoinResponse(
            username,
            (joinRes: unknown) => {
              const res = joinRes as { success?: boolean; message?: string; error?: string; room?: GameRoom };
              if (!res.success) {
                // Join failed (e.g., wrong password) — clean up and surface error
                unsubscribes.forEach((fn) => fn());
                setError(res.error || res.message || "Failed to join room");
                return;
              }

              setHasJoined(true);
              setRoom(res.room || roomData);
              // Load persisted chat messages
              setChatMessages(loadChatMessages(roomId));

              // Now that membership is confirmed, subscribe to room topics.
              // @SubscribeMapping returns the current room roster immediately.
              unsubscribes.push(
                webSocketService.subscribeToRoomPlayers(roomId, (updatedRoom) => {
                  setRoom(updatedRoom);
                }),
              );
              unsubscribes.push(
                webSocketService.subscribeToRoomChat(roomId, (message) => {
                  setChatMessages((prev) => [...prev, message]);
                  saveChatMessage(roomId, message);
                }),
              );
              unsubscribes.push(
                webSocketService.subscribeToReadyStatus(roomId, (data) => {
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
                }),
              );
              unsubscribes.push(
                webSocketService.subscribeToGameEvents(roomId, (event) => {
                  handleGameEvent(event);
                }),
              );

              setUnsubscribeFunctions([...unsubscribes]);
            },
          ),
        );

        // Send join with password
        webSocketService.joinRoom(roomId, roomCode, username, roomPassword);
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

  // Re-sync room state after a WS reconnect (skips the initial connect —
  // connectAndJoinRoom already fetched). The subscriptions auto-replay via
  // the websocket.ts registry (join-response + room topics), so we don't
  // re-join; we just re-pull state to
  // catch anything broadcast during the outage. If the room was deleted while
  // we were disconnected, redirect home with a message.
  const initialReconnectSeen = useRef(false);
  useEffect(() => {
    if (reconnectCount === 0) return;
    if (!initialReconnectSeen.current) {
      initialReconnectSeen.current = true;
      return;
    }
    if (!hasJoined || intentionalLeave) return;

    apiFetch(`/api/rooms/code/${roomCode}`)
      .then((response) => {
        if (response.status === 404) {
          router.push("/?error=" + encodeURIComponent("The room no longer exists"));
          return;
        }
        if (response.ok) {
          return response.json().then((data: GameRoom) => setRoom(data));
        }
      })
      .catch(() => {});
  }, [reconnectCount, roomCode, hasJoined, intentionalLeave, router]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            Private Room
          </h1>
          <p className="text-gray-400 text-center mb-4">
            This room requires a password to join.
          </p>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => router.push("/")}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-700"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find((p) => p.username === username);
  const isHost = room.hostUsername === username;
  const allPlayersReady =
    room.players.length >= 2 && room.players.every((p) => p.isReady);
  const isGameFinished = room.gameFinished === true;
  // Leave should be blocked only while a game is IN_PROGRESS. After the game
  // finishes, the room returns to WAITING and players should be able to leave
  // (the Leave button was wrongly disabled because gameFinished was folded in).
  const isGameActive = room.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center shrink-0" title="Board Game Zone">
                <Image
                  src="/bgz.png"
                  alt="Board Game Zone"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{room.roomName}</h1>
                <p className="text-sm text-gray-400">
                  Room Code: {room.roomCode}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                Playing as: {username}
              </span>
              {isGuest && (
                <span className="text-xs bg-amber-900/30 text-amber-300 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              )}
              <button
                onClick={handleLeaveRoom}
                disabled={isGameActive}
                className={`text-sm ${
                  isGameActive
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-red-400 hover:text-red-300"
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
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Game: {room.gameType}</h2>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    room.status === "WAITING"
                      ? "bg-yellow-900/30 text-yellow-300"
                      : room.status === "IN_PROGRESS"
                        ? "bg-green-900/30 text-green-300"
                        : "bg-gray-800 text-gray-300"
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
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6 text-center">
                    <h3 className="text-lg font-medium text-blue-300 mb-2">Game Finished!</h3>
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
                    <h3 className="text-lg font-medium text-gray-100 mb-2">
                      Waiting for players...
                    </h3>
                    <p className="text-gray-400">
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
                      <p className="text-sm text-gray-400">
                        All players must be ready before you can start the game
                      </p>
                    )}
                  </div>
                </div>
                </>
              ) : room.status === "IN_PROGRESS" ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-green-400 mb-2">
                      Game in Progress
                    </h3>
                    <p className="text-gray-400">
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
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
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
                        <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                          Host
                        </span>
                      )}
                      {isGameActive && room.gameType === "TicTacToe" && (
                        <span
                          className={`text-xs font-bold ${player.playerOrder === 0 ? "text-blue-400" : "text-red-400"}`}
                        >
                          {player.playerOrder === 0 ? "X" : "O"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isReady && (
                        <span className="text-green-400 text-sm">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h3 className="text-lg font-medium mb-4">Chat</h3>
              <div className="space-y-4">
                <div className="h-64 overflow-y-auto border border-gray-700 rounded p-3 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-400 text-sm">No messages yet...</p>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-blue-400">
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
                    className="flex-1 px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-700"
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
