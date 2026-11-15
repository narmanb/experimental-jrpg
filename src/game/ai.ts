import { BALANCE as B } from './config';
import type { Game } from './engine';
import type { Action, Ally, Enemy, Vec } from './types';
import { distance, legalNear, lineOfSight, pathTo, canReach } from './world';
export function offensiveTarget(a: Ally, g: Game): Enemy | undefined {
  const enemies=g.enemies.filter(e=>e.engaged && e.hp>0 && canReach(g.world,a,e));
  const forced=g.enemies.find(e=>e.id===(g.focusTime>0 ? g.coordinatedId : g.focusId) && e.engaged && e.hp>0 && canReach(g.world,a,e));
  return forced ?? enemies.sort((a1,b)=>distance(a,a1)-distance(a,b) + (a1.kind==='caller' ? -1.5 : 0) - (b.kind==='caller' ? -1.5 : 0))[0];
}
export function chooseAction(a: Ally, g: Game): Action | null {
  if (a.hp<=0) return null;
  const reachable=(p:Ally)=>canReach(g.world,a,p);
  const friends=g.party.filter(p=>p.hp>0), target=offensiveTarget(a,g);
  switch (a.role) {
    case 'Striker': return target ? {kind:'strike',target:target.id} : null;
    case 'Breaker': return target ? {kind:'break',target:target.id} : null;
    case 'Guardian': return target && (target.buffs.slow<=0 || !a.buffs.ward) ? {kind:'guard',target:target.id} : null;
    case 'Healer': {
      const down=g.party.find(p=>p.hp<=0&&reachable(p)); if (down) return {kind:'revive',target:down.id};
      const hurt=friends.filter(reachable).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0];
      if (hurt && (hurt.hp<hurt.maxHp-26 || hurt.buffs.slow>0)) return {kind:'heal',target:hurt.id};
      return null;
    }
    case 'Enhancer': {
      const available=friends.filter(reachable);
      const power=available.find(p=>(p.role==='Striker'||p.role==='Breaker') && p.buffs.power<2);
      if (power) return {kind:'enhance',target:power.id,buff:'power'};
      const ward=available.find(p=>p.buffs.ward<2); if (ward) return {kind:'enhance',target:ward.id,buff:'ward'};
      const other=available.find(p=>p.buffs.power<2); return other ? {kind:'enhance',target:other.id,buff:'power'} : null;
    }
    case 'Disruptor': {
      const urgent=g.enemies.find(e=>e.engaged && e.hp>0 && e.windup && e.buffs.silence<=0);
      if (urgent) return {kind:'disrupt',target:urgent.id};
      const exposed=g.enemies.find(e=>e.engaged && e.hp>0 && e.buffs.weak<2);
      return exposed ? {kind:'disrupt',target:exposed.id} : null;
    }
  }
}
export function guardianGoal(a: Ally, g: Game): Vec {
  const living=g.party.filter(p=>p.id!==a.id && p.hp>0);
  const vulnerable=living.sort((x,y)=>(x.role==='Healer'||x.role==='Enhancer' ? -2:0)-(y.role==='Healer'||y.role==='Enhancer' ? -2:0)+x.hp/x.maxHp-y.hp/y.maxHp)[0];
  const threat=g.enemies.filter(e=>e.engaged&&e.hp>0).sort((x,y)=>distance(x,vulnerable??a)-distance(y,vulnerable??a))[0];
  if (!vulnerable || !threat) return a;
  const d=distance(threat,vulnerable)||1, reach=Math.min(2,d*0.5);
  return legalNear(g.world,{x:vulnerable.x+(threat.x-vulnerable.x)/d*reach,y:vulnerable.y+(threat.y-vulnerable.y)/d*reach});
}
export function positioningGoal(a: Ally,g:Game): Vec {
  if (a.role==='Guardian') return guardianGoal(a,g);
  const action=chooseAction(a,g),allyTarget=g.party.find(p=>p.id===action?.target);
  if(allyTarget && (distance(a,allyTarget)>B.healRange-0.5 || !lineOfSight(g.world,a,allyTarget))) {
    // Keep a useful casting destination while rounding a wall; don't drift back to enemy spacing.
    if(a.goal && distance(a.goal,allyTarget)<=B.healRange-0.5 && lineOfSight(g.world,a.goal,allyTarget))return a.goal;
    const route=pathTo(g.world,a,allyTarget);
    return route.find(point=>distance(point,allyTarget)<=B.healRange-0.5 && lineOfSight(g.world,point,allyTarget))??a;
  }
  const enemy=offensiveTarget(a,g); if (!enemy) return a;
  const d=distance(a,enemy), ranged=a.role!=='Striker';
  const desired=ranged ? 4.2+(a.index*0.35) : 1.0;
  if (Math.abs(d-desired)<0.65 && lineOfSight(g.world,a,enemy)) return a;
  const dx=(a.x-enemy.x)/(d||1),dy=(a.y-enemy.y)/(d||1);
  const goal=legalNear(g.world,{x:enemy.x+dx*desired,y:enemy.y+dy*desired+(a.index-1)*0.65});
  if(allyTarget && (distance(goal,allyTarget)>B.healRange-0.5 || !lineOfSight(g.world,goal,allyTarget)))return a;
  return goal;
}
