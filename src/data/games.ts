import { GameMetadata } from '../types/game';

export const GAMES_CATALOG: GameMetadata[] = [
  // --- ARCADE ---
  {
    id: 'neon-dodge',
    title: 'Neon Dodge',
    category: 'arcade',
    categoryLabel: 'Arcade',
    description: 'Prenez le contrôle d’un noyau d’énergie lumineuse et esquivez des barrages géométriques néon. La vitesse et la complexité des motifs augmentent chaque seconde !',
    shortDesc: 'Esquivez les lasers géométriques à vive allure.',
    instructions: {
      keyboard: ['Touches Fléchées ou Q/D : Se déplacer', 'Espace : Ralentissement d’urgence (recharge)'],
      mobile: 'Glissez ou touchez à gauche/droite pour déplacer votre vaisseau'
    },
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    badge: 'Populaire',
    rating: 4.9,
    playsCountEstimate: 1420,
    featured: true,
  },
  {
    id: 'astro-blaster',
    title: 'Astro Blaster',
    category: 'arcade',
    categoryLabel: 'Arcade',
    description: 'Pilotez un vaisseau spatial interstellaire, abattez les drones ennemis, ramassez les recharges de bouclier et survivez aux vagues cosmiques intenses.',
    shortDesc: 'Combat spatial d’arcade rétro et élimination d’ennemis.',
    instructions: {
      keyboard: ['Flèches / Q-D : Déplacement', 'Espace : Tirer les blasters plasma'],
      mobile: 'Boutons tactiles Gauche / Droite et Tir'
    },
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    badge: 'Populaire',
    rating: 4.8,
    playsCountEstimate: 1180,
    featured: true,
  },
  {
    id: 'stack-master',
    title: 'Stack Master',
    category: 'arcade',
    categoryLabel: 'Arcade',
    description: 'Empilez des blocs oscillants avec une précision millimétrique. Tout surplus qui dépasse est découpé ! Bâtissez la plus haute tour lumineuse.',
    shortDesc: 'Empilez les blocs mobiles pour créer la plus haute tour.',
    instructions: {
      keyboard: ['Espace ou Clic : Déposer le bloc'],
      mobile: 'Touchez n’importe où sur l’écran pour poser le bloc'
    },
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    badge: 'Rapide',
    rating: 4.7,
    playsCountEstimate: 950,
  },
  {
    id: 'color-switch-rush',
    title: 'Color Switch Rush',
    category: 'arcade',
    categoryLabel: 'Arcade',
    description: 'Propulsez votre sphère d’énergie à travers des anneaux rotatifs multicolores. Vous ne pouvez franchir que les segments qui correspondent à votre couleur !',
    shortDesc: 'Passez les obstacles rotatifs selon la bonne couleur.',
    instructions: {
      keyboard: ['Espace ou Clic : Sauter / Propulser'],
      mobile: 'Touchez pour donner une impulsion vers le haut'
    },
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    badge: 'Défi',
    rating: 4.6,
    playsCountEstimate: 870,
  },
  {
    id: 'pulse-runner',
    title: 'Pulse Runner',
    category: 'arcade',
    categoryLabel: 'Arcade',
    description: 'Course rythmée sur une autoroute cyberpunk à 3 voies. Changez de voie, sautez par-dessus les barrières de données et glissez sous les cyber-arches.',
    shortDesc: 'Course 3 voies à haute vitesse avec sauts et glissades.',
    instructions: {
      keyboard: ['Flèches Gauche/Droite : Changer de voie', 'Flèche Haut : Sauter', 'Flèche Bas : Glisser'],
      mobile: 'Swipes (glissements) Gauche/Droite/Haut/Bas'
    },
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    badge: 'Nouveau',
    rating: 4.8,
    playsCountEstimate: 760,
  },

  // --- PLATEFORME ---
  {
    id: 'cube-quest',
    title: 'Cube Quest',
    category: 'platform',
    categoryLabel: 'Plateforme',
    description: 'Une aventure de plateforme 2D vibrante avec des sauts dynamiques, des plateformes oscillantes, des pièges épineux et des orbes dorés à récupérer.',
    shortDesc: 'Aventure de plateforme avec collecte d’orbes et pièges.',
    instructions: {
      keyboard: ['Q/D ou Flèches : Déplacements', 'Espace / Z / Haut : Sauter', 'Double saut disponible !'],
      mobile: 'Pad virtuel et bouton de saut sur écran'
    },
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    badge: 'Populaire',
    rating: 4.9,
    playsCountEstimate: 1650,
    featured: true,
  },
  {
    id: 'mini-dungeon',
    title: 'Mini Dungeon',
    category: 'platform',
    categoryLabel: 'Plateforme',
    description: 'Explorez un mini-donjon mystérieux généré par salles. Évitez les pièges à pointes, trouvez la clé dorée, débloquez les coffres au trésor et rejoignez la sortie.',
    shortDesc: 'Explorez des salles secrètes, trouvez les clés et évitez les pièges.',
    instructions: {
      keyboard: ['ZQSD ou Flèches : Déplacer le héros', 'Espace : Interagir / Ouvrir'],
      mobile: 'Flèches de direction tactiles à l’écran'
    },
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    badge: 'Nouveau',
    rating: 4.8,
    playsCountEstimate: 890,
  },
  {
    id: 'sky-jumper',
    title: 'Sky Jumper',
    category: 'platform',
    categoryLabel: 'Plateforme',
    description: 'Bondissez de plateforme en plateforme pour grimper toujours plus haut dans l’atmosphère céleste ! Méfiez-vous des nuages friables et attrapez les ressorts.',
    shortDesc: 'Sautez toujours plus haut en utilisant ressorts et bonus.',
    instructions: {
      keyboard: ['Flèches Gauche / Droite ou Q / D : Guider le saut'],
      mobile: 'Boutons tactiles Gauche / Droite ou inclinaison'
    },
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.5)',
    badge: 'Rapide',
    rating: 4.7,
    playsCountEstimate: 1040,
  },
  {
    id: 'pixel-escape',
    title: 'Pixel Escape',
    category: 'platform',
    categoryLabel: 'Plateforme',
    description: 'Un jeu de précision chronométré. Fuyez un mur d’énergie destructeur qui monte inexorablement. Utilisez les rebonds muraux et atteignez la porte temporelle.',
    shortDesc: 'Échappez à la montée du laser dans un sprint vertical précis.',
    instructions: {
      keyboard: ['Flèches / Q-D : Courir', 'Espace : Saut & Saut mural'],
      mobile: 'Boutons Gauche/Droite et Saut'
    },
    accentColor: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    badge: 'Défi',
    rating: 4.6,
    playsCountEstimate: 620,
  },
  {
    id: 'gravity-flip',
    title: 'Gravity Flip',
    category: 'platform',
    categoryLabel: 'Plateforme',
    description: 'Contrôlez un runner quantique capable d’inverser instantanément la gravité. Alternez entre le sol et le plafond pour franchir des gouffres et des rangées de pointes.',
    shortDesc: 'Inversez la gravité instantanément pour franchir les obstacles.',
    instructions: {
      keyboard: ['Espace ou Clic : Inverser la gravité'],
      mobile: 'Touchez n’importe où pour inverser la gravité'
    },
    accentColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    badge: 'Populaire',
    rating: 4.8,
    playsCountEstimate: 980,
  },

  // --- COURSE ET PILOTAGE ---
  {
    id: 'micro-racers',
    title: 'Micro Racers',
    category: 'racing',
    categoryLabel: 'Course & Pilotage',
    description: 'Course arcade vue du dessus ! Pilotez votre micro-bolide sur un circuit sinueux, négociez les épingles à cheveux, évitez les flaques d’huile et battez le chrono du tour.',
    shortDesc: 'Pilotez votre micro-bolide sur des circuits rétro sinueux.',
    instructions: {
      keyboard: ['Flèche Haut / Z : Accélérer', 'Flèche Bas / S : Freiner / Marche arrière', 'Flèches Gauche/Droite : Braquer'],
      mobile: 'Pédale Gaz/Frein et volants tactiles'
    },
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.5)',
    badge: 'Populaire',
    rating: 4.9,
    playsCountEstimate: 1310,
    featured: true,
  },
  {
    id: 'drift-city-mini',
    title: 'Drift City Mini',
    category: 'racing',
    categoryLabel: 'Course & Pilotage',
    description: 'L’art du dérapage contrôlé en ville ! Glissez dans les virages, faites chauffer la gomme et enchaînez les combos de drift sans percuter les glissières de sécurité.',
    shortDesc: 'Enchaînez les dérapages parfaits pour maximiser votre score.',
    instructions: {
      keyboard: ['Flèches / Q-D : Diriger', 'Espace / Maj : Amorcer le drift / Frein à main'],
      mobile: 'Volant tactile et bouton Drift'
    },
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.5)',
    badge: 'Défi',
    rating: 4.7,
    playsCountEstimate: 830,
  },
  {
    id: 'rocket-bike',
    title: 'Rocket Bike',
    category: 'racing',
    categoryLabel: 'Course & Pilotage',
    description: 'Enfourchez une moto à propulsion ionique sur une mégapole suspendue. Fendez la circulation, ramassez les pastilles turbo et maintenez une vitesse phénoménale.',
    shortDesc: 'Foncez à moto fusée sur une mégapole à vitesse supersonique.',
    instructions: {
      keyboard: ['Flèches Gauche / Droite : Slalomer', 'Flèche Haut : Activer le boost'],
      mobile: 'Glissez pour changer de trajectoire, touchez pour booster'
    },
    accentColor: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.5)',
    badge: 'Nouveau',
    rating: 4.8,
    playsCountEstimate: 910,
  },

  // --- PUZZLE ET RÉFLEXION ---
  {
    id: 'block-merge',
    title: 'Block Merge',
    category: 'puzzle',
    categoryLabel: 'Puzzle & Réflexion',
    description: 'Glissez et fusionnez les blocs numériques de même valeur sur une grille 4x4 néon (2 + 2 = 4, 4 + 4 = 8). Anticipez chaque mouvement pour forger le bloc 2048 !',
    shortDesc: 'Fusionnez les tuiles numériques pour atteindre le bloc suprême.',
    instructions: {
      keyboard: ['Flèches directionnelles ou ZQSD : Faire glisser toute la grille'],
      mobile: 'Balayez (Swipe) vers le Haut, Bas, Gauche ou Droite'
    },
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    badge: 'Populaire',
    rating: 4.9,
    playsCountEstimate: 1720,
    featured: true,
  },
  {
    id: 'laser-logic',
    title: 'Laser Logic',
    category: 'puzzle',
    categoryLabel: 'Puzzle & Réflexion',
    description: 'Une grille optique cyberpunk. Tournez les prismes et miroirs à 90° pour dévier le faisceau laser émetteur et illuminer tous les récepteurs quantiques.',
    shortDesc: 'Orientez les miroirs pour rediriger le rayon laser vers les cibles.',
    instructions: {
      keyboard: ['Clic gauche sur un miroir : Le faire pivoter de 90°'],
      mobile: 'Touchez une case miroir pour la tourner'
    },
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    badge: 'Défi',
    rating: 4.8,
    playsCountEstimate: 740,
  },
  {
    id: 'memory-grid',
    title: 'Memory Grid',
    category: 'puzzle',
    categoryLabel: 'Puzzle & Réflexion',
    description: 'Testez la vivacité de votre mémoire immédiate ! Observez la séquence lumineuse et sonore émise par les pads cybernétiques, puis reproduisez-la sans vous tromper.',
    shortDesc: 'Mémorisez et reproduisez des séquences sonores et lumineuses.',
    instructions: {
      keyboard: ['Clic sur les blocs ou touches 1 à 4'],
      mobile: 'Touchez les blocs colorés dans le bon ordre'
    },
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    badge: 'Rapide',
    rating: 4.6,
    playsCountEstimate: 850,
  },
  {
    id: 'number-rush',
    title: 'Number Rush',
    category: 'puzzle',
    categoryLabel: 'Puzzle & Réflexion',
    description: 'Sprint mental contre le chrono ! Résolvez des équations arithmétiques éclairs avant que la barre de compte à rebours ne s’effondre. Combien de séries réussirez-vous ?',
    shortDesc: 'Calculez à toute vitesse avant l’épuisement du compte à rebours.',
    instructions: {
      keyboard: ['Touches 1, 2, 3, 4 ou Clic sur la bonne réponse'],
      mobile: 'Touchez le panneau contenant le bon résultat'
    },
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    badge: 'Rapide',
    rating: 4.7,
    playsCountEstimate: 690,
  },

  // --- SURVIE ET SCORE ---
  {
    id: 'orbit-survivor',
    title: 'Orbit Survivor',
    category: 'survival',
    categoryLabel: 'Survie & Score',
    description: 'Une arène circulaire sous haute tension. Des essaims de drones rouges convergent vers vous. Déplacez-vous avec agilité, collectez les orbes de surtension et déclenchez l’IEM.',
    shortDesc: 'Esquivez les essaims d’ennemis et ramassez les impulsions IEM.',
    instructions: {
      keyboard: ['Flèches ou ZQSD : Déplacement fluide', 'Espace : Déclencher bombe IEM si chargée'],
      mobile: 'Joystick virtuel tactile ou touch pour se diriger'
    },
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    badge: 'Populaire',
    rating: 4.9,
    playsCountEstimate: 1290,
    featured: true,
  },
  {
    id: 'meteor-breaker',
    title: 'Meteor Breaker',
    category: 'survival',
    categoryLabel: 'Survie & Score',
    description: 'Aux commandes d’un canon laser rotatif à 360°, pulvérisez les météores géants qui se scindent en fragments plus rapides. Maximisez votre score et préservez vos boucliers.',
    shortDesc: 'Détruisez les astéroïdes à 360° avant qu’ils ne percutent le noyau.',
    instructions: {
      keyboard: ['Flèches Gauche/Droite ou Souris : Viser à 360°', 'Espace ou Clic : Tirer'],
      mobile: 'Touchez l’écran pour viser et tirer dans cette direction'
    },
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    badge: 'Défi',
    rating: 4.7,
    playsCountEstimate: 940,
  },
  {
    id: 'endless-tunnel',
    title: 'Endless Tunnel',
    category: 'survival',
    categoryLabel: 'Survie & Score',
    description: 'Plongez dans un tunnel hexagonal rétro-futuriste à perte de vue. Faites pivoter votre axe pour passer à travers les ouvertures des barrières lumineuses qui foncent vers vous.',
    shortDesc: 'Plongez dans un tunnel infini et trouvez les brèches dans les anneaux.',
    instructions: {
      keyboard: ['Flèches Gauche / Droite ou Q / D : Faire tourner le vaisseau dans l’anneau'],
      mobile: 'Boutons Gauche / Droite ou glissement horizontal'
    },
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    badge: 'Populaire',
    rating: 4.8,
    playsCountEstimate: 1150,
  },
];
