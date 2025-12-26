import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/gameConfig';
import { EventBus } from './game/EventBus';
import { Category, EVENTS, GameStats, CATEGORY_ORDER } from './types';
import { Logo } from './components/Logo';
import { LifeBalance } from './components/LifeBalance';
import { Preloader } from './components/Preloader';
import { BACKGROUND_IMAGE_URL } from './constants';
import { getPublicPath } from './utils/paths';
import './components/Preloader.css';

// Shared modal container styles for consistent UI (used by Pause, How to Play, and Facet Unlocked modals)
const MODAL_OVERLAY_CLASSES = 'absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center';
const MODAL_CONTAINER_CLASSES = 'bg-white p-8 rounded-2xl max-w-lg text-center shadow-xl border-2 border-black relative';
const MODAL_CLOSE_BUTTON_CLASSES = 'absolute top-2 right-4 text-2xl font-bold hover:text-red-500';

// Facet to Zora URL mapping
const FACET_ZORA_URLS = {
  love: "https://zora.co/coin/base:0x0ad312bdf1073aaa9ba17d375dab2f2cdfd9f750",
  passion: "https://zora.co/coin/base:0xc2d811ae9816c2fc399a8a4367c31a9fda6b67b0",
  freedom: "https://zora.co/coin/base:0xe7a420cde2652ea0f443c31c0fb01d16d20b17ab",
  ambition: "https://zora.co/coin/base:0x07bc578a102e5c6365c9878d40cbfa94d375778e",
  friendship: "https://zora.co/coin/base:0x40ea33a4be7447bac35d2b3006a1730b1d1f34cc",
  identity: "https://zora.co/coin/base:0xa9626b062b550516b218e1a37d4394c2721dc63c",
} as const;

// Initial state
const INITIAL_STATS: GameStats = {
  [Category.Love]: 0,
  [Category.Passion]: 0,
  [Category.Freedom]: 0,
  [Category.Ambition]: 0,
  [Category.Identity]: 0,
  [Category.Friendship]: 0,
};

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [earnedCategory, setEarnedCategory] = useState<Category | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true); // Tracking state for UI toggles (logic in Phaser)

  // Set up event listeners FIRST, before game initialization
  useEffect(() => {
    // Listen for events from Phaser - register IMMEDIATELY
    const handleScoreUpdate = (newStats: GameStats) => {
      const correlationId = `react-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[App:handleScoreUpdate:${correlationId}] EVENT RECEIVED`, {
        receivedStats: newStats,
        receivedKeys: Object.keys(newStats),
        receivedValues: Object.values(newStats),
        receivedType: typeof newStats
      });
      
      // Create a completely new object with explicit values to ensure React detects the change
      const newStatsCopy: GameStats = {
        [Category.Love]: Number(newStats[Category.Love]) || 0,
        [Category.Passion]: Number(newStats[Category.Passion]) || 0,
        [Category.Freedom]: Number(newStats[Category.Freedom]) || 0,
        [Category.Ambition]: Number(newStats[Category.Ambition]) || 0,
        [Category.Identity]: Number(newStats[Category.Identity]) || 0,
        [Category.Friendship]: Number(newStats[Category.Friendship]) || 0,
      };
      
      console.log(`[App:handleScoreUpdate:${correlationId}] CALLING setStats`, {
        newStatsCopy,
        keys: Object.keys(newStatsCopy),
        values: Object.values(newStatsCopy),
        isNewObject: newStatsCopy !== newStats,
        objectId: Object.keys(newStatsCopy).map(k => `${k}:${newStatsCopy[k as Category]}`).join(',')
      });
      
      // Use functional update to ensure React processes the change
      setStats(() => newStatsCopy);
      console.log(`[App:handleScoreUpdate:${correlationId}] setStats CALLED`);
    };
    
    EventBus.on(EVENTS.SCORE_UPDATE, handleScoreUpdate);
    console.log('[App] Event listener registered for SCORE_UPDATE');
    console.log('[App] EventBus listeners:', EventBus.listeners(EVENTS.SCORE_UPDATE).length);
    console.log('[App] EventBus instance:', EventBus);
    console.log('[App] EventBus type:', typeof EventBus);

    EventBus.on(EVENTS.GAME_OVER, (category: Category) => {
      setEarnedCategory(category);
    });
    
    return () => {
      // Cleanup events if component unmounts
      console.log('[App] Cleaning up event listeners');
      EventBus.off(EVENTS.SCORE_UPDATE, handleScoreUpdate);
      EventBus.off(EVENTS.GAME_OVER);
    };
  }, []);

  // Initialize Game - separate effect (only after preloader completes)
  useEffect(() => {
    if (!preloaderComplete) return;
    
    if (!gameRef.current) {
      console.log('[App] Initializing Phaser game...');
      gameRef.current = new Phaser.Game(gameConfig);
      console.log('[App] Phaser game initialized');
    }
  }, [preloaderComplete]);

  // Keyboard Debug Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'o') {
        setDebugMode(prev => !prev);
      }
      if (earnedCategory && (e.key === 'Enter' || e.key === ' ')) {
          continueGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [earnedCategory]);

  const continueGame = () => {
    setEarnedCategory(null);
    EventBus.emit(EVENTS.RESUME_GAME);
  };

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    EventBus.emit(EVENTS.TOGGLE_PAUSE, newState);
  };

  // Show preloader until it completes
  if (!preloaderComplete) {
    return <Preloader onComplete={() => setPreloaderComplete(true)} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#3b82f6]">
      <style>{`
        #game-container {
          position: fixed;
          inset: 0;
          touch-action: none; /* Prevent default touch behaviors like scrolling */
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        #game-container canvas {
          touch-action: none; /* Prevent default touch behaviors */
          display: block;
          border-radius: 0;
          color: rgba(255, 255, 255, 1);
        }
      `}</style>

      {/* Background Image Layer */}
      <img 
        src={BACKGROUND_IMAGE_URL} 
        alt="Background" 
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* 1. Debug Overlay */}
      {debugMode && (
        <div className="absolute inset-0 z-50 pointer-events-none opacity-40">
           {/* Placeholder text explaining debug mode since we can't load the user's specific local file securely without input */}
           <div className="w-full h-full border-4 border-red-500 flex items-center justify-center text-red-500 text-4xl font-bold bg-white/10">
              DEBUG OVERLAY MODE (Mock Image Placeholder)
           </div>
        </div>
      )}

      {/* 2. Game Container */}
      <div id="game-container" className="absolute inset-0 z-0" />

      {/* 3. UI Layer */}
      <div className="absolute inset-0 z-10 w-full h-full max-w-[1920px] max-h-[1080px] mx-auto pointer-events-none">
        
        {/* Top Left Logo */}
        <Logo />

        {/* Top Right Stats */}
        <LifeBalance key={JSON.stringify(stats)} stats={stats} />

        {/* Bottom Left Cloud Button (Info) */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="absolute bottom-8 left-8 w-24 h-16 pointer-events-auto hover:scale-105 transition-transform flex items-center justify-center filter drop-shadow-lg"
          style={{
            // Use provided asset as the button background
            backgroundImage: `url('${getPublicPath("/images/Asset 23.png")}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
          }}
        >
          <span className="text-4xl font-serif font-bold italic z-10 text-black">i</span>
        </button>

        {/* Bottom Right Cloud Button (Pause) */}
        <button
          onClick={togglePause}
          className="absolute bottom-8 right-8 w-24 h-16 pointer-events-auto hover:scale-105 transition-transform flex items-center justify-center filter drop-shadow-lg"
          style={{
            backgroundImage: `url('${getPublicPath("/images/Asset 23.png")}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
          }}
        >
          <span className="text-xl font-black z-10 tracking-widest text-black" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>||</span>
        </button>

      </div>

      {/* 4. Full Screen Overlays (Pause / Info / Earned) */}
      
      {/* Earned Overlay */}
      {earnedCategory && (
        <div 
          onClick={continueGame}
          className={`${MODAL_OVERLAY_CLASSES} cursor-pointer`}
        >
          <div className={`bg-white py-8 px-0 rounded-2xl max-w-xl text-center shadow-xl border-2 border-black relative`} onClick={(e) => e.stopPropagation()}>
            <div className="px-12">
              <h1 className="text-xl font-normal mb-5 text-black">
                you unlocked… <span className="text-red-600 font-bold">{earnedCategory}</span>
              </h1>
              <img 
                src={getPublicPath(`/images/${earnedCategory.toLowerCase()}Modal.png`)}
                alt={earnedCategory}
                className="mx-auto mb-6 w-auto h-auto max-w-[300px] object-contain"
              />
              {FACET_ZORA_URLS[earnedCategory.toLowerCase() as keyof typeof FACET_ZORA_URLS] && (
                <div className="px-2">
                  <a
                    href={FACET_ZORA_URLS[earnedCategory.toLowerCase() as keyof typeof FACET_ZORA_URLS]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full py-3 bg-black text-white font-bold text-xl hover:bg-gray-800 transition-colors mb-2 whitespace-nowrap"
                  >
                    Collect this facet on Zora
                  </a>
                </div>
              )}
              <p className="text-base animate-pulse text-gray-500/70 font-normal mt-2">Press SPACE or Click to continue</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Overlay */}
      {showInfo && (
        <div className={MODAL_OVERLAY_CLASSES} onClick={() => setShowInfo(false)}>
           <div className={MODAL_CONTAINER_CLASSES}>
              <button className={MODAL_CLOSE_BUTTON_CLASSES}>&times;</button>
              <img 
                src={getPublicPath("/images/howtoplay.png")} 
                alt="How to Play" 
                className="mx-auto mb-4 h-[30px] w-auto max-w-full object-contain"
                style={{ height: '1.875rem' }}
              />
              <ul className="text-left text-lg space-y-2 mb-6 font-medium">
                <li className="flex items-start gap-2">
                  <img src={getPublicPath("/images/star.png")} alt="" className="mt-1.5 w-3 h-3 flex-shrink-0" />
                  <span>Move with A / D or ← →</span>
                </li>
                <li className="flex items-start gap-2">
                  <img src={getPublicPath("/images/star.png")} alt="" className="mt-1.5 w-3 h-3 flex-shrink-0" />
                  <span>Catch what matters. Miss what doesn't</span>
                </li>
                <li className="flex items-start gap-2">
                  <img src={getPublicPath("/images/star.png")} alt="" className="mt-1.5 w-3 h-3 flex-shrink-0" />
                  <span>Every catch has a trade-off</span>
                </li>
                <li className="flex items-start gap-2">
                  <img src={getPublicPath("/images/star.png")} alt="" className="mt-1.5 w-3 h-3 flex-shrink-0" />
                  <span>Reach 5/5 to complete a facet</span>
                </li>
              </ul>
              <p className="text-sm text-gray-500">Click anywhere to close</p>
           </div>
        </div>
      )}

      {/* Pause Menu */}
      {isPaused && !earnedCategory && (
        <div className={MODAL_OVERLAY_CLASSES}>
          <div className={`${MODAL_CONTAINER_CLASSES} w-80`}>
            <img 
              src={getPublicPath("/images/paused.png")} 
              alt="PAUSED" 
              className="mx-auto mb-8 h-[36px] w-auto max-w-full object-contain"
              style={{ height: '2.25rem' }}
            />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="font-bold text-lg">Music / SFX</span>
                <button 
                  onClick={() => {
                    const newState = !audioEnabled;
                    setAudioEnabled(newState);
                    EventBus.emit(EVENTS.TOGGLE_AUDIO);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${audioEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${audioEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <button 
                onClick={togglePause}
                className="w-full py-3 bg-black text-white font-bold text-xl hover:bg-gray-800 transition-colors"
              >
                RESUME
              </button>

              <button 
                onClick={() => {
                   EventBus.emit(EVENTS.RESTART_GAME);
                   setIsPaused(false);
                }}
                className="w-full py-2 border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors mt-4"
              >
                RESTART GAME
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;