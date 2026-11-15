import { BALANCE as B, COLORS, FORMATIONS, TACTICS } from './config';
import type { Action, Actor, Ally, Effect, Enemy, EnemyKind, FloatingText, Formation, LogEntry, Tactic, Vec, World } from './types';
import { createWorld, distance, isWalkable, lineOfSight, moveActor } from './world';
import { addChain, newBuffs, tickActor, tickChain } from './mechanics';
import { chooseAction, offensiveTarget, positioningGoal } from './ai';

interface Snapshot { party: Ally[]; enemies: Enemy[]; tactical: number; formationIndex: number; firstId: string }
function base(id:string,name:string,x:number,y:number,hp:number): Actor {
  return {id,name,x,y,hp,maxHp:hp,atb:0,buffs:newBuffs(),flash:0,label:'',labelTime:0,path:[],goal:null,rethink:0,actions:0,facing:1};
}
function makeEnemy(id:string,kind:EnemyKind,name:string,x:number,y:number,hp:number,patrol:Vec[]=[]): Enemy {
  return {...base(id,name,x,y,hp),kind,chain:0,stabilized:0,chainLock:0,staggered:0,engaged:false,alerted:false,callUsed:false,windup:null,anchor:{x,y},patrol,waypoint:0,cooldown:1.5};
}
export class Game {
  world: World=createWorld();
  party: Ally[]=['Sola','Iven','Mira'].map((name,i)=>({...base(`ally-${i}`,name,6.5-i*0.8,18.5+i*0.8,B.allyHp[i]),role:FORMATIONS[0].roles[i],color:['#f0a075','#87c7ff','#c5a1ef'][i],index:i}));
  enemies: Enemy[]=[
    makeEnemy('moss-1','mossling','Briarling',12.5,18.5,400),
    makeEnemy('moss-2','mossling','Briarling',14.5,17.5,380),
    makeEnemy('caller','caller','Reed Caller',23.5,15.5,320),
    makeEnemy('brute','brute','Cairn Warden',27.5,10.5,1450),
    makeEnemy('moss-3','mossling','Thornling',25.5,12.5,290),
    makeEnemy('patrol-1','patrol','Roving Fang',23.5,21.5,250,[{x:23.5,y:21.5},{x:20.5,y:16.5},{x:15.5,y:16.5},{x:20.5,y:16.5}]),
    makeEnemy('patrol-2','patrol','Roving Fang',24.5,22.5,250,[{x:24.5,y:22.5},{x:21.5,y:17.5},{x:16.5,y:17.5},{x:21.5,y:17.5}]),
  ];
  formations: Formation[]=structuredClone(FORMATIONS);
  formationIndex=0; mode:'explore'|'combat'|'defeat'='explore'; paused=false;
  time=0; battleTime=0; tactical=0; focusId:string|null=null; coordinatedId:string|null=null; focusTime=0;
  shiftFlash=0; message='Follow the old road. Your companions will follow.'; messageTime=7;
  effects:Effect[]=[]; floats:FloatingText[]=[]; log:LogEntry[]=[];
  move:Vec={x:0,y:0}; destination:Vec|null=null; encounter:Snapshot|null=null;
  victories=0; earned=0; spent=0; stats={damage:0,stagger:0,interrupts:0,protected:0};
  private gaugeBudget=0;
  private intervention=false;
  private noiseTimer=0;
  get activeEnemies():Enemy[] { return this.enemies.filter(e=>e.hp>0&&e.engaged); }
  get complete():boolean { return this.enemies.every(e=>e.hp<=0); }
  notify(text:string,color:string=COLORS.cream):void {
    this.message=text; this.messageTime=4;
    this.log.unshift({text,color,time:this.time}); this.log=this.log.slice(0,24);
  }
  effect(kind:Effect['kind'],a:Vec,color:string,to?:Vec):void {
    const total=kind==='limit'?1.3:kind==='call'?1.2:0.55;
    this.effects.push({...a,kind,color,to:to?{...to}:undefined,life:total,total});
  }
  text(a:Vec,text:string,color:string):void { this.floats.push({...a,text,color,life:1.2}); }
  focus(id:string|null):void {
    if (id===null) {this.focusId=null; return;}
    const e=this.enemies.find(e=>e.id===id&&e.hp>0);
    if (!e) return;
    this.focusId=this.focusId===id ? null : id;
    if (this.focusId) this.notify(`Priority: ${e.name}. Targeting is free.`,COLORS.gold);
  }
  shift(slot:number):void {
    const f=this.formations[slot]; if (!f) return;
    this.formationIndex=slot; this.shiftFlash=0.65;
    this.party.forEach((p,i)=> {p.role=f.roles[i]; p.rethink=0; p.goal=null; p.path=[];});
    this.notify(`Formation Shift · ${f.name}`,f.color);
    this.party.filter(p=>p.hp>0).forEach(p=>this.effect('ring',p,f.color));
  }
  engage(enemy:Enemy):void {
    if (enemy.hp<=0 || enemy.engaged || this.mode==='defeat') return;
    if (this.activeEnemies.length>=B.maxHostiles) { enemy.alerted=false; return; }
    if (this.mode!=='combat') {
      this.encounter={party:structuredClone(this.party),enemies:structuredClone(this.enemies),tactical:this.tactical,formationIndex:this.formationIndex,firstId:enemy.id};
      this.mode='combat'; this.battleTime=0; this.destination=null; this.move={x:0,y:0};
      this.notify('Contact. Your party acts automatically.',COLORS.gold);
    } else this.notify(`${enemy.name} joined the battle!`,COLORS.red);
    enemy.engaged=true; enemy.alerted=false; enemy.rethink=0; enemy.cooldown=enemy.kind==='caller'?2.5:1.7;
    // Only initial nearby sentries join as a cluster. Patrols investigate independently.
    for (const other of this.enemies) {
      if (this.activeEnemies.length>=B.maxHostiles) break;
      if (other!==enemy && other.hp>0 && !other.engaged && distance(other,enemy)<2.9 && lineOfSight(this.world,other,enemy)) {
        other.engaged=true; other.alerted=false; other.cooldown=2.5;
      }
    }
  }
  private gain(amount:number):void {
    if(this.intervention)return;
    const gain=Math.min(amount,this.gaugeBudget,B.maxCharges-this.tactical);
    this.tactical+=Math.max(0,gain); this.earned+=Math.max(0,gain); this.gaugeBudget-=Math.max(0,gain);
  }
  interrupt(e:Enemy):void {
    if (!e.windup) return;
    const call=e.windup.kind==='call'; e.windup=null; e.cooldown=2.5;
    if (call) e.callUsed=true;
    this.stats.interrupts++; this.gain(B.gaugeInterrupt);
    this.text(e,call?'CALL STOPPED':'INTERRUPTED',COLORS.mint);
    this.notify(`${e.name}: ${call?'call':'attack'} interrupted.`,COLORS.mint);
  }
  hitEnemy(e:Enemy,damage:number,chain:number,stable:boolean):void {
    if (e.hp<=0) return;
    let amount=damage;
    if (e.kind==='brute' && !e.buffs.weak && !e.staggered) amount*=0.48;
    if (e.buffs.weak) amount*=1.15;
    if (e.staggered>0) amount*=B.staggerDamage;
    const dealt=Math.min(e.hp,Math.round(amount)); e.hp=Math.max(0,e.hp-dealt); e.flash=0.16;
    this.stats.damage+=dealt;
    const prior=e.chain, stagger=addChain(e,chain,stable);
    this.gain(dealt*B.gaugePerDamage+Math.max(0,e.chain-prior)*B.gaugePerChain);
    this.text(e,String(dealt),e.staggered>0?COLORS.gold:COLORS.cream);
    if (stagger) { this.interrupt(e); this.stats.stagger++; this.gain(B.gaugeStagger); this.effect('ring',e,COLORS.gold); this.notify(`${e.name} STAGGERED · damage ×${B.staggerDamage}`,COLORS.gold); }
    if (e.hp<=0) {
      this.interrupt(e); e.engaged=false; e.alerted=false; this.effect('ring',e,'#a0b19d');
      this.notify(`${e.name} defeated.`,COLORS.mint);
      if (this.focusId===e.id) this.focusId=null;
    }
  }
  tactic(kind:Tactic):boolean {
    const spec=TACTICS[kind];
    if (this.mode!=='combat') {this.notify('Tactical skills are available during combat.');return false;}
    if (this.tactical+0.00001<spec.cost) {this.notify(`${spec.name} needs ${spec.cost} charge${spec.cost>1?'s':''}. Earn energy through offense.`,COLORS.gold);return false;}
    const e=this.enemies.find(e=>e.id===this.focusId&&e.engaged&&e.hp>0)??offensiveTarget(this.party[0],this);
    if (!e && kind!=='rally') {this.notify('No reachable hostile target.');return false;}
    this.tactical-=spec.cost; this.spent+=spec.cost; this.intervention=true;
    switch(kind) {
      case 'focus': this.coordinatedId=e!.id; this.focusTime=B.focusDuration; this.effect('ring',e!,COLORS.red); break;
      case 'lock': e!.chainLock=B.chainLockDuration; this.effect('shield',e!,'#87c7ff'); break;
      case 'rally':
        for (const p of this.party) {p.hp=Math.min(p.maxHp,p.hp+p.maxHp*B.rallyFraction);p.buffs.ward=B.rallyWard;this.effect('heal',p,COLORS.mint);this.text(p,'RALLY',COLORS.mint);} break;
      case 'limit':
        this.effect('limit',this.party[0],COLORS.gold);
        for (const target of [...this.activeEnemies]) {this.interrupt(target);this.hitEnemy(target,B.limitDamage,28,true);this.effect('bolt',this.party[0],COLORS.gold,target);} break;
    }
    this.intervention=false;
    this.notify(`${spec.name}${kind==='limit'?' · Sola’s Limit Break':''}`,COLORS.gold); return true;
  }
  reset(scope:'demo'|'encounter'):void {
    const saved=scope==='encounter'?this.encounter:null;
    if (!saved) { Object.assign(this,new Game()); return; }
    this.party=structuredClone(saved.party);this.enemies=structuredClone(saved.enemies);this.tactical=saved.tactical;
    this.formationIndex=saved.formationIndex;this.mode='explore';this.paused=false;this.effects=[];this.floats=[];this.focusId=null;this.coordinatedId=null;this.focusTime=0;this.gaugeBudget=0;
    this.engage(this.enemies.find(e=>e.id===saved.firstId)!);
    this.notify('Encounter restored. Try a different approach.',COLORS.mint);
  }
  update(dt:number):void {
    if (this.paused || this.mode==='defeat') return;
    dt=Math.max(0,Math.min(dt,0.05));this.time+=dt;this.shiftFlash=Math.max(0,this.shiftFlash-dt);this.messageTime=Math.max(0,this.messageTime-dt);
    this.focusTime=Math.max(0,this.focusTime-dt);this.gaugeBudget=Math.min(0.18,this.gaugeBudget+dt*B.gaugeRateCap);
    this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0);
    this.floats.forEach(f=>f.life-=dt);this.floats=this.floats.filter(f=>f.life>0);
    for (const a of [...this.party,...this.enemies]) tickActor(a,dt);
    for (const e of this.enemies) if(e.hp>0) tickChain(e,dt);
    if (this.focusId && !this.enemies.some(e=>e.id===this.focusId&&e.hp>0)) this.focusId=null;
    if (this.mode==='explore') this.explore(dt); else this.combat(dt);
    this.patrols(dt);
  }
  private explore(dt:number):void {
    const leader=this.party[0],len=Math.hypot(this.move.x,this.move.y);
    if (len>0.1) {
      this.destination=null;const dx=this.move.x/Math.max(1,len)*B.allySpeed*dt,dy=this.move.y/Math.max(1,len)*B.allySpeed*dt;
      if (isWalkable(this.world,leader.x+dx,leader.y,0.22)) leader.x+=dx;
      if (isWalkable(this.world,leader.x,leader.y+dy,0.22)) leader.y+=dy;
      if (Math.abs(dx)>0.001) leader.facing=dx>0?1:-1;
    } else if (this.destination) {
      moveActor(leader,this.destination,B.allySpeed,dt,this.world);
      if (distance(leader,this.destination)<0.2) this.destination=null;
    }
    for (const p of this.party) {
      if (p.hp>0) p.hp=Math.min(p.maxHp,p.hp+dt*10);
      if(p.index>0 && p.hp>0 && distance(p,leader)>1.1+p.index*0.4) moveActor(p,{x:leader.x-p.index*0.55,y:leader.y+p.index*0.5},B.allySpeed*1.1,dt,this.world);
    }
    const seen=this.enemies.find(e=>e.hp>0 && distance(e,leader)<B.aggroRadius && lineOfSight(this.world,e,leader));if(seen)this.engage(seen);
  }
  private patrols(dt:number):void {
    for(const e of this.enemies) {
      if(e.hp<=0||e.engaged)continue;
      if(e.alerted) {
        const leader=this.party.find(p=>p.hp>0);if(!leader)continue;
        moveActor(e,leader,B.enemySpeed*1.3,dt,this.world);
        if(distance(e,leader)<7 && lineOfSight(this.world,e,leader))this.engage(e);
      } else if(e.patrol.length) {
        const point=e.patrol[e.waypoint];moveActor(e,point,0.8,dt,this.world);
        if(distance(e,point)<0.25)e.waypoint=(e.waypoint+1)%e.patrol.length;
        if(this.mode==='combat' && this.activeEnemies.length<B.maxHostiles && this.party.some(p=>p.hp>0&&distance(p,e)<B.hearingRadius)) {
          e.alerted=true;e.rethink=0;this.notify('A visible patrol heard the battle. Incoming!',COLORS.red);this.effect('call',e,COLORS.red);
        }
      }
    }
  }
  private combat(dt:number):void {
    this.battleTime+=dt;this.noiseTimer+=dt;
    for(const p of this.party) {
      if(p.hp<=0)continue;
      p.atb=Math.min(B.atbMax,p.atb+dt*B.atbRate*(p.buffs.slow?0.65:1));
      const goal=positioningGoal(p,this);moveActor(p,goal,B.allySpeed,dt,this.world);
      const action=chooseAction(p,this);if(action)this.execute(p,action);
    }
    // Soft separation keeps silhouettes distinct without forcing actors through terrain.
    for(let i=0;i<this.party.length;i++)for(let j=i+1;j<this.party.length;j++) {
      const a=this.party[i],b=this.party[j],d=distance(a,b);if(a.hp<=0||b.hp<=0||d>=0.65)continue;
      const dx=(d>0.01?(b.x-a.x)/d:0.7)*dt,dy=(d>0.01?(b.y-a.y)/d:0.7)*dt;
      if(isWalkable(this.world,b.x+dx,b.y+dy,0.22)){b.x+=dx;b.y+=dy;}
    }
    for(const e of [...this.activeEnemies])this.enemyTurn(e,dt);
    if(this.party.every(p=>p.hp<=0)){this.mode='defeat';this.notify('Party down. Reset this encounter to try another Formation.',COLORS.red);return;}
    if(!this.activeEnemies.length && !this.enemies.some(e=>e.hp>0&&e.alerted)) {
      this.mode='explore';this.victories++;this.focusId=null;this.focusTime=0;this.coordinatedId=null;
      this.party.forEach(p=>{if(p.hp<=0)p.hp=p.maxHp*0.3;p.path=[];p.rethink=0;});
      this.notify(this.complete?'The glade is clear. Every path is quiet again.':'Victory. Regroup and continue along the old road.',COLORS.mint);
    }
  }
  private execute(p:Ally,a:Action):void {
    const cost=a.kind==='revive'?B.reviveCost:B.actionCost;if(p.atb<cost)return;
    const ally=this.party.find(t=>t.id===a.target),enemy=this.enemies.find(t=>t.id===a.target);
    const target=ally??enemy;if(!target)return;
    const range=a.kind==='strike'?B.meleeRange:a.kind==='guard'?4:B.rangedRange;
    if(distance(p,target)>(ally?B.healRange:range)||!lineOfSight(this.world,p,target))return;
    p.atb-=cost;p.actions++;p.labelTime=0.9;
    const power=(p.buffs.power?1.3:1)*(this.focusTime>0&&enemy?.id===this.coordinatedId?B.focusDamage:1);
    switch(a.kind) {
      case 'strike':p.label='Cut';this.effect('slash',enemy!,p.color);this.hitEnemy(enemy!,B.strikeDamage*power,B.strikeChain,true);break;
      case 'break':p.label='Spark';this.effect('bolt',p,p.color,enemy);this.hitEnemy(enemy!,B.breakDamage*power,B.breakChain,false);break;
      case 'guard':p.label='Intercept';p.buffs.ward=6;enemy!.buffs.slow=3;this.effect('shield',p,COLORS.gold);break;
      case 'heal':{
        p.label='Mend';const amount=Math.min(B.heal,ally!.maxHp-ally!.hp);ally!.hp+=amount;ally!.buffs.slow=0;
        this.effect('heal',ally!,COLORS.mint);this.text(ally!,`+${Math.round(amount)}`,COLORS.mint);break;
      }
      case 'revive':p.label='Rekindle';ally!.hp=ally!.maxHp*B.reviveFraction;ally!.atb=B.reviveAtb;this.effect('heal',ally!,COLORS.mint);this.text(ally!,'REVIVED',COLORS.mint);break;
      case 'enhance':p.label=a.buff==='power'?'Might':'Ward';ally!.buffs[a.buff!]=B.buffDuration;this.effect('shield',ally!,'#c5a1ef');this.text(ally!,p.label,'#c5a1ef');break;
      case 'disrupt':p.label=enemy!.windup?'Silence':'Fracture';this.interrupt(enemy!);enemy!.buffs.silence=B.silenceDuration;enemy!.buffs.weak=14;enemy!.buffs.slow=7;this.effect('bolt',p,'#ee90af',enemy);this.hitEnemy(enemy!,5,8,false);break;
    }
  }
  private enemyTurn(e:Enemy,dt:number):void {
    if(e.staggered>0)return;
    if(e.windup) {
      e.windup.remaining-=dt;
      if(e.windup.remaining<=0) {
        const wind=e.windup;e.windup=null;e.cooldown=e.kind==='brute'?5:2.4;
        if(wind.kind==='call') {
          e.callUsed=true;let n=0;
          for(const reserve of this.enemies)if(reserve.hp>0&&!reserve.engaged&&!reserve.alerted&&distance(e,reserve)<B.callRadius&&this.activeEnemies.length+n<B.maxHostiles){reserve.alerted=true;reserve.rethink=0;n++;}
          this.effect('call',e,COLORS.red);this.notify(n?`Call answered · ${n} existing hostiles are approaching!`:'The call echoes. No reserves remain.',COLORS.red);this.text(e,n?'CALL ANSWERED':'NO RESERVES',COLORS.red);
        } else if(wind.kind==='slam') {
          this.effect('ring',wind,COLORS.red);
          for(const p of this.party)if(p.hp>0&&distance(p,wind)<B.slamRadius)this.hitAlly(p,B.slamDamage,e);
        } else {
          const p=this.party.find(p=>p.id===wind.target&&p.hp>0);if(p&&distance(e,p)<2.3){this.hitAlly(p,e.kind==='patrol'?18:15,e);this.effect('slash',p,COLORS.red);}
        }
      }
      return;
    }
    e.cooldown-=dt*(e.buffs.slow?0.65:1);
    const living=this.party.filter(p=>p.hp>0),guard=living.find(p=>p.role==='Guardian'&&distance(p,e)<5);
    const target=guard??living.sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!target)return;
    if(e.kind==='caller'&&!e.callUsed&&!e.buffs.silence&&e.cooldown<=0) {
      e.windup={kind:'call',remaining:B.callWindup,total:B.callWindup,target:target.id,x:e.x,y:e.y};this.notify('Reed Caller is signaling! Focus it or use a Disruptor.',COLORS.red);return;
    }
    if(e.kind==='brute'&&e.cooldown<=0&&distance(e,target)<4) {
      e.windup={kind:'slam',remaining:B.slamWindup,total:B.slamWindup,target:target.id,x:target.x,y:target.y};this.notify('Cairn Warden · Crushing Circle! Shift to protection.',COLORS.red);return;
    }
    if(distance(e,target)>1.25)moveActor(e,target,B.enemySpeed*(e.buffs.slow?0.7:1),dt,this.world);
    if(e.cooldown<=0&&distance(e,target)<1.7)e.windup={kind:'strike',remaining:0.65,total:0.65,target:target.id,x:target.x,y:target.y};
  }
  private hitAlly(p:Ally,damage:number,enemy:Enemy):void {
    // Protection requires a living Guardian physically between source and ally, or adjacent to ally.
    const guardian=this.party.find(g=>g.hp>0&&g.role==='Guardian'&&g.id!==p.id&&distance(g,p)<3&&distance(g,enemy)<distance(p,enemy)+0.3);
    let amount=damage*(p.buffs.ward?0.65:1)*(p.role==='Guardian'?0.55:1);
    if(guardian){amount*=0.48;this.stats.protected++;this.effect('shield',guardian,COLORS.gold);this.text(p,'COVERED',COLORS.gold);}
    p.hp=Math.max(0,p.hp-Math.round(amount));p.flash=0.18;this.text(p,`−${Math.round(amount)}`,COLORS.red);
    if(p.hp<=0){p.path=[];this.notify(`${p.name} is down. Healers can revive them.`,COLORS.red);}
  }
}
