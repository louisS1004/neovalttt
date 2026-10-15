import { GameScoreRecord, SoundSettings } from '../types/game';
import { setAudioMuted, setAudioVolume } from './audio';

const STORAGE_KEYS = {
  SCORES: 'neovalt_high_scores',
  FAVORITES: 'neovalt_favorites',
  SETTINGS: 'neovalt_settings',
  CHALLENGES: 'neovalt_daily_challenges',
  STATS: 'neovalt_global_stats',
};

// --- Scores ---
export function getStoredScores(): Record<string, GameScoreRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCORES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getGameScore(gameId: string): GameScoreRecord {
  const scores = getStoredScores();
  return scores[gameId] || { highScore: 0, lastPlayed: 0, timesPlayed: 0 };
}

export function saveGameScore(gameId: string, score: number): { isNewHighScore: boolean; highScore: number } {
  try {
    const scores = getStoredScores();
    const current = scores[gameId] || { highScore: 0, lastPlayed: 0, timesPlayed: 0 };
    const isNewHighScore = score > current.highScore;
    const newHighScore = Math.max(score, current.highScore);

    scores[gameId] = {
      highScore: newHighScore,
      lastPlayed: Date.now(),
      timesPlayed: current.timesPlayed + 1,
    };

    localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
    incrementTotalPlays();

    return { isNewHighScore, highScore: newHighScore };
  } catch {
    return { isNewHighScore: false, highScore: score };
  }
}

// --- Favorites ---
export function getFavoriteGameIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : ['neon-dodge', 'cube-quest', 'astro-blaster'];
  } catch {
    return ['neon-dodge', 'cube-quest', 'astro-blaster'];
  }
}

export function toggleFavoriteGame(gameId: string): boolean {
  try {
    const favs = getFavoriteGameIds();
    const index = favs.indexOf(gameId);
    let isFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
      isFav = false;
    } else {
      favs.push(gameId);
      isFav = true;
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return isFav;
  } catch {
    return false;
  }
}

export function isGameFavorite(gameId: string): boolean {
  return getFavoriteGameIds().includes(gameId);
}

// --- Sound Settings ---
export function getStoredSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = raw ? JSON.parse(raw) : { muted: false, volume: 0.7 };
    setAudioMuted(parsed.muted);
    setAudioVolume(parsed.volume);
    return parsed;
  } catch {
    return { muted: false, volume: 0.7 };
  }
}

export function saveSettings(settings: Partial<SoundSettings>): SoundSettings {
  try {
    const current = getStoredSettings();
    const updated = { ...current, ...settings };
    setAudioMuted(updated.muted);
    setAudioVolume(updated.volume);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return { muted: false, volume: 0.7 };
  }
}

// --- Global Stats ---
export function getGlobalStats(): { totalPlays: number; challengesCompleted: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    return raw ? JSON.parse(raw) : { totalPlays: 0, challengesCompleted: 0 };
  } catch {
    return { totalPlays: 0, challengesCompleted: 0 };
  }
}

function incrementTotalPlays() {
  try {
    const stats = getGlobalStats();
    stats.totalPlays += 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch {}
}

export function incrementChallengesCompleted() {
  try {
    const stats = getGlobalStats();
    stats.challengesCompleted += 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch {}
}

// Reset all local data
export function resetAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCORES);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.CHALLENGES);
    localStorage.removeItem(STORAGE_KEYS.STATS);
  } catch {}
}
