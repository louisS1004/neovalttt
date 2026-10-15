import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, ShieldAlert, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const OrbitSurvivorGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [empCharge, setEmpCharge] = useState<number>(0);

  const ARENA_RADIUS = 210;
  const CENTER_X = 400;
  const CENTER_Y = 250;

  const stateRef = useRef({
    player: { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0, r: 10, speed: 5.5 },
    keys: { left: false, right: false, up: false, down: false, emp: false },
    enemies: [] as Array<{ x: number; y: number; r: number; speed: number; angle: number }>,
    orbs: [] as Array<{ x: number; y: number; r: number; val: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    empRings: [] as Array<{ x: number; y: number; r: number; maxR: number; life: number }>,
    empCharged: 0, // 0 to 100
    score: 0,
    startTime: 0,
    lastEnemySpawn: 0,
    lastOrbSpawn: 0,
    animId: 0,
  });

  const triggerEMP = () => {
    const s = stateRef.current;
    if (s.empCharged >= 100) {
      soundManager.explosion();
      s.empCharged = 0;
      setEmpCharge(0);

      s.empRings.push({
        x: s.player.x,
        y: s.player.y,
        r: 10,
        maxR: 260,
        life: 1.0,
      });

      // Destroy all enemies within EMP radius
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const en = s.enemies[i];
        if (Math.hypot(s.player.x - en.x, s.player.y - en.y) < 260) {
          s.score += 75;
          for (let p = 0; p < 8; p++) {
            s.particles.push({
              x: en.x,
              y: en.y,
              vx: (Math.random() - 0.5) * 200,
              vy: (Math.random() - 0.5) * 200,
              color: '#ef4444',
              life: 0.4,
            });
          }
          s.enemies.splice(i, 1);
        }
      }
      onScoreUpdate(s.score);
    }
  };

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.player = { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0, r: 10, speed: 5.5 };
    s.enemies = [];
    s.orbs = [];
    s.particles = [];
    s.empRings = [];
    s.empCharged = 0;
    s.score = 0;
    s.startTime = Date.now();
    s.lastEnemySpawn = Date.now();
    s.lastOrbSpawn = Date.now();
    setEmpCharge(0);
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
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerEMP();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Player movement
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

        // Circular boundary clamp
        const distFromCenter = Math.hypot(s.player.x - CENTER_X, s.player.y - CENTER_Y);
        if (distFromCenter > ARENA_RADIUS - s.player.r) {
          const angle = Math.atan2(s.player.y - CENTER_Y, s.player.x - CENTER_X);
          s.player.x = CENTER_X + Math.cos(angle) * (ARENA_RADIUS - s.player.r);
          s.player.y = CENTER_Y + Math.sin(angle) * (ARENA_RADIUS - s.player.r);
        }

        // Score based on survival time
        s.score += Math.round(dt * 25);
        onScoreUpdate(s.score);

        // Spawn Enemies around perimeter
        const spawnDelay = Math.max(350, 1100 - (Date.now() - s.startTime) / 80);
        if (Date.now() - s.lastEnemySpawn > spawnDelay) {
          s.lastEnemySpawn = Date.now();
          const angle = Math.random() * Math.PI * 2;
          s.enemies.push({
            x: CENTER_X + Math.cos(angle) * (ARENA_RADIUS - 10),
            y: CENTER_Y + Math.sin(angle) * (ARENA_RADIUS - 10),
            r: 7,
            speed: 1.8 + Math.random() * 1.5,
            angle: 0,
          });
        }

        // Spawn Orbs inside arena
        if (Date.now() - s.lastOrbSpawn > 1800 && s.orbs.length < 5) {
          s.lastOrbSpawn = Date.now();
          const r = Math.random() * (ARENA_RADIUS - 40);
          const theta = Math.random() * Math.PI * 2;
          s.orbs.push({
            x: CENTER_X + Math.cos(theta) * r,
            y: CENTER_Y + Math.sin(theta) * r,
            r: 6,
            val: 50,
          });
        }

        // Update Enemies (Home in on player)
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const en = s.enemies[i];
          const angleToPlayer = Math.atan2(s.player.y - en.y, s.player.x - en.x);
          en.x += Math.cos(angleToPlayer) * en.speed;
          en.y += Math.sin(angleToPlayer) * en.speed;

          // Check hit with player
          if (Math.hypot(s.player.x - en.x, s.player.y - en.y) < s.player.r + en.r) {
            handleGameOver();
            return;
          }
        }

        // Update Orbs pickup
        for (let i = s.orbs.length - 1; i >= 0; i--) {
          const orb = s.orbs[i];
          if (Math.hypot(s.player.x - orb.x, s.player.y - orb.y) < s.player.r + orb.r + 6) {
            soundManager.coin();
            s.score += orb.val;
            s.empCharged = Math.min(100, s.empCharged + 25);
            setEmpCharge(s.empCharged);
            onScoreUpdate(s.score);
            s.orbs.splice(i, 1);
          }
        }

        // Update EMP rings
        for (let i = s.empRings.length - 1; i >= 0; i--) {
          const ring = s.empRings[i];
          ring.r += 320 * dt;
          ring.life -= dt * 1.5;
          if (ring.life <= 0) s.empRings.splice(i, 1);
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
      ctx.fillStyle = '#0f0810';
      ctx.fillRect(0, 0, 800, 500);

      // Arena boundary ring
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, ARENA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Floor grid within arena
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.lineWidth = 1;
      for (let r = 50; r < ARENA_RADIUS; r += 50) {
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Render Orbs
      s.orbs.forEach((orb) => {
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(orb.x - 2, orb.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Enemies
      s.enemies.forEach((en) => {
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render EMP shockwaves
      s.empRings.forEach((ring) => {
        ctx.save();
        ctx.strokeStyle = `rgba(6, 182, 212, ${ring.life})`;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Render Player
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('orbit-survivor', s.score);
      reportGameActivity('orbit-survivor', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f0810] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* EMP Status HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 text-xs font-mono-code font-bold text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>IEM : {empCharge}%</span>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            ORBIT SURVIVOR
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Arène circulaire sous haute tension ! Esquivez les essaims de drones qui convergent vers vous, ramassez les orbes et déclenchez l'impulsion IEM avec Espace à 100%.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(239,68,68,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>ENTRER DANS L’ARÈNE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">ARÈNE COMPROMISE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">PROBE ANÉANTIE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE SURVIE</span>
            <span className="font-mono-code text-3xl font-extrabold text-red-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVELLE SURVIE</span>
          </button>
        </div>
      )}

      {/* Mobile controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          <div className="grid grid-cols-3 gap-1 pointer-events-auto">
            <div />
            <button
              onTouchStart={() => { stateRef.current.keys.up = true; }}
              onTouchEnd={() => { stateRef.current.keys.up = false; }}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={() => { stateRef.current.keys.left = true; }}
              onTouchEnd={() => { stateRef.current.keys.left = false; }}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.down = true; }}
              onTouchEnd={() => { stateRef.current.keys.down = false; }}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
            >
              ▼
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
            >
              ▶
            </button>
          </div>
          <button
            onClick={triggerEMP}
            disabled={empCharge < 100}
            className={`pointer-events-auto w-14 h-14 rounded-full border-2 font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95 ${
              empCharge >= 100
                ? 'bg-cyan-500 border-white text-white animate-pulse'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
          >
            IEM
          </button>
        </div>
      )}
    </div>
  );
};
