import Phaser from 'phaser';
import { Category } from '../../types';

// Get base URL for GitHub Pages compatibility
const BASE_URL = import.meta.env.BASE_URL;

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load external player image from `public/images/character.png`.
    // Vite serves files placed in `public/` at the site root, so the path is `/images/character.png`.
    this.load.image('player', `${BASE_URL}images/character.png`);

    // 2. Object Sprites (Apples, Bags, etc. from mock)
    // We create a distinct texture for each category
    const colors: Record<Category, number> = {
      [Category.Love]: 0xff0000,      // Red
      [Category.Passion]: 0xff8800,   // Orange
      [Category.Freedom]: 0x00aaff,   // Blue
      [Category.Ambition]: 0xffd700,  // Gold
      [Category.Identity]: 0x9900cc,  // Purple
      [Category.Friendship]: 0x00cc44 // Green
    };

    // Load specific category images from public/ if present and use them as textures
    // Vite serves files from `public/` at the root, so the path is `/images/<name>.png`.
    this.load.image(`item-${Category.Friendship}`, `${BASE_URL}images/friendship.png`);
    this.load.image(`item-${Category.Love}`, `${BASE_URL}images/love.png`);
    this.load.image(`item-${Category.Passion}`, `${BASE_URL}images/passion.png`);
    this.load.image(`item-${Category.Freedom}`, `${BASE_URL}images/freedom.png`);
    this.load.image(`item-${Category.Ambition}`, `${BASE_URL}images/ambition.png`);
    this.load.image(`item-${Category.Identity}`, `${BASE_URL}images/identity.png`);

    Object.entries(colors).forEach(([cat, color]) => {
      // If we loaded an external image for these categories, skip procedural generation
      if (
        cat === Category.Friendship ||
        cat === Category.Love ||
        cat === Category.Passion ||
        cat === Category.Freedom ||
        cat === Category.Ambition ||
        cat === Category.Identity
      ) return;

      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(color, 1);
      g.fillCircle(32, 32, 30);
      // Add a letter to distinguish them clearly
      g.lineStyle(4, 0xffffff);
      g.strokeCircle(32, 32, 30);
      g.generateTexture(`item-${cat}`, 64, 64);
    });

    // Load background music
    // Place your MP3 file in public/audio/ folder and name it 'bgm.mp3'
    // The path will be /audio/bgm.mp3
    this.load.audio('bgm', `${BASE_URL}audio/bgm.mp3`);
    
    // Load sound effect for object pickup
    this.load.audio('sfx', `${BASE_URL}audio/sfx.wav`);
    
    // Add error handling for audio loading
    this.load.on('filecomplete-audio-bgm', () => {
      console.log('[Boot] BGM audio file loaded successfully');
    });
    
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (file.key === 'bgm') {
        console.error('[Boot] Failed to load BGM audio file:', file.src);
        console.error('[Boot] Make sure the file exists at:', '/audio/bgm.mp3');
      }
    });
  }

  create() {
    // Verify audio is loaded before starting game
    const bgmLoaded = this.cache.audio.exists('bgm');
    console.log('[Boot] BGM loaded:', bgmLoaded);
    if (!bgmLoaded) {
      console.warn('[Boot] BGM not loaded, but continuing to game scene');
    }
    this.scene.start('Game');
  }
}