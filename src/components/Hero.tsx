import React from 'react';
import { Play, Sparkles, Trophy, Zap, Flame } from 'lucide-react';
import { GAMES_CATALOG } from '../data/games';
import { soundManager } from '../utils/audio';

interface HeroProps {
  onSelectGame: (gameId: string) => void;
  onOpenChallenges: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectGame, onOpenChallenges }) => {
  const featuredGame = GAMES_CATALOG.find((g) => g.id === 'neon-dodge') || GAMES_CATALOG[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16122e] via-[#0f1122] to-[#0a121e] border border-purple-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(168,85,247,0.15)] mb-10">
      
      {/* Background ambient neon orbs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Headline & CTA */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>PORTAIL OFFICIEL • 20 JEUX JOUABLES EN 1 CLIC</span>
          </div>

          <h1 className="font-arcade text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-wide">
            L’ARCADE DU FUTUR, <br />
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
              DIRECTEMENT DANS LE NAVIGATEUR.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            Découvrez une collection originale de 20 jeux indépendants ultra-rapides. Pas d’installation, pas d’attente. Esquivez, pilotez, sautez et battez vos records dès maintenant !
          </p>

          {/* Quick CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                soundManager.click();
                onSelectGame(featuredGame.id);
              }}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-arcade font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_28px_rgba(168,85,247,0.8)] transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>LANCER {featuredGame.title.toUpperCase()}</span>
            </button>

            <button
              onClick={() => {
                soundManager.click();
                onOpenChallenges();
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1a1d36] hover:bg-[#222646] border border-amber-500/40 text-amber-300 font-semibold text-xs sm:text-sm transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Voir les 5 Défis du Jour</span>
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 max-w-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">Chargement 0ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">20 Jeux Originaux</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">Scores Sauvegardés</span>
            </div>
          </div>
        </div>

        {/* Right Column: Featured Banner Card */}
        <div className="lg:col-span-5">
          <div
            onClick={() => {
              soundManager.click();
              onSelectGame('neon-dodge');
            }}
            className="group relative rounded-2xl bg-[#0c0d18] border-2 border-purple-500/50 p-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-cyan-400/80 transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono-code font-bold text-cyan-300 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Coup de Projecteur
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30">
                Arcade Réflexes
              </span>
            </div>

            {/* Mini preview canvas art */}
            <div className="h-44 rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800/80">
              <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                <rect width="200" height="120" fill="#0b0d1b" />
                <line x1="0" y1="60" x2="200" y2="60" stroke="#252844" strokeWidth="1" strokeDasharray="4 4" />
                {/* Laser obstacles */}
                <rect x="50" y="0" width="14" height="60" rx="3" fill="#06b6d4" opacity="0.8" />
                <rect x="120" y="60" width="14" height="60" rx="3" fill="#ec4899" opacity="0.8" />
                {/* Player jet */}
                <polygon points="35,60 15,48 22,60 15,72" fill="#a855f7" />
                <circle cx="23" cy="60" r="3" fill="#ffffff" />
                <line x1="5" y1="60" x2="15" y2="60" stroke="#ec4899" strokeWidth="3" />
              </svg>

              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  JOUER À NEON DODGE
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <h3 className="font-arcade text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Neon Dodge
                </h3>
                <p className="text-xs text-slate-400">Esquivez les lasers à une vitesse croissante</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono-code text-xs font-bold">
                TOP 1
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
