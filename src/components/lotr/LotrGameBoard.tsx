"use client";

import { LotrGameState, LotrPlayerSide } from "@/types/lotr";
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

  const myPlayedCards = me?.playedCardIds ?? [];

  const fortressCount = (state.regions || []).filter(r => r.fortress === mySide).length;
  const isFinished = gameStatus === "FINISHED";

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
            myPlayedCards={myPlayedCards}
            fortressCount={fortressCount}
            onTakeLandmark={onTakeLandmark}
          />

          <CardPyramid
            cardSlots={state.cardSlots}
            currentChapter={state.currentChapter}
            isMyTurn={isMyTurn}
            onTakeCard={onTakeCard}
            myPlayedCards={myPlayedCards}
            myCoins={me?.coins ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
