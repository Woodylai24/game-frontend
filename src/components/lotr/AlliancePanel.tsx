"use client";

import { LotrRace, getRaceIconPath } from "@/types/lotr";
import { useLotrGameContext } from "@/context/LotrGameContext";

const RACE_LABELS: Record<string, string> = {
  ELVES: "Elves", ENTS: "Ents", HOBBITS: "Hobbits",
  HUMANS: "Humans", DWARVES: "Dwarves", WIZARDS: "Wizards",
};

export default function AlliancePanel() {
  const { state, isAlliancePhase, resolveAlliance } = useLotrGameContext();
  const triggerType = state.allianceTriggerType ?? "";
  const race = state.allianceRace;
  const drawnTokens = state.allianceDrawnTokens ?? [];
  const readOnly = !isAlliancePhase;

  if (drawnTokens.length === 0) return null;

  const subject = readOnly ? "Opponent" : "You";
  const subtitle = triggerType === "PAIR"
    ? `${subject} ${readOnly ? "has" : "have"} 2 matching ${RACE_LABELS[race ?? ""] ?? race} symbols!`
    : `${subject} ${readOnly ? "has" : "have"} 3 different race symbols!`;

  const getAllianceImagePath = (tokenId: string) => {
    const parts = tokenId.split("-");
    const tokenRace = parts[1] || "";
    const num = parts[2] || "";
    const raceLabel = tokenRace.charAt(0) + tokenRace.slice(1).toLowerCase();
    return `/lotr/alliances/${raceLabel}_${num}.png`;
  };

  return (
    <div className="bg-teal-900/70 border border-teal-500 rounded-lg p-4">
      <div className="text-sm font-bold text-teal-200 mb-1">Alliance Token Selection</div>
      <div className="text-xs text-teal-300 mb-3">{subtitle} {readOnly ? "" : "Choose an Alliance Token:"}</div>
      <div className="flex flex-wrap gap-3 justify-center">
        {drawnTokens.map(token => (
          <button
            key={token.id}
            onClick={() => !readOnly && resolveAlliance(token.id)}
            disabled={readOnly}
            className={`bg-gray-800 border-2 border-teal-600 rounded-lg p-3 w-44 text-left transition-colors
              ${readOnly ? "cursor-default opacity-80" : "hover:border-teal-400 hover:bg-gray-700 cursor-pointer"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <img src={getRaceIconPath(token.race as LotrRace)} alt={token.race} className="w-6 h-6 rounded" />
              <img src={getAllianceImagePath(token.id)} alt={token.name} className="w-6 h-6 rounded" />
            </div>
            <div className="text-[10px] text-gray-400 leading-tight">{token.effect}</div>
          </button>
        ))}
      </div>
      {readOnly && (
        <div className="text-xs text-teal-400 mt-2 text-center">Waiting for opponent to select...</div>
      )}
    </div>
  );
}
