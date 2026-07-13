"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [myRooms, setMyRooms] = useState<GameRoom[]>([]);
  const [showPrivate, setShowPrivate] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('showPrivate') === 'true';
    return false;
  });
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
  }, [isAuthenticated, user, showPrivate]);

  useEffect(() => {
    if (!isAuthenticated || !wsConnected) return;

    const unsubscribe = webSocketService.subscribe<RoomEvent>(
      "/topic/rooms",
      (event) => {
        if (event.type === "ROOM_CREATED") {
          setRooms((prev) => [event.room, ...prev]);
          // Only add to myRooms if user is the host
          if (event.room.hostUsername === user?.username) {
            setMyRooms((prev) => [event.room, ...prev]);
          }
        } else if (event.type === "ROOM_UPDATED" || event.type === "ROOM_STARTED") {
          setRooms((prev) =>
            prev.map((r) => (r.id === event.room.id ? event.room : r)),
          );
          setMyRooms((prev) =>
            prev.map((r) => (r.id === event.room.id ? event.room : r)),
          );
        } else if (event.type === "ROOM_DELETED") {
          setRooms((prev) => prev.filter((r) => r.id !== event.room.id));
          setMyRooms((prev) => prev.filter((r) => r.id !== event.room.id));
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
      const query = showPrivate ? "?includePrivate=true" : "";
      const response = await apiFetch("/api/rooms" + query);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      WAITING: "bg-yellow-100 text-yellow-800",
      IN_PROGRESS: "bg-green-100 text-green-800",
      FINISHED: "bg-gray-100 text-gray-800",
      PAUSED: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Game Stack</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.username}
              </span>
              {isGuest && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              )}
              <Link
                href="/settings"
                className="text-gray-500 hover:text-gray-700"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Your Rooms</h2>
            <button
              onClick={fetchMyRooms}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRooms.length === 0 ? (
              <div className="col-span-full text-center py-6 text-gray-500 bg-white rounded-lg shadow border">
                You&apos;re not in any rooms
              </div>
            ) : (
              <AnimatePresence>
                {myRooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                    transition={{ duration: 0.3 }}
                    className="bg-white p-4 rounded-lg shadow border"
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{room.roomName}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(room.status)}`}>
                      {room.status === "WAITING" ? "Waiting" : room.status === "IN_PROGRESS" ? "In Progress" : room.status === "FINISHED" ? "Finished" : room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Game: {room.gameType}{room.isPrivate && <span className="ml-1 text-xs">🔒</span>}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
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
              <label className="flex items-center space-x-1 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPrivate}
                  onChange={(e) => {
                    const val = e.target.checked;
                    localStorage.setItem('showPrivate', String(val));
                    setShowPrivate(val);
                  }}
                  className="rounded"
                />
                <span>Show private rooms</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                placeholder="Enter room code to join"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleJoinRoom(joinRoomCode)}
                disabled={!joinRoomCode.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
              >
                Join Room
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No rooms available. Create one to get started!
              </div>
            ) : (
              <AnimatePresence>
                {rooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                    transition={{ duration: 0.3 }}
                    className="bg-white p-4 rounded-lg shadow border"
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{room.roomName}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        room.status === "WAITING"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Game: {room.gameType}{room.isPrivate && <span className="ml-1 text-xs">🔒</span>}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Players: {room.currentPlayers}/{room.maxPlayers}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Host: {room.hostUsername}
                  </p>
                  <button
                    onClick={() => handleJoinRoom(room.roomCode)}
                    disabled={
                      room.currentPlayers >= room.maxPlayers ||
                      room.status !== "WAITING"
                    }
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
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
  const [gameType, setGameType] = useState("TicTacToe");
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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-medium mb-4">Create New Room</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game Type
            </label>
            <select
              value={gameType}
              onChange={(e) => handleGameTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TicTacToe">Tic Tac Toe</option>
              <option value="LOTR">The Lord of the Rings: Duel for Middle-earth</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Players
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={maxPlayersLocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={6}>6 Players</option>
              <option value={8}>8 Players</option>
            </select>
            {maxPlayersLocked && (
              <p className="text-xs text-gray-500 mt-1">
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
              className="text-sm font-medium text-gray-700"
            >
              Private Room
            </label>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={roomName.trim().length < 3 || isCreating}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
