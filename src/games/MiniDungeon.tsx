import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Key, Shield, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const MiniDungeonGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [chamber, setChamber] = useState<number>(1);

  const stateRef = useRef({
    player: { x: 80, y: 250, size: 20, speed: 4 },
    keysHeld: { left: false, right: false, up: false, down: false },
    hasKey: false,
    chamber: 1,
    walls: [] as Array<{ x: number; y: number; w: number; h: number }>,
    enemies: [] as Array<{ x: number; y: number; size: number; vx: number; vy: number; minX: number; maxX: number; minY: number; maxY: number }>,
    spikes: [] as Array<{ x: number; y: number; size: number }>,
    chests: [] as Array<{ x: number; y: number; w: number; h: number; opened: boolean }>,
    keyItem: { x: 0, y: 0, collected: false },
    door: { x: 0, y: 0, w: 24, h: 48, open: false },
    stairs: { x: 740, y: 230, w: 32, h: 32 },
    score: 0,
    animId: 0,
  });

  const loadChamber = (lvl: number) => {
    const s = stateRef.current;
    s.chamber = lvl;
    setChamber(lvl);
    s.player = { x: 70, y: 250, size: 20, speed: 4 };
    s.hasKey = false;
    setHasKey(false);

    // Perimeter walls
    s.walls = [
      { x: 20, y: 20, w: 760, h: 20 },
      { x: 20, y: 460, w: 760, h: 20 },
      { x: 20, y: 20, w: 20, h: 460 },
      { x: 760, y: 20, w: 20, h: 460 },
    ];

    if (lvl === 1) {
      // Chamber 1: 2 rooms split by a wall with a locked door
      s.walls.push({ x: 390, y: 40, w: 20, h: 180 });
      s.walls.push({ x: 390, y: 270, w: 20, h: 190 });
      s.door = { x: 390, y: 220, w: 20, h: 50, open: false };
      s.keyItem = { x: 120, y: 100, collected: false };
      s.stairs = { x: 700, y: 240, w: 36, h: 36 };

      s.chests = [
        { x: 200, y: 400, w: 24, h: 20, opened: false },
        { x: 550, y: 100, w: 24, h: 20, opened: false },
      ];

      s.enemies = [
        { x: 260, y: 160, size: 18, vx: 0, vy: 2.2, minX: 260, maxX: 260, minY: 80, maxY: 380 },
        { x: 520, y: 320, size: 18, vx: 2.5, vy: 0, minX: 430, maxX: 680, minY: 320, maxY: 320 },
      ];
      s.spikes = [
        { x: 260, y: 250, size: 24 },
        { x: 600, y: 240, size: 24 },
      ];
    } else if (lvl === 2) {
      // Chamber 2: 3 rooms maze
      s.walls.push({ x: 260, y: 40, w: 20, h: 280 });
      s.walls.push({ x: 520, y: 160, w: 20, h: 300 });
      s.door = { x: 520, y: 90, w: 20, h: 70, open: false };
      s.keyItem = { x: 390, y: 400, collected: false };
      s.stairs = { x: 700, y: 100, w: 36, h: 36 };

      s.chests = [
        { x: 80, y: 80, w: 24, h: 20, opened: false },
        { x: 420, y: 80, w: 24, h: 20, opened: false },
        { x: 680, y: 400, w: 24, h: 20, opened: false },
      ];

      s.enemies = [
        { x: 160, y: 120, size: 18, vx: 0, vy: 2.5, minX: 160, maxX: 160, minY: 80, maxY: 380 },
        { x: 380, y: 220, size: 18, vx: 2.8, vy: 0, minX: 300, maxX: 480, minY: 220, maxY: 220 },
        { x: 640, y: 240, size: 18, vx: 0, vy: 2.6, minX: 640, maxX: 640, minY: 160, maxY: 380 },
      ];
      s.spikes = [
        { x: 200, y: 350, size: 24 },
        { x: 480, y: 260, size: 24 },
      ];
    } else {
      // Chamber 3: Master Crypt
      s.walls.push({ x: 200, y: 40, w: 20, h: 220 });
      s.walls.push({ x: 200, y: 320, w: 20, h: 140 });
      s.walls.push({ x: 400, y: 100, w: 20, h: 280 });
      s.walls.push({ x: 600, y: 40, w: 20, h: 200 });
      s.walls.push({ x: 600, y: 300, w: 20, h: 160 });
      s.door = { x: 600, y: 240, w: 20, h: 60, open: false };
      s.keyItem = { x: 500, y: 400, collected: false };
      s.stairs = { x: 700, y: 240, w: 36, h: 36 };

      s.chests = [
        { x: 100, y: 80, w: 24, h: 20, opened: false },
        { x: 300, y: 400, w: 24, h: 20, opened: false },
        { x: 500, y: 80, w: 24, h: 20, opened: false },
        { x: 700, y: 80, w: 24, h: 20, opened: false },
      ];

      s.enemies = [
        { x: 100, y: 340, size: 18, vx: 3, vy: 0, minX: 60, maxX: 160, minY: 340, maxY: 340 },
        { x: 300, y: 160, size: 18, vx: 0, vy: 3, minX: 300, maxX: 300, minY: 80, maxY: 360 },
        { x: 500, y: 220, size: 18, vx: 0, vy: 3, minX: 500, maxX: 500, minY: 120, maxY: 360 },
        { x: 700, y: 350, size: 18, vx: 0, vy: 3, minX: 700, maxX: 700, minY: 100, maxY: 400 },
      ];
      s.spikes = [
        { x: 100, y: 200, size: 24 },
        { x: 300, y: 280, size: 24 },
        { x: 500, y: 280, size: 24 },
      ];
    }
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.score = 0;
    loadChamber(1);
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
      const k = stateRef.current.keysHeld;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keysHeld;
      if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Player target position
        let nx = s.player.x;
        let ny = s.player.y;

        if (s.keysHeld.left) nx -= s.player.speed;
        if (s.keysHeld.right) nx += s.player.speed;
        if (s.keysHeld.up) ny -= s.player.speed;
        if (s.keysHeld.down) ny += s.player.speed;

        // Collision with walls
        const pr = s.player.size / 2;
        let canMoveX = true;
        let canMoveY = true;

        const checkColl = (x: number, y: number) => {
          // Check walls
          for (const w of s.walls) {
            if (
              x + pr > w.x &&
              x - pr < w.x + w.w &&
              y + pr > w.y &&
              y - pr < w.y + w.h
            ) {
              return true;
            }
          }
          // Check locked door
          if (!s.door.open) {
            const d = s.door;
            if (
              x + pr > d.x &&
              x - pr < d.x + d.w &&
              y + pr > d.y &&
              y - pr < d.y + d.h
            ) {
              // Try unlock with key
              if (s.hasKey) {
                s.door.open = true;
                soundManager.powerup();
                s.score += 200;
                onScoreUpdate(s.score);
                return false;
              }
              return true;
            }
          }
          return false;
        };

        if (!checkColl(nx, s.player.y)) s.player.x = nx;
        if (!checkColl(s.player.x, ny)) s.player.y = ny;

        // Key pickup
        if (!s.keyItem.collected) {
          if (Math.hypot(s.player.x - s.keyItem.x, s.player.y - s.keyItem.y) < 24) {
            s.keyItem.collected = true;
            s.hasKey = true;
            setHasKey(true);
            soundManager.coin();
            s.score += 150;
            onScoreUpdate(s.score);
          }
        }

        // Chest pickups
        s.chests.forEach((ch) => {
          if (!ch.opened) {
            if (
              Math.abs(s.player.x - (ch.x + ch.w / 2)) < 24 &&
              Math.abs(s.player.y - (ch.y + ch.h / 2)) < 24
            ) {
              ch.opened = true;
              soundManager.coin();
              s.score += 250;
              onScoreUpdate(s.score);
            }
          }
        });

        // Update roaming enemies
        s.enemies.forEach((en) => {
          en.x += en.vx;
          en.y += en.vy;
          if (en.x <= en.minX || en.x >= en.maxX) en.vx = -en.vx;
          if (en.y <= en.minY || en.y >= en.maxY) en.vy = -en.vy;

          // Enemy collision with player
          if (Math.hypot(s.player.x - en.x, s.player.y - en.y) < pr + en.size / 2) {
            handleGameOver();
            return;
          }
        });

        // Spikes collision
        s.spikes.forEach((sp) => {
          if (Math.hypot(s.player.x - sp.x, s.player.y - sp.y) < pr + sp.size / 2 - 2) {
            handleGameOver();
            return;
          }
        });

        // Stairs (Exit) collision
        const st = s.stairs;
        if (
          s.player.x + pr > st.x &&
          s.player.x - pr < st.x + st.w &&
          s.player.y + pr > st.y &&
          s.player.y - pr < st.y + st.h
        ) {
          soundManager.win();
          s.score += 500;
          onScoreUpdate(s.score);

          if (s.chamber < 3) {
            loadChamber(s.chamber + 1);
          } else {
            // Completed all chambers!
            const res = saveGameScore('mini-dungeon', s.score);
            reportGameActivity('mini-dungeon', s.score);
            setFinalScore(s.score);
            setIsHighScore(res.isNewHighScore);
            setGameState('victory');
            return;
          }
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0d0b14';
      ctx.fillRect(0, 0, 800, 500);

      // Floor tiles
      ctx.strokeStyle = '#181424';
      ctx.lineWidth = 1;
      for (let x = 40; x < 760; x += 40) {
        for (let y = 40; y < 460; y += 40) {
          ctx.strokeRect(x, y, 40, 40);
        }
      }

      // Walls
      ctx.fillStyle = '#221e33';
      s.walls.forEach((w) => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#433d5e';
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      });

      // Door
      if (!s.door.open) {
        const d = s.door;
        ctx.fillStyle = '#b45309';
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spikes
      s.spikes.forEach((sp) => {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Chests
      s.chests.forEach((ch) => {
        ctx.fillStyle = ch.opened ? '#4b5563' : '#d97706';
        ctx.fillRect(ch.x, ch.y, ch.w, ch.h);
        ctx.fillStyle = ch.opened ? '#9ca3af' : '#fef08a';
        ctx.fillRect(ch.x, ch.y + 6, ch.w, 3);
      });

      // Key Item
      if (!s.keyItem.collected) {
        const k = s.keyItem;
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(k.x, k.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(k.x, k.y - 2, 10, 4);
        ctx.fillRect(k.x + 8, k.y + 2, 3, 4);
        ctx.restore();
      }

      // Stairs
      const st = s.stairs;
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(st.x, st.y, st.w, st.h);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(st.x + 4, st.y + 4 + i * 7, st.w - 8, 3);
      }

      // Enemies
      s.enemies.forEach((en) => {
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(en.x - 4, en.y - 2, 3, 3);
        ctx.fillRect(en.x + 2, en.y - 2, 3, 3);
        ctx.restore();
      });

      // Player Knight
      if (gameState === 'playing' || gameState === 'start') {
        const pl = s.player;
        ctx.save();
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Knight visor
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pl.x - 4, pl.y - 3, 8, 4);
        ctx.restore();
      }

      s.animId = requestAnimationFrame(loop);
    };

    const handleGameOver = () => {
      soundManager.hit();
      soundManager.gameover();
      const s = stateRef.current;
      const res = saveGameScore('mini-dungeon', s.score);
      reportGameActivity('mini-dungeon', s.score);
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
    <div className="relative w-full h-full flex items-center justify-center bg-[#0d0b14] select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain"
      />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/40 text-xs font-arcade font-bold text-red-300">
            SALLE {chamber} / 3
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 border border-amber-500/40 text-xs font-mono-code font-bold text-amber-300">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{hasKey ? 'Clé dorée possédée' : 'Clé manquante'}</span>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            MINI DUNGEON
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Trouvez la clé dorée pour ouvrir la herse, pillez les coffres au trésor, esquivez les spectres rouges et montez les escaliers secrets !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(239,68,68,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>PÉNÉTRER DANS LE DONJON</span>
          </button>
        </div>
      )}

      {/* Victory */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono-code uppercase tracking-widest text-amber-400 mb-1">DONJON PURIFIÉ</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">ÉVASION RÉUSSIE !</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">BUTIN DU DONJON</span>
            <span className="font-mono-code text-3xl font-extrabold text-amber-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-red-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REJOUER LE DONJON</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">PIÈGE FATAL</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">VOUS AVEZ PÉRI</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE SALLE {chamber}</span>
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
            <span>RESSUSCITER</span>
          </button>
        </div>
      )}

      {/* Mobile D-Pad */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1 md:hidden pointer-events-auto">
          <div />
          <button
            onTouchStart={() => { stateRef.current.keysHeld.up = true; }}
            onTouchEnd={() => { stateRef.current.keysHeld.up = false; }}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
          >
            ▲
          </button>
          <div />
          <button
            onTouchStart={() => { stateRef.current.keysHeld.left = true; }}
            onTouchEnd={() => { stateRef.current.keysHeld.left = false; }}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
          >
            ◀
          </button>
          <button
            onTouchStart={() => { stateRef.current.keysHeld.down = true; }}
            onTouchEnd={() => { stateRef.current.keysHeld.down = false; }}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
          >
            ▼
          </button>
          <button
            onTouchStart={() => { stateRef.current.keysHeld.right = true; }}
            onTouchEnd={() => { stateRef.current.keysHeld.right = false; }}
            className="w-11 h-11 bg-slate-800/80 border border-slate-600 rounded-lg text-white font-bold flex items-center justify-center active:bg-red-600"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
};
