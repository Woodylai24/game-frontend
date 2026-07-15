"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useTicTacToeGame } from "@/hooks/useTicTacToeGame";
import { GameSessionData } from "@/types/game";
import { TicTacToeState, PlayerSymbolInfo } from "@/types/tictactoe";

/**
 * Tic-Tac-Toe game context.
 *
 * Mirrors the LOTR context pattern: the provider owns the game hook and exposes
 * its state to child components so they don't need props. Simpler than LOTR —
 * TTT has no phases, no derivations, just the board state + move dispatch.
 */
export interface TicTacToeGameContextValue {
  session: GameSessionData;
  ttState: TicTacToeState;
  players: PlayerSymbolInfo[];
  currentPlayerOrder: number;
  username: string;
  error: string;
  setError: (e: string) => void;
  makeMove: (row: number, col: number) => void;
  backToRoom: () => void;
}

const TicTacToeGameContext = createContext<TicTacToeGameContextValue | null>(null);

interface ProviderProps {
  session: GameSessionData;
  username: string;
  children: ReactNode;
}

export function TicTacToeGameProvider({ session, username, children }: ProviderProps) {
  const game = useTicTacToeGame(session, username);

  const value = useMemo(
    () => ({
      session: game.session,
      ttState: game.ttState,
      players: game.players,
      currentPlayerOrder: game.currentPlayerOrder,
      username: game.username,
      error: game.error,
      setError: game.setError,
      makeMove: game.makeMove,
      backToRoom: game.backToRoom,
    }),
    [game],
  );

  return (
    <TicTacToeGameContext.Provider value={value}>
      {children}
    </TicTacToeGameContext.Provider>
  );
}

export function useTicTacToeGameContext(): TicTacToeGameContextValue {
  const ctx = useContext(TicTacToeGameContext);
  if (!ctx) {
    throw new Error(
      "useTicTacToeGameContext must be used within a TicTacToeGameProvider",
    );
  }
  return ctx;
}
