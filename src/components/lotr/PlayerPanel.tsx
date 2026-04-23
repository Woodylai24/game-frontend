"use client";

import { LotrPlayerState, LotrCardColor, LotrRace, LotrSkill, getCardImagePath, getRaceIconPath, getSkillIconPath } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";

const COLOR_ORDER: LotrCardColor[] = ["RED", "GREEN", "BLUE", "GREY", "PURPLE", "YELLOW"];

interface Props {
  player: LotrPlayerState;
  isCurrentTurn: boolean;
  isOpponent?: boolean;
}

export default function PlayerPanel({ player, isCurrentTurn }: Props) {
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
        <div className="relative" style={{ height: sortedCards.length > 0 ? `${40 + (sortedCards.length - 1) * 22}px` : "0px" }}>
          {sortedCards.map((cardId, i) => {
            const def = getCardDef(cardId);
            if (!def) return null;
            return (
              <div key={cardId}
                className="absolute left-0 right-0 overflow-hidden rounded border border-gray-600"
                style={{ top: `${i * 22}px`, height: "40px" }}>
                <img src={getCardImagePath(def.id, def.chapter)} alt={def.name}
                  className="w-full h-auto object-contain" style={{ marginTop: "-2px" }} />
              </div>
            );
          })}
        </div>
      </div>

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
        </div>
      </div>

      {(fixedSkills.length > 0 || optionSkillGroups.length > 0) && (
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
          </div>
        </div>
      )}
    </div>
  );
}
