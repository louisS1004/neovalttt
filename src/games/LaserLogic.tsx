import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Lightbulb, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

interface Cell {
  type: 'empty' | 'emitter' | 'mirror' | 'target' | 'block';
  dir?: number; // 0: right, 1: down, 2: left, 3: up
  mirrorType?: '/' | '\\';
  isHit?: boolean;
}

export const LaserLogicGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'victory'>('start');
  const [level, setLevel] = useState<number>(1);
  const [moves, setMoves] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const COLS = 6;
  const ROWS = 5;
  const CELL_SIZE = 75;
  const OFFSET_X = (800 - COLS * CELL_SIZE) / 2;
  const OFFSET_Y = (500 - ROWS * CELL_SIZE) / 2;

  const stateRef = useRef({
    grid: [] as Cell[][],
    laserPath: [] as Array<{ x: number; y: number }>,
    level: 1,
    moves: 0,
    score: 0,
    animId: 0,
  });

  const loadPuzzle = (lvl: number) => {
    const s = stateRef.current;
    s.level = lvl;
    setLevel(lvl);

    const g: Cell[][] = Array(ROWS)
      .fill(null)
      .map(() =>
        Array(COLS)
          .fill(null)
          .map(() => ({ type: 'empty' }))
      );

    if (lvl === 1) {
      // Emitter at (0, 1) shooting right
      g[1][0] = { type: 'emitter', dir: 0 };
      // Target at (3, 5)
      g[3][5] = { type: 'target', isHit: false };
      // Mirrors
      g[1][3] = { type: 'mirror', mirrorType: '/' };
      g[3][3] = { type: 'mirror', mirrorType: '/' };
      g[2][1] = { type: 'mirror', mirrorType: '\\' };
    } else if (lvl === 2) {
      g[0][0] = { type: 'emitter', dir: 1 }; // shooting down
      g[4][5] = { type: 'target', isHit: false };
      g[2][0] = { type: 'mirror', mirrorType: '/' };
      g[2][4] = { type: 'mirror', mirrorType: '\\' };
      g[4][4] = { type: 'mirror', mirrorType: '/' };
      g[1][2] = { type: 'mirror', mirrorType: '/' };
    } else if (lvl === 3) {
      g[2][0] = { type: 'emitter', dir: 0 };
      g[0][5] = { type: 'target', isHit: false };
      g[4][5] = { type: 'target', isHit: false }; // 2 targets!
      g[2][2] = { type: 'mirror', mirrorType: '\\' };
      g[4][2] = { type: 'mirror', mirrorType: '/' };
      g[0][2] = { type: 'mirror', mirrorType: '\\' };
      g[2][4] = { type: 'mirror', mirrorType: '/' };
    } else {
      // Level 4
      g[0][1] = { type: 'emitter', dir: 1 };
      g[4][1] = { type: 'target', isHit: false };
      g[2][5] = { type: 'target', isHit: false };
      g[3][1] = { type: 'mirror', mirrorType: '/' };
      g[3][4] = { type: 'mirror', mirrorType: '\\' };
      g[2][4] = { type: 'mirror', mirrorType: '/' };
      g[1][3] = { type: 'mirror', mirrorType: '\\' };
    }

    s.grid = g;
    calculateLaser();
  };

  const calculateLaser = () => {
    const s = stateRef.current;
    const g = s.grid;
    const path: Array<{ x: number; y: number }> = [];

    // Reset hit state on all targets
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c].type === 'target') g[r][c].isHit = false;
      }
    }

    // Find emitter
    let startR = 0,
      startC = 0,
      dir = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c].type === 'emitter') {
          startR = r;
          startC = c;
          dir = g[r][c].dir || 0;
          break;
        }
      }
    }

    let curR = startR;
    let curC = startC;
    path.push({
      x: OFFSET_X + curC * CELL_SIZE + CELL_SIZE / 2,
      y: OFFSET_Y + curR * CELL_SIZE + CELL_SIZE / 2,
    });

    const dr = [0, 1, 0, -1]; // 0: right, 1: down, 2: left, 3: up
    const dc = [1, 0, -1, 0];

    let steps = 0;
    while (steps++ < 30) {
      curR += dr[dir];
      curC += dc[dir];

      if (curR < 0 || curR >= ROWS || curC < 0 || curC >= COLS) break;

      const cell = g[curR][curC];
      path.push({
        x: OFFSET_X + curC * CELL_SIZE + CELL_SIZE / 2,
        y: OFFSET_Y + curR * CELL_SIZE + CELL_SIZE / 2,
      });

      if (cell.type === 'target') {
        cell.isHit = true;
        break; // Reached target!
      } else if (cell.type === 'mirror') {
        // Reflect beam
        if (cell.mirrorType === '/') {
          if (dir === 0) dir = 3; // Right -> Up
          else if (dir === 1) dir = 2; // Down -> Left
          else if (dir === 2) dir = 1; // Left -> Down
          else if (dir === 3) dir = 0; // Up -> Right
        } else {
          // '\' mirror
          if (dir === 0) dir = 1; // Right -> Down
          else if (dir === 1) dir = 0; // Down -> Right
          else if (dir === 2) dir = 3; // Left -> Up
          else if (dir === 3) dir = 2; // Up -> Left
        }
      }
    }

    s.laserPath = path;

    // Check if all targets are hit
    let allHit = true;
    let targetCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c].type === 'target') {
          targetCount++;
          if (!g[r][c].isHit) allHit = false;
        }
      }
    }

    if (allHit && targetCount > 0) {
      soundManager.win();
      s.score += 500;
      onScoreUpdate(s.score);

      setTimeout(() => {
        if (s.level < 4) {
          loadPuzzle(s.level + 1);
        } else {
          const res = saveGameScore('laser-logic', s.score);
          reportGameActivity('laser-logic', s.score);
          setFinalScore(s.score);
          setIsHighScore(res.isNewHighScore);
          setGameState('victory');
        }
      }, 700);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    const cell = s.grid[r][c];

    if (cell.type === 'mirror') {
      soundManager.click();
      cell.mirrorType = cell.mirrorType === '/' ? '\\' : '/';
      s.moves += 1;
      setMoves(s.moves);
      calculateLaser();
    }
  };

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.score = 0;
    s.moves = 0;
    setMoves(0);
    loadPuzzle(1);
    onScoreUpdate(0);
  };

  useEffect(() => {
    if (gameState === 'playing') startGame();
  }, [restartKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 500 / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const c = Math.floor((mx - OFFSET_X) / CELL_SIZE);
      const r = Math.floor((my - OFFSET_Y) / CELL_SIZE);

      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        handleCellClick(r, c);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    const loop = () => {
      const s = stateRef.current;

      // Draw Grid
      ctx.fillStyle = '#08120e';
      ctx.fillRect(0, 0, 800, 500);

      // Render grid cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = OFFSET_X + c * CELL_SIZE;
          const y = OFFSET_Y + r * CELL_SIZE;
          const cell = s.grid[r]?.[c];

          ctx.fillStyle = '#0f241d';
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeStyle = '#1a3b30';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

          if (!cell) continue;

          // Render emitter
          if (cell.type === 'emitter') {
            ctx.save();
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Render target
          if (cell.type === 'target') {
            ctx.save();
            const color = cell.isHit ? '#fbbf24' : '#ef4444';
            ctx.shadowColor = color;
            ctx.shadowBlur = cell.isHit ? 20 : 8;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x + 14, y + 14, CELL_SIZE - 28, CELL_SIZE - 28);
            if (cell.isHit) {
              ctx.fillStyle = color;
              ctx.fillRect(x + 18, y + 18, CELL_SIZE - 36, CELL_SIZE - 36);
            }
            ctx.restore();
          }

          // Render mirror
          if (cell.type === 'mirror') {
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (cell.mirrorType === '/') {
              ctx.moveTo(x + 14, y + CELL_SIZE - 14);
              ctx.lineTo(x + CELL_SIZE - 14, y + 14);
            } else {
              ctx.moveTo(x + 14, y + 14);
              ctx.lineTo(x + CELL_SIZE - 14, y + CELL_SIZE - 14);
            }
            ctx.stroke();

            // Pivot ring
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Draw Laser Beam
      if (s.laserPath.length > 1) {
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.laserPath[0].x, s.laserPath[0].y);
        for (let i = 1; i < s.laserPath.length; i++) {
          ctx.lineTo(s.laserPath[i].x, s.laserPath[i].y);
        }
        ctx.stroke();

        // Inner beam white line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gameState, isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#08120e] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain cursor-pointer"
      />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-arcade font-bold text-emerald-300">
            NIVEAU {level} / 4
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700 text-xs font-mono-code font-bold text-slate-200">
            Coups : {moves}
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            LASER LOGIC
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Orientez les miroirs optiques pour faire bifurquer le rayon laser jusqu'aux récepteurs de puissance cibles.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(16,185,129,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>ALUMER LE LASER</span>
          </button>
        </div>
      )}

      {/* Victory */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono-code uppercase tracking-widest text-emerald-400 mb-1">CIRCUITS RÉSOLUS</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">MAÎTRE OPTIQUE !</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE RÉFLEXION</span>
            <span className="font-mono-code text-3xl font-extrabold text-emerald-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RÉSOUDRE À NOUVEAU</span>
          </button>
        </div>
      )}
    </div>
  );
};
