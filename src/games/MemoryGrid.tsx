import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Brain, Trophy } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

const PADS = [
  { id: 0, label: 'CYAN', color: 'bg-cyan-500', activeColor: 'bg-cyan-300 shadow-[0_0_35px_rgba(6,182,212,1)]', key: '1' },
  { id: 1, label: 'ORANGE', color: 'bg-amber-500', activeColor: 'bg-amber-300 shadow-[0_0_35px_rgba(245,158,11,1)]', key: '2' },
  { id: 2, label: 'ROSE', color: 'bg-rose-500', activeColor: 'bg-rose-300 shadow-[0_0_35px_rgba(244,63,94,1)]', key: '3' },
  { id: 3, label: 'VIOLET', color: 'bg-purple-600', activeColor: 'bg-purple-300 shadow-[0_0_35px_rgba(168,85,247,1)]', key: '4' },
];

export const MemoryGridGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState<number>(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [isShowingSequence, setIsShowingSequence] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setScore(0);
    onScoreUpdate(0);
    setGameState('playing');
    const firstSeq = [Math.floor(Math.random() * 4)];
    setSequence(firstSeq);
    setPlayerStep(0);
    playSequence(firstSeq);
  };

  useEffect(() => {
    if (gameState === 'playing') startGame();
  }, [restartKey]);

  const playSequence = (seq: number[]) => {
    setIsShowingSequence(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= seq.length) {
        clearInterval(interval);
        setActivePad(null);
        setIsShowingSequence(false);
        setPlayerStep(0);
        return;
      }
      const padId = seq[i];
      setActivePad(padId);
      soundManager.combo(padId + 1);
      setTimeout(() => {
        setActivePad(null);
      }, 350);
      i++;
    }, 600);
  };

  const handlePadPress = (padId: number) => {
    if (gameState !== 'playing' || isShowingSequence || isPaused) return;

    // Flash pressed pad
    setActivePad(padId);
    soundManager.combo(padId + 1);
    setTimeout(() => setActivePad(null), 200);

    // Verify against sequence
    if (padId === sequence[playerStep]) {
      const nextStep = playerStep + 1;
      if (nextStep === sequence.length) {
        // Round completed!
        const newScore = score + sequence.length * 100;
        setScore(newScore);
        onScoreUpdate(newScore);
        soundManager.coin();

        // Add next step to sequence
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        setTimeout(() => {
          playSequence(nextSeq);
        }, 800);
      } else {
        setPlayerStep(nextStep);
      }
    } else {
      // Mistake: Game Over!
      soundManager.hit();
      soundManager.gameover();
      const res = saveGameScore('memory-grid', score);
      reportGameActivity('memory-grid', score);
      setIsHighScore(res.isNewHighScore);
      setGameState('gameover');
    }
  };

  // Keyboard shortcut listener (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Digit1', 'Numpad1'].includes(e.code)) handlePadPress(0);
      if (['Digit2', 'Numpad2'].includes(e.code)) handlePadPress(1);
      if (['Digit3', 'Numpad3'].includes(e.code)) handlePadPress(2);
      if (['Digit4', 'Numpad4'].includes(e.code)) handlePadPress(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isShowingSequence, sequence, playerStep, score, isPaused]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#0d0914] p-4 select-none">
      
      {/* Round HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-xs font-arcade font-bold text-purple-300">
            SÉQUENCE : {sequence.length} BLOCS
          </span>
          <span className="px-3 py-1 rounded-xl bg-black/70 border border-slate-700 text-xs font-mono-code font-bold text-cyan-300">
            {isShowingSequence ? 'ÉCOUTEZ...' : 'À VOUS DE JOUER !'}
          </span>
        </div>
      )}

      {/* 4 Cyber Memory Pads */}
      <div className="w-full max-w-[320px] aspect-square grid grid-cols-2 gap-4 p-4 rounded-3xl bg-[#140f22] border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
        {PADS.map((pad) => {
          const isActive = activePad === pad.id;
          return (
            <button
              key={pad.id}
              onClick={() => handlePadPress(pad.id)}
              disabled={isShowingSequence}
              className={`rounded-2xl border-2 border-white/20 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
                isActive ? pad.activeColor : `${pad.color} opacity-75 hover:opacity-100`
              }`}
            >
              <span className="font-arcade text-lg sm:text-xl font-black text-white drop-shadow">
                {pad.label}
              </span>
              <span className="text-[11px] font-mono-code text-white/70">Touche {pad.key}</span>
            </button>
          );
        })}
      </div>

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Brain className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            MEMORY GRID
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Mémorisez la mélodie et la séquence lumineuse générée par les dalles cybernétiques, puis reproduisez-la sans la moindre erreur !
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>ACTIVER LA MÉMOIRE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">ERREUR DE SÉQUENCE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">MÉMOIRE PERDUE</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE DE MÉMOIRE</span>
            <span className="font-mono-code text-3xl font-extrabold text-amber-400">{score}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-purple-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOUVELLE SÉQUENCE</span>
          </button>
        </div>
      )}
    </div>
  );
};
