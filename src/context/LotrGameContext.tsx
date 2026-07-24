"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useLotrGame } from "@/hooks/useLotrGame";
import {
  LotrGameState,
  LotrPlayerSide,
  LotrPlayerState,
} from "@/types/lotr";

/**
 * Central LOTR game context.
 *
 * Why this exists: previously the game-agnostic session page (`game/[sessionId]`)
 * called `useLotrGame` itself and forwarded ~28 props to `<LotrGameBoard>`, which
 * then re-forwarded subsets to ~14 children. This context lets the hook live inside
 * the LOTR subtree (so non-LOTR games never fire the `/lotr/state` request) and lets
 * every LOTR component pull only the fields it needs without prop drilling.
 *
 * The provider owns `useLotrGame` and computes the shared derivations that the board
 * used to compute inline (`me`, `opponent`, `winnerSide`, phase combinations, etc.),
 * so no child re-derives them. Components consume via `useLotrGameContext()`.
 *
 * Invariant: `state` is non-null for any consumer. The provider renders a loading
 * gate until the first state arrives, so children can treat `state` as defined.
 */
export interface LotrGameContextValue {
  // Raw state from the hook (state is guaranteed non-null inside the provider)
  state: LotrGameState;
  gameStatus: string;
  players: { username: string; playerOrder: number; side: string }[];
  error: string;
  setError: (e: string) => void;

  // Identity & turn
  mySide: LotrPlayerSide | undefined;
  isMyTurn: boolean;

  // Phase flags (already gated to "my side" by the hook)
  isManeuverPhase: boolean;
  isLandmarkPhase: boolean;
  isAlliancePhase: boolean;
  isAllianceEffectPhase: boolean;
  isPickDiscardPhase: boolean;
  isRemoveFortressPhase: boolean;
  isPlaceUnitPhase: boolean;

  // Actions
  takeCard: (
    slotId: number,
    playOrDiscard: "PLAY" | "DISCARD",
    chosenRegion?: string,
  ) => Promise<void>;
  takeLandmark: (tileId: string) => Promise<void>;
  resolveManeuver: (
    maneuverType: string,
    targetRegion?: string,
    fromRegion?: string,
    toRegion?: string,
  ) => Promise<void>;
  resolvePickDiscard: (action: string, cardDefId?: string) => Promise<void>;
  resolveRemoveFortress: (
    action: string,
    targetRegion?: string,
  ) => Promise<void>;
  resolvePlaceUnit: (action: string, targetRegion?: string) => Promise<void>;
  resolveLandmark: (
    action: string,
    data?: Record<string, string>,
  ) => Promise<void>;
  resolveAlliance: (tokenId: string) => Promise<void>;
  resolveAllianceEffect: (data: Record<string, unknown>) => Promise<void>;

  // Derived (computed once here so children don't repeat the work)
  me: LotrPlayerState | undefined;
  opponent: LotrPlayerState | undefined;
  myPlayedCards: string[];
  myCoins: number;
  fortressCount: number;
  isFinished: boolean;
  inInteractivePhase: boolean;
  isLandmarkMovement: boolean;
  winnerSide: LotrPlayerSide | undefined;
  isDraw: boolean;

  // Navigation
  onBackToRoom?: () => void;

  // Timer runtime (present only for timed games). playerTimeRemaining is keyed
  // by username; turnStartedAt is the epoch-ms mark of the current turn. The
  // active player's displayed remaining = stored - (now - turnStartedAt).
  playerTimeRemaining: Record<string, number> | undefined;
  turnStartedAt: number | null | undefined;
}

const LotrGameContext = createContext<LotrGameContextValue | null>(null);

interface ProviderProps {
  sessionId: string;
  roomCode: string;
  username: string;
  onBackToRoom?: () => void;
  children: ReactNode;
}

export function LotrGameProvider({
  sessionId,
  roomCode,
  username,
  onBackToRoom,
  children,
}: ProviderProps) {
  const lotr = useLotrGame(sessionId, roomCode, username);

  // useMemo is called unconditionally (before the loading gate) so the hook
  // call order is stable across renders. The memo body no-ops when state is
  // still null; the gate below handles the actual loading render.
  const value = useMemo<LotrGameContextValue | null>(() => {
    const state = lotr.lotrState;
    if (!state) return null;
    return buildContextValue(lotr, state, onBackToRoom);
  }, [
    lotr,
    onBackToRoom,
  ]);

  // Until the first state arrives, the board has nothing to render. Show the
  // same loading spinner the page uses so the transition is seamless. (This
  // also enforces the non-null `state` invariant for every consumer below.)
  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <LotrGameContext.Provider value={value}>
      {children}
    </LotrGameContext.Provider>
  );
}

/**
 * Pure derivation of the context value from the hook output + game state.
 * No hooks — called from the `useMemo` in the provider. Mirrors the original
 * `LotrGameBoard` derivation logic exactly.
 */
function buildContextValue(
  lotr: ReturnType<typeof useLotrGame>,
  state: LotrGameState,
  onBackToRoom?: () => void,
): LotrGameContextValue {
  const {
    gameStatus,
    players,
    error,
    setError,
    mySide,
    isMyTurn,
    isManeuverPhase,
    isLandmarkPhase,
    isAlliancePhase,
    isAllianceEffectPhase,
    isPickDiscardPhase,
    isRemoveFortressPhase,
    isPlaceUnitPhase,
    takeCard,
    takeLandmark,
    resolveManeuver,
    resolvePickDiscard,
    resolveRemoveFortress,
    resolvePlaceUnit,
    resolveLandmark,
    resolveAlliance,
    resolveAllianceEffect,
    playerTimeRemaining,
    turnStartedAt,
  } = lotr;

  const me = mySide === "FELLOWSHIP" ? state.fellowship : state.sauron;
  const opponent = mySide === "FELLOWSHIP" ? state.sauron : state.fellowship;
  const myPlayedCards = me?.playedCardIds ?? [];
  const myCoins = me?.coins ?? 0;
  const fortressCount =
    (state.regions || []).filter((r) => r.fortress === mySide).length;
  const isFinished = gameStatus === "FINISHED";
  const inInteractivePhase =
    isManeuverPhase ||
    isPickDiscardPhase ||
    isRemoveFortressPhase ||
    isPlaceUnitPhase ||
    isLandmarkPhase ||
    isAlliancePhase ||
    isAllianceEffectPhase;
  const isLandmarkMovement =
    isLandmarkPhase && state.landmarkSubPhase === "MOVEMENT";

  // Winner determination — mirrors the original LotrGameBoard logic exactly.
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
        const raceCount = Object.values(p.raceSymbols).filter(
          (v) => v > 0,
        ).length;
        if (raceCount >= 6) winnerSide = side;
      }
      if (!winnerSide) {
        const countRegions = (side: LotrPlayerSide) =>
          state.regions.filter(
            (r) =>
              r.fortress === side ||
              (side === "FELLOWSHIP" ? r.units > 0 : r.units < 0),
          ).length;
        const fRegions = countRegions("FELLOWSHIP");
        const sRegions = countRegions("SAURON");
        if (fRegions > sRegions) winnerSide = "FELLOWSHIP";
        else if (sRegions > fRegions) winnerSide = "SAURON";
        else isDraw = true;
      }
    }
  }

  return {
    state,
    gameStatus,
    players,
    error,
    setError,
    mySide,
    isMyTurn,
    isManeuverPhase,
    isLandmarkPhase,
    isAlliancePhase,
    isAllianceEffectPhase,
    isPickDiscardPhase,
    isRemoveFortressPhase,
    isPlaceUnitPhase,
    takeCard,
    takeLandmark,
    resolveManeuver,
    resolvePickDiscard,
    resolveRemoveFortress,
    resolvePlaceUnit,
    resolveLandmark,
    resolveAlliance,
    resolveAllianceEffect,
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
    playerTimeRemaining,
    turnStartedAt,
  };
}

export function useLotrGameContext(): LotrGameContextValue {
  const ctx = useContext(LotrGameContext);
  if (!ctx) {
    throw new Error(
      "useLotrGameContext must be used within a LotrGameProvider",
    );
  }
  return ctx;
}
