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

export const PulseRunnerGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const stateRef = useRef({
    lane: 1, // 0: left, 1: center, 2: right
    targetX: 400,
    currentX: 400,
    isJumping: false,
    jumpY: 0,
    jumpVy: 0,
    isSliding: false,
    slideTimer: 0,
    obstacles: [] as Array<{
      lane: number;
      z: number; // 0 to 1 (0 = distant horizon, 1 = player depth)
      type: 'low' | 'high' | 'block';
      passed: boolean;
    }>,
    coins: [] as Array<{
      lane: number;
      z: number;
      collected: boolean;
    }>,
    speed: 0.6,
    score: 0,
    lastSpawn: 0,
    gridOffset: 0,
    animId: 0,
  });

  const LANE_X_PLAYER = [220, 400, 580]; // Screen X for lanes at player depth
  const LANE_X_HORIZON = [360, 400, 440]; // Screen X for lanes at horizon

  const moveLeft = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    if (s.lane > 0) {
      s.lane -= 1;
      s.targetX = LANE_X_PLAYER[s.lane];
      soundManager.jump();
    }
  };

  const moveRight = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    if (s.lane < 2) {
      s.lane += 1;
      s.targetX = LANE_X_PLAYER[s.lane];
      soundManager.jump();
    }
  };

  const doJump = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    if (!s.isJumping && !s.isSliding) {
      s.isJumping = true;
      s.jumpVy = -11;
      soundManager.jump();
    }
  };

  const doSlide = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    if (!s.isJumping) {
      s.isSliding = true;
      s.slideTimer = 0.55;
      soundManager.hit();
    }
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.lane = 1;
    s.targetX = 400;
    s.currentX = 400;
    s.isJumping = false;
    s.jumpY = 0;
    s.isSliding = false;
    s.slideTimer = 0;
    s.speed = 0.55;
    s.score = 0;
    s.obstacles = [];
    s.coins = [];
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
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) moveLeft();
      if (['ArrowRight', 'KeyD'].includes(e.code)) moveRight();
      if (['ArrowUp', 'KeyW', 'KeyZ', 'Space'].includes(e.code)) {
        e.preventDefault();
        doJump();
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        doSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Lane lerp
        s.currentX += (s.targetX - s.currentX) * 0.25;

        // Jump physics
        if (s.isJumping) {
          s.jumpVy += 28 * dt;
          s.jumpY += s.jumpVy;
          if (s.jumpY >= 0) {
            s.jumpY = 0;
            s.isJumping = false;
          }
        }

        // Slide timer
        if (s.isSliding) {
          s.slideTimer -= dt;
          if (s.slideTimer <= 0) s.isSliding = false;
        }

        // Speed ramp
        s.speed = Math.min(1.2, 0.55 + s.score * 0.001);
        s.score += Math.round(dt * 20);
        onScoreUpdate(s.score);

        s.gridOffset = (s.gridOffset + s.speed * dt * 4) % 1;

        // Spawn obstacles & coins
        if (Date.now() - s.lastSpawn > Math.max(650, 1400 - s.score * 1.5)) {
          s.lastSpawn = Date.now();
          const chosenLane = Math.floor(Math.random() * 3);
          const types: Array<'low' | 'high' | 'block'> = ['low', 'high', 'block'];
          const type = types[Math.floor(Math.random() * types.length)];
          s.obstacles.push({
            lane: chosenLane,
            z: 0.05,
            type,
            passed: false,
          });

          // Spawn coin in another lane
          const coinLane = (chosenLane + 1 + Math.floor(Math.random() * 2)) % 3;
          s.coins.push({
            lane: coinLane,
            z: 0.05,
            collected: false,
          });
        }

        // Update obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const ob = s.obstacles[i];
          ob.z += s.speed * dt;

          // Collision test when z reaches player depth (around 0.88 - 0.98)
          if (ob.z >= 0.88 && ob.z <= 0.98 && !ob.passed) {
            if (ob.lane === s.lane) {
              let collided = false;
              if (ob.type === 'block') {
                collided = true; // Can never jump or slide through a full block!
              } else if (ob.type === 'low') {
                // Low barrier: safe if jumping high enough
                if (!s.isJumping || s.jumpY > -25) collided = true;
              } else if (ob.type === 'high') {
                // High laser bar: safe only if sliding
                if (!s.isSliding) collided = true;
              }

              if (collided) {
                soundManager.explosion();
                soundManager.gameover();
                const res = saveGameScore('pulse-runner', s.score);
                reportGameActivity('pulse-runner', s.score);
                setFinalScore(s.score);
                setIsHighScore(res.isNewHighScore);
                setGameState('gameover');
                break;
              }
            }
          }

          if (ob.z > 1.1) {
            s.obstacles.splice(i, 1);
          }
        }

        // Update coins
        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          c.z += s.speed * dt;

          if (c.z >= 0.85 && c.z <= 0.98 && !c.collected) {
            if (c.lane === s.lane && !s.isSliding) {
              c.collected = true;
              soundManager.coin();
              s.score += 50;
              onScoreUpdate(s.score);
            }
          }

          if (c.z > 1.1 || c.collected) s.coins.splice(i, 1);
        }
      }

      // --- 3D PERSPECTIVE RENDER ---
      ctx.fillStyle = '#0a0815';
      ctx.fillRect(0, 0, 800, 500);

      // Horizon line at Y = 140
      const horizonY = 140;
      const groundBottomY = 480;

      // Draw Retro Horizon Glow
      const horizGrad = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY);
      horizGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
      horizGrad.addColorStop(1, 'rgba(168, 85, 247, 0.35)');
      ctx.fillStyle = horizGrad;
      ctx.fillRect(0, horizonY - 40, 800, 40);

      // Horizon Sun
      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(400, horizonY, 35, Math.PI, 0);
      ctx.fill();
      ctx.restore();

      // Perspective 3 lanes lines
      const laneBoundariesHorizon = [320, 373, 427, 480];
      const laneBoundariesBottom = [130, 310, 490, 670];

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(laneBoundariesHorizon[i], horizonY);
        ctx.lineTo(laneBoundariesBottom[i], groundBottomY);
        ctx.stroke();
      }

      // Horizontal moving grid lines
      for (let i = 0; i < 10; i++) {
        const p = ((i / 10) + s.gridOffset) % 1;
        // Non-linear perspective spacing
        const y = horizonY + Math.pow(p, 2.2) * (groundBottomY - horizonY);
        const x1 = 320 - (320 - 130) * Math.pow(p, 2.2);
        const x2 = 480 + (670 - 480) * Math.pow(p, 2.2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.1 + p * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }

      // Helper to compute (x, y, scale) for a given lane & z
      const getPos = (lane: number, z: number) => {
        const p = Math.pow(z, 2.0); // perspective curve
        const y = horizonY + p * (groundBottomY - horizonY);
        const hx = LANE_X_HORIZON[lane];
        const bx = LANE_X_PLAYER[lane];
        const x = hx + (bx - hx) * p;
        const scale = 0.2 + p * 0.9;
        return { x, y, scale };
      };

      // Render Coins
      s.coins.forEach((c) => {
        const { x, y, scale } = getPos(c.lane, c.z);
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y - 18 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 18 * scale, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Obstacles sorted by z
      s.obstacles.forEach((ob) => {
        const { x, y, scale } = getPos(ob.lane, ob.z);
        ctx.save();

        if (ob.type === 'block') {
          // Solid Neon Cube
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          const w = 70 * scale;
          const h = 60 * scale;
          ctx.fillRect(x - w / 2, y - h, w, h);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - w / 2 + 2, y - h + 2, w - 4, 3);
        } else if (ob.type === 'low') {
          // Low jump barricade
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          const w = 74 * scale;
          const h = 22 * scale;
          ctx.fillRect(x - w / 2, y - h, w, h);
          // Hazard stripes
          ctx.fillStyle = '#000000';
          ctx.fillRect(x - w / 4, y - h, 8 * scale, h);
          ctx.fillRect(x + w / 4, y - h, 8 * scale, h);
        } else if (ob.type === 'high') {
          // Elevated Laser Bar to slide under
          ctx.strokeStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 4 * scale;
          const w = 80 * scale;
          const h = 65 * scale;
          // Side posts
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y);
          ctx.lineTo(x - w / 2, y - h);
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w / 2, y - h);
          ctx.stroke();
          // High beam
          ctx.lineWidth = 6 * scale;
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y - h);
          ctx.lineTo(x + w / 2, y - h);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Render Player
      if (gameState === 'playing' || gameState === 'start') {
        const px = s.currentX;
        const py = groundBottomY - 20 + s.jumpY;

        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;

        if (s.isSliding) {
          // Flattened runner posture
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(px - 24, py - 14, 48, 14);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + 12, py - 7, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Normal standing / jumping runner
          // Torso & head
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(px - 14, py - 46, 28, 32);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py - 52, 9, 0, Math.PI * 2);
          ctx.fill();
          // Cyan Visor
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(px - 5, py - 54, 10, 4);

          // Legs / hover thruster
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(px - 8, py - 14);
          ctx.lineTo(px, py);
          ctx.lineTo(px + 8, py - 14);
          ctx.fill();
        }

        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0815] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            PULSE RUNNER
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Sprint à 3 voies sur l'autoroute néon ! Flèches Gauche/Droite pour changer de voie, Haut pour sauter les barrières et Bas pour glisser sous les lasers.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>SPRINTER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">COLLISION</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">COURSE TERMINÉE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DISTANCE</span>
            <span className="font-mono-code text-3xl font-extrabold text-amber-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REPRENDRE LA VOIE</span>
          </button>
        </div>
      )}

      {/* Touch virtual pad for mobile */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none md:hidden">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={moveLeft}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-amber-600"
            >
              ◀
            </button>
            <button
              onClick={moveRight}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-amber-600"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={doSlide}
              className="w-13 h-12 rounded-xl bg-cyan-700/80 border border-cyan-400 text-white font-arcade text-xs font-bold flex items-center justify-center active:scale-95"
            >
              GLISSE
            </button>
            <button
              onClick={doJump}
              className="w-13 h-12 rounded-xl bg-amber-600/90 border border-amber-400 text-white font-arcade text-xs font-bold flex items-center justify-center active:scale-95"
            >
              SAUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
