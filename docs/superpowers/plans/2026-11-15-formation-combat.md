# Formation Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished, browser-playable autonomous formation RPG playground.
**Architecture:** A deterministic fixed-step simulation independent of the DOM; grid navigation and encounter director; Canvas pixel-art renderer and responsive DOM controls. No runtime dependencies or external assets.
**Tech Stack:** TypeScript, Vite, Canvas 2D, Vitest, Playwright.
**Spec:** `docs/PROJECT_BRIEF.md` (user-supplied design and execution authorization).

## Global Constraints
- Exactly three entirely autonomous allies; six specified Roles, six free Formation slots, preserved ATB on shifts.
- Five Tactical charges earned through effective offense; four specified interventions at 1/2/2/5 charges.
- On-map encounters, existing patrols, interruptible Caller, armored elite, legal role-aware positioning.
- Original programmatic pixel art; desktop and touch; no APIs, accounts, audio/art services or runtime downloads.

## Review Focus
- Portrait and short landscape viewports: controls remain reachable and tap targets visible.
- Defeat, victory, resets and menu: no stuck simulation or stale encounter participants.
- Repeated shifts: preserve ATB, no hard cooldown, interrupt obsolete role decisions.
- Walls and narrow passage: allies reach targets and Guardians protect without teleporting.
- Reinforcements enter just as last hostile dies: pending investigators count toward encounter lifecycle.

### Task 1: Simulation, AI, navigation and encounter director
**Files:** `src/game/{types,config,world,mechanics,ai,engine}.ts`, `tests/combat.test.ts`.
**Interfaces:** `Game` exposes `update(dt)`, `shift(slot)`, `tactic(kind)`, `focus(id)`, `reset(scope)`, `move`, `state`; deterministic `step(seconds)` test helper lives in tests.
- [ ] Write behavioral tests for stagger/lock/stabilization, valid AI, ATB preservation, gauge costs/anti-farming, Caller interruption, patrol merging, Guardian positioning and victory.
- [ ] Run `npm test` and observe missing-feature failures.
- [ ] Implement typed config, tile collision/BFS paths, role actions, combat progression, status/tactics and encounter lifecycle.
- [ ] Run `npm test` until all simulation behaviors pass.
- [ ] Commit the tested simulation.

### Task 2: Playable presentation and input
**Files:** `src/{main,render,hud,input,style}.ts` (style is CSS), `index.html`, `tests/browser.spec.ts`, `playwright.config.ts`.
**Interfaces:** renderer and HUD consume `Game`; browser input invokes its public methods. Canvas maps pointer positions to world positions.
- [ ] Write browser acceptance tests for boot/exploration/engagement, autonomous actions, controls, pause, resets and mobile overflow.
- [ ] Run browser tests to confirm missing presentation failures.
- [ ] Implement original tiled ruins, animated silhouettes, particles/projectiles, telegraphs and target markers; responsive party/formation/tactical HUD and exploration touch stick.
- [ ] Add role explanations, help, editable presets, pause/settings, fullscreen and clear failure feedback.
- [ ] Run `npm run build`, `npm test`, `npm run test:browser`; inspect desktop/portrait/landscape screenshots.
- [ ] Commit playable prototype.

### Task 3: Review, tuning and delivery
**Files:** `README.md`, `DESIGN_NOTES.md`, `.github/workflows/ci.yml`.
- [ ] Exercise complete encounters and all roles/tactics, tune battle timings and fix any defects with regression tests.
- [ ] Document setup, controls, tuning constants, P0/P1/P2 coverage, limitations and next improvements.
- [ ] Run build, type check, simulation and browser suites; obtain whole-project code review and address material findings.
- [ ] Commit final source and provide repository/run instructions and honest validation results.
