"use client";

import { LotrGameState, LotrPlayerSide } from "@/types/lotr";
import { getCardDef } from "@/lib/lotrCards";
import RegionMap from "./RegionMap";
import QuestTrack from "./QuestTrack";
import PlayerPanel from "./PlayerPanel";
import CardPyramid from "./CardPyramid";
import LandmarkTiles from "./LandmarkTiles";
import InfoBar from "./InfoBar";

interface Props {
  state: LotrGameState;
  isMyTurn: boolean;
  mySide: LotrPlayerSide | undefined;
  gameStatus: string;
  onTakeCard: (slotId: number, playOrDiscard: "PLAY" | "DISCARD", chosenRegion?: string) => void;
  onTakeLandmark: (tileId: string) => void;
}

export default function LotrGameBoard({ state, isMyTurn, mySide, gameStatus, onTakeCard, onTakeLandmark }: Props) {
  const me = mySide === "FELLOWSHIP" ? state.fellowship : state.sauron;
  const opponent = mySide === "FELLOWSHIP" ? state.sauron : state.fellowship;

  const mySkills: Record<string, number> = {};
  if (me) {
    for (const id of me.playedCardIds) {
      const def = getCardDef(id);
      if (def?.color === "GREY" && def.greySkills) {
        for (const choice of def.greySkills) {
          for (const s of choice) mySkills[s] = (mySkills[s] || 0) + 1;
        }
      }
    }
  }

  const fortressCount = state.regions.filter(r => r.fortress === mySide).length;
  const isFinished = gameStatus === "FINISHED";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <InfoBar
        currentChapter={state.currentChapter}
        currentTurnPlayer={state.currentTurnPlayer}
        isMyTurn={isMyTurn}
        isFinished={isFinished}
        isDraw={isFinished && false}
        winnerSide={undefined}
        mySide={mySide}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto">
        <div className="lg:w-48 flex-shrink-0 space-y-3">
          {me && <PlayerPanel player={me} isCurrentTurn={isMyTurn} />}
          {opponent && <PlayerPanel player={opponent} isCurrentTurn={!isMyTurn} isOpponent />}
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <RegionMap regions={state.regions} />
            </div>
            <QuestTrack questTrack={state.questTrack} />
          </div>

          <LandmarkTiles
            landmarks={state.landmarkTiles}
            isMyTurn={isMyTurn}
            myCoins={me?.coins ?? 0}
            mySkills={mySkills}
            fortressCount={fortressCount}
            onTakeLandmark={onTakeLandmark}
          />

          <CardPyramid
            cardSlots={state.cardSlots}
            currentChapter={state.currentChapter}
            isMyTurn={isMyTurn}
            onTakeCard={onTakeCard}
            myPlayedCards={me?.playedCardIds ?? []}
            myCoins={me?.coins ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
