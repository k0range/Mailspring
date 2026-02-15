# Manual Test Plan for CJK Input Fix

## Quick Test Steps

For reviewers and testers who want to quickly verify the fix works:

### 1. Setup
```bash
npm install
npm start
```

### 2. Enable Japanese IME
- **Windows:** Add Japanese IME in Language Settings → 日本語入力
- **macOS:** System Preferences → Keyboard → Input Sources → Add "Hiragana"
- **Linux:** Install ibus-anthy or fcitx-mozc

### 3. Quick Verification Test

1. Click "New Email" in Mailspring
2. Click in the message body area
3. Switch to Japanese IME (Hiragana mode)
4. Type the following sequence: `k` `o` `n` `n` `i` `c` `h` `i` `w` `a`
5. You should see: `こんにちわ` with an underline (composition in progress)
6. Press `Enter` to commit the text
7. **✓ PASS:** Text "こんにちわ" appears correctly
8. **✗ FAIL:** Text jumps, disappears, or characters are missing

### 4. Cancellation Test

1. Type: `k` `o` `r` `e` `w` `a` (don't press Enter)
2. Click anywhere outside the composition dropdown
3. **✓ PASS:** Text is committed automatically ("これわ" appears)
4. **✗ FAIL:** Text disappears or composition gets stuck

### 5. Regression Test

1. Switch back to English keyboard
2. Type: "Hello World"
3. Select "World" and make it bold
4. **✓ PASS:** Everything works normally
5. **✗ FAIL:** Any unexpected behavior

## What to Look For

### Before Fix (Expected Problems)
- Text "jumps back" during composition
- Composition gets interrupted mid-typing
- Final text is incomplete or wrong
- Cursor position gets lost

### After Fix (Expected Behavior)
- Smooth composition without interruption
- Text commits correctly on Enter or selection
- Cursor stays in correct position
- No unexpected behavior with English text

## Debug Console (Development Mode)

If running in dev mode (`npm start`), check console for:
```
[CJK-Fix] compositionstart [object CompositionEvent]
[CJK-Fix] Suppressing onChange during composition
[CJK-Fix] compositionend "こんにちわ"
```

## Common Issues

**Issue:** Composition doesn't start
- **Solution:** Make sure IME is actually active (check system tray/menu bar icon)

**Issue:** No debug logs appear
- **Solution:** Make sure you're running in dev mode (`npm start`, not production build)

**Issue:** Can't test because don't have CJK IME
- **Solution:** Code review is sufficient - the changes are minimal and well-documented

## Testing with Other Languages

Same test procedure works with:
- **Chinese (Simplified):** Use Pinyin IME, type `nihao` → `你好`
- **Chinese (Traditional):** Use Bopomofo IME
- **Korean:** Use Hangul IME, type `ㅎㅏㄴㄱㅡㄹ` → `한글`

## Time Required

- Full test suite: ~10 minutes
- Quick verification: ~2 minutes
- Code review only: ~5 minutes

## Test Results Template

```markdown
### Test Results

**Tester:** [Your Name]
**Date:** [Date]
**OS:** [Windows/macOS/Linux] [Version]
**IME:** [Japanese/Chinese/Korean]

| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic Composition | ✓/✗ | |
| Cancellation | ✓/✗ | |
| Mid-text Composition | ✓/✗ | |
| Rapid Typing | ✓/✗ | |
| Regression (English) | ✓/✗ | |

**Overall:** Pass/Fail
**Additional Notes:**
[Any other observations]
```
