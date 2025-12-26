import React from 'react';

/**
 * Top‑left logo used in the UI overlay.
 *
 * To change the artwork, place your logo file in the Vite `public/images`
 * folder (for example `/public/images/logo.png`) and update `LOGO_SRC`
 * below if needed.
 */
const LOGO_SRC = '/images/logo.png'; // expects `public/images/logo.png`

export const Logo: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 md:top-8 md:left-8 select-none pointer-events-none drop-shadow-lg scale-[0.48] min-[700px]:scale-[0.7]" style={{ transformOrigin: 'top left' }}>
      <img
        src={LOGO_SRC}
        alt="Various Facet of Life logo"
        // Use intrinsic image size: no forced width/height and prevent global max-width rules
        style={{ width: 'auto', height: 'auto', maxWidth: 'none' }}
      />
    </div>
  );
};