# Selectors Changelog

When a platform changes its layout and an adapter breaks, the app surfaces a `SelectorBrokenError` naming the locator that failed plus a screenshot path. Update the relevant `src/main/platforms/<platform>/selectors.ts`, run a scan, and log the fix here.

## Format

```text
YYYY-MM-DD - <platform> - <locatorName>
  Before: <old locator strategy>
  After:  <new locator strategy>
  Why:    <what changed on the platform>
```

## Locator Strategy Guidelines

1. **One file per platform** owns every selector. Do not put raw strings in `list.ts`, `renew.ts`, or other workflow files.
2. **Priority order**:
   - `getByRole('button', { name: ... })` - survives DOM churn and only breaks on copy change.
   - `getByLabel(...)`
   - `getByTestId(...)`
   - `getByText(...)` exact match
   - CSS attribute selector as a last resort
3. **Use `.or()` for fragile spots** - chain 2 to 3 fallbacks, then call `.first()`.
4. **Loud failures**: throw `SelectorBrokenError(platform, step, locatorName)` so the dashboard shows the screenshot.

## Known Fragile Spots

### Facebook Marketplace

- **`composer.categoryPicker`** - typeahead overlay; Facebook shifts between `combobox` role and `button` role with a category label.
- **`itemPage.moreActionsButton`** - icon-only three-dot button; aria-label varies between strings such as `More options` and `More actions`.
- **`itemPage.markAsAvailable`** - appears as a menuitem after the three-dot click; copy occasionally changes.
- **`composer.publishButton`** - sometimes labeled `Post` instead of `Publish`. Keep it in the fallback chain.
- **`composer.nextButton`** - sometimes labeled `Continue`. Keep it in the fallback chain.

### Kijiji

- **`myAds.promoteButton`** - has shipped at least 3 copy variants: `Bump up`, `Promote`, `Repost ad`, and `Move to top`. The aria-label fallback covers icon-only renders.
- **`composer.priceInput`** - sometimes a `textbox`, sometimes a `spinbutton`. Keep both in the fallback chain.
- Category cascade - leaf labels can change. For example, `Couches & Futons` was previously `Sofas, Futons & Loveseats`. Update `src/main/platforms/kijiji/categories.ts` if a path stops resolving.

## Facebook Marketplace

_(no fixes yet)_

## Kijiji

_(no fixes yet)_
