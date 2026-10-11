import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,transition as t,restore,stageId} from '../dist/model.js';
import {movie} from '../dist/content.js';
const advance = (state,count=1) => { for(let i=0;i<count;i++)state=t(state,{type:'ADVANCE'});return state; };
test('출근: 페이지를 넘긴 뒤 자동 저장 → 환승 → 한 번 눌러 같은 위치로 복귀',()=>{
  let s=t(initial(),{type:'START'});
  assert.equal(s.paused,true);
  s=advance(s,2);s=t(s,{type:'RESUME'});s=t(s,{type:'PAGE',delta:3});
  assert.equal(s.page,135);
  s=advance(s,2);assert.equal(stageId(s),'transfer');assert.equal(s.paused,true);assert.equal(s.page,135);
  s=advance(s);assert.equal(stageId(s),'return');
  s=t(s,{type:'RESUME'});assert.equal(s.page,135);assert.equal(s.paused,false);
  s=advance(s);assert.equal(s.paused,false);assert.equal(s.page,135);
});
test('퇴근: SNS 이탈 → 원래 영상 복귀 → 환승 때 시청 위치 보존',()=>{
  let s=t(initial(),{type:'ROUTE',route:'evening'});s=t(s,{type:'START'});s=advance(s);
  s=t(s,{type:'SOCIAL',value:'feed'});s=t(s,{type:'SOCIAL',value:'reminder'});
  s=t(s,{type:'RESUME'});assert.equal(s.social,'returned');assert.equal(s.seconds,2538);
  s=advance(s);s=t(s,{type:'TICK',seconds:1140});assert.equal(s.seconds,3678);
  s=advance(s,2);assert.equal(s.paused,true);
  const before=s.seconds;s=t(s,{type:'TICK',seconds:100});assert.equal(s.seconds,before);
  s=advance(s);s=t(s,{type:'RESUME'});assert.equal(s.seconds,3678);assert.equal(s.paused,false);
});
test('도보·환승에서는 재개를 강요하지 않으며 재생되지 않음',()=>{
  let s=t(initial(),{type:'START'});assert.equal(t(s,{type:'RESUME'}).paused,true);
  s=advance(s,4);assert.equal(t(s,{type:'RESUME'}).paused,true);
});
test('먼저 읽기 및 탑승 후 시작 분기 모두 저장 위치 유지',()=>{
  let s=advance(t(initial(),{type:'START'}));
  s=t(s,{type:'RESUME'});s=t(s,{type:'PAGE',delta:1});
  s=advance(s);assert.equal(s.page,133);assert.equal(s.paused,false);
  s=t(s,{type:'PAUSE'});s=t(s,{type:'RESUME'});assert.equal(s.page,133);
});
test('새로고침·재진입은 동일 위치를 복원하고 자동 재생하지 않음',()=>{
  let s=advance(t(initial(),{type:'START'}),2);s=t(s,{type:'RESUME'});s=t(s,{type:'PAGE',delta:4});
  const loaded=restore(JSON.stringify(s));assert.equal(loaded.page,136);assert.equal(loaded.paused,true);assert.equal(loaded.stage,2);
  let e={...s,route:'evening',seconds:3660};const loadedMovie=restore(JSON.stringify(e));assert.equal(loadedMovie.seconds,3660);assert.equal(loadedMovie.paused,true);
});
test('종료 후 다음 이동에서도 저장 위치 유지, 초기화하면 둘 다 초기값으로',()=>{
  let s={...initial(),page:140,seconds:3600,screen:'session',stage:6,paused:false};
  s=advance(s);assert.equal(s.screen,'summary');assert.equal(s.paused,true);
  s=t(s,{type:'START'});assert.equal(s.page,140);assert.equal(s.seconds,3600);assert.equal(s.stage,0);
  assert.deepEqual(t(s,{type:'RESET'}),initial());
});
test('손상된 저장값은 초기 상태로 복구',()=>{
  for(const raw of ['{','null',JSON.stringify({...initial(),page:-1}),JSON.stringify({...initial(),route:'bad'}),JSON.stringify({...initial(),seconds:movie.duration+1})])assert.deepEqual(restore(raw),initial());
});
test('출근/퇴근을 바꿔도 각 활동의 위치는 섞이지 않음',()=>{
  let s={...initial(),page:137,seconds:4000};s=t(s,{type:'ROUTE',route:'evening'});assert.equal(s.seconds,4000);s=t(s,{type:'ROUTE',route:'morning'});assert.equal(s.page,137);
});
test('다음 이동에서 이전 페이지로 돌아간 뒤 새로고침해도 시작 위치는 바뀌지 않음',()=>{
  let s={...initial(),page:140};s=t(s,{type:'START'});s=advance(s,2);s=t(s,{type:'RESUME'});s=t(s,{type:'PAGE',delta:-1});
  const loaded=restore(JSON.stringify(s));assert.equal(loaded.page,139);assert.equal(loaded.startPage,140);
});
test('잘못 저장된 내장 객체 이름을 시나리오로 허용하지 않음',()=>{
  for(const route of ['constructor','__proto__','toString'])assert.deepEqual(restore(JSON.stringify({...initial(),route})),initial());
});
test('홈 이동은 현재 활동을 멈추고 양쪽 콘텐츠 위치를 보존',()=>{
  const s={...initial(),route:'evening',screen:'session',stage:2,page:138,seconds:3600,paused:false};
  const home=t(s,{type:'HOME'});assert.equal(home.screen,'intro');assert.equal(home.paused,true);assert.equal(home.page,138);assert.equal(home.seconds,3600);
});
