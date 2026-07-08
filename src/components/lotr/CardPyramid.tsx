"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LotrCardSlot, LotrCardDef, LotrSkill, LotrRegion, getCardImagePath, getCardBackPath, getSkillIconPath } from "@/types/lotr";
import { getCardDef, getCardEffectText, resolveSkillsWithOptions } from "@/lib/lotrCards";

const ALL_REGIONS: LotrRegion[] = ["LINDON", "ARNOR", "RHOVANION", "ENEDWAITH", "ROHAN", "GONDOR", "MORDOR"];

interface Props {
  cardSlots: LotrCardSlot[];
  currentChapter: number;
  isMyTurn: boolean;
  onTakeCard: (slotId: number, playOrDiscard: "PLAY" | "DISCARD", chosenRegion?: string) => void;
  myPlayedCards: string[];
  myCoins: number;
  myAllianceTokenIds?: string[];
}

export default function CardPyramid({ cardSlots, currentChapter, isMyTurn, onTakeCard, myPlayedCards, myCoins, myAllianceTokenIds }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<LotrCardSlot | null>(null);

  const rows = getRows(cardSlots, currentChapter);

  const availableCard = selectedSlot ? getCardDef(selectedSlot.cardDefId || "") : null;

  const canChain = availableCard && availableCard.chainCost && myPlayedCards.some(id => {
    const def = getCardDef(id);
    return def?.chainingSymbol === availableCard.chainCost;
  });

  const canAfford = (card: LotrCardDef) => {
    if (canChain) return true;
    const resolved = resolveSkillsWithOptions(myPlayedCards, card.skillCost as LotrSkill[], myAllianceTokenIds);
    const totalCoins = card.coinCost + resolved.totalCoinSubstitution;
    return myCoins >= totalCoins;
  };

  const romanChapter = ["I", "II", "III"][currentChapter - 1];

  return (
    <div className="bg-gray-800 rounded-lg p-2 lg:p-4 flex flex-col lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      <div className="text-center text-sm font-bold text-white mb-2">
        Chapter {romanChapter}
      </div>

      {/* Mobile: fixed 80x120 cards, horizontal scroll */}
      <div className="lg:hidden overflow-x-auto">
        <div className="flex flex-col items-center gap-1 w-max mx-auto">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center">
              {row.slots.map((slot, si) => {
                if (!slot) {
                  return <div key={`gap-${ri}-${si}`} className="w-[80px] h-[120px]" />;
                }
                const isAvailable = slot.cardDefId && slot.coveredBy.length === 0;
                const card = slot.cardDefId ? getCardDef(slot.cardDefId) : null;

                return (
                  <button
                    key={slot.id}
                    onClick={() => isAvailable && isMyTurn && setSelectedSlot(slot)}
                    disabled={!isAvailable || !isMyTurn}
                    className={`w-[80px] h-[120px] rounded border-2 text-[8px] transition-all overflow-hidden relative
                      ${!slot.cardDefId ? "border-gray-700 bg-gray-700/30 opacity-30" :
                        !slot.faceUp ? "border-gray-600 bg-gray-700" :
                        isAvailable && isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer hover:scale-105 shadow-lg" :
                        "border-gray-500 opacity-60"}
                    `}
                  >
                    <AnimatePresence>
                      {slot.cardDefId && slot.faceUp && card ? (
                        <motion.img
                          key={slot.cardDefId}
                          src={getCardImagePath(card.id, card.chapter)}
                          alt={card.name}
                          className="w-full h-full object-contain absolute inset-0"
                          exit={{ opacity: 0, scale: 0.7, y: -10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                      ) : null}
                    </AnimatePresence>
                    {!slot.faceUp ? (
                      <img src={getCardBackPath(currentChapter)} alt="face down" className="w-full h-full object-contain" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: fixed-size cards */}
      <div className="hidden lg:flex flex-col items-center gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.slots.map((slot, si) => {
              if (!slot) {
                return <div key={`gap-${ri}-${si}`} className="w-[90px] h-[135px]" />;
              }
              const isAvailable = slot.cardDefId && slot.coveredBy.length === 0;
              const card = slot.cardDefId ? getCardDef(slot.cardDefId) : null;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAvailable && isMyTurn && setSelectedSlot(slot)}
                  disabled={!isAvailable || !isMyTurn}
                  className={`w-[90px] h-[135px] rounded border-2 text-[10px] transition-all overflow-hidden relative
                    ${!slot.cardDefId ? "border-gray-700 bg-gray-700/30 opacity-30" :
                      !slot.faceUp ? "border-gray-600 bg-gray-700" :
                      isAvailable && isMyTurn ? "border-yellow-400 hover:border-yellow-300 cursor-pointer hover:scale-105 shadow-lg" :
                      "border-gray-500 opacity-60"}
                  `}
                >
                  <AnimatePresence>
                    {slot.cardDefId && slot.faceUp && card ? (
                      <motion.img
                        key={slot.cardDefId}
                        src={getCardImagePath(card.id, card.chapter)}
                        alt={card.name}
                        className="w-full h-full object-contain absolute inset-0"
                        exit={{ opacity: 0, scale: 0.7, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    ) : null}
                  </AnimatePresence>
                  {!slot.faceUp ? (
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
          canChain={!!canChain}
          canAfford={canAfford(availableCard)}
          myPlayedCards={myPlayedCards}
          myAllianceTokenIds={myAllianceTokenIds}
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

function CardActionModal({ card, canChain, canAfford, myPlayedCards, myAllianceTokenIds, onClose, onConfirm }: {
  card: LotrCardDef; canChain: boolean; canAfford: boolean;
  myPlayedCards: string[];
  myAllianceTokenIds?: string[];
  onClose: () => void; onConfirm: (playOrDiscard: "PLAY" | "DISCARD", region?: string) => void;
}) {
  const [chosenRegion, setChosenRegion] = useState<string | undefined>(undefined);

  const hasElves2 = myAllianceTokenIds?.includes("AT-ELVES-2") ?? false;
  const needsRegion = card.color === "RED" && card.redBannerRegions && card.redBannerRegions.length > 0 && (hasElves2 || card.redBannerRegions.length > 1);
  const regionChoices = hasElves2 && card.color === "RED" ? ALL_REGIONS : (card.redBannerRegions ?? []);

  const resolved = canChain
    ? { covered: card.skillCost.map(() => true), totalCoinSubstitution: 0 }
    : resolveSkillsWithOptions(myPlayedCards, card.skillCost as LotrSkill[], myAllianceTokenIds);

  const coinsNeeded = card.coinCost + resolved.totalCoinSubstitution;

  const effectText = getCardEffectText(card);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-5 max-w-sm w-full mx-4 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <img src={getCardImagePath(card.id, card.chapter)} alt={card.name}
            className="w-28 h-40 object-cover rounded border" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">{card.name}</h3>
            <div className="text-[10px] text-gray-400">{card.color} • Ch {card.chapter}</div>
            {canChain ? (
              <div className="text-green-400 text-xs mt-1">⚡ Free via chaining ({card.chainCost})</div>
            ) : (
              <div className="text-xs mt-1">
                {card.coinCost > 0 && <div>🪙 {card.coinCost} coins</div>}
                {card.skillCost.length > 0 && (
                  <div className="flex gap-1 flex-wrap items-center mt-1">
                    Cost: {card.skillCost.map((s, i) => (
                      <div key={i} className={`relative ${!resolved.covered[i] ? "opacity-50" : ""}`}>
                        <img src={getSkillIconPath(s as LotrSkill)} alt={s} className="w-6 h-6 rounded" />
                        {!resolved.covered[i] && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            🪙
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {coinsNeeded > 0 && <div className="text-xs mt-1">Total: 🪙 {coinsNeeded}</div>}
              </div>
            )}
            {effectText && (
              <div className="mt-2 text-xs text-gray-300 bg-gray-700/50 rounded p-2">
                {effectText}
              </div>
            )}
          </div>
        </div>

        {needsRegion && regionChoices.length > 1 && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">
              {hasElves2 ? "Choose any region (Elves 2):" : "Choose region:"}
            </div>
            <div className="flex gap-2 flex-wrap">
              {regionChoices.map(r => (
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
            disabled={(!canAfford && !canChain) || (needsRegion && regionChoices.length > 1 && !chosenRegion)}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded font-bold text-sm">
            Play {!canAfford ? "(can't afford)" : canChain ? "(Free!)" : `(${coinsNeeded} 🪙)`}
          </button>
          <button onClick={() => onConfirm("DISCARD")}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold text-sm">
            Discard (+{myAllianceTokenIds?.includes("AT-HUMANS-3") ? card.chapter * 2 : card.chapter} 🪙)
          </button>
          <button onClick={onClose} className="px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm">✕</button>
        </div>
      </div>
    </div>
  );
}

interface PyramidRow {
  slots: (LotrCardSlot | null)[];
}

function getRows(slots: LotrCardSlot[], chapter: number): PyramidRow[] {
  const rowSizes = chapter === 1 ? [2, 3, 4, 5, 6] : chapter === 2 ? [6, 5, 4, 3, 2] : [2, 3, 4, 2, 4, 3, 2];
  const rows: PyramidRow[] = [];
  let idx = 0;
  for (let ri = 0; ri < rowSizes.length; ri++) {
    const size = rowSizes[ri];
    const rowSlots: (LotrCardSlot | null)[] = [];

    if (chapter === 3 && ri === 3) {
      if (idx < slots.length) rowSlots.push(slots[idx++]);
      rowSlots.push(null);
      if (idx < slots.length) rowSlots.push(slots[idx++]);
      rows.push({ slots: rowSlots });
    } else {
      for (let i = 0; i < size; i++) {
        if (idx < slots.length) rowSlots.push(slots[idx++]);
      }
      rows.push({ slots: rowSlots });
    }
  }
  return rows;
}
