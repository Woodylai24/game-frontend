"use client";

import { useState } from "react";
import { LotrPlayerState, LotrCardColor, LotrRace, LotrSkill, getCardImagePath, getRaceIconPath, getSkillIconPath } from "@/types/lotr";
import { getCardDef, getTokenDef } from "@/lib/lotrCards";

const COLOR_ORDER: LotrCardColor[] = ["RED", "GREEN", "BLUE", "GREY", "PURPLE", "YELLOW"];

interface Props {
  player: LotrPlayerState;
  isCurrentTurn: boolean;
  isOpponent?: boolean;
  playerName?: string;
}

export default function PlayerPanel({ player, isCurrentTurn, isOpponent, playerName }: Props) {
  const sortedCards = [...player.playedCardIds].sort((a, b) => {
    const da = getCardDef(a);
    const db = getCardDef(b);
    if (!da || !db) return 0;
    return COLOR_ORDER.indexOf(da.color) - COLOR_ORDER.indexOf(db.color);
  });

  const fixedSkills: LotrSkill[] = [];
  const optionSkillGroups: LotrSkill[][] = [];
  for (const cardId of player.playedCardIds) {
    const def = getCardDef(cardId);
    if (def?.color === "GREY" && def.greySkills) {
      if (def.greySkills.length === 1) {
        fixedSkills.push(...def.greySkills[0]);
      } else {
        optionSkillGroups.push(def.greySkills.map(choice => choice[0]));
      }
    }
  }

  const [cardsExpanded, setCardsExpanded] = useState(false);
  const cardExposedHeight = 120;
  const cardOverlap = 25;

  const fellowshipColors = player.side === "FELLOWSHIP"
    ? "bg-blue-900/30 border-blue-500" : "bg-red-900/30 border-red-500";

  return (
    <div className={`rounded-lg border-2 p-3 ${isCurrentTurn ? "ring-2 ring-yellow-400" : ""} ${fellowshipColors}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-white">
          {player.side === "FELLOWSHIP" ? "🗡️ Fellowship" : "👁️ Sauron"}{playerName ? ` (${playerName})` : ""}
        </div>
        {isCurrentTurn && <div className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">{isOpponent ? "THEIR TURN" : "YOUR TURN"}</div>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="text-yellow-400 font-bold text-lg">🪙 {player.coins}</div>
      </div>

      <div>
        <button
          onClick={() => setCardsExpanded(e => !e)}
          className="flex items-center gap-1 text-[10px] text-gray-400 mb-1 hover:text-gray-200 w-full text-left"
        >
          <span className="text-[8px]">{cardsExpanded ? "▼" : "▶"}</span>
          Played Cards ({player.playedCardIds.length})
        </button>
        {cardsExpanded && sortedCards.length > 0 && (
          <div
            className="relative overflow-hidden"
            style={{ height: `${cardExposedHeight + (sortedCards.length - 1) * cardOverlap}px` }}
          >
            {sortedCards.map((cardId, i) => {
              const def = getCardDef(cardId);
              if (!def) return null;
              return (
                <div key={cardId}
                  className="absolute overflow-hidden rounded border border-gray-600"
                  style={{
                    top: `${i * cardOverlap}px`,
                    height: `${cardExposedHeight}px`,
                    width: "80px",
                  }}>
                  <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                    className="w-full h-full object-cover object-top" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {player.allianceTokenIds.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-gray-400 mb-1">Alliances</div>
          <div className="flex flex-wrap gap-1">
            {player.allianceTokenIds.map(id => {
              const def = getTokenDef(id);
              const parts = id.split("-");
              const race = parts[1] || "";
              const num = parts[2] || "";
              const raceLabel = race.charAt(0) + race.slice(1).toLowerCase();
              const imgPath = `/lotr/alliances/${raceLabel}_${num}.png`;
              const tooltip = def ? `${def.name}: ${def.effect}` : id;
              return (
                <img key={id} src={imgPath} alt={def?.name ?? id}
                  className="w-8 h-8 rounded" title={tooltip} />
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="text-[10px] text-gray-400 mb-1">Race Symbols</div>
        <div className="flex flex-wrap gap-1">
          {(Object.entries(player.raceSymbols) as [LotrRace, number][]).filter(([, v]) => v > 0).map(([race, count]) => (
            <div key={race} className="flex items-center gap-0.5">
              {Array.from({ length: count }).map((_, i) => (
                <img key={i} src={getRaceIconPath(race)} alt={race} className="w-5 h-5 rounded" title={race} />
              ))}
            </div>
          ))}
          {player.allianceTokenIds.includes("AT-HOBBITS-1") && (
            <div className="flex items-center gap-0.5" title="Eagle (Hobbits 1)">
              <img src="/lotr/Icons/Races/Eagle.png" alt="Eagle" className="w-5 h-5 rounded" title="Eagle" />
            </div>
          )}
        </div>
      </div>

      {(fixedSkills.length > 0 || optionSkillGroups.length > 0 || player.allianceTokenIds.includes("AT-ELVES-3")) && (
        <div className="mt-2">
          <div className="text-[10px] text-gray-400 mb-1">Skills</div>
          <div className="flex flex-wrap gap-1 items-center">
            {fixedSkills.map((skill, i) => (
              <img key={`f-${i}`} src={getSkillIconPath(skill)} alt={skill}
                className="w-5 h-5 rounded" title={skill} />
            ))}
            {optionSkillGroups.map((group, gi) => (
              <div key={`o-${gi}`} className="flex items-center gap-0.5 bg-gray-700/50 rounded px-1 py-0.5">
                {group.map((skill, si) => (
                  <span key={si} className="flex items-center">
                    {si > 0 && <span className="text-[10px] text-gray-400 mx-0.5">/</span>}
                    <img src={getSkillIconPath(skill)} alt={skill}
                      className="w-5 h-5 rounded" title={skill} />
                  </span>
                ))}
              </div>
            ))}
            {player.allianceTokenIds.includes("AT-ELVES-3") && (
              <div className="flex items-center gap-0.5 bg-gradient-to-br from-purple-700 to-yellow-600 rounded px-1 py-0.5 border border-yellow-400" title="Wild (Elves 3): once per turn, counts as any skill">
                <span className="text-[10px] font-bold text-yellow-200">W</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(() => {
        const chainSymbols = new Set<string>();
        for (const cardId of player.playedCardIds) {
          const def = getCardDef(cardId);
          if (def?.chainingSymbol) chainSymbols.add(def.chainingSymbol);
        }
        if (chainSymbols.size === 0) return null;
        return (
          <div className="mt-2">
            <div className="text-[10px] text-gray-400 mb-1">Chaining Symbols</div>
            <div className="flex flex-wrap gap-1">
              {[...chainSymbols].map(sym => (
                <img key={sym} src={`/lotr/Chains/${sym.toLowerCase()}.png`} alt={sym}
                  className="w-6 h-6 rounded" title={sym} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
