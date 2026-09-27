import type { Point } from '../types/game.ts';
const directions: Point[] = [[0,1],[1,0],[0,-1],[-1,0]];
const same = (a: Point,b: Point) => a[0]===b[0]&&a[1]===b[1];
const inside = (p: Point) => p.every(n=>n>=0&&n<5);
const distance = (a: Point,b: Point) => Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);

/** Search only actual one-tile steps; occupancy is rebuilt for each actor. */
export function stagSteps(from: Point, hero: Point, occupied: Point[]): Point[] {
  const paths: Point[][] = [[]];
  for (let i=0;i<paths.length;i++) {
    const path=paths[i], last=path.at(-1)??from;
    if(path.length===2)continue;
    for(const [dx,dy] of directions){
      const p: Point=[last[0]+dx,last[1]+dy];
      if(!inside(p)||same(p,hero)||same(p,from)||path.some(q=>same(p,q))||occupied.some(q=>same(p,q)))continue;
      paths.push([...path,p]);
    }
  }
  const score=(path:Point[])=>{
    const p=path.at(-1)??from;
    return (p[0]===hero[0]||p[1]===hero[1]?20:0)-distance(p,hero)-path.length*.1;
  };
  return paths.sort((a,b)=>score(b)-score(a))[0];
}

/** Frozen impact cells; removing each cell must leave a connected walkable safe region. */
export function rockWarnings(boss: Point, hero: Point, occupied: Point[], enraged: boolean): Point[] {
  const all:Point[]=Array.from({length:25},(_,i)=>[i%5,Math.floor(i/5)]);
  const walkable=all.filter(p=>!same(p,boss)&&!occupied.some(q=>same(p,q)));
  const escape=walkable.filter(p=>distance(p,hero)===1).sort((a,b)=>distance(b,boss)-distance(a,boss))[0];
  const marked:Point[]=[];
  const connected=(cells:Point[])=>{
    if(!cells.length)return false;
    const seen:Point[]=[cells[0]];
    for(let i=0;i<seen.length;i++)for(const p of cells)if(distance(seen[i],p)===1&&!seen.some(q=>same(p,q)))seen.push(p);
    return seen.length===cells.length;
  };
  for(const p of walkable.sort((a,b)=>distance(a,hero)-distance(b,hero))){
    if(escape&&same(p,escape))continue;
    const safe=walkable.filter(q=>!same(q,p)&&!marked.some(m=>same(q,m)));
    if(connected(safe))marked.push(p);
    if(marked.length===(enraged?12:8))break;
  }
  return marked;
}
