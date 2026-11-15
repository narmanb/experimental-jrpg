import { BALANCE as B, ROLE_META, ROLES, TACTICS } from './game/config';
import { Game } from './game/engine';
import type { Role, Tactic } from './game/types';
import { drawAlly } from './sprites';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class HUD {
  private editSlot=0;private wasPaused=false;private lastEnemyMarkup='uninitialized';
  constructor(readonly game:Game) {this.mount();this.bind();this.update();}
  private mount():void {
    $('app').innerHTML=`
    <header class="topbar"><a class="brand" href="./" aria-label="Ashglade home"><span class="brand-mark">✦</span><span>ASHGLADE<small>FORMATION FIELD TEST <i>01</i></small></span></a><div class="top-actions"><span class="prototype-tag">PLAYABLE PROTOTYPE</span><button id="landscape-configure" class="icon-button landscape-config" aria-label="Configure formations" title="Configure formations">⚙</button><button id="help-button" class="icon-button" aria-label="How to play" title="How to play">?</button><button id="fullscreen-button" class="icon-button" aria-label="Toggle fullscreen" title="Fullscreen">⛶</button><button id="menu-button" class="icon-button" aria-label="Pause menu" title="Pause · Escape">Ⅱ</button></div></header>
    <main class="game-layout">
      <section class="field" aria-label="Exploration and combat map"><div class="field-heading"><div><span class="eyebrow">THE OVERGROWN WAY</span><span id="area-note">A quiet road. An uneasy silence.</span></div><span class="mode-pill" id="mode-label">EXPLORING</span></div>
      <div class="canvas-wrap"><canvas id="game-canvas" aria-label="Ashglade world map. Walk with WASD or arrows; tap enemies to set priority." tabindex="0"></canvas>
      <div class="field-caption"><span id="field-hint">WASD / ARROWS <b>move</b><span class="hint-divider">·</span> TAP THE PATH <b>walk</b></span><span class="north">N ↑</span></div>
      <div id="joystick" class="joystick" aria-label="Touch movement joystick"><div id="stick-knob"></div></div>
      <div id="shift-banner" class="shift-banner"></div>
      <div id="result-overlay" class="result-overlay" hidden><span class="eyebrow">A LESSON FROM THE GLADE</span><h2>Regroup. Rethink.</h2><p>A timely Lifeline can bring a fallen ally back.</p><button id="retry-button" class="primary-button">Retry encounter</button></div>
      </div><div class="field-status"><span class="status-spark">✧</span><span id="message" role="status">Follow the old road.</span><span id="battle-clock">00:00</span></div></section>
      <aside class="intel-panel"><div class="intel-title"><span class="eyebrow">FIELD NOTES</span><span class="small-diamond">◇</span></div><div class="objective"><span class="objective-number" id="objective-number">01</span><div><h2 id="objective-title">Into the glade</h2><p id="objective-copy">Approach the briarlings on the old road. The whole party will fight automatically.</p></div></div>
      <div class="enemy-section"><div class="section-label"><span>HOSTILES <b id="hostile-count">7</b></span><button id="clear-focus" class="text-button">Clear focus</button></div><div id="enemy-list"></div></div>
      <div class="tactical-section"><div class="section-label"><span>TACTICAL GAUGE</span><b id="charge-label">0 / 5</b></div><div id="charges" class="charges">${Array.from({length:5},()=>'<span><i></i></span>').join('')}</div><p class="gauge-hint">Earned through offense. Spend at a turning point.</p><div id="tactics" class="tactics">${(Object.keys(TACTICS) as Tactic[]).map(k=>{const t=TACTICS[k];return `<button class="tactic-button" data-tactic="${k}" title="${escapeHtml(t.hint)}"><span class="tactic-symbol">${t.icon}</span><span class="tactic-copy"><b>${k==='limit'?'Limit Break':t.name}</b><small>${k==='limit'?'Sola · Emberfall':k==='focus'?'Coordinate · +28% damage':k==='lock'?'Preserve chain · 9 seconds':'Recover · protect · revive'}</small></span><span class="tactic-cost">${t.cost}<i>◆</i></span><kbd>${t.key}</kbd></button>`;}).join('')}</div></div>
      <div class="intel-tip"><span>✦</span><p id="strategy-tip"><b>You set the strategy.</b><br>Your allies take care of the attacks.</p></div></aside>
      <section id="party" class="party" aria-label="Autonomous party">${gamePartyMarkup(this.game)}</section>
      <section class="formation-panel"><div class="formation-heading"><div><span class="eyebrow">FORMATION SHIFT</span><span class="formation-current"><i></i><b id="current-formation">Pressure</b><span>FREE · INSTANT</span></span></div><button id="configure-button" class="text-button" aria-label="Configure formations">⚙ <span>Configure</span></button></div><div id="formations" class="formations">${this.game.formations.map((f,i)=>`<button class="formation-button" data-slot="${i}" aria-label="${i+1} ${f.name}" title="${escapeHtml(f.hint+'. '+f.roles.join(' / '))}"><span class="formation-icon" style="color:${f.color}">${f.icon}</span><span class="formation-copy"><b>${f.name}</b><small>${f.roles.map(r=>ROLE_META[r].short).join(' / ')}</small></span><kbd>${i+1}</kbd></button>`).join('')}</div></section>
    </main><footer class="footer"><span>THREE ALLIES. ONE STRATEGY.</span><span>Original pixel art <i>·</i> No ordinary attack input</span><span>v0.1 · FIELD BUILD</span></footer>
    <div id="start-screen" class="overlay start-overlay"><div class="start-card"><span class="start-emblem">✦</span><span class="eyebrow">AN AUTONOMOUS COMBAT PLAYGROUND</span><h1>ASHGLADE</h1><p class="start-subtitle">Three allies. One strategy.</p><div class="start-rule"></div><p class="start-description">Walk into the wilds. Your allies fight on their own.<br>Change their Roles with a Formation Shift.<br>Watch for a call from beyond the ruins.</p><button id="start-button" class="primary-button">Enter the glade <span>→</span></button><span class="start-footnote">TOUCH & KEYBOARD · NO DOWNLOADS · NO ACCOUNTS</span></div></div>
    <dialog id="menu-dialog" aria-label="Field menu"><button class="dialog-close" data-close aria-label="Close menu">×</button><span class="eyebrow">TAKE A BREATH</span><h2>Field menu</h2><p>The glade waits while this menu is open.</p><button id="resume-button" class="primary-button">Resume exploration / battle</button><button id="reset-encounter" class="menu-option">Reset encounter <span>Try another approach ↻</span></button><button id="reset-demo" class="menu-option">Reset demo <span>Return to the beginning ↻</span></button><div class="combat-log"><span class="eyebrow">RECENT EVENTS</span><div id="log"></div></div></dialog>
    <dialog id="help-dialog" aria-label="How to play"><button class="dialog-close" data-close aria-label="Close help">×</button><span class="eyebrow">A SHORT FIELD GUIDE</span><h2>You’re the tactician.</h2><p>All three companions fight automatically. No Attack button is needed.</p><div class="guide-grid"><p><b>01 · Explore</b>WASD / arrows, tap a destination, or use the touch stick. Approach a visible foe to engage on this map.</p><p><b>02 · Shift</b>Tap six formations or press 1–6. Pressure builds stagger; Onslaught exploits it. Lifeline heals and revives.</p><p><b>03 · Prioritize</b>Tap a foe or its hostile card to focus it for free. Stop the Caller with Weak Point before its signal completes.</p><p><b>04 · Intervene</b>Offense earns five Tactical charges. Q / E / R / F spend 1 / 2 / 2 / 5. Energy stays between fights.</p></div><div class="role-guide">${ROLES.map(r=>`<p><b style="color:${ROLE_META[r].color}">${ROLE_META[r].icon} ${r}</b>${ROLE_META[r].hint}</p>`).join('')}</div><div class="role-guide">${(Object.keys(TACTICS) as Tactic[]).map(k=>`<p><b>${TACTICS[k].name} · ${TACTICS[k].cost} ◆</b>${TACTICS[k].hint}</p>`).join('')}</div><p class="muted">Escape or P pauses. Fullscreen depends on browser support. Menus pause combat. Standing still in defense does not earn energy.</p><button class="primary-button" data-close>Back to the glade</button></dialog>
    <dialog id="workshop-dialog" aria-label="Formation workshop"><button class="dialog-close" data-close aria-label="Close workshop">×</button><span class="eyebrow">MAKE YOUR OWN STRATEGY</span><h2>Formation workshop</h2><p>Choose a slot, then give each companion a Role.</p><label class="select-label">Formation slot<select id="edit-slot">${this.game.formations.map((f,i)=>`<option value="${i}">${i+1} · ${f.name}</option>`).join('')}</select></label><div class="edit-roles">${this.game.party.map((p,i)=>`<label>${p.name}<select id="edit-role-${i}">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select><small id="edit-hint-${i}"></small></label>`).join('')}</div><button id="save-formation" class="primary-button">Save formation</button><p class="muted">Changes last until you reset the demo. Shifts always preserve ATB.</p></dialog>`;
    for(const p of this.game.party){const canvas=$<HTMLCanvasElement>(`portrait-${p.index}`),ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.scale(3,3);drawAlly(ctx,p,12,19,0,false);}
  }
  private bind():void {
    $('formations').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');if(b)this.game.shift(Number(b.dataset.slot));});
    $('tactics').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-tactic]');if(b)this.game.tactic(b.dataset.tactic as Tactic);});
    $('enemy-list').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-enemy]');if(b)this.game.focus(b.dataset.enemy!);});
    $('clear-focus').onclick=()=>this.game.focus(null);
    $('start-button').onclick=()=>{$('start-screen').hidden=true;this.game.paused=false;$('game-canvas').focus();};
    $('menu-button').onclick=()=>this.openDialog('menu-dialog');$('help-button').onclick=()=>this.openDialog('help-dialog');
    const configure=()=>{this.editSlot=this.game.formationIndex;this.loadEditor();this.openDialog('workshop-dialog');};
    $('configure-button').onclick=configure;$('landscape-configure').onclick=configure;
    $('edit-slot').onchange=()=>{this.editSlot=Number($<HTMLSelectElement>('edit-slot').value);this.loadEditor();};
    for(let i=0;i<3;i++)$(`edit-role-${i}`).onchange=()=>this.editorHints();
    $('save-formation').onclick=()=>{
      this.game.formations[this.editSlot].roles=[0,1,2].map(i=>$<HTMLSelectElement>(`edit-role-${i}`).value as Role) as [Role,Role,Role];
      if(this.game.formationIndex===this.editSlot)this.game.shift(this.editSlot);this.closeDialog($<HTMLDialogElement>('workshop-dialog'));
      this.refreshFormations();
    };
    $('fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else this.game.notify('Fullscreen is unavailable here. Add this page to your home screen.');}catch{this.game.notify('Your browser could not enter fullscreen.');}};
    $('resume-button').onclick=()=>this.closeDialog($<HTMLDialogElement>('menu-dialog'));
    $('reset-encounter').onclick=()=>{this.closeDialog($<HTMLDialogElement>('menu-dialog'));this.game.reset('encounter');this.refreshFormations();};
    $('reset-demo').onclick=()=>{this.closeDialog($<HTMLDialogElement>('menu-dialog'));this.game.reset('demo');this.refreshFormations();};
    $('retry-button').onclick=()=>this.game.reset('encounter');
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d=>{
      d.querySelectorAll<HTMLElement>('[data-close]').forEach(b=>b.onclick=()=>this.closeDialog(d));
      d.addEventListener('cancel',e=>{e.preventDefault();this.closeDialog(d);});
      d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.closeDialog(d);}});
    });
  }
  openDialog(id:string):void {if(document.querySelector('dialog[open]')||!$('start-screen').hidden)return;this.wasPaused=this.game.paused;this.game.paused=true;this.game.move={x:0,y:0};$<HTMLDialogElement>(id).showModal();}
  private closeDialog(d:HTMLDialogElement):void {d.close();this.game.paused=this.wasPaused;$('game-canvas').focus();}
  togglePause():void {const d=$<HTMLDialogElement>('menu-dialog');if(d.open)this.closeDialog(d);else this.openDialog('menu-dialog');}
  private loadEditor():void {$<HTMLSelectElement>('edit-slot').value=String(this.editSlot);this.game.formations[this.editSlot].roles.forEach((r,i)=>{$<HTMLSelectElement>(`edit-role-${i}`).value=r;});this.editorHints();}
  private editorHints():void {for(let i=0;i<3;i++)$(`edit-hint-${i}`).textContent=ROLE_META[$<HTMLSelectElement>(`edit-role-${i}`).value as Role].hint;}
  private refreshFormations():void {document.querySelectorAll<HTMLButtonElement>('.formation-button').forEach((b,i)=>{b.querySelector('small')!.textContent=this.game.formations[i].roles.map(r=>ROLE_META[r].short).join(' / ');});}
  update():void {
    const g=this.game,combat=g.mode==='combat',f=g.formations[g.formationIndex];
    $('app').dataset.mode=g.mode;$('mode-label').textContent=combat?'IN COMBAT':g.mode==='defeat'?'PARTY DOWN':g.complete?'GLADE CLEARED':'EXPLORING';
    $('area-note').textContent=combat?'Same ground. A different rhythm.':g.complete?'The old road is quiet again.':'A quiet road. An uneasy silence.';
    $('current-formation').textContent=f.name;
    document.querySelectorAll<HTMLButtonElement>('.formation-button').forEach((b,i)=>{b.classList.toggle('active',i===g.formationIndex);b.setAttribute('aria-pressed',String(i===g.formationIndex));});
    for(const p of g.party){const root=$(`ally-${p.index}`);root.dataset.actions=String(p.actions);root.classList.toggle('down',p.hp<=0);root.querySelector('.role-name')!.textContent=p.role;root.querySelector<HTMLElement>('.role-name')!.style.color=ROLE_META[p.role].color;root.querySelector('.hp-number')!.textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;root.querySelector<HTMLElement>('.hp-fill')!.style.width=`${p.hp/p.maxHp*100}%`;root.querySelector('.action-label')!.textContent=p.hp<=0?'INCAPACITATED':p.labelTime>0?p.label:combat?'AUTONOMOUS':'FOLLOWING';root.querySelector('.buffs')!.textContent=[p.buffs.power?'↑ MIGHT':'',p.buffs.ward?'⬡ WARD':''].filter(Boolean).join(' · ');root.querySelectorAll<HTMLElement>('.atb i').forEach((bar,i)=>{bar.style.width=`${Math.max(0,Math.min(1,p.atb-i))*100}%`;});}
    $('joystick').hidden=combat||g.mode==='defeat';
    $('field-hint').innerHTML=combat?'TAP A FOE <b>free focus</b><span class="hint-divider">·</span> 1–6 <b>shift</b>':'WASD / ARROWS <b>move</b><span class="hint-divider">·</span> TAP THE PATH <b>walk</b>';
    $('battle-clock').textContent=`${Math.floor(g.battleTime/60).toString().padStart(2,'0')}:${Math.floor(g.battleTime%60).toString().padStart(2,'0')}`;
    $('message').textContent=g.messageTime>0?g.message:combat?'All three allies are acting automatically. Change formation to guide them.':g.complete?'All seven hostiles defeated. Open the menu to replay.':'Continue east along the old road. Watch the moving patrols.';
    $('charge-label').textContent=`${Math.floor(g.tactical)} / 5`;$('charges').querySelectorAll<HTMLElement>('i').forEach((bar,i)=>{bar.style.width=`${Math.min(1,Math.max(0,g.tactical-i))*100}%`;});
    document.querySelectorAll<HTMLButtonElement>('[data-tactic]').forEach(b=>{const t=TACTICS[b.dataset.tactic as Tactic],ready=combat&&g.tactical>=t.cost;b.classList.toggle('ready',ready);b.setAttribute('aria-disabled',String(!ready));});
    const enemies=combat?g.enemies.filter(e=>e.hp>0&&(e.engaged||e.alerted)):g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-g.party[0].x,a.y-g.party[0].y)-Math.hypot(b.x-g.party[0].x,b.y-g.party[0].y)).slice(0,3);
    $('hostile-count').textContent=String(combat?enemies.length:g.enemies.filter(e=>e.hp>0).length);
    const enemyIds=enemies.map(e=>e.id).join(',');
    if(enemyIds!==this.lastEnemyMarkup){
      const list=$('enemy-list');
      for(const node of list.querySelectorAll<HTMLElement>('[data-enemy]'))if(!enemies.some(e=>e.id===node.dataset.enemy))node.remove();
      list.querySelector('.quiet-note')?.remove();
      for(const e of enemies)if(!list.querySelector(`[data-enemy="${e.id}"]`))list.insertAdjacentHTML('beforeend',`<button class="enemy-card" data-enemy="${e.id}" aria-label="Focus ${e.name}"><span class="enemy-glyph">${e.kind==='caller'?'♩':e.kind==='brute'?'⬡':'◇'}</span><span class="enemy-details"><span class="enemy-name"><span>${e.name}</span><small></small></span><span class="enemy-health"><i></i></span><span class="enemy-chain"><i></i></span><span class="enemy-state"></span></span><span class="enemy-hp"></span></button>`);
      if(!enemies.length)list.innerHTML='<p class="quiet-note">No hostiles remain.<br>The glade is yours.</p>';
      this.lastEnemyMarkup=enemyIds;
    }
    for(const e of enemies){
      const card=$('enemy-list').querySelector<HTMLButtonElement>(`[data-enemy="${e.id}"]`)!;
      card.classList.toggle('focused',g.focusId===e.id);card.classList.toggle('staggered',e.staggered>0);
      card.querySelector('small')!.textContent=g.focusId===e.id?'◎ PRIORITY':e.alerted?'INCOMING':e.kind==='brute'?'ARMORED':'';
      card.querySelector<HTMLElement>('.enemy-health i')!.style.width=`${e.hp/e.maxHp*100}%`;
      card.querySelector<HTMLElement>('.enemy-chain i')!.style.width=`${e.staggered?e.staggered/B.staggerDuration*100:e.chain}%`;
      card.querySelector('.enemy-state')!.textContent=e.windup?.kind==='call'?`CALLING FOR HELP · ${e.windup.remaining.toFixed(1)}s`:e.windup?.kind==='slam'?'CRUSHING CIRCLE':e.staggered?`STAGGERED · ${e.staggered.toFixed(1)}s · ×2.3`:e.buffs.weak?'WEAKNESS · SLOW':e.chainLock?'CHAIN LOCKED':combat?`CHAIN ${Math.round(e.chain)} / 100`:e.patrol.length?'VISIBLE PATROL':e.kind==='caller'?'SIGNALS REINFORCEMENTS':'ON THE OLD ROAD';
      card.querySelector('.enemy-hp')!.textContent=String(Math.ceil(e.hp));
    }
    const caller=g.enemies.find(e=>e.kind==='caller'&&e.engaged&&e.hp>0),brute=g.enemies.find(e=>e.kind==='brute'&&e.engaged&&e.hp>0);
    $('objective-title').textContent=g.complete?'A quieter glade':caller?'Cut the signal':brute?'Crack the Warden':combat?'Hold the old road':'Into the glade';
    $('objective-number').textContent=g.complete?'✓':caller?'02':brute?'03':'01';
    $('objective-copy').textContent=g.complete?'Every hostile is defeated. Reset the demo to try your own Formations.':caller?'A Caller can alert existing patrols. Weak Point can interrupt its four-second signal.':brute?'Armor resists normal damage. Use Weakness, build stagger, then shift to Onslaught.':combat?'Build stagger with Pressure. Shift to Onslaught when the chain turns gold.':g.victories?'Explore east through Signal Pass. Look for the Caller and its nearby patrol.':'Approach the briarlings on the old road. The whole party will fight automatically.';
    $('strategy-tip').innerHTML=g.formations[g.formationIndex].roles.includes('Guardian')?'<b>Watch the Guardian.</b><br>They move between danger and vulnerable allies.':g.formations[g.formationIndex].roles.includes('Healer')?'<b>Recovery costs momentum.</b><br>Healing restores health while enemy chains decay.':'<b>Pressure, then payoff.</b><br>Breakers build stagger. Strikers keep the chain stable.';
    $('shift-banner').textContent=f.name;$('shift-banner').classList.toggle('show',g.shiftFlash>0.15);
    $('result-overlay').hidden=g.mode!=='defeat';
    if($<HTMLDialogElement>('menu-dialog').open)$('log').innerHTML=g.log.slice(0,8).map(e=>`<p style="color:${e.color}">${escapeHtml(e.text)}</p>`).join('')||'<p>Your journey is just beginning.</p>';
  }
}
function gamePartyMarkup(g:Game):string {return g.party.map(p=>`<article class="ally-card" id="ally-${p.index}" data-actions="0"><canvas id="portrait-${p.index}" width="72" height="66" aria-hidden="true"></canvas><div class="ally-details"><div class="ally-name"><b>${p.name}</b><span class="role-name">${p.role}</span></div><div class="hp-row"><span class="hp-track"><i class="hp-fill"></i></span><span class="hp-number"></span></div><div class="atb" aria-label="Individual ATB">${Array.from({length:3},()=>'<span><i></i></span>').join('')}</div><div class="ally-footer"><span class="action-label">FOLLOWING</span><span class="buffs"></span></div></div></article>`).join('');}
