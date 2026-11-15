import { Game } from './game/engine';
import { BALANCE as B, ROLE_META } from './game/config';
import type { Actor, Enemy, Vec } from './game/types';
import { drawAlly, drawEnemy } from './sprites';
import { distance } from './game/world';
const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
export class Renderer {
  private ctx:CanvasRenderingContext2D;
  private width=0;private height=0;private unit=24;private camera:Vec={x:12,y:16};
  private terrain:HTMLCanvasElement;
  constructor(private canvas:HTMLCanvasElement,private game:Game) {
    this.ctx=canvas.getContext('2d',{alpha:false})!;
    this.terrain=document.createElement('canvas');this.paintTerrain();
    new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();
  }
  private resize():void {
    const box=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    this.width=box.width;this.height=box.height;this.canvas.width=Math.round(box.width*dpr);this.canvas.height=Math.round(box.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.imageSmoothingEnabled=false;
    this.unit=Math.max(10,Math.min(this.width/(this.width<600?23:29),this.height/(this.height<260?13.5:18)));
  }
  screenToWorld(x:number,y:number):Vec {
    const r=this.canvas.getBoundingClientRect();return {x:(x-r.left-this.width/2)/this.unit+this.camera.x,y:(y-r.top-this.height/2)/this.unit+this.camera.y};
  }
  enemyAt(x:number,y:number):Enemy|undefined {
    const point=this.screenToWorld(x,y),candidates=this.game.enemies.filter(e=>e.hp>0&&distance(e,point)<Math.max(1,23/this.unit));
    return candidates.sort((a,b)=>distance(a,point)-distance(b,point))[0];
  }
  private paintTerrain():void {
    const w=this.game.world;this.terrain.width=w.width*16;this.terrain.height=w.height*16;
    const c=this.terrain.getContext('2d')!;
    for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++) {
      const type=w.tiles[y][x],n=hash(x,y),px=x*16,py=y*16;
      c.fillStyle=type===3?'#3f726f':n>0.65?'#496b50':n>0.25?'#46664d':'#42634c';c.fillRect(px,py,16,16);
      const road=((y>=18&&y<=20&&x<18)||(x>=14&&x<=24&&y>=15&&y<=17)||(x>=23&&x<=27&&y>=10&&y<=16));
      if(type===0&&road){c.fillStyle=n>0.5?'#869078':'#7b896e';c.fillRect(px,py,16,16);c.fillStyle='#92997c';c.fillRect(px+2+n*4,py+4,6,2);c.fillStyle='#6d7c63';c.fillRect(px+8,py+12,5,1);}
      if(type===0&&!road) {
        for(let i=0;i<4;i++){const ox=Math.floor(hash(x+i,y+2)*14),oy=Math.floor(hash(x+4,y+i)*14);c.fillStyle=i===1?'#5f7b52':'#38583f';c.fillRect(px+ox,py+oy,1,3);c.fillRect(px+ox+1,py+oy+1,2,1);}
        if(n>0.91){c.fillStyle='#c5bb86';c.fillRect(px+7,py+5,2,2);c.fillStyle='#d7a892';c.fillRect(px+9,py+9,1,1);}
      }
      if(type===3){c.fillStyle='#64918a';c.fillRect(px+2,py+5,6,1);c.fillRect(px+9,py+12,4,1);}
      if(type===2){c.fillStyle='#344c40';c.fillRect(px+2,py+6,16,14);c.fillStyle='#69786a';c.fillRect(px,py-4,16,18);c.fillStyle='#90947b';c.fillRect(px,py-4,16,4);c.fillStyle='#526552';c.fillRect(px+1,py+6,14,2);c.fillRect(px+6,py,2,6);c.fillStyle='#769160';c.fillRect(px+11,py-4,5,5);c.fillRect(px+2,py+10,3,4);}
      if(type===1){c.fillStyle='#314b3b';c.fillRect(px-4,py-6,24,24);c.fillStyle='#3b5b42';c.fillRect(px-6,py-11,28,21);c.fillStyle='#496c4a';c.fillRect(px-4,py-15,24,20);c.fillStyle='#54774e';c.fillRect(px,py-17,16,10);c.fillStyle='#5f8051';c.fillRect(px+2,py-15,6,4);}
    }
    // Old stepping stones, sanctuary ring and broken pillars are original geometric pixel art.
    for(const [x,y] of [[5,17],[7,16],[11,14],[21,10],[29,13],[28,8]]) {
      c.fillStyle='#344c42';c.fillRect(x*16-3,y*16+4,18,14);c.fillStyle='#829081';c.fillRect(x*16-4,y*16-4,14,18);c.fillStyle='#adb09a';c.fillRect(x*16-5,y*16-8,16,5);c.fillStyle='#687b64';c.fillRect(x*16-1,y*16+2,2,10);
    }
    c.strokeStyle='#9da386';c.lineWidth=1;c.strokeRect(4*16,18*16,4*16,3*16);
    c.fillStyle='#8a9072';c.fillRect(5*16,21*16,2*16,1);
  }
  draw(dt:number):void {
    const g=this.game,c=this.ctx;if(!this.width||!this.height)return;
    const living=g.party.filter(p=>p.hp>0),anchor=living[0]??g.party[0];
    let wanted={x:anchor.x+2.2,y:anchor.y-0.5};
    if(g.mode==='combat'&&g.activeEnemies.length){const e=g.activeEnemies[0];wanted={x:anchor.x*0.65+e.x*0.35,y:anchor.y*0.65+e.y*0.35};}
    const halfX=this.width/(this.unit*2),halfY=this.height/(this.unit*2);
    wanted.x=Math.max(halfX,Math.min(g.world.width-halfX,wanted.x));wanted.y=Math.max(halfY,Math.min(g.world.height-halfY,wanted.y));
    this.camera.x+=(wanted.x-this.camera.x)*Math.min(1,dt*5);this.camera.y+=(wanted.y-this.camera.y)*Math.min(1,dt*5);
    c.fillStyle='#314d3f';c.fillRect(0,0,this.width,this.height);
    c.save();c.translate(Math.round(this.width/2-this.camera.x*this.unit),Math.round(this.height/2-this.camera.y*this.unit));c.scale(this.unit/16,this.unit/16);
    c.drawImage(this.terrain,0,0);
    this.worldLabel('THE OLD ROAD',8.5,16,'#d6d6b3');this.worldLabel('SIGNAL PASS',21,13,'#d6d6b3');this.worldLabel('WARDEN’S COURT',27,8,'#d6d6b3');
    if(g.destination&&g.mode==='explore'){c.strokeStyle='#e1c58c';c.lineWidth=0.8;c.strokeRect(g.destination.x*16-3,g.destination.y*16-3,6,6);}
    for(const e of g.activeEnemies)if(e.windup?.kind==='slam'){
      const p=1-e.windup.remaining/e.windup.total;c.fillStyle=`rgba(235,116,88,${0.12+p*0.14})`;c.strokeStyle='#ee9a7e';c.lineWidth=1.2;c.beginPath();c.arc(e.windup.x*16,e.windup.y*16,B.slamRadius*16,0,Math.PI*2);c.fill();c.stroke();
      c.beginPath();c.arc(e.windup.x*16,e.windup.y*16,B.slamRadius*16*p,0,Math.PI*2);c.stroke();
    }
    const actors:Actor[]=[...g.enemies.filter(e=>e.hp>0),...g.party];actors.sort((a,b)=>a.y-b.y);
    for(const a of actors){
      c.fillStyle='rgba(19,34,29,.34)';c.beginPath();c.ellipse(a.x*16,a.y*16+1,'kind'in a&&a.kind==='brute'?12:7,3,0,0,Math.PI*2);c.fill();
      if('role'in a) {
        const p=g.party.find(p=>p.id===a.id)!;
        c.strokeStyle=ROLE_META[p.role].color;c.lineWidth=0.8;c.beginPath();c.ellipse(p.x*16,p.y*16+1,8,3,0,0,Math.PI*2);c.stroke();
        if(p.buffs.ward){c.fillStyle='#c7c184';c.fillRect(p.x*16-8,p.y*16-18,2,3);}
        drawAlly(c,p,p.x*16,p.y*16,g.time,p.path.length>0||(g.mode==='explore'&&p.index===0&&(g.move.x!==0||g.move.y!==0)));
      }else{
        const e=a as Enemy;if(e.id===g.focusId||e.id===g.coordinatedId&&g.focusTime>0)this.targetMarker(e);
        drawEnemy(c,e,e.x*16,e.y*16,g.time);this.enemyBars(e);
      }
      if(a.flash>0){c.fillStyle=`rgba(255,243,201,${a.flash*2})`;c.fillRect(a.x*16-6,a.y*16-14,12,12);}
      if(a.labelTime>0){c.font='5px monospace';c.textAlign='center';c.fillStyle='#dbe6d2';c.fillText(a.label,a.x*16,a.y*16-25);}
    }
    for(const e of g.effects){const t=1-e.life/e.total,x=e.x*16,y=e.y*16;c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=1.2;c.globalAlpha=Math.min(1,e.life*3);
      if(e.kind==='bolt'&&e.to){const px=x+(e.to.x*16-x)*Math.min(1,t*2),py=y-8+(e.to.y*16-y)*Math.min(1,t*2);c.fillRect(px-2,py-2,4,4);c.fillRect(px-5,py,2,1);}
      else if(e.kind==='slash'){c.beginPath();c.moveTo(x-8+t*16,y-17);c.lineTo(x+8-t*8,y-2);c.stroke();}
      else if(e.kind==='heal'){for(let i=0;i<4;i++){const px=x-9+i*6,py=y-4-t*22+Math.sin(i)*5;c.fillRect(px-2,py,5,1);c.fillRect(px,py-2,1,5);}}
      else if(e.kind==='shield'){c.strokeRect(x-10-t*3,y-19-t*4,20+t*6,22+t*5);}
      else {const radius=e.kind==='limit'?10+t*100:e.kind==='call'?5+t*45:4+t*16;c.beginPath();c.arc(x,y-6,radius,0,Math.PI*2);c.stroke();if(e.kind==='limit'){for(let i=0;i<16;i++){const angle=i*Math.PI/8+t*2;c.fillRect(x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,3,6);}}}
      c.globalAlpha=1;
    }
    for(const f of g.floats){c.globalAlpha=Math.min(1,f.life*2);c.font=f.text.length>6?'bold 5px monospace':'bold 7px monospace';c.textAlign='center';c.fillStyle='#243b32';c.fillText(f.text,f.x*16+0.7,f.y*16-21-(1.2-f.life)*16+0.7);c.fillStyle=f.color;c.fillText(f.text,f.x*16,f.y*16-21-(1.2-f.life)*16);c.globalAlpha=1;}
    // Fireflies stay deterministic, sparse and inexpensive.
    for(let i=0;i<16;i++){const x=3+hash(i,1)*33,y=3+hash(i,2)*20;c.globalAlpha=0.25+Math.sin(g.time*1.4+i)*0.2;c.fillStyle='#e1dba0';c.fillRect(x*16+Math.sin(g.time*0.3+i)*5,y*16+Math.cos(g.time*0.4+i)*4,1,1);}c.globalAlpha=1;
    c.restore();
    const vignette=c.createRadialGradient(this.width/2,this.height/2,this.height*0.2,this.width/2,this.height/2,this.width*0.7);vignette.addColorStop(0,'#132b2200');vignette.addColorStop(1,'#10271e66');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);
    this.minimap();
    if(g.shiftFlash>0){c.fillStyle=`rgba(204,234,209,${g.shiftFlash*0.11})`;c.fillRect(0,0,this.width,this.height);}
  }
  private worldLabel(text:string,x:number,y:number,color:string):void {const c=this.ctx;c.globalAlpha=0.45;c.font='4px monospace';c.textAlign='center';c.fillStyle=color;c.fillText(text,x*16,y*16);c.globalAlpha=1;}
  private targetMarker(e:Enemy):void {
    const c=this.ctx,x=e.x*16,y=e.y*16-8,pulse=Math.sin(this.game.time*5)*1.2;c.strokeStyle='#f3d290';c.lineWidth=1;c.beginPath();c.ellipse(x,y+10,12+pulse,5,0,0,Math.PI*2);c.stroke();c.fillStyle='#f3d290';c.beginPath();c.moveTo(x-3,y-23);c.lineTo(x+3,y-23);c.lineTo(x,y-19);c.fill();
  }
  private enemyBars(e:Enemy):void {
    const c=this.ctx,x=e.x*16,y=e.y*16-(e.kind==='brute'?29:21);
    if(!e.engaged){if(e.alerted){c.fillStyle='#ef9b7b';c.font='bold 8px monospace';c.textAlign='center';c.fillText('!',x,y);}return;}
    const width=e.kind==='brute'?36:27;c.fillStyle='#263c32';c.fillRect(x-width/2-1,y-1,width+2,7);c.fillStyle='#dd8e75';c.fillRect(x-width/2,y,width*(e.hp/e.maxHp),2);
    c.fillStyle=e.staggered>0?'#f2d18b':'#a3c5cf';c.fillRect(x-width/2,y+4,width*(e.staggered>0?e.staggered/B.staggerDuration:e.chain/B.chainThreshold),1);
    if(e.chainLock){c.strokeStyle='#86bfe8';c.strokeRect(x-width/2-1,y+3,width+2,3);}
    if(e.windup){const w=e.windup; c.fillStyle='#26352c';c.fillRect(x-25,y-11,50,8);c.fillStyle='#f1b190';c.fillRect(x-24,y-5,48*(1-w.remaining/w.total),2);c.font='4px monospace';c.textAlign='center';c.fillStyle='#ffdeb2';c.fillText(w.kind==='call'?'CALL FOR HELP':w.kind==='slam'?'CRUSHING CIRCLE':'ATTACK',x,y-6);}
    if(e.buffs.weak){c.fillStyle='#eaa5c0';c.fillRect(x+width/2+2,y,2,4);}
  }
  private minimap():void {
    const c=this.ctx,g=this.game,scale=this.width<500?1.5:1.8,x=this.width-g.world.width*scale-14,y=16;
    c.fillStyle='#1b302bd9';c.fillRect(x-5,y-5,g.world.width*scale+10,g.world.height*scale+10);
    for(let ty=0;ty<g.world.height;ty++)for(let tx=0;tx<g.world.width;tx++){c.fillStyle=g.world.tiles[ty][tx]?'#607665':'#354e3f';c.fillRect(x+tx*scale,y+ty*scale,scale,scale);}
    for(const e of g.enemies)if(e.hp>0){c.fillStyle=e.kind==='caller'?'#edcc85':e.engaged?'#ef9a86':'#b08e75';c.fillRect(x+e.x*scale-1,y+e.y*scale-1,2.5,2.5);}
    c.fillStyle='#a8dfbc';c.fillRect(x+g.party[0].x*scale-1,y+g.party[0].y*scale-1,3,3);
  }
}
