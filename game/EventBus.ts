import Phaser from 'phaser';

// Use Phaser's built-in event emitter as a global bus
export const EventBus = new Phaser.Events.EventEmitter();