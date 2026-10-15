import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Layers } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

export const StackMasterGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [comboText, setComboText] = useState<string>('');

  const stateRef = useRef({
    blocks: [] as Array<{ x: number; y: number; w: number; h: number; color: string }>,
    fallingPieces: [] as Array<{ x: number; y: number; w: number; h: number; color: string; vy: number; rot: number; vrot: number }>,
    currentBlock: { x: 100, y: 0, w: 220, h: 24, vx: 5, dir: 1, color: '#ec4899' },
    cameraY: 0,
    targetCameraY: 0,
    score: 0,
    combo: 0,
    hue: 300,
    animId: 0,
  });

  const placeBlock = () => {
    if (gameState !== 'playing' || isPaused) return;
    const s = stateRef.current;
    const current = s.currentBlock;
    const topPlaced = s.blocks[s.blocks.length - 1];

    // Calculate overhang relative to top placed block
    const diff = current.x - topPlaced.x;
    const tolerance = 4; // Perfect alignment threshold

    if (Math.abs(diff) <= tolerance) {
      // Perfect placement!
      s.combo += 1;
      soundManager.combo(s.combo);
      current.x = topPlaced.x; // Snap to perfect
      setComboText(`PARFAIT ! x${s.combo}`);
      setTimeout(() => setComboText(''), 900);
      s.score += 2 + s.combo;
    } else if (diff > 0) {
      // Overhang to right
      const overlap = topPlaced.w - diff;
      if (overlap <= 0) {
        // Complete miss!
        gameOver();
        return;
      }
      soundManager.coin();
      s.combo = 0;
      // Falling overhang piece
      s.fallingPieces.push({
        x: topPlaced.x + topPlaced.w,
        y: current.y,
        w: diff,
        h: current.h,
        color: current.color,
        vy: 2,
        rot: 0,
        vrot: 0.05,
      });
      current.w = overlap;
      s.score += 1;
    } else {
      // Overhang to left
      const overlap = current.w + diff;
      if (overlap <= 0) {
        // Miss!
        gameOver();
        return;
      }
      soundManager.coin();
      s.combo = 0;
      // Falling overhang
      s.fallingPieces.push({
        x: current.x,
        y: current.y,
        w: -diff,
        h: current.h,
        color: current.color,
        vy: 2,
        rot: 0,
        vrot: -0.05,
      });
      current.x = topPlaced.x;
      current.w = overlap;
      s.score += 1;
    }

    onScoreUpdate(s.score);

    // Save newly placed block into stack
    s.blocks.push({
      x: current.x,
      y: current.y,
      w: current.w,
      h: current.h,
      color: current.color,
    });

    // Prepare next block
    s.hue = (s.hue + 14) % 360;
    const nextY = current.y - current.h;
    const speed = Math.min(10, 4.5 + s.score * 0.15);

    s.currentBlock = {
      x: Math.random() > 0.5 ? 50 : 550,
      y: nextY,
      w: current.w,
      h: current.h,
      vx: speed,
      dir: Math.random() > 0.5 ? 1 : -1,
      color: `hsl(${s.hue}, 85%, 60%)`,
    };

    // Camera adjustment
    if (s.blocks.length > 5) {
      s.targetCameraY = (s.blocks.length - 5) * current.h;
    }
  };

  const gameOver = () => {
    const s = stateRef.current;
    soundManager.gameover();
    const res = saveGameScore('stack-master', s.score);
    reportGameActivity('stack-master', s.score);
    setFinalScore(s.score);
    setIsHighScore(res.isNewHighScore);
    setGameState('gameover');
  };

  const startGame = () => {
    soundManager.click();
    setGameState('playing');
    const s = stateRef.current;
    s.hue = 320;
    s.score = 0;
    s.combo = 0;
    s.cameraY = 0;
    s.targetCameraY = 0;
    s.fallingPieces = [];

    // Base foundation block
    const baseBlock = { x: 280, y: 440, w: 240, h: 26, color: 'hsl(320, 80%, 55%)' };
    s.blocks = [baseBlock];

    s.currentBlock = {
      x: 100,
      y: 440 - 26,
      w: 240,
      h: 26,
      vx: 5,
      dir: 1,
      color: 'hsl(335, 85%, 60%)',
    };

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
      if (e.code === 'Space') {
        e.preventDefault();
        placeBlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const loop = () => {
      const s = stateRef.current;

      if (gameState === 'playing' && !isPaused) {
        // Move current block
        const b = s.currentBlock;
        b.x += b.vx * b.dir;
        if (b.x < 40) {
          b.x = 40;
          b.dir = 1;
        } else if (b.x + b.w > 760) {
          b.x = 760 - b.w;
          b.dir = -1;
        }

        // Camera smooth lerp
        s.cameraY += (s.targetCameraY - s.cameraY) * 0.1;

        // Update falling debris pieces
        for (let i = s.fallingPieces.length - 1; i >= 0; i--) {
          const fp = s.fallingPieces[i];
          fp.vy += 0.5;
          fp.y += fp.vy;
          fp.rot += fp.vrot;
          if (fp.y - s.cameraY > 600) s.fallingPieces.splice(i, 1);
        }
      }

      // --- DRAW ---
      ctx.fillStyle = '#0f0c1b';
      ctx.fillRect(0, 0, 800, 500);

      // Background subtle gradient glow
      const grad = ctx.createRadialGradient(400, 300, 50, 400, 300, 400);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.12)');
      grad.addColorStop(1, 'rgba(15, 12, 27, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 500);

      ctx.save();
      ctx.translate(0, s.cameraY);

      // Render placed blocks
      s.blocks.forEach((bl, idx) => {
        ctx.fillStyle = bl.color;
        ctx.shadowColor = bl.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(bl.x, bl.y, bl.w, bl.h);

        // Highlight line on top
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(bl.x, bl.y, bl.w, 2);
      });

      // Render active swinging block
      if (gameState === 'playing' || gameState === 'start') {
        const cb = s.currentBlock;
        ctx.fillStyle = cb.color;
        ctx.shadowColor = cb.color;
        ctx.shadowBlur = 14;
        ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(cb.x, cb.y, cb.w, 2);
      }

      // Render falling debris
      s.fallingPieces.forEach((fp) => {
        ctx.save();
        ctx.translate(fp.x + fp.w / 2, fp.y + fp.h / 2);
        ctx.rotate(fp.rot);
        ctx.fillStyle = fp.color;
        ctx.fillRect(-fp.w / 2, -fp.h / 2, fp.w, fp.h);
        ctx.restore();
      });

      ctx.restore();

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, isPaused]);

  return (
    <div
      onClick={placeBlock}
      className="relative w-full h-full flex items-center justify-center bg-[#0f0c1b] cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] object-contain pointer-events-none"
      />

      {/* Combo text flash */}
      {comboText && (
        <div className="absolute top-16 text-center animate-bounce pointer-events-none">
          <span className="font-arcade text-2xl font-black text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
            {comboText}
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in cursor-default">
          <div className="w-16 h-16 rounded-2xl bg-pink-600/20 border border-pink-500/50 flex items-center justify-center text-pink-400 mb-3 shadow-[0_0_20px_rgba(236,72,153,0.4)]">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            STACK MASTER
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Empilez les blocs mobiles avec une précision chirurgicale. Touchez ou appuyez sur Espace pour déposer chaque étage !
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(236,72,153,0.6)] active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>COMMENCER</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in cursor-default">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">CHUTE DU SOMMET</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">TOUR EFFONDRÉE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">ÉTAGES EMPILÉS</span>
            <span className="font-mono-code text-3xl font-extrabold text-pink-400">{finalScore}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startGame();
            }}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RECONSTRUIRE</span>
          </button>
        </div>
      )}

      {/* Touch prompt */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 text-center pointer-events-none md:hidden">
          <span className="px-3 py-1 rounded-full bg-black/60 text-slate-400 text-xs font-mono-code">
            Touchez l'écran pour déposer le bloc
          </span>
        </div>
      )}
    </div>
  );
};
