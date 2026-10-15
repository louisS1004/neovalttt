import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Flame } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const DriftCityMiniGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [driftMultiplier, setDriftMultiplier] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const stateRef = useRef({
    car: {
      x: 400,
      y: 250,
      angle: 0,
      speed: 4.8,
      steer: 0.05,
      isDrifting: false,
      driftAngle: 0,
    },
    keys: { left: false, right: false, drift: false },
    currentDriftPoints: 0,
    multiplier: 1,
    driftTimer: 0,
    timeRemaining: 60,
    skidTrails: [] as Array<{ x: number; y: number; life: number }>,
    score: 0,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.car = {
      x: 400,
      y: 250,
      angle: 0,
      speed: 4.8,
      steer: 0.05,
      isDrifting: false,
      driftAngle: 0,
    };
    s.currentDriftPoints = 0;
    s.multiplier = 1;
    s.driftTimer = 0;
    s.timeRemaining = 60;
    s.skidTrails = [];
    s.score = 0;
    setDriftMultiplier(1);
    setTimeLeft(60);
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
      if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
        k.drift = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) k.drift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Countdown timer
        s.timeRemaining -= dt;
        setTimeLeft(Math.max(0, Math.ceil(s.timeRemaining)));

        if (s.timeRemaining <= 0) {
          handleGameOver();
          return;
        }

        // Steer
        const isTurning = s.keys.left || s.keys.right;
        const driftActive = s.keys.drift || (isTurning && s.car.isDrifting);

        if (s.keys.left) s.car.angle -= s.car.steer * (driftActive ? 1.4 : 1.0);
        if (s.keys.right) s.car.angle += s.car.steer * (driftActive ? 1.4 : 1.0);

        s.car.isDrifting = driftActive;

        // Drift mechanics
        if (driftActive && isTurning) {
          s.driftTimer += dt;
          s.multiplier = Math.min(5, 1 + Math.floor(s.driftTimer * 1.5));
          setDriftMultiplier(s.multiplier);
          s.currentDriftPoints += Math.round(dt * 180 * s.multiplier);

          // Skid marks
          s.skidTrails.push({ x: s.car.x, y: s.car.y, life: 1.0 });
        } else {
          // Bank points cleanly
          if (s.currentDriftPoints > 0) {
            soundManager.coin();
            s.score += s.currentDriftPoints;
            s.currentDriftPoints = 0;
            s.multiplier = 1;
            s.driftTimer = 0;
            setDriftMultiplier(1);
            onScoreUpdate(s.score);
          }
        }

        // Car position update
        s.car.x += Math.cos(s.car.angle) * s.car.speed;
        s.car.y += Math.sin(s.car.angle) * s.car.speed;

        // Bounds bounce & penalty
        if (s.car.x < 50 || s.car.x > 750) {
          s.car.angle = Math.PI - s.car.angle;
          s.car.x = Math.max(50, Math.min(750, s.car.x));
          s.currentDriftPoints = 0; // Lost banked points on crash!
          soundManager.hit();
        }
        if (s.car.y < 50 || s.car.y > 450) {
          s.car.angle = -s.car.angle;
          s.car.y = Math.max(50, Math.min(450, s.car.y));
          s.currentDriftPoints = 0;
          soundManager.hit();
        }

        // Fade skid trails
        for (let i = s.skidTrails.length - 1; i >= 0; i--) {
          s.skidTrails[i].life -= dt * 0.5;
          if (s.skidTrails[i].life <= 0) s.skidTrails.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0f0a14';
      ctx.fillRect(0, 0, 800, 500);

      // City Arena Asphalt
      ctx.fillStyle = '#181220';
      ctx.fillRect(40, 40, 720, 420);

      // Neon City Curbs
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 720, 420);

      // Corner cones / markers
      ctx.fillStyle = '#fbbf24';
      [
        { x: 140, y: 140 },
        { x: 660, y: 140 },
        { x: 140, y: 360 },
        { x: 660, y: 360 },
      ].forEach((cn) => {
        ctx.beginPath();
        ctx.arc(cn.x, cn.y, 16, 0, Math.PI * 2);
        ctx.fill();
      });

      // Skid trails
      s.skidTrails.forEach((sm) => {
        ctx.fillStyle = `rgba(225, 29, 72, ${sm.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Car
      ctx.save();
      ctx.translate(s.car.x, s.car.y);
      ctx.rotate(s.car.angle);

      // Body
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = s.car.isDrifting ? 18 : 8;
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.roundRect(-14, -8, 28, 16, 4);
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(-2, -6, 8, 12);

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(12, -6, 3, 3);
      ctx.fillRect(12, 3, 3, 3);

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.win();
      const s = stateRef.current;
      const res = saveGameScore('drift-city-mini', s.score);
      reportGameActivity('drift-city-mini', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f0a14] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Live Drift HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs font-arcade font-bold text-rose-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            DRIFT x{driftMultiplier}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700 text-xs font-mono-code font-bold text-slate-200">
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            DRIFT CITY MINI
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Glissez dans les virages pour faire grimper le multiplicateur de drift jusqu'à x5 ! Redressez sans heurter les murets pour empocher vos points.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(225,29,72,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>BRÛLER LA GOMME</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">CHRONO ÉCOULÉ</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">SESSION DRIFT FINIE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE DÉRAPAGE</span>
            <span className="font-mono-code text-3xl font-extrabold text-rose-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(225,29,72,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVELLE SESSION</span>
          </button>
        </div>
      )}

      {/* Mobile Touch buttons */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onTouchStart={() => { stateRef.current.keys.left = true; }}
              onTouchEnd={() => { stateRef.current.keys.left = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-rose-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-rose-600"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={() => { stateRef.current.keys.drift = true; }}
            onTouchEnd={() => { stateRef.current.keys.drift = false; }}
            className="pointer-events-auto w-14 h-14 rounded-full bg-rose-600/90 border-2 border-rose-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            DRIFT
          </button>
        </div>
      )}
    </div>
  );
};
