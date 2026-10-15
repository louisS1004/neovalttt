import React, { useState, useMemo, useEffect } from 'react';
import { GAMES_CATALOG } from './data/games';
import { GameMetadata, GameCategory } from './types/game';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GameCard } from './components/GameCard';
import { GamePlayer } from './components/GamePlayer';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { Footer } from './components/Footer';
import {
  Gamepad2,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  Heart,
  SlidersHorizontal,
  Search,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getFavoriteGameIds, getStoredScores } from './utils/storage';
import { soundManager } from './utils/audio';

type ViewMode = 'home' | 'catalog' | 'favorites' | 'game';
type SortOption = 'popular' | 'new' | 'alpha' | 'score';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isChallengesOpen, setIsChallengesOpen] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [highScores, setHighScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const updateLocalData = () => {
      setFavoriteIds(getFavoriteGameIds());
      const stored = getStoredScores();
      const mapped: Record<string, number> = {};
      Object.keys(stored).forEach((k) => {
        mapped[k] = stored[k].highScore;
      });
      setHighScores(mapped);
    };

    updateLocalData();
    window.addEventListener('storage', updateLocalData);
    return () => window.removeEventListener('storage', updateLocalData);
  }, [currentView, activeGameId]);

  // Active game metadata object
  const activeGame = useMemo(() => {
    if (!activeGameId) return null;
    return GAMES_CATALOG.find((g) => g.id === activeGameId) || null;
  }, [activeGameId]);

  // Filtered & Sorted Games for Catalog/Favorites view
  const filteredGames = useMemo(() => {
    let list = [...GAMES_CATALOG];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.categoryLabel.toLowerCase().includes(q) ||
          g.shortDesc.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((g) => g.category === selectedCategory);
    }

    // Favorites view filter
    if (currentView === 'favorites') {
      list = list.filter((g) => favoriteIds.includes(g.id));
    }

    // Sort order
    if (sortOption === 'popular') {
      list.sort((a, b) => b.playsCountEstimate - a.playsCountEstimate);
    } else if (sortOption === 'new') {
      list.sort((a, b) => (b.badge === 'Nouveau' ? 1 : 0) - (a.badge === 'Nouveau' ? 1 : 0));
    } else if (sortOption === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'score') {
      list.sort((a, b) => (highScores[b.id] || 0) - (highScores[a.id] || 0));
    }

    return list;
  }, [searchQuery, selectedCategory, sortOption, currentView, favoriteIds, highScores]);

  // Section categories for Home view
  const popularGames = useMemo(
    () => GAMES_CATALOG.filter((g) => g.badge === 'Populaire' || g.featured).slice(0, 8),
    []
  );

  const quickPlayGames = useMemo(
    () => GAMES_CATALOG.filter((g) => g.badge === 'Rapide' || g.category === 'arcade').slice(0, 4),
    []
  );

  const newGames = useMemo(
    () => GAMES_CATALOG.filter((g) => g.badge === 'Nouveau' || g.badge === 'Défi').slice(0, 4),
    []
  );

  // Handlers
  const handleSelectGame = (gameId: string) => {
    setActiveGameId(gameId);
    setCurrentView('game');
  };

  const handleBackToCatalog = () => {
    setCurrentView('home');
    setActiveGameId(null);
  };

  const handleSelectCategoryFromFooter = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categoriesList: { id: string; label: string; count: number }[] = [
    { id: 'all', label: 'Tous les Jeux', count: GAMES_CATALOG.length },
    { id: 'arcade', label: 'Arcade Réflexes', count: 5 },
    { id: 'platform', label: 'Plateforme 2D', count: 5 },
    { id: 'racing', label: 'Course & Pilotage', count: 3 },
    { id: 'puzzle', label: 'Puzzle & Réflexion', count: 4 },
    { id: 'survival', label: 'Survie & Score', count: 3 },
  ];

  return (
    <div className="min-h-screen bg-[#0b0c14] text-slate-100 flex flex-col antialiased arcade-grid-bg">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setActiveGameId(null);
        }}
        onOpenChallenges={() => setIsChallengesOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (currentView !== 'catalog' && q.trim().length > 0) {
            setCurrentView('catalog');
          }
        }}
        activeGameId={activeGameId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* GAME PLAYER VIEW */}
        {currentView === 'game' && activeGame && (
          <GamePlayer
            game={activeGame}
            onBack={handleBackToCatalog}
            onSelectGame={handleSelectGame}
          />
        )}

        {/* HOME VIEW */}
        {currentView === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* Hero spotlight */}
            <Hero
              onSelectGame={handleSelectGame}
              onOpenChallenges={() => setIsChallengesOpen(true)}
            />

            {/* Category quick tabs bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundManager.click();
                    setSelectedCategory(cat.id);
                    setCurrentView('catalog');
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap bg-[#121424] hover:bg-[#1b1f36] border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm"
                >
                  <span>{cat.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono-code">
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Popular Games Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-arcade text-lg sm:text-xl font-bold text-white tracking-wide">
                      JEUX POPULAIRES
                    </h2>
                    <p className="text-xs text-slate-400">Les titres les plus joués de la communauté</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.click();
                    setSelectedCategory('all');
                    setSortOption('popular');
                    setCurrentView('catalog');
                  }}
                  className="text-xs text-purple-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Explorer tout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {popularGames.map((game) => (
                  <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                ))}
              </div>
            </section>

            {/* Quick Play & New Releases Split Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Pour une partie rapide */}
              <section className="p-5 rounded-3xl bg-[#111322] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-arcade text-base sm:text-lg font-bold text-white">
                      POUR UNE PARTIE RAPIDE
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono-code text-cyan-300/80">&lt; 2 minutes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickPlayGames.map((game) => (
                    <GameCard key={game.id} game={game} onSelect={handleSelectGame} compact />
                  ))}
                </div>
              </section>

              {/* Nouveautés & Défis */}
              <section className="p-5 rounded-3xl bg-[#111322] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="font-arcade text-base sm:text-lg font-bold text-white">
                      NOUVEAUTÉS & DÉFIS
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono-code text-amber-300/80">Originaux</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newGames.map((game) => (
                    <GameCard key={game.id} game={game} onSelect={handleSelectGame} compact />
                  ))}
                </div>
              </section>

            </div>

            {/* Complete Catalog Grid Preview */}
            <section className="space-y-4 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-arcade text-lg sm:text-xl font-bold text-white tracking-wide">
                      COLLECTION COMPLÈTE (20 JEUX)
                    </h2>
                    <p className="text-xs text-slate-400">Jouez à tous les titres immédiatement sans attente</p>
                  </div>
                </div>

                <span className="text-xs text-slate-400 font-mono-code">20 jeux disponibles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {GAMES_CATALOG.map((game) => (
                  <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                ))}
              </div>
            </section>

          </div>
        )}

        {/* CATALOG / ALL GAMES VIEW & FAVORITES VIEW */}
        {(currentView === 'catalog' || currentView === 'favorites') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h1 className="font-arcade text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center gap-2.5">
                  {currentView === 'favorites' ? (
                    <>
                      <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                      MES JEUX FAVORIS
                    </>
                  ) : (
                    <>
                      <Layers className="w-6 h-6 text-purple-400" />
                      TOUS LES JEUX ARCADE
                    </>
                  )}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {filteredGames.length} {filteredGames.length <= 1 ? 'jeu trouvé' : 'jeux disponibles'}
                  {currentView === 'favorites' && ' dans votre sélection personnelle'}
                </p>
              </div>

              {/* Sort Dropdown & Quick Search */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#121424] px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Trier par :</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="popular" className="bg-[#121424] text-white">Les plus populaires</option>
                    <option value="new" className="bg-[#121424] text-white">Nouveautés</option>
                    <option value="alpha" className="bg-[#121424] text-white">Ordre alphabétique (A-Z)</option>
                    <option value="score" className="bg-[#121424] text-white">Meilleurs scores personnels</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Pills (Only in Catalog View) */}
            {currentView === 'catalog' && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        soundManager.click();
                        setSelectedCategory(cat.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                          : 'bg-[#121424] hover:bg-[#1b1f36] border border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code ${
                          isSelected ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Games Grid */}
            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 rounded-3xl bg-[#111322] border border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-arcade text-lg font-bold text-white">Aucun jeu ne correspond</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {currentView === 'favorites'
                    ? "Vous n'avez pas encore ajouté de jeux à vos favoris. Cliquez sur le cœur d'une carte pour l'enregistrer ici !"
                    : "Essayez de modifier votre recherche ou de réinitialiser le filtre de catégorie."}
                </p>
                {currentView === 'favorites' ? (
                  <button
                    onClick={() => {
                      soundManager.click();
                      setCurrentView('catalog');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-md"
                  >
                    Découvrir le catalogue
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundManager.click();
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Daily Challenges Modal */}
      <DailyChallengesModal
        isOpen={isChallengesOpen}
        onClose={() => setIsChallengesOpen(false)}
        onSelectGame={(gameId) => {
          setIsChallengesOpen(false);
          handleSelectGame(gameId);
        }}
      />

      {/* Footer */}
      <Footer
        onSelectCategory={handleSelectCategoryFromFooter}
        onNavigateHome={() => {
          soundManager.click();
          setCurrentView('home');
          setActiveGameId(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

    </div>
  );
}
