"use client";

import { useLotrGameContext } from "@/context/LotrGameContext";
import RegionMap from "./RegionMap";
import QuestTrack from "./QuestTrack";
import PlayerPanel from "./PlayerPanel";
import CardPyramid from "./CardPyramid";
import LandmarkTiles from "./LandmarkTiles";
import InfoBar from "./InfoBar";
import GameLogBar from "./GameLogBar";
import ManeuverPanel from "./ManeuverPanel";
import LandmarkPanel from "./LandmarkPanel";
import AlliancePanel from "./AlliancePanel";
import AllianceEffectPanel from "./AllianceEffectPanel";
import PickDiscardPanel from "./PickDiscardPanel";
import RemoveFortressPanel from "./RemoveFortressPanel";
import PlaceUnitPanel from "./PlaceUnitPanel";

/**
 * LOTR board layout shell.
 *
 * Reads everything from {@link useLotrGameContext} and owns no state of its own.
 * State, phase flags, action handlers, and shared derivations all live in the
 * provider; each child component pulls what it needs from context too. The only
 * props passed here are to `PlayerPanel`, which is rendered twice (me + opponent)
 * and takes the specific player object + which turn as genuine per-instance props.
 */
export default function LotrGameBoard() {
  const {
    state,
    isMyTurn,
    mySide,
    isManeuverPhase,
    isPickDiscardPhase,
    isRemoveFortressPhase,
    isPlaceUnitPhase,
    isLandmarkPhase,
    isAlliancePhase,
    isAllianceEffectPhase,
    me,
    opponent,
    isFinished,
    inInteractivePhase,
    isLandmarkMovement,
  } = useLotrGameContext();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-40 bg-gray-950">
        <InfoBar />
        <GameLogBar />

        {!isFinished && isManeuverPhase && (
          <div className="px-3 pt-3">
            <ManeuverPanel />
          </div>
        )}

        {!isFinished && isPickDiscardPhase && (
          <div className="px-3 pt-3">
            <PickDiscardPanel />
          </div>
        )}

        {!isFinished && isRemoveFortressPhase && (
          <div className="px-3 pt-3">
            <RemoveFortressPanel />
          </div>
        )}

        {!isFinished && isPlaceUnitPhase && (
          <div className="px-3 pt-3">
            <PlaceUnitPanel />
          </div>
        )}

        {!isFinished && isLandmarkPhase && !isLandmarkMovement && (
          <div className="px-3 pt-3">
            <LandmarkPanel />
          </div>
        )}

        {!isFinished && isLandmarkMovement && (
          <div className="px-3 pt-3">
            <LandmarkPanel />
          </div>
        )}

        {!isFinished && state.alliancePhase && (
          <div className="px-3 pt-3">
            <AlliancePanel />
          </div>
        )}

        {!isFinished && state.allianceEffectPhase && (
          <div className="px-3 pt-3">
            <AllianceEffectPanel />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto">
        <div className="lg:w-48 flex-shrink-0 space-y-3">
          {me && (
            <PlayerPanel
              player={me}
              isCurrentTurn={isMyTurn}
            />
          )}
          {opponent && (
            <PlayerPanel
              player={opponent}
              isCurrentTurn={!isMyTurn}
              isOpponent
            />
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-w-0">
          <div className="flex-1">
            <CardPyramid />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="order-2 lg:order-1 grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <RegionMap />
              </div>
              <QuestTrack />
            </div>

            <div className="order-1 lg:order-2">
              <LandmarkTiles />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
