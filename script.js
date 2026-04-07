var localData = localStorage.getItem('dashboardData_GRP');
if (localData) {
  try {
    GRP = JSON.parse(localData);
  } catch(e) { console.error("Local data parse error", e); }
}

var ALL=[]; 
GRP.forEach(function(g){g.items.forEach(function(t){ALL.push(t);});});

var curQ='전체', selId=null, activeCat=null;
var isAdminMode = false;

function saveToLocal() {
  // Update ALL array data back to GRP to be safe
  // Actually, objects are passed by reference, so GRP is already updated!
  localStorage.setItem('dashboardData_GRP', JSON.stringify(GRP));
}

/* helpers */
function pc(p,st){if(st==='보류'||st==='예정')return'gr';return p>=80?'g':p>=50?'b':p>=20?'a':p>0?'r':'gr';}
function pcCol(p,st){if(st==='긴급')return 'var(--red)';if(st==='보류'||st==='예정')return'#bbb';return p>=80?'var(--green)':p>=50?'var(--blue)':p>=20?'var(--amber)':p>0?'var(--red)':'#bbb';}
function dl2days(s){if(!s||s==='상시'||s.includes('월')||s.includes('분기')||s==='—')return null; var now=new Date(); now.setHours(0,0,0,0); var tgt=new Date(s); tgt.setHours(0,0,0,0); return Math.round((tgt-now)/86400000);}
function dchip(s){var d=dl2days(s);if(d===null)return'<span class="dchip na">'+s+'</span>';var c=d>30?'ok':d>=0?'warn':'over';return'<span class="dchip '+c+'">'+(d>0?'D-'+d:d===0?'오늘':'D+'+Math.abs(d))+'</span>';}
function filterArr(arr) {
  if (curQ === '전체') return arr;
  // 어떤 탭을 선택하든 해당 분기 데이터와 '상시' 데이터를 함께 반환합니다.
  return arr.filter(function(t) {
    return t.q === curQ || t.q === '상시' || t.q === '전체';
  });
}
/* KPI */
function renderKpi(){
  var fd = ALL.filter(function(t){
    if(curQ === '전체') return true;
    // KPI 집계 시에도 현재 분기, 상시, 전체 데이터를 모두 포함합니다.
    return t.q === curQ || t.q === '상시' || t.q === '전체';
  });
  var tot=fd.length,ing=0,done=0,hold=0;
  fd.forEach(function(t){if(t.status==='진행')ing++;else if(t.status==='완료')done++;else if(t.status==='보류'||t.status==='지연'||t.status==='검토중')hold++;});
  var ia=fd.filter(function(t){return t.status==='진행';});
  var avg=ia.length?Math.round(ia.reduce(function(s,t){return s+t.pct;},0)/ia.length):0;
  function cell(l,v,vc,s,bp,bc){return'<div class="kc"><div class="kl">'+l+'</div><div class="kv '+vc+'">'+v+'</div><div class="ks">'+s+'</div><div class="kbar"><div class="kbf" style="width:'+bp+'%;background:'+bc+'"></div></div></div>';}
  document.getElementById('kpiEl').innerHTML=cell('전체 업무',tot,'vn','건',100,'var(--bd2)')+cell('진행중',ing,'vi','건',tot?Math.round(ing/tot*100):0,'var(--blue)')+cell('완료',done,'vg','건',tot?Math.round(done/tot*100):0,'var(--green)')+cell('보류·예정',hold,'vr','건',tot?Math.round(hold/tot*100):0,'var(--red)')+cell('평균 진행률',avg+'%','va','진행 과업 기준',avg,'var(--amber)');
}

/* pills */
function pillsHtml(arr){
  var ing=arr.filter(function(t){return t.status==='진행';}).length;
  var done=arr.filter(function(t){return t.status==='완료';}).length;
  var hold=arr.filter(function(t){return t.status==='보류';}).length;
  var plan=arr.filter(function(t){return t.status==='예정';}).length;
  var emg=arr.filter(function(t){return t.status==='긴급';}).length;
  var delay=arr.filter(function(t){return t.status==='지연';}).length;
  var review=arr.filter(function(t){return t.status==='검토중';}).length;

  var h='';
  if(ing)h+='<span class="pill ing">진행 '+ing+'</span>';
  if(done)h+='<span class="pill done">완료 '+done+'</span>';
  if(plan)h+='<span class="pill plan">예정 '+plan+'</span>';
  if(emg)h+='<span class="pill delay">긴급 '+emg+'</span>';
  if(delay)h+='<span class="pill delay">지연 '+delay+'</span>';
  if(review)h+='<span class="pill review">검토중 '+review+'</span>';
  if(hold)h+='<span class="pill hold">보류 '+hold+'</span>';
  return h;
}

/* 풀 카드 HTML */
function adminBtns(t){
  if(!isAdminMode) return '';
  return '<div class="card-admin-actions">'
    +'<button class="card-admin-btn" onclick="event.stopPropagation();openTaskModal(\'edit\','+t.id+','+t._gid+')" title="수정">✏️</button>'
    +'<button class="card-admin-btn btn-del" onclick="event.stopPropagation();deleteTask('+t.id+')" title="삭제">🗑</button>'
    +'</div>';
}
function fullCardHtml(t, isMini){
  var col=pc(t.pct,t.status);
  var d=dl2days(t.end);
  var ce = isAdminMode ? ' contenteditable="true"' : '';
  var dc=d!==null&&d<14?'card-date near':'card-date';
  if(!isMini) return '<div class="card'+(selId===t.id?' sel':'')+'" onclick="selCard('+t.id+','+t._gid+')">'
    +adminBtns(t)
    +'<div class="card-row1">'
      +'<span class="card-title" data-edit="itemTitle" data-id="'+t.id+'"'+ce+'>'+t.title+'</span>'
      +'<span class="badge full '+t.status+'">'+t.status+'</span>'
      +'<span class="badge '+t.priority+'">'+t.priority+'</span>'
      +'<span class="card-owner" data-edit="itemPm" data-id="'+t.id+'"'+ce+'>'+t.pm+(t.owner&&t.owner!=='—'?' · '+t.owner:'')+'</span>'
    +'</div>'
    +'<div class="card-prog">'
      +'<div class="pw full"><div class="pf '+col+'" style="width:'+t.pct+'%"></div></div>'
      +'<span class="card-pct">'+t.pct+'%</span>'
      +'<span class="'+dc+'">~'+t.end+'</span>'
    +'</div>'
  +'</div>';
  else return '<div class="mini-card'+(selId===t.id?' sel':'')+'" onclick="selCard('+t.id+','+t._gid+')">'
    +adminBtns(t)
    +'<div class="mini-title" data-edit="itemTitle" data-id="'+t.id+'"'+ce+'>'+t.title+'</span></div>'
    +'<div class="mini-row"><span class="badge sm '+t.status+'">'+t.status+'</span><span data-edit="itemPm" data-id="'+t.id+'"'+ce+' style="font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t.pm+'</span><span class="mini-date">~'+t.end+'</span></div>'
    +'<div class="mini-prog"><div class="pw mini"><div class="pf '+col+'" style="width:'+t.pct+'%"></div></div><span class="mini-pct">'+t.pct+'%</span></div></div>';
}

/* 컬럼 렌더 */
function renderCol(gidx, isMini){
  var g=GRP[gidx];
  var fd=filterArr(g.items);
  
  // '수명 업무' 카드 최상단 고정 정렬
  fd.sort(function(a, b) {
    if (a.title === '수명 업무') return -1;
    if (b.title === '수명 업무') return 1;
    return 0;
  });

  fd.forEach(function(t){t._gid=gidx;});
  document.getElementById('cnt'+gidx).textContent=fd.length+'건';
  document.getElementById('pills'+gidx).innerHTML=pillsHtml(fd);
  var html='';
  fd.forEach(function(t){html+=fullCardHtml(t,isMini);});
  if(!html)html='<div class="no-items">해당 과업 없음</div>';
  document.getElementById('list'+gidx).innerHTML=html;
}

function renderAllCols(miniFlags){
  miniFlags=miniFlags||[false,false,false,false];
  for(var i=0;i<4;i++) renderCol(i,miniFlags[i]);
}

/* 레이아웃 전환 — N개 패널 공통 공식:
   panel i: order = (i <= cat) ? i : i+1
   detail:  order = cat + 1                */
function applyLayout(cat){
  var N=4;
  var p=[];
  for(var i=0;i<N;i++) p.push(document.getElementById('p'+i));
  var pdet=document.getElementById('pdet');

  if(cat===null){
    /* 초기: N열 균등 */
    for(var i=0;i<N;i++){p[i].style.order=i;p[i].className='panel cat';}
    pdet.style.order=N;pdet.className='panel det';
    renderAllCols();
    pdet.innerHTML='<div class="det-empty">← 과업을 선택하면 상세 내용이 표시됩니다</div>';
    return;
  }

  /* 패널 order 계산 */
  for(var i=0;i<N;i++) p[i].style.order=(i<=cat)?i:i+1;
  pdet.style.order=cat+1;

  /* 클래스 적용 */
  for(var i=0;i<N;i++) p[i].className='panel cat '+(i===cat?'is-list':'is-mini');
  pdet.className='panel det is-open';

  var minis=[];
  for(var i=0;i<N;i++) minis.push(i!==cat);
  renderAllCols(minis);
}

/* 카드 선택 */
function selCard(id,gid){
  var newCat=gid;
  selId=id;
  if(activeCat!==newCat){
    activeCat=newCat;
    applyLayout(newCat);
  } else {
    var minis=[];
    for(var i=0;i<4;i++) minis.push(i!==activeCat);
    renderAllCols(minis);
  }
  renderDetail();
  if(isDual) renderS2Detail(id);
}

/* 상세 렌더 */
var secIdx=0;
function secHtml(title,cnt,bodyHtml,defaultOpen,isIssue){
  var sid='s'+(secIdx++);
  var ihd=isIssue?'background:#fff0ef;border-bottom-color:#fecaca':'';
  var ittl=isIssue?'color:var(--red)':'';
  return '<div class="sec"><div class="sec-hd'+(defaultOpen?' open':'')+'" style="'+ihd+'" id="hd'+sid+'" onclick="toggleSec(\''+sid+'\')">'
    +'<span class="sec-ttl" style="'+ittl+'">'+title+'</span>'
    +(cnt?'<span class="sec-cnt">'+cnt+'</span>':'')
    +'<span class="sec-arr'+(defaultOpen?' open':'')+'" id="arr'+sid+'">▼</span>'
    +'</div><div class="sec-body'+(defaultOpen?' open':'')+'" id="bd'+sid+'">'+bodyHtml+'</div></div>';
}
function toggleSec(sid){
  ['hd','arr','bd'].forEach(function(p){var e=document.getElementById(p+sid);if(e)e.classList.toggle('open');});
}

function renderDetail(){
  var t = ALL.find(function(x){ return x.id === selId; });
  var pdet = document.getElementById('pdet');
  if(!t){
    pdet.innerHTML = '<div class="det-empty">← 과업을 선택하면 상세 내용이 표시됩니다</div>';
    return;
  }

  secIdx = 0;

  var h = '<div class="det-inner">';

  var collabInner = (t.collab && t.collab.length)
    ? '<div class="collab-tags" style="display:inline-flex;">' + t.collab.map(function(c){ return '<span class="ctag" style="padding:2px 8px; font-size:13px;">'+c+'</span>'; }).join('') + '</div>'
    : '<span style="font-size:13px;color:var(--t3)">—</span>';
  var barCol = pcCol(t.pct, t.status);
  var ce = isAdminMode ? ' contenteditable="true"' : '';

  // 헤더 영역 (화이트 배경 + 테마 컬러 하단 선)
  h += '<div style="margin:-14px -18px 14px -18px; padding:20px 24px; background-color:#ffffff; border-bottom:3px solid var(--theme-p'+t._gid+');">';
  h += '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">';
  
  // Left side: Title + Meta
  h += '<div style="flex:1;">';
  h += '<div class="det-title" data-edit="itemTitle" data-id="'+t.id+'"'+ce+' style="margin-bottom:12px; color:var(--t1); outline:none;">' + t.title + '</div>';
  h += '<div class="det-meta" style="border:none; padding:0; margin-bottom:0; display:flex; align-items:center; gap:16px; flex-wrap:wrap;">'
    + '<span class="badge full ' + t.status + '">' + t.status + '</span>'
    + '<div class="dmi"><span class="lb">PM</span><span class="vl" data-edit="itemPm" data-id="'+t.id+'"'+ce+' style="color:var(--t1); outline:none;">' + t.pm + '</span></div>'
    + '<div class="dmi"><span class="lb" style="margin-right:2px;">협업팀</span>' + collabInner + '</div>'
    + '<div class="dmi"><span class="lb">완료예정</span>' + dchip(t.end) + '</div>'
    + '</div>';
  h += '</div>';

  // Right side: Progress Inline
  h += '<div style="width:220px; flex-shrink:0;">';
  h += '<div style="background:var(--s2); padding:14px 16px; border-radius:10px; display:flex; flex-direction:column; gap:6px; border:1px solid var(--bd);">'
    + '<div style="display:flex; justify-content:space-between; align-items:flex-end;">'
    + '<span style="font-size:13px;font-weight:700;color:var(--t2);">진행률</span>'
    + '<span style="font-size:28px;font-weight:700;font-family:var(--mo);color:'+barCol+';line-height:1;">'+t.pct+'%</span>'
    + '</div>'
    + '<div class="prog-bar" style="margin:4px 0;"><div class="prog-fill" style="width:'+t.pct+'%;background:'+barCol+'"></div></div>'
    + '<div style="font-size:12px;color:var(--t2);text-align:right;">' + (t.start && t.start !== '—' ? t.start+' ~ ' : '') + t.end + '</div>'
    + '</div>';
  h += '</div>';

  h += '</div>'; // flex end
  h += '</div>'; // header block end

  // 첨부문서 영역
  var attachments = t.attachments || t.urls || []; // urls 호환성 유지
  h += '<div style="margin:0 -18px; padding:10px 24px; background:var(--s2); border-bottom:1px solid var(--bd); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
  h += '<span style="font-size:12px; font-weight:700; color:var(--t2); margin-right:4px;">📎 첨부문서</span>';
  if(attachments.length) {
    attachments.forEach(function(att, idx) {
      h += '<a href="' + att.url + '" target="_blank" class="attach-btn">' + att.label + '</a>';
      if(isAdminMode) {
        h += '<button class="attach-del" onclick="removeAttachment('+t.id+','+idx+')" title="삭제">✕</button>';
      }
    });
  } else {
    if(!isAdminMode) h += '<span style="font-size:12px; color:var(--t3);">등록된 첨부문서가 없습니다.</span>';
  }
  if(isAdminMode) {
    h += '<button class="attach-add-btn" onclick="addAttachmentPrompt('+t.id+')">+ 추가</button>';
  }
  h += '</div>';

  // 하단 여백 및 그리드 시작
  h += '<div style="height:20px;"></div>';
  h += '<div class="bottom-grid">';
  h += '<div class="bottom-card '+(t.issue ? 'card-issue' : 'card-issue-empty')+'">'
      + '<div class="bottom-card-hd issue">주요 이슈 & 의사결정 및 지원요청</div>'
      + '<div class="bottom-card-body">'
        + (t.issue
            ? '<div class="issue-body-inner" data-edit="itemIssue" data-id="'+t.id+'"'+ce+' style="outline:none;">'+t.issue+'</div>'
            : '<div class="issue-body-inner" data-edit="itemIssue" data-id="'+t.id+'"'+ce+' style="color:#bbb; padding:16px; border-left:none; background:transparent; outline:none;">• 등록된 이슈사항이 없습니다.</div>')
      + '</div>'
    + '</div>'

    // 과업 추진 현황
    + '<div class="bottom-card card-task">'
      + '<div class="bottom-card-hd">과업 추진 현황</div>'
      + '<div class="bottom-card-body">'
        + '<div class="task-body">'
          + '<div class="task-row">'
            + '<div class="task-row-label" style="color:var(--blue)">[지난주]</div>'
            + '<div class="task-row-content" data-edit="itemLastWeek" data-id="'+t.id+'"'+ce+' style="outline:none;'+(!(t.lastWeek)?'color:#bbb;':'')+'">'+(t.lastWeek || '• 내용을 입력해주세요.')+'</div>'
          + '</div>'
          + '<div class="task-row">'
            + '<div class="task-row-label" style="color:var(--green)">[이번주]</div>'
            + '<div class="task-row-content" data-edit="itemThisWeek" data-id="'+t.id+'"'+ce+' style="outline:none;'+(!(t.thisWeek)?'color:#bbb;':'')+'">'+(t.thisWeek || '• 내용을 입력해주세요.')+'</div>'
          + '</div>'
          + '<div class="task-row">'
            + '<div class="task-row-label" style="color:var(--amber)">[예정]</div>'
            + '<div class="task-row-content" data-edit="itemNextPlan" data-id="'+t.id+'"'+ce+' style="outline:none;'+(!(t.nextPlan)?'color:#bbb;':'')+'">'+(t.nextPlan || '• 내용을 입력해주세요.')+'</div>'
          + '</div>'
        + '</div>'
      + '</div>'
    + '</div>'

  + '</div>';

  h += '</div>';
  pdet.innerHTML = h;
}

/* 분기 탭 */
function setQ(q,btn){
  curQ=q;selId=null;activeCat=null;
  document.querySelectorAll('.qt').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
  renderKpi();
  applyLayout(null);
  if(isDual){ renderS2Gantt(); renderS2Detail(null); }
}

/* 듀얼 스크린 토글 */
var isDual = true;
function toggleScreenMode(){
  isDual = !isDual;
  var wrap = document.getElementById('screensWrap');
  wrap.className = 'screens-wrap ' + (isDual ? 'dual' : 'single');
  if(isDual){ renderS2Gantt(); renderS2Detail(selId); }
}

/* ══ 간트 차트 — 분기 필터 ══ */
function renderS2Gantt(){
  var el=document.getElementById('s2-gantt');
  var wrap=document.getElementById('s2GanttWrap');
  var sub=document.getElementById('s2GanttSub');
  if(!el) return;

  /* 분기별 월 범위 */
  var qMap={
    '전체':{months:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],start:0,end:11,label:'2026 전체 (스크롤)'},
    '1Q':{months:['1월','2월','3월'],start:0,end:2,label:'2026 1Q (1~3월)'},
    '2Q':{months:['4월','5월','6월'],start:3,end:5,label:'2026 2Q (4~6월)'},
    '3Q':{months:['7월','8월','9월'],start:6,end:8,label:'2026 3Q (7~9월)'},
    '4Q':{months:['10월','11월','12월'],start:9,end:11,label:'2026 4Q (10~12월)'},
  };
  var q = qMap[curQ] || qMap['전체'];
  var now = new Date();
  var todayMonth = now.getMonth() + 1;
  var todayDate = now.getDate();
  var todayFmt = (todayMonth < 10 ? '0' : '') + todayMonth + '/' + (todayDate < 10 ? '0' : '') + todayDate;

  if(sub) {
    sub.style.flex = "1";
    sub.style.display = "flex";
    sub.style.alignItems = "center";
    sub.innerHTML = '<span>' + q.label + '</span>'
      + '<div style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t3);">'
      + '<div style="width:12px;height:2px;background:var(--red);border-radius:1px;opacity:.7"></div>오늘 (' + todayFmt + ')</div>';
  }

  /* 전체일 때 스크롤 가능하게 */
  if(curQ==='전체') wrap.classList.add('scrollable');
  else wrap.classList.remove('scrollable');

  var TOTAL=q.end-q.start+1; /* 표시할 월 수 */

  function monthOffset(dateStr){
    var d=new Date(dateStr);
    return (d.getFullYear()-2026)*12+d.getMonth();
  }
  var todayOffset = (now.getFullYear()-2026)*12 + now.getMonth();
  var todayPct = ((todayOffset - q.start + (now.getDate() / 30)) / TOTAL) * 100; /* 오늘 위치 % */

  /* 해당 분기와 겹치는 프로젝트 필터 */
  var statusColor={'진행':'var(--blue)','완료':'var(--green)','검토중':'var(--amber)','지연':'var(--red)','보류':'#bbb','예정':'#ccc'};
  var proj=ALL.filter(function(t){
    if(!t.start||t.start==='—'||!t.end||t.end.includes('월')||t.end==='상시'||t.end==='—') return false;
    
    // 팀원 선택 필터
    if(window.selTeamMember) {
      var isPm = t.pm === window.selTeamMember;
      var isOwner = t.owner === window.selTeamMember;
      var isCollab = t.collab && t.collab.includes(window.selTeamMember);
      if(!isPm && !isOwner && !isCollab) return false;
    }

    var sm=monthOffset(t.start), em=monthOffset(t.end);
    return em>=q.start && sm<=q.end;
  });

  /* 월 헤더 */
  var html='<div class="s2-gantt-month-row">'
    +'<div class="s2-gantt-month-spacer"></div>'
    +'<div class="s2-gantt-months">'
    +q.months.map(function(m){return '<div class="s2-gantt-month">'+m+'</div>';}).join('')
    +'</div></div>';

  if(!proj.length){
    html+='<div style="padding:14px 0;color:var(--t3);font-size:14px;text-align:center">해당 분기 과업 없음</div>';
    el.innerHTML=html; return;
  }

  proj.forEach(function(t){
    var sm=Math.max(monthOffset(t.start),q.start);
    var em=Math.min(monthOffset(t.end),q.end);
    var startPct=((sm-q.start)/TOTAL)*100;
    var totalPct=((em-sm+1)/TOTAL)*100;
    var fillPct=totalPct*(t.pct/100);
    var col = (t._gid !== undefined) ? 'var(--theme-p'+t._gid+')' : statusColor[t.status]||'var(--bd2)';
    var isSel=selId===t.id;

    html+='<div class="s2-gantt-row" style="'+(isSel?'background:#eff6ff;margin:0 -18px;padding:0 18px;border-radius:4px;':'')+'">'
      +'<div class="s2-gantt-lbl" title="'+t.title+'"><span style="color:'+(isSel?'var(--blue)':'var(--t2)')+'">'+t.title+'</span></div>'
      +'<div class="s2-gantt-track">'
        +(todayPct>=0&&todayPct<=100?'<div class="s2-gantt-today" style="left:'+todayPct.toFixed(1)+'%"></div>':'')
        +'<div class="s2-gantt-bg" style="left:'+startPct.toFixed(1)+'%;width:'+totalPct.toFixed(1)+'%"></div>'
        +'<div class="s2-gantt-fill" style="left:'+startPct.toFixed(1)+'%;width:'+Math.max(fillPct,0).toFixed(1)+'%;background:'+col+'">'
          +(fillPct>8?'<span class="s2-gantt-fill-pct">'+t.pct+'%</span>':'')
        +'</div>'
      +'</div>'
    +'</div>';
  });

  el.innerHTML=html;
}

/* ══ 스크린2 상세: 개요 + 체크리스트 ══ */
var checkState={}; /* {id_ms_i: bool, id_task_i: bool} */

function toggleCheck(key,defaultVal){
  if(checkState[key]===undefined) checkState[key]=defaultVal;
  checkState[key]=!checkState[key];
  renderS2Detail(selId);
}

function renderS2Detail(id){
  var el=document.getElementById('s2-detail');
  if(!el) return;
  if(!id){
    el.innerHTML='<div class="s2-det-empty"><span style="font-size:28px;opacity:.25">←</span><span>스크린 1에서 카드를 선택하면 상세 내용이 표시됩니다</span></div>';
    return;
  }
  var t=ALL.find(function(x){return x.id===id;});
  if(!t){el.innerHTML='<div class="s2-det-empty"><span>과업을 찾을 수 없습니다</span></div>';return;}

  var barCol=pcCol(t.pct,t.status);
  var collabInner = (t.collab && t.collab.length)
    ? '<div class="collab-tags" style="display:inline-flex;">' + t.collab.map(function(c){ return '<span class="ctag" style="padding:2px 8px; font-size:13px;">'+c+'</span>'; }).join('') + '</div>'
    : '<span style="font-size:13px;color:var(--t3)">—</span>';
  var ce = isAdminMode ? ' contenteditable="true"' : '';

  /* ── 헤더 ── */
  var h='<div class="s2-det-inner">'
    +'<div class="s2-det-hd">'
      +'<div class="s2-det-title">'+t.title+'</div>'
      +'<div class="s2-det-meta">'
        +'<span class="badge full '+t.status+'">'+t.status+'</span>'
        +'<div class="dmi"><span class="lb">PM</span><span class="vl">'+t.pm+'</span></div>'
        +'<div class="dmi"><span class="lb" style="margin-right:2px;">협업팀</span>' + collabInner + '</div>'
        +(t.owner&&t.owner!=='—'?'<div class="dmi"><span class="lb">담당</span><span class="vl">'+t.owner+'</span></div>':'')
        +'<div class="dmi"><span class="lb">완료예정</span>'+dchip(t.end)+'</div>'
        /* 진행률 인라인 */
        +'<div style="display:flex;align-items:center;gap:8px;margin-left:auto">'
          +'<div style="width:120px;height:8px;background:var(--bd);border-radius:4px;overflow:hidden">'
            +'<div style="height:100%;width:'+t.pct+'%;background:'+barCol+';border-radius:4px"></div>'
          +'</div>'
          +'<span style="font-size:15px;font-weight:700;font-family:var(--mo);color:'+barCol+'">'+t.pct+'%</span>'
        +'</div>'
      +'</div>'
    +'</div>';

  /* ── 첨부문서 ── */
  var attachments = t.attachments || t.urls || [];
  h+='<div style="padding:8px 16px; background:var(--s2); border-bottom:1px solid var(--bd); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
  h+='<span style="font-size:12px; font-weight:700; color:var(--t2); margin-right:4px;">📎 첨부문서</span>';
  if(attachments.length) {
    attachments.forEach(function(att, idx) {
      h+='<a href="'+att.url+'" target="_blank" class="attach-btn">'+att.label+'</a>';
      if(isAdminMode) {
        h+='<button class="attach-del" onclick="removeAttachment('+t.id+','+idx+')" title="삭제">✕</button>';
      }
    });
  } else {
    if(!isAdminMode) h+='<span style="font-size:12px; color:var(--t3);">등록된 첨부문서가 없습니다.</span>';
  }
  if(isAdminMode) {
    h+='<button class="attach-add-btn" onclick="addAttachmentPrompt('+t.id+')">+ 추가</button>';
  }
  h+='</div>';

  /* ── 본문 3열 ── */
  h+='<div class="s2-det-body">';

  /* 1열: 과업 개요/목적 */
  h+='<div class="s2-det-col">'
    +'<div class="s2-det-col-hd">과업 개요/목적</div>'
    +'<div class="s2-det-col-body">'
      +'<div class="s2-overview" data-edit="itemContent" data-id="'+t.id+'"'+ce+' style="outline:none;">'+(t.content ? t.content : '<span style="color:#bbb">• 내용 없음</span>')+'</div>'
    +'</div>'
  +'</div>';

  /* 2열: 세미나&회의 이력 */
  var meetHtml = '';
  if (t.meetings && t.meetings.length > 0) {
    meetHtml = t.meetings.map(function(m) {
      return '<div style="margin-bottom:10px;font-size:14px;line-height:1.5;">'
           + '<div style="color:var(--blue);font-weight:700;font-size:12px;margin-bottom:2px;">'+m.d+'</div>'
           + '<div style="color:var(--t1);">'+m.t+'</div>'
           + '</div>';
    }).join('');
  } else {
    meetHtml = '<span style="color:#bbb;font-size:14px;">• 회의 이력 없음</span>';
  }

  h+='<div class="s2-det-col">'
    +'<div class="s2-det-col-hd">세미나&회의 이력</div>'
    +'<div class="s2-det-col-body">'
      +'<div data-edit="itemMeetings" data-id="'+t.id+'"'+ce+' style="outline:none;">'+meetHtml+'</div>'
    +'</div>'
  +'</div>';

  /* 3열: 이슈 히스토리 */
  h+='<div class="s2-det-col">'
    +'<div class="s2-det-col-hd">이슈 히스토리</div>'
    +'<div class="s2-det-col-body">'
      +'<div class="s2-overview" data-edit="itemIssue" data-id="'+t.id+'"'+ce+' style="color:var(--t1);outline:none;">'+(t.issue ? t.issue : '<span style="color:#bbb;font-size:14px;">• 특이사항 없음</span>')+'</div>'
    +'</div>'
  +'</div>';

  h+='</div>'; /* det-body */
  h+='</div>'; /* det-inner */
  el.innerHTML=h;
}

/* 헤더 날짜 업데이트 */
function updateHeaderDate() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var date = now.getDate();
  var day = now.getDay();
  
  var diffToMon = (day === 0 ? -6 : 1 - day);
  var mon = new Date(now);
  mon.setDate(date + diffToMon);
  var fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);

  function fmt(d) {
    return d.getFullYear().toString().slice(-2) + '. ' + 
           ('0' + (d.getMonth() + 1)).slice(-2) + '. ' + 
           ('0' + d.getDate()).slice(-2);
  }

  var weekNo = Math.ceil((date + (6 - (day === 0 ? 7 : day) + 1)) / 7);
  var dateStr = month + '월 ' + weekNo + '주차 (' + fmt(mon) + ' ~ ' + fmt(fri) + ')';
  
  var target = document.getElementById('hd-date');
  if(target) target.textContent = dateStr;
}

window.selTeamMember = null;
function selectTeamMember(name, el) {
  var isActive = el.classList.contains('active');
  
  // 모든 사람 카드 액티브 리셋
  document.querySelectorAll('.team-card').forEach(function(card) {
     card.classList.remove('active');
     card.style.borderColor = 'var(--bd)';
     card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
  });

  if (isActive) {
     window.selTeamMember = null;
  } else {
     window.selTeamMember = name;
     el.classList.add('active');
     el.style.borderColor = 'var(--blue)';
     el.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
  }

  // 타임라인 갱신
  if (typeof renderS2Gantt === 'function') {
    renderS2Gantt();
  }
}

function updateTeamCardStats() {
  document.querySelectorAll('.team-card').forEach(function(card) {
    var nameEl = card.querySelector('.tc-name');
    if (!nameEl) return;
    var name = nameEl.innerText.trim();
    var mainCount = 0;
    var routineCount = 0;

    GRP.forEach(function(g) {
      g.items.forEach(function(t) {
        var isInv = false;
        if (t.pm && t.pm.indexOf(name) !== -1) isInv = true;
        if (t.owner && t.owner.indexOf(name) !== -1) isInv = true;
        if (t.collab) {
          t.collab.forEach(function(c) {
            if (c.indexOf(name) !== -1) isInv = true;
          });
        }
        if (isInv) {
          if (g.id === 0) mainCount++;
          else routineCount++;
        }
      });
    });

    var tot = mainCount + routineCount;
    var mp = 0, rp = 0;
    if (tot > 0) {
      mp = Math.round((mainCount / tot) * 100);
      rp = 100 - mp;
    }

    var svs = card.querySelectorAll('.tc-sv');
    if (svs.length >= 2) {
      svs[0].innerText = mp + '%';
      svs[1].innerText = rp + '%';
    }
  });
}

// 바탕 클릭 시 아코디언/선택상태 해제
document.addEventListener('click', function(e) {
  if (selId !== null) {
    var clickedCard = e.target.closest('.card, .mini-card, .team-card');
    var clickedDetail = e.target.closest('.panel.det');
    var clickedS2 = e.target.closest('#screen2');
    var clickedControl = e.target.closest('.screen-toggle, .qt');
    
    if (!clickedCard && !clickedDetail && !clickedS2 && !clickedControl) {
      selId = null;
      activeCat = null;
      applyLayout(null);
      renderDetail();
      if (typeof renderS2Detail === 'function' && typeof isDual !== 'undefined' && isDual) {
        renderS2Detail(null);
      }
    }
  }
});

/* init */
updateHeaderDate();
updateTeamCardStats();
renderKpi();
applyLayout(null);
renderS2Gantt();
renderS2Detail(null);

/* ── 관리자 모드 관련 ── */
function toggleAdminMode(){
  isAdminMode = !isAdminMode;
  document.body.classList.toggle('admin-mode', isAdminMode);
  var btn = document.getElementById('adminToggle');
  var resetBtn = document.getElementById('adminReset');
  if(isAdminMode) {
    btn.style.background = 'var(--blue)';
    btn.style.color = '#fff';
    resetBtn.style.display = 'inline-block';
    
    document.querySelectorAll('[data-edit]').forEach(function(el){
       el.setAttribute('contenteditable', 'true');
    });
  } else {
    btn.style.background = 'transparent';
    btn.style.color = 'var(--blue)';
    resetBtn.style.display = 'none';
    
    document.querySelectorAll('[data-edit]').forEach(function(el){
       el.removeAttribute('contenteditable');
    });
  }
}

function resetAdminData() {
  if(confirm("모든 수정 사항이 초기화되고 데모 데이터로 돌아갑니다. 계속하시겠습니까?")) {
    localStorage.removeItem('dashboardData_GRP');
    location.reload();
  }
}

// 텍스트 편집 후 저장 로직 (focusout 활용)
document.addEventListener('focusout', function(e) {
  if(!isAdminMode) return;
  var el = e.target;
  if(!el.hasAttribute('data-edit')) return;
  
  var editType = el.getAttribute('data-edit');
  var id = parseInt(el.getAttribute('data-id'), 10);
  var gid = parseInt(el.getAttribute('data-gid'), 10);
  
  var text = el.innerText;
  
  if (editType === 'catLabel') {
    GRP[gid].label = text;
  } else {
    var t = ALL.find(function(x) { return x.id === id; });
    if(t) {
      if(editType === 'itemTitle') t.title = text;
      else if(editType === 'itemPm') t.pm = text;
      else if(editType === 'itemOwner') t.owner = text;
      else if(editType === 'itemContent') t.content = text;
      else if(editType === 'itemIssue') t.issue = text;
      else if(editType === 'itemLastWeek') t.lastWeek = text;
      else if(editType === 'itemThisWeek') t.thisWeek = text;
      else if(editType === 'itemNextPlan') t.nextPlan = text;
      else if(editType === 'itemMeetings') t.meetingsText = text;
    }
  }
  saveToLocal();
});

// 관리자 모드 시 편집요소 클릭이 카드의 onclick 액션을 발동시키지 않도록 방지
document.addEventListener('click', function(e) {
  if (isAdminMode && e.target.closest('[contenteditable="true"]')) {
     e.stopPropagation();
  }
}, true);

/* ── 첨부문서 관리 ── */
var attachTargetId = null;

function addAttachmentPrompt(taskId) {
  attachTargetId = taskId;
  document.getElementById('attachLabel').value = '';
  document.getElementById('attachUrl').value = '';
  var modal = document.getElementById('attachModal');
  modal.classList.add('open');
}

function closeAttachModal() {
  document.getElementById('attachModal').classList.remove('open');
  attachTargetId = null;
}

function saveAttachment() {
  var label = document.getElementById('attachLabel').value.trim();
  var url = document.getElementById('attachUrl').value.trim();
  if (!label) { alert('문서 제목을 입력하세요.'); return; }
  if (!url) { alert('파일 URL을 입력하세요.'); return; }

  var t = ALL.find(function(x) { return x.id === attachTargetId; });
  if (!t) return;
  if (!t.attachments) t.attachments = [];
  t.attachments.push({ label: label, url: url });
  saveToLocal();
  closeAttachModal();
  renderDetail();
  if (isDual) renderS2Detail(selId);
}

function removeAttachment(taskId, idx) {
  var t = ALL.find(function(x) { return x.id === taskId; });
  if (!t || !t.attachments) return;
  t.attachments.splice(idx, 1);
  saveToLocal();
  renderDetail();
  if (isDual) renderS2Detail(selId);
}

/* ══════════════════════════════════
   CRUD 모달 — 업무 추가/수정/삭제
══════════════════════════════════ */
var modalMode = 'add'; // 'add' or 'edit'
var modalEditId = null;
var modalEditGid = null;

function getNextId(){
  var maxId = 0;
  ALL.forEach(function(t){ if(t.id > maxId) maxId = t.id; });
  return maxId + 1;
}

function openTaskModal(mode, taskId, groupId){
  // 듀얼 모드가 아니면 자동 활성화 (모달이 스크린2 안에 있으므로)
  if(!isDual) toggleScreenMode();

  modalMode = mode;
  var overlay = document.getElementById('taskModal');
  var title = document.getElementById('modalTitle');
  var delBtn = document.getElementById('modalDeleteBtn');

  // 폼 초기화
  document.getElementById('mfGroup').value = '0';
  document.getElementById('mfQ').value = '1Q';
  document.getElementById('mfTitle').value = '';
  document.getElementById('mfPm').value = '';
  document.getElementById('mfOwner').value = '';
  document.getElementById('mfPriority').value = '중';
  document.getElementById('mfStatus').value = '진행';
  document.getElementById('mfPct').value = 0;
  document.getElementById('mfPctVal').textContent = '0%';
  document.getElementById('mfStart').value = '';
  document.getElementById('mfEnd').value = '';
  document.getElementById('mfCollab').value = '';
  document.getElementById('mfContent').value = '';
  document.getElementById('mfIssue').value = '';

  if(mode === 'edit' && taskId != null){
    title.textContent = '업무 수정';
    delBtn.style.display = 'inline-flex';
    modalEditId = taskId;
    modalEditGid = groupId;

    var t = ALL.find(function(x){ return x.id === taskId; });
    if(t){
      // 어떤 그룹에 속해 있는지 찾기
      var gIdx = 0;
      GRP.forEach(function(g, i){
        g.items.forEach(function(item){
          if(item.id === taskId) gIdx = i;
        });
      });
      document.getElementById('mfGroup').value = gIdx;
      document.getElementById('mfQ').value = t.q || '1Q';
      document.getElementById('mfTitle').value = t.title || '';
      document.getElementById('mfPm').value = t.pm || '';
      document.getElementById('mfOwner').value = (t.owner && t.owner !== '—') ? t.owner : '';
      document.getElementById('mfPriority').value = t.priority || '중';
      document.getElementById('mfStatus').value = t.status || '진행';
      document.getElementById('mfPct').value = t.pct || 0;
      document.getElementById('mfPctVal').textContent = (t.pct || 0) + '%';
      document.getElementById('mfStart').value = (t.start && t.start !== '—') ? t.start : '';
      document.getElementById('mfEnd').value = t.end || '';
      document.getElementById('mfCollab').value = (t.collab && t.collab.length) ? t.collab.join(', ') : '';
      document.getElementById('mfContent').value = t.content || '';
      document.getElementById('mfIssue').value = t.issue || '';
    }
  } else {
    title.textContent = '업무 추가';
    delBtn.style.display = 'none';
    modalEditId = null;
    modalEditGid = null;
  }

  // 모달 열기
  setTimeout(function(){ overlay.classList.add('open'); }, 10);
}

function closeTaskModal(){
  document.getElementById('taskModal').classList.remove('open');
}

function saveTask(){
  var titleVal = document.getElementById('mfTitle').value.trim();
  var pmVal = document.getElementById('mfPm').value.trim();
  if(!titleVal){ alert('업무명을 입력해주세요.'); return; }
  if(!pmVal){ alert('PM(담당자)을 입력해주세요.'); return; }

  var gIdx = parseInt(document.getElementById('mfGroup').value, 10);
  var collabStr = document.getElementById('mfCollab').value.trim();
  var collabArr = collabStr ? collabStr.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [];
  var startVal = document.getElementById('mfStart').value || '—';
  var ownerVal = document.getElementById('mfOwner').value.trim() || '—';
  var endVal = document.getElementById('mfEnd').value.trim() || '—';

  var taskObj = {
    id: modalMode === 'edit' ? modalEditId : getNextId(),
    title: titleVal,
    pm: pmVal,
    owner: ownerVal,
    priority: document.getElementById('mfPriority').value,
    status: document.getElementById('mfStatus').value,
    pct: parseInt(document.getElementById('mfPct').value, 10),
    q: document.getElementById('mfQ').value,
    start: startVal,
    end: endVal,
    collab: collabArr,
    content: document.getElementById('mfContent').value,
    issue: document.getElementById('mfIssue').value,
    meetings: [],
    attachments: []
  };

  if(modalMode === 'edit'){
    // 기존 항목 업데이트 — 기존 데이터(첨부파일 등) 보존
    var oldTask = ALL.find(function(x){ return x.id === modalEditId; });
    if(oldTask){
      taskObj.meetings = oldTask.meetings || [];
      taskObj.attachments = oldTask.attachments || oldTask.urls || [];
    }

    // 기존 그룹에서 제거
    GRP.forEach(function(g){
      g.items = g.items.filter(function(item){ return item.id !== modalEditId; });
    });
    // 새 그룹에 추가
    GRP[gIdx].items.push(taskObj);

    // ALL 배열 업데이트
    var allIdx = -1;
    ALL.forEach(function(x, i){ if(x.id === modalEditId) allIdx = i; });
    if(allIdx >= 0) ALL[allIdx] = taskObj;
    else ALL.push(taskObj);
  } else {
    // 신규 추가
    GRP[gIdx].items.push(taskObj);
    ALL.push(taskObj);
  }

  saveToLocal();
  closeTaskModal();
  refreshAll();
}

function deleteTask(taskId){
  if(!confirm('이 업무를 삭제하시겠습니까?')) return;
  // GRP에서 제거
  GRP.forEach(function(g){
    g.items = g.items.filter(function(item){ return item.id !== taskId; });
  });
  // ALL에서 제거
  ALL = ALL.filter(function(x){ return x.id !== taskId; });
  // 선택 해제
  if(selId === taskId){ selId = null; activeCat = null; }
  saveToLocal();
  refreshAll();
}

function deleteTaskFromModal(){
  if(modalEditId != null){
    closeTaskModal();
    deleteTask(modalEditId);
  }
}

function refreshAll(){
  updateTeamCardStats();
  renderKpi();
  if(activeCat !== null){
    applyLayout(activeCat);
  } else {
    applyLayout(null);
  }
  renderDetail();
  if(isDual){ renderS2Gantt(); renderS2Detail(selId); }
}

/* ══ 데이터 내보내기 (data.js 다운로드) ══ */
function exportDataFile(){
  // GRP를 보기 좋은 JS 형태로 직렬화
  var lines = '/* ════ 데이터 ════ */\n';
  lines += 'var GRP = ';
  lines += JSON.stringify(GRP, null, 2);
  lines += ';\n';

  var blob = new Blob([lines], {type: 'application/javascript;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ESC 키로 모달 닫기 */
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    var modal = document.getElementById('taskModal');
    if(modal && modal.classList.contains('open')){
      closeTaskModal();
    }
    var rptModal = document.getElementById('reportModal');
    if(rptModal && rptModal.classList.contains('open')){
      closeReportModal();
    }
  }
});

/* 모달 오버레이 클릭으로 닫기 */
document.getElementById('taskModal').addEventListener('click', function(e){
  if(e.target === this) closeTaskModal();
});
document.getElementById('reportModal').addEventListener('click', function(e){
  if(e.target === this) closeReportModal();
});

/* ══════════════════════════════════
   업무보고서 생성
══════════════════════════════════ */
function openReportModal(){
  generateReport();
  setTimeout(function(){ document.getElementById('reportModal').classList.add('open'); }, 10);
}
function closeReportModal(){
  document.getElementById('reportModal').classList.remove('open');
}
function printReport(){
  window.print();
}

function getDateInfo(){
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth()+1;
  var d = now.getDate();
  var day = now.getDay();

  // 이번주 월~금
  var diffToMon = (day===0?-6:1-day);
  var mon = new Date(now); mon.setDate(d+diffToMon);
  var fri = new Date(mon); fri.setDate(mon.getDate()+4);

  function fmt(dt){ return dt.getFullYear()+'.'+('0'+(dt.getMonth()+1)).slice(-2)+'.'+('0'+dt.getDate()).slice(-2); }
  var weekNo = Math.ceil((d + (6-(day===0?7:day)+1))/7);
  var q = m<=3?'1Q':m<=6?'2Q':m<=9?'3Q':'4Q';

  return {
    year:y, month:m, date:d, q:q,
    weekNo:weekNo,
    weekRange: fmt(mon)+' ~ '+fmt(fri),
    monthLabel: y+'년 '+m+'월',
    qLabel: y+'년 '+q,
    today: fmt(now)
  };
}

function rptBadge(st){ return '<span class="rpt-badge '+st+'">'+st+'</span>'; }

function rptSummaryHtml(items){
  var tot=items.length, ing=0, done=0, hold=0;
  items.forEach(function(t){
    if(t.status==='진행') ing++;
    else if(t.status==='완료') done++;
    else if(t.status==='보류'||t.status==='예정'||t.status==='지연') hold++;
  });
  var ia = items.filter(function(t){return t.status==='진행';});
  var avg = ia.length ? Math.round(ia.reduce(function(s,t){return s+t.pct;},0)/ia.length) : 0;

  return '<div class="rpt-summary-grid">'
    +'<div class="rpt-summary-card"><div class="rpt-sc-label">전체 업무</div><div class="rpt-sc-value" style="color:var(--t1)">'+tot+'</div></div>'
    +'<div class="rpt-summary-card"><div class="rpt-sc-label">진행중</div><div class="rpt-sc-value" style="color:var(--blue)">'+ing+'</div></div>'
    +'<div class="rpt-summary-card"><div class="rpt-sc-label">완료</div><div class="rpt-sc-value" style="color:var(--green)">'+done+'</div></div>'
    +'<div class="rpt-summary-card"><div class="rpt-sc-label">평균 진행률</div><div class="rpt-sc-value" style="color:var(--amber)">'+avg+'%</div></div>'
  +'</div>';
}

function rptTaskTable(items, showWeekly){
  var h='<table class="rpt-table"><thead><tr>'
    +'<th style="width:22%">업무명</th>'
    +'<th style="width:8%">상태</th>'
    +'<th style="width:10%">PM</th>'
    +'<th style="width:8%">진행률</th>'
    +'<th style="width:12%">마감</th>';
  if(showWeekly){
    h+='<th style="width:20%">지난주 실적</th>'
      +'<th style="width:20%">이번주 계획</th>';
  } else {
    h+='<th>주요 내용</th>';
  }
  h+='</tr></thead><tbody>';

  items.forEach(function(t){
    h+='<tr>'
      +'<td style="font-weight:600">'+t.title+'</td>'
      +'<td>'+rptBadge(t.status)+'</td>'
      +'<td>'+t.pm+'</td>'
      +'<td style="font-family:var(--mo);font-weight:600;text-align:center">'+t.pct+'%</td>'
      +'<td style="font-family:var(--mo);font-size:12px">'+t.end+'</td>';
    if(showWeekly){
      h+='<td style="font-size:12px">'+(t.lastWeek||'—')+'</td>'
        +'<td style="font-size:12px">'+(t.thisWeek||'—')+'</td>';
    } else {
      h+='<td style="font-size:12px">'+(t.content?t.content.substring(0,80)+(t.content.length>80?'...':''):'—')+'</td>';
    }
    h+='</tr>';
  });
  h+='</tbody></table>';
  return h;
}

function rptIssuesHtml(items){
  var issues = items.filter(function(t){ return t.issue && t.issue.trim(); });
  if(!issues.length) return '<div style="color:var(--t3);font-size:13px;padding:8px 0">• 등록된 이슈사항이 없습니다.</div>';
  var h='';
  issues.forEach(function(t){
    h+='<div class="rpt-issue-item">'
      +'<div class="rpt-issue-title">['+t.title+'] <span style="font-weight:400;color:var(--t3)">PM: '+t.pm+'</span></div>'
      +'<div class="rpt-issue-text">'+t.issue+'</div>'
    +'</div>';
  });
  return h;
}

function generateReport(){
  var type = document.getElementById('reportType').value;
  var di = getDateInfo();
  var el = document.getElementById('reportContent');

  var titleMap = {
    weekly: '주간 업무보고서',
    monthly: '월간 업무보고서',
    quarterly: '분기 업무보고서'
  };
  var periodMap = {
    weekly: di.month+'월 '+di.weekNo+'주차 ('+di.weekRange+')',
    monthly: di.monthLabel,
    quarterly: di.qLabel
  };

  // 데이터 필터링
  var filtered = ALL;
  if(type==='quarterly'){
    filtered = ALL.filter(function(t){ return t.q===di.q || t.q==='상시' || t.q==='전체'; });
  }

  var h='<div class="rpt-header">'
    +'<div class="rpt-org">한맥가족 총괄기획실 · 경영기획팀</div>'
    +'<h1>'+titleMap[type]+'</h1>'
    +'<div class="rpt-sub">보고 기간: '+periodMap[type]+' | 작성일: '+di.today+'</div>'
  +'</div>';

  // 1. 요약
  h+='<div class="rpt-section">'
    +'<div class="rpt-section-title">Ⅰ. 업무 현황 요약</div>'
    +rptSummaryHtml(filtered)
  +'</div>';

  // 2. 카테고리별 상세
  var catLabels = ['프로젝트','경영지원','연구과제','상시업무'];
  GRP.forEach(function(g, i){
    var items = (type==='quarterly')
      ? g.items.filter(function(t){ return t.q===di.q || t.q==='상시' || t.q==='전체'; })
      : g.items;
    if(!items.length) return;

    var colors = ['','green','amber',''];
    h+='<div class="rpt-section">'
      +'<div class="rpt-section-title '+(colors[i]||'')+'">Ⅱ-'+(i+1)+'. '+(g.label||catLabels[i])+'</div>'
      +rptTaskTable(items, type==='weekly')
    +'</div>';
  });

  // 3. 주요 이슈사항
  h+='<div class="rpt-section">'
    +'<div class="rpt-section-title red">Ⅲ. 주요 이슈 및 의사결정 사항</div>'
    +rptIssuesHtml(filtered)
  +'</div>';

  // 4. 주간 보고서일 때 — 차주 계획
  if(type==='weekly'){
    h+='<div class="rpt-section">'
      +'<div class="rpt-section-title green">Ⅳ. 차주 계획</div>'
      +'<table class="rpt-table"><thead><tr><th style="width:25%">업무명</th><th style="width:10%">PM</th><th>예정 내용</th></tr></thead><tbody>';
    ALL.forEach(function(t){
      if(t.nextPlan && t.nextPlan.trim()){
        h+='<tr><td style="font-weight:600">'+t.title+'</td><td>'+t.pm+'</td><td style="font-size:12px">'+t.nextPlan+'</td></tr>';
      }
    });
    h+='</tbody></table></div>';
  }

  // 5. 서명란
  h+='<div style="margin-top:40px;display:flex;justify-content:flex-end;gap:40px;">'
    +'<div style="text-align:center;"><div style="font-size:12px;color:var(--t3);margin-bottom:24px;">작성</div><div style="width:80px;border-top:1px solid var(--t1);padding-top:6px;font-size:13px;font-weight:600;">경영기획팀</div></div>'
    +'<div style="text-align:center;"><div style="font-size:12px;color:var(--t3);margin-bottom:24px;">검토</div><div style="width:80px;border-top:1px solid var(--t1);padding-top:6px;font-size:13px;font-weight:600;"></div></div>'
    +'<div style="text-align:center;"><div style="font-size:12px;color:var(--t3);margin-bottom:24px;">승인</div><div style="width:80px;border-top:1px solid var(--t1);padding-top:6px;font-size:13px;font-weight:600;"></div></div>'
  +'</div>';

  el.innerHTML = h;
}