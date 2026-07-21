"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { webSocketService } from "@/services/websocket";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useConnectionStatus } from "@/context/ConnectionContext";

/**
 * Presence delta broadcast by the backend's PresenceEventListener /
 * PresenceCleanupService on the /topic/users/online STOMP topic.
 */
interface PresenceDelta {
  username: string;
  online: boolean;
}

/**
 * Snapshot row returned by GET /api/users/online (OnlineUserResponse DTO).
 */
interface OnlineUser {
  username: string;
  displayName: string;
}

interface OnlineUsersContextType {
  /** Set of usernames currently online. Stable reference; replaced on change. */
  onlineUsers: Set<string>;
}

const OnlineUsersContext = createContext<OnlineUsersContextType | null>(null);

/**
 * Global presence layer. Maintains a Set<string> of online usernames via two
 * sources:
 *
 * 1. **Snapshot** — re-fetched from GET /api/users/online after every WS
 *    (re)connect, with a brief delay to let the backend's connect listener
 *    mark the current user online first. This fixes the original timing race
 *    where the snapshot fired before the WS handshake completed, so the user
 *    wasn't yet marked online and the snapshot came back empty. Using
 *    {@code reconnectCount} as the trigger ensures we also recover the full
 *    set after any dropped-and-reconnected session.
 * 2. **Deltas** — {username, online} messages on /topic/users/online keep the
 *    set live as other users connect/disconnect.
 *
 * The subscription is registered through the websocket.ts registry (PR #20),
 * which auto-replays it on every reconnect, so deltas aren't missed across
 * WS drops.
 *
 * Mounted once globally in layout.tsx (inside AuthProvider +
 * ConnectionProvider) so every page sees the same live set — the <OnlineDot>
 * component consumes it without prop-drilling. Only active when authenticated.
 */
export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { reconnectCount } = useConnectionStatus();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Clear the set immediately when signed out.
  useEffect(() => {
    if (!isAuthenticated) {
      setOnlineUsers(new Set());
    }
  }, [isAuthenticated]);

  // Snapshot seed — fetch after every WS (re)connect. The reconnectCount
  // trigger is what fixes the timing race: the snapshot now fires AFTER the
  // WS is up, and the 400ms delay lets the backend's connect listener commit
  // its isOnline=true write before we read. On initial mount (reconnectCount
  // is already > 0 from a prior session in the same tab), this still works —
  // the WS is connected and the user is already marked online.
  useEffect(() => {
    if (!isAuthenticated || reconnectCount === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch("/api/users/online")
        .then((r) => (r.ok ? r.json() : []))
        .then((users: OnlineUser[]) => {
          if (cancelled) return;
          setOnlineUsers(new Set(users.map((u) => u.username)));
        })
        .catch(() => {
          // Non-fatal — deltas will still keep the set current.
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthenticated, reconnectCount]);

  // Delta stream — subscribe whenever authenticated (the registry handles
  // reconnect replays; the subscribe call returns a cleanup that we hold for
  // the authenticated lifetime).
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = webSocketService.subscribe<PresenceDelta>(
      "/topic/users/online",
      (delta) => {
        setOnlineUsers((prev) => {
          // Always copy into a new Set so consumers re-render on change.
          if (delta.online) {
            if (prev.has(delta.username)) return prev;
            const next = new Set(prev);
            next.add(delta.username);
            return next;
          } else {
            if (!prev.has(delta.username)) return prev;
            const next = new Set(prev);
            next.delete(delta.username);
            return next;
          }
        });
      },
    );
    return unsubscribe;
  }, [isAuthenticated]);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

/**
 * Read the current online-users set. Throws if used outside the provider —
 * guards against silent mis-wiring in a non-provider subtree.
 */
export function useOnlineUsers(): Set<string> {
  const context = useContext(OnlineUsersContext);
  if (!context) {
    throw new Error("useOnlineUsers must be used within an OnlineUsersProvider");
  }
  return context.onlineUsers;
}
