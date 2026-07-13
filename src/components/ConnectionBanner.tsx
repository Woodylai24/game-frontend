"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConnectionStatus } from "@/context/ConnectionContext";

/**
 * Slim non-blocking banner at the top of the page. Shows "Reconnecting…"
 * while the WebSocket is down, and briefly flashes "Connected" after a
 * successful reconnect. z-50 sits above the game page's z-40 sticky bars.
 *
 * Only renders once a connection has been established at least once
 * (reconnectCount >= 1). This avoids showing "Reconnecting…" on the login
 * page before the user has ever connected, and after logout (disconnect()
 * resets reconnectCount to 0).
 */
export default function ConnectionBanner() {
  const { status, reconnectCount } = useConnectionStatus();
  const [showConnected, setShowConnected] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // reconnectCount >= 1 means we've connected before. Don't show the banner
  // on the login page (pre-connect) or after logout (count reset to 0).
  const hasConnectedBefore = reconnectCount >= 1;

  useEffect(() => {
    if (!hasConnectedBefore) return;

    if (status === "connecting" || status === "disconnected") {
      setWasDisconnected(true);
    } else if (status === "connected") {
      if (wasDisconnected) {
        setShowConnected(true);
        const timer = setTimeout(() => setShowConnected(false), 2500);
        return () => clearTimeout(timer);
      }
      setWasDisconnected(false);
    }
  }, [status, wasDisconnected, hasConnectedBefore]);

  if (!hasConnectedBefore) return null;

  return (
    <AnimatePresence>
      {status !== "connected" ? (
        <motion.div
          key="reconnecting"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1.5 shadow-md"
        >
          Reconnecting…
        </motion.div>
      ) : showConnected ? (
        <motion.div
          key="connected"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-center text-sm py-1.5 shadow-md"
        >
          Connected
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
