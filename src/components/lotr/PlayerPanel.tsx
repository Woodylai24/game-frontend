"use client";

import { LotrPlayerState, LotrPlayerSide, LotrCardColor, CARD_COLOR_BG } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";

interface Props {
  player: LotrPlayerState;
  isCurrentTurn: boolean;
  isOpponent?: boolean;
}

export default function PlayerPanel({ player, isCurrentTurn, isOpponent }: Props) {
  const colorGroups: Record<string, string[]> = {};
  for (const cardId of player.playedCardIds) {
    const def = getCardDef(cardId);
    if (!def) continue;
    const color = def.color;
    if (!colorGroups[color]) colorGroups[color] = [];
    colorGroups[color].push(cardId);
  }

  const fellowshipColors = player.side === "FELLOWSHIP"
    ? "bg-blue-900/30 border-blue-500" : "bg-red-900/30 border-red-500";

  return (
    <div className={`rounded-lg border-2 p-3 ${isCurrentTurn ? "ring-2 ring-yellow-400" : ""} ${fellowshipColors}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-white">
          {player.side === "FELLOWSHIP" ? "🗡️ Fellowship" : "👁️ Sauron"}
        </div>
        {isCurrentTurn && <div className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">YOUR TURN</div>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="text-yellow-400 font-bold text-lg">🪙 {player.coins}</div>
      </div>

      {player.allianceTokenIds.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-gray-400 mb-1">Alliances</div>
          <div className="flex flex-wrap gap-1">
            {player.allianceTokenIds.map(id => (
              <span key={id} className="text-[10px] bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded">{id.replace("AT-","")}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] text-gray-400 mb-1">Played Cards ({player.playedCardIds.length})</div>
        <div className="space-y-1">
          {Object.entries(colorGroups).map(([color, ids]) => (
            <div key={color} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold ${CARD_COLOR_BG[color as LotrCardColor]}`}>
                {ids.length}
              </div>
              <span className="text-[10px] text-gray-300">{color}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[10px] text-gray-400">Race Symbols</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(player.raceSymbols).filter(([, v]) => (v as number) > 0).map(([race, count]) => (
            <span key={race} className="text-[10px] bg-green-800 text-green-200 px-1.5 py-0.5 rounded">
              {race}: {count as number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
