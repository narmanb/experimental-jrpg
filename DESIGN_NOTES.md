# Ashglade design notes

The player controls strategy while every ordinary action is autonomous. Defensive formations recover health at the cost of offensive momentum; healing has no arbitrary diminishing returns.

## Structure

| File | Responsibility |
| --- | --- |
| `src/game/types.ts` | Actors, Roles, actions, world and effect types |
| `src/game/config.ts` | Main balance constants, formation loadout, Role and skill explanations |
| `src/game/world.ts` | Tile collision, line of sight, legal-position fallback, BFS navigation and movement |
| `src/game/mechanics.ts` | Status timers, ATB-independent actor timers, chain/stagger transitions |
| `src/game/ai.ts` | Valid role actions, priority selection, role-aware movement goals |
| `src/game/engine.ts` | Fixed-step simulation, encounters, patrols, calls, attacks, Tactical economy and resets |
| `src/render.ts`, `src/sprites.ts` | Camera, original tiles/sprites, telegraphs, projectiles and feedback |
| `src/hud.ts`, `src/input.ts` | Responsive HUD, preset editor, keyboard/pointer/touch controls |
| `src/main.ts` | 30 Hz simulation / animation-frame rendering |

The simulation has no browser dependencies. `new Game()` plus `update(1 / 30)` reproduces a scenario. No random rolls influence combat. The development server exposes `window.ashglade` for console-based balance experiments; the production build omits that hook.

## Combat rules and tuning

Most player-facing values live in `BALANCE` in `src/game/config.ts`. Encounter placement, enemy HP, attack cooldowns and map geometry currently live in `engine.ts` / `world.ts`; extracting an encounter data file is an intended next step.

- **ATB:** three segments, 0.64 segments/second. Most actions cost one; revives cost two. AI can accumulate unused segments when no valid action exists. Shifts preserve ATB and statuses, invalidate old movement goals, and make new-role decisions on the next 30 Hz update. No switch cooldown or ATB refill.
- **Roles:** Strikers close to melee and stabilize chain; Breakers attack at range with high chain contribution. Guardians pick an intercept point between a threatening enemy and a living support ally, draw nearby aggression and grant Ward. Healers prioritize revival, then significant injuries/slow cleansing. Enhancers choose missing Might/Ward buffs. Disruptors prioritize live windups before applying Weakness, Slow and Silence.
- **Protection:** allies receive cover only from a living Guardian close enough to them and closer to the source of the attack. Guardians themselves have strong damage reduction and prefer the space between enemies and healers. Terrain and legal grid goals constrain movement. This is geometric soft cover, not a rigid-body simulation.
- **Chain:** threshold 100, normal decay 7.5/second. Striker hits stabilize decay to 1.5/second for 4.2 seconds. Breaker hits add 20 chain, Striker hits add 5. A stagger lasts seven seconds and multiplies damage by 2.3. A short post-stagger buildup resistance prevents an immediate repeat. Chain Lock freezes buildup decay for nine seconds but does not extend stagger.
- **Tactical economy:** starts at zero, carries between encounters, caps at five. Actual damage, chain progress, stagger and interrupts produce energy, limited to 0.065 charges/second with a 0.14-charge burst budget. Waiting and healing award none. Guardian-only defense never generates charges. Tactical effects cannot refund their own energy. Initial target is roughly a low-cost intervention every 15–25 seconds of effective combat; exact cadence varies with formation/armor/target access.
- **Tactical spending:** Focus Fire costs 1 (ten seconds of coordinated targeting and +28% damage); Chain Lock costs 2; Rally costs 2 (29% team HP, revives and six seconds of Ward); Emberfall costs 5 (Sola’s area finisher plus interrupts). Free focus has no damage bonus and does not displace healer/guardian safety priorities. Emberfall’s branch in `Game.tactic` is the extension point for later character-specific finishers.
- **Armor:** the Warden takes 48% normal damage before Weakness or stagger. Weakness both exposes armor and increases damage. Its area attack marks a fixed circle for 2.7 seconds; formations change survival rather than guaranteeing automatic evasion.

## Continuous encounter rules

All seven enemies exist from the beginning. The two roaming Fangs travel explicit patrol routes. Exploration uses proximity plus line of sight; patrols investigate fights within a seven-tile hearing radius. Only patrols propagate hearing alerts, preventing recursive whole-map noise cascades. Calls can alert existing living enemies within thirteen tiles. At most six hostiles participate at once.

Call for Help has a four-second windup, used once per Caller. Disruption, stagger or death interrupts it. Successful calls alert existing world actors instead of generating enemies. Joining a battle preserves party ATB, formation, buffs, chains and Tactical energy. Victory requires no engaged survivors and no living alerted investigators. The party then regroups and passively recovers health in exploration; fallen allies return with partial health.

The starting fight is tuned toward the brief’s short-skirmish target. Nearby patrols can lengthen it into a normal encounter. The Warden is a longer fight that benefits from recovery and debuffs. These are initial values, not playtest-validated balance.

## Presentation and prototype limits

All assets are original hand-authored pixel matrices, tile textures, shapes and particles; nothing is downloaded at runtime. UI uses local system fonts. The map renderer keeps a cached terrain canvas, follows the party, and limits device pixel ratio to two. Short landscape displays use a tactical side rail; portrait stacks controls below the field. Very short portrait displays may scroll vertically to preserve usable buttons; there is no horizontal overflow.

Blocked support targets trigger a route to a usable casting position, unreachable support targets do not suppress other useful healing, and unreachable priority targets clear. Grid navigation is deliberately bounded: four-neighbor BFS, periodic goal selection, legal fallback destinations and soft party separation. There is no universal RTS solver, line-of-fire body blocking, flee command or manual battle movement. AI is readable rather than optimal. Skill visuals resolve with immediate simulation effects and cosmetic projectiles. Touch hints/help are available from the question-mark button; detailed skill explanations also use desktop titles.

No sound, save system, campaign, equipment, separate boss, installed PWA or tuning overlay. Preset edits are session-only. Fullscreen relies on browser support. Real-device Android profiling and additional browser coverage remain to be done.

## Specific next improvements

1. Playtest first-contact and elite scenarios on physical Android hardware; measure tap accuracy, frame pacing, healing time and useful shift cadence.
2. Extract enemy/encounter data and capture a replayable formation-input timeline so balance changes can be compared deterministically.
3. Add distinct elite attack patterns that reward switching between intercept, recovery and offense; measure whether each formation has a useful moment.
4. Give each ally a configurable Limit Break definition, then add optional original synthesized audio with mute.
