(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE="stReflexStateV1";
const today=()=>new Date().toISOString().slice(0,10);
const state=JSON.parse(localStorage.getItem(STORE)||'{"stats":{},"vocab":{},"cases":[],"sessions":0}');
const skillNames=["設問分類","根拠探索","因果構築","答案生成","出題者意図"];
let session=[], idx=0, answered=false, startedAt=0, currentMode="classify", deferredPrompt=null, examInterval=null, examRemaining=0;

function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function stat(id){return state.stats[id] ||= {seen:0,correct:0,streak:0,mastery:0,due:today(),avgMs:0,lastConfidence:null}}
function scoreItem(q,s){
 const acc=s.seen?s.correct/s.seen:0;
 const speed=s.avgMs?Math.max(0,Math.min(1,1-(s.avgMs-1200)/9000)):0;
 const spacing=Math.min(1,s.streak/4);
 return Math.round((acc*.55+speed*.20+spacing*.25)*100);
}
function overall(){
 const seen=ST_QUESTIONS.filter(q=>state.stats[q.id]?.seen);
 if(!seen.length)return 0;
 return Math.round(seen.reduce((a,q)=>a+scoreItem(q,state.stats[q.id]),0)/seen.length);
}
function skillScore(name){
 const qs=ST_QUESTIONS.filter(q=>q.skill===name && state.stats[q.id]?.seen);
 if(!qs.length)return 0;
 return Math.round(qs.reduce((a,q)=>a+scoreItem(q,state.stats[q.id]),0)/qs.length);
}
function dueCount(){return ST_QUESTIONS.filter(q=>(state.stats[q.id]?.due||"0000-00-00")<=today()).length}
function activeVocab(){return Object.values(state.vocab).filter(v=>(v.level||0)>=4).length}
function renderHome(){
 $("#metricR").textContent=overall();
 $("#metricMastered").textContent=skillNames.filter(s=>skillScore(s)>=80).length;
 $("#metricVocab").textContent=activeVocab();
 $("#metricDue").textContent=dueCount();
 $("#skillGrid").innerHTML=skillNames.map(n=>`<div class="skill card"><b>${n}</b><small>${skillScore(n)} / 100</small><div class="bar"><i style="width:${skillScore(n)}%"></i></div></div>`).join("");
}
function setView(id){
 $$(".view").forEach(v=>v.classList.remove("active")); $("#"+id).classList.add("active");
 $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
 if(id==="homeView")renderHome(); if(id==="vocabView")renderVocab(); if(id==="casesView")renderCases();
 scrollTo({top:0,behavior:"smooth"});
}
$$(".bottom-nav button").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$("[data-go]").forEach(b=>b.onclick=()=>setView(b.dataset.go+"View"));

function chooseSession(mode){
 currentMode=mode;
 let pool=ST_QUESTIONS.filter(q=>q.mode===mode);
 pool.sort((a,b)=>{
   const sa=stat(a.id), sb=stat(b.id);
   const ad=sa.due<=today()?0:1, bd=sb.due<=today()?0:1;
   if(ad!==bd)return ad-bd;
   return sa.mastery-sb.mastery || Math.random()-.5;
 });
 session=pool.slice(0,10);
 if(session.length<10){while(session.length<10 && pool.length)session.push(pool[Math.floor(Math.random()*pool.length)])}
 idx=0; state.sessions=(state.sessions||0)+1; save(); setView("trainerView"); renderQuestion();
}
$$(".mode").forEach(b=>b.onclick=()=>chooseSession(b.dataset.mode));
$("#startRecommended").onclick=()=>{
 const scores={classify:skillScore("設問分類"),causal:skillScore("因果構築"),intent:skillScore("出題者意図"),evidence:skillScore("根拠探索"),rank:skillScore("答案生成"),vocab:activeVocab()*4};
 const mode=Object.entries(scores).sort((a,b)=>a[1]-b[1])[0][0];
 chooseSession(mode);
};

function renderQuestion(){
 answered=false; $("#nextBtn").classList.add("hidden"); $("#feedback").className="feedback hidden";
 const q=session[idx]; if(!q){finishSession();return}
 $("#qCounter").textContent=`${idx+1}/${session.length}`; $("#progressBar").style.width=`${idx/session.length*100}%`;
 $("#qSkill").textContent=q.skill; $("#qStage").textContent=`STAGE ${q.stage}`; $("#qPrompt").textContent=q.prompt;
 $("#qContext").innerHTML="";
 const area=$("#answerArea"); area.innerHTML="";
 if(q.mode==="evidence"){
   $("#qContext").textContent="本文の中から、設問に直結する根拠を選ぶ。";
   const list=document.createElement("div"); list.className="evidence-list";
   q.context.forEach((t,i)=>{const b=document.createElement("button");b.className="evidence-sentence";b.textContent=t;b.onclick=()=>answer(i,b);list.appendChild(b)});
   area.appendChild(list);
 }else{
   if(q.context) $("#qContext").textContent=Array.isArray(q.context)?q.context.join("\n"):q.context;
   const grid=document.createElement("div");grid.className=q.choices.length===2?"answer-grid":"";
   q.choices.forEach((t,i)=>{const b=document.createElement("button");b.className="answer-btn";b.textContent=t;b.onclick=()=>answer(i,b);grid.appendChild(b)});
   area.appendChild(grid);
 }
 startedAt=performance.now();
}
function answer(choice,btn,skipped=false){
 if(answered)return; answered=true;
 const q=session[idx], s=stat(q.id), ms=Math.round(performance.now()-startedAt), ok=choice===q.answer;
 s.seen++; if(ok)s.correct++; s.streak=ok?s.streak+1:0; s.avgMs=s.avgMs?Math.round(s.avgMs*.7+ms*.3):ms;
 s.mastery=Math.max(0,Math.min(100,(s.mastery||0)+(ok?(ms<4000?10:6):-12)));
 const days=ok?Math.min(21,[1,2,4,7,14,21][Math.min(5,s.streak)]):0;
 const d=new Date(); d.setDate(d.getDate()+days); s.due=d.toISOString().slice(0,10);
 if(q.term){
   const v=state.vocab[q.term] ||= {level:0,seen:0};
   v.seen++; if(ok)v.level=Math.min(5,v.level+1); else v.level=Math.max(0,v.level-1);
 }
 save();
 const buttons=$$("#answerArea button"); buttons.forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add("correct")});
 if(!ok && btn)btn.classList.add("wrong");
 const fb=$("#feedback"); fb.classList.remove("hidden","good","bad"); fb.classList.add(ok?"good":"bad");
 fb.innerHTML=`<strong>${ok?"✓ 的中":"× ずれています"}　${(ms/1000).toFixed(1)}秒</strong>${q.explain}
   <div class="confidence"><span>自信度：</span><button data-c="3">自信あり</button><button data-c="2">普通</button><button data-c="1">勘</button></div>`;
 $$("#feedback [data-c]").forEach(b=>b.onclick=()=>{s.lastConfidence=+b.dataset.c;save();$$("#feedback [data-c]").forEach(x=>x.disabled=true)});
 $("#nextBtn").classList.remove("hidden");
}
$("#skipBtn").onclick=()=>answer(-1,null,true);
$("#nextBtn").onclick=()=>{idx++;renderQuestion()};
function finishSession(){
 $("#progressBar").style.width="100%"; renderHome(); setView("homeView");
}

function renderVocab(){
 let counters=[0,0,0,0];
 ST_GLOSSARY.forEach(g=>{const l=state.vocab[g.term]?.level||0;if(l>=1)counters[0]++;if(l>=2)counters[1]++;if(l>=3)counters[2]++;if(l>=4)counters[3]++});
 $("#vRecognize").textContent=counters[0];$("#vDistinguish").textContent=counters[1];$("#vApply").textContent=counters[2];$("#vActive").textContent=counters[3];
 $("#vocabList").innerHTML=ST_GLOSSARY.map(g=>{
   const l=state.vocab[g.term]?.level||0;
   return `<div class="vocab-item card"><div class="vocab-term">${g.term}<small style="display:block;color:#6b7280;font-size:10px">${g.family}</small></div>
   <div class="vocab-desc">${g.meaning}<br><small>使い方：${g.usage}</small></div>
   <div class="level-dots" title="習熟度">${[1,2,3,4,5].map(n=>`<i class="${l>=n?"on":""}"></i>`).join("")}</div></div>`
 }).join("");
}

function renderCases(){
 const list=$("#caseList");
 if(!state.cases.length){list.innerHTML='<div class="card case-card"><p>まだ事例はありません。B-2で使える経験を「背景→課題→真因→判断→IT→工夫→リスク→KPI」で登録します。</p></div>';return}
 list.innerHTML=state.cases.map(c=>`<div class="card case-card"><h3>${esc(c.title)}</h3><p>${esc(c.problem||"")}</p>
 <div class="row"><button class="ghost" data-edit="${c.id}">編集</button><button class="ghost" data-outline="${c.id}">骨子化</button><button class="ghost" data-del="${c.id}">削除</button></div></div>`).join("");
 $$("[data-edit]").forEach(b=>b.onclick=()=>loadCase(b.dataset.edit));
 $$("[data-outline]").forEach(b=>b.onclick=()=>outlineCase(b.dataset.outline));
 $$("[data-del]").forEach(b=>b.onclick=()=>{state.cases=state.cases.filter(c=>c.id!==b.dataset.del);save();renderCases()});
}
function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
$("#caseForm").onsubmit=e=>{
 e.preventDefault();
 const id=$("#caseId").value||crypto.randomUUID();
 const c={id,title:$("#caseTitle").value,background:$("#caseBackground").value,problem:$("#caseProblem").value,root:$("#caseRoot").value,strategy:$("#caseStrategy").value,it:$("#caseIT").value,stake:$("#caseStake").value,risk:$("#caseRisk").value,kpi:$("#caseKpi").value};
 const ix=state.cases.findIndex(x=>x.id===id); if(ix>=0)state.cases[ix]=c; else state.cases.push(c); save(); clearCase(); renderCases();
};
function loadCase(id){const c=state.cases.find(x=>x.id===id); if(!c)return;
 ["Id","Title","Background","Problem","Root","Strategy","IT","Stake","Risk","Kpi"].forEach(k=>$("#case"+k).value=c[k.toLowerCase()]||c[k==="IT"?"it":k.toLowerCase()]||"");
 scrollTo({top:120,behavior:"smooth"});
}
function clearCase(){ $("#caseForm").reset(); $("#caseId").value=""; $("#outlineBox").classList.add("hidden")}
$("#caseClear").onclick=clearCase;
function outlineCase(id){
 const c=state.cases.find(x=>x.id===id); if(!c)return;
 const steps=[["背景",c.background],["課題",c.problem],["真因",c.root],["判断・経営施策",c.strategy],["IT施策",c.it],["調整・工夫",c.stake],["リスクと対策",c.risk],["評価・KPI",c.kpi]];
 const box=$("#outlineBox");box.classList.remove("hidden");box.innerHTML=`<h3>${esc(c.title)}｜B-2骨子</h3>`+steps.map(s=>`<div class="outline-step"><b>${s[0]}</b>${esc(s[1]||"未入力")}</div>`).join("");
}
function loadCase(id){
 const c=state.cases.find(x=>x.id===id); if(!c)return;
 $("#caseId").value=c.id;$("#caseTitle").value=c.title||"";$("#caseBackground").value=c.background||"";$("#caseProblem").value=c.problem||"";$("#caseRoot").value=c.root||"";$("#caseStrategy").value=c.strategy||"";$("#caseIT").value=c.it||"";$("#caseStake").value=c.stake||"";$("#caseRisk").value=c.risk||"";$("#caseKpi").value=c.kpi||"";
 scrollTo({top:110,behavior:"smooth"});
}

const exams={
 b1:{
  minutes:90,type:"B-1",
  passage:`【オリジナル練習事例】
食品卸A社では、営業担当者が取引先の注文傾向や商談履歴を個別の表計算ファイルで管理している。そのため担当者交代時の引継ぎに時間がかかり、複数部門で同じ顧客へ重複提案することもある。
経営会議では、既存顧客の継続率低下が課題となり、顧客別の購買履歴と商談履歴を全社で共有し、提案の精度を高める方針を決めた。ただし、初年度の投資上限は4,000万円であり、6か月以内に主要拠点で利用開始する必要がある。`,
  questions:[
   ["設問1","新システム導入の目的を40字程度で述べよ。"],
   ["設問2","方式選定で重視すべき制約を二つ挙げよ。"],
   ["設問3","導入効果を確認するKPIの例を一つ挙げ、その理由を述べよ。"]
  ]
 },
 b2:{
  minutes:120,type:"B-2",
  passage:`【オリジナル論述練習】
あなたがIT戦略の策定又は実行に関与した事例について、事業上の課題、真因、ITを活用した施策、実施上の工夫、リスクへの対応、効果の評価を一貫した論理で述べなさい。`,
  questions:[
   ["骨子","背景→課題→真因→判断→IT施策→工夫→リスク→KPI を10分以内で構成する。"],
   ["論述","上記骨子を基に、具体的な立場・制約・判断理由を含めて論述する。"]
  ]
 }
};
function startExam(kind){
 const ex=exams[kind];$("#examPanel").classList.remove("hidden");$("#examRubric").classList.add("hidden");$("#examType").textContent=ex.type;$("#examPassage").textContent=ex.passage;
 $("#examQuestions").innerHTML=ex.questions.map((q,i)=>`<div><b>${q[0]}</b><p>${q[1]}</p><textarea placeholder="ここに入力"></textarea></div>`).join("");
 examRemaining=ex.minutes*60; clearInterval(examInterval); tickExam(); examInterval=setInterval(()=>{examRemaining--;tickExam();if(examRemaining<=0)finishExam()},1000);
}
function tickExam(){const m=Math.floor(examRemaining/60),s=examRemaining%60;$("#examTimer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
$("#startB1").onclick=()=>startExam("b1");$("#startB2").onclick=()=>startExam("b2");
function finishExam(){
 clearInterval(examInterval);
 const box=$("#examRubric");box.classList.remove("hidden");
 box.innerHTML=`<h3>Examiner Check</h3><p>答案ごとに次の7点を確認してください。</p>
 <ol><li>何を聞かれたかに答えているか</li><li>要求された要素を全部答えたか</li><li>根拠は本文・事例にあるか</li><li>原因→施策→効果がつながっているか</li><li>問題固有の具体語が入っているか</li><li>専門用語を正しく使っているか</li><li>聞かれていない一般論を書いていないか</li></ol>`;
}
$("#finishExam").onclick=finishExam;

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

renderHome();
})();