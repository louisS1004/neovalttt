import React, { useState, useEffect } from 'react';
import { Gamepad2, Heart, Trophy, Volume2, VolumeX, Sparkles, Search } from 'lucide-react';
import { getFavoriteGameIds, getStoredSettings, saveSettings } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface NavbarProps {
  currentView: 'home' | 'catalog' | 'favorites' | 'game';
  onNavigate: (view: 'home' | 'catalog' | 'favorites') => void;
  onOpenChallenges: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeGameId?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenChallenges,
  searchQuery,
  onSearchChange,
  activeGameId
}) => {
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const updateFavs = () => {
      setFavoriteCount(getFavoriteGameIds().length);
    };
    updateFavs();
    const settings = getStoredSettings();
    setIsMuted(settings.muted);

    window.addEventListener('storage', updateFavs);
    return () => window.removeEventListener('storage', updateFavs);
  }, [activeGameId, currentView]);

  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    saveSettings({ muted: newMuted });
    if (!newMuted) {
      soundManager.click();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0e1b]/95 backdrop-blur-md border-b border-purple-900/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <button 
          onClick={() => {
            soundManager.click();
            onNavigate('home');
          }}
          className="flex items-center gap-3 group text-left cursor-pointer transition-transform active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_22px_rgba(6,182,212,0.6)] transition-all">
            <div className="w-full h-full bg-[#0c0d18] rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-purple-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-arcade text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
                NEOVALT
              </span>
              <span className="text-[10px] px-1.5 py-0.2 uppercase font-mono-code font-bold rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                ARCADE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Portail 20 Jeux Originaux</p>
          </div>
        </button>

        {/* Global Search Bar (Desktop / Tablet) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un jeu (ex: Dodge, Blaster, Merge, Drift)..."
              className="w-full pl-10 pr-4 py-1.5 bg-[#141628] border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Nav Links & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              soundManager.click();
              onNavigate('home');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'home'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Accueil
          </button>

          <button
            onClick={() => {
              soundManager.click();
              onNavigate('catalog');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'catalog'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Tous les jeux
          </button>

          <button
            onClick={() => {
              soundManager.click();
              onNavigate('favorites');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'favorites'
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${favoriteCount > 0 ? 'text-rose-400 fill-rose-500/30' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Favoris</span>
            {favoriteCount > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-rose-500/80 text-white font-bold">
                {favoriteCount}
              </span>
            )}
          </button>

          {/* Daily Challenges Button */}
          <button
            onClick={() => {
              soundManager.click();
              onOpenChallenges();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all"
            title="Défis du Jour"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline font-bold">Défis</span>
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white hover:border-purple-500/50 transition-all"
            title={isMuted ? 'Activer les sons' : 'Couper les sons'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="md:hidden px-4 pb-2.5 pt-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un jeu..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#141628] border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </header>
  );
};
