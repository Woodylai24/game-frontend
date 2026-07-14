"use client";

import { useLotrGameContext } from "@/context/LotrGameContext";

export default function PlaceUnitPanel() {
  const { resolvePlaceUnit } = useLotrGameContext();

  return (
    <div className="bg-blue-900/60 border border-blue-500 rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-blue-200">Place Unit</div>
        <div className="text-xs text-blue-300">Click any region on the map</div>
      </div>
      <button onClick={() => resolvePlaceUnit("SKIP")}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
        Skip
      </button>
    </div>
  );
}
