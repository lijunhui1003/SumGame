import { Block, GRID_COLS, GRID_ROWS, MAX_VALUE, MIN_VALUE } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const createBlock = (row: number, col: number, value?: number): Block => ({
  id: generateId(),
  value: value ?? Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE,
  row,
  col,
});

export const createEmptyGrid = (): (Block | null)[][] => {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
};

export const generateRow = (rowIndex: number): (Block | null)[] => {
  return Array.from({ length: GRID_COLS }, (_, colIndex) => createBlock(rowIndex, colIndex));
};

export const getTargetSum = (level: number): number => {
  // Increase difficulty slightly with level
  const base = 10;
  const variance = Math.min(level, 10);
  return base + Math.floor(Math.random() * variance);
};

export const checkGameOver = (grid: (Block | null)[][]): boolean => {
  // If any block is in the top row (row 0), and we try to add a new row, it's game over.
  // Actually, game over is usually when a block exists in row 0.
  return grid[0].some(cell => cell !== null);
};

export const applyGravity = (grid: (Block | null)[][]): (Block | null)[][] => {
  const newGrid = createEmptyGrid();
  for (let col = 0; col < GRID_COLS; col++) {
    let targetRow = GRID_ROWS - 1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (grid[row][col]) {
        newGrid[targetRow][col] = { ...grid[row][col]!, row: targetRow, col };
        targetRow--;
      }
    }
  }
  return newGrid;
};

export const shiftUp = (grid: (Block | null)[][]): (Block | null)[][] => {
  const newGrid = createEmptyGrid();
  // Move everything up by 1
  for (let row = 1; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (grid[row][col]) {
        newGrid[row - 1][col] = { ...grid[row][col]!, row: row - 1, col };
      }
    }
  }
  // Add new row at the bottom
  const bottomRow = generateRow(GRID_ROWS - 1);
  for (let col = 0; col < GRID_COLS; col++) {
    newGrid[GRID_ROWS - 1][col] = bottomRow[col];
  }
  return newGrid;
};
