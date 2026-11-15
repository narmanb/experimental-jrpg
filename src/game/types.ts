export type Role = 'Striker' | 'Breaker' | 'Guardian' | 'Healer' | 'Enhancer' | 'Disruptor';
export type Tactic = 'focus' | 'lock' | 'rally' | 'limit';
export type EnemyKind = 'mossling' | 'caller' | 'brute' | 'patrol';
export interface Vec { x: number; y: number }
export type Status = 'power' | 'ward' | 'weak' | 'slow' | 'silence';
export interface Actor extends Vec {
  id: string; name: string; hp: number; maxHp: number; atb: number;
  buffs: Record<Status, number>; flash: number; label: string; labelTime: number;
  path: Vec[]; goal: Vec | null; rethink: number; actions: number; facing: number;
}
export interface Ally extends Actor { role: Role; color: string; index: number }
export interface Windup extends Vec { kind: 'call' | 'slam' | 'strike'; remaining: number; total: number; target: string }
export interface Enemy extends Actor {
  kind: EnemyKind; chain: number; stabilized: number; chainLock: number; staggered: number; recovery: number;
  engaged: boolean; alerted: boolean; callUsed: boolean; windup: Windup | null;
  anchor: Vec; patrol: Vec[]; waypoint: number; cooldown: number;
}
export interface Formation { name: string; icon: string; color: string; roles: [Role, Role, Role]; hint: string }
export interface Action { kind: 'strike' | 'break' | 'guard' | 'heal' | 'revive' | 'enhance' | 'disrupt'; target: string; buff?: 'power' | 'ward' }
export interface World { width: number; height: number; tiles: number[][] }
export interface Effect extends Vec { kind: 'slash' | 'bolt' | 'heal' | 'shield' | 'ring' | 'call' | 'limit'; to?: Vec; color: string; life: number; total: number }
export interface FloatingText extends Vec { text: string; color: string; life: number }
export interface LogEntry { text: string; color: string; time: number }
