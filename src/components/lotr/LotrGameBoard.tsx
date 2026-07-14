"use client";

import { useLotrGameContext } from "@/context/LotrGameContext";
import { LotrCardDef } from "@/types/lotr";
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
import { getCardDef, getLandmarkDef } from "@/lib/lotrCards";

/**
 * LOTR board layout shell.
 *
 * Reads everything from {@link useLotrGameContext} — no props. State ownership
 * and derivations (me/opponent, winnerSide, phase combinations) live in the
 * provider. Child components are in the process of migrating to the context too
 * (still receive props here); each will be converted to consume the context
 * directly, at which point the prop-forwarding below disappears.
 */
export default function LotrGameBoard() {
  const {
    state,
    isMyTurn,
    mySide,
    gameStatus,
    players,
    isManeuverPhase,
    isPickDiscardPhase,
    isRemoveFortressPhase,
    isPlaceUnitPhase,
    isLandmarkPhase,
    isAlliancePhase,
    isAllianceEffectPhase,
    takeCard: onTakeCard,
    takeLandmark: onTakeLandmark,
    resolveManeuver: onResolveManeuver,
    resolvePickDiscard,
    resolveRemoveFortress,
    resolvePlaceUnit,
    resolveLandmark: onResolveLandmark,
    resolveAlliance: onResolveAlliance,
    resolveAllianceEffect: onResolveAllianceEffect,
    me,
    opponent,
    myPlayedCards,
    myCoins,
    fortressCount,
    isFinished,
    inInteractivePhase,
    isLandmarkMovement,
    winnerSide,
    isDraw,
    onBackToRoom,
  } = useLotrGameContext();

  // LandmarkPanel-only card-def derivations. TODO(commit 3): move into
  // LandmarkPanel so this component is a pure layout shell.
  const cardDefsMap: Record<string, LotrCardDef> = {};
  for (const cardId of state.discardPile ?? []) {
    const def = getCardDef(cardId);
    if (def) cardDefsMap[cardId] = def;
  }
  const opponentGreyCards = (opponent?.playedCardIds ?? []).filter((id) => {
    const def = getCardDef(id);
    return def?.color === "GREY";
  });
  const opponentCardDefs: Record<string, LotrCardDef> = {};
  for (const cardId of opponentGreyCards) {
    const def = getCardDef(cardId);
    if (def) opponentCardDefs[cardId] = def;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-40 bg-gray-950">
        <InfoBar
          currentChapter={state.currentChapter}
          currentTurnPlayer={state.currentTurnPlayer}
          isMyTurn={isMyTurn}
          isFinished={isFinished}
          isDraw={isDraw}
          winnerSide={winnerSide}
          mySide={mySide}
          players={players}
          onBackToRoom={onBackToRoom}
        />
        <GameLogBar
          gameLog={state.gameLog ?? []}
          players={players}
          mySide={mySide}
        />

        {!isFinished && isManeuverPhase && (
          <div className="px-3 pt-3">
            <ManeuverPanel
              pendingManeuvers={state.pendingManeuvers ?? []}
              onSkip={() => onResolveManeuver("SKIP")}
            />
          </div>
        )}

        {!isFinished && isPickDiscardPhase && (
          <div className="px-3 pt-3">
            <PickDiscardPanel
              discardPile={state.discardPile ?? []}
              onResolve={resolvePickDiscard}
            />
          </div>
        )}

        {!isFinished && isRemoveFortressPhase && (
          <div className="px-3 pt-3">
            <RemoveFortressPanel
              onSkip={() => resolveRemoveFortress("SKIP")}
            />
          </div>
        )}

        {!isFinished && isPlaceUnitPhase && (
          <div className="px-3 pt-3">
            <PlaceUnitPanel onSkip={() => resolvePlaceUnit("SKIP")} />
          </div>
        )}

        {!isFinished && isLandmarkPhase && !isLandmarkMovement && (
          <div className="px-3 pt-3">
            <LandmarkPanel
              subPhase={state.landmarkSubPhase ?? ""}
              movementsRemaining={state.landmarkMovementsRemaining}
              discardPile={state.discardPile}
              cardDefs={cardDefsMap}
              drawnTokens={state.landmarkDrawnTokens}
              opponentGreyCards={opponentGreyCards}
              opponentCardDefs={opponentCardDefs}
              onResolveLandmark={onResolveLandmark}
            />
          </div>
        )}

        {!isFinished && isLandmarkMovement && (
          <div className="px-3 pt-3">
            <LandmarkPanel
              subPhase="MOVEMENT"
              movementsRemaining={state.landmarkMovementsRemaining}
              onResolveLandmark={onResolveLandmark}
            />
          </div>
        )}

        {!isFinished && state.alliancePhase && (
          <div className="px-3 pt-3">
            <AlliancePanel
              triggerType={state.allianceTriggerType ?? ""}
              race={state.allianceRace}
              drawnTokens={state.allianceDrawnTokens ?? []}
              onSelectToken={onResolveAlliance}
              readOnly={!isAlliancePhase}
            />
          </div>
        )}

        {!isFinished && state.allianceEffectPhase && (
          <div className="px-3 pt-3">
            <AllianceEffectPanel
              effectType={state.allianceEffectType ?? ""}
              effectSubPhase={state.allianceEffectSubPhase ?? ""}
              counter={state.allianceEffectCounter ?? 0}
              selectedRegions={state.allianceEffectSelectedRegions ?? []}
              discardPile={state.discardPile ?? []}
              mySide={mySide}
              regions={state.regions}
              onResolve={onResolveAllianceEffect}
              readOnly={!isAllianceEffectPhase}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto">
        <div className="lg:w-48 flex-shrink-0 space-y-3">
          {me && (
            <PlayerPanel
              player={me}
              isCurrentTurn={isMyTurn}
              playerName={players?.find((p) => p.side === mySide)?.username}
              takenLandmarks={(me.takenLandmarkIds ?? [])
                .map(getLandmarkDef)
                .filter(
                  (d): d is { id: string; name: string; effect: string } =>
                    !!d,
                )}
            />
          )}
          {opponent && (
            <PlayerPanel
              player={opponent}
              isCurrentTurn={!isMyTurn}
              isOpponent
              playerName={players?.find((p) => p.side !== mySide)?.username}
              takenLandmarks={(opponent.takenLandmarkIds ?? [])
                .map(getLandmarkDef)
                .filter(
                  (d): d is { id: string; name: string; effect: string } =>
                    !!d,
                )}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-w-0">
          <div className="flex-1">
            <CardPyramid
              cardSlots={state.cardSlots}
              currentChapter={state.currentChapter}
              isMyTurn={!inInteractivePhase && isMyTurn}
              onTakeCard={onTakeCard}
              myPlayedCards={myPlayedCards}
              myCoins={myCoins}
              myAllianceTokenIds={me?.allianceTokenIds}
            />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="order-2 lg:order-1 grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <RegionMap
                  regions={state.regions}
                  mySide={mySide}
                  isManeuverPhase={!isFinished && isManeuverPhase}
                  pendingManeuvers={state.pendingManeuvers ?? []}
                  onResolveManeuver={onResolveManeuver}
                  isRemoveFortressPhase={!isFinished && isRemoveFortressPhase}
                  isPlaceUnitPhase={!isFinished && isPlaceUnitPhase}
                  onResolveRemoveFortress={resolveRemoveFortress}
                  onResolvePlaceUnit={resolvePlaceUnit}
                  isLandmarkMovement={!isFinished && isLandmarkMovement}
                  onResolveLandmark={onResolveLandmark}
                />
              </div>
              <QuestTrack
                questTrack={state.questTrack}
                bonusPosition={state.bonusPosition}
              />
            </div>

            <div className="order-1 lg:order-2">
              <LandmarkTiles
                landmarks={state.landmarkTiles}
                isMyTurn={!inInteractivePhase && isMyTurn}
                myCoins={myCoins}
                myPlayedCards={myPlayedCards}
                fortressCount={fortressCount}
                onTakeLandmark={onTakeLandmark}
                myAllianceTokenIds={me?.allianceTokenIds}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
