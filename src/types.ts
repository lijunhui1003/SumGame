
export type GameMode = 'classic' | 'time';

export interface Block {
  id: string;
  value: number;
  row: number;
  col: number;
  isRemoving?: boolean;
}

export interface GameState {
  grid: (Block | null)[][];
  targetSum: number;
  selectedIds: string[];
  score: number;
  highScore: number;
  isGameOver: boolean;
  mode: GameMode;
  level: number;
  combo: number;
  timeLeft?: number; // For time mode
  maxTime?: number;
}

export const GRID_ROWS = 10;
export const GRID_COLS = 6;
export const INITIAL_ROWS = 4;
export const MAX_VALUE = 9;
export const MIN_VALUE = 1;
