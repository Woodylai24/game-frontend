"use client";

import { useState } from "react";
import { LotrRegion, LotrRegionState, LotrManeuverType, REGION_ADJACENCY, REGION_POSITIONS, getRegionIconPath } from "@/types/lotr";
import { useLotrGameContext } from "@/context/LotrGameContext";

const REGION_LABELS: Record<LotrRegion, string> = {
  LINDON: "Lindon", ARNOR: "Arnor", RHOVANION: "Rhovanion",
  ENEDWAITH: "Enedwaith", ROHAN: "Rohan", GONDOR: "Gondor", MORDOR: "Mordor",
};

export default function RegionMap() {
  const {
    state, mySide, isFinished,
    isManeuverPhase, isRemoveFortressPhase, isPlaceUnitPhase, isLandmarkMovement,
    resolveManeuver: onResolveManeuver,
    resolveRemoveFortress: onResolveRemoveFortress,
    resolvePlaceUnit: onResolvePlaceUnit,
    resolveLandmark: onResolveLandmark,
  } = useLotrGameContext();

  const regions = state.regions;
  const pendingManeuvers = (state.pendingManeuvers ?? []) as LotrManeuverType[];
  // The board used to gate these with !isFinished; replicate that so the map
  // stays non-interactive once the game is over.
  const activeManeuver = !isFinished && isManeuverPhase;
  const activeRemoveFortress = !isFinished && isRemoveFortressPhase;
  const activePlaceUnit = !isFinished && isPlaceUnitPhase;
  const activeLandmarkMovement = !isFinished && isLandmarkMovement;

  const [selectedFromRegion, setSelectedFromRegion] = useState<LotrRegion | null>(null);
  const [selectedToRegion, setSelectedToRegion] = useState<LotrRegion | null>(null);
  const [pendingRemoveRegion, setPendingRemoveRegion] = useState<LotrRegion | null>(null);
  const [pendingPhaseRegion, setPendingPhaseRegion] = useState<LotrRegion | null>(null);

  const getRegionState = (r: LotrRegion) => regions.find(rs => rs.region === r);

  const hasRemoveEnemy = pendingManeuvers?.includes("REMOVE_ENEMY_UNIT") ?? false;
  const hasMoveUnit = pendingManeuvers?.includes("MOVE_UNIT") ?? false;

  const isClickableForRemove = (state: LotrRegionState | undefined) => {
    if (!state || !mySide) return false;
    return mySide === "FELLOWSHIP" ? state.units < 0 : state.units > 0;
  };

  const isClickableForMove = (state: LotrRegionState | undefined) => {
    if (!state || !mySide) return false;
    return mySide === "FELLOWSHIP" ? state.units > 0 : state.units < 0;
  };

  const isEnemyFortress = (state: LotrRegionState | undefined) => {
    if (!state || !mySide) return false;
    return state.fortress !== null && state.fortress !== mySide;
  };

  const clearAll = () => {
    setSelectedFromRegion(null);
    setSelectedToRegion(null);
    setPendingRemoveRegion(null);
    setPendingPhaseRegion(null);
  };

  const handleRegionClick = (region: LotrRegion) => {
    const state = getRegionState(region);
    if (!state) return;

    // Place unit phase — ALL regions clickable
    if (activePlaceUnit) {
      if (pendingPhaseRegion || pendingRemoveRegion || selectedToRegion) return;
      setPendingPhaseRegion(region);
      return;
    }

    // Remove fortress phase — only enemy fortress regions clickable
    if (activeRemoveFortress) {
      if (pendingPhaseRegion || pendingRemoveRegion || selectedToRegion) return;
      if (isEnemyFortress(state)) {
        setPendingPhaseRegion(region);
      }
      return;
    }

    if (activeLandmarkMovement && mySide) {
      if (selectedFromRegion && !selectedToRegion) {
        if (selectedFromRegion === region) {
          setSelectedFromRegion(null);
          return;
        }
        const adj = REGION_ADJACENCY[selectedFromRegion];
        if (adj?.includes(region)) {
          setSelectedToRegion(region);
        }
        return;
      }

      if (pendingRemoveRegion || selectedToRegion) return;

      if (isClickableForMove(state)) {
        setSelectedFromRegion(region);
        return;
      }
      return;
    }

    if (!activeManeuver || !mySide) return;

    // If selecting move destination
    if (selectedFromRegion && !selectedToRegion) {
      if (selectedFromRegion === region) {
        setSelectedFromRegion(null);
        return;
      }
      const adj = REGION_ADJACENCY[selectedFromRegion];
      if (adj?.includes(region)) {
        setSelectedToRegion(region);
      }
      return;
    }

    // Don't allow new selections while confirmation is pending
    if (pendingRemoveRegion || selectedToRegion) return;

    if (hasRemoveEnemy && isClickableForRemove(state)) {
      setPendingRemoveRegion(region);
      return;
    }

    if (hasMoveUnit && isClickableForMove(state)) {
      setSelectedFromRegion(region);
      return;
    }
  };

  const isAdjacentToSelected = (region: LotrRegion) => {
    if (!selectedFromRegion) return false;
    return REGION_ADJACENCY[selectedFromRegion]?.includes(region) ?? false;
  };

  return (
    <div className="relative w-full" style={{ paddingBottom: "100%" }}>
      <svg viewBox="0 0 85 90" className="absolute inset-0 w-full h-full">
        {Object.entries(REGION_ADJACENCY).map(([from, adj]) =>
          adj.map(to => {
            const p1 = REGION_POSITIONS[from as LotrRegion];
            const p2 = REGION_POSITIONS[to as LotrRegion];
            const key = [from, to].sort().join("-");
            const isHighlightLine = selectedFromRegion &&
              ((from === selectedFromRegion && adj.includes(to as LotrRegion) && to === REGION_ADJACENCY[selectedFromRegion]?.find(r => r === to)) ||
               (to === selectedFromRegion && from === REGION_ADJACENCY[selectedFromRegion]?.find(r => r === from)));
            return (
              <line key={key} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={isHighlightLine ? "#a855f7" : "#94a3b8"}
                strokeWidth={isHighlightLine ? "1" : "0.5"}
                strokeDasharray={isHighlightLine ? "none" : "2,2"} />
            );
          })
        )}
        {(Object.keys(REGION_POSITIONS) as LotrRegion[]).map(region => {
          const pos = REGION_POSITIONS[region];
          const state = getRegionState(region);
          const fellowshipUnits = Math.max(0, state?.units ?? 0);
          const sauronUnits = Math.max(0, -(state?.units ?? 0));
          const fortressOwner = state?.fortress;

          const isRemoveTarget = activeManeuver && hasRemoveEnemy && isClickableForRemove(state);
          const isMoveSource = activeManeuver && hasMoveUnit && isClickableForMove(state) && !selectedFromRegion && !pendingRemoveRegion;
          const isSelected = selectedFromRegion === region;
          const isMoveTarget = selectedFromRegion && !selectedToRegion && isAdjacentToSelected(region);

          const isPlaceUnitTarget = activePlaceUnit && !pendingPhaseRegion;
          const isRemoveFortressTarget = activeRemoveFortress && isEnemyFortress(state) && !pendingPhaseRegion;

          const isLandmarkMoveSource = activeLandmarkMovement && isClickableForMove(state) && !selectedFromRegion;
          const isLandmarkMoveTarget = activeLandmarkMovement && selectedFromRegion && !selectedToRegion && isAdjacentToSelected(region);

          const isClickable = isRemoveTarget || isMoveSource || isMoveTarget || isSelected || isPlaceUnitTarget || isRemoveFortressTarget || isLandmarkMoveSource || isLandmarkMoveTarget;
          const highlightColor = isSelected || selectedToRegion === region ? "#a855f7"
            : pendingRemoveRegion === region ? "#ef4444"
            : pendingPhaseRegion === region ? "#f59e0b"
            : isRemoveTarget ? "#ef4444"
            : isMoveSource || isMoveTarget ? "#3b82f6"
            : isLandmarkMoveSource || isLandmarkMoveTarget ? "#10b981"
            : isRemoveFortressTarget ? "#f97316"
            : isPlaceUnitTarget ? "#3b82f6"
            : null;

          return (
            <g key={region}
              onClick={() => handleRegionClick(region)}
              style={isClickable ? { cursor: "pointer" } : undefined}>
              <circle cx={pos.x} cy={pos.y} r="7"
                fill={isSelected || selectedToRegion === region ? "#7c3aed" : highlightColor ? `${highlightColor}33` : "#1e293b"}
                stroke={highlightColor || (isSelected ? "#a855f7" : "#475569")}
                strokeWidth={highlightColor || isSelected ? "1.5" : "0.5"} />
              <image href={getRegionIconPath(region)}
                x={pos.x - 5} y={pos.y - 5}
                width="10" height="10"
                opacity="0.3" preserveAspectRatio="xMidYMid slice" />
              {fortressOwner && (
                <rect x={pos.x - 3} y={pos.y - 10} width="6" height="5" rx="1"
                  fill={fortressOwner === "FELLOWSHIP" ? "#3b82f6" : "#ef4444"} />
              )}
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" fill="#e2e8f0" fontSize="3" fontWeight="bold">
                {REGION_LABELS[region]}
              </text>
              {fellowshipUnits > 0 && (
                <g>
                  <circle cx={pos.x - 4} cy={pos.y + 5} r="2.5" fill="#3b82f6" />
                  <text x={pos.x - 4} y={pos.y + 6} textAnchor="middle" fill="white" fontSize="2.5">
                    {fellowshipUnits}
                  </text>
                </g>
              )}
              {sauronUnits > 0 && (
                <g>
                  <circle cx={pos.x + 4} cy={pos.y + 5} r="2.5" fill="#ef4444" />
                  <text x={pos.x + 4} y={pos.y + 6} textAnchor="middle" fill="white" fontSize="2.5">
                    {sauronUnits}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Place unit phase confirmation */}
      {activePlaceUnit && pendingPhaseRegion && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800 border border-blue-600 rounded-lg px-3 py-2 shadow-lg">
          <span className="text-xs text-white">
            Place unit in <strong>{REGION_LABELS[pendingPhaseRegion]}</strong>?
          </span>
          <button onClick={() => {
            onResolvePlaceUnit("RESOLVE", pendingPhaseRegion);
            setPendingPhaseRegion(null);
          }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">
            Place
          </button>
          <button onClick={() => setPendingPhaseRegion(null)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold">
            Cancel
          </button>
        </div>
      )}

      {/* Remove fortress phase confirmation */}
      {activeRemoveFortress && pendingPhaseRegion && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800 border border-orange-600 rounded-lg px-3 py-2 shadow-lg">
          <span className="text-xs text-white">
            Remove enemy fortress from <strong>{REGION_LABELS[pendingPhaseRegion]}</strong>?
          </span>
          <button onClick={() => {
            onResolveRemoveFortress("RESOLVE", pendingPhaseRegion);
            setPendingPhaseRegion(null);
          }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs font-bold">
            Remove
          </button>
          <button onClick={() => setPendingPhaseRegion(null)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold">
            Cancel
          </button>
        </div>
      )}

      {/* Remove enemy unit confirmation */}
      {pendingRemoveRegion && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-lg">
          <span className="text-xs text-white">
            Remove enemy unit from <strong>{REGION_LABELS[pendingRemoveRegion]}</strong>?
          </span>
          <button onClick={() => {
            onResolveManeuver("REMOVE_ENEMY_UNIT", pendingRemoveRegion);
            setPendingRemoveRegion(null);
          }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold">
            Remove
          </button>
          <button onClick={() => setPendingRemoveRegion(null)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold">
            Cancel
          </button>
        </div>
      )}

      {/* Move unit confirmation (maneuver or landmark) */}
      {selectedFromRegion && selectedToRegion && !activePlaceUnit && !activeRemoveFortress && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-lg">
          <span className="text-xs text-white">
            Move unit <strong>{REGION_LABELS[selectedFromRegion]}</strong> → <strong>{REGION_LABELS[selectedToRegion]}</strong>?
          </span>
          <button onClick={() => {
            if (activeLandmarkMovement) {
              onResolveLandmark("MOVEMENT", { fromRegion: selectedFromRegion, toRegion: selectedToRegion });
            } else {
              onResolveManeuver("MOVE_UNIT", undefined, selectedFromRegion, selectedToRegion);
            }
            clearAll();
          }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">
            Move
          </button>
          <button onClick={clearAll}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold">
            Cancel
          </button>
        </div>
      )}

      {/* Landmark movement skip button */}
      {activeLandmarkMovement && !selectedFromRegion && !selectedToRegion && (
        <div className="absolute top-2 right-2">
          <button onClick={() => onResolveLandmark("SKIP")}
            className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-bold border border-green-600">
            Skip
          </button>
        </div>
      )}

      {/* Cancel move source selection */}
      {selectedFromRegion && !selectedToRegion && !activePlaceUnit && !activeRemoveFortress && (
        <div className="absolute top-2 right-2">
          <button onClick={clearAll}
            className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-bold border border-gray-600">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
