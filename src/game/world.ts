import type { Vec, World, Actor } from './types';
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export function createWorld(): World {
  const width = 40, height = 26;
  const tiles = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (x < 2 || y < 2 || x > 37 || y > 23) return 1;
    if (x === 18 && y >= 7 && y <= 23 && !(y >= 15 && y <= 17)) return 2;
    if (y === 7 && x >= 18 && x <= 29 && x !== 24 && x !== 25) return 2;
    if (x >= 32 && y >= 15 && y <= 20) return 3;
    if ((x === 9 && y >= 7 && y <= 11) || (y === 11 && x >= 5 && x <= 8)) return 2;
    if ((x === 5 && y === 5) || (x === 13 && y === 8) || (x === 28 && y === 20) || (x === 34 && y === 10) || (x === 6 && y === 22)) return 1;
    return 0;
  }));
  return { width, height, tiles };
}
export function isWalkable(w: World, x: number, y: number, radius = 0): boolean {
  for (const dx of [-radius, radius]) for (const dy of [-radius, radius]) {
    const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
    if (tx < 0 || ty < 0 || tx >= w.width || ty >= w.height || w.tiles[ty][tx] !== 0) return false;
  }
  return true;
}
export function lineOfSight(w: World, a: Vec, b: Vec): boolean {
  const n = Math.ceil(distance(a,b) * 3);
  for (let i = 1; i < n; i++) if (!isWalkable(w, a.x + (b.x-a.x)*i/n, a.y+(b.y-a.y)*i/n)) return false;
  return true;
}
export function legalNear(w: World, p: Vec): Vec {
  if (isWalkable(w,p.x,p.y,0.22)) return { ...p };
  for (let r = 1; r < 8; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const q = { x: Math.floor(p.x)+x+0.5, y: Math.floor(p.y)+y+0.5 };
    if (isWalkable(w,q.x,q.y,0.22)) return q;
  }
  return { x: 6.5, y: 18.5 };
}
export function pathTo(w: World, start: Vec, end: Vec): Vec[] {
  const goal = legalNear(w, end), sx = Math.floor(start.x), sy = Math.floor(start.y);
  const gx = Math.floor(goal.x), gy = Math.floor(goal.y), key = (x: number,y: number) => y*w.width+x;
  if (sx === gx && sy === gy) return [goal];
  const parents = new Int32Array(w.width*w.height).fill(-1), queue = [key(sx,sy)];
  parents[queue[0]] = queue[0];
  for (let i = 0; i < queue.length && parents[key(gx,gy)] === -1; i++) {
    const k = queue[i], x = k % w.width, y = Math.floor(k/w.width);
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx, ny=y+dy;
      if (!isWalkable(w,nx+0.5,ny+0.5) || parents[key(nx,ny)] !== -1) continue;
      parents[key(nx,ny)] = k; queue.push(key(nx,ny));
    }
  }
  if (parents[key(gx,gy)] === -1) return [];
  const out: Vec[] = []; let k=key(gx,gy), origin=key(sx,sy);
  while (k !== origin) { out.push({x:k%w.width+0.5,y:Math.floor(k/w.width)+0.5}); k=parents[k]; }
  out.reverse(); out[out.length-1]=goal; return out;
}
export function canReach(w: World,start: Vec,end: Vec): boolean {
  return isWalkable(w,end.x,end.y) && (lineOfSight(w,start,end) || pathTo(w,start,end).length>0);
}
export function moveActor(a: Actor, goal: Vec, speed: number, dt: number, w: World): void {
  if (distance(a,goal) < 0.12) { a.path=[]; return; }
  if (a.rethink <= 0 || !a.goal || distance(a.goal,goal)>1.1) {
    a.goal={...goal}; a.path=pathTo(w,a,goal); a.rethink=0.65;
  }
  const p=a.path[0]; if (!p) return;
  const d=distance(a,p), travel=Math.min(d,speed*dt);
  if (d<0.07) { a.path.shift(); return; }
  const dx=(p.x-a.x)/d*travel, dy=(p.y-a.y)/d*travel;
  if (isWalkable(w,a.x+dx,a.y,0.2)) a.x+=dx;
  if (isWalkable(w,a.x,a.y+dy,0.2)) a.y+=dy;
  if (Math.abs(dx)>0.001) a.facing=dx>0 ? 1 : -1;
}
