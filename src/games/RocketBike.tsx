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

export const RocketBikeGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [nitro, setNitro] = useState<number>(100);

  const stateRef = useRef({
    bike: { x: 400, y: 400, vx: 0, w: 20, h: 42, speed: 6 },
    keys: { left: false, right: false, boost: false },
    traffic: [] as Array<{ x: number; y: number; w: number; h: number; vy: number; color: string }>,
    boostPads: [] as Array<{ x: number; y: number; w: number; h: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    nitroEnergy: 100,
    highwayOffset: 0,
    speedMultiplier: 1.0,
    score: 0,
    lastTrafficSpawn: 0,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.bike = { x: 400, y: 400, vx: 0, w: 20, h: 42, speed: 6 };
    s.traffic = [];
    s.boostPads = [];
    s.particles = [];
    s.nitroEnergy = 100;
    s.speedMultiplier = 1.0;
    s.score = 0;
    s.lastTrafficSpawn = Date.now();
    setNitro(100);
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
        k.boost = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW', 'KeyZ', 'Space'].includes(e.code)) k.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Nitro boost
        const isBoosting = s.keys.boost && s.nitroEnergy > 5;
        if (isBoosting) {
          s.nitroEnergy = Math.max(0, s.nitroEnergy - dt * 35);
        } else {
          s.nitroEnergy = Math.min(100, s.nitroEnergy + dt * 10);
        }
        setNitro(Math.round(s.nitroEnergy));

        const effectiveSpeed = (isBoosting ? 1.8 : 1.0) * s.speedMultiplier;

        // Steer bike
        if (s.keys.left) s.bike.vx = -s.bike.speed;
        else if (s.keys.right) s.bike.vx = s.bike.speed;
        else s.bike.vx *= 0.8;

        s.bike.x += s.bike.vx;
        s.bike.x = Math.max(200, Math.min(600 - s.bike.w, s.bike.x));

        // Highway scroll
        s.highwayOffset = (s.highwayOffset + 400 * effectiveSpeed * dt) % 80;

        // Score update
        s.score += Math.round(dt * 30 * effectiveSpeed);
        s.speedMultiplier = Math.min(2.2, 1.0 + s.score * 0.0004);
        onScoreUpdate(s.score);

        // Spawn traffic
        if (Date.now() - s.lastTrafficSpawn > Math.max(400, 1000 - s.score * 0.4)) {
          s.lastTrafficSpawn = Date.now();
          const laneX = 220 + Math.floor(Math.random() * 4) * 95;
          const isTruck = Math.random() > 0.7;

          s.traffic.push({
            x: laneX,
            y: -100,
            w: isTruck ? 36 : 28,
            h: isTruck ? 70 : 44,
            vy: (120 + Math.random() * 80),
            color: isTruck ? '#e11d48' : '#38bdf8',
          });

          // Boost pad spawn
          if (Math.random() < 0.25) {
            const padLane = 220 + Math.floor(Math.random() * 4) * 95;
            s.boostPads.push({ x: padLane + 4, y: -60, w: 24, h: 36 });
          }
        }

        // Update traffic
        for (let i = s.traffic.length - 1; i >= 0; i--) {
          const tf = s.traffic[i];
          // Moves relative to player's highway speed
          tf.y += (320 * effectiveSpeed - tf.vy) * dt;

          // AABB collision with bike
          if (
            s.bike.x + s.bike.w > tf.x &&
            s.bike.x < tf.x + tf.w &&
            s.bike.y + s.bike.h > tf.y &&
            s.bike.y < tf.y + tf.h
          ) {
            handleGameOver();
            return;
          }

          if (tf.y > 550) s.traffic.splice(i, 1);
        }

        // Update boost pads
        for (let i = s.boostPads.length - 1; i >= 0; i--) {
          const bp = s.boostPads[i];
          bp.y += 320 * effectiveSpeed * dt;

          if (
            s.bike.x + s.bike.w > bp.x &&
            s.bike.x < bp.x + bp.w &&
            s.bike.y + s.bike.h > bp.y &&
            s.bike.y < bp.y + bp.h
          ) {
            soundManager.powerup();
            s.nitroEnergy = Math.min(100, s.nitroEnergy + 30);
            s.score += 200;
            onScoreUpdate(s.score);
            s.boostPads.splice(i, 1);
            continue;
          }

          if (bp.y > 550) s.boostPads.splice(i, 1);
        }

        // Thruster flame particles
        if (Math.random() < 0.6) {
          s.particles.push({
            x: s.bike.x + s.bike.w / 2,
            y: s.bike.y + s.bike.h,
            vx: (Math.random() - 0.5) * 20,
            vy: 120 + Math.random() * 80,
            color: isBoosting ? '#ec4899' : '#06b6d4',
            life: 0.25,
          });
        }

        for (let i = s.particles.length - 1; i >= 0; i--) {
          s.particles[i].y += s.particles[i].vy * dt;
          s.particles[i].life -= dt;
          if (s.particles[i].life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDER HIGHWAY ---
      ctx.fillStyle = '#060d16';
      ctx.fillRect(0, 0, 800, 500);

      // Highway lanes
      ctx.fillStyle = '#111a28';
      ctx.fillRect(190, 0, 420, 500);

      // Highway neon guardrails
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(190, -10, 420, 520);

      // Lane dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([25, 25]);
      ctx.lineDashOffset = -s.highwayOffset;
      [295, 400, 505].forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, 500);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Boost pads
      s.boostPads.forEach((bp) => {
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(bp.x + bp.w / 2, bp.y);
        ctx.lineTo(bp.x + bp.w, bp.y + bp.h);
        ctx.lineTo(bp.x, bp.y + bp.h);
        ctx.fill();
        ctx.restore();
      });

      // Traffic Vehicles
      s.traffic.forEach((tf) => {
        ctx.save();
        ctx.shadowColor = tf.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = tf.color;
        ctx.beginPath();
        ctx.roundRect(tf.x, tf.y, tf.w, tf.h, 6);
        ctx.fill();
        // Red taillights
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(tf.x + 4, tf.y + tf.h - 4, 6, 3);
        ctx.fillRect(tf.x + tf.w - 10, tf.y + tf.h - 4, 6, 3);
        ctx.restore();
      });

      // Exhaust Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player Rocket Bike
      if (gameState === 'playing' || gameState === 'start') {
        const bk = s.bike;
        ctx.save();
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 14;

        // Bike fuselage
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(bk.x, bk.y, bk.w, bk.h, 5);
        ctx.fill();

        // Neon windshield
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bk.x + 4, bk.y + 6, bk.w - 8, 12);

        // Pilot helmet
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(bk.x + bk.w / 2, bk.y + 24, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('rocket-bike', s.score);
      reportGameActivity('rocket-bike', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#060d16] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Nitro gauge HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 text-xs font-mono-code font-bold text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>NITRO : {nitro}%</span>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(14,165,233,0.4)]">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            ROCKET BIKE
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Foncez à moto-fusée sur la mégapole suspended ! Slalomez entre les drones de transport, activez le nitro avec Flèche Haut et roulez sur les pastilles bleues.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(14,165,233,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>METTRE LE CONTACT</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">ACCIDENT DE TRAFIC</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">MOTO PULVÉRISÉE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE DISTANCE</span>
            <span className="font-mono-code text-3xl font-extrabold text-cyan-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(14,165,233,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REDÉMARRER LA MOTO</span>
          </button>
        </div>
      )}

      {/* Mobile Touch controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onTouchStart={() => { stateRef.current.keys.left = true; }}
              onTouchEnd={() => { stateRef.current.keys.left = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-cyan-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-cyan-600"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={() => { stateRef.current.keys.boost = true; }}
            onTouchEnd={() => { stateRef.current.keys.boost = false; }}
            className="pointer-events-auto w-14 h-14 rounded-full bg-cyan-600/90 border-2 border-cyan-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            NITRO
          </button>
        </div>
      )}
    </div>
  );
};
