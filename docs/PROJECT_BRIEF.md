# Codex Build Prompt: Formation-Based Autonomous RPG Combat Prototype

## Your assignment

Build a **playable, polished vertical-slice prototype** of an original 2D pixel-art RPG combat system. Its central inspiration is the *tempo and strategic role switching* of Final Fantasy XIII, combined with **seamless, on-map battles** reminiscent of Chrono Trigger. **Do not copy either game's art, characters, UI, terminology, music, or proprietary content.** The game must have its own presentation and mechanics.

**This is an implementation request, not just a design-document request.** Inspect the repository, make a concise plan, implement the game, run whatever tests/builds are available, fix problems, and report exactly what works and what remains unfinished. Do not stop after scaffolding or describing ideas.

The central experience should be: **the whole party fights automatically, and the PLAYER manages the battle by changing Formations, selecting priority targets, and occasionally spending a earned Tactical Gauge on impactful interventions.** There should be no mandatory ordinary attack input for any character.

## Platform and engineering defaults

1. First inspect the repository, existing README, package scripts, and project conventions. Reuse any established engine/stack where practical, rather than tearing down a working project.
2. If the repository is empty or contains no suitable game framework, make a **browser-playable, mobile-first HTML5 game** using TypeScript, Vite, and Canvas 2D (or a similarly lightweight, justified stack). It should run on modern Android browsers and desktop browsers. Favor smooth performance on a phone over flashy effects.
3. Include clear run instructions (`npm install`, `npm run dev`, `npm run build` or equivalents) and make the build self-contained. Do not require API keys, accounts, paid assets, servers, or external art packs.
4. All art should be **original**, compact, readable, GBA-era-inspired pixel art: small tiles, distinctive character silhouettes, limited palette, simple frame animations, particle/spell effects. Use hand-authored programmatic sprites/shapes or original repository art. Do not call image-generation services or depend on them.
5. Provide usable touch controls and desktop mouse/keyboard controls. Support narrow phone screens and landscape displays, with scalable UI, a fullscreen option where browsers allow it, and no off-screen controls.
6. Maintain sane organization. Avoid a single giant file if modules are appropriate. Use deterministic/simulatable logic where convenient to test combat AI.
7. No need to implement an RPG campaign, story, leveling tree, equipment economy, dialogue, or saving system yet. **The prototype's purpose is to test whether this combat design is fun.**

## Design vocabulary (use these names consistently)

The six **Roles** are:

| Role | Core combat function | Typical AI behavior |
| --- | --- | --- |
| **Striker** | Reliable damage; stabilizes enemy chain/stagger progress | Selects dangerous/priority targets, lands consistent attacks, reduces chain decay on hit |
| **Breaker** | Builds enemy stagger quickly | Prioritizes attacks/abilities with high stagger contribution and exploits weaknesses |
| **Guardian** | Draws attacks, protects allies, blocks/counters | Repositions between threatening enemies and vulnerable teammates; taunts/intercepts when feasible |
| **Healer** | Heals, cleanses, revives | Prioritizes low-HP or incapacitated allies and avoids exposed positions |
| **Enhancer** | Buffs allies | Applies relevant offensive/defensive buffs, avoids needless rebuffing, stays in reasonable range |
| **Disruptor** | Debuffs enemies and prevents dangerous actions | Applies weakness/slow/silence effects or interrupts enemy windups when possible |

**Formation** = a preconfigured combination of the three party members' Roles.
**Formation Shift** = instant change to another Formation. New role decisions take effect immediately; characters **move into appropriate positions naturally**, without teleporting and without waiting to start all new-role actions until they have arrived.

Do **not** call these systems “Paradigms,” “Commandos,” “Ravagers,” “Synergists,” etc. The user has deliberately chosen original terminology.

## Nonnegotiable combat behavior

### 1. Three autonomous party members

- Exactly three controllable-party members in the initial prototype, with readable health, role, and ATB status.
- **All three act entirely through AI**, including the nominal protagonist. Do not ask the player to pick Attack, spells, or Auto-Battle to make them take their turns.
- Each character has their own segmented, continuously charging **ATB** meter. On reaching an appropriate amount, the AI chooses and executes a suitable action; actions consume segments. Attack/heal/buff/taunt actions must show clear on-map animations and gameplay consequences.
- AI should be responsive rather than perfect. Make sensible target choice, avoid healing at full health, avoid refreshing existing buffs needlessly, prioritize survival when necessary, and avoid actions with no valid targets.
- Combat continues if the player never touches an attack control. Auto-battle should work even when the Tactical Gauge has no energy.

### 2. Formation Shifts are the player's main ongoing input

Show **six easily accessible preset Formation slots**, each with a distinct name and icon/color/role trio. Suggested initial loadout (edit names as useful):

1. **Pressure**: Striker / Breaker / Breaker — fast stagger building.
2. **Onslaught**: Striker / Striker / Breaker — steady offensive damage.
3. **Lifeline**: Striker / Healer / Healer — urgent recovery at an offensive cost.
4. **Bulwark**: Guardian / Healer / Healer — maximum survival, little offense.
5. **Weak Point**: Striker / Breaker / Disruptor — debuffs plus stagger.
6. **Preparation**: Guardian / Enhancer / Disruptor — defensive setup and control.

- Switching should be quick and freely available, **without a hard switch cooldown** in this first version.
- Do not implement a special ATB-refill-on-shift exploit unless explicitly wanted later; normal ATB progress should be preserved in a predictable way through shifts.
- Show an obvious but brief Formation Shift feedback effect. No long unskippable animation.
- Prefer allowing the player to edit the three Roles in each preset using a simple configuration panel, but only after the base game is playable. All six Roles must be exercised in the actual demo.
- A defensive Formation is allowed to sustain the team, but it should give up damage and let enemies' unstabilized stagger progress decay. **Do not add arbitrary healing diminishing returns.**

### 3. Chain / stagger system

- Each enemy has HP and a visible **stagger/chain gauge** with threshold, decay, and a staggered window.
- **Breakers** raise it rapidly. **Strikers** deal more reliable damage and slow chain decay through their hits. Other roles may build a little stagger according to their action.
- If attackers stop pressuring an enemy, gauge progress decays over time. Defensive play costs offensive momentum.
- When an enemy is staggered, clearly convey vulnerability (animation, damage increase, stagger timer). Make it rewarding to shift from chain-building into a damaging Formation.
- The timing and resulting damage should be easy to tune in constants/configuration. Avoid situations where a single Breaker infinitely stuns all enemies or a tanky enemy can never be staggered.

### 4. Tactical Gauge: intermittent direct interventions

- Separate from individual ATB. The player earns **Tactical Gauge energy** during combat, ideally represented as **five charges**.
- Gain most energy by meaningful combat progress: dealing damage, building/staggering an enemy, interrupting a dangerous action, successfully protecting an ally, etc. It must **not** fill just by waiting, and healing/defending alone should not be a repeatable infinite-charge farming loop. Apply rate limits/once-per-event bonuses if needed.
- Implement at least these four skills with visibly different consequences:
  - **Focus Fire** (1 charge): temporarily instruct offensive allies to concentrate on the selected enemy or a sensible threat. (The regular priority-target system below remains free; this version adds a brief damage/coordination benefit.)
  - **Chain Lock** (2 charges): temporarily halt or strongly reduce decay of one enemy's chain gauge.
  - **Emergency Rally** (2 charges): immediate meaningful team recovery/protection, without replacing a dedicated Healer in long fights.
  - **Limit Break** (5 charges): dramatic, costly character-specific finisher or high-impact effect. One character's prototype version is enough to start, but code should allow character-specific variants later.
- Tactical abilities are **not** meant to be spammed every few seconds. Tune charge generation toward occasional intervention, approximately one lower-cost ability every ~15–25 seconds of active, effective combat as an initial *test target*, not an absolute guarantee.
- Tactical buttons must be large and understandable on touchscreens. Ideally, activating them does not pause the battle, though targeting can use a brief intuitive overlay if essential.

### 5. Free priority targeting

- The player can tap/click a visible enemy to set a **Focus Target / priority target** at **no Tactical Gauge cost**.
- Offensive AI generally prefers it but remains smart: the Guardian protects allies, the Healer heals, and Disruptors can interrupt urgent threats.
- Clearly mark the prioritized target. Allow clearing it. Auto-switch away if it dies or becomes unreachable.
- Make a signaling enemy that is calling for reinforcements easy to target quickly.

## Seamless world and intelligent movement

### 6. Combat takes place on the exploration map

- Create a compact original tile-based test area (for example, grassy ruins with a path, trees, walls, and one narrow passage). The player walks around in exploration mode and sees enemies wandering or waiting.
- **No random surprise encounter transitions, battle screen, or teleport to a separate arena.** Approach/contact/engagement with an on-map hostile makes the same visible environment enter combat mode. Controls/UI change, not the world location.
- Companions follow the leader during exploration. When combat begins, they spread out to useful, legal positions on the existing map.
- On victory, the battle HUD fades/hides, the party regroups, and exploration resumes on that very map. The surviving enemy world state should remain coherent.
- During combat, player movement of individual party members is *not* required or expected. Movement is AI-controlled. The player controls tactics, not footsteps.

### 7. Role-aware positioning, especially Guardian protection

- The Guardian should *visibly* try to stand between the most threatening enemy and a vulnerable ally (typically a Healer or Enhancer), considering terrain and collision. This must be **actual behavior**, not just flavor text.
- A Healer should prefer safer nearby positions, a ranged Breaker should seek usable attack range, and Strikers should close to melee range as appropriate.
- On Formation Shift, positions should be reevaluated. A newly assigned Guardian moves to intercept; a newly assigned Healer backs away as it begins healing.
- Avoid jittery constant movement. Use short role-aware goals, hysteresis/cooldowns for selecting destinations, simple tile/grid navigation or steering, collision avoidance, and a reasonable fallback if ideal spots are blocked.
- Make obvious situations that showcase positioning: one narrow approach and a flank/second direction of attack are sufficient.
- Keep technical scope reasonable; do not try to build a universal RTS pathfinding engine.

### 8. Existing patrols can join battles

- Put real visible enemy patrols on the same map, not fabricated spawns solely for combat.
- Patrols can notice an ongoing nearby fight by **line of sight and/or hearing radius**, investigate, then join the active combat without transitioning scenes.
- Once joined, they participate in the same continuous encounter; party ATB, current formation, buffs, enemy chains, and Tactical Gauge **do not reset**.
- Enemies from multiple engagements should merge naturally into a single battle. The original enemy's death must not end the fight while a newly joined enemy is still engaged.
- Keep normal encounters from cascading without bound by limiting alert propagation, sensible detection distances, and/or a clear maximum active hostile count for this prototype.

### 9. Signaling enemies can call reinforcements

- Include at least one **Scout/Caller** enemy who can take a clearly telegraphed **Call for Help** action with a visible windup bar (suggest ~4 seconds, tunable).
- Staggering, silencing, interrupting, or defeating that enemy during the windup prevents the call.
- Successful calls should alert **existing nearby enemies/patrols** where possible, not generate infinite enemies from nothing. A one-time scripted nearby reserve group is acceptable if its source is clearly represented on the map.
- The player should have meaningful responses: priority-target the Caller, switch to a stagger-heavy Formation, use a Disruptor, or spend a Tactical ability at a key moment.
- Clearly show successful vs interrupted calls.

## Opponents and initial playground

Implement at least these readable enemy archetypes:

- **Basic melee creature:** teaches damage and stagger.
- **Scout/Caller:** attempts to signal reinforcements; vulnerable to interrupts.
- **Armored brute / elite:** takes reduced normal damage until debuffed or staggered and telegraphs a dangerous area attack.
- A **small patrol** that can detect and join an existing battle.

A single compact map with 2–3 intentionally placed encounter clusters is better than a sprawling empty area. Design at least one encounter where the Guardian's positioning matters, and one where an approaching patrol changes the situation mid-fight.

If time/complexity allows, add one mini-boss with a clear telegraphed attack and a reason to switch between offense, preparation, and defense. **Do not sacrifice core systems to add the mini-boss.**

## UI / usability

- Make the current Formation, roles, health, ATB bars, chain/stagger, enemies' attack windups, Focus Target, and Tactical Gauge visible without overwhelming a small phone screen.
- Controls should be legible in landscape; support portrait by reflowing or offering a clear rotate-to-landscape layout, without tiny cut-off buttons or horizontal scrolling. Use touch joystick/D-pad for exploration, and large touch targets for Formations and Tactical skills in combat.
- Desktop: WASD/arrows to explore; mouse to target and select; useful keyboard shortcuts for Formation slots and abilities.
- Add a pause/menu control and a reset encounter / reset demo option. Fullscreen button if supported.
- Give feedback for why abilities cannot be used (insufficient charge, unavailable target, etc.). Provide short role/skill tooltips.
- Sound is optional. If included, synthesize simple original effects and provide mute. Do not use copyrighted game audio.

## Feel and balancing goals

- Make **fewer, intentional, visible fights** instead of constant random encounters or 'spam Attack' battles.
- Easy skirmishes should be reasonably quick (initial target: 20–40 seconds); normal fights (45–90 seconds); elites longer. These are rough test targets only.
- Give even normal encounters a tactical decision, but don't require perfect micromanagement every few seconds.
- Make defensive Formations survivable at the expense of attacking and stagger pressure. Do not solve balance by nerfing healing arbitrarily.
- Let the player recognize danger early enough to shift formations; telegraph attacks, calls, and flanking threats.
- Focus priority should not override safety-critical Healer/Guardian AI.
- Positioning, reinforcement mechanics, target selection, and Formation changes should visibly interact. They are not separate gimmicks.

## Implementation priorities (strict)

**P0 — Fully playable core loop (must complete):**
1. Original 2D pixel-art map, exploration, visible enemy, seamless combat start/end.
2. Three independently autonomous allies with ATB and all six functional Roles.
3. Six Formation presets and instant Formation Shift.
4. HP/damage/healing, death/win handling, chain/stagger with distinct Striker vs Breaker value.
5. Touch + desktop UI that fits actual screen sizes.

**P1 — Combat identity (prioritize next):**
6. Role-aware repositioning, visibly protective Guardian, role change while moving.
7. Focus Target without gauge cost.
8. Tactical Gauge with all four listed interventions and anti-farming logic.
9. A Scout with a telegraphed, interruptible call and an existing patrol capable of joining seamlessly.

**P2 — Polish if time permits:**
10. Editable Formation presets, additional enemy patterns, mini-boss, particles/sound, small combat feedback log, tuning overlays.

If the task is too large for one pass, implement the **largest fully working, coherent P0/P1 subset** rather than scattering placeholders across every feature. Mark anything unfinished truthfully. However, actively try to complete P0 and P1; they define the user's intended experience.

## Suggested high-level architecture

Adapt to the existing stack, but favor systems such as:

- `World / Exploration`: map, obstacles, patrol waypoints, entities, navigation.
- `EncounterDirector`: detection, combat participation/merging, reinforcements, victory rules.
- `BattleActor`: stats, ATB, role, buffs/debuffs, stagger state, queued/current actions.
- `RoleAI`: decision scoring and validity checks, target selection, defensive priorities.
- `PositioningAI`: safe position / intercept calculations, pathing, movement smoothing.
- `FormationController`: presets and immediate role reassignment.
- `TacticalController`: gauge accrual/spending, ability effects, anti-farming.
- `UI/HUD`: adaptive viewport and clear feedback.
- `BalanceConfig`: easily tunable timing, gauge values, ranges, damage, health, and AI thresholds.

Use a stable delta-time update loop, explicit game-state transitions, and predictable effect timing. Put player-facing game tuning values in a central file rather than scattering magic numbers.

## Acceptance tests / demo walkthrough

I should be able to launch the game and do each of the following:

1. Walk up to a visible enemy and engage it **without a new battle scene**.
2. Put the controls down and observe **all three allies automatically fighting** with individual ATB actions.
3. Shift between **Pressure**, **Bulwark**, and **Lifeline** during combat; see behaviors and movement change promptly. In particular, watch a new Guardian get between an attacker and an ally.
4. Observe Breakers building stagger and Strikers sustaining pressure; see a staggered enemy take noticeably more damage.
5. Tap an enemy Scout to prioritize it without consuming Tactical Gauge.
6. See the Scout start to call for help, then prevent the call using a relevant attack/debuff/stagger or tactical intervention.
7. In another run, let a call succeed or let a visible patrol discover combat and **join the existing encounter** without resetting the party or transitioning the map.
8. Build Tactical Gauge through meaningful fighting; activate **Focus Fire**, **Chain Lock**, **Emergency Rally**, and a **Limit Break** at the right charge costs. The meter must not be farmable by standing still in pure defense.
9. Defeat the remaining participating enemies, have combat end correctly, and continue walking around the same map.
10. Play the full loop on desktop and on an Android-sized touch viewport. HUD and virtual controls must not obscure the action or be pushed offscreen.

Include basic automated tests where feasible (especially stagger decay/stabilization, gauge spending and anti-farming, valid role action selection, reinforcement call interrupt, and merged encounter lifecycle). At minimum, run the application's build and any available lint/test commands, and fix obvious runtime errors.

## What to deliver

- Actual source code and assets for a **running game prototype**, committed to the repository if the environment permits.
- A short README with setup instructions, controls, and the implemented feature set.
- A brief `DESIGN_NOTES.md` or similar explaining the key mechanics and where to tune them.
- Your final response should list: how to run it; which P0/P1/P2 items are implemented; tests/build results; any honest known limitations; and recommended *specific* next improvements.

## Important final guidance

This prototype is about **watching intelligent allies execute a strategy you choose**, then intervening occasionally at decisive moments. Resist the temptation to turn it into a conventional RPG where the player manually chooses each attack. Also resist building only a combat-menu mockup: it needs moving characters, enemies, consequences, and a repeatable loop. Prioritize feel and clarity over sheer feature count.
