# CJK Input Fix Documentation

## Problem Description

When using IME (Input Method Editor) for CJK (Chinese, Japanese, Korean) input in Mailspring's rich text composer, users experienced issues where:

1. IME composition was interrupted mid-input
2. Composition text would "jump back" or disappear
3. The final committed text would sometimes be missing characters
4. The caret position would be lost during composition

### Root Cause

The issue occurred because:
- React state updates during IME composition would cause the editor to re-render
- Re-rendering would reset the DOM, breaking the browser's native IME composition flow
- The `contentEditable` element's innerHTML was being replaced during composition
- This interrupted the IME's internal state and confused the composition UI

## Solution

The fix implements a **composition-aware state management** pattern:

### 1. Global Composition Tracking (`patch-chrome-ime.ts`)

```typescript
let isComposing = false;
export function getIsComposing() {
  return isComposing;
}

document.addEventListener('compositionstart', e => {
  isComposing = true;
});

document.addEventListener('compositionend', e => {
  isComposing = false;
});
```

**Why:** Document-level event listeners capture all composition events reliably, and a centralized flag allows any component to check composition state without duplicating listeners.

### 2. State Update Suppression (`composer-editor.tsx`)

```typescript
onChange = (change) => {
  if (!this._mounted) return;
  
  // Don't update state during IME composition
  if (getIsComposing()) {
    return;
  }
  
  this.props.onChange(change);
};
```

**Why:** Preventing state updates during composition allows the browser to handle the IME flow natively. The final text will be committed when composition ends, and then the state can be updated.

### 3. DOM Update Prevention (`tokenizing-contenteditable.tsx`)

```typescript
shouldComponentUpdate(nextProps) {
  // Don't update innerHTML during composition
  if (this._isComposing) {
    return false;
  }
  // ... normal update logic
}

onCompositionEnd = (e) => {
  this._isComposing = false;
  // Update with final composition text
  const value = e.target.innerText;
  this._tokensEl.innerHTML = this.valueToHTML(value);
  this.props.onChange(value);
};
```

**Why:** Direct innerHTML manipulation during composition breaks the IME flow. We defer updates until composition completes.

## Testing Instructions

### Prerequisites

1. Build Mailspring in development mode:
   ```bash
   npm install
   npm start
   ```

2. Enable a CJK input method:
   - **Japanese:** Install Japanese IME (Windows: 日本語入力, macOS: Hiragana)
   - **Chinese:** Install Pinyin or Bopomofo IME
   - **Korean:** Install Hangul IME

### Test Cases

#### Test 1: Basic Composition
1. Open composer (New Email)
2. Click in the message body
3. Switch to Japanese IME (Hiragana mode)
4. Type: `k` `o` `r` `e` `w` `a`
5. **Expected:** You should see the composition underline and suggestions
6. Press `Enter` to commit or `Space` to convert
7. **Expected:** Text should appear correctly without jumping or disappearing

#### Test 2: Composition Cancellation
1. Start composing as in Test 1
2. Type: `k` `o` `r` `e` `w` `a` (don't press Enter)
3. Click outside the composition dropdown to cancel
4. **Expected:** The text should be committed even without explicit Enter press
5. **Note:** The patch in `patch-chrome-ime.ts` handles this case

#### Test 3: Mid-Text Composition
1. Type some English text: "Hello "
2. Switch to Japanese IME
3. Type: `n` `i` `h` `o` `n`
4. Convert and commit
5. Type more English: " World"
6. **Expected:** Result should be "Hello にほん World" without any glitches

#### Test 4: Rapid Typing
1. Switch to Japanese IME
2. Rapidly type a long phrase without pausing: `konnichiwagenki desuka`
3. Convert and commit
4. **Expected:** All characters should appear correctly, no characters should be dropped or duplicated

#### Test 5: Selection During Composition
1. Type some text first
2. Select a portion of it
3. Start IME composition (this will replace selection)
4. Type and commit
5. **Expected:** Selection should be replaced cleanly with composed text

#### Test 6: Composition with Auto-Save
1. Start composing Japanese text
2. Wait for auto-save to trigger (usually happens after typing pauses)
3. Continue composing
4. **Expected:** Auto-save should not interrupt composition

### Checking Debug Logs

In development mode, open Developer Tools (Ctrl+Shift+I / Cmd+Opt+I) and check console:

```
[CJK-Fix] compositionstart [object CompositionEvent]
[CJK-Fix] Suppressing onChange during composition
[CJK-Fix] compositionend "これは"
```

### Regression Testing

Verify non-CJK input still works:
1. Type regular English text - should work normally
2. Copy/paste - should work normally
3. Bold/italic formatting - should work normally
4. Undo/redo - should work normally

## Technical Details

### Event Flow During Composition

**Without Fix:**
```
compositionstart
  → Slate onChange fires
  → React re-renders
  → DOM is replaced
  → ❌ Composition breaks

compositionupdate (multiple times)
  → onChange fires each time
  → ❌ Continuous re-renders break IME

compositionend
  → Final text may not commit properly
```

**With Fix:**
```
compositionstart
  → isComposing = true
  → Slate onChange is suppressed ✓

compositionupdate (multiple times)
  → onChange still suppressed ✓
  → Browser handles IME natively ✓

compositionend
  → isComposing = false
  → Final text is in DOM
  → Next onChange will commit to state ✓
```

### Why This Approach Works

1. **Non-invasive:** Uses existing event listeners in `patch-chrome-ime.ts`
2. **Centralized:** One source of truth for composition state
3. **Minimal changes:** Only affects behavior during active composition
4. **Compatible:** Works with Slate's existing event handling
5. **Safe:** Doesn't break non-CJK input workflows

## Files Modified

- `app/src/components/composer-editor/patch-chrome-ime.ts` - Added composition state tracking
- `app/src/components/composer-editor/composer-editor.tsx` - Suppress onChange during composition  
- `app/internal_packages/thread-search/lib/tokenizing-contenteditable.tsx` - Prevent DOM updates during composition

## Known Limitations

1. **Slate Version:** This fix works with Slate 0.45.x. If Mailspring upgrades to Slate 0.50+, composition handling may need adjustment as it's a major rewrite.

2. **Selection Restoration:** If a complex selection exists when composition starts, it may not be perfectly restored. The browser generally handles this well, but edge cases may exist.

3. **Plugin Interactions:** Some composer plugins that observe onChange may not see events during composition. This is intentional and shouldn't cause issues for most plugins.

## Future Improvements

1. **More Comprehensive Logging:** Add detailed event sequence logging for better debugging
2. **Automated Tests:** Create automated tests using Puppeteer to simulate IME input
3. **Selection Preservation:** Add explicit selection save/restore if needed
4. **Plugin API:** Expose composition state to plugins that need to know when composition is active

## References

- [MDN: CompositionEvent](https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent)
- [Slate Issue #5108](https://github.com/ianstormtaylor/slate/issues/5108)
- [Chrome beforeinput Changes](https://chromestatus.com/feature/5719926371868672)
