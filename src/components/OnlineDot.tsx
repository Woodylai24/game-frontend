"use client";

import { useOnlineUsers } from "@/context/OnlineUsersContext";

interface Props {
  username: string;
  /** Extra classes (e.g. margins) — the dot itself owns w/h/rounded/color. */
  className?: string;
}

/**
 * Green/gray presence dot. Reads the global online-users set from
 * {@link useOnlineUsers}, so it works on any page (room roster, LOTR player
 * panel, future "who's online" list). The dot owns its size/color classes;
 * callers add spacing/positioning via {@link Props.className}.
 *
 * Keep the dot subtle — w-3 h-3 rounded-full, same sizing as the legacy
 * room-roster dot so the visual is unchanged on the room page after the
 * repurpose.
 */
export default function OnlineDot({ username, className }: Props) {
  const onlineUsers = useOnlineUsers();
  const online = onlineUsers.has(username);
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${online ? "bg-green-500" : "bg-gray-400"} ${className ?? ""}`}
      aria-label={online ? "online" : "offline"}
    />
  );
}
