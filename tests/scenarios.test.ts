import { it, expect } from 'vitest';
import { Game } from '../src/game/engine';
import { isWalkable, distance } from '../src/game/world';
const step=(g:Game,n:number)=>{for(let i=0;i<n*30;i++)g.update(1/30);};
it('existing patrols discover a real fight through hearing',()=>{
  const g=new Game();g.engage(g.enemies[0]);step(g,24);
  expect(g.enemies.some(e=>e.kind==='patrol'&&(e.engaged||e.alerted||e.hp<e.maxHp))).toBe(true);
  expect(g.enemies.length).toBe(7);
});
it('a defensive formation allows a real Caller windup to complete',()=>{
  const g=new Game();g.party.forEach((p,i)=>{p.x=21.5;p.y=16.5+i;});g.shift(3);g.engage(g.enemies.find(e=>e.kind==='caller')!);
  step(g,10);expect(g.enemies.find(e=>e.kind==='caller')!.callUsed).toBe(true);
  expect(g.log.some(e=>e.text.includes('Call answered'))).toBe(true);
  expect(g.activeEnemies.length).toBeLessThanOrEqual(6);
});
it('a Guardian actually moves to intercept while healers recover allies',()=>{
  const g=new Game();g.engage(g.enemies[0]);g.shift(3);const guardian=g.party[0],start={x:guardian.x,y:guardian.y};g.party[1].hp=60;
  step(g,5);expect(distance(guardian,start)).toBeGreaterThan(0.5);expect(g.party[1].hp).toBeGreaterThan(60);
  expect(g.party.every(p=>isWalkable(g.world,p.x,p.y,0.15))).toBe(true);
});
it('the armored Warden can be defeated with formation decisions alone',()=>{
  const g=new Game(),brute=g.enemies.find(e=>e.kind==='brute')!;
  g.enemies.forEach(e=>{if(e!==brute)e.hp=0;});g.party.forEach((p,i)=>{p.x=23.5;p.y=10.5+i;});g.engage(brute);
  for(let i=0;i<180*30&&g.mode==='combat';i++){
    const low=g.party.some(p=>p.hp<p.maxHp*0.5),recovered=g.party.every(p=>p.hp>p.maxHp*0.85);
    if(low&&g.formationIndex!==2)g.shift(2);else if(recovered&&g.formationIndex===2)g.shift(4);
    g.update(1/30);
  }
  expect(brute.hp).toBe(0);expect(g.mode).toBe('explore');expect(g.stats.stagger).toBeGreaterThan(0);
});
it('defeat freezes the world and encounter retry restores a playable party',()=>{
  const g=new Game();g.engage(g.enemies[0]);g.party.forEach(p=>{p.hp=0;});step(g,1);expect(g.mode).toBe('defeat');
  const t=g.time;step(g,1);expect(g.time).toBe(t);g.reset('encounter');expect(g.mode).toBe('combat');expect(g.party.every(p=>p.hp>0)).toBe(true);
});
