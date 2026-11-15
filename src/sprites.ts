import type { Ally, Enemy } from './game/types';
const hero = [
  '......hhhh......','.....hhhhhh.....','.....hssss......','.....ssess......',
  '......sss.......','....ccbbcc......','...ccbbbbcc.....','...scbbbbcs.....',
  '...s.bbbb.s.....','.....bbbbb......','.....bbbbb......','.....ddddd......',
  '.....dd.dd......','.....dd.dd......','....kkk.kkk.....',
];
const moss = [
  '....ll....ll....','...llgllllgll...','..llggggggggll..','..lggggggggggl..',
  '..gggeggggeggg..','...gggggggggg...','...gggsssgggg...',
  '....gggggggg....','...gggggggggg...','...kkk....kkk...',
];
const caller = [
  '......pp........','.....pppp.......','....pppppp......','.....ssee.......',
  '......ss........','.....cccc..gg...','....cccccssgg...',
  '....scccc..gg...','.....cccc.......','.....cccc.......','.....dd.dd......','....kkk.kkk.....',
];
const brute = [
  '.....rrrrrr.....','...rrrrrrrrrr...','..rrllllllrrrr..','..rlllellellrr..',
  '..rrlllllllrrr..','.rrrrllllllrrrr.','rrrbbbbbbbbbrrrr','rrrbbbbbbbbbrrrr',
  '.rrbbbbbbbbbrrr.','..rbbbbbbbbbr...','..rrbbbbbbbrr...','...rrrbbbrrr....',
  '...rrr...rrr....','..rrrr...rrrr...',
];
export function drawBitmap(ctx:CanvasRenderingContext2D, bitmap:string[], palette:Record<string,string>,x:number,y:number,scale=1):void {
  for(let j=0;j<bitmap.length;j++)for(let i=0;i<bitmap[j].length;i++) {
    const color=palette[bitmap[j][i]];if(!color)continue;ctx.fillStyle=color;ctx.fillRect(Math.round(x+i*scale),Math.round(y+j*scale),Math.ceil(scale),Math.ceil(scale));
  }
}
export function drawAlly(ctx:CanvasRenderingContext2D,a:Ally,x:number,y:number,time:number,moving:boolean):void {
  const bob=moving?Math.round(Math.sin(time*13+a.index)*1):Math.round(Math.sin(time*3+a.index)*0.4);
  const palettes=[
    {h:'#d48054',s:'#eabf95',e:'#273239',b:'#91bfa7',c:'#ddc8a2',d:'#3e625d',k:'#263d3b'},
    {h:'#d8d5bc',s:'#d5b48c',e:'#273239',b:'#5f93ad',c:'#a0cdd2',d:'#3b525f',k:'#263d3b'},
    {h:'#a38cb7',s:'#d8b391',e:'#273239',b:'#7e718f',c:'#ccb4cf',d:'#505569',k:'#293a41'},
  ];
  if(a.hp<=0){ctx.save();ctx.translate(x,y-2);ctx.rotate(-Math.PI/2);drawBitmap(ctx,hero,palettes[a.index],-7,-9);ctx.restore();return;}
  drawBitmap(ctx,hero,palettes[a.index],x-8,y-16+bob);
  ctx.fillStyle='#ece6cf';
  if(a.role==='Striker'){ctx.fillRect(x+6,y-12+bob,2,10);ctx.fillStyle='#d9b96e';ctx.fillRect(x+4,y-4+bob,6,2);}
  if(a.role==='Guardian'){ctx.fillStyle='#d0ad65';ctx.fillRect(x-10,y-10+bob,6,8);ctx.fillStyle='#687975';ctx.fillRect(x-8,y-9+bob,2,6);}
  if(['Breaker','Healer','Enhancer','Disruptor'].includes(a.role)){ctx.fillStyle='#bba680';ctx.fillRect(x+7,y-12+bob,1,12);ctx.fillStyle=a.role==='Healer'?'#a2e6ad':a.role==='Disruptor'?'#ee90af':a.color;ctx.fillRect(x+5,y-15+bob,5,4);}
}
export function drawEnemy(ctx:CanvasRenderingContext2D,e:Enemy,x:number,y:number,time:number):void {
  const bob=e.staggered>0?Math.round(Math.sin(time*28)*1.4):Math.round(Math.sin(time*4+e.anchor.x)*1);
  if(e.kind==='brute')drawBitmap(ctx,brute,{r:'#88938c',l:'#b5b8a0',e:'#efb977',b:'#586b62'},x-12,y-22+bob,1.5);
  else if(e.kind==='caller')drawBitmap(ctx,caller,{p:'#bf9968',s:'#d8bd8e',e:'#423f34',c:'#8d7969',d:'#5d5f50',k:'#334c41',g:'#c8d394'},x-8,y-14+bob);
  else drawBitmap(ctx,moss,{l:e.kind==='patrol'?'#a3ac90':'#93b46a',g:e.kind==='patrol'?'#5e7c72':'#678c54',e:'#e1bf86',s:'#384f3d',k:'#344a3a'},x-8,y-11+bob);
}
