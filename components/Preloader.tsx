import React, { useEffect, useState, useRef } from 'react';
import { getPublicPath } from '../utils/paths';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'loading' | 'stamp' | 'hold' | 'fadeout' | 'complete'>('loading');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load images
  useEffect(() => {
    const bgImage = new Image();
    const logoImage = new Image();
    let loadedCount = 0;

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setImagesLoaded(true);
      }
    };

    bgImage.onload = checkComplete;
    bgImage.onerror = checkComplete; // Continue even if image fails
    bgImage.src = getPublicPath('/images/preloadBG.jpg');

    logoImage.onload = checkComplete;
    logoImage.onerror = checkComplete; // Continue even if image fails
    logoImage.src = getPublicPath('/images/preloadLOGO.png');

    // Failsafe timeout (4 seconds)
    timeoutRef.current = setTimeout(() => {
      setImagesLoaded(true);
    }, 4000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Animation timeline
  useEffect(() => {
    if (!imagesLoaded) return;

    if (prefersReducedMotion) {
      // Skip animations, fade out quickly
      setTimeout(() => {
        setPhase('complete');
        setTimeout(onComplete, 100);
      }, 300);
      return;
    }

    // Normal animation timeline - start when images are loaded
    if (phase === 'loading' && imagesLoaded) {
      setPhase('stamp');
      // Soft reveal animation: 0-800ms
      setTimeout(() => {
        setPhase('hold');
        // Hold: exactly 0.7 seconds (700ms)
        setTimeout(() => {
          setPhase('fadeout');
          // Fade-out: 400ms
          setTimeout(() => {
            setPhase('complete');
            setTimeout(onComplete, 50);
          }, 400);
        }, 700);
      }, 800);
    }
  }, [imagesLoaded, phase, onComplete, prefersReducedMotion]);

  // Disable scrolling while preloader is visible, but allow pointer events for audio unlock
  useEffect(() => {
    if (phase !== 'complete') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [phase]);

  // Unlock audio on preloader tap (mobile browsers require user interaction)
  useEffect(() => {
    const handlePreloaderTap = () => {
      // Try to unlock audio context early
      const unlockAudio = () => {
        // Create a temporary audio context to unlock
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
              console.log('[Preloader] Audio context unlocked');
              // Store in a way the game can access
              (window as any).__audioUnlocked = true;
            }).catch((err) => {
              console.error('[Preloader] Failed to unlock audio:', err);
            });
          } else {
            (window as any).__audioUnlocked = true;
          }
        }
      };
      unlockAudio();
    };

    // Allow tapping anywhere on preloader to unlock audio
    const preloaderElement = document.querySelector('.preloader');
    if (preloaderElement) {
      preloaderElement.addEventListener('touchstart', handlePreloaderTap, { once: true });
      preloaderElement.addEventListener('click', handlePreloaderTap, { once: true });
    }

    return () => {
      if (preloaderElement) {
        preloaderElement.removeEventListener('touchstart', handlePreloaderTap);
        preloaderElement.removeEventListener('click', handlePreloaderTap);
      }
    };
  }, []);

  return (
    <div className={`preloader ${phase === 'fadeout' || phase === 'complete' ? 'preloader-fadeout' : ''}`}>
      <div className="preloader-background" />
      <div className="preloader-content">
        <div className={`preloader-logo ${phase === 'stamp' ? 'logo-stamp' : ''} ${phase === 'hold' || phase === 'fadeout' ? 'logo-hold' : ''}`}>
          <img 
            src={getPublicPath("/images/preloadLOGO.png")} 
            alt="Loading" 
            className="preloader-logo-img"
          />
        </div>
      </div>
    </div>
  );
};

