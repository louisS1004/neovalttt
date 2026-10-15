import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const NeonDodgeGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [slowMoCooldown, setSlowMoCooldown] = useState<number>(100);

  // Mutable refs for high performance 60fps loop
  const stateRef = useRef({
    player: { x: 400, y: 400, vx: 0, vy: 0, r: 12, speed: 6 },
    keys: { left: false, right: false, up: false, down: false, slowmo: false },
    obstacles: [] as Array<{ x: number; y: number; w: number; h: number; vx: number; vy: number; color: string; type: 'rect' | 'circle' }>,
    sparks: [] as Array<{ x: number; y: number; r: number; val: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number }>,
    score: 0,
    startTime: 0,
    lastObstacleTime: 0,
    slowMoActive: false,
    slowMoEnergy: 100,
    speedMultiplier: 1.0,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    soundManager.jump();
    setGameState('playing');
    const s = stateRef.current;
    s.player = { x: 400, y: 400, vx: 0, vy: 0, r: 12, speed: 6 };
    s.obstacles = [];
    s.sparks = [];
    s.particles = [];
    s.score = 0;
    s.slowMoEnergy = 100;
    s.speedMultiplier = 1.0;
    s.startTime = Date.now();
    s.lastObstacleTime = Date.now();
    onScoreUpdate(0);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      startGame();
    }
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
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
      if (e.code === 'Space') {
        e.preventDefault();
        k.slowmo = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
      if (e.code === 'Space') k.slowmo = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Handle Slow-Mo
        if (s.keys.slowmo && s.slowMoEnergy > 5) {
          s.slowMoActive = true;
          s.slowMoEnergy = Math.max(0, s.slowMoEnergy - dt * 45);
        } else {
          s.slowMoActive = false;
          s.slowMoEnergy = Math.min(100, s.slowMoEnergy + dt * 15);
        }
        setSlowMoCooldown(Math.round(s.slowMoEnergy));

        const timeFactor = s.slowMoActive ? 0.35 : 1.0;

        // Player Movement
        let dx = 0;
        let dy = 0;
        if (s.keys.left) dx -= 1;
        if (s.keys.right) dx += 1;
        if (s.keys.up) dy -= 1;
        if (s.keys.down) dy += 1;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        s.player.x += dx * s.player.speed;
        s.player.y += dy * s.player.speed;

        // Bounds clamp
        s.player.x = Math.max(s.player.r, Math.min(800 - s.player.r, s.player.x));
        s.player.y = Math.max(s.player.r, Math.min(500 - s.player.r, s.player.y));

        // Increase score passively by survival time
        s.score += Math.round(dt * 15 * s.speedMultiplier);
        s.speedMultiplier = 1.0 + Math.min(2.5, (Date.now() - s.startTime) / 25000);
        onScoreUpdate(s.score);

        // Spawn obstacles
        const spawnInterval = Math.max(250, 800 - (s.speedMultiplier - 1) * 350);
        if (Date.now() - s.lastObstacleTime > spawnInterval) {
          s.lastObstacleTime = Date.now();
          const side = Math.floor(Math.random() * 4); // 0: top, 1: bottom, 2: left, 3: right
          let ox = 0, oy = 0, ovx = 0, ovy = 0;
          const baseSpeed = (180 + Math.random() * 120) * s.speedMultiplier;

          if (side === 0) {
            ox = Math.random() * 800;
            oy = -40;
            ovx = (Math.random() - 0.5) * 80;
            ovy = baseSpeed;
          } else if (side === 1) {
            ox = Math.random() * 800;
            oy = 540;
            ovx = (Math.random() - 0.5) * 80;
            ovy = -baseSpeed;
          } else if (side === 2) {
            ox = -40;
            oy = Math.random() * 500;
            ovx = baseSpeed;
            ovy = (Math.random() - 0.5) * 80;
          } else {
            ox = 840;
            oy = Math.random() * 500;
            ovx = -baseSpeed;
            ovy = (Math.random() - 0.5) * 80;
          }

          const colors = ['#ec4899', '#06b6d4', '#f59e0b', '#a855f7', '#10b981'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const isCircle = Math.random() > 0.5;

          s.obstacles.push({
            x: ox,
            y: oy,
            w: 24 + Math.random() * 20,
            h: 24 + Math.random() * 20,
            vx: ovx,
            vy: ovy,
            color,
            type: isCircle ? 'circle' : 'rect',
          });
        }

        // Spawn bonus energy sparks
        if (Math.random() < 0.02 && s.sparks.length < 5) {
          s.sparks.push({
            x: 50 + Math.random() * 700,
            y: 50 + Math.random() * 400,
            r: 8,
            val: 25,
          });
        }

        // Update Obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const ob = s.obstacles[i];
          ob.x += ob.vx * dt * timeFactor;
          ob.y += ob.vy * dt * timeFactor;

          // Collision detection with player
          let collided = false;
          if (ob.type === 'circle') {
            const dist = Math.hypot(s.player.x - ob.x, s.player.y - ob.y);
            if (dist < s.player.r + ob.w / 2) collided = true;
          } else {
            const nearestX = Math.max(ob.x - ob.w / 2, Math.min(s.player.x, ob.x + ob.w / 2));
            const nearestY = Math.max(ob.y - ob.h / 2, Math.min(s.player.y, ob.y + ob.h / 2));
            const dist = Math.hypot(s.player.x - nearestX, s.player.y - nearestY);
            if (dist < s.player.r) collided = true;
          }

          if (collided) {
            // Trigger explosion & game over
            soundManager.explosion();
            soundManager.gameover();
            for (let p = 0; p < 30; p++) {
              s.particles.push({
                x: s.player.x,
                y: s.player.y,
                vx: (Math.random() - 0.5) * 350,
                vy: (Math.random() - 0.5) * 350,
                color: '#a855f7',
                life: 0.6,
                maxLife: 0.6,
              });
            }
            const res = saveGameScore('neon-dodge', s.score);
            reportGameActivity('neon-dodge', s.score);
            setFinalScore(s.score);
            setIsHighScore(res.isNewHighScore);
            setGameState('gameover');
            break;
          }

          // Out of screen bounds cleanup
          if (ob.x < -100 || ob.x > 900 || ob.y < -100 || ob.y > 600) {
            s.obstacles.splice(i, 1);
          }
        }

        // Spark pickups
        for (let i = s.sparks.length - 1; i >= 0; i--) {
          const sp = s.sparks[i];
          const dist = Math.hypot(s.player.x - sp.x, s.player.y - sp.y);
          if (dist < s.player.r + sp.r) {
            soundManager.coin();
            s.score += sp.val;
            onScoreUpdate(s.score);
            // Spawn spark particles
            for (let p = 0; p < 8; p++) {
              s.particles.push({
                x: sp.x,
                y: sp.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                color: '#fbbf24',
                life: 0.4,
                maxLife: 0.4,
              });
            }
            s.sparks.splice(i, 1);
          }
        }

        // Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDERING ---
      ctx.fillStyle = '#0a0b16';
      ctx.fillRect(0, 0, 800, 500);

      // Background grid
      ctx.strokeStyle = '#181b33';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= 800; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 500);
        ctx.stroke();
      }
      for (let y = 0; y <= 500; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      // Render sparks
      s.sparks.forEach((sp) => {
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render obstacles
      s.obstacles.forEach((ob) => {
        ctx.save();
        ctx.shadowColor = ob.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = ob.color;
        if (ob.type === 'circle') {
          ctx.beginPath();
          ctx.arc(ob.x, ob.y, ob.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(ob.x - ob.w / 2, ob.y - ob.h / 2, ob.w, ob.h);
        }
        ctx.restore();
      });

      // Render player
      if (gameState === 'playing' || gameState === 'start') {
        ctx.save();
        ctx.shadowColor = s.slowMoActive ? '#06b6d4' : '#a855f7';
        ctx.shadowBlur = s.slowMoActive ? 25 : 15;
        
        // Aura
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y, s.player.r + 3, 0, Math.PI * 2);
        ctx.fillStyle = s.slowMoActive ? 'rgba(6,182,212,0.3)' : 'rgba(168,85,247,0.3)';
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y, s.player.r, 0, Math.PI * 2);
        ctx.fillStyle = s.slowMoActive ? '#22d3ee' : '#c084fc';
        ctx.fill();

        // Inner white shine
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y, s.player.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      // Render particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused]);

  // Touch virtual controls
  const handleTouchDir = (dir: 'left' | 'right' | 'up' | 'down', pressed: boolean) => {
    stateRef.current.keys[dir] = pressed;
  };

  const handleTouchSlowMo = (pressed: boolean) => {
    stateRef.current.keys.slowmo = pressed;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0b16]">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            NEON DODGE
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Esquivez les obstacles géométriques lancés à vive allure. Ramassez les étincelles d’or et activez le ralenti avec Espace !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(168,85,247,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>JOUER</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">IMPACT DÉTECTÉ</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">GAME OVER</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE FINAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-cyan-300">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REJOUER</span>
          </button>
        </div>
      )}

      {/* On-screen Touch Controls for mobile/tablet */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1 pointer-events-auto opacity-80 active:opacity-100">
            <div />
            <button
              onTouchStart={() => handleTouchDir('up', true)}
              onTouchEnd={() => handleTouchDir('up', false)}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold text-sm flex items-center justify-center active:bg-purple-600"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={() => handleTouchDir('left', true)}
              onTouchEnd={() => handleTouchDir('left', false)}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold text-sm flex items-center justify-center active:bg-purple-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => handleTouchDir('down', true)}
              onTouchEnd={() => handleTouchDir('down', false)}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold text-sm flex items-center justify-center active:bg-purple-600"
            >
              ▼
            </button>
            <button
              onTouchStart={() => handleTouchDir('right', true)}
              onTouchEnd={() => handleTouchDir('right', false)}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold text-sm flex items-center justify-center active:bg-purple-600"
            >
              ▶
            </button>
          </div>

          {/* Slow-mo Touch Button */}
          <button
            onTouchStart={() => handleTouchSlowMo(true)}
            onTouchEnd={() => handleTouchSlowMo(false)}
            className="pointer-events-auto w-14 h-14 rounded-full bg-cyan-600/80 border-2 border-cyan-400 text-white font-arcade text-xs font-bold flex flex-col items-center justify-center shadow-lg active:scale-95"
          >
            <span>SLOW</span>
            <span className="text-[9px] font-mono-code">{slowMoCooldown}%</span>
          </button>
        </div>
      )}
    </div>
  );
};
