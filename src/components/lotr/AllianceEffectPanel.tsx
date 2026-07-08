"use client";

import { useState, useRef } from "react";
import { LotrCardDef, LotrRegion, REGION_ADJACENCY } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";

interface Props {
  effectType: string;
  effectSubPhase: string;
  counter: number;
  selectedRegions: string[];
  discardPile: string[];
  mySide: "FELLOWSHIP" | "SAURON" | undefined;
  regions: { region: LotrRegion; fortress: string | null; units: number }[];
  onResolve: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export default function AllianceEffectPanel({
  effectType, effectSubPhase, counter, selectedRegions,
  discardPile, mySide, regions, onResolve, readOnly,
}: Props) {
  if (readOnly) {
    return (
      <div className="bg-teal-900/70 border border-teal-500 rounded-lg p-3">
        <div className="text-sm font-bold text-teal-200">Alliance Effect — Opponent is resolving...</div>
      </div>
    );
  }

  switch (effectType) {
    case "ENTS2_FORTRESS":
      return <Ents2FortressPanel regions={regions} mySide={mySide} onResolve={onResolve} />;
    case "ENTS3_CHOICE":
      return <Ents3ChoicePanel counter={counter} effectSubPhase={effectSubPhase} regions={regions} mySide={mySide} onResolve={onResolve} />;
    case "WIZARDS2_UNITS":
      return <Wizards2UnitsPanel selectedRegions={selectedRegions} regions={regions} mySide={mySide} onResolve={onResolve} />;
    case "WIZARDS3_DISCARD":
      return <Wizards3DiscardPanel discardPile={discardPile} onResolve={onResolve} />;
    default:
      return null;
  }
}

function Ents2FortressPanel({ regions, mySide, onResolve }: {
  regions: { region: LotrRegion; fortress: string | null; units: number }[];
  mySide: "FELLOWSHIP" | "SAURON" | undefined;
  onResolve: (data: Record<string, unknown>) => void;
}) {
  const enemyFortresses = regions.filter(r => r.fortress !== null && r.fortress !== mySide);

  return (
    <div className="bg-orange-900/70 border border-orange-500 rounded-lg p-4">
      <div className="text-sm font-bold text-orange-200 mb-2">Ent Wrath — Remove Enemy Fortress</div>
      <div className="text-xs text-orange-300 mb-3">Click an enemy fortress region to remove it:</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {enemyFortresses.map(r => (
          <button key={r.region} onClick={() => onResolve({ action: "REMOVE", targetRegion: r.region })}
            className="bg-gray-700 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-bold border border-red-600">
            {r.region}
          </button>
        ))}
      </div>
      <button onClick={() => onResolve({ action: "SKIP" })}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Skip</button>
    </div>
  );
}

function Ents3ChoicePanel({ counter, effectSubPhase, regions, mySide, onResolve }: {
  counter: number;
  effectSubPhase: string;
  regions: { region: LotrRegion; fortress: string | null; units: number }[];
  mySide: "FELLOWSHIP" | "SAURON" | undefined;
  onResolve: (data: Record<string, unknown>) => void;
}) {
  // Local sub-phase for REMOVE_UNIT and MOVE_UNIT — these need region selection before sending to backend
  // STEAL_COIN goes directly to backend since it's automatic
  const [localSubPhase, setLocalSubPhase] = useState<string>("CHOOSE_ACTION");

  // Reset local sub-phase when counter changes (new round)
  const prevCounter = useRef(counter);
  if (prevCounter.current !== counter) {
    prevCounter.current = counter;
    setLocalSubPhase("CHOOSE_ACTION");
  }

  // Use effectSubPhase from state if it's already a region-selection sub-phase (e.g. after re-render from state update)
  const activeSubPhase = effectSubPhase === "REMOVE_UNIT" || effectSubPhase === "MOVE_UNIT" ? effectSubPhase : localSubPhase;

  if (activeSubPhase === "REMOVE_UNIT") {
    const enemyUnitRegions = regions.filter(r =>
      mySide === "FELLOWSHIP" ? r.units < 0 : r.units > 0
    );
    return (
      <div className="bg-orange-900/70 border border-orange-500 rounded-lg p-4">
        <div className="text-sm font-bold text-orange-200 mb-2">Remove Enemy Unit — Choices left: {counter}</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {enemyUnitRegions.map(r => (
            <button key={r.region} onClick={() => onResolve({ action: "REMOVE_UNIT", targetRegion: r.region })}
              className="bg-gray-700 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-bold border border-red-600">
              {r.region} ({Math.abs(r.units)} units)
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLocalSubPhase("CHOOSE_ACTION")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Back</button>
          <button onClick={() => onResolve({ action: "SKIP" })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Skip All</button>
        </div>
      </div>
    );
  }

  if (activeSubPhase === "MOVE_UNIT") {
    const ownUnitRegions = regions.filter(r =>
      mySide === "FELLOWSHIP" ? r.units > 0 : r.units < 0
    );
    return (
      <div className="bg-orange-900/70 border border-orange-500 rounded-lg p-4">
        <div className="text-sm font-bold text-orange-200 mb-2">Complete 1 Movement — Choices left: {counter}</div>
        <MoveUnitSelector regions={regions} ownUnitRegions={ownUnitRegions} mySide={mySide} onResolve={onResolve} />
        <div className="flex gap-2 mt-2">
          <button onClick={() => setLocalSubPhase("CHOOSE_ACTION")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Back</button>
          <button onClick={() => onResolve({ action: "SKIP" })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Skip All</button>
        </div>
      </div>
    );
  }

  // CHOOSE_ACTION — main choice screen
  return (
    <div className="bg-orange-900/70 border border-orange-500 rounded-lg p-4">
      <div className="text-sm font-bold text-orange-200 mb-2">Ent Fury — Choices remaining: {counter}/3</div>
      <div className="text-xs text-orange-300 mb-3">Choose one action:</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setLocalSubPhase("REMOVE_UNIT")}
          className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold">
          Remove Enemy Unit
        </button>
        <button onClick={() => onResolve({ action: "STEAL_COIN" })}
          className="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-bold">
          Opponent Loses 1 Coin
        </button>
        <button onClick={() => setLocalSubPhase("MOVE_UNIT")}
          className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">
          Complete 1 Movement
        </button>
      </div>
      <button onClick={() => onResolve({ action: "SKIP" })}
        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm mt-3">Skip All Remaining</button>
    </div>
  );
}

function MoveUnitSelector({ regions, ownUnitRegions, mySide, onResolve }: {
  regions: { region: LotrRegion; fortress: string | null; units: number }[];
  ownUnitRegions: { region: LotrRegion; fortress: string | null; units: number }[];
  mySide: "FELLOWSHIP" | "SAURON" | undefined;
  onResolve: (data: Record<string, unknown>) => void;
}) {
  return (
    <div className="text-xs text-orange-300">
      <div className="mb-1">Select from region, then to region:</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {ownUnitRegions.map(r => {
          const adjacent = (REGION_ADJACENCY[r.region] || []).filter(adj => adj !== r.region);
          return (
            <div key={r.region} className="flex flex-col items-center gap-1">
              <span className="text-orange-200 font-bold">{r.region}</span>
              <div className="flex gap-1">
                {adjacent.map(to => (
                  <button key={to} onClick={() => onResolve({ action: "MOVE_UNIT", fromRegion: r.region, toRegion: to })}
                    className="bg-gray-600 hover:bg-blue-600 text-white px-2 py-1 rounded text-[10px]">
                    → {to}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Wizards2UnitsPanel({ selectedRegions, regions: _regions, mySide: _mySide, onResolve }: {
  selectedRegions: string[];
  regions: { region: LotrRegion; fortress: string | null; units: number }[];
  mySide: "FELLOWSHIP" | "SAURON" | undefined;
  onResolve: (data: Record<string, unknown>) => void;
}) {
  const allRegions: LotrRegion[] = ["LINDON", "ARNOR", "RHOVANION", "ENEDWAITH", "ROHAN", "GONDOR", "MORDOR"];
  const unitLabel = selectedRegions.length === 1 ? "2 units" : selectedRegions.length === 2 ? "1 unit each" : "none";

  return (
    <div className="bg-indigo-900/70 border border-indigo-500 rounded-lg p-4">
      <div className="text-sm font-bold text-indigo-200 mb-2">Wizard&apos;s Aid — Place Units</div>
      <div className="text-xs text-indigo-300 mb-1">
        Select 1 region (2 units) or 2 regions (1 unit each). Selected: {selectedRegions.length} → {unitLabel}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {allRegions.map(r => {
          const isSelected = selectedRegions.includes(r);
          return (
            <button key={r}
              onClick={() => onResolve({ action: "SELECT_REGION", region: r })}
              className={`px-3 py-1.5 rounded text-sm font-bold border ${
                isSelected ? "bg-indigo-700 border-indigo-400 text-white" : "bg-gray-700 border-gray-600 text-gray-300"
              }`}>
              {r}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={() => {
          if (selectedRegions.length > 0) onResolve({ action: "CONFIRM", regions: selectedRegions });
        }}
          disabled={selectedRegions.length === 0}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-bold">
          Confirm
        </button>
        <button onClick={() => onResolve({ action: "CANCEL" })}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">
          Clear
        </button>
      </div>
    </div>
  );
}

function Wizards3DiscardPanel({ discardPile, onResolve }: {
  discardPile: string[];
  onResolve: (data: Record<string, unknown>) => void;
}) {
  return (
    <div className="bg-violet-900/70 border border-violet-500 rounded-lg p-4">
      <div className="text-sm font-bold text-violet-200 mb-2">Wizard&apos;s Insight — Pick a Discard Card</div>
      <div className="text-xs text-violet-300 mb-3">Choose a card from the discard pile to play for free:</div>
      <div className="flex flex-wrap gap-2">
        {discardPile.map(cardId => {
          const def: LotrCardDef | undefined = getCardDef(cardId);
          if (!def) return null;
          return (
            <button key={cardId} onClick={() => onResolve({ action: "PICK", cardDefId: cardId })}
              className="bg-gray-800 border-2 border-violet-600 rounded-lg p-2 w-32 text-left hover:border-violet-400 hover:bg-gray-700">
              <div className="text-xs font-bold text-white">{def.name}</div>
              <div className="text-[10px] text-gray-400">{def.color} · Ch.{def.chapter}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
