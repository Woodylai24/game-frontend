"use client";

import { useTicTacToeGameContext } from "@/context/TicTacToeGameContext";
import { Board } from "@/types/tictactoe";

/**
 * Tic-Tac-Toe board component. Reads all state from
 * {@link useTicTacToeGameContext} — no props. The win-detection logic
 * (getWinningCells) runs client-side by scanning the board, same as before.
 */
export default function TicTacToeBoard() {
  const { ttState, players, currentPlayerOrder, username, session, makeMove } = useTicTacToeGameContext();
  const board: Board = ttState.board;
  const gameStatus = session.gameStatus;
  const winnerUsername = session.winnerUsername;

  const currentPlayer = players.find(
    (p) => (p.symbol === "X" ? 0 : 1) === currentPlayerOrder,
  );

  const isMyTurn = currentPlayer?.username === username;
  const isFinished = gameStatus === "FINISHED";

  const getWinningCells = (): Set<string> => {
    const cells = new Set<string>();
    if (!isFinished || winnerUsername === null) return cells;

    for (let r = 0; r < 3; r++) {
      if (
        board[r][0] &&
        board[r][0] === board[r][1] &&
        board[r][1] === board[r][2]
      ) {
        cells.add(`${r}-0`);
        cells.add(`${r}-1`);
        cells.add(`${r}-2`);
        return cells;
      }
    }
    for (let c = 0; c < 3; c++) {
      if (
        board[0][c] &&
        board[0][c] === board[1][c] &&
        board[1][c] === board[2][c]
      ) {
        cells.add(`0-${c}`);
        cells.add(`1-${c}`);
        cells.add(`2-${c}`);
        return cells;
      }
    }
    if (
      board[0][0] &&
      board[0][0] === board[1][1] &&
      board[1][1] === board[2][2]
    ) {
      cells.add("0-0");
      cells.add("1-1");
      cells.add("2-2");
      return cells;
    }
    if (
      board[0][2] &&
      board[0][2] === board[1][1] &&
      board[1][1] === board[2][0]
    ) {
      cells.add("0-2");
      cells.add("1-1");
      cells.add("2-0");
      return cells;
    }
    return cells;
  };

  const winningCells = getWinningCells();

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        {isFinished ? (
          <div className="text-lg font-bold">
            {winnerUsername === null ? (
              <span className="text-yellow-600">It&apos;s a draw!</span>
            ) : winnerUsername === username ? (
              <span className="text-green-600">You win!</span>
            ) : (
              <span className="text-red-600">{winnerUsername} wins!</span>
            )}
          </div>
        ) : isMyTurn ? (
          <div className="text-lg font-semibold text-blue-600">Your turn</div>
        ) : (
          <div className="text-lg font-semibold text-gray-500">
            Waiting for {currentPlayer?.username}...
          </div>
        )}
      </div>

      <div className="flex gap-6 mb-6">
        {players.map((p) => {
          const isActive =
            !isFinished && (p.symbol === "X" ? 0 : 1) === currentPlayerOrder;
          const symbolColor =
            p.symbol === "X" ? "text-blue-600" : "text-red-600";
          return (
            <div
              key={p.username}
              className={`px-4 py-2 rounded-lg ${
                isActive
                  ? "bg-gray-100 ring-2 ring-blue-400"
                  : "bg-gray-50"
              }`}
            >
              <span className={`font-bold text-xl ${symbolColor}`}>
                {p.symbol}
              </span>
              <span className="ml-2 text-sm">
                {p.username === username ? "You" : p.username}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isWinning = winningCells.has(`${rowIndex}-${colIndex}`);
            const canClick = !isFinished && isMyTurn && cell === null;

            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => canClick && makeMove(rowIndex, colIndex)}
                disabled={!canClick}
                className={`w-24 h-24 border-2 rounded-lg text-4xl font-bold flex items-center justify-center transition-all
                  ${
                    isWinning
                      ? "bg-yellow-100 border-yellow-400"
                      : cell
                        ? "bg-gray-50 border-gray-300"
                        : canClick
                          ? "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                          : "bg-white border-gray-200 cursor-not-allowed"
                  }
                  ${cell === "X" ? "text-blue-600" : "text-red-600"}
                `}
              >
                {cell}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
