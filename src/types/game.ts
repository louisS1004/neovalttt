export type GameCategory = 'arcade' | 'platform' | 'racing' | 'puzzle' | 'survival';

export interface GameMetadata {
  id: string;
  title: string;
  category: GameCategory;
  categoryLabel: string;
  description: string;
  shortDesc: string;
  instructions: {
    keyboard: string[];
    mobile: string;
  };
  accentColor: string; // Tailwind color string, e.g. '#a855f7' or 'purple'
  glowColor: string;
  badge?: 'Nouveau' | 'Populaire' | 'Défi' | 'Rapide';
  rating: number; // e.g. 4.9
  playsCountEstimate: number;
  featured?: boolean;
}

export interface GameScoreRecord {
  highScore: number;
  lastPlayed: number;
  timesPlayed: number;
}

export interface DailyChallenge {
  id: string;
  gameId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  type: 'score' | 'survival_time' | 'games_played' | 'level';
  completed: boolean;
  rewardBadge: string;
}

export interface SoundSettings {
  muted: boolean;
  volume: number; // 0 to 1
}
