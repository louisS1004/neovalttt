import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, CircleDot } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

const COLORS = ['#06b6d4', '#ec4899', '#f59e0b', '#a855f7']; // Cyan, Pink, Yellow, Purple

export const ColorSwitchRushGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const stateRef = useRef({
    ball: { x: 400, y: 380, vy: 0, r: 10, colorIndex: 0 },
    obstacles: [] as Array<{
      y: number;
      radius: number;
      thickness: number;
      angle: number;
      speed: number;
      hasStar: boolean;
      hasSwitcher: boolean;
    }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    cameraY: 0,
    score: 0,
    animId: 0,
  });

  const jump = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    s.ball.vy = -6.2;
    soundManager.jump();
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.ball = { x: 400, y: 380, vy: -5, r: 10, colorIndex: Math.floor(Math.random() * 4) };
    s.cameraY = 0;
    s.score = 0;
    s.particles = [];
    s.obstacles = [];

    // Generate first 6 obstacles going up
    for (let i = 0; i < 8; i++) {
      s.obstacles.push({
        y: 200 - i * 220,
        radius: 65,
        thickness: 10,
        angle: Math.random() * Math.PI,
        speed: (0.02 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        hasStar: true,
        hasSwitcher: true,
      });
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
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const loop = () => {
      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Gravity & ball physics
        s.ball.vy += 0.22;
        s.ball.y += s.ball.vy;

        // Camera follow
        const targetCamY = 300 - s.ball.y;
        if (targetCamY > s.cameraY) {
          s.cameraY += (targetCamY - s.cameraY) * 0.12;
        }

        // Falling below screen bottom
        if (s.ball.y + s.cameraY > 520) {
          handleGameOver();
          return;
        }

        // Update obstacles
        s.obstacles.forEach((ob, idx) => {
          ob.angle += ob.speed;

          // Star pickup check (center of ring)
          if (ob.hasStar && Math.hypot(s.ball.x - 400, s.ball.y - ob.y) < 22) {
            ob.hasStar = false;
            soundManager.coin();
            s.score += 1;
            onScoreUpdate(s.score);
            for (let p = 0; p < 8; p++) {
              s.particles.push({
                x: 400,
                y: ob.y,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                color: '#fbbf24',
                life: 0.4,
              });
            }
          }

          // Switcher pickup check (halfway between rings)
          const switchY = ob.y - 110;
          if (ob.hasSwitcher && Math.hypot(s.ball.x - 400, s.ball.y - switchY) < 16) {
            ob.hasSwitcher = false;
            soundManager.powerup();
            // Pick different color
            let nextCol = Math.floor(Math.random() * 4);
            while (nextCol === s.ball.colorIndex) {
              nextCol = Math.floor(Math.random() * 4);
            }
            s.ball.colorIndex = nextCol;
          }

          // Collision check with ring segments
          const distToRing = Math.hypot(s.ball.x - 400, s.ball.y - ob.y);
          if (Math.abs(distToRing - ob.radius) < ob.thickness / 2 + s.ball.r - 2) {
            // Find which arc angle the ball is at relative to ring center
            let ballAngle = Math.atan2(s.ball.y - ob.y, s.ball.x - 400) - ob.angle;
            while (ballAngle < 0) ballAngle += Math.PI * 2;
            ballAngle = ballAngle % (Math.PI * 2);

            // 4 quadrants = 4 colors
            const segIndex = Math.floor((ballAngle / (Math.PI * 2)) * 4) % 4;
            if (segIndex !== s.ball.colorIndex) {
              handleGameOver();
              return;
            }
          }
        });

        // Spawn higher obstacles as we climb
        const highestOb = s.obstacles[s.obstacles.length - 1];
        if (highestOb.y + s.cameraY > -200) {
          s.obstacles.push({
            y: highestOb.y - 220,
            radius: 65,
            thickness: 10,
            angle: Math.random() * Math.PI,
            speed: (0.022 + Math.min(0.04, s.score * 0.002)) * (Math.random() > 0.5 ? 1 : -1),
            hasStar: true,
            hasSwitcher: true,
          });
        }

        // Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.life -= 0.016;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0, 0, 800, 500);

      ctx.save();
      ctx.translate(0, s.cameraY);

      // Render Obstacles
      s.obstacles.forEach((ob) => {
        // Draw 4 colored ring segments
        const step = (Math.PI * 2) / 4;
        for (let i = 0; i < 4; i++) {
          const start = ob.angle + i * step;
          const end = start + step;
          ctx.beginPath();
          ctx.arc(400, ob.y, ob.radius, start, end);
          ctx.strokeStyle = COLORS[i];
          ctx.lineWidth = ob.thickness;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw star inside
        if (ob.hasStar) {
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(400, ob.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw color switcher orb
        if (ob.hasSwitcher) {
          const sy = ob.y - 110;
          for (let c = 0; c < 4; c++) {
            ctx.beginPath();
            ctx.arc(400, sy, 8, (c * Math.PI) / 2, ((c + 1) * Math.PI) / 2);
            ctx.fillStyle = COLORS[c];
            ctx.lineTo(400, sy);
            ctx.fill();
          }
        }
      });

      // Render Player Ball
      if (gameState === 'playing' || gameState === 'start') {
        const ballColor = COLORS[s.ball.colorIndex];
        ctx.save();
        ctx.shadowColor = ballColor;
        ctx.shadowBlur = 16;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
        ctx.fill();

        // White inner gleam
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.ball.x - 2, s.ball.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.explosion();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('color-switch-rush', s.score);
      reportGameActivity('color-switch-rush', s.score);
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
      onClick={jump}
      className="relative w-full h-full flex items-center justify-center bg-[#0a0d18] cursor-pointer select-none"
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
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <CircleDot className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            COLOR SWITCH RUSH
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Propulsez la balle à travers les anneaux en passant impérativement par le segment de votre couleur !
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(16,185,129,0.6)] active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>PROPULSER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in cursor-default">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">DISCORDANCE CHROMATIQUE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">BALLE DÉTRUITE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">ÉTOILES COLLECTÉES</span>
            <span className="font-mono-code text-3xl font-extrabold text-emerald-400">{finalScore}</span>
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
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RÉESSAYER</span>
          </button>
        </div>
      )}
    </div>
  );
};
