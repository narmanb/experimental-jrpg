import { BALANCE as B } from './config';
import type { Actor, Enemy } from './types';
export function tickActor(a: Actor, dt: number): void {
  a.flash=Math.max(0,a.flash-dt); a.labelTime=Math.max(0,a.labelTime-dt); a.rethink-=dt;
  for (const k of Object.keys(a.buffs) as (keyof Actor['buffs'])[]) a.buffs[k]=Math.max(0,a.buffs[k]-dt);
}
export function tickChain(e: Enemy, dt: number): void {
  const locked=e.chainLock>0, stable=e.stabilized>0;
  e.chainLock=Math.max(0,e.chainLock-dt); e.stabilized=Math.max(0,e.stabilized-dt);
  if (e.staggered>0) { e.staggered=Math.max(0,e.staggered-dt); if (!e.staggered) { e.chain=0; e.stabilized=-B.staggerResistance; } return; }
  if (e.stabilized<0) e.stabilized=Math.min(0,e.stabilized+dt);
  if (!locked) e.chain=Math.max(0,e.chain-(stable ? B.stableDecay : B.chainDecay)*dt);
}
export function addChain(e: Enemy, amount: number, stabilize: boolean): boolean {
  if (e.staggered>0) return false;
  const resistance=e.stabilized<0;
  if (stabilize && !resistance) e.stabilized=B.stableTime;
  e.chain=Math.min(B.chainThreshold,e.chain+amount*(resistance ? 0.35 : 1));
  if (e.chain>=B.chainThreshold) { e.staggered=B.staggerDuration; return true; }
  return false;
}
export function newBuffs(): Actor['buffs'] { return { power:0,ward:0,weak:0,slow:0,silence:0 }; }
