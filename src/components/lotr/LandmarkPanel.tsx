"use client";

import { LotrCardDef, LotrRace, getCardImagePath } from "@/types/lotr";

interface Props {
  subPhase: string;
  movementsRemaining?: number;
  discardPile?: string[];
  cardDefs?: Record<string, LotrCardDef>;
  drawnTokens?: string[];
  opponentGreyCards?: string[];
  opponentCardDefs?: Record<string, LotrCardDef>;
  onResolveLandmark: (action: string, data?: Record<string, string>) => void;
}

export default function LandmarkPanel({
  subPhase, movementsRemaining, discardPile, cardDefs, drawnTokens,
  opponentGreyCards, opponentCardDefs, onResolveLandmark
}: Props) {

  if (subPhase === "MOVEMENT") {
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-green-200">Landmark: Movement</div>
          <div className="text-xs text-green-300">Complete {movementsRemaining} movement(s) — click a region with your units</div>
        </div>
        <button onClick={() => onResolveLandmark("SKIP")}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
          Skip
        </button>
      </div>
    );
  }

  if (subPhase === "PICK_DISCARD" && discardPile && cardDefs) {
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3">
        <div className="text-sm font-bold text-green-200 mb-2">Landmark: Pick a Discard Card</div>
        <div className="text-xs text-green-300 mb-3">Choose 1 card from the discard pile to play for free</div>
        <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto">
          {discardPile.map(cardId => {
            const def = cardDefs[cardId];
            if (!def) return null;
            return (
              <button key={cardId} onClick={() => onResolveLandmark("PICK_DISCARD", { cardDefId: cardId })}
                className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded p-1 text-left">
                <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                  className="w-16 h-20 object-contain rounded" />
                <div className="text-[10px] text-white truncate w-16">{def.name}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => onResolveLandmark("SKIP")}
          className="mt-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold">
          Skip
        </button>
      </div>
    );
  }

  if (subPhase === "PICK_RACE") {
    const races: LotrRace[] = ["ELVES", "ENTS", "HOBBITS", "HUMANS", "DWARVES", "WIZARDS"];
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3">
        <div className="text-sm font-bold text-green-200 mb-2">Landmark: Pick a Race</div>
        <div className="text-xs text-green-300 mb-3">Choose a race to draw 2 alliance tokens from</div>
        <div className="flex gap-2 flex-wrap">
          {races.map(race => (
            <button key={race} onClick={() => onResolveLandmark("PICK_RACE", { race })}
              className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded px-4 py-2 text-white text-sm font-bold">
              {race.charAt(0) + race.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (subPhase === "PICK_TOKEN" && drawnTokens && drawnTokens.length > 0) {
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3">
        <div className="text-sm font-bold text-green-200 mb-2">Landmark: Pick a Token</div>
        <div className="text-xs text-green-300 mb-3">Choose 1 token to keep</div>
        <div className="flex gap-2">
          {drawnTokens.map(tokenId => (
            <button key={tokenId} onClick={() => onResolveLandmark("PICK_TOKEN", { tokenId })}
              className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded px-4 py-2 text-white text-sm">
              {tokenId}
            </button>
          ))}
        </div>
        <button onClick={() => onResolveLandmark("SKIP")}
          className="mt-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold">
          Skip
        </button>
      </div>
    );
  }

  if (subPhase === "PICK_GREY" && opponentGreyCards && opponentCardDefs) {
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3">
        <div className="text-sm font-bold text-green-200 mb-2">Landmark: Discard Opponent&apos;s Grey Card</div>
        <div className="text-xs text-green-300 mb-3">Choose 1 grey card from opponent&apos;s play area to discard</div>
        <div className="flex gap-2 flex-wrap">
          {opponentGreyCards.map(cardId => {
            const def = opponentCardDefs[cardId];
            if (!def) return null;
            return (
              <button key={cardId} onClick={() => onResolveLandmark("PICK_GREY", { cardDefId: cardId })}
                className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded p-1 text-left">
                <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                  className="w-16 h-20 object-contain rounded" />
                <div className="text-[10px] text-white truncate w-16">{def.name}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => onResolveLandmark("SKIP")}
          className="mt-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold">
          Skip
        </button>
      </div>
    );
  }

  return null;
}
