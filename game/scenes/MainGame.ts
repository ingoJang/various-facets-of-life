import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { Category, CATEGORY_ORDER, EVENTS, MAX_SCORE, GameStats } from '../../types';

// Trade-off mapping: when catching category X, reset category Y to 0
const tradeOffReset: Record<Category, Category> = {
  [Category.Love]: Category.Freedom,
  [Category.Passion]: Category.Identity,
  [Category.Freedom]: Category.Ambition,
  [Category.Ambition]: Category.Friendship,
  [Category.Identity]: Category.Love,
  [Category.Friendship]: Category.Passion,
};

// Visual size multiplier per category to compensate for transparent padding
const visualSizeMultiplier: Record<Category, number> = {
  [Category.Love]: 1.0,
  [Category.Passion]: 1.0,
  [Category.Freedom]: 1.0,
  [Category.Ambition]: 1.0,
  [Category.Identity]: 1.15,
  [Category.Friendship]: 1.0,
};

export class MainGame extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private fallingGroup!: Phaser.Physics.Arcade.Group;
  private spawnTimer!: Phaser.Time.TimerEvent;
  
  // Touch/Mobile input
  private pointerX: number = 0;
  private isPointerDown: boolean = false;
  private audioUnlocked: boolean = false;
  
  private scores: Record<Category, number> = {
    [Category.Love]: 0,
    [Category.Passion]: 0,
    [Category.Freedom]: 0,
    [Category.Ambition]: 0,
    [Category.Identity]: 0,
    [Category.Friendship]: 0
  };

  private isPaused: boolean = false;
  
  // Audio State
  private bgmPlaying: boolean = false;
  private bgmSound: Phaser.Sound.WebAudioSound | null = null;
  private audioEnabled: boolean = true;
  private sfxSound: Phaser.Sound.WebAudioSound | null = null;

  private sizePlayer() {
    const base = Math.min(this.scale.width, this.scale.height);
    const targetHeight = base * 0.4;
    this.player.displayHeight = targetHeight;
    this.player.scaleX = this.player.scaleY;
  }

  private sizeFallingObject(obj: Phaser.Physics.Arcade.Sprite) {
    const base = Math.min(this.scale.width, this.scale.height);
    let targetHeight = base * 0.13;
    const storedVariance = obj.getData('sizeMul');
    if (storedVariance !== undefined && storedVariance !== null) {
      targetHeight *= storedVariance;
    }
    const category = obj.getData('category') as Category;
    if (category && visualSizeMultiplier[category]) {
      targetHeight *= visualSizeMultiplier[category];
    }
    obj.displayHeight = targetHeight;
    obj.scaleX = obj.scaleY;
    
    const maxWidth = base * 0.25;
    if (obj.displayWidth > maxWidth) {
      obj.displayWidth = maxWidth;
      obj.scaleY = obj.scaleX;
    }
  }

  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    // Check if audio was already unlocked from preloader
    if ((window as any).__audioUnlocked) {
      this.audioUnlocked = true;
      // Try to start BGM immediately if already unlocked
      this.time.delayedCall(100, () => {
        if (!this.bgmPlaying) {
          this.startBGM();
        }
      });
    }

    // Set physics world bounds to match game area exactly (no padding)
    this.physics.world.setBounds(0, 0, width, height);

    // --- Inputs ---
    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
    }

    // --- Touch/Mobile Input ---
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.pointerX = pointer.x;
      
      // Unlock audio on first touch/click (mobile browsers require user interaction)
      // Check if already unlocked from preloader
      if ((window as any).__audioUnlocked) {
        this.audioUnlocked = true;
      }
      
      if (!this.audioUnlocked) {
        this.unlockAudio();
      } else if (!this.bgmPlaying) {
        // If already unlocked but BGM not playing, start it immediately
        this.startBGM();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerDown) {
        this.pointerX = pointer.x;
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
    });

    this.input.on('pointercancel', () => {
      this.isPointerDown = false;
    });

    // --- Player ---
    this.player = this.physics.add.sprite(width / 2, height - 10, 'player');
    this.player.setOrigin(0.5, 1); // bottom-center origin so bottom of image is at the position
    this.sizePlayer();
    // Don't use setCollideWorldBounds - we'll handle bounds manually to account for sprite visual size
    this.player.body.setSize(60, 120);

    // Handle resize events
    this.scale.on('resize', this.handleResize, this);

    // --- Falling Objects ---
    this.fallingGroup = this.physics.add.group();

    // Spawn Loop
    this.spawnTimer = this.time.addEvent({
      delay: 650,
      callback: this.spawnObject,
      callbackScope: this,
      loop: false
    });

    // --- Collisions ---
    this.physics.add.overlap(
      this.player,
      this.fallingGroup,
      this.handleCollection as any,
      undefined,
      this
    );

    // --- Events Listeners ---
    EventBus.on(EVENTS.TOGGLE_PAUSE, this.handlePauseToggle, this);
    EventBus.on(EVENTS.RESUME_GAME, this.handleResume, this);
    EventBus.on(EVENTS.RESTART_GAME, this.resetGame, this);
    EventBus.on(EVENTS.TOGGLE_AUDIO, this.handleAudioToggle, this);

    // Unlock audio on keyboard input (desktop)
    this.input.keyboard?.on('keydown', () => {
      if (!this.audioUnlocked) {
        this.unlockAudio();
      }
    });

    // Initial Score Emit
    this.emitScores('initial');
  }

  update(time: number, delta: number) {
    if (this.isPaused) return;

    const speed = 600;
    let moveLeft = false;
    let moveRight = false;

    // Keyboard input
    if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
      moveLeft = true;
    } else if (this.cursors?.right.isDown || this.wasd?.right.isDown) {
      moveRight = true;
    }

    // Touch/Mobile input - follow pointer position
    if (this.isPointerDown) {
      const playerCenterX = this.player.x;
      const threshold = 20; // Dead zone to prevent jitter
      
      if (this.pointerX < playerCenterX - threshold) {
        moveLeft = true;
      } else if (this.pointerX > playerCenterX + threshold) {
        moveRight = true;
      }
    }

    // Apply movement
    if (moveLeft) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true); // Flip to face left
    } else if (moveRight) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false); // Default faces right
    } else {
      this.player.setVelocityX(0);
    }

    // Clamp player position to ensure sprite visual stays within bounds
    // Since origin is 0.5 (center), we need to account for half the display width
    const playerDisplayWidth = this.player.displayWidth;
    const playerHalfWidth = playerDisplayWidth / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, playerHalfWidth, this.scale.width - playerHalfWidth);

    // Clamp falling objects horizontally to prevent clipping
    this.fallingGroup.children.each((child: any) => {
      if (child.active) {
        // Clamp object position to keep sprite visual within bounds
        const objDisplayWidth = child.displayWidth;
        const objHalfWidth = objDisplayWidth / 2;
        child.x = Phaser.Math.Clamp(child.x, objHalfWidth, this.scale.width - objHalfWidth);
        
        // Cleanup objects that went off screen
        if (child.y > this.scale.height + 50) {
          child.destroy();
        }
      }
      return true; // keep iterating
    });
  }

  // --- Procedural Audio Helpers ---

  private unlockAudio() {
    if (this.audioUnlocked) {
      // If already unlocked, just start BGM if not playing
      if (!this.bgmPlaying) {
        this.startBGM();
      }
      return;
    }
    
    const sound = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (!sound.context) {
      console.warn('[MainGame] Sound context not available for unlock');
      return;
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (sound.context.state === 'suspended') {
      console.log('[MainGame] Unlocking audio context on user interaction');
      sound.context.resume().then(() => {
        console.log('[MainGame] Audio context resumed successfully');
        this.audioUnlocked = true;
        (window as any).__audioUnlocked = true;
        // Start BGM immediately after unlocking
        this.startBGM();
      }).catch((error) => {
        console.error('[MainGame] Failed to resume audio context:', error);
      });
    } else {
      this.audioUnlocked = true;
      (window as any).__audioUnlocked = true;
      // Start BGM immediately if context is already active
      this.startBGM();
    }
  }

  private startBGM() {
    if (this.bgmPlaying) {
      console.log('[MainGame] BGM already playing');
      return;
    }
    
    // Check if audio is loaded
    const bgmCache = this.cache.audio.get('bgm');
    if (!bgmCache) {
      console.warn('[MainGame] BGM audio not loaded yet. Available sounds:', this.cache.audio.getKeys());
      return;
    }
    
    console.log('[MainGame] Starting BGM, audio cache found:', bgmCache);
    
    // Cast to WebAudioSoundManager to safely access context
    const sound = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (!sound.context) {
      console.warn('[MainGame] Sound context not available');
      return;
    }
    
    // Ensure context is resumed (browser autoplay policy)
    if (sound.context.state === 'suspended') {
      console.log('[MainGame] Audio context suspended, attempting to resume');
      sound.context.resume().then(() => {
        this.playBGM();
      }).catch((error) => {
        console.error('[MainGame] Failed to resume audio context:', error);
      });
      return;
    }

    this.playBGM();
  }

  private playBGM() {
    try {
      // Play the loaded MP3 file
      // Set volume to 0 if audio is disabled, otherwise use normal volume
      const volume = this.audioEnabled ? 0.3 : 0;
      this.bgmSound = this.sound.add('bgm', {
        volume: volume, // Adjust volume (0.0 to 1.0)
        loop: true   // Loop the music
      }) as Phaser.Sound.WebAudioSound;
      
      console.log('[MainGame] BGM sound object created:', this.bgmSound);
      
      this.bgmSound.play();
      this.bgmPlaying = true;
      console.log('[MainGame] BGM playback started');
    } catch (error) {
      console.error('[MainGame] Error playing BGM:', error);
    }
  }

  private stopBGM() {
    if (this.bgmSound) {
      this.bgmSound.stop();
      this.bgmSound.destroy();
      this.bgmSound = null;
    }
    this.bgmPlaying = false;
  }

  private playSFX(type: 'pickup' | 'win') {
    // Don't play SFX if audio is disabled
    if (!this.audioEnabled) return;
    
    const sound = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (!sound.context) return;
    
    // Resume context if suspended (shouldn't happen after unlock, but just in case)
    if (sound.context.state === 'suspended') {
      sound.context.resume().catch((error) => {
        console.error('[MainGame] Failed to resume audio context for SFX:', error);
      });
      return; // Skip this SFX, will work on next attempt
    }
    
    if (type === 'pickup') {
      // Stop any existing SFX playback to prevent overlap
      if (this.sfxSound && this.sfxSound.isPlaying) {
        this.sfxSound.stop();
      }
      
      // Play the loaded WAV file
      if (this.cache.audio.exists('sfx')) {
        const playedSound = this.sound.play('sfx', {
          volume: 0.8
        });
        if (playedSound && typeof playedSound !== 'boolean') {
          this.sfxSound = playedSound as unknown as Phaser.Sound.WebAudioSound;
        }
      }
    } else if (type === 'win') {
      // Keep the procedural win sound
      const ctx = sound.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      
      // Longer celebratory chord arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1); // C#
      osc.frequency.setValueAtTime(659, now + 0.2); // E
      osc.frequency.setValueAtTime(880, now + 0.3); // A
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  private spawnObject() {
    if (this.isPaused) return;

    const { width } = this.scale;
    const variance = Phaser.Math.FloatBetween(0.9, 1.05);
    const randomCat = Phaser.Utils.Array.GetRandom(CATEGORY_ORDER);
    
    const obj = this.fallingGroup.create(0, -50, `item-${randomCat}`);
    obj.setOrigin(0.5, 0.5); // center origin
    obj.setData('category', randomCat);
    obj.setData('sizeMul', variance);
    // Debug: verify category is set
    if (!obj.getData('category')) {
      console.warn('[spawn] Failed to set category on object');
    }
    this.sizeFallingObject(obj);
    
    const halfWidth = obj.displayWidth / 2;
    const x = Phaser.Math.Between(halfWidth, width - halfWidth);
    obj.x = Phaser.Math.Clamp(x, halfWidth, width - halfWidth);
    
    const fallSpeed = Phaser.Math.Between(200, 350);
    obj.setVelocityY(fallSpeed);
    
    // Recursive timer for random spawn rate
    this.spawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(520, 780),
      callback: this.spawnObject,
      callbackScope: this,
      loop: false
    });
  }

  private handleCollection(player: any, object: any) {
    if (this.isPaused) return;

    const category = object.getData('category') as Category;
    if (!category) {
      console.warn('[catch] No category found on object');
      return;
    }
    
    // Generate correlation ID for this catch event
    const correlationId = `catch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    object.destroy();

    const oldValue = this.scores[category];
    // Increase caught category by 1 (clamp to max 5)
    this.scores[category] = Math.min(this.scores[category] + 1, MAX_SCORE);
    
    // Reset the trade-off category to 0
    const resetCategory = tradeOffReset[category];
    const oldResetValue = this.scores[resetCategory];
    this.scores[resetCategory] = 0;

    // Reduced logging for performance - only log key info
    // console.log(`[MainGame:catch] ${category} caught, score: ${this.scores[category]}/${MAX_SCORE}`);

    // Emit updated scores so HUD reflects changes immediately
    this.emitScores(correlationId);
    this.playSFX('pickup');

    // Check if category reached max (earned)
    if (this.scores[category] >= MAX_SCORE) {
      this.handleEarned(category);
    }
  }

  private emitScores(correlationId?: string) {
    // Create a completely new object with explicit values to ensure React detects the change
    const scoresCopy: GameStats = {
      [Category.Love]: Number(this.scores[Category.Love]) || 0,
      [Category.Passion]: Number(this.scores[Category.Passion]) || 0,
      [Category.Freedom]: Number(this.scores[Category.Freedom]) || 0,
      [Category.Ambition]: Number(this.scores[Category.Ambition]) || 0,
      [Category.Identity]: Number(this.scores[Category.Identity]) || 0,
      [Category.Friendship]: Number(this.scores[Category.Friendship]) || 0,
    };
    // Reduced logging for performance - only log on actual score changes, not every frame
    EventBus.emit(EVENTS.SCORE_UPDATE, scoresCopy);
  }

  private handleEarned(category: Category) {
    this.playSFX('win');
    this.isPaused = true;
    this.physics.pause();
    this.spawnTimer.paused = true;
    EventBus.emit(EVENTS.GAME_OVER, category);
  }

  private handleAudioToggle() {
    this.audioEnabled = !this.audioEnabled;
    
    // Update BGM volume based on audio state
    if (this.bgmSound) {
      if (this.audioEnabled) {
        // Restore volume if not paused, otherwise keep muted
        if (!this.isPaused) {
          (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(0.3);
        }
      } else {
        // Mute BGM
        (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(0);
      }
    }
    
    // Stop any playing SFX if disabling audio
    if (!this.audioEnabled && this.sfxSound && this.sfxSound.isPlaying) {
      this.sfxSound.stop();
    }
  }

  private handlePauseToggle(shouldPause: boolean) {
    this.isPaused = shouldPause;
    if (shouldPause) {
      this.physics.pause();
      this.spawnTimer.paused = true;
      // Mute BGM on pause (only if audio is enabled, otherwise already muted)
      if (this.bgmSound && this.audioEnabled) {
          (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(0);
      }
    } else {
      this.physics.resume();
      this.spawnTimer.paused = false;
      // Restore BGM volume on resume (only if audio is enabled)
      if (this.bgmSound && this.audioEnabled) {
          (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(0.3);
      }
    }
  }

  private handleResume() {
    this.isPaused = false;
    this.physics.resume();
    this.spawnTimer.paused = false;
    this.resetScores();
    // Restore BGM volume on resume (only if audio is enabled)
    if (this.bgmSound && this.audioEnabled) {
        this.bgmSound.volume = 0.3;
    }
  }

  private resetScores() {
    CATEGORY_ORDER.forEach(c => this.scores[c] = 0);
    this.emitScores('reset');
  }

  private resetGame() {
      this.resetScores();
      this.fallingGroup.clear(true, true);
      this.player.setPosition(this.scale.width/2, this.scale.height - 10);
      this.sizePlayer();
      
      if (this.spawnTimer) {
        this.spawnTimer.remove(false);
      }
      this.spawnTimer = this.time.addEvent({
        delay: 650,
        callback: this.spawnObject,
        callbackScope: this,
        loop: false
      });

      this.isPaused = false;
      this.physics.resume();
      
      // Ensure BGM is playing if it was stopped
      if (!this.bgmPlaying) {
          this.startBGM();
      }
  }

  private handleResize(gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number) {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
    
    if (this.player) {
      this.sizePlayer();
      const playerDisplayWidth = this.player.displayWidth;
      const playerHalfWidth = playerDisplayWidth / 2;
      this.player.x = Phaser.Math.Clamp(this.player.x, playerHalfWidth, width - playerHalfWidth);
    }
    
    this.fallingGroup.children.each((child: any) => {
      if (child.active) {
        this.sizeFallingObject(child);
        const objDisplayWidth = child.displayWidth;
        const objHalfWidth = objDisplayWidth / 2;
        child.x = Phaser.Math.Clamp(child.x, objHalfWidth, width - objHalfWidth);
      }
      return true;
    });
  }
}