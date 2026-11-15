# Verification record

Verified in the provided Linux workspace on 2026-11-15 with Node 24 and Chromium.

- `npm test`: **25 passing** simulation/scenario tests. Includes an entire seven-hostile expedition with exploration, Formation decisions and naturally earned Limit Break energy; no ordinary attack inputs or injected charges.
- `npm run build`: passes strict TypeScript and Vite production compilation. Static HTML/CSS/JS only; about 79 KB of generated source files, about 26 KB gzipped.
- `npm run test:browser`: **8 passing** real Chromium tests. Keyboard engagement, autonomous actions, instant Role changes, menu/reset, preset editing, caller targeting during HUD updates and touch movement/shift are covered.
- Layouts checked at **390×844, 844×390, 568×320, 667×375 and 1280×900**. Formation/Tactical buttons and their names remain inside the tested viewport/button bounds. Also tested an Android-sized **412×915** mobile/touch context.
- Production bundle smoke check on Vite Preview: exploration → combat, Guardian/Pressure shifts, autonomous actions and encounter retry; **zero page errors and zero external network requests**. Development console hook is absent in production.
- `npm audit --omit=dev --audit-level=high`: no runtime vulnerabilities (no runtime dependencies).
- CI repeats the simulation tests, production build and Chromium browser suite using Node 24.

## Independent review and fixes

A separate reviewer read the full simulation, rendering, input, HUD, tests and documentation. Two Important findings were reproduced with failing regressions and fixed:

1. Wall-separated revival could leave a Healer idle forever. Support actors now navigate to a usable line-of-sight/range position; unreachable fallen allies do not block healing reachable injuries.
2. Narrow landscape labels overlapped and a Tactical button could fall below the viewport. A compact rail/formation layout now passes actual text and button-bound checks at 568×320 and 667×375.

A post-stagger timer defect was also reproduced and fixed with a dedicated recovery timer. Unreachable free priority targets now clear and offensive allies choose accessible foes; a regression encloses one target while leaving another reachable. Stable hostile-card identity is regression-tested while the Caller winds up and patrols join.

## Review decisions and limits

- The connected demo map has no naturally permanently inaccessible enemy. An explicitly blocked-map test verifies unreachable targeting; this is not a claim of a universal pathfinding solution.
- Guardian cover uses documented geometric proximity/interposition and actual damage reduction, rather than full body collision. This scope keeps the prototype small; more demanding terrain could require stronger geometry.
- Very short portrait viewports can scroll vertically to preserve touch targets. Tested landscape controls remain in view; arbitrary screen sizes are not certified.
- Chromium emulation is not physical Android hardware validation. Safari/Firefox coverage and device performance remain open.
- Balance and visual presentation are initial prototype judgments, awaiting human playtesting.

No independent second review was run after fixes; their failing regressions and the complete green suites verify the fixes. Audio, a separate mini-boss, saving/campaign systems and an in-game tuning overlay are intentionally absent.
