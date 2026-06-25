"use client";

import { useEffect, useRef, useState } from "react";
import { LotrLogEntry } from "@/types/lotr";
import { getCardDef, getCardEffectText, getLandmarkDef, getTokenDef } from "@/lib/lotrCards";

interface Props {
  gameLog: LotrLogEntry[];
  players?: { username: string; side: string }[];
  mySide?: "FELLOWSHIP" | "SAURON";
}

export default function GameLogBar({ gameLog, players, mySide }: Props) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest entry when the list grows or the bar is expanded.
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

  const playerName = (side: string) => {
    const username =
      players?.find((p) => p.side === side)?.username ??
      (side === "FELLOWSHIP" ? "Fellowship" : "Sauron");
    return username + (side === mySide ? " (You)" : "");
  };

  const sideColor = (side: string) =>
    side === "FELLOWSHIP" ? "text-sky-400" : "text-red-400";

  const capitalize = (s?: string) =>
    s ? s.charAt(0) + s.slice(1).toLowerCase() : "";

  const cardSpan = (id?: string, bold = true) => {
    const cls = bold ? "font-semibold" : "";
    if (!id) return <span className={cls}>unknown card</span>;
    const def = getCardDef(id);
    if (!def) return <span className={cls}>{id}</span>;
    return (
      <span className={cls} title={getCardEffectText(def)}>
        {def.name}
      </span>
    );
  };

  const landmarkSpan = (id?: string, bold = true) => {
    const cls = bold ? "font-semibold" : "";
    if (!id) return <span className={cls}>unknown landmark</span>;
    const def = getLandmarkDef(id);
    if (!def) return <span className={cls}>{id}</span>;
    return (
      <span className={cls} title={def.effect}>
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
    switch (entry.action) {
      case "TAKE_CARD_PLAY": {
        const def = data.cardDefId ? getCardDef(data.cardDefId) : undefined;
        return (
          <>
            played {cardSpan(data.cardDefId)} ({def ? capitalize(def.color) : "?"}) — paid {data.coinsPaid ?? 0} coin(s)
            {data.chained ? " (chained)" : ""}
            {data.region ? `. Placed units in ${data.region}` : ""}
          </>
        );
      }
      case "TAKE_CARD_DISCARD": {
        const def = data.cardDefId ? getCardDef(data.cardDefId) : undefined;
        return (
          <>
            discarded {cardSpan(data.cardDefId)} ({def ? capitalize(def.color) : "?"}) — gained {data.coinsGained ?? 0} coin(s)
          </>
        );
      }
      case "TAKE_LANDMARK": {
        return (
          <>
            took {landmarkSpan(data.tileId)} — paid {data.coinsPaid ?? 0} coin(s)
          </>
        );
      }
      case "MANEUVER": {
        switch (data.maneuverType) {
          case "MOVE_UNIT":
            return (
              <>
                moved 1 unit from {data.fromRegion ?? "?"} to {data.toRegion ?? "?"}
              </>
            );
          case "MOVE_FORTRESS":
            return (
              <>
                moved fortress from {data.fromRegion ?? "?"} to {data.toRegion ?? "?"}
              </>
            );
          case "SKIP":
            return <>skipped maneuver</>;
          default:
            return <>performed maneuver</>;
        }
      }
      case "ALLIANCE_PICK": {
        const drawn: string[] = Array.isArray(data.drawnTokenIds) ? data.drawnTokenIds : [];
        return (
          <>
            revealed {tokenSpan(drawn[0], false)} / {tokenSpan(drawn[1], false)}, kept {tokenSpan(data.chosenTokenId)}
          </>
        );
      }
      case "ALLIANCE_DIRECT": {
        return (
          <>
            drew {tokenSpan(data.tokenId)} from the {data.race ? capitalize(data.race) : "?"} stack
          </>
        );
      }
      case "LANDMARK_PICK_GREY": {
        return <>discarded opponent's {cardSpan(data.cardDefId)}</>;
      }
      case "PICK_DISCARD": {
        return <>picked {cardSpan(data.cardDefId)} from the discard pile</>;
      }
      case "REMOVE_FORTRESS": {
        return <>removed enemy fortress from {data.targetRegion ?? "?"}</>;
      }
      case "PLACE_UNIT": {
        return <>placed 1 unit in {data.targetRegion ?? "?"}</>;
      }
      case "ALLIANCE_EFFECT": {
        return (
          <>
            used {data.effectType ?? "alliance effect"}
            {data.subAction ? `: ${data.subAction}` : ""}
          </>
        );
      }
      default: {
        return <>performed {entry.action}</>;
      }
    }
  };

  const renderEntry = (entry: LotrLogEntry) => (
    <>
      <span className={`${sideColor(entry.side)} font-semibold`}>{playerName(entry.side)}</span>{" "}
      {renderAction(entry)}
    </>
  );

  const latest = gameLog[gameLog.length - 1];

  if (expanded) {
    return (
      <div className="bg-gray-900 border-b border-gray-800">
        <div
          className="flex items-center justify-between px-4 py-1 cursor-pointer hover:bg-gray-800"
          onClick={() => setExpanded(false)}
        >
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Action Log</span>
          <span className="text-[10px] text-gray-500">
            {gameLog.length} entr{gameLog.length === 1 ? "y" : "ies"} · Collapse
          </span>
        </div>
        <div ref={scrollRef} className="px-4 pb-2 space-y-0.5 max-h-[200px] overflow-y-auto">
          {gameLog.map((e, i) => (
            <div key={i} className="text-xs text-gray-300 leading-relaxed">
              {renderEntry(e)}
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
        <div className="flex-1 min-w-0 truncate text-xs text-gray-300">
          {renderEntry(latest)}
        </div>
        {gameLog.length > 1 && (
          <span className="text-[10px] text-gray-500 flex-shrink-0">
            +{gameLog.length - 1} more
          </span>
        )}
      </div>
    </div>
  );
}
