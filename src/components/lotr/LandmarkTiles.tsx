"use client";

import { useState } from "react";
import { LotrLandmarkTileDef, LotrSkill, getLandmarkImagePath, getLandmarkBackPath, getSkillIconPath } from "@/types/lotr";
import { resolveSkillsWithOptions } from "@/lib/lotrCards";

interface Props {
  landmarks: LotrLandmarkTileDef[];
  isMyTurn: boolean;
  myCoins: number;
  myPlayedCards: string[];
  fortressCount: number;
  onTakeLandmark: (tileId: string) => void;
  myAllianceTokenIds?: string[];
}

export default function LandmarkTiles({ landmarks, isMyTurn, myCoins, myPlayedCards, fortressCount, onTakeLandmark, myAllianceTokenIds }: Props) {
  const [selectedTile, setSelectedTile] = useState<LotrLandmarkTileDef | null>(null);

  const faceUpTiles = landmarks.filter(t => t.faceUp);
  const faceDownCount = landmarks.filter(t => !t.faceUp).length;

  const hasDwarves1 = myAllianceTokenIds?.includes("AT-DWARVES-1") ?? false;

  const getCoinCost = (tile: LotrLandmarkTileDef) => {
    const resolved = resolveSkillsWithOptions(myPlayedCards, tile.skillCost as LotrSkill[], myAllianceTokenIds);
    const extraCoinCost = hasDwarves1 ? 0 : fortressCount;
    return extraCoinCost + resolved.totalCoinSubstitution;
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
          myPlayedCards={myPlayedCards}
          myAllianceTokenIds={myAllianceTokenIds}
          fortressCount={fortressCount}
          hasDwarves1={hasDwarves1}
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

function LandmarkModal({ tile, myPlayedCards, myAllianceTokenIds, fortressCount, hasDwarves1, canAfford, coinCost, onClose, onTake }: {
  tile: LotrLandmarkTileDef;
  myPlayedCards: string[];
  myAllianceTokenIds?: string[];
  fortressCount: number;
  hasDwarves1: boolean;
  canAfford: boolean;
  coinCost: number;
  onClose: () => void;
  onTake: () => void;
}) {
  const resolved = resolveSkillsWithOptions(myPlayedCards, tile.skillCost as LotrSkill[], myAllianceTokenIds);

  const extraCoinCost = hasDwarves1 ? 0 : fortressCount;

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
                <div key={i} className={`relative ${!resolved.covered[i] ? "opacity-50" : ""}`}>
                  <img src={getSkillIconPath(s as LotrSkill)} alt={s}
                    className="w-8 h-8 rounded" />
                  {!resolved.covered[i] && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      🪙
                    </div>
                  )}
                </div>
              ))
            }
            {extraCoinCost > 0 && (
              <span className="text-yellow-400 text-sm">🪙 {extraCoinCost} (fortresses)</span>
            )}
            {hasDwarves1 && fortressCount > 0 && (
              <span className="text-green-400 text-[10px]">Dwarves 1: fortress cost ignored</span>
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
