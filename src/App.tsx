/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Pause, 
  Timer, 
  Zap, 
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { 
  GameState, 
  Block, 
  GRID_ROWS, 
  GRID_COLS, 
  INITIAL_ROWS, 
  GameMode 
} from './types';
import { 
  createEmptyGrid, 
  generateRow, 
  getTargetSum, 
  applyGravity, 
  shiftUp, 
  checkGameOver 
} from './utils/gameLogic';

const STORAGE_KEY = 'sumstack_highscore';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initGame = (mode: GameMode) => {
    const grid = createEmptyGrid();
    // Fill initial rows from the bottom
    for (let i = 0; i < INITIAL_ROWS; i++) {
      const rowIdx = GRID_ROWS - 1 - i;
      const newRow = generateRow(rowIdx);
      for (let j = 0; j < GRID_COLS; j++) {
        grid[rowIdx][j] = newRow[j];
      }
    }

    const savedHighScore = localStorage.getItem(STORAGE_KEY);
    
    setGameState({
      grid,
      targetSum: getTargetSum(1),
      selectedIds: [],
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      isGameOver: false,
      mode,
      level: 1,
      combo: 0,
      timeLeft: mode === 'time' ? 10 : undefined,
      maxTime: mode === 'time' ? 10 : undefined,
    });
    setIsPaused(false);
  };

  const handleBlockClick = (block: Block) => {
    if (!gameState || gameState.isGameOver || isPaused) return;

    setGameState(prev => {
      if (!prev) return null;
      
      const isSelected = prev.selectedIds.includes(block.id);
      let newSelectedIds: string[];

      if (isSelected) {
        newSelectedIds = prev.selectedIds.filter(id => id !== block.id);
      } else {
        newSelectedIds = [...prev.selectedIds, block.id];
      }

      // Calculate current sum
      const selectedBlocks = newSelectedIds.map(id => {
        for (const row of prev.grid) {
          const found = row.find(b => b?.id === id);
          if (found) return found;
        }
        return null;
      }).filter(Boolean) as Block[];

      const currentSum = selectedBlocks.reduce((acc, b) => acc + b.value, 0);

      if (currentSum === prev.targetSum) {
        // SUCCESS!
        const newGrid = prev.grid.map(row => 
          row.map(b => b && newSelectedIds.includes(b.id) ? null : b)
        );
        
        const gravityGrid = applyGravity(newGrid);
        
        // In classic mode, add a row after success
        let finalGrid = gravityGrid;
        let gameOver = false;
        if (prev.mode === 'classic') {
          if (checkGameOver(gravityGrid)) {
            gameOver = true;
          } else {
            finalGrid = shiftUp(gravityGrid);
            if (checkGameOver(finalGrid)) gameOver = true;
          }
        }

        const points = prev.targetSum * newSelectedIds.length * (prev.combo + 1);
        const newScore = prev.score + points;
        const newHighScore = Math.max(newScore, prev.highScore);
        if (newHighScore > prev.highScore) {
          localStorage.setItem(STORAGE_KEY, newHighScore.toString());
        }

        return {
          ...prev,
          grid: finalGrid,
          selectedIds: [],
          targetSum: getTargetSum(prev.level),
          score: newScore,
          highScore: newHighScore,
          isGameOver: gameOver,
          combo: prev.combo + 1,
          level: Math.floor(newScore / 1000) + 1,
          timeLeft: prev.mode === 'time' ? Math.max(5, 10 - Math.floor(prev.level / 2)) : undefined,
          maxTime: prev.mode === 'time' ? Math.max(5, 10 - Math.floor(prev.level / 2)) : undefined,
        };
      } else if (currentSum > prev.targetSum) {
        // FAILED - Exceeded sum
        return {
          ...prev,
          selectedIds: [],
          combo: 0
        };
      }

      return {
        ...prev,
        selectedIds: newSelectedIds
      };
    });
  };

  // Time Mode Logic
  useEffect(() => {
    if (gameState?.mode === 'time' && !gameState.isGameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (!prev || prev.timeLeft === undefined) return prev;
          
          if (prev.timeLeft <= 0) {
            // Time up! Add a row
            if (checkGameOver(prev.grid)) {
              return { ...prev, isGameOver: true };
            }
            const newGrid = shiftUp(prev.grid);
            const gameOver = checkGameOver(newGrid);
            const nextMaxTime = Math.max(5, 10 - Math.floor(prev.level / 2));
            return {
              ...prev,
              grid: newGrid,
              timeLeft: nextMaxTime,
              maxTime: nextMaxTime,
              isGameOver: gameOver,
              combo: 0,
              selectedIds: []
            };
          }
          
          return {
            ...prev,
            timeLeft: prev.timeLeft - 0.1
          };
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.mode, gameState?.isGameOver, isPaused]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 font-sans text-[#141414]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter italic font-serif">SUMSTACK</h1>
            <p className="text-sm uppercase tracking-widest opacity-60 font-mono">数字堆叠 · 求和消除</p>
          </div>

          {/* Instructions Card - Now directly visible */}
          <div className="bg-white/50 border-2 border-[#141414] p-6 rounded-3xl text-left shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <h2 className="text-lg font-bold mb-3 italic font-serif flex items-center gap-2">
              <Info className="w-4 h-4" />
              玩法说明
            </h2>
            <ul className="space-y-3 text-xs leading-relaxed">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <p>点击方块使其数值相加。目标是匹配顶部的<b>目标数字</b>。</p>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <p>方块无需相邻，网格中任意位置的组合均可生效！</p>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <p>如果方块堆积到最顶端，游戏结束。</p>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => initGame('classic')}
              className="group relative bg-[#141414] text-[#E4E3E0] p-6 rounded-2xl overflow-hidden transition-transform active:scale-95"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-xl font-bold">开始游戏 (经典)</h3>
                  <p className="text-xs opacity-60">消除后新增一行。挑战生存极限。</p>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => initGame('time')}
              className="group relative bg-white border-2 border-[#141414] p-6 rounded-2xl overflow-hidden transition-transform active:scale-95"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-xl font-bold">计时挑战</h3>
                  <p className="text-xs opacity-60">与时间赛跑。倒计时结束强制新增一行。</p>
                </div>
                <Timer className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center p-4 font-sans text-[#141414] overflow-hidden">
      {/* Header Stats */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">得分</span>
          <span className="text-2xl font-black font-mono leading-none">{gameState.score}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">目标</span>
          <motion.div 
            key={gameState.targetSum}
            initial={{ scale: 1.5, color: '#F27D26' }}
            animate={{ scale: 1, color: '#141414' }}
            className="text-5xl font-black italic font-serif leading-none"
          >
            {gameState.targetSum}
          </motion.div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">最高分</span>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-[#F27D26]" />
            <span className="text-2xl font-black font-mono leading-none">{gameState.highScore}</span>
          </div>
        </div>
      </div>

      {/* Progress / Timer Bar */}
      <div className="w-full max-w-md h-1 bg-black/10 rounded-full mb-8 overflow-hidden">
        {gameState.mode === 'time' && (
          <motion.div 
            className="h-full bg-[#141414]"
            initial={false}
            animate={{ width: `${(gameState.timeLeft! / gameState.maxTime!) * 100}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        )}
      </div>

      {/* Game Grid */}
      <div className="relative w-full max-w-md aspect-[6/10] bg-white/40 border-2 border-[#141414] rounded-2xl p-2 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
        {/* Grid Lines (Visual only) */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 pointer-events-none opacity-5">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="border border-[#141414]" />
          ))}
        </div>

        {/* Blocks */}
        <div className="relative w-full h-full grid grid-cols-6 grid-rows-10 gap-1">
          {gameState.grid.map((row, rIdx) => 
            row.map((block, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className="relative w-full h-full">
                <AnimatePresence mode="popLayout">
                  {block && (
                    <motion.button
                      layoutId={block.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        backgroundColor: gameState.selectedIds.includes(block.id) ? '#141414' : '#FFFFFF',
                        color: gameState.selectedIds.includes(block.id) ? '#FFFFFF' : '#141414',
                      }}
                      exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBlockClick(block)}
                      className={`
                        w-full h-full rounded-lg border-2 border-[#141414]
                        flex items-center justify-center text-xl font-black font-mono
                        transition-colors duration-100
                        ${gameState.selectedIds.includes(block.id) ? 'shadow-none' : 'shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]'}
                      `}
                    >
                      {block.value}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState.isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-white p-6"
            >
              <h2 className="text-5xl font-black italic font-serif mb-2">游戏结束</h2>
              <p className="text-sm uppercase tracking-widest opacity-60 mb-8 font-mono">最终得分: {gameState.score}</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => initGame(gameState.mode)}
                  className="bg-white text-[#141414] px-8 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-5 h-5" />
                  再来一局
                </button>
                <button 
                  onClick={() => setGameState(null)}
                  className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-transform"
                >
                  返回菜单
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && !gameState.isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-white p-6"
            >
              <h2 className="text-4xl font-black italic font-serif mb-8">已暂停</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="bg-white text-[#141414] px-12 py-4 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
              >
                <Play className="w-6 h-6 fill-current" />
                继续游戏
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md mt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-4 bg-white border-2 border-[#141414] rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => initGame(gameState.mode)}
            className="p-4 bg-white border-2 border-[#141414] rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-[#F27D26]">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">连击 x{gameState.combo}</span>
          </div>
          <span className="text-xs font-medium opacity-50 uppercase tracking-widest font-mono">等级 {gameState.level}</span>
        </div>
      </div>

      {/* Selected Sum Indicator */}
      <AnimatePresence>
        {gameState.selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#141414] text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-xl z-30"
          >
            <span className="text-xs uppercase tracking-widest opacity-60 font-mono">当前总和</span>
            <span className="text-2xl font-black font-mono">
              {gameState.selectedIds.map(id => {
                for (const row of gameState.grid) {
                  const found = row.find(b => b?.id === id);
                  if (found) return found.value;
                }
                return 0;
              }).reduce((a, b) => a + b, 0)}
            </span>
            <span className="opacity-30">/</span>
            <span className="text-xl font-black opacity-60 font-mono">{gameState.targetSum}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
