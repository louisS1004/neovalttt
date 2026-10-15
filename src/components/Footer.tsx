import React from 'react';
import { Gamepad2, ShieldCheck, Zap, RefreshCcw } from 'lucide-react';
import { resetAllData } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface FooterProps {
  onSelectCategory: (cat: string) => void;
  onNavigateHome: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onNavigateHome }) => {
  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser vos meilleurs scores locaux et favoris ?')) {
      resetAllData();
      soundManager.click();
      window.location.reload();
    }
  };

  return (
    <footer className="w-full bg-[#090a12] border-t border-slate-800/80 mt-16 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 p-0.5">
                <div className="w-full h-full bg-[#0c0d18] rounded-[6px] flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="font-arcade text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                NEOVALT ARCADE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Plateforme arcade moderne réunissant 20 jeux vidéo originaux conçus sur-mesure.
              Aucun téléchargement requis, zéro publicité invasive, exécution 100% fluide et respect total de votre vie privée.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> 100% Sauvegardes Locales
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Zap className="w-4 h-4" /> 0ms Latence Audio Web
              </span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-arcade text-slate-200 font-bold mb-3 tracking-wider text-xs uppercase">
              Catégories de Jeux
            </h4>
            <ul className="space-y-1.5 text-xs">
              {['arcade', 'platform', 'racing', 'puzzle', 'survival'].map((cat) => {
                const labels: Record<string, string> = {
                  arcade: 'Arcade Réflexes (5)',
                  platform: 'Plateforme 2D (5)',
                  racing: 'Course & Pilotage (3)',
                  puzzle: 'Puzzle & Réflexion (4)',
                  survival: 'Survie & Score (3)',
                };
                return (
                  <li key={cat}>
                    <button
                      onClick={() => {
                        soundManager.click();
                        onSelectCategory(cat);
                      }}
                      className="hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      {labels[cat]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Controls & Options */}
          <div>
            <h4 className="font-arcade text-slate-200 font-bold mb-3 tracking-wider text-xs uppercase">
              Commandes & Données
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <span className="text-slate-300 font-semibold">Clavier :</span> Flèches ou ZQSD + Espace
              </li>
              <li>
                <span className="text-slate-300 font-semibold">Tactile :</span> Boutons & swipes intégrés
              </li>
              <li className="pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser les scores locaux</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} NEOVALT Arcade — Tous droits réservés. Conçu pour le jeu instantané.</p>
          <p className="font-mono-code text-[11px] text-purple-400/80">
            20 Jeux Originaux Développés • Canvas & Web Audio
          </p>
        </div>
      </div>
    </footer>
  );
};
