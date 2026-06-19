# Selectors changelog

When a platform changes its layout and an adapter breaks, the app surfaces a `SelectorBrokenError` naming the locator that failed plus a screenshot path. Update the relevant `src/main/platforms/<platform>/selectors.ts`, run a scan, and log the fix here.

## Format

```
YYYY-MM-DD · <platform> · <locatorName>
  Before: <old locator strategy>
  After:  <new locator strategy>
  Why:    <what changed on the platform>
```

## Locator strategy guidelines

1. **One file per platform** owns every selector. Don't put raw strings in `list.ts` / `renew.ts` etc.
2. **Priority order**:
   - `getByRole('button', { name: ... })` — survives DOM churn, only breaks on copy change
   - `getByLabel(...)`
   - `getByTestId(...)`
   - `getByText(...)` exact match
   - CSS attribute selector as last resort
3. **Use `.or()` for fragile spots** — chain 2-3 fallbacks. Then `.first()`.
4. **Loud failures**: throw `SelectorBrokenError(platform, step, locatorName)` so the dashboard shows the screenshot.

## Known-fragile spots

### Facebook Marketplace
- **`composer.categoryPicker`** — typeahead overlay; FB shuffles between `combobox` role and `button` role with `category` label.
- **`itemPage.moreActionsButton`** — icon-only three-dot button; aria-label varies (`More options`, `More actions`).
- **`itemPage.markAsAvailable`** — appears as menuitem after the three-dot click; copy occasionally changes.
- **`composer.publishButton`** — sometimes labeled `Post` instead of `Publish`. Now in fallback chain.
- **`composer.nextButton`** — sometimes labeled `Continue`. Now in fallback chain.

### Kijiji
- **`myAds.promoteButton`** — has shipped at least 3 copy variants (`Bump up`, `Promote`, `Repost ad`, `Move to top`). Aria-label fallback covers icon-only renders.
- **`composer.priceInput`** — sometimes a `textbox`, sometimes a `spinbutton`. Both in fallback chain.
- Category cascade — leaf labels can change (e.g., `Couches & Futons` was previously `Sofas, Futons & Loveseats`). Update `src/main/platforms/kijiji/categories.ts` if a path stops resolving.

## Facebook Marketplace

_(no fixes yet)_

## Kijiji

_(no fixes yet)_
