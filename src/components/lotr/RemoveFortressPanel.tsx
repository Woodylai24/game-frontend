"use client";

import { useLotrGameContext } from "@/context/LotrGameContext";

export default function RemoveFortressPanel() {
  const { resolveRemoveFortress } = useLotrGameContext();

  return (
    <div className="bg-orange-900/60 border border-orange-500 rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-orange-200">Remove Enemy Fortress</div>
        <div className="text-xs text-orange-300">Click an enemy fortress region on the map</div>
      </div>
      <button onClick={() => resolveRemoveFortress("SKIP")}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
        Skip
      </button>
    </div>
  );
}
