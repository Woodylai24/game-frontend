/**
 * Tic-Tac-Toe specific types.
 *
 * These were previously baked into the generic {@link GameSessionData} /
 * WS event types in game.ts, leaking TTT assumptions into every game's
 * session shape. Now they live here and are consumed only by TTT components.
 */

export type Board = (string | null)[][];

export interface PlayerSymbolInfo {
  username: string;
  symbol: "X" | "O";
}

/**
 * Parsed shape of the TTT gameState JSON string.
 * Matches what TicTacToeGameLogic.buildInitialState produces server-side.
 */
export interface TicTacToeState {
  board: Board;
  moves: unknown[];
}
