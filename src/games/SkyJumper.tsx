import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, CloudSun } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const SkyJumperGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const stateRef = useRef({
    player: { x: 400, y: 350, vx: 0, vy: -12, w: 26, h: 26, facingRight: true, jetpackTimer: 0 },
    keys: { left: false, right: false },
    platforms: [] as Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      type: 'normal' | 'moving' | 'fragile' | 'spring';
      vx?: number;
      broken?: boolean;
    }>,
    jetpacks: [] as Array<{ x: number; y: number; collected: boolean }>,
    cameraY: 0,
    maxHeight: 0,
    score: 0,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.player = { x: 400, y: 350, vx: 0, vy: -12, w: 26, h: 26, facingRight: true, jetpackTimer: 0 };
    s.cameraY = 0;
    s.maxHeight = 0;
    s.score = 0;
    s.jetpacks = [];
    s.platforms = [];

    // Base platform
    s.platforms.push({ x: 350, y: 440, w: 100, h: 14, type: 'normal' });

    // Generate initial platforms climbing up
    let lastY = 400;
    for (let i = 0; i < 20; i++) {
      lastY -= 45 + Math.random() * 35;
      const r = Math.random();
      let type: 'normal' | 'moving' | 'fragile' | 'spring' = 'normal';
      if (r < 0.25) type = 'moving';
      else if (r < 0.4) type = 'fragile';
      else if (r < 0.55) type = 'spring';

      s.platforms.push({
        x: 60 + Math.random() * 640,
        y: lastY,
        w: type === 'fragile' ? 60 : 75,
        h: 14,
        type,
        vx: type === 'moving' ? (Math.random() > 0.5 ? 2 : -2) : 0,
      });

      if (Math.random() < 0.08 && type === 'normal') {
        s.jetpacks.push({ x: 80 + Math.random() * 600, y: lastY - 24, collected: false });
      }
    }

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
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Player steer
        if (s.keys.left) {
          s.player.vx = -6.5;
          s.player.facingRight = false;
        } else if (s.keys.right) {
          s.player.vx = 6.5;
          s.player.facingRight = true;
        } else {
          s.player.vx *= 0.8;
        }

        s.player.x += s.player.vx;

        // Screen wrap
        if (s.player.x < -s.player.w) s.player.x = 800;
        else if (s.player.x > 800) s.player.x = -s.player.w;

        // Jetpack boost or gravity
        if (s.player.jetpackTimer > 0) {
          s.player.jetpackTimer -= dt;
          s.player.vy = -18; // Super boost
        } else {
          s.player.vy += 20 * dt;
        }

        s.player.y += s.player.vy;

        // Camera follow
        const targetCamY = 260 - s.player.y;
        if (targetCamY > s.cameraY) {
          s.cameraY += (targetCamY - s.cameraY) * 0.15;
          const currentHeight = Math.round(s.cameraY);
          if (currentHeight > s.maxHeight) {
            s.maxHeight = currentHeight;
            s.score = s.maxHeight;
            onScoreUpdate(s.score);
          }
        }

        // Platform bounce test (only when falling downwards)
        if (s.player.vy > 0) {
          for (const plat of s.platforms) {
            if (plat.broken) continue;
            if (
              s.player.x + s.player.w > plat.x &&
              s.player.x < plat.x + plat.w &&
              s.player.y + s.player.h >= plat.y &&
              s.player.y + s.player.h <= plat.y + 16
            ) {
              if (plat.type === 'fragile') {
                plat.broken = true;
                soundManager.hit();
              } else if (plat.type === 'spring') {
                s.player.vy = -19; // Spring bounce
                soundManager.powerup();
              } else {
                s.player.vy = -12; // Normal bounce
                soundManager.jump();
              }
              break;
            }
          }
        }

        // Collect Jetpack
        s.jetpacks.forEach((jp) => {
          if (!jp.collected) {
            if (
              Math.abs(s.player.x + s.player.w / 2 - jp.x) < 24 &&
              Math.abs(s.player.y + s.player.h / 2 - jp.y) < 24
            ) {
              jp.collected = true;
              s.player.jetpackTimer = 3.5;
              soundManager.powerup();
            }
          }
        });

        // Update moving platforms
        s.platforms.forEach((p) => {
          if (p.type === 'moving' && p.vx) {
            p.x += p.vx;
            if (p.x < 30 || p.x + p.w > 770) p.vx = -p.vx;
          }
        });

        // Generate higher platforms as we climb
        const highestY = Math.min(...s.platforms.map((p) => p.y));
        if (highestY + s.cameraY > -100) {
          for (let i = 0; i < 6; i++) {
            const nextY = highestY - (45 + Math.random() * 35) * (i + 1);
            const r = Math.random();
            let type: 'normal' | 'moving' | 'fragile' | 'spring' = 'normal';
            if (r < 0.28) type = 'moving';
            else if (r < 0.42) type = 'fragile';
            else if (r < 0.58) type = 'spring';

            s.platforms.push({
              x: 50 + Math.random() * 660,
              y: nextY,
              w: type === 'fragile' ? 55 : 75,
              h: 14,
              type,
              vx: type === 'moving' ? (Math.random() > 0.5 ? 2.5 : -2.5) : 0,
            });

            if (Math.random() < 0.1 && type === 'normal') {
              s.jetpacks.push({ x: 80 + Math.random() * 600, y: nextY - 24, collected: false });
            }
          }
        }

        // Cleanup offscreen bottom platforms
        s.platforms = s.platforms.filter((p) => p.y + s.cameraY < 580);

        // Fall into the void death
        if (s.player.y + s.cameraY > 520) {
          handleGameOver();
          return;
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#071626';
      ctx.fillRect(0, 0, 800, 500);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
      skyGrad.addColorStop(0, '#040b14');
      skyGrad.addColorStop(1, '#0e2b45');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 500);

      ctx.save();
      ctx.translate(0, s.cameraY);

      // Render Platforms
      s.platforms.forEach((p) => {
        if (p.broken) return;

        if (p.type === 'normal') {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
        } else if (p.type === 'moving') {
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 8;
        } else if (p.type === 'spring') {
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;
        } else {
          // Fragile
          ctx.fillStyle = '#78716c';
          ctx.shadowColor = '#78716c';
          ctx.shadowBlur = 4;
        }

        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 6);
        ctx.fill();

        // Draw spring coil on spring platforms
        if (p.type === 'spring') {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(p.x + p.w / 2 - 6, p.y - 7, 12, 7);
        }
      });

      // Render Jetpacks
      s.jetpacks.forEach((jp) => {
        if (!jp.collected) {
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(jp.x - 7, jp.y - 10, 14, 18);
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(jp.x - 4, jp.y - 6, 8, 10);
          ctx.restore();
        }
      });

      // Render Player Jumper Creature
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, pl.w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeOffset = pl.facingRight ? 4 : -4;
        ctx.beginPath();
        ctx.arc(pl.x + pl.w / 2 + eyeOffset, pl.y + pl.h / 2 - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pl.x + pl.w / 2 + eyeOffset + (pl.facingRight ? 1 : -1), pl.y + pl.h / 2 - 3, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Jetpack flame if active
        if (pl.jetpackTimer > 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(pl.x + 4, pl.y + pl.h);
          ctx.lineTo(pl.x + pl.w / 2, pl.y + pl.h + 18 + Math.random() * 8);
          ctx.lineTo(pl.x + pl.w - 4, pl.y + pl.h);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('sky-jumper', s.score);
      reportGameActivity('sky-jumper', s.score);
      setFinalScore(s.score);
      setIsHighScore(res.isNewHighScore);
      setGameState('gameover');
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#071626] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-sky-600/20 border border-sky-500/50 flex items-center justify-center text-sky-400 mb-3 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            <CloudSun className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            SKY JUMPER
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Grimpez vers la stratosphère ! Utilisez les rebonds automatiques, les ressorts dorés et attrapez les jetpacks pour pulvériser votre altitude.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(56,189,248,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>ENVOLEZ-VOUS</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">CHUTE DANS LE VIDE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">FIN DU VOL</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">ALTITUDE ATTEINTE</span>
            <span className="font-mono-code text-3xl font-extrabold text-sky-400">{finalScore} m</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVEAU SAUT</span>
          </button>
        </div>
      )}

      {/* Mobile Touch controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none md:hidden">
          <button
            onTouchStart={() => { stateRef.current.keys.left = true; }}
            onTouchEnd={() => { stateRef.current.keys.left = false; }}
            className="pointer-events-auto w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-600 text-white font-bold text-xl flex items-center justify-center active:bg-sky-600"
          >
            ◀
          </button>
          <button
            onTouchStart={() => { stateRef.current.keys.right = true; }}
            onTouchEnd={() => { stateRef.current.keys.right = false; }}
            className="pointer-events-auto w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-600 text-white font-bold text-xl flex items-center justify-center active:bg-sky-600"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
};
