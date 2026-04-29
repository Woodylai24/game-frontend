"use client";

import { LotrGameState, LotrPlayerSide, LotrManeuverType, LotrAllianceTokenDef } from "@/types/lotr";
import RegionMap from "./RegionMap";
import QuestTrack from "./QuestTrack";
import PlayerPanel from "./PlayerPanel";
import CardPyramid from "./CardPyramid";
import LandmarkTiles from "./LandmarkTiles";
import InfoBar from "./InfoBar";
import ManeuverPanel from "./ManeuverPanel";
import BonusPanel from "./BonusPanel";
import LandmarkPanel from "./LandmarkPanel";
import AlliancePanel from "./AlliancePanel";
import AllianceEffectPanel from "./AllianceEffectPanel";
import { getCardDef } from "@/lib/lotrCards";

interface Props {
  state: LotrGameState;
  isMyTurn: boolean;
  mySide: LotrPlayerSide | undefined;
  gameStatus: string;
  players?: { username: string; side: string }[];
  onTakeCard: (slotId: number, playOrDiscard: "PLAY" | "DISCARD", chosenRegion?: string) => void;
  onTakeLandmark: (tileId: string) => void;
  isManeuverPhase: boolean;
  pendingManeuvers: LotrManeuverType[];
  onResolveManeuver: (maneuverType: string, targetRegion?: string, fromRegion?: string, toRegion?: string) => void;
  isBonusPhase: boolean;
  bonusPosition: number;
  onResolveBonus: (bonusPosition: number, targetRegion?: string, action?: string) => void;
  isLandmarkPhase: boolean;
  landmarkSubPhase: string | null;
  onResolveLandmark: (action: string, data?: Record<string, string>) => void;
  isAlliancePhase: boolean;
  allianceDrawnTokens: LotrAllianceTokenDef[];
  allianceTriggerType: string | null;
  allianceRace: string | null;
  onResolveAlliance: (tokenId: string) => void;
  isAllianceEffectPhase: boolean;
  onResolveAllianceEffect: (data: Record<string, unknown>) => void;
}

export default function LotrGameBoard({ state, isMyTurn, mySide, gameStatus, players, onTakeCard, onTakeLandmark, isManeuverPhase, pendingManeuvers, onResolveManeuver, isBonusPhase, bonusPosition, onResolveBonus, isLandmarkPhase, landmarkSubPhase, onResolveLandmark, isAlliancePhase, allianceDrawnTokens, allianceTriggerType, allianceRace, onResolveAlliance, isAllianceEffectPhase, onResolveAllianceEffect }: Props) {
  const me = mySide === "FELLOWSHIP" ? state.fellowship : state.sauron;
  const opponent = mySide === "FELLOWSHIP" ? state.sauron : state.fellowship;

  const myPlayedCards = me?.playedCardIds ?? [];

  // Build cardDefs map for LandmarkPanel
  const cardDefsMap: Record<string, import("@/types/lotr").LotrCardDef> = {};
  for (const cardId of (state.discardPile ?? [])) {
    const def = getCardDef(cardId);
    if (def) cardDefsMap[cardId] = def;
  }
  const opponentGreyCards = (opponent?.playedCardIds ?? []).filter(id => {
    const def = getCardDef(id);
    return def?.color === "GREY";
  });
  const opponentCardDefs: Record<string, import("@/types/lotr").LotrCardDef> = {};
  for (const cardId of opponentGreyCards) {
    const def = getCardDef(cardId);
    if (def) opponentCardDefs[cardId] = def;
  }

  const fortressCount = (state.regions || []).filter(r => r.fortress === mySide).length;
  const isFinished = gameStatus === "FINISHED";
  const inInteractivePhase = isManeuverPhase || isBonusPhase || isLandmarkPhase || isAlliancePhase || isAllianceEffectPhase;
  const isLandmarkMovement = isLandmarkPhase && landmarkSubPhase === "MOVEMENT";

  let winnerSide: LotrPlayerSide | undefined;
  let isDraw = false;
  if (isFinished && state.questTrack) {
    if (state.questTrack.fellowshipPosition >= 14) {
      winnerSide = "FELLOWSHIP";
    } else if (state.questTrack.sauronPosition >= 14) {
      winnerSide = "SAURON";
    } else {
      for (const side of ["FELLOWSHIP", "SAURON"] as const) {
        const p = state[side.toLowerCase() as "fellowship" | "sauron"];
        const raceCount = Object.values(p.raceSymbols).filter(v => v > 0).length;
        if (p.allianceTokenIds.includes("AT-HOBBITS-1")) {
        }
        if (raceCount >= 6) winnerSide = side;
      }
      if (!winnerSide) {
        const countRegions = (side: LotrPlayerSide) =>
          state.regions.filter(r => r.fortress === side || (side === "FELLOWSHIP" ? r.units > 0 : r.units < 0)).length;
        const fRegions = countRegions("FELLOWSHIP");
        const sRegions = countRegions("SAURON");
        if (fRegions > sRegions) winnerSide = "FELLOWSHIP";
        else if (sRegions > fRegions) winnerSide = "SAURON";
        else isDraw = true;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <InfoBar
        currentChapter={state.currentChapter}
        currentTurnPlayer={state.currentTurnPlayer}
        isMyTurn={isMyTurn}
        isFinished={isFinished}
        isDraw={isDraw}
        winnerSide={winnerSide}
        mySide={mySide}
      />

      {!isFinished && isManeuverPhase && (
        <div className="px-3 pt-3">
          <ManeuverPanel
            pendingManeuvers={pendingManeuvers}
            onSkip={() => onResolveManeuver("SKIP")}
          />
        </div>
      )}

      {!isFinished && isBonusPhase && (
        <div className="px-3 pt-3">
          <BonusPanel
            bonusPosition={bonusPosition}
            onSkip={() => onResolveBonus(bonusPosition, undefined, "SKIP")}
          />
        </div>
      )}

      {!isFinished && isLandmarkPhase && !isLandmarkMovement && (
        <div className="px-3 pt-3">
          <LandmarkPanel
            subPhase={landmarkSubPhase ?? ""}
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

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto">
        <div className="lg:w-48 flex-shrink-0 space-y-3">
          {me && <PlayerPanel player={me} isCurrentTurn={isMyTurn} playerName={players?.find(p => p.side === mySide)?.username} />}
          {opponent && <PlayerPanel player={opponent} isCurrentTurn={!isMyTurn} isOpponent playerName={players?.find(p => p.side !== mySide)?.username} />}
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <RegionMap
                regions={state.regions}
                mySide={mySide}
                isManeuverPhase={!isFinished && isManeuverPhase}
                pendingManeuvers={pendingManeuvers}
                onResolveManeuver={onResolveManeuver}
                isBonusPhase={!isFinished && isBonusPhase}
                bonusPosition={bonusPosition}
                onResolveBonus={onResolveBonus}
                isLandmarkMovement={!isFinished && isLandmarkMovement}
                onResolveLandmark={onResolveLandmark}
              />
            </div>
            <QuestTrack questTrack={state.questTrack} bonusPosition={state.bonusPosition} />
          </div>

          <LandmarkTiles
            landmarks={state.landmarkTiles}
            isMyTurn={!inInteractivePhase && isMyTurn}
            myCoins={me?.coins ?? 0}
            myPlayedCards={myPlayedCards}
            fortressCount={fortressCount}
            onTakeLandmark={onTakeLandmark}
            myAllianceTokenIds={me?.allianceTokenIds}
          />

          <CardPyramid
            cardSlots={state.cardSlots}
            currentChapter={state.currentChapter}
            isMyTurn={!inInteractivePhase && isMyTurn}
            onTakeCard={onTakeCard}
            myPlayedCards={myPlayedCards}
            myCoins={me?.coins ?? 0}
            myAllianceTokenIds={me?.allianceTokenIds}
          />
        </div>
      </div>
    </div>
  );
}
