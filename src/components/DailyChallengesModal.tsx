import React, { useState, useEffect } from 'react';
import { Trophy, X, CheckCircle2, Sparkles, Play, Award } from 'lucide-react';
import { getDailyChallenges } from '../utils/challenges';
import { DailyChallenge } from '../types/game';
import { GAMES_CATALOG } from '../data/games';
import { soundManager } from '../utils/audio';

interface DailyChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameId: string) => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    if (isOpen) {
      setChallenges(getDailyChallenges());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111322] border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-arcade text-xl font-bold text-white flex items-center gap-2">
                DÉFIS DU JOUR
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Progression : {completedCount} / {challenges.length} complétés
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.click();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="my-4">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / challenges.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Challenge list */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {challenges.map((c) => {
            const targetGame = GAMES_CATALOG.find((g) => g.id === c.gameId);
            const percent = Math.min(100, Math.round((c.currentValue / c.targetValue) * 100));

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  c.completed
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-[#16182c] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-100">{c.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono-code border border-amber-500/20">
                        {c.rewardBadge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2.5">
                      {c.description}
                    </p>

                    {/* Progress details */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            c.completed ? 'bg-amber-400' : 'bg-purple-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono-code font-semibold text-slate-300">
                        {c.currentValue} / {c.targetValue}
                      </span>
                    </div>
                  </div>

                  {/* Action / Status */}
                  <div className="shrink-0 flex items-center">
                    {c.completed ? (
                      <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Réussi !</span>
                      </div>
                    ) : targetGame ? (
                      <button
                        onClick={() => {
                          soundManager.click();
                          onClose();
                          onSelectGame(targetGame.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Jouer</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-400 flex items-center gap-1 font-mono-code">
                        <Award className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Mis à jour chaque jour à minuit</span>
          <button
            onClick={() => {
              soundManager.click();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
