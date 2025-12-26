import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { MainGame } from './scenes/MainGame';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000', // Will be transparent or covered by CSS
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 1920,
    height: 1080,
  },
  transparent: true, // Allow CSS background to show through
  fps: {
    target: 60,
    forceSetTimeOut: false, // Use requestAnimationFrame for better performance
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Objects fall via velocity, not global gravity (easier control)
      debug: false,
    },
  },
  scene: [Boot, MainGame],
};