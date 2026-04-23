"use client";

import { useState } from "react";
import { LotrLandmarkTileDef, LotrSkill, getLandmarkImagePath, getLandmarkBackPath, getSkillIconPath } from "@/types/lotr";

interface Props {
  landmarks: LotrLandmarkTileDef[];
  isMyTurn: boolean;
  myCoins: number;
  mySkills: Record<string, number>;
  fortressCount: number;
  onTakeLandmark: (tileId: string) => void;
}

export default function LandmarkTiles({ landmarks, isMyTurn, myCoins, mySkills, fortressCount, onTakeLandmark }: Props) {
  const [selectedTile, setSelectedTile] = useState<LotrLandmarkTileDef | null>(null);

  const faceUpTiles = landmarks.filter(t => t.faceUp);
  const faceDownCount = landmarks.filter(t => !t.faceUp).length;

  const getCoinCost = (tile: LotrLandmarkTileDef) => {
    let coinsNeeded = fortressCount;
    const needed: Record<string, number> = {};
    for (const s of tile.skillCost) needed[s] = (needed[s] || 0) + 1;
    for (const [s, count] of Object.entries(needed)) {
      const have = mySkills[s] || 0;
      if (have < count) coinsNeeded += count - have;
    }
    return coinsNeeded;
  };

  const canAfford = (tile: LotrLandmarkTileDef) => {
    return myCoins >= getCoinCost(tile);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs font-bold text-white mb-2">LANDMARKS</div>
      <div className="flex gap-2 flex-wrap items-center">
        {faceUpTiles.map(tile => (
          <button key={tile.id} onClick={() => isMyTurn && setSelectedTile(tile)}
            disabled={!isMyTurn}
            className="relative">
            <img src={getLandmarkImagePath(tile.id)} alt={tile.name}
              className={`w-32 h-32 sm:w-40 sm:h-40 rounded border-2 object-contain
                ${isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer" : "border-gray-600"}`} />
          </button>
        ))}
        {faceDownCount > 0 && (
          <div className="relative">
            <img src={getLandmarkBackPath()} alt="face-down landmarks"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded border-2 border-gray-600 object-contain" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/70 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
                {faceDownCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTile && (
        <LandmarkModal
          tile={selectedTile}
          mySkills={mySkills}
          fortressCount={fortressCount}
          canAfford={canAfford(selectedTile)}
          coinCost={getCoinCost(selectedTile)}
          onClose={() => setSelectedTile(null)}
          onTake={() => {
            onTakeLandmark(selectedTile.id);
            setSelectedTile(null);
          }}
        />
      )}
    </div>
  );
}

function LandmarkModal({ tile, mySkills, fortressCount, canAfford, coinCost, onClose, onTake }: {
  tile: LotrLandmarkTileDef;
  mySkills: Record<string, number>;
  fortressCount: number;
  canAfford: boolean;
  coinCost: number;
  onClose: () => void;
  onTake: () => void;
}) {
  // Build missingSkills array: for each skill in cost, consume available skills
  // and mark positions that need coin substitution
  const missingSkills = getMissingSkills(tile.skillCost, mySkills);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-5 max-w-md w-full mx-4 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3 mb-4">
          <img src={getLandmarkImagePath(tile.id)} alt={tile.name}
            className="w-48 h-48 object-contain rounded border border-gray-600" />
          <h3 className="font-bold text-lg">{tile.name}</h3>
        </div>

        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Cost:</div>
          <div className="flex items-center gap-2 flex-wrap">
            {tile.skillCost.map((s, i) => (
                <div key={i} className={`relative ${missingSkills[i] ? "opacity-50" : ""}`}>
                  <img src={getSkillIconPath(s as LotrSkill)} alt={s}
                    className="w-8 h-8 rounded" />
                  {missingSkills[i] && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      🪙
                    </div>
                  )}
                </div>
              ))
            }
            {fortressCount > 0 && (
              <span className="text-yellow-400 text-sm">🪙 {fortressCount} (fortresses)</span>
            )}
          </div>
          {coinCost > 0 && (
            <div className="text-sm mt-1">Total: 🪙 {coinCost} coins</div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">Effect:</div>
          <div className="text-sm text-gray-200">{tile.effect}</div>
        </div>

        <div className="flex gap-2">
          <button onClick={onTake}
            disabled={!canAfford}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded font-bold text-sm">
            Take Landmark ({coinCost} 🪙)
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * For each skill in the cost list, consume available player skills.
 * Returns a boolean array — true if that specific position needs coin substitution.
 * This also works as a foundation for grey card A/B choices later:
 * just call with the optimal skill allocation for the chosen option.
 */
function getMissingSkills(
  skillCost: LotrSkill[],
  mySkills: Record<string, number>,
): boolean[] {
  const available = { ...mySkills };
  return skillCost.map(skill => {
    if ((available[skill] ?? 0) > 0) {
      available[skill]--;
      return false;
    }
    return true;
  });
}
