import React from 'react';

interface GameThumbnailProps {
  gameId: string;
  className?: string;
  badge?: string;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({ gameId, className = 'w-full h-44', badge }) => {
  // Render distinct custom graphic per game
  const renderArt = () => {
    switch (gameId) {
      case 'neon-dodge':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <defs>
              <linearGradient id="neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="200" height="120" fill="#0d0e1a" />
            <path d="M0,60 L200,60" stroke="#23263b" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M0,30 L200,30" stroke="#181a29" strokeWidth="1" />
            <path d="M0,90 L200,90" stroke="#181a29" strokeWidth="1" />
            {/* Obstacles */}
            <rect x="50" y="10" width="16" height="50" rx="3" fill="#06b6d4" opacity="0.85" filter="url(#neon-glow)" />
            <rect x="120" y="65" width="16" height="48" rx="3" fill="#f43f5e" opacity="0.85" filter="url(#neon-glow)" />
            <polygon points="175,20 190,45 160,45" fill="#eab308" filter="url(#neon-glow)" />
            {/* Player */}
            <polygon points="35,60 15,48 22,60 15,72" fill="url(#neon-grad)" filter="url(#neon-glow)" />
            <circle cx="23" cy="60" r="3" fill="#ffffff" />
            <line x1="5" y1="60" x2="15" y2="60" stroke="#ec4899" strokeWidth="3" opacity="0.7" />
          </svg>
        );

      case 'astro-blaster':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <defs>
              <linearGradient id="astro-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <rect width="200" height="120" fill="#070914" />
            {/* Stars */}
            <circle cx="20" cy="20" r="1.5" fill="#ffffff" opacity="0.7" />
            <circle cx="85" cy="15" r="1" fill="#ffffff" opacity="0.5" />
            <circle cx="160" cy="35" r="1.5" fill="#ffffff" opacity="0.8" />
            <circle cx="140" cy="90" r="1" fill="#ffffff" opacity="0.4" />
            <circle cx="45" cy="95" r="1" fill="#ffffff" opacity="0.6" />
            {/* Enemies */}
            <polygon points="60,25 70,38 50,38" fill="#f43f5e" />
            <polygon points="130,22 142,36 118,36" fill="#f43f5e" />
            {/* Player Ship */}
            <polygon points="100,75 114,105 100,98 86,105" fill="url(#astro-grad)" />
            <polygon points="100,82 106,96 100,93 94,96" fill="#ffffff" />
            {/* Lasers */}
            <line x1="94" y1="72" x2="94" y2="52" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="106" y1="72" x2="106" y2="52" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            {/* Explosion spark */}
            <circle cx="60" cy="30" r="8" fill="#fbbf24" opacity="0.6" />
          </svg>
        );

      case 'stack-master':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#0f0c1b" />
            <rect x="70" y="95" width="60" height="16" rx="2" fill="#ec4899" />
            <rect x="75" y="78" width="55" height="16" rx="2" fill="#f43f5e" />
            <rect x="80" y="61" width="50" height="16" rx="2" fill="#fb7185" />
            <rect x="82" y="44" width="46" height="16" rx="2" fill="#fda4af" />
            {/* Moving active block */}
            <rect x="92" y="27" width="46" height="16" rx="2" fill="#ffffff" />
            <line x1="100" y1="0" x2="100" y2="27" stroke="#ec4899" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        );

      case 'color-switch-rush':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#0a1215" />
            {/* Color ring */}
            <circle cx="100" cy="55" r="34" fill="none" stroke="#f43f5e" strokeWidth="8" strokeDasharray="53 160" />
            <circle cx="100" cy="55" r="34" fill="none" stroke="#06b6d4" strokeWidth="8" strokeDasharray="53 160" strokeDashoffset="-53" />
            <circle cx="100" cy="55" r="34" fill="none" stroke="#eab308" strokeWidth="8" strokeDasharray="53 160" strokeDashoffset="-106" />
            <circle cx="100" cy="55" r="34" fill="none" stroke="#a855f7" strokeWidth="8" strokeDasharray="53 160" strokeDashoffset="-159" />
            {/* Ball matching cyan segment */}
            <circle cx="100" cy="85" r="8" fill="#06b6d4" />
            <circle cx="98" cy="83" r="2.5" fill="#ffffff" />
          </svg>
        );

      case 'pulse-runner':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#130d1e" />
            {/* Perspective grid lines */}
            <line x1="100" y1="20" x2="20" y2="120" stroke="#a855f7" strokeWidth="1.5" opacity="0.6" />
            <line x1="100" y1="20" x2="70" y2="120" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
            <line x1="100" y1="20" x2="130" y2="120" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
            <line x1="100" y1="20" x2="180" y2="120" stroke="#a855f7" strokeWidth="1.5" opacity="0.6" />
            {/* Sun / horizon */}
            <circle cx="100" cy="20" r="16" fill="#f59e0b" opacity="0.8" />
            {/* Obstacle on right */}
            <rect x="125" y="65" width="20" height="15" rx="3" fill="#ef4444" opacity="0.9" />
            {/* Player */}
            <rect x="62" y="80" width="16" height="22" rx="4" fill="#06b6d4" />
            <line x1="70" y1="102" x2="70" y2="114" stroke="#06b6d4" strokeWidth="3" opacity="0.5" />
          </svg>
        );

      case 'cube-quest':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#0e0f21" />
            {/* Floating platforms */}
            <rect x="20" y="85" width="55" height="12" rx="3" fill="#3b4261" />
            <rect x="90" y="65" width="50" height="12" rx="3" fill="#3b4261" />
            <rect x="150" y="45" width="40" height="12" rx="3" fill="#8b5cf6" />
            {/* Spikes */}
            <polygon points="100,65 105,56 110,65" fill="#ef4444" />
            <polygon points="110,65 115,56 120,65" fill="#ef4444" />
            {/* Orbs */}
            <circle cx="115" cy="40" r="5" fill="#fbbf24" />
            <circle cx="170" cy="30" r="5" fill="#fbbf24" />
            {/* Player Cube */}
            <rect x="42" y="64" width="18" height="18" rx="3" fill="#8b5cf6" />
            <rect x="46" y="68" width="4" height="4" fill="#ffffff" />
            <rect x="52" y="68" width="4" height="4" fill="#ffffff" />
          </svg>
        );

      case 'mini-dungeon':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#120c14" />
            {/* Dungeon walls */}
            <rect x="15" y="15" width="170" height="90" fill="none" stroke="#374151" strokeWidth="4" />
            <line x1="80" y1="15" x2="80" y2="70" stroke="#374151" strokeWidth="4" />
            {/* Key */}
            <circle cx="45" cy="40" r="5" fill="#fbbf24" />
            <rect x="45" y="38" width="10" height="4" fill="#fbbf24" />
            {/* Chest */}
            <rect x="145" y="35" width="20" height="14" rx="2" fill="#d97706" />
            <rect x="145" y="40" width="20" height="2" fill="#fef08a" />
            {/* Knight/Hero */}
            <circle cx="50" cy="80" r="8" fill="#ef4444" />
            <rect x="48" y="80" width="4" height="10" fill="#ffffff" />
            {/* Torch light */}
            <circle cx="20" cy="20" r="4" fill="#f97316" opacity="0.8" />
          </svg>
        );

      case 'sky-jumper':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#071b2e" />
            {/* Cloud platforms */}
            <rect x="30" y="95" width="42" height="10" rx="5" fill="#38bdf8" opacity="0.9" />
            <rect x="110" y="75" width="38" height="10" rx="5" fill="#38bdf8" opacity="0.9" />
            <rect x="50" y="45" width="40" height="10" rx="5" fill="#38bdf8" opacity="0.9" />
            <rect x="120" y="20" width="36" height="10" rx="5" fill="#22c55e" />
            {/* Spring */}
            <path d="M125,75 Q130,68 135,75" stroke="#fbbf24" strokeWidth="3" fill="none" />
            {/* Jumper creature */}
            <circle cx="70" cy="28" r="10" fill="#38bdf8" />
            <circle cx="67" cy="26" r="2" fill="#ffffff" />
            <circle cx="73" cy="26" r="2" fill="#ffffff" />
            <path d="M68,32 Q70,35 72,32" stroke="#000" strokeWidth="1.5" fill="none" />
          </svg>
        );

      case 'pixel-escape':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#0d1f1c" />
            {/* Laser wall rising from bottom */}
            <rect x="0" y="100" width="200" height="20" fill="#ef4444" opacity="0.85" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="#fca5a5" strokeWidth="2" />
            {/* Platforms & walls */}
            <rect x="25" y="75" width="45" height="10" rx="2" fill="#14b8a6" />
            <rect x="120" y="50" width="50" height="10" rx="2" fill="#14b8a6" />
            <rect x="70" y="25" width="40" height="10" rx="2" fill="#14b8a6" />
            {/* Escape portal at top */}
            <ellipse cx="90" cy="15" rx="14" ry="7" fill="#2dd4bf" stroke="#ffffff" strokeWidth="2" />
            {/* Pixel hero leaping */}
            <rect x="50" y="60" width="10" height="12" rx="2" fill="#ffffff" />
          </svg>
        );

      case 'gravity-flip':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#101127" />
            {/* Floor and Ceiling */}
            <rect x="0" y="0" width="200" height="18" fill="#1e1b4b" />
            <rect x="0" y="102" width="200" height="18" fill="#1e1b4b" />
            {/* Ceiling spikes */}
            <polygon points="50,18 57,32 64,18" fill="#f43f5e" />
            <polygon points="64,18 71,32 78,18" fill="#f43f5e" />
            {/* Floor spikes */}
            <polygon points="120,102 127,88 134,102" fill="#f43f5e" />
            <polygon points="134,102 141,88 148,102" fill="#f43f5e" />
            {/* Runner on ceiling */}
            <rect x="88" y="18" width="14" height="14" rx="2" fill="#6366f1" />
            <line x1="95" y1="35" x2="95" y2="45" stroke="#6366f1" strokeWidth="2" strokeDasharray="2 2" />
          </svg>
        );

      case 'micro-racers':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#141720" />
            {/* Race track loop */}
            <path d="M 40,60 C 40,25 70,25 100,25 C 130,25 165,25 165,60 C 165,95 130,95 100,95 C 70,95 40,95 40,60 Z" 
                  fill="none" stroke="#2a2e3d" strokeWidth="32" strokeLinecap="round" />
            <path d="M 40,60 C 40,25 70,25 100,25 C 130,25 165,25 165,60 C 165,95 130,95 100,95 C 70,95 40,95 40,60 Z" 
                  fill="none" stroke="#fb923c" strokeWidth="2" strokeDasharray="6 6" />
            {/* Start finish checker */}
            <line x1="100" y1="10" x2="100" y2="40" stroke="#ffffff" strokeWidth="4" strokeDasharray="4 4" />
            {/* Micro car drifting */}
            <rect x="145" y="55" width="22" height="12" rx="3" fill="#f97316" transform="rotate(35 156 61)" />
            <rect x="143" y="53" width="6" height="3" fill="#000000" transform="rotate(35 156 61)" />
            <rect x="163" y="53" width="6" height="3" fill="#000000" transform="rotate(35 156 61)" />
          </svg>
        );

      case 'drift-city-mini':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#170c12" />
            {/* Asphalt bend */}
            <path d="M 20,110 Q 110,110 110,20" fill="none" stroke="#27272a" strokeWidth="48" />
            {/* Tire skid marks */}
            <path d="M 40,95 Q 95,95 95,40" fill="none" stroke="#e11d48" strokeWidth="3" opacity="0.6" strokeDasharray="10 4" />
            {/* Neon sports car */}
            <rect x="70" y="65" width="28" height="15" rx="4" fill="#e11d48" transform="rotate(-30 84 72)" />
            <circle cx="95" cy="62" r="3" fill="#facc15" />
            <circle cx="91" cy="74" r="3" fill="#facc15" />
          </svg>
        );

      case 'rocket-bike':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#091824" />
            {/* Fast road lines */}
            <line x1="0" y1="40" x2="200" y2="40" stroke="#0284c7" strokeWidth="1" strokeDasharray="12 12" />
            <line x1="0" y1="80" x2="200" y2="80" stroke="#0284c7" strokeWidth="1" strokeDasharray="12 12" />
            {/* Traffic Drones */}
            <rect x="140" y="32" width="25" height="14" rx="3" fill="#f43f5e" />
            <rect x="110" y="72" width="25" height="14" rx="3" fill="#f43f5e" />
            {/* Rocket bike */}
            <polygon points="65,58 35,52 35,64" fill="#38bdf8" />
            <rect x="42" y="55" width="16" height="6" rx="2" fill="#ffffff" />
            {/* Plasma thruster flame */}
            <polygon points="35,54 15,58 35,62" fill="#06b6d4" />
          </svg>
        );

      case 'block-merge':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#130e20" />
            {/* 4x4 mini grid */}
            <rect x="55" y="15" width="90" height="90" rx="8" fill="#1f1833" />
            {/* Tiles */}
            <rect x="62" y="22" width="18" height="18" rx="4" fill="#7c3aed" />
            <text x="71" y="35" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">2</text>
            <rect x="84" y="22" width="18" height="18" rx="4" fill="#9333ea" />
            <text x="93" y="35" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">4</text>
            <rect x="106" y="22" width="18" height="18" rx="4" fill="#c026d3" />
            <text x="115" y="35" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">8</text>
            <rect x="122" y="44" width="18" height="18" rx="4" fill="#e11d48" />
            <text x="131" y="57" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">64</text>
            {/* Big merge badge 2048 */}
            <rect x="62" y="66" width="40" height="32" rx="5" fill="#f59e0b" />
            <text x="82" y="86" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">2048</text>
          </svg>
        );

      case 'laser-logic':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#091b16" />
            {/* Grid nodes */}
            <circle cx="40" cy="40" r="3" fill="#1f3b33" />
            <circle cx="100" cy="40" r="3" fill="#1f3b33" />
            <circle cx="160" cy="40" r="3" fill="#1f3b33" />
            <circle cx="40" cy="80" r="3" fill="#1f3b33" />
            <circle cx="100" cy="80" r="3" fill="#1f3b33" />
            <circle cx="160" cy="80" r="3" fill="#1f3b33" />
            {/* Laser beam */}
            <path d="M 20,40 L 100,40 L 100,80 L 160,80" fill="none" stroke="#10b981" strokeWidth="3" />
            {/* Mirrors */}
            <line x1="90" y1="30" x2="110" y2="50" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <line x1="90" y1="90" x2="110" y2="70" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            {/* Target sensor */}
            <circle cx="160" cy="80" r="8" fill="#10b981" />
            <circle cx="160" cy="80" r="4" fill="#ffffff" />
          </svg>
        );

      case 'memory-grid':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#1c160b" />
            {/* 4 Simon-style cyber pads */}
            <rect x="55" y="20" width="40" height="36" rx="6" fill="#3b82f6" opacity="0.4" />
            <rect x="105" y="20" width="40" height="36" rx="6" fill="#10b981" opacity="0.9" stroke="#ffffff" strokeWidth="2" />
            <rect x="55" y="64" width="40" height="36" rx="6" fill="#f59e0b" opacity="0.4" />
            <rect x="105" y="64" width="40" height="36" rx="6" fill="#ef4444" opacity="0.4" />
            <circle cx="125" cy="38" r="8" fill="#ffffff" opacity="0.8" />
          </svg>
        );

      case 'number-rush':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#091322" />
            {/* Equation board */}
            <rect x="40" y="15" width="120" height="35" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="100" y="38" fill="#60a5fa" fontSize="16" fontWeight="bold" textAnchor="middle">17 + 8 = ?</text>
            {/* Timer bar */}
            <rect x="40" y="55" width="120" height="4" rx="2" fill="#334155" />
            <rect x="40" y="55" width="85" height="4" rx="2" fill="#38bdf8" />
            {/* Answers buttons */}
            <rect x="40" y="65" width="55" height="22" rx="4" fill="#1e293b" />
            <text x="67" y="80" fill="#94a3b8" fontSize="11" textAnchor="middle">23</text>
            <rect x="105" y="65" width="55" height="22" rx="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
            <text x="132" y="80" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">25</text>
          </svg>
        );

      case 'orbit-survivor':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#1c0d12" />
            {/* Ring arena */}
            <circle cx="100" cy="60" r="48" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
            {/* Player at center */}
            <circle cx="100" cy="60" r="8" fill="#38bdf8" />
            <circle cx="100" cy="60" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />
            {/* Enemies converging */}
            <polygon points="65,40 72,46 68,52" fill="#ef4444" />
            <polygon points="135,45 128,50 133,57" fill="#ef4444" />
            <polygon points="90,95 98,90 106,95" fill="#ef4444" />
            {/* EMP pickup */}
            <circle cx="120" cy="75" r="4" fill="#fbbf24" />
          </svg>
        );

      case 'meteor-breaker':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#150d24" />
            {/* Rotating center blaster */}
            <circle cx="100" cy="60" r="12" fill="#8b5cf6" />
            <line x1="100" y1="60" x2="135" y2="40" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
            {/* Laser shot */}
            <line x1="138" y1="38" x2="155" y2="28" stroke="#f43f5e" strokeWidth="3" />
            {/* Asteroids */}
            <polygon points="160,25 175,18 185,32 170,42" fill="#6b7280" stroke="#9ca3af" strokeWidth="1.5" />
            <polygon points="40,30 52,25 58,40 45,45" fill="#4b5563" />
            <polygon points="50,85 62,80 65,95 53,100" fill="#4b5563" />
            <polygon points="140,85 152,82 155,95 142,98" fill="#4b5563" />
          </svg>
        );

      case 'endless-tunnel':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <rect width="200" height="120" fill="#09151e" />
            {/* Wireframe concentric rings */}
            <polygon points="100,50 110,55 110,65 100,70 90,65 90,55" fill="none" stroke="#06b6d4" strokeWidth="1" />
            <polygon points="100,40 120,50 120,70 100,80 80,70 80,50" fill="none" stroke="#06b6d4" strokeWidth="1.2" opacity="0.7" />
            <polygon points="100,25 140,42 140,78 100,95 60,78 60,42" fill="none" stroke="#06b6d4" strokeWidth="1.8" opacity="0.9" />
            <polygon points="100,8 165,32 165,88 100,112 35,88 35,32" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            {/* Player craft */}
            <polygon points="100,88 106,98 94,98" fill="#ec4899" />
          </svg>
        );

      default:
        return (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <span className="text-xl font-bold text-purple-400">ARCADE</span>
          </div>
        );
    }
  };

  return (
    <div className={`relative overflow-hidden group select-none ${className}`}>
      {renderArt()}
      {badge && (
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-purple-600/90 text-white backdrop-blur shadow-sm border border-purple-400/40">
          {badge}
        </span>
      )}
    </div>
  );
};
