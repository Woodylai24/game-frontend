"use client";

import { LotrRegionState, LotrRegion, REGION_ADJACENCY, REGION_POSITIONS, getRegionIconPath } from "@/types/lotr";

interface Props {
  regions: LotrRegionState[];
}

const REGION_LABELS: Record<LotrRegion, string> = {
  LINDON: "Lindon", ARNOR: "Arnor", RHOVANION: "Rhovanion",
  ENEDWAITH: "Enedwaith", ROHAN: "Rohan", GONDOR: "Gondor", MORDOR: "Mordor",
};

export default function RegionMap({ regions }: Props) {
  const getRegionState = (r: LotrRegion) => regions.find(rs => rs.region === r);

  return (
    <div className="relative w-full" style={{ paddingBottom: "60%" }}>
      <svg viewBox="0 0 100 90" className="absolute inset-0 w-full h-full">
        {Object.entries(REGION_ADJACENCY).map(([from, adj]) =>
          adj.map(to => {
            const p1 = REGION_POSITIONS[from as LotrRegion];
            const p2 = REGION_POSITIONS[to as LotrRegion];
            const key = [from, to].sort().join("-");
            return (
              <line key={key} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
            );
          })
        )}
        {(Object.keys(REGION_POSITIONS) as LotrRegion[]).map(region => {
          const pos = REGION_POSITIONS[region];
          const state = getRegionState(region);
          const fellowshipUnits = Math.max(0, state?.units ?? 0);
          const sauronUnits = Math.max(0, -(state?.units ?? 0));
          const fortressOwner = state?.fortress;

          return (
            <g key={region}>
              <circle cx={pos.x} cy={pos.y} r="7" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
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
    </div>
  );
}
