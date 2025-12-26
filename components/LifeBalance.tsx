import React from 'react';
import { Category, CATEGORY_ORDER, GameStats, MAX_SCORE } from '../types';

// Import all label images from assets folder
import loveTxt from '../assets/loveTxt.png';
import passionTxt from '../assets/passionTxt.png';
import freedomTxt from '../assets/freedomTxt.png';
import ambitionTxt from '../assets/ambitionTxt.png';
import identityTxt from '../assets/identityTxt.png';
import friendshipTxt from '../assets/friendshipTxt.png';

// Create lookup object mapping category keys to their corresponding images
const categoryLabelImages: Record<Category, string> = {
  [Category.Love]: loveTxt,
  [Category.Passion]: passionTxt,
  [Category.Freedom]: freedomTxt,
  [Category.Ambition]: ambitionTxt,
  [Category.Identity]: identityTxt,
  [Category.Friendship]: friendshipTxt,
};

interface Props {
  stats: GameStats;
}

export const LifeBalance: React.FC<Props> = ({ stats }) => {
  // IMMEDIATE render log - runs on every render
  const correlationId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[LifeBalance:RENDER:${correlationId}] COMPONENT RENDERED`, {
    stats,
    statsKeys: Object.keys(stats),
    statsValues: Object.values(stats),
    statsString: JSON.stringify(stats)
  });
  
  // Debug: log stats on render with correlation tracking
  React.useEffect(() => {
    console.log(`[LifeBalance:useEffect:${correlationId}] STATS CHANGED`, {
      stats,
      statsKeys: Object.keys(stats),
      statsValues: Object.values(stats),
      statsType: typeof stats
    });
    
    // Log each category's value and computed width
    CATEGORY_ORDER.forEach((cat) => {
      const value = Number(stats[cat]) || 0;
      const widthPercent = Math.max(0, Math.min(100, (value / MAX_SCORE) * 100));
      const clampedPercent = Math.max(0, Math.min(100, widthPercent));
      console.log(`[LifeBalance:useEffect:${correlationId}] Category ${cat}:`, {
        value,
        rawPercent: widthPercent,
        clampedPercent: `${clampedPercent}%`,
        isFull: value >= MAX_SCORE,
        willRender: clampedPercent > 0
      });
    });
  }, [stats]);

  return (
    <div className="absolute top-4 right-4 md:top-8 md:right-8 w-[280px] md:w-[400px] select-none pointer-events-none scale-[0.7] md:scale-[0.8] origin-top-right">
      <div className="mb-4 flex justify-end">
        <img src="/images/Asset 22.png" alt="Life Balance" style={{ width: 'auto', height: 'auto', maxWidth: 'none' }} />
      </div>
      
      <div className="flex flex-col gap-3">
        {CATEGORY_ORDER.map((cat) => {
          const value = Number(stats[cat]) || 0; // Ensure value is a number, default to 0
          const isFull = value >= MAX_SCORE;
          const widthPercent = Math.max(0, Math.min(100, (value / MAX_SCORE) * 100));
          const clampedPercent = Math.max(0, Math.min(100, widthPercent));
          const labelImage = categoryLabelImages[cat];
          
          // Debug log for each bar render
          console.log(`[LifeBalance:bar:${cat}]`, {
            value,
            clampedPercent: `${clampedPercent}%`,
            styleWidth: `${clampedPercent}%`,
            willShow: clampedPercent > 0
          });
          
          return (
            <div key={cat} className="flex items-center justify-end gap-3 h-8">
              {/* Label - render image dynamically by category */}
              <img
                src={labelImage}
                alt={cat}
                style={{ width: 'auto', height: 'auto', maxWidth: 'none', filter: 'drop-shadow(2px 2px 0 #000)' }}
              />
              
              {/* Bar Container */}
              <div className="relative overflow-hidden w-[150px] md:w-[220px] h-8 bg-white border-2 border-black shadow-md flex-none">
                {/* Fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-[width] duration-300 ease-out z-10 ${isFull ? 'bg-red-600' : 'bg-black'}`}
                  style={{ 
                    width: `${clampedPercent}%`,
                    minWidth: '0px',
                    height: '100%',
                    display: 'block',
                    opacity: clampedPercent > 0 ? 1 : 0,
                    backgroundColor: isFull ? '#dc2626' : '#000000'
                  }}
                  data-category={cat}
                  data-value={value}
                  data-width={clampedPercent}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};