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

  // Disable scrolling and pointer events while preloader is visible
  useEffect(() => {
    if (phase !== 'complete') {
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [phase]);

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

