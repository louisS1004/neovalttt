import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Car, Trophy, Clock } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const MicroRacersGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [lap, setLap] = useState<number>(1);
  const [lapTime, setLapTime] = useState<string>('0.00s');

  const stateRef = useRef({
    car: {
      x: 400,
      y: 430,
      angle: 0, // In radians (0 facing right)
      speed: 0,
      maxSpeed: 7.5,
      accel: 0.18,
      friction: 0.97,
      steer: 0.055,
      w: 24,
      h: 14,
    },
    keys: { up: false, down: false, left: false, right: false },
    checkpoints: [
      { x: 400, y: 430, w: 20, h: 80, passed: false }, // Finish line
      { x: 670, y: 250, w: 80, h: 20, passed: false },
      { x: 400, y: 70, w: 20, h: 80, passed: false },
      { x: 130, y: 250, w: 80, h: 20, passed: false },
    ],
    currentLap: 1,
    maxLaps: 3,
    lapStartTime: 0,
    raceStartTime: 0,
    skidMarks: [] as Array<{ x: number; y: number; life: number }>,
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
      y: 430,
      angle: 0,
      speed: 0,
      maxSpeed: 7.5,
      accel: 0.18,
      friction: 0.97,
      steer: 0.055,
      w: 24,
      h: 14,
    };
    s.currentLap = 1;
    s.raceStartTime = Date.now();
    s.lapStartTime = Date.now();
    s.skidMarks = [];
    s.score = 0;
    s.checkpoints.forEach((cp) => (cp.passed = false));
    setLap(1);
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
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
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
        // Accelerate & Brake
        if (s.keys.up) {
          s.car.speed = Math.min(s.car.maxSpeed, s.car.speed + s.car.accel);
        } else if (s.keys.down) {
          s.car.speed = Math.max(-s.car.maxSpeed * 0.4, s.car.speed - s.car.accel * 0.8);
        } else {
          s.car.speed *= s.car.friction;
        }

        // Steer (only when moving)
        if (Math.abs(s.car.speed) > 0.2) {
          const steerFactor = s.car.speed > 0 ? 1 : -1;
          if (s.keys.left) s.car.angle -= s.car.steer * steerFactor;
          if (s.keys.right) s.car.angle += s.car.steer * steerFactor;
        }

        // Move car
        s.car.x += Math.cos(s.car.angle) * s.car.speed;
        s.car.y += Math.sin(s.car.angle) * s.car.speed;

        // Skid marks when turning sharply at high speed
        if (Math.abs(s.car.speed) > 4.5 && (s.keys.left || s.keys.right)) {
          s.skidMarks.push({ x: s.car.x, y: s.car.y, life: 1.0 });
        }

        // Check track bounds (outer ellipse radius approx 340x190, inner 180x80)
        // Normalized distance from center (400, 250)
        const dx = (s.car.x - 400) / 330;
        const dy = (s.car.y - 250) / 190;
        const distOuter = dx * dx + dy * dy;

        const idx = (s.car.x - 400) / 180;
        const idy = (s.car.y - 250) / 80;
        const distInner = idx * idx + idy * idy;

        // Off-road grass penalty
        if (distOuter > 1.0 || distInner < 1.0) {
          s.car.speed *= 0.88; // Heavy slow-down on grass!
        }

        // Update timer
        const currentLapSec = ((Date.now() - s.lapStartTime) / 1000).toFixed(2);
        setLapTime(`${currentLapSec}s`);

        // Checkpoint checking
        const check0 = s.checkpoints[0];
        const check1 = s.checkpoints[1];
        const check2 = s.checkpoints[2];
        const check3 = s.checkpoints[3];

        if (Math.hypot(s.car.x - check1.x, s.car.y - check1.y) < 60) check1.passed = true;
        if (check1.passed && Math.hypot(s.car.x - check2.x, s.car.y - check2.y) < 60) check2.passed = true;
        if (check2.passed && Math.hypot(s.car.x - check3.x, s.car.y - check3.y) < 60) check3.passed = true;

        // Lap completed when crossing finish line after all checkpoints
        if (
          check1.passed &&
          check2.passed &&
          check3.passed &&
          Math.abs(s.car.x - check0.x) < 30 &&
          Math.abs(s.car.y - check0.y) < 50
        ) {
          soundManager.coin();
          s.score += 500;
          onScoreUpdate(s.score);

          if (s.currentLap < s.maxLaps) {
            s.currentLap += 1;
            setLap(s.currentLap);
            s.lapStartTime = Date.now();
            s.checkpoints.forEach((cp) => (cp.passed = false));
          } else {
            // Race won!
            soundManager.win();
            const totalSec = Math.round((Date.now() - s.raceStartTime) / 1000);
            const timeBonus = Math.max(0, 3000 - totalSec * 40);
            s.score += timeBonus;
            const res = saveGameScore('micro-racers', s.score);
            reportGameActivity('micro-racers', s.score);
            setFinalScore(s.score);
            setIsHighScore(res.isNewHighScore);
            setGameState('victory');
            return;
          }
        }

        // Skid marks fade
        for (let i = s.skidMarks.length - 1; i >= 0; i--) {
          s.skidMarks[i].life -= dt * 0.4;
          if (s.skidMarks[i].life <= 0) s.skidMarks.splice(i, 1);
        }
      }

      // --- RENDER CIRCUIT ---
      // Grass background
      ctx.fillStyle = '#0a120c';
      ctx.fillRect(0, 0, 800, 500);

      // Track Asphalt (Outer Ring)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(400, 250, 330, 190, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1e2420';
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#f97316'; // Neon curb
      ctx.stroke();

      // Inner Infield Island (Grass cutout)
      ctx.beginPath();
      ctx.ellipse(400, 250, 180, 80, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a120c';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center dash guideline
      ctx.beginPath();
      ctx.ellipse(400, 250, 255, 135, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 14]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Start / Finish Line
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(390, 390 + i * 8, 20, 8);
      }

      // Render skid marks
      s.skidMarks.forEach((sm) => {
        ctx.fillStyle = `rgba(0, 0, 0, ${sm.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Micro Car
      ctx.save();
      ctx.translate(s.car.x, s.car.y);
      ctx.rotate(s.car.angle);

      // Tires
      ctx.fillStyle = '#000000';
      ctx.fillRect(-10, -9, 6, 4);
      ctx.fillRect(6, -9, 6, 4);
      ctx.fillRect(-10, 5, 6, 4);
      ctx.fillRect(6, 5, 6, 4);

      // Car Body
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(-s.car.w / 2, -s.car.h / 2, s.car.w, s.car.h, 4);
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(-2, -s.car.h / 2 + 2, 7, s.car.h - 4);

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(s.car.w / 2 - 2, -5, 2, 3);
      ctx.fillRect(s.car.w / 2 - 2, 2, 2, 3);

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a120c] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* In-game HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-orange-950/80 border border-orange-500/40 text-xs font-arcade font-bold text-orange-300">
            TOUR {lap} / 3
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700 text-xs font-mono-code font-bold text-slate-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            {lapTime}
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/50 flex items-center justify-center text-orange-400 mb-3 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            MICRO RACERS
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Course arcade vue du dessus ! Flèche Haut pour accélérer, Gauche/Droite pour braquer et négociez 3 tours complets à vive allure.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(249,115,22,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>EN PISTE !</span>
          </button>
        </div>
      )}

      {/* Victory */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono-code uppercase tracking-widest text-orange-400 mb-1">DRAPEAU À DAMIER</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">COURSE REMPORTÉE !</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE COURSE</span>
            <span className="font-mono-code text-3xl font-extrabold text-orange-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(249,115,22,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVELLE COURSE</span>
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
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-orange-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-orange-600"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onTouchStart={() => { stateRef.current.keys.down = true; }}
              onTouchEnd={() => { stateRef.current.keys.down = false; }}
              className="w-12 h-12 rounded-xl bg-red-800/80 border border-red-500 text-white font-bold text-xs flex items-center justify-center active:scale-95"
            >
              FREIN
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.up = true; }}
              onTouchEnd={() => { stateRef.current.keys.up = false; }}
              className="w-13 h-12 rounded-xl bg-orange-600/90 border border-orange-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
            >
              GAZ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
