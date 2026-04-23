"use client";

import { LotrManeuverType } from "@/types/lotr";

interface Props {
  pendingManeuvers: LotrManeuverType[];
  onSkip: () => void;
}

const MANEUVER_LABELS: Record<string, string> = {
  REMOVE_ENEMY_UNIT: "Remove Enemy",
  MOVE_UNIT: "Move Unit",
  STEAL_COIN: "Steal Coin",
};

export default function ManeuverPanel({ pendingManeuvers, onSkip }: Props) {
  if (pendingManeuvers.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const m of pendingManeuvers) {
    counts[m] = (counts[m] || 0) + 1;
  }

  const summary = Object.entries(counts)
    .map(([type, count]) => `${count} ${MANEUVER_LABELS[type] || type}`)
    .join(", ");

  return (
    <div className="bg-purple-900/60 border border-purple-500 rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-purple-200">Maneuver Phase</div>
        <div className="text-xs text-purple-300">Resolve: {summary}</div>
      </div>
      <button onClick={onSkip}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
        Skip All
      </button>
    </div>
  );
}
