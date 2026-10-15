import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Box, Trophy, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  vx?: number;
  minX?: number;
  maxX?: number;
}

export const CubeQuestGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [orbsCount, setOrbsCount] = useState<number>(0);

  const stateRef = useRef({
    player: { x: 50, y: 380, vx: 0, vy: 0, w: 22, h: 22, isGrounded: false, jumpsLeft: 2 },
    keys: { left: false, right: false, jump: false },
    platforms: [] as Platform[],
    spikes: [] as Array<{ x: number; y: number; w: number; h: number }>,
    orbs: [] as Array<{ x: number; y: number; r: number; collected: boolean }>,
    portal: { x: 740, y: 120, w: 32, h: 48 },
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    score: 0,
    level: 1,
    totalOrbs: 0,
    animId: 0,
  });

  const loadLevel = (lvl: number) => {
    const s = stateRef.current;
    s.level = lvl;
    setCurrentLevel(lvl);
    s.player = { x: 50, y: 380, vx: 0, vy: 0, w: 22, h: 22, isGrounded: false, jumpsLeft: 2 };
    s.particles = [];

    if (lvl === 1) {
      s.platforms = [
        { x: 0, y: 440, w: 800, h: 60 }, // Floor
        { x: 140, y: 350, w: 120, h: 16 },
        { x: 320, y: 280, w: 110, h: 16, vx: 1.5, minX: 280, maxX: 460 }, // Moving platform
        { x: 500, y: 220, w: 120, h: 16 },
        { x: 680, y: 160, w: 100, h: 16 },
      ];
      s.spikes = [
        { x: 260, y: 424, w: 50, h: 16 },
        { x: 440, y: 424, w: 50, h: 16 },
      ];
      s.orbs = [
        { x: 200, y: 310, r: 8, collected: false },
        { x: 380, y: 240, r: 8, collected: false },
        { x: 560, y: 180, r: 8, collected: false },
        { x: 710, y: 120, r: 8, collected: false },
      ];
      s.portal = { x: 730, y: 112, w: 32, h: 48 };
    } else if (lvl === 2) {
      s.platforms = [
        { x: 0, y: 440, w: 160, h: 60 },
        { x: 220, y: 380, w: 90, h: 16, vx: 2, minX: 200, maxX: 360 },
        { x: 400, y: 320, w: 90, h: 16, vx: -2, minX: 380, maxX: 540 },
        { x: 580, y: 250, w: 100, h: 16 },
        { x: 380, y: 180, w: 110, h: 16 },
        { x: 180, y: 130, w: 120, h: 16 },
      ];
      s.spikes = [
        { x: 160, y: 484, w: 640, h: 16 }, // Pitfall spikes
        { x: 420, y: 304, w: 30, h: 16 },
      ];
      s.orbs = [
        { x: 270, y: 340, r: 8, collected: false },
        { x: 450, y: 280, r: 8, collected: false },
        { x: 630, y: 210, r: 8, collected: false },
        { x: 430, y: 140, r: 8, collected: false },
        { x: 220, y: 90, r: 8, collected: false },
      ];
      s.portal = { x: 190, y: 82, w: 32, h: 48 };
    } else {
      // Level 3 (Final Stage)
      s.platforms = [
        { x: 0, y: 440, w: 120, h: 60 },
        { x: 180, y: 380, w: 70, h: 16 },
        { x: 300, y: 320, w: 80, h: 16, vx: 2.5, minX: 280, maxX: 460 },
        { x: 520, y: 260, w: 70, h: 16 },
        { x: 370, y: 200, w: 80, h: 16, vx: -2.5, minX: 300, maxX: 480 },
        { x: 200, y: 150, w: 70, h: 16 },
        { x: 340, y: 95, w: 140, h: 16 },
      ];
      s.spikes = [
        { x: 120, y: 484, w: 680, h: 16 },
        { x: 195, y: 364, w: 25, h: 16 },
        { x: 535, y: 244, w: 25, h: 16 },
      ];
      s.orbs = [
        { x: 215, y: 340, r: 8, collected: false },
        { x: 370, y: 280, r: 8, collected: false },
        { x: 555, y: 220, r: 8, collected: false },
        { x: 410, y: 160, r: 8, collected: false },
        { x: 235, y: 110, r: 8, collected: false },
        { x: 380, y: 60, r: 8, collected: false },
      ];
      s.portal = { x: 420, y: 47, w: 32, h: 48 };
    }
  };

  const jump = () => {
    const s = stateRef.current;
    if (s.player.jumpsLeft > 0) {
      s.player.vy = -10.5;
      s.player.jumpsLeft -= 1;
      s.player.isGrounded = false;
      soundManager.jump();

      // Jump particles
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: s.player.x + s.player.w / 2,
          y: s.player.y + s.player.h,
          vx: (Math.random() - 0.5) * 80,
          vy: Math.random() * 40,
          color: '#8b5cf6',
          life: 0.3,
        });
      }
    }
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.score = 0;
    s.totalOrbs = 0;
    setOrbsCount(0);
    loadLevel(1);
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
        // Player Horizontal speed
        const speed = 4.8;
        if (s.keys.left) s.player.vx = -speed;
        else if (s.keys.right) s.player.vx = speed;
        else s.player.vx *= 0.75;

        // Gravity
        s.player.vy += 22 * dt;
        s.player.x += s.player.vx;
        s.player.y += s.player.vy;

        // Bounds
        if (s.player.x < 0) s.player.x = 0;
        if (s.player.x + s.player.w > 800) s.player.x = 800 - s.player.w;

        // Pit fall death
        if (s.player.y > 510) {
          handleDeath();
          return;
        }

        // Move moving platforms
        s.platforms.forEach((p) => {
          if (p.vx && p.minX !== undefined && p.maxX !== undefined) {
            p.x += p.vx;
            if (p.x <= p.minX || p.x + p.w >= p.maxX) {
              p.vx = -p.vx;
            }
          }
        });

        // Platform collisions
        s.player.isGrounded = false;
        s.platforms.forEach((p) => {
          // Landing on platform from above
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
            s.player.jumpsLeft = 2; // Reset double jump
            if (p.vx) s.player.x += p.vx; // Ride moving platform
          }
        });

        // Spike collisions
        s.spikes.forEach((sp) => {
          if (
            s.player.x + s.player.w > sp.x + 4 &&
            s.player.x < sp.x + sp.w - 4 &&
            s.player.y + s.player.h > sp.y + 4 &&
            s.player.y < sp.y + sp.h
          ) {
            handleDeath();
            return;
          }
        });

        // Orb collection
        s.orbs.forEach((orb) => {
          if (!orb.collected) {
            const dist = Math.hypot(
              s.player.x + s.player.w / 2 - orb.x,
              s.player.y + s.player.h / 2 - orb.y
            );
            if (dist < orb.r + s.player.w / 2) {
              orb.collected = true;
              soundManager.coin();
              s.score += 100;
              s.totalOrbs += 1;
              setOrbsCount(s.totalOrbs);
              onScoreUpdate(s.score);
              for (let p = 0; p < 8; p++) {
                s.particles.push({
                  x: orb.x,
                  y: orb.y,
                  vx: (Math.random() - 0.5) * 100,
                  vy: (Math.random() - 0.5) * 100,
                  color: '#fbbf24',
                  life: 0.4,
                });
              }
            }
          }
        });

        // Portal reach (level completion)
        const port = s.portal;
        if (
          s.player.x + s.player.w > port.x &&
          s.player.x < port.x + port.w &&
          s.player.y + s.player.h > port.y &&
          s.player.y < port.y + port.h
        ) {
          soundManager.win();
          s.score += 500;
          onScoreUpdate(s.score);

          if (s.level < 3) {
            loadLevel(s.level + 1);
          } else {
            // All levels completed: Victory!
            const res = saveGameScore('cube-quest', s.score);
            reportGameActivity('cube-quest', s.score, { orbsCollected: s.totalOrbs });
            setFinalScore(s.score);
            setIsHighScore(res.isNewHighScore);
            setGameState('victory');
            return;
          }
        }

        // Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt;
          if (pt.life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0a0b18';
      ctx.fillRect(0, 0, 800, 500);

      // Grid background
      ctx.strokeStyle = '#15172b';
      ctx.lineWidth = 1;
      for (let x = 0; x < 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 500);
        ctx.stroke();
      }
      for (let y = 0; y < 500; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      // Render Platforms
      s.platforms.forEach((p) => {
        ctx.fillStyle = '#1e233d';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Neon edge
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(p.x, p.y, p.w, 3);
      });

      // Render Spikes
      s.spikes.forEach((sp) => {
        ctx.fillStyle = '#ef4444';
        const numSpikes = Math.max(1, Math.floor(sp.w / 12));
        const wStep = sp.w / numSpikes;
        for (let i = 0; i < numSpikes; i++) {
          ctx.beginPath();
          ctx.moveTo(sp.x + i * wStep, sp.y + sp.h);
          ctx.lineTo(sp.x + (i + 0.5) * wStep, sp.y);
          ctx.lineTo(sp.x + (i + 1) * wStep, sp.y + sp.h);
          ctx.fill();
        }
      });

      // Render Orbs
      s.orbs.forEach((orb) => {
        if (!orb.collected) {
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(orb.x - 2, orb.y - 2, orb.r * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Render Portal
      const port = s.portal;
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(port.x, port.y, port.w, port.h);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.fillRect(port.x, port.y, port.w, port.h);
      // Pulsing center line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(port.x + port.w / 2 - 2, port.y + 4, 4, port.h - 8);
      ctx.restore();

      // Render Player Cube
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeOffset = s.player.vx < -0.1 ? 3 : s.player.vx > 0.1 ? 9 : 6;
        ctx.fillRect(pl.x + eyeOffset, pl.y + 6, 4, 4);
        ctx.fillRect(pl.x + eyeOffset + 6, pl.y + 6, 4, 4);

        ctx.restore();
      }

      // Render Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });

      s.animId = requestAnimationFrame(loop);
    };

    const handleDeath = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('cube-quest', s.score);
      reportGameActivity('cube-quest', s.score, { orbsCollected: s.totalOrbs });
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0b18] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Level & Orb Counter HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/40 text-xs font-arcade font-bold text-purple-300">
            NIVEAU {currentLevel} / 3
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-amber-500/40 text-xs font-mono-code font-bold text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {orbsCount} Orbes
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Box className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            CUBE QUEST
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Aventure de plateforme avec double-saut ! Évitez les pièges de pointes, collectez les orbes dorés et franchissez le portail de chaque niveau.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(139,92,246,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>COMMENCER LA QUÊTE</span>
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-2 shadow-[0_0_25px_rgba(245,158,11,0.5)]">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono-code uppercase tracking-widest text-amber-400 mb-1">TOUS LES MONDES TERMINÉS</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">VICTOIRE ABSOLUE !</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-amber-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-purple-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REJOUER LE PÉRIPHÉRIQUE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">PIÈGE TOUCHÉ</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">ÉCHEC DE LA QUÊTE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE NIVEAU {currentLevel}</span>
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
            <span>RECOMMENCER</span>
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
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-purple-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => { stateRef.current.keys.right = true; }}
              onTouchEnd={() => { stateRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-lg flex items-center justify-center active:bg-purple-600"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={jump}
            className="pointer-events-auto w-14 h-14 rounded-full bg-purple-600/90 border-2 border-purple-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            SAUT
          </button>
        </div>
      )}
    </div>
  );
};
