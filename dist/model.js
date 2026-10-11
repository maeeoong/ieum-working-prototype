import { book, movie, routes } from './content.js';
export const STORAGE_KEY = 'ieum-return-point-v2';
export const initial = () => ({version:2,route:'morning',screen:'intro',stage:0,paused:true,page:132,seconds:movie.start,startPage:132,startSeconds:movie.start,social:'message',returnCount:0,hasStarted:false});
export const stageId = s => routes[s.route].stages[s.stage][0];
export function restore(raw) {
  try {
    const x=JSON.parse(raw);
    if(x?.version!==2 || !Object.hasOwn(routes,x.route) || !['intro','session','summary'].includes(x.screen) || !Number.isInteger(x.stage) || x.stage<0 || x.stage>7 || !Number.isInteger(x.page) || x.page<132 || x.page>=132+book.pages.length || !Number.isFinite(x.seconds) || x.seconds<0 || x.seconds>movie.duration) return initial();
    return {...initial(),route:x.route,screen:x.screen,stage:x.stage,page:x.page,seconds:x.seconds,startPage:Number.isInteger(x.startPage)&&x.startPage>=132&&x.startPage<book.firstPage+book.pages.length?x.startPage:132,startSeconds:Number.isFinite(x.startSeconds)&&x.startSeconds>=0&&x.startSeconds<=x.seconds?x.startSeconds:movie.start,social:['message','feed','reminder','returned'].includes(x.social)?x.social:'message',returnCount:Number.isSafeInteger(x.returnCount)&&x.returnCount>=0?x.returnCount:0,hasStarted:!!x.hasStarted,paused:true};
  }catch{return initial();}
}
export function transition(s,a) {
  const n={...s};
  switch(a.type){
    case 'ROUTE': if(!Object.hasOwn(routes,a.route))return s; return {...s,route:a.route,screen:'intro',stage:0,paused:true,social:'message',hasStarted:false};
    case 'HOME': return {...s,screen:'intro',paused:true};
    case 'START': return {...s,screen:'session',stage:0,paused:true,social:'message',returnCount:0,hasStarted:false,startPage:s.page,startSeconds:s.seconds};
    case 'ADVANCE': {
      if(s.stage>=7)return s;
      n.stage++;
      if(['walk','transfer','arrival'].includes(stageId(n)))n.paused=true;
      if(stageId(n)==='arrival')n.screen='summary';
      return n;
    }
    case 'RESUME':
      if(['walk','transfer','arrival'].includes(stageId(s)))return s;
      n.paused=false;n.hasStarted=true;
      if(stageId(s)==='return'||(s.route==='evening'&&stageId(s)==='wait'))n.returnCount++;
      if(s.route==='evening'&&stageId(s)==='wait')n.social='returned';
      return n;
    case 'PAUSE':n.paused=true;return n;
    case 'PAGE':if(s.paused||s.route!=='morning')return s;n.page=Math.max(132,Math.min(131+book.pages.length,s.page+a.delta));return n;
    case 'TICK':if(s.paused||s.route!=='evening')return s;n.seconds=Math.min(movie.duration,s.seconds+a.seconds);if(n.seconds>=movie.duration)n.paused=true;return n;
    case 'SOCIAL': if(!['feed','reminder'].includes(a.value))return s;n.social=a.value;n.paused=true;return n;
    case 'END':n.screen='summary';n.paused=true;return n;
    case 'RESET':return initial();
    default:return s;
  }
}
