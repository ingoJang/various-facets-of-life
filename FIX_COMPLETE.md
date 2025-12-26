# LifeBalance Progress Bar Fix - Complete Solution

## Root Cause

React was not re-rendering because `setStats` was receiving objects that React's shallow comparison couldn't distinguish as new, and the state update wasn't being processed correctly. The fix ensures: (1) a completely new object is created with explicit Number conversions, (2) functional update form `setStats(() => newStatsCopy)` forces React to process the change, (3) all category keys match exactly between Phaser and React, and (4) width values are properly clamped to 0-100%.

## Exact Code Changes

### File: `game/scenes/MainGame.ts`

**Section: `handleCollection` method (around line 271-279)**

```typescript
// Debug log with correlation ID
const scoreIncrease = this.scores[category] - oldValue;
const percentIncrease = (scoreIncrease / MAX_SCORE) * 100;
console.log(`[MainGame:catch:${correlationId}] OBJECT CAUGHT`, {
  caught: category,
  oldValue,
  newValue: this.scores[category],
  scoreIncrease,
  percentIncrease: `${percentIncrease}%`,
  resetCategory,
  oldResetValue,
  updatedScores: { ...this.scores }
});
```

**Section: `emitScores` method (around line 291-308)**

```typescript
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
  const id = correlationId || `emit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[MainGame:emitScores:${id}] EMITTING SCORES`, {
    scoresCopy,
    keys: Object.keys(scoresCopy),
    values: Object.values(scoresCopy),
    objectId: Object.keys(scoresCopy).map(k => `${k}:${scoresCopy[k as Category]}`).join(',')
  });
  EventBus.emit(EVENTS.SCORE_UPDATE, scoresCopy);
  console.log(`[MainGame:emitScores:${id}] EVENT EMITTED`);
}
```

### File: `App.tsx`

**Section: `handleScoreUpdate` function inside useEffect (around line 35-65)**

```typescript
// Listen for events from Phaser
const handleScoreUpdate = (newStats: GameStats) => {
  const correlationId = `react-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[App:handleScoreUpdate:${correlationId}] EVENT RECEIVED`, {
    receivedStats: newStats,
    receivedKeys: Object.keys(newStats),
    receivedValues: Object.values(newStats),
    receivedType: typeof newStats
  });
  
  // Create a completely new object with explicit values to ensure React detects the change
  const newStatsCopy: GameStats = {
    [Category.Love]: Number(newStats[Category.Love]) || 0,
    [Category.Passion]: Number(newStats[Category.Passion]) || 0,
    [Category.Freedom]: Number(newStats[Category.Freedom]) || 0,
    [Category.Ambition]: Number(newStats[Category.Ambition]) || 0,
    [Category.Identity]: Number(newStats[Category.Identity]) || 0,
    [Category.Friendship]: Number(newStats[Category.Friendship]) || 0,
  };
  
  console.log(`[App:handleScoreUpdate:${correlationId}] CALLING setStats`, {
    newStatsCopy,
    keys: Object.keys(newStatsCopy),
    values: Object.values(newStatsCopy),
    isNewObject: newStatsCopy !== newStats,
    objectId: Object.keys(newStatsCopy).map(k => `${k}:${newStatsCopy[k as Category]}`).join(',')
  });
  
  // Use functional update to ensure React processes the change
  setStats(() => newStatsCopy);
  console.log(`[App:handleScoreUpdate:${correlationId}] setStats CALLED`);
};
```

### File: `components/LifeBalance.tsx`

**Section: `useEffect` logging (around line 38-46)**

```typescript
// Log each category's value and computed width
CATEGORY_ORDER.forEach((cat) => {
  const value = Number(stats[cat]) || 0;
  const widthPercent = Math.max(0, Math.min(100, (value / MAX_SCORE) * 100));
  const clampedPercent = Math.max(0, Math.min(100, widthPercent));
  console.log(`[LifeBalance:render:${correlationId}] Category ${cat}:`, {
    value,
    rawPercent: widthPercent,
    clampedPercent: `${clampedPercent}%`,
    isFull: value >= MAX_SCORE,
    willRender: clampedPercent > 0
  });
});
```

**Section: Render method - map function (around line 59-80)**

```typescript
{CATEGORY_ORDER.map((cat) => {
  const value = Number(stats[cat]) || 0; // Ensure value is a number, default to 0
  const isFull = value >= MAX_SCORE;
  const widthPercent = Math.max(0, Math.min(100, (value / MAX_SCORE) * 100));
  const clampedPercent = Math.max(0, Math.min(100, widthPercent));
  const labelImage = categoryLabelImages[cat];
  
  return (
    <div key={cat} className="flex items-center justify-end gap-3 h-8">
      {/* Label - render image dynamically by category */}
      <img
        src={labelImage}
        alt={cat}
        style={{ width: 'auto', height: 'auto', maxWidth: 'none', filter: 'drop-shadow(2px 2px 0 #000)' }}
      />
      
      {/* Bar Container */}
      <div className="relative overflow-hidden w-[220px] h-8 bg-white border-2 border-black shadow-md">
        {/* Fill */}
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-300 ease-out z-10 ${isFull ? 'bg-red-600' : 'bg-black'}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
})}
```

## How to Verify It Worked

### Step 1: Start the application
```bash
npm run dev
```

### Step 2: Open browser console (F12 or Cmd+Option+I)

### Step 3: Catch an object in the game

### Step 4: Expected Console Output Sequence

You should see this exact sequence for each catch:

```
[MainGame:catch:catch-1234567890-abc123] OBJECT CAUGHT {
  caught: "Love",
  oldValue: 0,
  newValue: 1,
  scoreIncrease: 1,
  percentIncrease: "20%",
  resetCategory: "Freedom",
  oldResetValue: 0,
  updatedScores: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 }
}

[MainGame:emitScores:catch-1234567890-abc123] EMITTING SCORES {
  scoresCopy: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
  keys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
  values: [1, 0, 0, 0, 0, 0],
  objectId: "Love:1,Passion:0,Freedom:0,Ambition:0,Identity:0,Friendship:0"
}

[MainGame:emitScores:catch-1234567890-abc123] EVENT EMITTED

[App:handleScoreUpdate:react-1234567891-def456] EVENT RECEIVED {
  receivedStats: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
  receivedKeys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
  receivedValues: [1, 0, 0, 0, 0, 0],
  receivedType: "object"
}

[App:handleScoreUpdate:react-1234567891-def456] CALLING setStats {
  newStatsCopy: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
  keys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
  values: [1, 0, 0, 0, 0, 0],
  isNewObject: true,
  objectId: "Love:1,Passion:0,Freedom:0,Ambition:0,Identity:0,Friendship:0"
}

[App:handleScoreUpdate:react-1234567891-def456] setStats CALLED

[LifeBalance:render:render-1234567892-ghi789] {
  stats: { Love: 1, Passion: 0, Freedom: 0, Ambition: 0, Identity: 0, Friendship: 0 },
  statsKeys: ["Love", "Passion", "Freedom", "Ambition", "Identity", "Friendship"],
  statsValues: [1, 0, 0, 0, 0, 0],
  statsType: "object"
}

[LifeBalance:render:render-1234567892-ghi789] Category Love: {
  value: 1,
  rawPercent: 20,
  clampedPercent: "20%",
  isFull: false,
  willRender: true
}

[LifeBalance:render:render-1234567892-ghi789] Category Passion: {
  value: 0,
  rawPercent: 0,
  clampedPercent: "0%",
  isFull: false,
  willRender: false
}
// ... (similar for other categories)
```

### Step 5: Visual Verification

- **First catch**: Black fill bar should immediately animate to **20% width** (1/5 = 20%)
- **Second catch**: Bar should animate to **40% width** (2/5 = 40%)
- **Third catch**: Bar should animate to **60% width** (3/5 = 60%)
- **Fourth catch**: Bar should animate to **80% width** (4/5 = 80%)
- **Fifth catch**: Bar should animate to **100% width** and turn **red** (5/5 = 100%, full)

### Step 6: Verify Trade-off Reset

- Catch a "Love" object → Love increases by 20%, Freedom resets to 0%
- Check console: `resetCategory: "Freedom"` and `oldResetValue` should be logged

## Key Fixes Applied

1. **Functional State Update**: Changed `setStats(newStatsCopy)` to `setStats(() => newStatsCopy)` to force React to process the update
2. **Explicit Object Creation**: Using `Number()` conversions and explicit object literal to ensure new reference
3. **Proper Clamping**: Added `clampedPercent` variable and used it in style to ensure 0-100% range
4. **Enhanced Logging**: Added detailed logs at each stage with correlation IDs to trace the full flow
5. **Category Key Matching**: All keys use `Category.Love` format (capitalized) consistently

## Files Changed

1. `game/scenes/MainGame.ts` - Enhanced catch logging, explicit Number conversions in emitScores
2. `App.tsx` - Functional update form of setStats, explicit object creation with Number conversions
3. `components/LifeBalance.tsx` - Number conversions, clampedPercent variable, enhanced logging
