"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  webSocketService,
  ConnectionStatus,
} from "@/services/websocket";

interface ConnectionContextType {
  status: ConnectionStatus;
  reconnectCount: number;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>(
    webSocketService.isConnected() ? "connected" : "disconnected",
  );
  const [reconnectCount, setReconnectCount] = useState(
    webSocketService.getReconnectCount(),
  );

  useEffect(() => {
    const unsubscribe = webSocketService.onStateChange((newStatus) => {
      setStatus(newStatus);
      setReconnectCount(webSocketService.getReconnectCount());
    });
    return unsubscribe;
  }, []);

  return (
    <ConnectionContext.Provider value={{ status, reconnectCount }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionStatus(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error(
      "useConnectionStatus must be used within a ConnectionProvider",
    );
  }
  return context;
}
