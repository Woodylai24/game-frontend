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
          <div key={ri}
            className="flex gap-1 justify-center"
            style={rows[ri].halfOffset ? { paddingLeft: '70px', paddingRight: '0px' } : undefined}
          >
            {row.slots.map((slot, si) => {
              if (!slot) {
                // Gap spacer for diamond
                return <div key={`gap-${ri}-${si}`} className="w-[60px] h-[90px] sm:w-[70px] sm:h-[105px]" />;
              }
              const isAvailable = slot.cardDefId && slot.coveredBy.length === 0;
              const card = slot.cardDefId ? getCardDef(slot.cardDefId) : null;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAvailable && isMyTurn && setSelectedSlot(slot)}
                  disabled={!isAvailable || !isMyTurn}
                  className={`w-[60px] h-[90px] sm:w-[70px] sm:h-[105px] rounded border-2 text-[8px] sm:text-[10px] transition-all overflow-hidden relative
                    ${!slot.cardDefId ? "border-gray-700 bg-gray-700/30 opacity-30" :
                      !slot.faceUp ? "border-gray-600 bg-gray-700" :
                      isAvailable && isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer hover:scale-105 shadow-lg" :
                      "border-gray-500 opacity-60"}
                  `}
                >
                  {slot.cardDefId && slot.faceUp && card ? (
                    <img src={getCardImagePath(card.id, card.chapter)} alt={card.name} className="w-full h-full object-contain" />
                  ) : slot.cardDefId && !slot.faceUp ? (
                    <img src={getCardBackPath(currentChapter)} alt="face down" className="w-full h-full object-contain" />
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

interface PyramidRow {
  slots: (LotrCardSlot | null)[];
  halfOffset: boolean;
}

function getRows(slots: LotrCardSlot[], chapter: number): PyramidRow[] {
  const rowSizes = chapter === 1 ? [2, 3, 4, 5, 6] : chapter === 2 ? [6, 5, 4, 3, 2] : [2, 3, 4, 2, 4, 3, 2];
  const maxRow = Math.max(...rowSizes);
  const rows: PyramidRow[] = [];
  let idx = 0;
  for (let ri = 0; ri < rowSizes.length; ri++) {
    const size = rowSizes[ri];
    const rowSlots: (LotrCardSlot | null)[] = [];

    if (chapter === 3 && ri === 3) {
      if (idx < slots.length) rowSlots.push(slots[idx++]);
      rowSlots.push(null);
      rowSlots.push(null);
      if (idx < slots.length) rowSlots.push(slots[idx++]);
      rows.push({ slots: rowSlots, halfOffset: false });
    } else {
      const pad = maxRow - size;
      const leftPad = Math.floor(pad / 2);
      const rightPad = Math.ceil(pad / 2);
      // Half-offset needed when row differs from adjacent rows by odd count
      // i.e. when this row size has different parity than maxRow
      const needsOffset = (maxRow - size) % 2 !== 0;
      for (let p = 0; p < leftPad; p++) rowSlots.push(null);
      for (let i = 0; i < size; i++) {
        if (idx < slots.length) rowSlots.push(slots[idx++]);
      }
      for (let p = 0; p < rightPad; p++) rowSlots.push(null);
      rows.push({ slots: rowSlots, halfOffset: ri % 2 === 1 });
    }
  }
  return rows;
}
