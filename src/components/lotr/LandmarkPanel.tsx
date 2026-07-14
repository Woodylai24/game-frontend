"use client";

import { useState, useMemo } from "react";
import { LotrCardDef, LotrRace, getCardImagePath, getRaceIconPath } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";
import { useLotrGameContext } from "@/context/LotrGameContext";

export default function LandmarkPanel() {
  const { state, opponent, resolveLandmark } = useLotrGameContext();
  const subPhase = state.landmarkSubPhase ?? "";
  const movementsRemaining = state.landmarkMovementsRemaining;
  const drawnTokens = state.landmarkDrawnTokens;
  const [selectedGreyCard, setSelectedGreyCard] = useState<string | null>(null);

  // Card-def derivations for PICK_GREY — only this panel needs them, so they
  // live here (kept out of context to keep the shared value lean).
  const { cardDefsMap, opponentGreyCards, opponentCardDefs } = useMemo(() => {
    const defs: Record<string, LotrCardDef> = {};
    for (const cardId of state.discardPile ?? []) {
      const def = getCardDef(cardId);
      if (def) defs[cardId] = def;
    }
    const greyCards = (opponent?.playedCardIds ?? []).filter((id) => {
      const def = getCardDef(id);
      return def?.color === "GREY";
    });
    const greyDefs: Record<string, LotrCardDef> = {};
    for (const cardId of greyCards) {
      const def = getCardDef(cardId);
      if (def) greyDefs[cardId] = def;
    }
    return { cardDefsMap: defs, opponentGreyCards: greyCards, opponentCardDefs: greyDefs };
  }, [state.discardPile, opponent?.playedCardIds]);

  if (subPhase === "MOVEMENT") {
    return (
      <div className="bg-green-900/60 border border-green-500 rounded-lg p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-green-200">Landmark: Movement</div>
          <div className="text-xs text-green-300">Complete {movementsRemaining} movement(s) — click a region with your units</div>
        </div>
        <button onClick={() => resolveLandmark("SKIP")}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap">
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
        <div className="flex gap-3 flex-wrap">
          {races.map(race => (
            <button key={race} onClick={() => resolveLandmark("PICK_RACE", { race })}
              className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded p-2 hover:border-green-400 transition-colors">
              <img src={getRaceIconPath(race)} alt={race} className="w-10 h-10 rounded" />
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
            <button key={tokenId} onClick={() => resolveLandmark("PICK_TOKEN", { tokenId })}
              className="bg-gray-800 hover:bg-gray-700 border border-green-600 rounded px-4 py-2 text-white text-sm">
              {tokenId}
            </button>
          ))}
        </div>
        <button onClick={() => resolveLandmark("SKIP")}
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
        <div className="flex gap-2 flex-wrap mb-3">
          {opponentGreyCards.map(cardId => {
            const def = opponentCardDefs[cardId];
            if (!def) return null;
            return (
              <button key={cardId} onClick={() => setSelectedGreyCard(cardId)}
                className={`rounded p-1 border-2 transition-colors ${
                  selectedGreyCard === cardId
                    ? "border-yellow-400 bg-gray-700"
                    : "bg-gray-800 border-green-600 hover:bg-gray-700"
                }`}>
                <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                  className="w-16 h-20 object-contain rounded" />
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => selectedGreyCard && resolveLandmark("PICK_GREY", { cardDefId: selectedGreyCard })}
            disabled={!selectedGreyCard}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm font-bold">
            Confirm
          </button>
          <button onClick={() => resolveLandmark("SKIP")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold">
            Skip
          </button>
        </div>
      </div>
    );
  }

  return null;
}
