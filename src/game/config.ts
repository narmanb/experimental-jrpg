import type { Formation, Role, Tactic } from './types';
export const BALANCE = {
  atbMax: 3, atbRate: 0.64, actionCost: 1, reviveCost: 2,
  allyHp: [300, 255, 265], allySpeed: 3.25, enemySpeed: 1.65,
  strikeDamage: 21, breakDamage: 9, breakChain: 20, strikeChain: 5,
  chainThreshold: 100, chainDecay: 7.5, stableDecay: 1.5, stableTime: 4.2,
  staggerDuration: 7, staggerDamage: 2.3, staggerResistance: 2,
  heal: 43, reviveFraction: 0.38, buffDuration: 18, silenceDuration: 6,
  chainLockDuration: 9, focusDuration: 10, focusDamage: 1.28,
  rallyFraction: 0.29, rallyWard: 6, limitDamage: 135,
  gaugePerDamage: 0.0015, gaugePerChain: 0.001, gaugeStagger: 0.14,
  gaugeInterrupt: 0.12, gaugeRateCap: 0.065, gaugeBurstCap: 0.14, maxCharges: 5,
  meleeRange: 1.4, rangedRange: 6, healRange: 7,
  aggroRadius: 4.1, hearingRadius: 7, callRadius: 13, maxHostiles: 6,
  callWindup: 4, slamWindup: 2.7, slamRadius: 2.7, slamDamage: 51,
  repathTime: 0.65, reviveAtb: 1.0,
} as const;
export const ROLES: Role[] = ['Striker', 'Breaker', 'Guardian', 'Healer', 'Enhancer', 'Disruptor'];
export const ROLE_META: Record<Role, { color: string; short: string; icon: string; hint: string }> = {
  Striker: { color: '#f2aa75', short: 'STR', icon: '◆', hint: 'Consistent melee damage. Stabilizes chain so it decays slowly.' },
  Breaker: { color: '#87c7ff', short: 'BRK', icon: '✦', hint: 'Ranged sparks rapidly build enemy stagger.' },
  Guardian: { color: '#e4c574', short: 'GRD', icon: '⬡', hint: 'Intercepts enemies, taunts, and reduces nearby allies’ damage.' },
  Healer: { color: '#8bdfb0', short: 'HLR', icon: '+', hint: 'Heals injuries, cleanses slow, and revives fallen allies.' },
  Enhancer: { color: '#c5a1ef', short: 'ENH', icon: '↑', hint: 'Grants Might and Ward. Does not refresh healthy buffs.' },
  Disruptor: { color: '#ee90af', short: 'DIS', icon: '⌁', hint: 'Interrupts windups; inflicts Silence, Slow and armor-breaking Weakness.' },
};
export const FORMATIONS: Formation[] = [
  { name: 'Pressure', icon: '✦', color: '#88c8ed', roles: ['Striker','Breaker','Breaker'], hint: 'Build stagger quickly' },
  { name: 'Onslaught', icon: '◆', color: '#f0a075', roles: ['Striker','Striker','Breaker'], hint: 'Exploit a staggered foe' },
  { name: 'Lifeline', icon: '+', color: '#8bdfb0', roles: ['Striker','Healer','Healer'], hint: 'Recover while holding pressure' },
  { name: 'Bulwark', icon: '⬡', color: '#e4c574', roles: ['Guardian','Healer','Healer'], hint: 'Survive; sacrifice chain pressure' },
  { name: 'Weak Point', icon: '⌁', color: '#ee90af', roles: ['Striker','Breaker','Disruptor'], hint: 'Interrupt calls; expose armor' },
  { name: 'Preparation', icon: '↑', color: '#c5a1ef', roles: ['Guardian','Enhancer','Disruptor'], hint: 'Protect, strengthen and disrupt' },
];
export const TACTICS: Record<Tactic, { name: string; cost: number; key: string; icon: string; hint: string }> = {
  focus: { name: 'Focus Fire', cost: 1, key: 'Q', icon: '◎', hint: '10s coordinated offense: all attackers focus one target and deal +28% damage. Ordinary targeting is always free.' },
  lock: { name: 'Chain Lock', cost: 2, key: 'E', icon: '◇', hint: 'Freeze the selected enemy’s chain decay for 9s. Does not extend a stagger window.' },
  rally: { name: 'Emergency Rally', cost: 2, key: 'R', icon: '+', hint: 'Restore 29% team health, revive fallen allies, and grant 6s of Ward.' },
  limit: { name: 'Emberfall', cost: 5, key: 'F', icon: '✶', hint: 'Sola’s Limit Break: a sweeping ember strike against all engaged enemies; interrupts windups.' },
};
export const COLORS = { cream: '#ece6cf', mint: '#93d9ba', red: '#ef8a7e', gold: '#e7c77c' };
