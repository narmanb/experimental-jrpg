import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/engine';
import { tickChain, addChain } from '../src/game/mechanics';
import { chooseAction, guardianGoal } from '../src/game/ai';
import { pathTo, isWalkable } from '../src/game/world';

const advance = (g: Game, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 30) g.update(1 / 30); };
const fight = () => { const g = new Game(); g.engage(g.enemies[0]); return g; };

describe('autonomous formations', () => {
  it('all three allies act without any player attack input', () => {
    const g = fight(); advance(g, 10);
    for (const actor of g.party) expect(actor.actions).toBeGreaterThan(0);
    expect(g.enemies[0].hp).toBeLessThan(g.enemies[0].maxHp);
  });
  it('shifts immediately preserve every individual ATB value', () => {
    const g = fight(); g.party.forEach((p, i) => { p.atb = 0.45 + i * 0.6; });
    const before = g.party.map(p => p.atb); g.shift(3); g.shift(2);
    expect(g.party.map(p => p.atb)).toEqual(before);
    expect(g.party.map(p => p.role)).toEqual(['Striker', 'Healer', 'Healer']);
  });
  it('healers idle at full health and prioritize incapacitated allies', () => {
    const g = fight(); g.shift(2);
    expect(chooseAction(g.party[1], g)?.kind).not.toBe('heal');
    g.party[0].hp = 0;
    expect(chooseAction(g.party[1], g)).toMatchObject({ kind: 'revive', target: g.party[0].id });
  });
  it('enhancers avoid refreshing active buffs and disruptors interrupt urgent calls', () => {
    const g = fight(); g.shift(5); g.party.forEach(p => { p.buffs.power = 10; p.buffs.ward = 10; });
    expect(chooseAction(g.party[1], g)).toBeNull();
    const scout = g.enemies.find(e => e.kind === 'caller')!; g.engage(scout);
    scout.windup = { kind: 'call', remaining: 3, total: 4, target: g.party[0].id, x: scout.x, y: scout.y };
    expect(chooseAction(g.party[2], g)).toMatchObject({ kind: 'disrupt', target: scout.id });
  });
  it('guardian chooses a legal position between danger and a healer', () => {
    const g = fight(); g.shift(3);
    g.enemies[0].x = 13; g.enemies[0].y = 17;
    g.party[1].x = 8; g.party[1].y = 17;
    g.party[2].hp = 0;
    const goal = guardianGoal(g.party[0], g);
    expect(goal.x).toBeGreaterThan(8); expect(goal.x).toBeLessThan(13);
    expect(isWalkable(g.world, goal.x, goal.y)).toBe(true);
  });
});

describe('stagger and tactical economy', () => {
  it('striker stabilization reduces decay and Chain Lock stops it', () => {
    const e = new Game().enemies[0]; e.chain = 60; tickChain(e, 1); const decay = 60 - e.chain;
    e.chain = 60; addChain(e, 0, true); tickChain(e, 1);
    expect(60 - e.chain).toBeLessThan(decay);
    e.chain = 60; e.chainLock = 5; tickChain(e, 1); expect(e.chain).toBe(60);
  });
  it('threshold staggers, amplifies damage and eventually restores the enemy', () => {
    const g = fight(); const e = g.enemies[0];
    addChain(e, 120, false); expect(e.staggered).toBeGreaterThan(0);
    const hp = e.hp; g.hitEnemy(e, 10, 0, false); expect(hp - e.hp).toBeGreaterThan(10);
    tickChain(e, 10); expect(e.staggered).toBe(0); expect(e.chain).toBe(0);
  });
  it('waiting and healing never generate Tactical energy', () => {
    const g = new Game(); advance(g, 45); expect(g.tactical).toBe(0);
    g.engage(g.enemies[0]); g.shift(3); g.party.forEach(p => { p.hp = p.maxHp / 2; });
    const energy = g.tactical; advance(g, 8); expect(g.tactical).toBe(energy);
  });
  it('charges earn through offense, stay capped, and cannot be spent without a target', () => {
    const g = fight(); advance(g, 18); expect(g.tactical).toBeGreaterThan(0.5);
    g.tactical = 5; expect(g.tactic('focus')).toBe(true); expect(g.tactical).toBe(4);
    expect(g.tactic('lock')).toBe(true); expect(g.tactical).toBe(2);
    expect(g.tactic('limit')).toBe(false); expect(g.tactical).toBe(2);
    expect(g.tactic('rally')).toBe(true); expect(g.tactical).toBe(0);
    g.tactical = 5; expect(g.tactic('limit')).toBe(true); expect(g.tactical).toBe(0);
    g.mode = 'explore'; g.tactical = 5; expect(g.tactic('focus')).toBe(false); expect(g.tactical).toBe(5);
  });
  it('free focus never spends energy and clears dead targets', () => {
    const g = fight(); g.tactical = 2; g.focus(g.enemies[0].id); expect(g.tactical).toBe(2);
    g.enemies[0].hp = 0; advance(g, 0.2); expect(g.focusId).not.toBe(g.enemies[0].id);
  });
});

describe('continuous encounter lifecycle', () => {
  it('a joining patrol preserves ATB, buffs, formation, chain and gauge', () => {
    const g = fight(); g.shift(4); g.tactical = 2.3; g.party[0].atb = 1.2; g.party[0].buffs.ward = 12;
    g.enemies[0].chain = 45; const next = g.enemies.find(e => e.kind === 'patrol')!; g.engage(next);
    expect(g.party[0].atb).toBe(1.2); expect(g.party[0].buffs.ward).toBe(12);
    expect(g.enemies[0].chain).toBe(45); expect(g.tactical).toBe(2.3); expect(g.formationIndex).toBe(4);
    for (const e of g.enemies) if (e.id !== next.id) e.hp = 0;
    advance(g, 0.2); expect(g.mode).toBe('combat');
  });
  it('silence interrupts a call before it can alert reserves', () => {
    const g = fight(); const caller = g.enemies.find(e => e.kind === 'caller')!; g.engage(caller);
    caller.windup = { kind: 'call', remaining: 1, total: 4, target: g.party[0].id, x: caller.x, y: caller.y };
    g.interrupt(caller); expect(caller.windup).toBeNull(); expect(caller.callUsed).toBe(true);
    expect(g.log.some(e => e.text.includes('interrupted'))).toBe(true);
  });
  it('a completed call alerts existing living reserves rather than creating enemies', () => {
    const g = fight(); const caller = g.enemies.find(e => e.kind === 'caller')!; g.engage(caller);
    const count = g.enemies.length;
    caller.windup = { kind: 'call', remaining: 0.01, total: 4, target: g.party[0].id, x: caller.x, y: caller.y };
    advance(g, 0.1); expect(g.enemies.length).toBe(count);
    expect(g.enemies.some(e => e.kind === 'patrol' && (e.alerted || e.engaged))).toBe(true);
  });
  it('victory returns to the same map and reset encounter restores its participants', () => {
    const g = fight(); const world = g.world; const ids = g.enemies.filter(e => e.engaged).map(e => e.id);
    g.enemies.forEach(e => { e.hp = 0; e.alerted = false; }); advance(g, 0.1);
    expect(g.mode).toBe('explore'); expect(g.world).toBe(world);
    g.reset('encounter'); expect(g.enemies.filter(e => ids.includes(e.id)).every(e => e.hp > 0)).toBe(true);
  });
  it('grid paths cross the narrow passage and never enter walls', () => {
    const g = new Game(); const path = pathTo(g.world, { x: 15.5, y: 13.5 }, { x: 22.5, y: 13.5 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.every(p => isWalkable(g.world, p.x, p.y))).toBe(true);
    expect(path.some(p => Math.floor(p.x) === 18 && p.y >= 15 && p.y < 18)).toBe(true);
  });
});
