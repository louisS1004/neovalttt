import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, ArrowUpDown } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const GravityFlipGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const stateRef = useRef({
    player: { x: 120, y: 400, vy: 0, size: 22, gravityDir: 1 }, // gravityDir: 1 (floor), -1 (ceiling)
    obstacles: [] as Array<{ x: number; y: number; w: number; h: number; onCeiling: boolean }>,
    orbs: [] as Array<{ x: number; y: number; collected: boolean }>,
    speed: 5.5,
    score: 0,
    lastSpawn: 0,
    animId: 0,
  });

  const flipGravity = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    // Check if on floor or ceiling to allow flip
    const onFloor = s.player.y >= 440 - s.player.size - 2;
    const onCeiling = s.player.y <= 60 + 2;

    if (onFloor || onCeiling) {
      s.player.gravityDir = -s.player.gravityDir;
      soundManager.jump();
    }
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.player = { x: 120, y: 440 - 22, vy: 0, size: 22, gravityDir: 1 };
    s.obstacles = [];
    s.orbs = [];
    s.speed = 5.5;
    s.score = 0;
    s.lastSpawn = Date.now();
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        flipGravity();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Gravity
        s.player.vy += 32 * s.player.gravityDir * dt * 60;
        s.player.y += s.player.vy * dt;

        // Floor / ceiling limits
        const floorY = 440 - s.player.size;
        const ceilY = 60;

        if (s.player.y >= floorY) {
          s.player.y = floorY;
          s.player.vy = 0;
        } else if (s.player.y <= ceilY) {
          s.player.y = ceilY;
          s.player.vy = 0;
        }

        // Speed ramp & score
        s.speed = Math.min(10.5, 5.5 + s.score * 0.003);
        s.score += Math.round(dt * 20);
        onScoreUpdate(s.score);

        // Spawn obstacles & orbs
        if (Date.now() - s.lastSpawn > Math.max(650, 1500 - s.score * 1.5)) {
          s.lastSpawn = Date.now();
          const onCeiling = Math.random() > 0.5;
          const w = 24 + Math.random() * 20;
          const h = 32 + Math.random() * 30;
          const y = onCeiling ? 60 : 440 - h;

          s.obstacles.push({
            x: 820,
            y,
            w,
            h,
            onCeiling,
          });

          // Chance to spawn orb
          if (Math.random() < 0.6) {
            s.orbs.push({
              x: 850 + Math.random() * 100,
              y: 200 + Math.random() * 100,
              collected: false,
            });
          }
        }

        // Update obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const ob = s.obstacles[i];
          ob.x -= s.speed * 60 * dt;

          // AABB Collision with player
          if (
            s.player.x + s.player.size > ob.x &&
            s.player.x < ob.x + ob.w &&
            s.player.y + s.player.size > ob.y &&
            s.player.y < ob.y + ob.h
          ) {
            handleGameOver();
            return;
          }

          if (ob.x < -60) s.obstacles.splice(i, 1);
        }

        // Update orbs
        for (let i = s.orbs.length - 1; i >= 0; i--) {
          const orb = s.orbs[i];
          orb.x -= s.speed * 60 * dt;

          if (!orb.collected) {
            if (
              Math.hypot(
                s.player.x + s.player.size / 2 - orb.x,
                s.player.y + s.player.size / 2 - orb.y
              ) < 22
            ) {
              orb.collected = true;
              soundManager.coin();
              s.score += 50;
              onScoreUpdate(s.score);
            }
          }

          if (orb.x < -40 || orb.collected) s.orbs.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0b0c1c';
      ctx.fillRect(0, 0, 800, 500);

      // Floor & Ceiling borders
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 800, 60);
      ctx.fillRect(0, 440, 800, 60);

      // Glowing neon rails
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(0, 58, 800, 3);
      ctx.fillRect(0, 440, 800, 3);

      // Render Orbs
      s.orbs.forEach((orb) => {
        if (!orb.collected) {
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Render Obstacles (Spikes / Blocks)
      s.obstacles.forEach((ob) => {
        ctx.save();
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        if (ob.onCeiling) {
          ctx.moveTo(ob.x, ob.y);
          ctx.lineTo(ob.x + ob.w / 2, ob.y + ob.h);
          ctx.lineTo(ob.x + ob.w, ob.y);
        } else {
          ctx.moveTo(ob.x, ob.y + ob.h);
          ctx.lineTo(ob.x + ob.w / 2, ob.y);
          ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Render Player
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(pl.x, pl.y, pl.size, pl.size);

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pl.x + 4, pl.y + 4, pl.size - 8, pl.size - 8);

        // Gravity arrow
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        if (pl.gravityDir === 1) {
          ctx.moveTo(pl.x + pl.size / 2, pl.y + pl.size - 6);
          ctx.lineTo(pl.x + 6, pl.y + 7);
          ctx.lineTo(pl.x + pl.size - 6, pl.y + 7);
        } else {
          ctx.moveTo(pl.x + pl.size / 2, pl.y + 6);
          ctx.lineTo(pl.x + 6, pl.y + pl.size - 7);
          ctx.lineTo(pl.x + pl.size - 6, pl.y + pl.size - 7);
        }
        ctx.fill();
        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('gravity-flip', s.score);
      reportGameActivity('gravity-flip', s.score);
      setFinalScore(s.score);
      setIsHighScore(res.isNewHighScore);
      setGameState('gameover');
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, isPaused]);

  return (
    <div
      onClick={flipGravity}
      className="relative w-full h-full flex items-center justify-center bg-[#0b0c1c] cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain pointer-events-none"
      />

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in cursor-default">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 mb-3 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <ArrowUpDown className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            GRAVITY FLIP
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Inversez la gravité instantanément ! Alternez entre le sol et le plafond pour éviter les pointes et collecter les orbes d’énergie.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(99,102,241,0.6)] active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>INVERSER LE MONDE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in cursor-default">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">IMPACT DE POINTE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">PARCOURS INTERROMPU</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE DISTANCE</span>
            <span className="font-mono-code text-3xl font-extrabold text-indigo-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVEL ESSAI</span>
          </button>
        </div>
      )}

      {/* Touch indicator */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 text-center pointer-events-none md:hidden">
          <span className="px-3 py-1 rounded-full bg-black/60 text-slate-400 text-xs font-mono-code">
            Touchez l’écran pour inverser la gravité
          </span>
        </div>
      )}
    </div>
  );
};
