import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Rocket, Shield } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const AstroBlasterGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [shields, setShields] = useState<number>(3);

  const stateRef = useRef({
    player: { x: 400, y: 440, w: 32, h: 28, speed: 7, shields: 3, tripleShotTimer: 0 },
    keys: { left: false, right: false, up: false, down: false, shoot: false },
    lasers: [] as Array<{ x: number; y: number; vy: number; isEnemy: boolean; color: string }>,
    enemies: [] as Array<{ x: number; y: number; w: number; h: number; vx: number; vy: number; hp: number; maxHp: number; shootTimer: number; color: string }>,
    powerups: [] as Array<{ x: number; y: number; type: 'shield' | 'triple'; vy: number }>,
    stars: [] as Array<{ x: number; y: number; speed: number; size: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number }>,
    score: 0,
    enemiesKilled: 0,
    lastSpawn: 0,
    lastPlayerShot: 0,
    animId: 0,
  });

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setGameState('playing');
    const s = stateRef.current;
    s.player = { x: 400, y: 440, w: 32, h: 28, speed: 7, shields: 3, tripleShotTimer: 0 };
    s.lasers = [];
    s.enemies = [];
    s.powerups = [];
    s.particles = [];
    s.score = 0;
    s.enemiesKilled = 0;
    s.lastSpawn = Date.now();
    s.lastPlayerShot = 0;
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

    // Init background stars
    const s = stateRef.current;
    if (s.stars.length === 0) {
      for (let i = 0; i < 70; i++) {
        s.stars.push({
          x: Math.random() * 800,
          y: Math.random() * 500,
          speed: 20 + Math.random() * 80,
          size: Math.random() > 0.8 ? 2 : 1,
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = s.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
      if (e.code === 'Space') {
        e.preventDefault();
        k.shoot = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = s.keys;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
      if (e.code === 'Space') k.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update Stars
      s.stars.forEach((st) => {
        st.y += st.speed * dt;
        if (st.y > 500) {
          st.y = 0;
          st.x = Math.random() * 800;
        }
      });

      if (gameState === 'playing' && !isPaused) {
        // Player Movement
        if (s.keys.left) s.player.x -= s.player.speed;
        if (s.keys.right) s.player.x += s.player.speed;
        if (s.keys.up) s.player.y -= s.player.speed * 0.7;
        if (s.keys.down) s.player.y += s.player.speed * 0.7;

        s.player.x = Math.max(20, Math.min(780, s.player.x));
        s.player.y = Math.max(250, Math.min(470, s.player.y));

        if (s.player.tripleShotTimer > 0) {
          s.player.tripleShotTimer -= dt;
        }

        // Shooting
        const fireCooldown = s.player.tripleShotTimer > 0 ? 120 : 180;
        if (s.keys.shoot && Date.now() - s.lastPlayerShot > fireCooldown) {
          s.lastPlayerShot = Date.now();
          soundManager.laser();

          if (s.player.tripleShotTimer > 0) {
            s.lasers.push({ x: s.player.x - 12, y: s.player.y - 10, vy: -550, isEnemy: false, color: '#38bdf8' });
            s.lasers.push({ x: s.player.x, y: s.player.y - 14, vy: -550, isEnemy: false, color: '#a855f7' });
            s.lasers.push({ x: s.player.x + 12, y: s.player.y - 10, vy: -550, isEnemy: false, color: '#38bdf8' });
          } else {
            s.lasers.push({ x: s.player.x - 8, y: s.player.y - 10, vy: -500, isEnemy: false, color: '#06b6d4' });
            s.lasers.push({ x: s.player.x + 8, y: s.player.y - 10, vy: -500, isEnemy: false, color: '#06b6d4' });
          }
        }

        // Spawn Enemies
        if (Date.now() - s.lastSpawn > 1100) {
          s.lastSpawn = Date.now();
          const isTough = Math.random() > 0.7;
          s.enemies.push({
            x: 60 + Math.random() * 680,
            y: -30,
            w: isTough ? 36 : 26,
            h: isTough ? 32 : 22,
            vx: (Math.random() - 0.5) * 60,
            vy: 90 + Math.random() * 70,
            hp: isTough ? 3 : 1,
            maxHp: isTough ? 3 : 1,
            shootTimer: Math.random() * 2,
            color: isTough ? '#ec4899' : '#f43f5e',
          });
        }

        // Update Lasers
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const l = s.lasers[i];
          l.y += l.vy * dt;

          if (l.isEnemy) {
            // Hit player
            if (
              Math.abs(l.x - s.player.x) < s.player.w / 2 &&
              Math.abs(l.y - s.player.y) < s.player.h / 2
            ) {
              s.lasers.splice(i, 1);
              soundManager.hit();
              s.player.shields -= 1;
              setShields(s.player.shields);

              // Sparks
              for (let p = 0; p < 12; p++) {
                s.particles.push({
                  x: s.player.x,
                  y: s.player.y,
                  vx: (Math.random() - 0.5) * 200,
                  vy: (Math.random() - 0.5) * 200,
                  color: '#38bdf8',
                  life: 0.4,
                  maxLife: 0.4,
                });
              }

              if (s.player.shields <= 0) {
                soundManager.explosion();
                soundManager.gameover();
                const res = saveGameScore('astro-blaster', s.score);
                reportGameActivity('astro-blaster', s.score, { enemiesDestroyed: s.enemiesKilled });
                setFinalScore(s.score);
                setIsHighScore(res.isNewHighScore);
                setGameState('gameover');
                break;
              }
              continue;
            }
          } else {
            // Player laser hitting enemies
            for (let j = s.enemies.length - 1; j >= 0; j--) {
              const en = s.enemies[j];
              if (
                Math.abs(l.x - en.x) < en.w / 2 + 4 &&
                Math.abs(l.y - en.y) < en.h / 2 + 4
              ) {
                s.lasers.splice(i, 1);
                en.hp -= 1;
                soundManager.hit();

                if (en.hp <= 0) {
                  soundManager.explosion();
                  s.score += en.maxHp * 50;
                  s.enemiesKilled += 1;
                  onScoreUpdate(s.score);

                  // Particles
                  for (let p = 0; p < 15; p++) {
                    s.particles.push({
                      x: en.x,
                      y: en.y,
                      vx: (Math.random() - 0.5) * 250,
                      vy: (Math.random() - 0.5) * 250,
                      color: en.color,
                      life: 0.5,
                      maxLife: 0.5,
                    });
                  }

                  // Drop powerup chance
                  if (Math.random() < 0.25) {
                    s.powerups.push({
                      x: en.x,
                      y: en.y,
                      type: Math.random() > 0.5 ? 'shield' : 'triple',
                      vy: 100,
                    });
                  }

                  s.enemies.splice(j, 1);
                }
                break;
              }
            }
          }

          if (l.y < -20 || l.y > 520) {
            s.lasers.splice(i, 1);
          }
        }

        // Update Enemies
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const en = s.enemies[i];
          en.x += en.vx * dt;
          en.y += en.vy * dt;
          en.shootTimer += dt;

          if (en.shootTimer > 2.2) {
            en.shootTimer = 0;
            s.lasers.push({
              x: en.x,
              y: en.y + en.h / 2,
              vy: 220,
              isEnemy: true,
              color: '#f43f5e',
            });
          }

          // Enemy collision with player
          if (
            Math.abs(en.x - s.player.x) < (en.w + s.player.w) / 2 &&
            Math.abs(en.y - s.player.y) < (en.h + s.player.h) / 2
          ) {
            soundManager.explosion();
            s.player.shields -= 1;
            setShields(s.player.shields);
            s.enemies.splice(i, 1);

            if (s.player.shields <= 0) {
              soundManager.gameover();
              const res = saveGameScore('astro-blaster', s.score);
              reportGameActivity('astro-blaster', s.score, { enemiesDestroyed: s.enemiesKilled });
              setFinalScore(s.score);
              setIsHighScore(res.isNewHighScore);
              setGameState('gameover');
              break;
            }
            continue;
          }

          if (en.y > 540) {
            s.enemies.splice(i, 1);
          }
        }

        // Update Powerups
        for (let i = s.powerups.length - 1; i >= 0; i--) {
          const pow = s.powerups[i];
          pow.y += pow.vy * dt;

          if (
            Math.abs(pow.x - s.player.x) < 24 &&
            Math.abs(pow.y - s.player.y) < 24
          ) {
            soundManager.powerup();
            if (pow.type === 'shield') {
              s.player.shields = Math.min(3, s.player.shields + 1);
              setShields(s.player.shields);
            } else {
              s.player.tripleShotTimer = 8; // 8 seconds triple shot
            }
            s.score += 100;
            onScoreUpdate(s.score);
            s.powerups.splice(i, 1);
            continue;
          }

          if (pow.y > 520) s.powerups.splice(i, 1);
        }

        // Update Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#060714';
      ctx.fillRect(0, 0, 800, 500);

      // Stars
      ctx.fillStyle = '#ffffff';
      s.stars.forEach((st) => {
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });

      // Lasers
      s.lasers.forEach((l) => {
        ctx.save();
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x, l.y + (l.isEnemy ? 10 : -12));
        ctx.stroke();
        ctx.restore();
      });

      // Powerups
      s.powerups.forEach((pow) => {
        ctx.save();
        ctx.shadowColor = pow.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.fillStyle = pow.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(pow.x, pow.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pow.type === 'shield' ? 'S' : '3X', pow.x, pow.y);
        ctx.restore();
      });

      // Enemies
      s.enemies.forEach((en) => {
        ctx.save();
        ctx.shadowColor = en.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = en.color;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y + en.h / 2);
        ctx.lineTo(en.x + en.w / 2, en.y - en.h / 2);
        ctx.lineTo(en.x, en.y - en.h / 4);
        ctx.lineTo(en.x - en.w / 2, en.y - en.h / 2);
        ctx.closePath();
        ctx.fill();

        // Eyes / cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(en.x, en.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Player Ship
      if (gameState === 'playing' || gameState === 'start') {
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;

        // Thrust flame
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(s.player.x - 6, s.player.y + 12);
        ctx.lineTo(s.player.x, s.player.y + 20 + Math.random() * 6);
        ctx.lineTo(s.player.x + 6, s.player.y + 12);
        ctx.fill();

        // Ship body
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(s.player.x, s.player.y - 14);
        ctx.lineTo(s.player.x + 16, s.player.y + 12);
        ctx.lineTo(s.player.x, s.player.y + 7);
        ctx.lineTo(s.player.x - 16, s.player.y + 12);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.player.x, s.player.y - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Shield aura if active
        if (s.player.shields > 1) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.player.x, s.player.y, 22, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      s.animId = requestAnimationFrame(loop);
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused]);

  // Touch virtual buttons
  const handleTouchDir = (dir: 'left' | 'right', pressed: boolean) => {
    stateRef.current.keys[dir] = pressed;
  };

  const handleTouchShoot = (pressed: boolean) => {
    stateRef.current.keys.shoot = pressed;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#060714]">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* In-game Shield Health Bar */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 text-xs font-mono-code font-bold text-cyan-300">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>BOUCLIERS :</span>
          <div className="flex gap-1 ml-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3 rounded-sm ${
                  i < shields ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Start Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            ASTRO BLASTER
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Détruisez les vagues d’ennemis extraterrestres, ramassez les améliorations de tir triple et préservez vos boucliers !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>DÉCOLLER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">VAISSEAU DÉTRUIT</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">MISSION ÉCHOUÉE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-cyan-300">{finalScore}</span>
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
            <span>NOUVELLE TENTATIVE</span>
          </button>
        </div>
      )}

      {/* Mobile Touch Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-3 pointer-events-none md:hidden">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onTouchStart={() => handleTouchDir('left', true)}
              onTouchEnd={() => handleTouchDir('left', false)}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-base flex items-center justify-center active:bg-cyan-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => handleTouchDir('right', true)}
              onTouchEnd={() => handleTouchDir('right', false)}
              className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600 text-white font-bold text-base flex items-center justify-center active:bg-cyan-600"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={() => handleTouchShoot(true)}
            onTouchEnd={() => handleTouchShoot(false)}
            className="pointer-events-auto w-14 h-14 rounded-full bg-rose-600/90 border-2 border-rose-400 text-white font-arcade text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            TIR
          </button>
        </div>
      )}
    </div>
  );
};
