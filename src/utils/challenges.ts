import { DailyChallenge } from '../types/game';
import { incrementChallengesCompleted } from './storage';
import { soundManager } from './audio';

const CHALLENGES_STORAGE_KEY = 'neovalt_daily_challenges_v1';

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDailyChallenges(): DailyChallenge[] {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(CHALLENGES_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today && Array.isArray(data.challenges)) {
        return data.challenges;
      }
    }
  } catch {}

  // Generate deterministic challenges for today
  const challenges = generateDailyChallengesForDate(today);
  try {
    localStorage.setItem(
      CHALLENGES_STORAGE_KEY,
      JSON.stringify({ date: today, challenges })
    );
  } catch {}
  return challenges;
}

function generateDailyChallengesForDate(dateStr: string): DailyChallenge[] {
  // Hash the date to pick predictable daily challenges
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  return [
    {
      id: `challenge-1-${dateStr}`,
      gameId: 'neon-dodge',
      title: 'Maître de l’Esquive',
      description: 'Atteins 150 points dans Neon Dodge sans toucher un mur.',
      targetValue: 150,
      currentValue: 0,
      type: 'score',
      completed: false,
      rewardBadge: '⚡ Réflexe Cyber'
    },
    {
      id: `challenge-2-${dateStr}`,
      gameId: 'cube-quest',
      title: 'Explorateur de Cube',
      description: 'Collecte au moins 8 orbes d’énergie dans Cube Quest.',
      targetValue: 8,
      currentValue: 0,
      type: 'score',
      completed: false,
      rewardBadge: '💎 Pionnier 2D'
    },
    {
      id: `challenge-3-${dateStr}`,
      gameId: 'block-merge',
      title: 'Alchimiste de Blocs',
      description: 'Fusionne pour atteindre un score de 300 dans Block Merge.',
      targetValue: 300,
      currentValue: 0,
      type: 'score',
      completed: false,
      rewardBadge: '🧠 Cerveau Vif'
    },
    {
      id: `challenge-4-${dateStr}`,
      gameId: 'astro-blaster',
      title: 'As de l’Espace',
      description: 'Détruis 12 vaisseaux ennemis dans Astro Blaster.',
      targetValue: 12,
      currentValue: 0,
      type: 'score',
      completed: false,
      rewardBadge: '🚀 Pilote Stellaire'
    },
    {
      id: `challenge-5-${dateStr}`,
      gameId: 'all',
      title: 'Curiosité Arcade',
      description: 'Joue à au moins 4 jeux différents aujourd’hui.',
      targetValue: 4,
      currentValue: 0,
      type: 'games_played',
      completed: false,
      rewardBadge: '🎮 Gamer Polyvalent'
    }
  ];
}

export function reportGameActivity(gameId: string, score: number, meta?: { enemiesDestroyed?: number; orbsCollected?: number }): { completedAnyNew: boolean; completedChallenges: DailyChallenge[] } {
  const challenges = getDailyChallenges();
  const today = getTodayKey();
  let changed = false;
  let completedAnyNew = false;
  const newlyCompleted: DailyChallenge[] = [];

  // Track unique games played today
  const playedKey = `neovalt_played_${today}`;
  try {
    const rawPlayed = localStorage.getItem(playedKey);
    const playedSet = new Set(rawPlayed ? JSON.parse(rawPlayed) : []);
    playedSet.add(gameId);
    localStorage.setItem(playedKey, JSON.stringify(Array.from(playedSet)));

    // Update games_played challenge
    const uniqueCount = playedSet.size;
    challenges.forEach((c) => {
      if (c.type === 'games_played') {
        c.currentValue = Math.min(c.targetValue, uniqueCount);
        if (!c.completed && c.currentValue >= c.targetValue) {
          c.completed = true;
          completedAnyNew = true;
          newlyCompleted.push(c);
          changed = true;
        }
      }
    });
  } catch {}

  // Update specific game challenges
  challenges.forEach((c) => {
    if (c.completed) return;
    if (c.gameId === gameId) {
      if (c.type === 'score') {
        const valToTest = (gameId === 'cube-quest' && meta?.orbsCollected !== undefined) 
          ? meta.orbsCollected 
          : (gameId === 'astro-blaster' && meta?.enemiesDestroyed !== undefined)
          ? meta.enemiesDestroyed
          : score;

        if (valToTest > c.currentValue) {
          c.currentValue = Math.min(c.targetValue, valToTest);
          changed = true;
        }

        if (c.currentValue >= c.targetValue) {
          c.completed = true;
          completedAnyNew = true;
          newlyCompleted.push(c);
          changed = true;
        }
      }
    }
  });

  if (changed) {
    try {
      localStorage.setItem(
        CHALLENGES_STORAGE_KEY,
        JSON.stringify({ date: today, challenges })
      );
    } catch {}
  }

  if (completedAnyNew) {
    incrementChallengesCompleted();
    soundManager.win();
  }

  return { completedAnyNew, completedChallenges: newlyCompleted };
}
