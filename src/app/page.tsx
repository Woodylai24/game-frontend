"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { GameRoom, CreateRoomRequest } from "@/types/game";
import { useAuth } from "@/context/AuthContext";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";

interface RoomEvent {
  type: "ROOM_CREATED" | "ROOM_UPDATED" | "ROOM_STARTED" | "ROOM_DELETED";
  room: GameRoom;
}

export default function Home() {
  const { user, loading, logout, isAuthenticated, isGuest } = useAuth();
  const { status: wsStatus, reconnectCount } = useConnectionStatus();
  const wsConnected = wsStatus === "connected";
  const router = useRouter();
  // Read ?kicked=1 client-side (not useSearchParams — this is a static export;
  // useSearchParams bails to client rendering and complicates the build).
  const [kickedNotice, setKickedNotice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kicked") === "1") {
      setKickedNotice(true);
      // Strip the param so the notice doesn't persist across manual refreshes.
      window.history.replaceState({}, "", "/");
    }
  }, []);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [myRooms, setMyRooms] = useState<GameRoom[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRooms();
      fetchMyRooms();
      if (!webSocketService.isConnected()) {
        const token = localStorage.getItem("token");
        if (token) {
          webSocketService.connect(token).then(() => {
            webSocketService.setUsername(user.username);
          }).catch(console.error);
        }
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRooms();
    fetchMyRooms();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !wsConnected) return;

    const unsubscribe = webSocketService.subscribe<RoomEvent>(
      "/topic/rooms",
      (event) => {
        if (event.type === "ROOM_CREATED") {
          // Private rooms never appear in the public grid. Defense-in-depth:
          // the backend no longer broadcasts private rooms to /topic/rooms,
          // but skip them here too in case of a regression.
          if (!event.room.isPrivate) {
            setRooms((prev) => [event.room, ...prev]);
          }
          // Host always sees their own room in "Your Rooms"
          if (event.room.hostUsername === user?.username) {
            setMyRooms((prev) => [event.room, ...prev]);
          }
        } else if (event.type === "ROOM_UPDATED" || event.type === "ROOM_STARTED") {
          setRooms((prev) =>
            prev.map((r) => (r.roomCode === event.room.roomCode ? event.room : r)),
          );
          setMyRooms((prev) =>
            prev.map((r) => (r.roomCode === event.room.roomCode ? event.room : r)),
          );
        } else if (event.type === "ROOM_DELETED") {
          setRooms((prev) => prev.filter((r) => r.roomCode !== event.room.roomCode));
          setMyRooms((prev) => prev.filter((r) => r.roomCode !== event.room.roomCode));
        }
      },
    );

    return () => unsubscribe();
  }, [isAuthenticated, wsConnected]);

  // Re-fetch room lists after a WS reconnect (skips the initial connect). Room
  // events broadcast during the outage are lost, so we re-pull to resync.
  const initialReconnectSeen = useRef(false);
  useEffect(() => {
    if (reconnectCount === 0) return;
    if (!initialReconnectSeen.current) {
      initialReconnectSeen.current = true;
      return;
    }
    if (isAuthenticated) {
      fetchRooms();
      fetchMyRooms();
    }
  }, [reconnectCount, isAuthenticated]);

  const fetchRooms = async () => {
    try {
      const response = await apiFetch("/api/rooms");
      if (response.ok) {
        const roomsData = await response.json();
        setRooms(roomsData);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const response = await apiFetch("/api/rooms/my");
      if (response.ok) {
        const roomsData = await response.json();
        setMyRooms(roomsData);
      }
    } catch (error) {
      console.error("Failed to fetch my rooms:", error);
    }
  };

  const handleLogout = () => {
    webSocketService.disconnect();
    logout();
  };

  const handleJoinRoom = (roomCode: string) => {
    if (!roomCode.trim()) return;
    router.push(`/room/${roomCode}`);
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getRoomActionButton = (room: GameRoom) => {
    if (room.status === "IN_PROGRESS" && room.activeGameSessionId) {
      return (
        <button
          onClick={() => router.push(`/game/${room.activeGameSessionId}`)}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 text-sm"
        >
          Enter Game
        </button>
      );
    }
    if (room.status === "FINISHED" && room.activeGameSessionId) {
      return (
        <button
          onClick={() => router.push(`/game/${room.activeGameSessionId}`)}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 text-sm"
        >
          View Result
        </button>
      );
    }
    return (
      <button
        onClick={() => handleJoinRoom(room.roomCode)}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 text-sm"
      >
        Enter Room
      </button>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      WAITING: "bg-yellow-900/30 text-yellow-300",
      IN_PROGRESS: "bg-green-900/30 text-green-300",
      FINISHED: "bg-gray-800 text-gray-300",
      PAUSED: "bg-blue-900/30 text-blue-300",
      CANCELLED: "bg-red-900/30 text-red-300",
    };
    return styles[status] || "bg-gray-800 text-gray-300";
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center" title="Board Game Zone">
              <Image
                src="/bgz.png"
                alt="Board Game Zone"
                width={40}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                Welcome, {user.username}
              </span>
              {isGuest && (
                <span className="text-xs bg-amber-900/30 text-amber-300 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              )}
              <Link
                href="/settings"
                className="text-gray-400 hover:text-gray-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {kickedNotice && (
        <div className="bg-red-900/30 border-b border-red-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm text-red-300 text-center">
            You were removed from the room.
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Your Rooms</h2>
            <button
              onClick={fetchMyRooms}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRooms.length === 0 ? (
              <div className="col-span-full text-center py-6 text-gray-400 bg-gray-900 rounded-lg border border-gray-800">
                You&apos;re not in any rooms
              </div>
            ) : (
              <AnimatePresence>
                {myRooms.map((room, index) => (
                  <motion.div
                    key={room.roomCode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                    transition={{ duration: 0.3 }}
                    className="bg-gray-900 p-4 rounded-lg border border-gray-800"
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{room.roomName}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(room.status)}`}>
                      {room.status === "WAITING" ? "Waiting" : room.status === "IN_PROGRESS" ? "In Progress" : room.status === "FINISHED" ? "Finished" : room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Game: {room.gameType}{room.isPrivate && <span className="ml-1 text-xs">🔒</span>}
                  </p>
                  <p className="text-sm text-gray-400 mb-3">
                    Players: {room.currentPlayers}/{room.maxPlayers}
                  </p>
                  {getRoomActionButton(room)}
                  </motion.div>
                ))
              }
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Available Rooms</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Create Room
              </button>
              <button
                onClick={fetchRooms}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                placeholder="Enter room code to join"
                className="flex-1 px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleJoinRoom(joinRoomCode)}
                disabled={!joinRoomCode.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-700"
              >
                Join Room
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-400">
                No rooms available. Create one to get started!
              </div>
            ) : (
              <AnimatePresence>
                {rooms.map((room, index) => (
                  <motion.div
                    key={room.roomCode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                    transition={{ duration: 0.3 }}
                    className="bg-gray-900 p-4 rounded-lg border border-gray-800"
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{room.roomName}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        room.status === "WAITING"
                          ? "bg-green-900/30 text-green-300"
                          : "bg-yellow-900/30 text-yellow-300"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Game: {room.gameType}{room.isPrivate && <span className="ml-1 text-xs">🔒</span>}
                  </p>
                  <p className="text-sm text-gray-400 mb-2">
                    Players: {room.currentPlayers}/{room.maxPlayers}
                  </p>
                  <p className="text-sm text-gray-400 mb-3">
                    Host: {room.hostUsername}
                  </p>
                  <button
                    onClick={() => handleJoinRoom(room.roomCode)}
                    disabled={
                      room.currentPlayers >= room.maxPlayers ||
                      room.status !== "WAITING"
                    }
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
                  >
                    {room.currentPlayers >= room.maxPlayers ? "Full" : "Join"}
                  </button>
                  </motion.div>
                ))
              }
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={(roomCode) => {
            setShowCreateRoom(false);
            handleJoinRoom(roomCode);
          }}
        />
      )}
    </div>
  );
}

function CreateRoomModal({
  onClose,
  onRoomCreated,
}: {
  onClose: () => void;
  onRoomCreated: (roomCode: string) => void;
}) {
  const [roomName, setRoomName] = useState("");
  // LOTR is the production default; TTT is dev-only.
  const [gameType, setGameType] = useState("LOTR");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleGameTypeChange = (newGameType: string) => {
    setGameType(newGameType);
    if (newGameType === "TicTacToe" || newGameType === "LOTR") {
      setMaxPlayers(2);
    }
  };

  const maxPlayersLocked = gameType === "TicTacToe" || gameType === "LOTR";

  const handleCreateRoom = async () => {
    if (roomName.trim().length < 3) return;

    setIsCreating(true);
    try {
      const request: CreateRoomRequest = {
        roomName: roomName.trim(),
        gameType,
        maxPlayers,
        isPrivate,
        password: isPrivate ? password : undefined,
      };

      const response = await apiFetch("/api/rooms", {
        method: "POST",
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const room: GameRoom = await response.json();
        onRoomCreated(room.roomCode);
      } else {
        alert("Failed to create room");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 w-full max-w-md">
        <h2 className="text-lg font-medium mb-4">Create New Room</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Game Type
            </label>
            <select
              value={gameType}
              onChange={(e) => handleGameTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Tic-Tac-Toe is dev-only — hidden from production builds. */}
              {process.env.NODE_ENV !== "production" && (
                <option value="TicTacToe">Tic Tac Toe</option>
              )}
              <option value="LOTR">The Lord of the Rings: Duel for Middle-earth</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Max Players
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={maxPlayersLocked}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={6}>6 Players</option>
              <option value={8}>8 Players</option>
            </select>
            {maxPlayersLocked && (
              <p className="text-xs text-gray-400 mt-1">
                This game requires exactly 2 players
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mr-2"
            />
            <label
              htmlFor="private"
              className="text-sm font-medium text-gray-200"
            >
              Private Room
            </label>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={roomName.trim().length < 3 || isCreating}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-700"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
