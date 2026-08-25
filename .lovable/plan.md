# Persist navigation favourites

## Goal
Keep each signed-in user's starred navigation items and tools saved after sign-out, refresh, or switching devices.

## Implementation
- Add an account-scoped favourites table in the backend with row-level access restricted to the signed-in user.
- Update the favourites hook to load and save the user's list in the backend.
- Retain browser storage as an immediate cache and preview-mode fallback, and migrate existing locally saved favourites into the user's account when first loaded.
- Preserve the current sidebar and Tools page behaviour without visual changes.

## Validation
- Verify starring and unstarring updates immediately.
- Verify favourites restore after a reload and a fresh browser session.
- Confirm the app builds without errors.
