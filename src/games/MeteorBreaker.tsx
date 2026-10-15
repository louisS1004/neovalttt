import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Target, Shield } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const MeteorBreakerGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [shields, setShields] = useState<number>(3);

  const CENTER_X = 400;
  const CENTER_Y = 250;

  const stateRef = useRef({
    turretAngle: 0,
    keys: { left: false, right: false, shoot: false },
    shots: [] as Array<{ x: number; y: number; vx: number; vy: number }>,
    meteors: [] as Array<{ x: number; y: number; vx: number; vy: number; r: number; tier: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    shields: 3,
    score: 0,
    lastSpawn: 0,
    lastShotTime: 0,
    animId: 0,
  });

  const shoot = () => {
    const s = stateRef.current;
    if (Date.now() - s.lastShotTime > 180) {
      s.lastShotTime = Date.now();
      soundManager.laser();
      s.shots.push({
        x: CENTER_X + Math.cos(s.turretAngle) * 26,
        y: CENTER_Y + Math.sin(s.turretAngle) * 26,
        vx: Math.cos(s.turretAngle) * 600,
        vy: Math.sin(s.turretAngle) * 600,
      });
    }
  };

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.turretAngle = -Math.PI / 2;
    s.shots = [];
    s.meteors = [];
    s.particles = [];
    s.shields = 3;
    s.score = 0;
    s.lastSpawn = Date.now();
    setShields(3);
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

    // Mouse aiming & click to shoot
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 500 / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      stateRef.current.turretAngle = Math.atan2(my - CENTER_Y, mx - CENTER_X);
    };

    const handleMouseDown = () => {
      if (gameState === 'playing' && !isPaused) shoot();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Keyboard turret rotation
        if (s.keys.left) s.turretAngle -= 3.5 * dt;
        if (s.keys.right) s.turretAngle += 3.5 * dt;

        // Spawn big meteors from screen border
        if (Date.now() - s.lastSpawn > Math.max(700, 1500 - s.score * 0.5)) {
          s.lastSpawn = Date.now();
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 480;
          const sx = CENTER_X + Math.cos(angle) * spawnDist;
          const sy = CENTER_Y + Math.sin(angle) * spawnDist;

          // Target slightly off-center
          const tx = CENTER_X + (Math.random() - 0.5) * 60;
          const ty = CENTER_Y + (Math.random() - 0.5) * 60;
          const targetAngle = Math.atan2(ty - sy, tx - sx);
          const speed = 60 + Math.random() * 40;

          s.meteors.push({
            x: sx,
            y: sy,
            vx: Math.cos(targetAngle) * speed,
            vy: Math.sin(targetAngle) * speed,
            r: 28,
            tier: 3, // Tier 3: large, Tier 2: medium, Tier 1: small
          });
        }

        // Update Shots
        for (let i = s.shots.length - 1; i >= 0; i--) {
          const shot = s.shots[i];
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;

          // Hit test against meteors
          let hit = false;
          for (let m = s.meteors.length - 1; m >= 0; m--) {
            const met = s.meteors[m];
            if (Math.hypot(shot.x - met.x, shot.y - met.y) < met.r + 4) {
              hit = true;
              soundManager.explosion();
              s.score += (4 - met.tier) * 50;
              onScoreUpdate(s.score);

              // Particle debris
              for (let p = 0; p < 10; p++) {
                s.particles.push({
                  x: met.x,
                  y: met.y,
                  vx: (Math.random() - 0.5) * 200,
                  vy: (Math.random() - 0.5) * 200,
                  color: '#a78bfa',
                  life: 0.35,
                });
              }

              // Split meteor if tier > 1
              if (met.tier > 1) {
                const newTier = met.tier - 1;
                const newR = met.r * 0.65;
                const splitAngle = Math.atan2(met.vy, met.vx);
                const sp1 = 90 + Math.random() * 40;
                const sp2 = 90 + Math.random() * 40;

                s.meteors.push({
                  x: met.x,
                  y: met.y,
                  vx: Math.cos(splitAngle + 0.6) * sp1,
                  vy: Math.sin(splitAngle + 0.6) * sp1,
                  r: newR,
                  tier: newTier,
                });
                s.meteors.push({
                  x: met.x,
                  y: met.y,
                  vx: Math.cos(splitAngle - 0.6) * sp2,
                  vy: Math.sin(splitAngle - 0.6) * sp2,
                  r: newR,
                  tier: newTier,
                });
              }

              s.meteors.splice(m, 1);
              break;
            }
          }

          if (hit || shot.x < 0 || shot.x > 800 || shot.y < 0 || shot.y > 500) {
            s.shots.splice(i, 1);
          }
        }

        // Update Meteors & Core collision
        for (let i = s.meteors.length - 1; i >= 0; i--) {
          const met = s.meteors[i];
          met.x += met.vx * dt;
          met.y += met.vy * dt;

          // Hit center reactor core (radius 26)
          if (Math.hypot(met.x - CENTER_X, met.y - CENTER_Y) < met.r + 22) {
            soundManager.hit();
            s.shields -= 1;
            setShields(s.shields);
            s.meteors.splice(i, 1);

            if (s.shields <= 0) {
              soundManager.gameover();
              const res = saveGameScore('meteor-breaker', s.score);
              reportGameActivity('meteor-breaker', s.score);
              setFinalScore(s.score);
              setIsHighScore(res.isNewHighScore);
              setGameState('gameover');
              return;
            }
          }
        }

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0a0614';
      ctx.fillRect(0, 0, 800, 500);

      // Starfield dots
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 97) % 800;
        const y = (i * 73) % 500;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Radar rings
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.lineWidth = 1;
      [80, 160, 240, 320].forEach((r) => {
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Render Shots
      s.shots.forEach((sh) => {
        ctx.save();
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Meteors
      s.meteors.forEach((met) => {
        ctx.save();
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(met.x, met.y, met.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Render Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Center Core & Turret
      ctx.save();
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 20;

      // Base reactor dome
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rotating cannon barrel
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(
        CENTER_X + Math.cos(s.turretAngle) * 32,
        CENTER_Y + Math.sin(s.turretAngle) * 32
      );
      ctx.stroke();

      // Core light
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [gameState, isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0614] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain cursor-crosshair"
      />

      {/* Shields HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-purple-500/40 text-xs font-mono-code font-bold text-purple-300 pointer-events-none">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span>BOUCLIERS DU RÉACTEUR :</span>
          <div className="flex gap-1 ml-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3 rounded-sm ${
                  i < shields ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            METEOR BREAKER
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Pivotez à 360° pour pulvériser les astéroïdes géants avant qu'ils n'impactent le réacteur central. Visez à la souris ou aux touches et tirez !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(139,92,246,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>ACTIVATION DU CANON</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">IMPACT MAJEUR</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">RÉACTEUR DÉTRUIT</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-purple-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RÉARMER LE CANON</span>
          </button>
        </div>
      )}

      {/* Touch shoot button for mobile */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 right-4 md:hidden pointer-events-auto">
          <button
            onClick={shoot}
            className="w-16 h-16 rounded-full bg-purple-600/90 border-2 border-purple-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            FEU
          </button>
        </div>
      )}
    </div>
  );
};
