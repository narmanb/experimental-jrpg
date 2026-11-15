import { Game } from './game/engine';
import { HUD } from './hud';
import { Renderer } from './render';
import type { Tactic } from './game/types';
export function bindInput(game:Game,hud:HUD,renderer:Renderer):void {
  const keys=new Set<string>(),canvas=document.getElementById('game-canvas')!,stick=document.getElementById('joystick')!,knob=document.getElementById('stick-knob')!;
  function move():void {game.move={x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};}
  window.addEventListener('keydown',e=>{
    if((e.target as HTMLElement).matches('select,input,textarea')||document.querySelector('dialog[open]'))return;
    const key=e.key.toLowerCase();
    if(key==='escape'||key==='p'){e.preventDefault();hud.togglePause();return;}
    if(game.paused)return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();keys.add(key);move();}
    if(e.repeat)return;
    if(/^[1-6]$/.test(key)){e.preventDefault();game.shift(Number(key)-1);}
    const tactics:Record<string,Tactic>={q:'focus',e:'lock',r:'rally',f:'limit'};if(tactics[key]){e.preventDefault();game.tactic(tactics[key]);}
    if(key==='x')game.focus(null);
  });
  window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());move();});
  window.addEventListener('blur',()=>{keys.clear();game.move={x:0,y:0};});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();game.move={x:0,y:0};hud.openDialog('menu-dialog');}});
  canvas.addEventListener('pointerdown',e=>{
    if(game.paused||game.mode==='defeat')return;
    const enemy=renderer.enemyAt(e.clientX,e.clientY);
    if(enemy){game.focus(enemy.id);if(game.mode==='explore')game.destination={x:enemy.x,y:enemy.y};}
    else if(game.mode==='explore')game.destination=renderer.screenToWorld(e.clientX,e.clientY);
  });
  let pointer:number|null=null;
  function updateStick(e:PointerEvent):void {
    const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),radius=r.width*0.32;
    const x=dx/Math.max(d,radius)*radius,y=dy/Math.max(d,radius)*radius;
    knob.style.transform=`translate(${x}px,${y}px)`;game.move={x:x/radius,y:y/radius};
  }
  stick.addEventListener('pointerdown',e=>{if(game.paused)return;pointer=e.pointerId;stick.setPointerCapture(pointer);updateStick(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)updateStick(e);});
  function release(e:PointerEvent):void {if(e.pointerId!==pointer)return;pointer=null;knob.style.transform='';game.move={x:0,y:0};}
  stick.addEventListener('pointerup',release);stick.addEventListener('pointercancel',release);
}
