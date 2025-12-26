// Input adapter for unified keyboard + touch input
export type InputDirection = 'left' | 'right' | 'none';

export interface InputAdapter {
  getDirection(): InputDirection;
  isActionPressed(): boolean;
  cleanup(): void;
}

// Device detection
export const isTouchDevice = (): boolean => {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

// Keyboard input adapter
export class KeyboardInputAdapter implements InputAdapter {
  private leftPressed = false;
  private rightPressed = false;
  private actionPressed = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.leftPressed = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.rightPressed = true;
    } else if (e.key === ' ') {
      this.actionPressed = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.leftPressed = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.rightPressed = false;
    } else if (e.key === ' ') {
      this.actionPressed = false;
    }
  };

  getDirection(): InputDirection {
    if (this.leftPressed) return 'left';
    if (this.rightPressed) return 'right';
    return 'none';
  }

  isActionPressed(): boolean {
    return this.actionPressed;
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

// Swipe input adapter (for touch devices)
export class SwipeInputAdapter implements InputAdapter {
  private direction: InputDirection = 'none';
  private actionPressed = false;
  private container: HTMLElement;
  private startX = 0;
  private startY = 0;
  private minSwipeDistance = 30; // pixels
  private swipeTimeout: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('pointerup', this.handlePointerUp);
    this.container.addEventListener('pointercancel', this.handlePointerUp);
    // Fallback for older browsers
    this.container.addEventListener('touchstart', this.handleTouchStart);
    this.container.addEventListener('touchmove', this.handleTouchMove);
    this.container.addEventListener('touchend', this.handleTouchEnd);
    this.container.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return; // Ignore mouse on touch devices
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.direction = 'none';
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (this.startX === 0 && this.startY === 0) return;
    e.preventDefault(); // Prevent scrolling
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    this.processSwipe(e.clientX, e.clientY);
    this.startX = 0;
    this.startY = 0;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.direction = 'none';
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.startX === 0 && this.startY === 0) return;
    e.preventDefault(); // Prevent scrolling
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      this.processSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    this.startX = 0;
    this.startY = 0;
  };

  private processSwipe(endX: number, endY: number) {
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.minSwipeDistance) return;

    // Determine dominant direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0) {
        this.direction = 'right';
      } else {
        this.direction = 'left';
      }
      // Trigger movement burst (300ms)
      if (this.swipeTimeout) {
        clearTimeout(this.swipeTimeout);
      }
      this.swipeTimeout = window.setTimeout(() => {
        this.direction = 'none';
      }, 300);
    }
  }

  getDirection(): InputDirection {
    return this.direction;
  }

  isActionPressed(): boolean {
    return this.actionPressed;
  }

  cleanup(): void {
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('pointercancel', this.handlePointerUp);
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
    this.container.removeEventListener('touchcancel', this.handleTouchEnd);
    if (this.swipeTimeout) {
      clearTimeout(this.swipeTimeout);
    }
  }
}

