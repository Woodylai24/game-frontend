"use client";

import { LotrLandmarkTileDef, SKILL_ABBR, SKILL_COLOR, getLandmarkImagePath } from "@/types/lotr";

interface Props {
  landmarks: LotrLandmarkTileDef[];
  isMyTurn: boolean;
  myCoins: number;
  mySkills: Record<string, number>;
  fortressCount: number;
  onTakeLandmark: (tileId: string) => void;
}

export default function LandmarkTiles({ landmarks, isMyTurn, myCoins, mySkills, fortressCount, onTakeLandmark }: Props) {
  const faceUpTiles = landmarks.filter(t => t.faceUp);
  const faceDownCount = landmarks.filter(t => !t.faceUp).length;

  const canAfford = (tile: LotrLandmarkTileDef) => {
    const extraCoins = fortressCount;
    let coinsNeeded = extraCoins;
    const needed: Record<string, number> = {};
    for (const s of tile.skillCost) needed[s] = (needed[s] || 0) + 1;
    for (const [s, count] of Object.entries(needed)) {
      const have = mySkills[s] || 0;
      if (have < count) coinsNeeded += count - have;
    }
    return myCoins >= coinsNeeded;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs font-bold text-white mb-2">LANDMARKS</div>
      <div className="flex gap-2 flex-wrap">
        {faceUpTiles.map(tile => (
          <button key={tile.id} onClick={() => isMyTurn && onTakeLandmark(tile.id)}
            disabled={!isMyTurn}
            className="relative group">
            <img src={getLandmarkImagePath(tile.id)} alt={tile.name}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded border-2 object-contain
                ${isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer" : "border-gray-600"}`} />
            <div className="absolute inset-0 bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 pointer-events-none">
              <div className="text-white text-[9px] font-bold">{tile.name}</div>
              <div className="text-[8px] text-gray-300">{tile.region}</div>
              <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                {tile.skillCost.map((s, i) => <span key={i} className={`px-0.5 rounded text-[7px] ${SKILL_COLOR[s]}`}>{SKILL_ABBR[s]}</span>)}
              </div>
              {fortressCount > 0 && <div className="text-[8px] text-yellow-400">+{fortressCount}🪙 fortresses</div>}
            </div>
          </button>
        ))}
        {Array.from({ length: faceDownCount }).map((_, i) => (
          <div key={`fd-${i}`} className="w-16 h-16 sm:w-20 sm:h-20 rounded bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
            <div className="text-gray-500 text-[10px]">?</div>
          </div>
        ))}
      </div>
    </div>
  );
}
