import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Grid3X3, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

type Board = number[][];

export const BlockMergeGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const spawnRandomTile = (currentBoard: Board): Board => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentBoard;
    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newBoard = currentBoard.map((row) => [...row]);
    newBoard[choice.r][choice.c] = val;
    return newBoard;
  };

  const startGame = () => {
    soundManager.click();
    soundManager.coin();
    let b: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    b = spawnRandomTile(b);
    b = spawnRandomTile(b);
    setBoard(b);
    setScore(0);
    setGameState('playing');
    onScoreUpdate(0);
  };

  useEffect(() => {
    if (gameState === 'playing') startGame();
  }, [restartKey]);

  // Movement logic for 2048
  const slideRow = (row: number[]): { newRow: number[]; pts: number } => {
    let arr = row.filter((val) => val !== 0);
    let pts = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        pts += arr[i];
        arr[i + 1] = 0;
        i++;
      }
    }
    arr = arr.filter((val) => val !== 0);
    while (arr.length < 4) arr.push(0);
    return { newRow: arr, pts };
  };

  const move = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (gameState !== 'playing' || isPaused) return;

    let changed = false;
    let gainedScore = 0;
    let nextBoard: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    if (dir === 'left') {
      for (let r = 0; r < 4; r++) {
        const { newRow, pts } = slideRow(board[r]);
        gainedScore += pts;
        nextBoard[r] = newRow;
        if (newRow.some((val, idx) => val !== board[r][idx])) changed = true;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const rev = [...board[r]].reverse();
        const { newRow, pts } = slideRow(rev);
        gainedScore += pts;
        const finalRow = newRow.reverse();
        nextBoard[r] = finalRow;
        if (finalRow.some((val, idx) => val !== board[r][idx])) changed = true;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        const col = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const { newRow, pts } = slideRow(col);
        gainedScore += pts;
        for (let r = 0; r < 4; r++) nextBoard[r][c] = newRow[r];
        if (newRow.some((val, idx) => val !== board[idx][c])) changed = true;
      }
    } else if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const col = [board[3][c], board[2][c], board[1][c], board[0][c]];
        const { newRow, pts } = slideRow(col);
        gainedScore += pts;
        const finalCol = newRow.reverse();
        for (let r = 0; r < 4; r++) nextBoard[r][c] = finalCol[r];
        if (finalCol.some((val, idx) => val !== board[idx][c])) changed = true;
      }
    }

    if (changed) {
      if (gainedScore > 0) soundManager.combo(2);
      else soundManager.click();

      const newScore = score + gainedScore;
      setScore(newScore);
      onScoreUpdate(newScore);

      const withSpawn = spawnRandomTile(nextBoard);
      setBoard(withSpawn);

      // Check game over
      if (isGameOver(withSpawn)) {
        soundManager.gameover();
        const res = saveGameScore('block-merge', newScore);
        reportGameActivity('block-merge', newScore);
        setIsHighScore(res.isNewHighScore);
        setGameState('gameover');
      }
    }
  };

  const isGameOver = (b: Board): boolean => {
    // Check for empty cell
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) return false;
      }
    }
    // Check for adjacent merges
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (b[r][c] === b[r][c + 1]) return false;
      }
    }
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 3; r++) {
        if (b[r][c] === b[r + 1][c]) return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) {
        e.preventDefault();
        move('left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        move('right');
      } else if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) {
        e.preventDefault();
        move('up');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        move('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, gameState, isPaused, score]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStartRef.current = null;
  };

  // Cyber tile styling
  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-purple-950/80 text-purple-200 border-purple-800/80 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
      case 4:
        return 'bg-purple-800 text-white border-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
      case 8:
        return 'bg-fuchsia-700 text-white border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.5)]';
      case 16:
        return 'bg-pink-600 text-white border-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.6)]';
      case 32:
        return 'bg-rose-600 text-white border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.6)]';
      case 64:
        return 'bg-orange-600 text-white border-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.7)]';
      case 128:
        return 'bg-amber-500 text-black font-extrabold border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)]';
      case 256:
        return 'bg-yellow-400 text-black font-black border-yellow-200 shadow-[0_0_22px_rgba(250,204,21,0.9)]';
      case 512:
        return 'bg-cyan-500 text-black font-black border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.9)]';
      case 1024:
        return 'bg-emerald-500 text-black font-black border-emerald-300 shadow-[0_0_28px_rgba(16,185,129,1)]';
      case 2048:
        return 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white font-black border-white shadow-[0_0_35px_rgba(245,158,11,1)] animate-pulse';
      default:
        return 'bg-slate-900/60 border-slate-800/80';
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#0d0918] p-4 select-none"
    >
      {/* 4x4 Cyber Board */}
      <div className="w-full max-w-[360px] aspect-square p-3 rounded-2xl bg-[#140e26] border-2 border-purple-500/40 shadow-[0_0_35px_rgba(168,85,247,0.25)] grid grid-cols-4 gap-2.5">
        {board.flat().map((val, idx) => (
          <div
            key={idx}
            className={`rounded-xl border flex items-center justify-center font-arcade font-bold text-lg sm:text-2xl transition-all duration-150 ${getTileStyle(
              val
            )}`}
          >
            {val > 0 ? val : ''}
          </div>
        ))}
      </div>

      {/* Touch swipe help */}
      <p className="text-[11px] text-slate-400 mt-3 font-mono-code hidden sm:block">
        Utilisez les flèches ou ZQSD pour faire glisser les tuiles
      </p>

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Grid3X3 className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            BLOCK MERGE
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Glissez les tuiles pour fusionner les nombres identiques (2+2=4, 4+4=8). Formez la tuile suprême 2048 !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(168,85,247,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>FUSIONNER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">GRILLE BLOQUÉE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">PARTIE TERMINÉE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-purple-400">{score}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REJOUER</span>
          </button>
        </div>
      )}

      {/* Mobile directional buttons */}
      {gameState === 'playing' && (
        <div className="mt-3 grid grid-cols-3 gap-1 md:hidden">
          <div />
          <button
            onClick={() => move('up')}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-purple-600"
          >
            ▲
          </button>
          <div />
          <button
            onClick={() => move('left')}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-purple-600"
          >
            ◀
          </button>
          <button
            onClick={() => move('down')}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-purple-600"
          >
            ▼
          </button>
          <button
            onClick={() => move('right')}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-purple-600"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
};
