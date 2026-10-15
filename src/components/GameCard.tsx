import React, { useState, useEffect } from 'react';
import { GameMetadata } from '../types/game';
import { GameThumbnail } from './GameThumbnail';
import { Play, Heart, Trophy, Star } from 'lucide-react';
import { getGameScore, isGameFavorite, toggleFavoriteGame } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface GameCardProps {
  game: GameMetadata;
  onSelect: (gameId: string) => void;
  compact?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect, compact = false }) => {
  const [favorite, setFavorite] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);

  useEffect(() => {
    setFavorite(isGameFavorite(game.id));
    const scoreRec = getGameScore(game.id);
    setHighScore(scoreRec.highScore);
  }, [game.id]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFav = toggleFavoriteGame(game.id);
    setFavorite(newFav);
    soundManager.click();
    window.dispatchEvent(new Event('storage'));
  };

  const handleCardClick = () => {
    soundManager.click();
    onSelect(game.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl bg-[#111322] border border-slate-800/80 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/60 hover:shadow-[0_10px_25px_-5px_rgba(168,85,247,0.3)] flex flex-col ${
        compact ? 'h-56' : 'h-72'
      }`}
    >
      {/* Thumbnail with overlay */}
      <div className="relative overflow-hidden flex-1 bg-slate-950">
        <GameThumbnail
          gameId={game.id}
          badge={game.badge}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Favorite Star Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
            favorite
              ? 'bg-rose-500/90 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
              : 'bg-black/50 text-slate-300 hover:text-rose-400 hover:bg-black/70'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-white' : ''}`} />
        </button>

        {/* High Score Badge */}
        {highScore > 0 && (
          <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur border border-amber-500/40 text-[11px] font-mono-code font-bold text-amber-300 flex items-center gap-1 shadow-sm">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Record : {highScore}</span>
          </div>
        )}

        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 bg-purple-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.8)] transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3.5 bg-[#121424] flex flex-col justify-between border-t border-slate-800/60">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-arcade font-bold text-sm sm:text-base text-white truncate group-hover:text-cyan-300 transition-colors">
              {game.title}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono-code shrink-0">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{game.rating.toFixed(1)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 line-clamp-1 mb-2">
            {game.shortDesc}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 font-medium">
            {game.categoryLabel}
          </span>
          <span className="text-slate-400 font-mono-code flex items-center gap-1">
            <Play className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
            {(game.playsCountEstimate + (highScore > 0 ? 5 : 0)).toLocaleString()} parties
          </span>
        </div>
      </div>
    </div>
  );
};
