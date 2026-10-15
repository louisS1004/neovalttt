import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Zap, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const PixelEscapeGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const stateRef = useRef({
    player: {
      x: 390,
      y: 400,
      vx: 0,
      vy: 0,
      w: 18,
      h: 22,
      isGrounded: false,
      onWallLeft: false,
      onWallRight: false,
    },
    keys: { left: false, right: false },
    laserY: 480,
    laserSpeed: 45, // pixels per second upward
    platforms: [] as Array<{ x: number; y: number; w: number; h: number }>,
    walls: [] as Array<{ x: number; y: number; w: number; h: number }>,
    exitPortal: { x: 375, y: -2380, w: 50, h: 50 },
    cameraY: 0,
    score: 0,
    startTime: 0,
    animId: 0,
  });

  const jump = () => {
    const s = stateRef.current;
    if (s.player.isGrounded) {
      s.player.vy = -12;
      s.player.isGrounded = false;
      soundManager.jump();
    } else if (s.player.onWallLeft) {
      // Wall jump right
      s.player.vy = -11;
      s.player.vx = 7;
      s.player.onWallLeft = false;
      soundManager.jump();
    } else if (s.player.onWallRight) {
      // Wall jump left
      s.player.vy = -11;
      s.player.vx = -7;
      s.player.onWallRight = false;
      soundManager.jump();
    }
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.player = {
      x: 390,
      y: 400,
      vx: 0,
      vy: 0,
      w: 18,
      h: 22,
      isGrounded: false,
      onWallLeft: false,
      onWallRight: false,
    };
    s.laserY = 520;
    s.laserSpeed = 48;
    s.cameraY = 0;
    s.score = 0;
    s.startTime = Date.now();

    // Tower walls & platforms going from y = 450 to y = -2400
    s.walls = [
      { x: 140, y: -2500, w: 20, h: 3000 },
      { x: 640, y: -2500, w: 20, h: 3000 },
    ];

    s.platforms = [{ x: 140, y: 440, w: 520, h: 30 }]; // Floor

    let py = 380;
    for (let i = 0; i < 30; i++) {
      py -= 75 + Math.random() * 20;
      const w = 90 + Math.random() * 40;
      const x = 180 + Math.random() * (460 - w);
      s.platforms.push({ x, y: py, w, h: 14 });
    }

    s.exitPortal = { x: 375, y: py - 60, w: 50, h: 50 };
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
      if (['ArrowUp', 'KeyW', 'KeyZ', 'Space'].includes(e.code)) {
        e.preventDefault();
        jump();
      }
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
        // Horizontal movement
        const speed = 5.2;
        if (s.keys.left) s.player.vx = -speed;
        else if (s.keys.right) s.player.vx = speed;
        else s.player.vx *= 0.7;

        // Gravity & wall slide
        const wallSliding = !s.player.isGrounded && (s.player.onWallLeft || s.player.onWallRight) && s.player.vy > 0;
        s.player.vy += (wallSliding ? 8 : 24) * dt;

        s.player.x += s.player.vx;
        s.player.y += s.player.vy;

        // Laser rising
        s.laserY -= s.laserSpeed * dt;

        // Camera follow player
        const targetCamY = 280 - s.player.y;
        s.cameraY += (targetCamY - s.cameraY) * 0.12;

        // Check if player touched by laser
        if (s.player.y + s.player.h >= s.laserY) {
          handleGameOver();
          return;
        }

        // Wall collisions
        s.player.onWallLeft = false;
        s.player.onWallRight = false;

        if (s.player.x <= 160) {
          s.player.x = 160;
          s.player.onWallLeft = true;
        }
        if (s.player.x + s.player.w >= 640) {
          s.player.x = 640 - s.player.w;
          s.player.onWallRight = true;
        }

        // Platform collisions
        s.player.isGrounded = false;
        s.platforms.forEach((p) => {
          if (
            s.player.x + s.player.w > p.x &&
            s.player.x < p.x + p.w &&
            s.player.y + s.player.h >= p.y &&
            s.player.y + s.player.h <= p.y + 14 &&
            s.player.vy >= 0
          ) {
            s.player.y = p.y - s.player.h;
            s.player.vy = 0;
            s.player.isGrounded = true;
          }
        });

        // Altitude score update
        const currentAltitude = Math.max(0, Math.round(400 - s.player.y));
        if (currentAltitude > s.score) {
          s.score = currentAltitude;
          onScoreUpdate(s.score);
        }

        // Exit Portal reach
        const port = s.exitPortal;
        if (
          s.player.x + s.player.w > port.x &&
          s.player.x < port.x + port.w &&
          s.player.y + s.player.h > port.y &&
          s.player.y < port.y + port.h
        ) {
          soundManager.win();
          const elapsedSec = Math.round((Date.now() - s.startTime) / 1000);
          const timeBonus = Math.max(0, 1000 - elapsedSec * 15);
          s.score += 1500 + timeBonus;
          const res = saveGameScore('pixel-escape', s.score);
          reportGameActivity('pixel-escape', s.score);
          setFinalScore(s.score);
          setIsHighScore(res.isNewHighScore);
          setGameState('victory');
          return;
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#081413';
      ctx.fillRect(0, 0, 800, 500);

      ctx.save();
      ctx.translate(0, s.cameraY);

      // Tower walls
      ctx.fillStyle = '#112925';
      s.walls.forEach((w) => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = '#14b8a6';
        ctx.fillRect(w.x === 140 ? 158 : 640, w.y, 2, w.h);
      });

      // Platforms
      s.platforms.forEach((p) => {
        ctx.fillStyle = '#1d3e38';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(p.x, p.y, p.w, 3);
      });

      // Exit portal
      const port = s.exitPortal;
      ctx.save();
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(port.x, port.y, port.w, port.h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(port.x + 8, port.y + 8, port.w - 16, port.h - 16);
      ctx.restore();

      // Laser Wall of Death
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 24;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(140, s.laserY, 520, 600);
      // Bright top edge
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(140, s.laserY, 520, 4);
      ctx.restore();

      // Player
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

        // Visor
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pl.x + (s.player.vx < 0 ? 2 : 8), pl.y + 4, 8, 4);
        ctx.restore();
      }

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('pixel-escape', s.score);
      reportGameActivity('pixel-escape', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#081413] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-600/20 border border-teal-500/50 flex items-center justify-center text-teal-400 mb-3 shadow-[0_0_20px_rgba(20,184,166,0.4)]">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            PIXEL ESCAPE
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Fuyez la mer de laser destructrice qui monte du gouffre ! Utilisez les rebonds contre les parois pour grimper à toute vitesse.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(20,184,166,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>COMMENCER L’ÉVASION</span>
          </button>
        </div>
      )}

      {/* Victory */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-300 mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono-code uppercase tracking-widest text-teal-400 mb-1">PORTAIL ATTEINT</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">SURVIE CONFIRMÉE !</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-teal-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(20,184,166,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REJOUER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">DÉSINTÉGRATION</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">LASER FATAL</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">ALTITUDE DE FUITE</span>
            <span className="font-mono-code text-3xl font-extrabold text-teal-400">{finalScore} m</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(20,184,166,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVELLE TENTATIVE</span>
          </button>
        </div>
      )}

      {/* Touch controls for mobile */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onTouchStart={() => { stateRef.current.keys.left = true; }}
              onTouchEnd={() => { stateRef.current.keys.left = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-teal-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-teal-600"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={jump}
            className="pointer-events-auto w-14 h-14 rounded-full bg-teal-600/90 border-2 border-teal-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            SAUT
          </button>
        </div>
      )}
    </div>
  );
};
