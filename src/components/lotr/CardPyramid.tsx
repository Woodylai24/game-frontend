"use client";

import { useState } from "react";
import { LotrCardSlot, LotrGameState, LotrCardDef, CARD_COLOR_BG, CARD_COLOR_TEXT, SKILL_ABBR, SKILL_COLOR, getCardImagePath, getCardBackPath } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";

interface Props {
  cardSlots: LotrCardSlot[];
  currentChapter: number;
  isMyTurn: boolean;
  onTakeCard: (slotId: number, playOrDiscard: "PLAY" | "DISCARD", chosenRegion?: string) => void;
  myPlayedCards: string[];
  myCoins: number;
}

export default function CardPyramid({ cardSlots, currentChapter, isMyTurn, onTakeCard, myPlayedCards, myCoins }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<LotrCardSlot | null>(null);

  const rows = getRows(cardSlots, currentChapter);

  const availableCard = selectedSlot ? getCardDef(selectedSlot.cardDefId || "") : null;

  const canChain = availableCard && availableCard.chainCost && myPlayedCards.some(id => {
    const def = getCardDef(id);
    return def?.chainingSymbol === availableCard.chainCost;
  });

  const skillMap: Record<string, number> = {};
  for (const id of myPlayedCards) {
    const def = getCardDef(id);
    if (def?.color === "GREY" && def.greySkills) {
      for (const choice of def.greySkills) {
        for (const s of choice) skillMap[s] = (skillMap[s] || 0) + 1;
      }
    }
  }

  const canAfford = (card: LotrCardDef) => {
    if (canChain) return true;
    let coinsNeeded = card.coinCost;
    const needed: Record<string, number> = {};
    for (const s of card.skillCost) needed[s] = (needed[s] || 0) + 1;
    for (const [s, count] of Object.entries(needed)) {
      const have = skillMap[s] || 0;
      if (have < count) coinsNeeded += count - have;
    }
    return myCoins >= coinsNeeded;
  };

  const romanChapter = ["I", "II", "III"][currentChapter - 1];

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-center text-sm font-bold text-white mb-3">
        Chapter {romanChapter}
      </div>

      <div className="flex flex-col items-center gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map(slot => {
              if (!slot) return <div key={`empty-${ri}`} className="w-16 h-20 sm:w-20 sm:h-24" />;
              const isAvailable = slot.cardDefId && slot.coveredBy.length === 0;
              const card = slot.cardDefId ? getCardDef(slot.cardDefId) : null;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAvailable && isMyTurn && setSelectedSlot(slot)}
                  disabled={!isAvailable || !isMyTurn}
                  className={`w-16 h-20 sm:w-20 sm:h-24 rounded border-2 text-[8px] sm:text-[10px] transition-all overflow-hidden relative
                    ${!slot.cardDefId ? "border-gray-700 bg-gray-700/30 opacity-30" :
                      !slot.faceUp ? "border-gray-600 bg-gray-700" :
                      isAvailable && isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer hover:scale-105 shadow-lg" :
                      "border-gray-500 opacity-60"}
                  `}
                >
                  {slot.cardDefId && slot.faceUp && card ? (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-0.5 ${CARD_COLOR_BG[card.color]}`}>
                      <div className={`font-bold leading-tight ${CARD_COLOR_TEXT[card.color]}`}>{card.name.split(" ").slice(0, 2).join(" ")}</div>
                      {card.coinCost > 0 && <div className="text-[8px]">🪙{card.coinCost}</div>}
                      {card.skillCost.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap justify-center">
                          {card.skillCost.map((s, i) => <span key={i} className={`px-0.5 rounded text-[7px] ${SKILL_COLOR[s]}`}>{SKILL_ABBR[s]}</span>)}
                        </div>
                      )}
                    </div>
                  ) : slot.cardDefId && !slot.faceUp ? (
                    <img src={getCardBackPath(currentChapter)} alt="face down" className="w-full h-full object-cover" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedSlot && availableCard && (
        <CardActionModal
          card={availableCard}
          slot={selectedSlot}
          canChain={!!canChain}
          canAfford={canAfford(availableCard)}
          skillMap={skillMap}
          myCoins={myCoins}
          onClose={() => setSelectedSlot(null)}
          onConfirm={(playOrDiscard, region) => {
            onTakeCard(selectedSlot.id, playOrDiscard, region);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

function CardActionModal({ card, slot, canChain, canAfford, skillMap, myCoins, onClose, onConfirm }: {
  card: LotrCardDef; slot: LotrCardSlot; canChain: boolean; canAfford: boolean;
  skillMap: Record<string, number>; myCoins: number;
  onClose: () => void; onConfirm: (playOrDiscard: "PLAY" | "DISCARD", region?: string) => void;
}) {
  const [chosenRegion, setChosenRegion] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"PLAY" | "DISCARD">("PLAY");

  const needsRegion = card.color === "RED" && card.redBannerRegions && card.redBannerRegions.length > 1;

  let coinsNeeded = card.coinCost;
  const missingSkills: string[] = [];
  if (!canChain) {
    const needed: Record<string, number> = {};
    for (const s of card.skillCost) needed[s] = (needed[s] || 0) + 1;
    for (const [s, count] of Object.entries(needed)) {
      const have = skillMap[s] || 0;
      if (have < count) {
        coinsNeeded += count - have;
        missingSkills.push(`${s} (${count - have} substitution)`);
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-5 max-w-sm w-full mx-4 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <img src={getCardImagePath(card.id, card.chapter)} alt={card.name}
            className="w-20 h-28 object-cover rounded border" />
          <div>
            <h3 className="font-bold text-sm">{card.name}</h3>
            <div className="text-[10px] text-gray-400">{card.color} • Ch {card.chapter}</div>
            {canChain ? (
              <div className="text-green-400 text-xs mt-1">⚡ Free via chaining ({card.chainCost})</div>
            ) : (
              <div className="text-xs mt-1">
                {card.coinCost > 0 && <div>🪙 {card.coinCost} coins</div>}
                {card.skillCost.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap">
                    Cost: {card.skillCost.map((s, i) => <span key={i} className={`px-1 rounded ${SKILL_COLOR[s]}`}>{SKILL_ABBR[s]}</span>)}
                  </div>
                )}
                {missingSkills.length > 0 && <div className="text-yellow-400 text-[10px]">Missing: {missingSkills.join(", ")}</div>}
                {coinsNeeded > 0 && <div className="text-xs">Total: 🪙{coinsNeeded}</div>}
              </div>
            )}
          </div>
        </div>

        {needsRegion && mode === "PLAY" && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Choose region:</div>
            <div className="flex gap-2">
              {card.redBannerRegions!.map(r => (
                <button key={r} onClick={() => setChosenRegion(r)}
                  className={`px-3 py-1 rounded text-xs ${chosenRegion === r ? "bg-yellow-500 text-black" : "bg-gray-700"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => onConfirm("PLAY", chosenRegion)}
            disabled={!canAfford || (needsRegion && !chosenRegion)}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded font-bold text-sm">
            Play {!canAfford ? "(can't afford)" : canChain ? "(Free!)" : `(${coinsNeeded} 🪙)`}
          </button>
          <button onClick={() => onConfirm("DISCARD")}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold text-sm">
            Discard (+{card.chapter} 🪙)
          </button>
          <button onClick={onClose} className="px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm">✕</button>
        </div>
      </div>
    </div>
  );
}

function getRows(slots: LotrCardSlot[], chapter: number): (LotrCardSlot | null)[][] {
  const rowSizes = chapter === 1 ? [2, 3, 4, 5, 6] : chapter === 2 ? [6, 5, 4, 3, 2] : [2, 3, 4, 2, 4, 3, 2];
  const maxRow = Math.max(...rowSizes);
  const rows: (LotrCardSlot | null)[][] = [];
  let idx = 0;
  for (const size of rowSizes) {
    const row: (LotrCardSlot | null)[] = [];
    const pad = (maxRow - size) / 2;
    for (let p = 0; p < Math.floor(pad); p++) row.push(null);
    for (let i = 0; i < size; i++) {
      if (idx < slots.length) row.push(slots[idx++]);
    }
    for (let p = 0; p < Math.ceil(pad); p++) row.push(null);
    rows.push(row);
  }
  return rows;
}
