import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Compass } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const EndlessTunnelGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const CENTER_X = 400;
  const CENTER_Y = 250;
  const TUNNEL_RADIUS = 190;

  const stateRef = useRef({
    playerAngle: 0, // Radians around tunnel circumference
    keys: { left: false, right: false },
    rings: [] as Array<{
      z: number; // 0 (horizon) to 1 (passed)
      gapAngle: number; // Center of the safe opening in radians
      gapWidth: number; // Angle breadth of safe opening
      color: string;
      passed: boolean;
    }>,
    speed: 0.55,
    score: 0,
    lastSpawn: 0,
    hue: 180,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.playerAngle = 0;
    s.rings = [];
    s.speed = 0.55;
    s.score = 0;
    s.hue = 180;
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
        // Rotate player around circumference
        const rotSpeed = 3.6;
        if (s.keys.left) s.playerAngle -= rotSpeed * dt;
        if (s.keys.right) s.playerAngle += rotSpeed * dt;

        // Normalize player angle to [0, 2*PI)
        s.playerAngle = (s.playerAngle + Math.PI * 2) % (Math.PI * 2);

        // Speed ramp
        s.speed = Math.min(1.2, 0.55 + s.score * 0.0008);
        s.score += Math.round(dt * 20);
        onScoreUpdate(s.score);

        // Spawn incoming ring obstacles
        if (Date.now() - s.lastSpawn > Math.max(500, 1200 - s.score * 0.6)) {
          s.lastSpawn = Date.now();
          s.hue = (s.hue + 25) % 360;
          s.rings.push({
            z: 0.05,
            gapAngle: Math.random() * Math.PI * 2,
            gapWidth: 1.15, // Approx 66 degrees opening
            color: `hsl(${s.hue}, 90%, 60%)`,
            passed: false,
          });
        }

        // Update rings
        for (let i = s.rings.length - 1; i >= 0; i--) {
          const ring = s.rings[i];
          ring.z += s.speed * dt;

          // Collision test at player depth (z approx 0.88 - 0.98)
          if (ring.z >= 0.88 && ring.z <= 0.98 && !ring.passed) {
            // Check angular distance from player angle to gap angle
            let diff = Math.abs(s.playerAngle - ring.gapAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff > ring.gapWidth / 2) {
              // Hit the wall!
              handleGameOver();
              return;
            } else {
              // Passed cleanly!
              ring.passed = true;
              soundManager.coin();
              s.score += 100;
              onScoreUpdate(s.score);
            }
          }

          if (ring.z > 1.15) s.rings.splice(i, 1);
        }
      }

      // --- RENDER 3D WIREFRAME TUNNEL ---
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, 800, 500);

      // Tunnel grid perspective rays
      const numRays = 12;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < numRays; i++) {
        const theta = (i / numRays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(
          CENTER_X + Math.cos(theta) * (TUNNEL_RADIUS + 40),
          CENTER_Y + Math.sin(theta) * (TUNNEL_RADIUS + 40)
        );
        ctx.stroke();
      }

      // Render concentric background depth rings
      for (let z = 0.2; z <= 1.0; z += 0.2) {
        const r = Math.pow(z, 2.0) * TUNNEL_RADIUS;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render Obstacle Rings (sorted by depth)
      s.rings.forEach((ring) => {
        const radius = Math.pow(ring.z, 2.0) * TUNNEL_RADIUS;
        if (radius < 4) return;

        ctx.save();
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 8 * Math.pow(ring.z, 1.8);
        ctx.lineCap = 'round';

        // Draw the ring leaving the gap open
        const start = ring.gapAngle + ring.gapWidth / 2;
        const end = ring.gapAngle + Math.PI * 2 - ring.gapWidth / 2;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, radius, start, end);
        ctx.stroke();
        ctx.restore();
      });

      // Render Player Craft at TUNNEL_RADIUS
      if (gameState === 'playing' || gameState === 'start') {
        const px = CENTER_X + Math.cos(s.playerAngle) * TUNNEL_RADIUS;
        const py = CENTER_Y + Math.sin(s.playerAngle) * TUNNEL_RADIUS;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(s.playerAngle + Math.PI / 2);

        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;

        // Craft body
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(12, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();

        // White cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('endless-tunnel', s.score);
      reportGameActivity('endless-tunnel', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#060a12] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            ENDLESS TUNNEL
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Plongez dans le tunnel filaire infini ! Pivotez autour de l'axe pour faire passer votre vaisseau à travers l'ouverture de chaque anneau qui fonce vers vous.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>PLONGER DANS LE TUNNEL</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">COLLISION D'ANNEAU</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">TUNNEL CRASH</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE PROFONDEUR</span>
            <span className="font-mono-code text-3xl font-extrabold text-cyan-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVEAU PLONGEON</span>
          </button>
        </div>
      )}

      {/* Mobile touch controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none md:hidden">
          <button
            onTouchStart={() => { stateRef.current.keys.left = true; }}
            onTouchEnd={() => { stateRef.current.keys.left = false; }}
            className="pointer-events-auto w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-600 text-white font-bold text-xl flex items-center justify-center active:bg-cyan-600"
          >
            ◀
          </button>
          <button
            onTouchStart={() => { stateRef.current.keys.right = true; }}
            onTouchEnd={() => { stateRef.current.keys.right = false; }}
            className="pointer-events-auto w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-600 text-white font-bold text-xl flex items-center justify-center active:bg-cyan-600"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
};
