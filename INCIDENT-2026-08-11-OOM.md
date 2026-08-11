# Incident 2026-08-11 — Browser Out of Memory

## Symptom
The PWA loaded and then the browser tab crashed with `Out of Memory`.

## Root cause
Planner Engine V3 rebuilt a long planning horizon for each `planDay()` call. Hot-path scoring repeatedly recomputed future capacity and created temporary date arrays. Dashboard, Today, diagnostics, notifications and cloud-triggered rerenders could invoke the same expensive projection multiple times during startup.

## Fix in 2.0.2
- replace Planner V3 in production with Planner V4;
- cache at most two planning ranges and reuse the projection across Dashboard/Today/Week/Notifications;
- cache future-capacity calculations;
- iterate dates without allocating hot-path date arrays;
- bound allocation loops per calendar window;
- keep only one scheduling authority loaded;
- add runtime render-burst diagnostics;
- add functional regressions for Therapy, BNI, Zion, Tuesday gym and discard-day;
- run a stress regression with Node heap restricted to 64 MB;
- block GitHub Pages deployment if the bounded-memory tests fail.

Planner V3 remains in the repository only as history and is not loaded or cached by the production PWA.
