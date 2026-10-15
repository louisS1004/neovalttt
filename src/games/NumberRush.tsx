import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Calculator, Flame } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveGameScore } from '../utils/storage';
import { reportGameActivity } from '../utils/challenges';

interface GameProps {
  isPaused: boolean;
  onScoreUpdate: (score: number) => void;
  onRestart: () => void;
  restartKey: number;
}

interface Question {
  prompt: string;
  correctAnswer: number;
  options: number[];
}

export const NumberRushGame: React.FC<GameProps> = ({ isPaused, onScoreUpdate, onRestart, restartKey }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(100); // 0 to 100%
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isHighScore, setIsHighScore] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const roundDurationRef = useRef<number>(3.8); // seconds

  const generateQuestion = (round: number): Question => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * (round > 5 ? 3 : 2))];
    let a = 0,
      b = 0,
      ans = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * (15 + round * 2)) + 3;
      b = Math.floor(Math.random() * (15 + round * 2)) + 3;
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * (25 + round * 2)) + 10;
      b = Math.floor(Math.random() * (a - 4)) + 2;
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      ans = a * b;
    }

    const wrong1 = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
    const wrong2 = ans + (Math.random() > 0.5 ? 10 : -10);
    const wrong3 = ans + (Math.random() > 0.5 ? 2 : -2);

    const set = new Set([ans, wrong1, wrong2, wrong3]);
    while (set.size < 4) {
      set.add(ans + Math.floor(Math.random() * 15) - 7);
    }

    const options = Array.from(set).sort(() => Math.random() - 0.5);
    return {
      prompt: `${a} ${op === '*' ? '×' : op} ${b} = ?`,
      correctAnswer: ans,
      options,
    };
  };

  const nextRound = (currentStreak: number, currentScore: number) => {
    const q = generateQuestion(currentStreak);
    setCurrentQ(q);
    setTimeLeft(100);

    // Duration decreases with streak
    roundDurationRef.current = Math.max(1.8, 3.8 - currentStreak * 0.12);
  };

  const startGame = () => {
    soundManager.click();
    soundManager.powerup();
    setScore(0);
    setStreak(0);
    setGameState('playing');
    onScoreUpdate(0);
    nextRound(0, 0);
  };

  useEffect(() => {
    if (gameState === 'playing') startGame();
  }, [restartKey]);

  // Timer interval
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;

    const interval = 50; // ms
    const step = (100 / (roundDurationRef.current * 1000)) * interval;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= step) {
          // Timeout!
          handleGameOver();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, isPaused, currentQ]);

  const handleAnswer = (choice: number) => {
    if (gameState !== 'playing' || isPaused || !currentQ) return;

    if (choice === currentQ.correctAnswer) {
      soundManager.coin();
      const gained = Math.round(100 + timeLeft * 1.5 + streak * 25);
      const newScore = score + gained;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      onScoreUpdate(newScore);
      nextRound(newStreak, newScore);
    } else {
      soundManager.hit();
      handleGameOver();
    }
  };

  const handleGameOver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    soundManager.gameover();
    const res = saveGameScore('number-rush', score);
    reportGameActivity('number-rush', score);
    setIsHighScore(res.isNewHighScore);
    setGameState('gameover');
  };

  // Keyboard 1, 2, 3, 4 selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQ) return;
      if (['Digit1', 'Numpad1'].includes(e.code)) handleAnswer(currentQ.options[0]);
      if (['Digit2', 'Numpad2'].includes(e.code)) handleAnswer(currentQ.options[1]);
      if (['Digit3', 'Numpad3'].includes(e.code)) handleAnswer(currentQ.options[2]);
      if (['Digit4', 'Numpad4'].includes(e.code)) handleAnswer(currentQ.options[3]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, gameState, isPaused, score, streak]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#070e1b] p-6 select-none">
      
      {/* Live Streak HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-500/40 text-xs font-arcade font-bold text-blue-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-blue-400" />
            SÉRIE : {streak}
          </span>
        </div>
      )}

      {currentQ && gameState === 'playing' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          
          {/* Equation Display Box */}
          <div className="w-full py-8 px-6 rounded-3xl bg-[#11192e] border-2 border-blue-500/50 shadow-[0_0_35px_rgba(59,130,246,0.3)] text-center">
            <span className="font-arcade text-4xl sm:text-5xl font-black text-white tracking-wider">
              {currentQ.prompt}
            </span>
          </div>

          {/* Time Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                timeLeft > 40 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-rose-500 animate-pulse'
              }`}
              style={{ width: `${timeLeft}%` }}
            />
          </div>

          {/* 4 Choices Buttons */}
          <div className="w-full grid grid-cols-2 gap-3.5">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className="py-4 px-4 rounded-2xl bg-[#131e36] hover:bg-blue-600 border border-blue-500/40 text-white font-arcade font-bold text-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-between"
              >
                <span className="text-xs text-blue-300/80 font-mono-code">[{idx + 1}]</span>
                <span className="flex-1 text-center">{opt}</span>
              </button>
            ))}
          </div>

        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Calculator className="w-8 h-8" />
          </div>
          <h2 className="font-arcade text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
            NUMBER RUSH
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Sprint mental ultra-rapide ! Résolvez les équations avant que la jauge de temps ne s’éteigne. Utilisez 1, 2, 3, 4 au clavier ou touchez la bonne réponse.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-arcade font-bold text-base shadow-[0_0_25px_rgba(59,130,246,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>COMMENCER LE SPRINT</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <span className="text-xs font-mono-code uppercase tracking-widest text-rose-400 mb-1">TEMPS ÉCOULÉ OU FAUTE</span>
          <h2 className="font-arcade text-4xl font-black text-white mb-2">FIN DU CALCUL</h2>
          <div className="my-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">SCORE TOTAL</span>
            <span className="font-mono-code text-3xl font-extrabold text-blue-400">{score}</span>
            {isHighScore && (
              <span className="block text-xs font-bold text-amber-400 mt-1 animate-bounce">
                ★ NOUVEAU RECORD PERSONNEL ! ★
              </span>
            )}
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RECALCULER</span>
          </button>
        </div>
      )}

    </div>
  );
};
