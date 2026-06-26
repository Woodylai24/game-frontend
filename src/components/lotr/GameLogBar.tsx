"use client";

import { useEffect, useRef, useState } from "react";
import { LotrLogEntry } from "@/types/lotr";
import { getCardDef, getCardEffectText, getLandmarkDef, getTokenDef } from "@/lib/lotrCards";

interface Props {
  gameLog: LotrLogEntry[];
  players?: { username: string; side: string }[];
  mySide?: "FELLOWSHIP" | "SAURON";
}

const ROMAN = ["", "I", "II", "III"];

const cardColorClass = (color?: string) => {
  switch (color) {
    case "YELLOW": return "text-yellow-400";
    case "BLUE": return "text-blue-400";
    case "GREEN": return "text-green-400";
    case "RED": return "text-red-400";
    case "GREY": return "text-gray-400";
    case "PURPLE": return "text-purple-400";
    default: return "";
  }
};

const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export default function GameLogBar({ gameLog, players, mySide }: Props) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameLog.length, expanded]);

  if (!gameLog || gameLog.length === 0) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-1.5 text-xs text-gray-500">
        No actions yet
      </div>
    );
  }

  const playerName = (side: string | null) => {
    if (!side) return "";
    const username =
      players?.find((p) => p.side === side)?.username ??
      (side === "FELLOWSHIP" ? "Fellowship" : "Sauron");
    return username + (side === mySide ? " (You)" : "");
  };

  const sideColor = (side: string | null) =>
    side === "FELLOWSHIP" ? "text-sky-400" : side === "SAURON" ? "text-red-400" : "";

  const coins = (n: number) => `${n} ${n === 1 ? "coin" : "coins"}`;

  const cardSpan = (id?: string) => {
    if (!id) return <span className="font-semibold">unknown card</span>;
    const def = getCardDef(id);
    if (!def) return <span className="font-semibold">{id}</span>;
    return (
      <span className={`font-semibold ${cardColorClass(def.color)}`} title={getCardEffectText(def)}>
        {def.name}
      </span>
    );
  };

  const landmarkSpan = (id?: string) => {
    if (!id) return <span className="font-semibold">unknown landmark</span>;
    const def = getLandmarkDef(id);
    if (!def) return <span className="font-semibold">{id}</span>;
    return (
      <span className="font-semibold" title={def.effect}>
        {def.name}
      </span>
    );
  };

  const tokenSpan = (id?: string, bold = true) => {
    const cls = bold ? "font-semibold" : "";
    if (!id) return <span className={cls}>unknown token</span>;
    const def = getTokenDef(id);
    if (!def) return <span className={cls}>{id}</span>;
    return (
      <span className={cls} title={def.effect}>
        {def.name}
      </span>
    );
  };

  const renderAction = (entry: LotrLogEntry) => {
    const data = entry.data ?? {};

    // System entries (no player side)
    if (entry.action === "CHAPTER_START") {
      const ch = data.chapter ?? 0;
      return (
        <span className="text-gray-500 italic">
          — Start of Chapter {ROMAN[ch] ?? ch} —
        </span>
      );
    }

    if (entry.action === "GAME_END") {
      const winner = data.winner;
      const winnerName = winner ? playerName(winner) : null;
      const winnerCls = winner ? sideColor(winner) : "";

      switch (data.reason) {
        case "QUEST_RING":
          return (
            <>
              <span className={`${winnerCls} font-semibold`}>{winnerName}</span>
              <span className="text-gray-300"> wins by reaching the end of the Quest of the Ring</span>
            </>
          );
        case "RACES":
          return (
            <>
              <span className={`${winnerCls} font-semibold`}>{winnerName}</span>
              <span className="text-gray-300"> wins by collecting 6 different race symbols</span>
            </>
          );
        case "PRESENCE":
          return (
            <>
              <span className={`${winnerCls} font-semibold`}>{winnerName}</span>
              <span className="text-gray-300"> wins by having presence in every region</span>
            </>
          );
        case "END_OF_GAME":
          return (
            <>
              {data.isDraw ? (
                <span className="text-gray-300">Game ends in a draw — </span>
              ) : (
                <>
                  <span className={`${winnerCls} font-semibold`}>{winnerName}</span>
                  <span className="text-gray-300"> wins — </span>
                </>
              )}
              <span className="text-sky-400">Fellowship</span>
              <span className="text-gray-300">: {data.fellowshipRegions ?? 0} regions, </span>
              <span className="text-red-400">Sauron</span>
              <span className="text-gray-300">: {data.sauronRegions ?? 0} regions</span>
            </>
          );
        default:
          return <span className="text-gray-300">Game ended</span>;
      }
    }

    // Player action entries
    const name = playerName(entry.side);

    switch (entry.action) {
      case "TAKE_CARD_PLAY": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> played {cardSpan(data.cardDefId)} — paid {coins(data.coinsPaid ?? 0)}</span>
            {data.chained ? <span className="text-gray-500"> (chained)</span> : null}
            {data.region ? <span className="text-gray-400">. Placed units in {data.region}</span> : null}
          </>
        );
      }
      case "TAKE_CARD_DISCARD": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> discarded {cardSpan(data.cardDefId)} — gained {coins(data.coinsGained ?? 0)}</span>
          </>
        );
      }
      case "TAKE_LANDMARK": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> took landmark {landmarkSpan(data.tileId)} — paid {coins(data.coinsPaid ?? 0)}</span>
          </>
        );
      }
      case "STEAL_COIN": {
        const stolen = data.coinsStolen ?? 0;
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> stole {stolen === 1 ? "1 coin" : `${stolen} coins`} from the opponent</span>
          </>
        );
      }
      case "MANEUVER": {
        switch (data.maneuverType) {
          case "MOVE_UNIT":
            return (
              <>
                <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
                <span className="text-gray-300"> moved 1 unit from {data.fromRegion ?? "?"} to {data.toRegion ?? "?"}</span>
              </>
            );
          case "REMOVE_ENEMY_UNIT":
            return (
              <>
                <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
                <span className="text-gray-300"> removed enemy unit from {data.targetRegion ?? "?"}</span>
              </>
            );
          case "SKIP":
            return (
              <>
                <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
                <span className="text-gray-300"> skipped maneuver</span>
              </>
            );
          default:
            return (
              <>
                <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
                <span className="text-gray-300"> performed maneuver</span>
              </>
            );
        }
      }
      case "ALLIANCE_PICK": {
        const drawn: string[] = Array.isArray(data.drawnTokenIds) ? data.drawnTokenIds : [];
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> revealed {drawn.map((id, i) => (
              <span key={i}>
                {i > 0 && " / "}
                {tokenSpan(id, false)}
              </span>
            ))}, kept {tokenSpan(data.chosenTokenId)}</span>
          </>
        );
      }
      case "ALLIANCE_DIRECT": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> drew {tokenSpan(data.tokenId)} from the {data.race ?? "?"} stack</span>
          </>
        );
      }
      case "LANDMARK_PICK_GREY": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> discarded opponent's {cardSpan(data.cardDefId)}</span>
          </>
        );
      }
      case "PICK_DISCARD": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> picked {cardSpan(data.cardDefId)} from the discard pile</span>
          </>
        );
      }
      case "REMOVE_FORTRESS": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> removed enemy fortress from {data.targetRegion ?? "?"}</span>
          </>
        );
      }
      case "PLACE_UNIT": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> placed 1 unit in {data.targetRegion ?? "?"}</span>
          </>
        );
      }
      case "ALLIANCE_EFFECT": {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> used {data.effectType ?? "alliance effect"}{data.subAction ? `: ${data.subAction}` : ""}</span>
          </>
        );
      }
      default: {
        return (
          <>
            <span className={`${sideColor(entry.side)} font-semibold`}>{name}</span>
            <span className="text-gray-300"> performed {entry.action}</span>
          </>
        );
      }
    }
  };

  const latest = gameLog[gameLog.length - 1];

  if (expanded) {
    return (
      <div className="bg-gray-900 border-b border-gray-800">
        <div
          className="flex items-center justify-between px-4 py-1 cursor-pointer hover:bg-gray-800"
          onClick={() => setExpanded(false)}
        >
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Action Log</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            {gameLog.length} entr{gameLog.length === 1 ? "y" : "ies"}
            <ChevronUp />
          </span>
        </div>
        <div ref={scrollRef} className="px-4 pb-2 space-y-0.5 max-h-[200px] overflow-y-auto">
          {gameLog.map((e, i) => (
            <div key={i} className="text-xs leading-relaxed">
              {renderAction(e)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-900 border-b border-gray-800 px-4 py-1.5 cursor-pointer hover:bg-gray-800"
      onClick={() => setExpanded(true)}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 truncate text-xs">
          {renderAction(latest)}
        </div>
        {gameLog.length > 1 && (
          <span className="text-[10px] text-gray-500 flex-shrink-0">
            +{gameLog.length - 1} more
          </span>
        )}
        <span className="text-gray-500 flex-shrink-0">
          <ChevronDown />
        </span>
      </div>
    </div>
  );
}
