import './style.css';
import { Game } from './game/engine';
import { HUD } from './hud';
import { Renderer } from './render';
import { bindInput } from './input';
const game=new Game();game.paused=true;
const hud=new HUD(game),renderer=new Renderer(document.getElementById('game-canvas') as HTMLCanvasElement,game);
bindInput(game,hud,renderer);
// Development console for repeatable balance experiments, never required to play.
if(import.meta.env.DEV)Object.assign(window,{ashglade:game});
let last=performance.now(),accumulator=0,hudTime=0;
function frame(now:number):void {
  const dt=Math.min((now-last)/1000,0.1);last=now;accumulator+=dt;
  while(accumulator>=1/30){game.update(1/30);accumulator-=1/30;}
  renderer.draw(dt);hudTime+=dt;if(hudTime>=0.08){hud.update();hudTime=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
