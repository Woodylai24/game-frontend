"use client";

import { useState } from "react";
import { getCardImagePath } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";

interface Props {
  discardPile: string[];
  onResolve: (action: string, cardDefId?: string) => void;
}

export default function PickDiscardPanel({ discardPile, onResolve }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <div className="bg-violet-900/70 border border-violet-500 rounded-lg p-4">
      <div className="text-sm font-bold text-violet-200 mb-2">Pick a Discard Card</div>
      <div className="text-xs text-violet-300 mb-3">Choose a card from the discard pile to play for free:</div>
      <div className="flex flex-wrap gap-2 mb-3 max-h-56 overflow-y-auto">
        {discardPile.map(cardId => {
          const def = getCardDef(cardId);
          if (!def) return null;
          const isSelected = selectedCard === cardId;
          return (
            <button key={cardId} onClick={() => setSelectedCard(cardId)}
              className={`rounded p-1 border-2 transition-colors ${
                isSelected
                  ? "border-yellow-400 bg-gray-700"
                  : "bg-gray-800 border-violet-600 hover:bg-gray-700"
              }`}>
              <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                className="w-16 h-20 object-contain rounded" />
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => selectedCard && onResolve("PICK", selectedCard)}
          disabled={!selectedCard}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm font-bold">
          Confirm
        </button>
        <button onClick={() => onResolve("SKIP")}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-bold">
          Skip
        </button>
      </div>
    </div>
  );
}
