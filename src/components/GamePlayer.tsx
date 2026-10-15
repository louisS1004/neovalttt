import React, { useState, useEffect, useRef } from 'react';
import { GameMetadata } from '../types/game';
import { GAMES_CATALOG } from '../data/games';
import { GameCard } from './GameCard';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RotateCcw,
  Pause,
  Play,
  Heart,
  Trophy,
  Volume2,
  VolumeX,
  Keyboard,
  Smartphone,
  Share2
} from 'lucide-react';
import {
  getGameScore,
  isGameFavorite,
  toggleFavoriteGame,
  getStoredSettings,
  saveSettings
} from '../utils/storage';
import { soundManager } from '../utils/audio';

// Import all 20 game implementations
import { NeonDodgeGame } from '../games/NeonDodge';
import { AstroBlasterGame } from '../games/AstroBlaster';
import { StackMasterGame } from '../games/StackMaster';
import { ColorSwitchRushGame } from '../games/ColorSwitchRush';
import { PulseRunnerGame } from '../games/PulseRunner';

import { CubeQuestGame } from '../games/CubeQuest';
import { MiniDungeonGame } from '../games/MiniDungeon';
import { SkyJumperGame } from '../games/SkyJumper';
import { PixelEscapeGame } from '../games/PixelEscape';
import { GravityFlipGame } from '../games/GravityFlip';

import { MicroRacersGame } from '../games/MicroRacers';
import { DriftCityMiniGame } from '../games/DriftCityMini';
import { RocketBikeGame } from '../games/RocketBike';

import { BlockMergeGame } from '../games/BlockMerge';
import { LaserLogicGame } from '../games/LaserLogic';
import { MemoryGridGame } from '../games/MemoryGrid';
import { NumberRushGame } from '../games/NumberRush';

import { OrbitSurvivorGame } from '../games/OrbitSurvivor';
import { MeteorBreakerGame } from '../games/MeteorBreaker';
import { EndlessTunnelGame } from '../games/EndlessTunnel';

interface GamePlayerProps {
  game: GameMetadata;
  onBack: () => void;
  onSelectGame: (id: string) => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ game, onBack, onSelectGame }) => {
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [restartKey, setRestartKey] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFavorite(isGameFavorite(game.id));
    const scoreRec = getGameScore(game.id);
    setHighScore(scoreRec.highScore);
    setCurrentScore(0);
    setIsPaused(false);
    setRestartKey(0);

    const settings = getStoredSettings();
    setIsMuted(settings.muted);

    // Scroll to top when game opened
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [game.id]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    soundManager.click();
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleFavoriteToggle = () => {
    const newFav = toggleFavoriteGame(game.id);
    setIsFavorite(newFav);
    soundManager.click();
    window.dispatchEvent(new Event('storage'));
  };

  const handleRestart = () => {
    soundManager.click();
    setIsPaused(false);
    setRestartKey((prev) => prev + 1);
  };

  const handleTogglePause = () => {
    soundManager.click();
    setIsPaused((prev) => !prev);
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    saveSettings({ muted: nextMuted });
    if (!nextMuted) soundManager.click();
  };

  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const handleShare = () => {
    soundManager.click();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Similar games (same category or popular, excluding current)
  const similarGames = GAMES_CATALOG.filter(
    (g) => g.id !== game.id && (g.category === game.category || g.featured)
  ).slice(0, 4);

  // Render specific game component
  const renderGameInstance = () => {
    const commonProps = {
      isPaused,
      onScoreUpdate: handleScoreUpdate,
      onRestart: handleRestart,
      restartKey,
    };

    switch (game.id) {
      case 'neon-dodge':
        return <NeonDodgeGame {...commonProps} />;
      case 'astro-blaster':
        return <AstroBlasterGame {...commonProps} />;
      case 'stack-master':
        return <StackMasterGame {...commonProps} />;
      case 'color-switch-rush':
        return <ColorSwitchRushGame {...commonProps} />;
      case 'pulse-runner':
        return <PulseRunnerGame {...commonProps} />;

      case 'cube-quest':
        return <CubeQuestGame {...commonProps} />;
      case 'mini-dungeon':
        return <MiniDungeonGame {...commonProps} />;
      case 'sky-jumper':
        return <SkyJumperGame {...commonProps} />;
      case 'pixel-escape':
        return <PixelEscapeGame {...commonProps} />;
      case 'gravity-flip':
        return <GravityFlipGame {...commonProps} />;

      case 'micro-racers':
        return <MicroRacersGame {...commonProps} />;
      case 'drift-city-mini':
        return <DriftCityMiniGame {...commonProps} />;
      case 'rocket-bike':
        return <RocketBikeGame {...commonProps} />;

      case 'block-merge':
        return <BlockMergeGame {...commonProps} />;
      case 'laser-logic':
        return <LaserLogicGame {...commonProps} />;
      case 'memory-grid':
        return <MemoryGridGame {...commonProps} />;
      case 'number-rush':
        return <NumberRushGame {...commonProps} />;

      case 'orbit-survivor':
        return <OrbitSurvivorGame {...commonProps} />;
      case 'meteor-breaker':
        return <MeteorBreakerGame {...commonProps} />;
      case 'endless-tunnel':
        return <EndlessTunnelGame {...commonProps} />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Jeu en cours de chargement...
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Bar with Back, Game Title and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.click();
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Catalogue</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-arcade text-xl sm:text-2xl font-bold text-white tracking-wide">
                {game.title}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30 font-medium">
                {game.categoryLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">{game.shortDesc}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Favorite button */}
          <button
            onClick={handleFavoriteToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-[#151729] border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{isFavorite ? 'Favori' : 'Ajouter'}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-[#151729] border border-slate-700/80 text-slate-300 hover:text-white transition-all relative"
            title="Copier le lien"
          >
            <Share2 className="w-4 h-4" />
            {copiedNotification && (
              <span className="absolute -top-8 right-0 px-2 py-1 bg-purple-600 text-white text-[10px] rounded shadow-lg whitespace-nowrap animate-in fade-in">
                Lien copié !
              </span>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleMuteToggle}
            className="p-2 rounded-xl bg-[#151729] border border-slate-700/80 text-slate-300 hover:text-white transition-all"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Game Screen Canvas Container */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden bg-[#070810] border-2 border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.2)] flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'aspect-[16/10] sm:aspect-[16/9] max-h-[640px]'
        }`}
      >
        {/* In-game Overlay Control Toolbar */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
          {/* Live Score Pill */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-slate-700/80 text-xs font-mono-code font-bold text-slate-200 flex items-center gap-1.5 shadow-md">
              <span className="text-slate-400 uppercase text-[10px]">Score :</span>
              <span className="text-cyan-300 text-sm">{currentScore}</span>
            </div>

            {highScore > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-amber-500/40 text-xs font-mono-code font-bold text-amber-300 flex items-center gap-1 shadow-md">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{highScore}</span>
              </div>
            )}
          </div>

          {/* Quick HUD controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={handleTogglePause}
              aria-label={isPaused ? 'Reprendre' : 'Pause'}
              className="p-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
              title={isPaused ? 'Reprendre' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={handleRestart}
              aria-label="Recommencer"
              className="p-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
              title="Recommencer la partie"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="p-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Game Canvas Area */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
          {renderGameInstance()}
        </div>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-5 animate-in fade-in">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest font-mono-code text-cyan-400">JEU EN PAUSE</span>
              <h2 className="font-arcade text-3xl font-black text-white">{game.title}</h2>
              <p className="text-xs text-slate-400">Score actuel : {currentScore} • Meilleur : {highScore}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleTogglePause}
                className="w-44 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.5)] active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Reprendre
              </button>

              <button
                onClick={handleRestart}
                className="w-44 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </button>

              <button
                onClick={onBack}
                className="w-44 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 border border-slate-800 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Quitter vers le catalogue
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Info & Instructions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Keyboard instructions */}
        <div className="p-4 rounded-2xl bg-[#121424] border border-slate-800">
          <div className="flex items-center gap-2 mb-3 text-purple-300 font-bold text-sm">
            <Keyboard className="w-4 h-4" />
            <span>Commandes Clavier</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 font-mono-code">
            {game.instructions.keyboard.map((inst, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <span>{inst}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile touch instructions */}
        <div className="p-4 rounded-2xl bg-[#121424] border border-slate-800">
          <div className="flex items-center gap-2 mb-3 text-cyan-300 font-bold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>Commandes Tactiles</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono-code">
            {game.instructions.mobile}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Des boutons virtuels s’affichent directement sur l’écran pour les appareils tactiles.
          </p>
        </div>

        {/* Game Info & Description */}
        <div className="p-4 rounded-2xl bg-[#121424] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-arcade font-bold text-slate-200 uppercase tracking-wider">
              À Propos du Jeu
            </span>
            <span className="text-xs text-amber-400 font-mono-code">★ {game.rating.toFixed(1)} / 5</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {game.description}
          </p>
        </div>

      </div>

      {/* Similar Games Section */}
      <div className="pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-arcade text-lg sm:text-xl font-bold text-white tracking-wide">
            JEUX SIMILAIRES À DÉCOUVRIR
          </h2>
          <button
            onClick={onBack}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
          >
            Voir toute la collection →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {similarGames.map((simGame) => (
            <GameCard
              key={simGame.id}
              game={simGame}
              onSelect={onSelectGame}
              compact
            />
          ))}
        </div>
      </div>

    </div>
  );
};
