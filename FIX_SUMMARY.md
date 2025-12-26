# LifeBalance Progress Bar Fix Summary

## Root Cause

**The `INITIAL_STATS` object in `App.tsx` used lowercase keys (`love`, `passion`, etc.) while the `GameStats` interface and `emitScores()` function use capitalized Category enum keys (`Love`, `Passion`, etc.). This key mismatch caused React to receive score updates with capitalized keys, but the initial state had lowercase keys, creating an inconsistent state object. When `LifeBalance` tried to access `stats[Category.Love]` (which is `stats['Love']`), it couldn't find the value if the state still had lowercase keys, resulting in `undefined` and a 0% width fill bar.**

## Evidence

### File: `App.tsx` (lines 11-18)
```typescript
// BEFORE (WRONG):
const INITIAL_STATS: GameStats = {
  love: 0,        // ❌ lowercase key
  passion: 0,     // ❌ lowercase key
  // ...
};

// File: `game/scenes/MainGame.ts` (lines 284-291)
const scoresCopy: GameStats = {
  [Category.Love]: this.scores[Category.Love],    // ✅ capitalized key ('Love')
  [Category.Passion]: this.scores[Category.Passion], // ✅ capitalized key ('Passion')
  // ...
};
```

### File: `components/LifeBalance.tsx` (line 57)
```typescript
const value = stats[cat] ?? 0;  // cat is Category.Love = 'Love'
// If stats has key 'love' but we access 'Love', value is undefined → defaults to 0
```

## Fix

### 1. `App.tsx` - Fix INITIAL_STATS key mismatch

**Lines 11-18:**
```diff
- const INITIAL_STATS: GameStats = {
-   love: 0,
-   passion: 0,
-   freedom: 0,
-   ambition: 0,
-   identity: 0,
-   friendship: 0,
- };
+ const INITIAL_STATS: GameStats = {
+   [Category.Love]: 0,
+   [Category.Passion]: 0,
+   [Category.Freedom]: 0,
+   [Category.Ambition]: 0,
+   [Category.Identity]: 0,
+   [Category.Friendship]: 0,
+ };
```

### 2. `game/scenes/MainGame.ts` - Add instrumentation to handleCollection

**Lines 248-289:**
```diff
  private handleCollection(player: any, object: any) {
    if (this.isPaused) return;

    const category = object.getData('category') as Category;
    if (!category) {
      console.warn('[catch] No category found on object');
      return;
    }
    
+   // Generate correlation ID for this catch event
+   const correlationId = `catch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
+   
    object.destroy();

+   const oldValue = this.scores[category];
    // Increase caught category by 1 (clamp to max 5)
    this.scores[category] = Math.min(this.scores[category] + 1, MAX_SCORE);
    
    // Reset the trade-off category to 0
    const resetCategory = tradeOffReset[category];
+   const oldResetValue = this.scores[resetCategory];
    this.scores[resetCategory] = 0;

-   // Debug log
-   console.log('[catch]', {
-     caught: category,
-     updatedScores: { ...this.scores }
-   });
+   // Debug log with correlation ID
+   console.log(`[MainGame:catch:${correlationId}]`, {
+     caught: category,
+     oldValue,
+     newValue: this.scores[category],
+     resetCategory,
+     oldResetValue,
+     updatedScores: { ...this.scores }
+   });

    // Emit updated scores so HUD reflects changes immediately
-   this.emitScores();
+   this.emitScores(correlationId);
    // ...
  }
```

### 3. `game/scenes/MainGame.ts` - Add instrumentation to emitScores

**Lines 291-303:**
```diff
- private emitScores() {
+ private emitScores(correlationId?: string) {
    // Create a new object to ensure React detects the change
    const scoresCopy: GameStats = {
      [Category.Love]: this.scores[Category.Love],
      [Category.Passion]: this.scores[Category.Passion],
      [Category.Freedom]: this.scores[Category.Freedom],
      [Category.Ambition]: this.scores[Category.Ambition],
      [Category.Identity]: this.scores[Category.Identity],
      [Category.Friendship]: this.scores[Category.Friendship],
    };
+   const id = correlationId || `emit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
+   console.log(`[MainGame:emitScores:${id}]`, {
+     scoresCopy,
+     keys: Object.keys(scoresCopy),
+     values: Object.values(scoresCopy)
+   });
    EventBus.emit(EVENTS.SCORE_UPDATE, scoresCopy);
  }
```

### 4. `App.tsx` - Add instrumentation to event listener

**Lines 35-51:**
```diff
      const handleScoreUpdate = (newStats: GameStats) => {
+       const correlationId = `react-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
+       console.log(`[App:handleScoreUpdate:${correlationId}]`, {
+         receivedStats: newStats,
+         receivedKeys: Object.keys(newStats),
+         receivedValues: Object.values(newStats),
+         receivedType: typeof newStats
+       });
        // Create a new object to ensure React detects the change
        const newStatsCopy = { ...newStats };
+       console.log(`[App:handleScoreUpdate:${correlationId}] Calling setStats with:`, {
+         newStatsCopy,
+         keys: Object.keys(newStatsCopy),
+         values: Object.values(newStatsCopy),
+         isNewObject: newStatsCopy !== newStats
+       });
        setStats(newStatsCopy);
      };
```

### 5. `components/LifeBalance.tsx` - Add instrumentation to render

**Lines 26-47:**
```diff
export const LifeBalance: React.FC<Props> = ({ stats }) => {
-  // Debug: log stats on render
  React.useEffect(() => {
-    console.log('[HUD] Rendering with stats:', stats);
+    const correlationId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
+    console.log(`[LifeBalance:render:${correlationId}]`, {
+      stats,
+      statsKeys: Object.keys(stats),
+      statsValues: Object.values(stats),
+      statsType: typeof stats
+    });
+    
+    // Log each category's value and computed width
+    CATEGORY_ORDER.forEach((cat) => {
+      const value = stats[cat] ?? 0;
+      const widthPercent = Math.max(0, Math.min(100, (value / MAX_SCORE) * 100));
+      console.log(`[LifeBalance:render:${correlationId}] Category ${cat}:`, {
+        value,
+        widthPercent: `${widthPercent}%`,
+        isFull: value >= MAX_SCORE
+      });
+    });
  }, [stats]);
  // ...
```

## Verification Steps

1. **Start the application:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Catch an object** in the game (move player to catch a falling object)

4. **Expected console output sequence:**

   ```
   [MainGame:catch:catch-1234567890-abc123] {
     caught: "Love",
     oldValue: 0,
     newValue: 1,
     resetCategory: "Freedom",
     oldResetValue: 0,
     updatedScores: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 }
   }
   
   [MainGame:emitScores:catch-1234567890-abc123] {
     scoresCopy: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
     keys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
     values: [1, 0, 0, 0, 0, 0]
   }
   
   [App:handleScoreUpdate:react-1234567891-def456] {
     receivedStats: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
     receivedKeys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
     receivedValues: [1, 0, 0, 0, 0, 0],
     receivedType: "object"
   }
   
   [App:handleScoreUpdate:react-1234567891-def456] Calling setStats with: {
     newStatsCopy: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
     keys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
     values: [1, 0, 0, 0, 0, 0],
     isNewObject: true
   }
   
   [LifeBalance:render:render-1234567892-ghi789] {
     stats: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
     statsKeys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
     statsValues: [1, 0, 0, 0, 0, 0],
     statsType: "object"
   }
   
   [LifeBalance:render:render-1234567892-ghi789] Category Love: {
     value: 1,
     widthPercent: "20%",
     isFull: false
   }
   
   [LifeBalance:render:render-1234567892-ghi789] Category Passion: {
     value: 0,
     widthPercent: "0%",
     isFull: false
   }
   // ... (similar for other categories)
   ```

5. **Visual verification:**
   - The black fill bar for the caught category should **immediately update** to show 20% width (1/5 = 20%)
   - The bar should smoothly animate due to the `transition-[width] duration-300` CSS class
   - Each subsequent catch should increment by another 20% (2/5 = 40%, 3/5 = 60%, etc.)

6. **Catch 5 objects of the same category:**
   - After 5 catches, the bar should be at 100% width
   - The bar should turn red (`bg-red-600`) when full
   - Console should show `isFull: true` for that category

7. **Verify trade-off reset:**
   - Catch a "Love" object → Love should increase, Freedom should reset to 0
   - Check console logs to confirm `resetCategory` and `oldResetValue` are logged correctly

## Key Points

- **Category keys must match exactly**: `Category.Love` = `'Love'` (capitalized), not `'love'`
- **React state updates**: `setStats({ ...newStats })` creates a new object reference, ensuring React detects the change
- **Width calculation**: `(value / MAX_SCORE) * 100` where `MAX_SCORE = 5`, so each catch = +20%
- **Clamp**: `Math.max(0, Math.min(100, ...))` ensures width is always 0-100%
- **Z-index and positioning**: Fill div has `z-10`, `absolute`, `inset-y-0 left-0` - correctly layered above container

## Files Changed

1. `App.tsx` - Fixed INITIAL_STATS keys, added event listener instrumentation
2. `game/scenes/MainGame.ts` - Added correlation ID tracking to catch and emit
3. `components/LifeBalance.tsx` - Added detailed render instrumentation
