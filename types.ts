export enum Category {
  Love = 'Love',
  Passion = 'Passion',
  Freedom = 'Freedom',
  Ambition = 'Ambition',
  Identity = 'Identity',
  Friendship = 'Friendship'
}

export const CATEGORY_ORDER = [
  Category.Love,
  Category.Passion,
  Category.Freedom,
  Category.Ambition,
  Category.Identity,
  Category.Friendship
];

export interface GameStats {
  [Category.Love]: number;
  [Category.Passion]: number;
  [Category.Freedom]: number;
  [Category.Ambition]: number;
  [Category.Identity]: number;
  [Category.Friendship]: number;
}

export const MAX_SCORE = 5;

// Events for Phaser <-> React communication
export const EVENTS = {
  SCORE_UPDATE: 'score-update',
  GAME_OVER: 'game-over', // Earned a facet
  TOGGLE_PAUSE: 'toggle-pause', // From React to Phaser
  RESUME_GAME: 'resume-game',   // From React to Phaser
  TOGGLE_AUDIO: 'toggle-audio', // From React to Phaser
  DEBUG_TOGGLE: 'debug-toggle',
  RESTART_GAME: 'restart-game'
};