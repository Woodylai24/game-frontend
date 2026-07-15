"use client";

import { GameSessionData } from "@/types/game";
import { TicTacToeGameProvider, useTicTacToeGameContext } from "@/context/TicTacToeGameContext";
import TicTacToeBoard from "./TicTacToeBoard";

interface TicTacToeGameViewProps {
  session: GameSessionData;
  username: string;
}

/**
 * Top-level Tic-Tac-Toe game screen. Owns the {@link TicTacToeGameProvider}
 * (which in turn owns the WS subscription + move dispatch) and renders the
 * game shell: header, error banner, finished-game banner, and the board.
 *
 * Split into two pieces because the provider can't consume its own context:
 * `TicTacToeGameView` renders the provider; the internal `TicTacToeScreen`
 * is the actual ctx consumer.
 */
export default function TicTacToeGameView({ session, username }: TicTacToeGameViewProps) {
  return (
    <TicTacToeGameProvider session={session} username={username}>
      <TicTacToeScreen username={username} />
    </TicTacToeGameProvider>
  );
}

function TicTacToeScreen({ username }: { username: string }) {
  const { session, error, backToRoom } = useTicTacToeGameContext();
  const isFinished = session.gameStatus === "FINISHED";
  const isDraw = isFinished && session.winnerUsername === null;

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
          {error}
        </div>
      )}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">{isFinished ? "Game Over" : "Game in Progress"}</h1>
              <p className="text-sm text-gray-600">Session #{session.id}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Playing as: {username}</span>
              <button onClick={backToRoom} className="text-sm bg-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300">Back to Room</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {isFinished && (
            <div className="text-center mb-6">
              <div className="text-2xl font-bold">
                {isDraw ? <span className="text-yellow-600">Game Over — Draw!</span> : <span className="text-green-600">Game Over — {session.winnerUsername} wins!</span>}
              </div>
            </div>
          )}
          <TicTacToeBoard />
        </div>
      </main>
    </div>
  );
}
