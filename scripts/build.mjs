import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {marked} = await import(pathToFileURL(require.resolve('marked')).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive:true}); fs.writeFileSync(path.join(root, file), value, 'utf8'); };
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = value => String(value).replace(/\*\*|__/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
const TBD = '<span class="badge tbd">TBD</span>';
const data = JSON.parse(read('assets/characters.json'));
const renderer = new marked.Renderer();
renderer.html = token => escape(token.text);
renderer.link = function(token) {
  const label = this.parser.parseInline(token.tokens);
  if (/^attachment:/i.test(token.href)) return `<span class="source-ref">${label} — 원문 첨부 이미지 미제공 · TBD</span>`;
  if (!/^https?:\/\//i.test(token.href) && !/^#[\w-]+$/.test(token.href)) return label;
  return `<a href="${escape(token.href)}"${token.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
};
renderer.image = token => `<span class="source-ref">${escape(token.text || '원문 이미지')} — 이미지 자료 TBD</span>`;
marked.use({renderer, gfm:true, breaks:false});
const md = value => marked.parse(value).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
const table = (headers, rows) => `<div class="table-wrap"><table class="wiki-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const profileTable = rows => `<div class="table-wrap"><table class="wiki-table"><tbody>${rows.map(([k,v])=>`<tr><th class="label" scope="row">${escape(k)}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>`;
const notice = (label, text) => `<div class="notice"><strong>${label}</strong><p>${text}</p></div>`;
const badge = (text, cls='') => `<span class="badge ${cls}">${text}</span>`;
const link = (c, prefix='') => `<a href="${prefix}characters/${c.id}.html">${escape(c.name)}</a>`;
const byId = id => data.find(c=>c.id===id);
const navItems = [['index.html','⌂','대문'],['characters.html','♧','등장인물'],['world.html','◇','세계관·용어'],['story.html','▤','원작 1~5권'],['systems.html','▣','게임 기획'],['resources.html','▦','리소스 제작 기준'],['guide.html','≡','자료·편집 안내']];
const tocHTML = (items, prefix='') => `<aside class="toc" aria-label="이 문서의 목차"><strong>이 문서의 목차</strong>${items.map(([id,label,sub])=>`<a class="${sub?'sub':''}" href="#${id}">${label}</a>`).join('')}<a href="${prefix}resources.html">리소스 제작 기준 ↗</a></aside>`;
const section = (id, number, title, body) => `<section class="section" id="${id}"><h2><span class="section-number">${number}.</span>${title}</h2>${body}</section>`;
function shell({title,subtitle='',eyebrow='STARLIGHT FAIRIES · DEVELOPMENT WIKI',page='index.html',content,toc=[],prefix='',character=false}) {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(title)} — 스타라이트 페어리즈 내부 개발용 위키. 원작소설 1~5권 설정과 ADV·3D 전투 제작 자료."><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#ab2867"><title>${escape(title)} | 스타라이트 페어리즈 개발 위키</title><link rel="icon" href="${prefix}StarlightFairiesLogo.png"><link rel="stylesheet" href="${prefix}assets/style.css">${page==='characters.html'?`<script defer src="${prefix}assets/search-index.js"></script>`:''}<script defer src="${prefix}assets/app.js"></script></head>
<body id="top"><a class="skip" href="#content">본문으로 건너뛰기</a><header class="topbar"><div class="topbar-inner"><button class="menu-button" type="button" aria-label="문서 메뉴 열기" aria-controls="sidebar" aria-expanded="false">☰</button><a class="brand" href="${prefix}index.html"><span class="brand-symbol" aria-hidden="true">✧</span><span><strong>스타라이트 페어리즈</strong><small>DEVELOPMENT WIKI</small></span></a><form class="search" action="${prefix}characters.html" role="search"><label class="sr-only" for="global-search">캐릭터 문서 검색</label><input id="global-search" name="q" type="search" placeholder="캐릭터·변신명·설정 검색" autocomplete="off"><button type="submit">검색</button></form><span class="internal-label">INTERNAL DOCUMENTS</span><button class="theme-button" type="button" aria-label="어두운 테마로 변경" aria-pressed="false">◐</button></div></header>
<div class="layout"><aside class="sidebar" id="sidebar"><nav aria-label="주요 문서"><p class="nav-heading">프로젝트</p>${navItems.map(([url,icon,name],i)=>`${i===2?'<p class="nav-heading">원작과 게임</p>':''}${i===5?'<p class="nav-heading">개발 자료</p>':''}<a class="nav-link ${page===url?'active':''}" ${page===url?'aria-current="page"':''} href="${prefix}${url}"><span class="nav-symbol" aria-hidden="true">${icon}</span>${name}</a>`).join('')}<p class="nav-heading">스타라이트 페어리즈</p>${data.slice(0,4).map(c=>`<a class="nav-link" href="${prefix}characters/${c.id}.html"><span class="nav-symbol" aria-hidden="true" style="color:${c.color}">✦</span>${c.name}</a>`).join('')}</nav><div class="sidebar-brand"><img src="${prefix}BlossomGamesLogo.png" alt="Blossom Games"><span>원작 1–5권 · 게임 개발 자료</span></div></aside><div class="scrim" aria-hidden="true"></div>
<main class="main" id="content"><nav class="breadcrumbs" aria-label="현재 위치"><a href="${prefix}index.html">스타라이트 페어리즈</a><span>›</span>${character?`<a href="${prefix}characters.html">등장인물</a><span>›</span>`:''}<span>${escape(title)}</span></nav><article class="article"><header class="article-heading"><span class="eyebrow">${eyebrow}</span><h1>${escape(title)}</h1>${subtitle?`<p class="subtitle">${escape(subtitle)}</p>`:''}<div class="meta"><span>기준 · 원작소설 1~5권</span><span>게임 · ADV + 3D 전투</span><span>정리 · 2026.09.06</span></div></header>${toc.length?`<div class="article-layout"><div class="article-body">${content}</div>${tocHTML(toc,prefix)}</div>`:content}</article><footer class="footer"><span>Blossom Games · STARLIGHT FAIRIES DEVELOPMENT WIKI</span><span>설정 미확정 항목은 TBD로 표기합니다.</span></footer></main></div><a class="top-link" href="#top" aria-label="문서 맨 위로">↑</a></body></html>`;
}
for (const c of data) {
  c.raw = read(`sources/${c.file}`);
  const profile = c.raw.split(/^## 1\./m)[0];
  c.profile = {};
  for (const line of profile.split('\n').filter(l=>l.startsWith('|'))) {
    const cells = line.split('|').slice(1,-1).map(s=>s.trim());
    if(cells[0] && cells[0]!=='구분' && !/^[- :]+$/.test(cells[0])) c.profile[cells[0]]=cells[1];
  }
  c.sections = [...c.raw.matchAll(/^## (\d+)\.\s*(.+)\n([\s\S]*?)(?=^## \d+\.|$(?![\s\S]))/gm)].map(m=>({number:Number(m[1]),title:m[2].trim(),text:m[3].trim()}));
  c.overview = c.sections.find(s=>s.number===1)?.text || '';
  c.quote = c.overview.split('\n').find(l=>l.startsWith('>'))?.replace(/^>\s*/, '') || '';
  c.intro = c.overview.split(/\n\s*\n/).find(p=>p.trim() && !p.startsWith('>')) || '';
  c.volumes = [...(c.sections.find(s=>s.number===6)?.text || '').matchAll(/^### 6\.(\d+)\.\s*(.+)\n([\s\S]*?)(?=^### 6\.|$(?![\s\S]))/gm)].map(m=>({number:Number(m[1]),title:m[2],text:m[3]}));
  c.chapters = c.volumes.flatMap(v=>[...v.text.matchAll(/^####\s+(\d+)화[.\s]+([^\n]+)\n([\s\S]*?)(?=^#### |$(?![\s\S]))/gm)].map(m=>({number:Number(m[1]),title:m[2].trim().replace(/^〈|〉$/g,''),text:m[3].trim(),volume:v.number})));
}
const profileValue = v => /^(미공개|미정)$/.test(v) ? `${TBD} <span class="muted">원문: ${escape(v)}</span>` : escape(v);
const volumeButtons = '<div class="volume-actions"><button type="button" data-volumes="open">전체 권 펼치기</button><button type="button" data-volumes="close">전체 권 접기</button></div>';
for(const c of data) {
  const quote = c.quote ? `<blockquote class="intro-quote">${md(c.quote)}</blockquote>`:'';
  const mini = [['이름',c.name],['변신·이명',c.alias],['연령',c.profile['연령']],['상징',c.power],['구분',c.group==='협력자·조력자'?(c.id==='kazuki'?'흑성교단 외부 협력자':'기록자·조력자'):c.group],['첫 등장',c.profile['첫 등장']||c.profile['첫 언급']]];
  let content = notice('스포일러 안내','원작소설 1~5권의 정체·결말을 포함합니다. 작중 행적은 원작 기준이며, 게임화 과정에서 일부 내용이 변경·축소·확장될 수 있습니다.');
  content += `<div class="character-top" style="--character:${c.color}"><div>${quote}<div class="summary-copy">${md(c.intro)}</div><div class="tag-row">${badge('원문 반영','pink')}${badge('제작 수치 TBD')}${badge('가상 캐스팅 ≠ 확정 성우')}</div><p class="source-ref">출처: 제공 캐릭터 문서 · 개요 / 특징 / 프로필</p></div><aside class="infobox" aria-label="캐릭터 기본 정보"><div class="box-title">${escape(c.name)}</div><div class="portrait-placeholder"><b>CHARACTER VISUAL</b><span>TBD</span><small>대표 이미지 · 컨셉아트 미제공</small></div><dl class="kv">${mini.map(([k,v])=>`<dt>${k}</dt><dd>${escape(v||'TBD')}</dd>`).join('')}</dl></aside></div>`;
  const rows = [['문서 ID',`<code>${c.id}</code>`],...Object.entries(c.profile).map(([k,v])=>[k,profileValue(v)]),['게임 확정 성우',TBD]];
  content+=section('profile','1','기본 프로필',profileTable(rows));
  const resourceRows = [['신장',`${TBD} <span class="muted">cm</span>`],['체중',`${TBD} <span class="muted">kg</span>`],['쓰리사이즈 (B / W / H)',`${TBD} / ${TBD} / ${TBD} <span class="muted">cm</span>`],['혈액형',TBD],['체형·등신·상대 스케일',TBD],['헤어',escape(c.hair)],['눈동자',escape(c.eyes)],['성격 키워드',`${escape(c.keywords)} ${badge('원문 기반 요약')}`],['모에요소·캐릭터 속성',`${escape(c.moe)} ${badge('제작용 분류')}`],['무기·주요 소품',escape(c.weapon)],['색상 수치·소재 규격',`${TBD} <span class="muted">원문 색상명은 기본 프로필·특징 참조</span>`],['게임 리소스 경로·담당자',TBD]];
  const forms = c.forms.map(form=>`<div class="form-line"><span>${escape(form)}</span><span>${TBD} <span class="muted small">구현·규격</span></span></div>`).join('');
  content+=section('production','2','리소스 제작용 프로필',`<p class="muted small">수치가 없는 항목은 추정하지 않습니다. 성격·모에요소는 원문 묘사를 바탕으로 묶은 제작용 분류이며, 추가 공식 설정을 의미하지 않습니다.</p>${profileTable(resourceRows)}<h3>형태·의상 구분</h3><p class="muted small">원작에 등장하는 형태를 정리했습니다. 게임에서 필요한 모델·스탠딩·차분의 범위는 TBD입니다.</p>${forms}${notice('디자인 메모',escape(c.note))}${profileTable([['ADV','스탠딩 구도·표정·포즈·의상 차분·이벤트 CG: '+TBD],['3D 전투','모델·리깅·애니메이션·VFX·무기 소켓·성능 예산: '+TBD]])}`);
  const secLabels = {1:['overview','3','개요'],2:['traits','4','특징'],3:['abilities','5','능력'],4:['family','6','가족관계'],5:['relationships','7','인간관계'],7:['quotes','9','어록'],8:['trivia','10','기타'],9:['theme','11','테마곡']};
  const toc = [['profile','1. 기본 프로필'],['production','2. 제작용 프로필']];
  for(const s of c.sections) {
    if(s.number===6) {
      let volumes = '';
      for(const v of c.volumes) {
        let html = md(v.text).replace(/<h4>(\d+)화/g, '<h4 id="chapter-$1">$1화');
        volumes += `<details class="volume" id="volume-${v.number}"><summary>${escape(v.title)} <span class="badge">원작</span></summary><div class="volume-content prose">${html}</div></details>`;
      }
      content+=section('story','8','작중 행적',notice('기준','원작소설 1~5권 기준. 아래 권·화 번호는 게임 챕터 번호나 전투 스테이지 번호가 아닙니다.')+volumeButtons+volumes);
      toc.push(['story','8. 작중 행적'],...c.volumes.map(v=>[`volume-${v.number}`,`${v.number}권`,true]));
    } else if(secLabels[s.number]) {
      const [id,n,title] = secLabels[s.number];
      const renumbered = s.text.replace(new RegExp(`^(#{3,4}) ${s.number}\\.`, 'gm'), `$1 ${n}.`);
      content+=section(id,n,title,`<div class="prose">${md(renumbered)}</div>`);
      toc.push([id,`${n}. ${title}`]);
    }
  }
  content+=section('source','자료','출처·게임화 메모',`<p><a href="../sources/${encodeURIComponent(c.file)}">${escape(c.file)} 열기 ↗</a></p><p>본문은 제공된 원작 기준 캐릭터 문서를 반영했습니다. 원작소설 전문과의 직접 대조는 하지 않았습니다. 원문에 있는 이미지 첨부 식별자는 실제 이미지가 제공되지 않아 자리 표시로 남겼습니다.</p>${notice('게임화','원작과 게임의 기본 스토리는 동일합니다. 변경·축소·확장될 장면과 이유, ADV·전투 배치는 최신 기획 확인 후 기록합니다.')}${profileTable([['대응 게임 챕터',TBD],['축소·확장·변경 내역',TBD],['변경 사유·담당자·승인일',TBD]])}`);
  toc.push(['source','출처·게임화 메모']);
  write(`characters/${c.id}.html`,shell({title:c.name,subtitle:c.alias,page:'characters.html',prefix:'../',character:true,eyebrow:'CHARACTER DOCUMENT · '+c.id.toUpperCase(),content,toc}));
}
const strip = `<div class="character-strip">${data.slice(0,4).map(c=>`<a href="characters/${c.id}.html" style="--character:${c.color}"><span>${escape(c.alias)}</span><strong>${c.name}</strong><em>${c.power}의 별빛</em></a>`).join('')}</div>`;
let home = notice('문서 기준','세계관과 작중 행적은 원작소설 1~5권을 기준으로 정리합니다. 게임에는 새 기획의 ADV와 3D 전투 구성을 적용합니다.');
home+=`<div class="home-intro"><div><span class="eyebrow">PROJECT REFERENCE</span><h2>스타라이트 페어리즈 개발 위키</h2><p class="intro-text">호시노미야를 무대로 사랑·희망·용기·믿음의 별빛을 이어가는 소녀들의 이야기. 캐릭터 설정부터 원작 행적, 게임 리소스 기준까지 함께 정리합니다.</p><div class="quick-links"><a class="quick-link" href="characters.html"><strong>등장인물 <span aria-hidden="true" style="display:inline">↗</span></strong><span>10명의 프로필과 원작 행적</span></a><a class="quick-link" href="story.html"><strong>원작 1~5권 ↗</strong><span>50화 목차와 인물별 기록</span></a><a class="quick-link" href="systems.html"><strong>게임 기획 ↗</strong><span>ADV · 전투만 3D</span></a><a class="quick-link" href="resources.html"><strong>리소스 제작 기준 ↗</strong><span>외형 · 차분 · 미확정 규격</span></a></div></div><aside class="gamebox" aria-label="게임 기본 정보"><div class="box-title">스타라이트 페어리즈</div><div class="logo-panel"><img src="StarlightFairiesLogo.png" alt="스타라이트 페어리즈 타이틀 로고" width="3216" height="1614"></div><dl class="kv"><dt>개발</dt><dd>Blossom Games</dd><dt>구성</dt><dd>ADV + 3D 전투</dd><dt>스토리</dt><dd>원작소설과 동일</dd><dt>원작 범위</dt><dd>1~5권 · 총 50화</dd><dt>플랫폼·출시</dt><dd>${TBD}</dd></dl></aside></div>`;
home+=section('overview','1','개요',`<p>《스타라이트 페어리즈》의 내부 개발용 문서 모음입니다. 원작의 인물과 사건을 게임 제작에 참고할 수 있도록 정리하며, 원작에서 확인된 사실과 게임에서 정해야 할 구현 사항을 구분합니다.</p><p>모모카·우미코·히나·시즈키는 서로 다른 상처와 선택을 마주하며 별빛을 이어갑니다. 흑성교단, 별빛연구소의 사고, 네메시스를 둘러싼 사건은 개별 캐릭터 문서와 원작 권별 목차에서 확인할 수 있습니다.</p>`);
home+=section('fairies','2','등장인물',strip+table(['구분','인물','문서 안내'],[['스타라이트 페어리즈',data.slice(0,4).map(c=>link(c)).join(' · '),'사랑 · 희망 · 용기 · 믿음'],['흑성교단 관련 인물',data.slice(4,8).map(c=>link(c)).join(' · '),'소속 변화와 결말은 각 문서 참조'],['외부 협력자·조력자',data.slice(8).map(c=>link(c)).join(' · '),'카즈키는 교단 외부 협력자 / 스펙트라는 조력자']])+'<p class="small"><a href="characters.html">전체 캐릭터 문서와 검색 →</a></p>');
home+=section('reference','3','세계관과 게임',`<div class="doc-grid"><div class="doc-card"><h3><a href="world.html">세계관·용어</a></h3><p>호시노미야, 별빛, 흑성교단, 절광체와 주요 장소.</p></div><div class="doc-card"><h3><a href="story.html">원작의 시간 순서</a></h3><p>1~5권의 화별 목차와 등장인물 문서 바로가기.</p></div><div class="doc-card"><h3><a href="systems.html">게임화 기준</a></h3><p>ADV·3D 전투 적용 범위와 원작 장면의 변경 기록.</p></div></div>`);
home+=section('status','4','자료 반영 현황',table(['항목','현황'],[['캐릭터 문서','제공 MD 10개 반영 · 화별 행적 500건'],['제작용 프로필','신장·체중·쓰리사이즈·성격 키워드·모에요소·형태·소품 정리'],['원작 본문 대조','캐릭터 문서 기준으로 작성. 원작소설 전문 대조는 TBD'],['최신 게임 기획','ADV, 전투만 3D, 원작과 같은 스토리 반영. 상세 규칙은 TBD'],['로고','제공된 회사 로고·게임 타이틀 로고 반영']])+`<p class="small muted">출처·편집 기준과 필요한 추가 자료는 <a href="guide.html">자료·편집 안내</a>에서 확인할 수 있습니다.</p>`);
write('index.html',shell({title:'스타라이트 페어리즈',subtitle:'캐릭터 · 원작 설정 · 게임 제작 자료',content:home}));

let characters = notice('수록 범위','총 10명의 원작 기준 문서입니다. 소속 필터는 문서 탐색용이며, 소속 변화·생존 여부는 캐릭터별 본문을 기준으로 확인합니다.');
characters+=`<form id="character-filter" class="toolbar"><label class="query-label" for="character-query">캐릭터 문서 전체 내용 검색<input id="character-query" type="search" name="q" placeholder="이름, 변신명, 성격, 사건으로 검색"></label><label for="character-group">문서 분류<select id="character-group" name="group">${['전체','페어리즈','흑성교단','협력자·조력자'].map(g=>`<option>${g}</option>`).join('')}</select></label><button type="button" id="reset-filter">초기화</button></form><div class="filter-chips" aria-label="빠른 분류">${['전체','페어리즈','흑성교단','협력자·조력자'].map(g=>`<button type="button" data-group-filter="${g}" aria-pressed="${g==='전체'}">${g}</button>`).join('')}</div><p class="results-label" id="result-count" aria-live="polite">10명 / 전체 10명</p><div class="character-list">${data.map(c=>`<a class="character-card" href="characters/${c.id}.html" data-character="${c.id}" data-group="${c.group}" style="--character:${c.color}"><div class="card-top"><h2>${c.name}</h2>${badge(c.power,'pink')}</div><div class="alias">${escape(c.alias)}</div><p>${escape(c.profile['연령'])}</p><p>${escape(c.keywords)}</p><span class="read">프로필 · 리소스 · 원작 행적 →</span></a>`).join('')}</div><div id="empty-results" class="empty" hidden><strong>일치하는 문서가 없습니다.</strong><p>검색어를 줄이거나 분류를 ‘전체’로 바꿔 주세요.</p></div><noscript><p class="notice">JavaScript가 꺼져 있어 검색·필터를 사용할 수 없습니다. 위의 전체 캐릭터 목록에서 문서를 열 수 있습니다.</p></noscript>`;
write('characters.html',shell({title:'등장인물',subtitle:'이름 너머의 설정까지, 캐릭터 문서 10개',page:'characters.html',content:characters}));
write('assets/search-index.js',`window.STARFAIR_SEARCH = ${JSON.stringify(data.map(c=>({id:c.id,text:[c.name,c.alias,c.keywords,c.moe,c.raw].join('\n')}))).replace(/</g,'\\u003c')};\n`);

const worldRows = [
 ['hoshinomiya','호시노미야','별빛전설이 이어지는 본편의 주 무대. 여학원·상점가·책방·연구소와 별빛축제가 인물들의 일상을 잇는다.',['spectra','momoka']],
 ['starlight','별빛','사람들의 소망과 선택, 관계와 연결되는 힘. 루미너스가 남긴 사랑·희망·용기·믿음의 네 힘이 페어리즈에게 이어진다.',['spectra']],
 ['luminous','루미너스','별빛 그 자체였던 존재. 스펙트라는 루미너스의 권속이자 별빛전설을 처음 기록한 인물이다.',['spectra']],
 ['cult','흑성교단','현대 조직의 창설자는 미카즈키 요루. 간부 서열은 이클리시아 1위, 에테르나 2위, 녹타라 3위, 아포크라 최하위로 정리된다.',['yoru','natsumi','kaori','yuuna']],
 ['gate','암흑게이트·암흑영역','교단 인물들은 실제 상처와 갈등을 절망적인 결론으로 몰아 암흑게이트를 연다. 인물의 내면과 기억은 암흑영역의 사건·전투로 드러난다.',['natsumi','kaori','kazuki']],
 ['body','자아보존형 절광체','자아를 보존한 채 인간의 몸을 어둠으로 대체한 존재. 정화 후 인간 회귀가 모두에게 보장되지는 않으며 개별 사례를 구분한다.',['yoru','natsumi','kaori','yuuna']],
 ['nemesis','네메시스','원초적 암흑. 유우나를 현세의 그릇으로 삼는다. 최종전에서 현세 육체와 의지는 소멸하지만 원초적 암흑 자체는 존속한다.',['yuuna']],
 ['ethernox','에테르녹스','에테르나와 녹타라의 합성체. 요루의 계획과 자매의 갈등을 거쳐 나츠미가 핵을 맡게 된다.',['natsumi','kaori']]
];
let world=notice('출처 안내','제공된 캐릭터 문서의 공통 설정을 요약했습니다. 각 항목의 출처 인물 문서에서 사건 맥락을 확인할 수 있습니다.');
world+=section('terms','1','핵심 개념',table(['용어','원작 기준 설명','출처 문서'],worldRows.map(([id,name,text,ids])=>[`<span id="${id}">${name}</span>`,text,ids.map(i=>link(byId(i))).join(' · ')])));
world+=section('places','2','주요 장소·기관',table(['장소·기관','설정','출처'],[['호시노미야 여학원','주인공들이 다니는 학교. 카즈키는 연구소 기부를 통해 이사장직을 얻고 학교를 별빛 관측과 에너지 수렴에 이용한다.',link(byId('kazuki'))],['별빛연구소','세이이치와 카즈키가 공동 설립한 비밀 연구시설. 8년 전 사고와 은폐 기록이 3권의 중심 사건이다.',link(byId('kazuki'))+' · '+link(byId('shizuki'))],['호시노미야 천문연구소','카즈키의 권력 기반 중 하나. 후반 시즈키가 연구소장직과 여학원 이사장직을 맡고 자료 공개·외부 감사를 선언한다.',link(byId('shizuki'))],['오로라 책방','스펙트라가 오로라라는 이름으로 운영하는 책방. 기록 조사와 인물들의 회복을 돕고, 정화 후 카오리가 조수로 일한다.',link(byId('spectra'))+' · '+link(byId('kaori'))],['시미즈 가문','희망의 힘을 대대로 보관해 온 가문. 우미코의 가문 내 역할과 자기 선택의 갈등이 2권의 주요 서사다.',link(byId('umiko'))]]));
world+=section('powers','3','네 힘의 계승',strip+table(['힘','인물','관련 매개·발현'],[['사랑',link(byId('momoka')),'어머니 아카리의 사랑이 축적된 브로치'],['희망',link(byId('umiko')),'시미즈 가문이 보관한 희망의 브로치'],['용기',link(byId('hina')),'두려움 속에서도 행동을 선택하며 브로치와 스타라이트 팩트 생성'],['믿음',link(byId('shizuki')),'별빛과 어둠이 함께 깃든 팬던트']])+`<p class="source-ref">출처: <a href="characters/spectra.html#overview">스펙트라 개요</a>, 각 페어리즈의 변신 체계.</p>`);
world+=section('distinctions','4','혼동하지 않을 설정',`<ul class="plain-list"><li>카즈키는 흑성교단 4간부에 속하지 않으며 자아보존형 절광체도 아닙니다.</li><li>시즈키의 변신도구는 팬던트입니다. 다른 페어리즈의 변신도구 구성을 일괄 적용하지 않습니다.</li><li>유우나·아포크라와 네메시스의 의식·존재를 구분합니다.</li><li>오로라는 스펙트라의 현세 이름입니다. 독립된 변신체로 취급하지 않습니다.</li><li>페어리즈의 루미너스 변형은 기본 외형의 발광이며, 새 의상으로 바뀌는 설정은 아닙니다.</li></ul>`);
write('world.html',shell({title:'세계관·용어',subtitle:'호시노미야와 별빛전설',page:'world.html',content:world,toc:[['terms','1. 핵심 개념'],['places','2. 장소·기관'],['powers','3. 네 힘'],['distinctions','4. 설정 구분']]}));

const volumesMeta=[['운명이 소녀를 부를 때','모모카의 각성, 동료의 등장과 히나의 용기.'],['푸른 별빛이 비추는 내일','우미코의 희망, 녹타라와의 대립, 별빛축제와 드러나는 정체.'],['믿음의 보랏빛 광채','8년 전 연구소 사고의 진실, 네뷸라의 각성과 카즈키의 최후.'],['태양은 가려져도','쌍둥이 자매와 에테르녹스, 요루의 진실과 흑성교단의 끝.'],['빛이여, 마을의 천사들에게 닿아라','유우나와 네메시스, 사랑의 스펙트럼과 최종결전, 그 이후의 일상.']];
let story=notice('원작 기준','권 제목과 1~50화 목차는 제공된 캐릭터 문서에서 추출했습니다. 게임 챕터·전투 배치와 장면 변경은 TBD입니다.');
story+=section('volume-index','1','권별 개요',table(['권','제목','주요 흐름'],volumesMeta.map(([title,text],i)=>[`<a href="#volume-${i+1}">${i+1}권</a>`,title,text])));
story+=section('chapters','2','화별 목차',`<p class="small muted">인물 이름을 누르면 해당 인물의 해당 화 기록으로 이동합니다. 등장 여부는 해당 기록에서 확인할 수 있습니다.</p>${volumeButtons}${volumesMeta.map(([title],i)=>{
  const chapters=byId('momoka').chapters.filter(c=>c.volume===i+1);
  return `<details class="volume" id="volume-${i+1}"><summary>${i+1}권 · ${title} <span class="badge">${i*10+1}–${i*10+10}화</span></summary><div class="volume-content"><div class="table-wrap"><table class="wiki-table chapter-table"><thead><tr><th scope="col">화</th><th scope="col">제목</th><th scope="col">인물별 기록</th></tr></thead><tbody>${chapters.map(ch=>`<tr><td class="chapter-number">${ch.number}화</td><td>${ch.title}</td><td>${data.map(c=>`<a href="characters/${c.id}.html#chapter-${ch.number}">${c.name.split(' ').at(-1)}</a>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div></div></details>`;
}).join('')}`);
story+=section('adaptation','3','게임화 변경 기록',notice('공통 원칙','게임과 원작의 기본 스토리는 동일합니다. 게임화 과정에서 일부 내용이 변경·축소·확장될 수 있습니다.')+table(['원작 범위','대응 게임 챕터','변경·축소·확장','사유·상태'],volumesMeta.map((v,i)=>[`${i+1}권`,TBD,TBD,'최신 기획 확인 대기'])));
write('story.html',shell({title:'원작소설 1~5권',subtitle:'50화 목차 · 인물별 작중 행적',page:'story.html',content:story,toc:[['volume-index','1. 권별 개요'],['chapters','2. 화별 목차'],...volumesMeta.map((_,i)=>[`volume-${i+1}`,`${i+1}권`,true]),['adaptation','3. 게임화 변경']]}));

let systems=notice('기획 기준','이번 요청에서 확인된 새 기획을 반영했습니다. 과거 기획을 추정해서 채우지 않으며, 세부 규칙은 최신 기획 전문 확인 전까지 TBD로 둡니다.');
systems+=section('confirmed','1','확인된 게임 구성',table(['항목','적용 기준','근거'],[['스토리','원작소설과 게임의 기본 스토리가 동일','사용자 지정'],['원작 범위','세계관·행적은 원작소설 1~5권 중심','사용자 지정'],['진행 구성','ADV 적용','사용자 지정'],['3D 적용','전투만 3D로 구성','사용자 지정'],['각색','게임화 과정에서 일부 내용 변경·축소·확장 가능','사용자 지정']]));
systems+=section('structure','2','ADV와 3D 전투',`<div class="flow"><div><b>ADV</b><span>서사·대화 장면</span></div><i aria-hidden="true">↔</i><div><b>3D 전투</b><span>전투 장면</span></div></div><p class="small muted">두 구성의 연결을 보여 주는 개념도입니다. 모든 화에 전투를 배치하거나 특정 순서를 반복한다는 규칙은 아직 정해지지 않았습니다.</p>${table(['구성','제작 시 확인할 항목','현재 상태'],[['ADV','화자·대사·배경·스탠딩·표정·포즈·CG·음성·연출 큐',TBD],['3D 전투','참전 인물·장소·목표·승패 조건·조작·카메라·스킬·연출',TBD],['전환','ADV와 전투의 진입·복귀 조건, 저장·재시도 지점',TBD]])}`);
systems+=section('pending','3','상세 기획 확인 항목',profileTable([['전투 방식','실시간 / 턴제 / 기타: '+TBD],['조작·파티 구성','플레이어 조작 방식, 동시 참전 인원, 교대: '+TBD],['성장·스킬·밸런스','게임 내 수치와 성장 구조: '+TBD],['ADV 표현','스탠딩의 표현 방식, 선택지, 분기, 음성 범위: '+TBD],['진행·저장','챕터 해금, 세이브·로드, 재도전 규칙: '+TBD],['플랫폼·엔진·출시','최신 기획 기준: '+TBD]]));
systems+=section('conversion','4','원작 능력의 게임 적용',`<p>캐릭터 문서의 능력은 원작 묘사입니다. 스킬의 게임 수치·쿨타임·범위·비용·애니메이션과 자동으로 대응하지 않습니다.</p>${table(['기록 단위','필요한 내용'],[['원작 장면','권·화 / 출처 인물 / 사건·능력'],['게임 대응','챕터 / ADV 장면 / 3D 전투 / 필요한 리소스'],['변경 내역','유지·변경·축소·확장 / 변경 사유 / 담당자·승인 상태']])}<p><a href="story.html#adaptation">원작 권별 게임화 변경표 →</a></p>`);
write('systems.html',shell({title:'게임 기획',subtitle:'ADV · 전투만 3D · 원작과 동일한 스토리',page:'systems.html',content:systems,toc:[['confirmed','1. 게임 구성'],['structure','2. ADV·3D 전투'],['pending','3. 상세 기획 TBD'],['conversion','4. 능력 게임화']]}));

let resources=notice('제작 기준','원문 설정과 제작 규격을 분리해 관리합니다. 자료에 없는 신체 수치·외형 디테일은 TBD로 남기며, 원작 묘사를 임의 수치로 환산하지 않습니다.');
resources+=section('profiles','1','캐릭터 프로필 비교',table(['캐릭터','연령 (원문)','신장','B / W / H','제작용 프로필'],data.map(c=>[link(c),escape(c.profile['연령']),TBD,`${TBD} / ${TBD} / ${TBD}`,`<a href="characters/${c.id}.html#production">외형·성격·형태 →</a>`])));
resources+=section('fields','2','기록할 제작 정보',table(['분류','공통 항목','기록 기준'],[['기본 프로필','이름·연령·생일·가족·소속·상징·좋아하는 것·싫어하는 것','제공 MD의 명시 정보'],['신체','신장·체중·쓰리사이즈·체형·등신·상대 스케일','수치가 없으면 TBD'],['인상·성격','헤어·눈·말투·성격 키워드·모에요소','원작 직접 묘사와 제작용 요약을 구분'],['형태·의상','일상·변신·강화·과거·특수 상태','원작 등장 형태와 게임 제작 대상을 구분'],['ADV','스탠딩·표정·포즈·의상 차분·CG·음성','범위·수량·파일 규격 TBD'],['3D 전투','모델·리깅·애니메이션·소켓·VFX','폴리곤·텍스처·성능 예산 TBD']]));
resources+=section('continuity','3','외형·형태 연속성',table(['대상','제작 시 유지할 원작 구분'],data.map(c=>[link(c),escape(c.note)])));
resources+=section('assets','4','제공 리소스·미제공 리소스',table(['리소스','상태'],[['회사 로고','BlossomGamesLogo.png'],['게임 타이틀 로고','StarlightFairiesLogo.png'],['캐릭터 대표 이미지·컨셉아트',TBD+' · 원문 내 이미지 자리 표시·첨부 참조만 존재'],['모델·ADV 스탠딩·음성·VFX 목록',TBD+' · 최신 게임 리소스 목록 확인 필요']])+`<p class="small muted">가상 성우 캐스팅은 참고 이미지·연기 방향에 해당하며, 게임 출연 확정 정보를 의미하지 않습니다.</p>`);
write('resources.html',shell({title:'리소스 제작 기준',subtitle:'프로필 · 외형 · ADV 차분 · 3D 전투 리소스',page:'resources.html',content:resources,toc:[['profiles','1. 프로필 비교'],['fields','2. 제작 정보'],['continuity','3. 외형 연속성'],['assets','4. 리소스 현황']]}));

let guide=notice('현재 기준','제공 캐릭터 MD 10개와 이번 요청의 게임 방향을 반영했습니다. 이전 ChatGPT 대화·원작소설 전문·최신 기획 전문은 현재 자료에 포함되어 있지 않습니다.');
guide+=section('sources','1','원본 자료',`<ul class="sources-list">${data.map(c=>`<li><a href="sources/${encodeURIComponent(c.file)}">${escape(c.file)}</a></li>`).join('')}</ul><p class="small muted">제공된 MD를 sources 폴더에 원본 보관했습니다. 원문에 포함된 작성 제안이나 안내 문구는 자료의 일부이며, 별도의 작업 지시로 실행하지 않습니다.</p>`);
guide+=section('rules','2','문서 작성 기준',table(['표기','의미'],[[badge('원문 반영','pink'),'제공된 캐릭터 문서에서 확인한 설정. 원작소설 전문과 직접 대조했다는 뜻은 아님.'],[badge('원문 기반 요약'),'흩어진 묘사를 제작용 키워드로 묶은 항목. 추가 공식 설정이 아님.'],[badge('제작용 분류'),'모에요소·형태 목록 등 작업을 위한 분류. 구현 범위·수량 확정이 아님.'],[TBD,'현재 제공 자료로 정할 수 없는 정보. 임의 추정 없이 추후 갱신.'],['미공개 / 해당 없음','원문 상태를 보존. 인간과 다른 존재의 나이·신체 규격 등은 적용 가능 여부부터 확인.']]));
guide+=section('missing','3','추가 확인이 필요한 자료',`<ul class="plain-list"><li><strong>최신 게임 기획 전문:</strong> 전투 방식·조작·파티·성장·ADV 연출·저장·플랫폼·엔진.</li><li><strong>원작소설 1~5권 전문 또는 기준 판본:</strong> 화별 행적과 용어의 최종 대조.</li><li><strong>캐릭터 제작 설정:</strong> 신장·체중·쓰리사이즈·등신·정확한 색상·소재·의상 규격.</li><li><strong>캐릭터 원본 이미지:</strong> MD의 첨부 식별자가 가리키는 컨셉아트와 대표 이미지.</li><li><strong>게임화 변경표:</strong> 원작 화와 게임 장면의 대응, 축소·확장·변경 사유.</li></ul>`);
guide+=section('editing','4','편집·추가 방법',`<p>일반 열람은 <code>index.html</code>을 열면 됩니다. 생성된 HTML은 별도 서버 없이 동작하며, 검색·테마·모바일 메뉴에는 JavaScript를 사용합니다.</p>${table(['수정 대상','파일'],[['원작 내용','sources/캐릭터_위키.md'],['제작용 요약·형태 목록','assets/characters.json'],['페이지 구성·공통 문서','scripts/build.mjs'],['디자인','assets/style.css'],['검색·테마·메뉴','assets/app.js']])}<p>원본과 제작 정보를 수정한 뒤 Node.js 환경에서 <code>npm install</code>, <code>npm run build</code>, <code>npm run check</code> 순서로 실행하면 HTML과 검색 자료를 갱신할 수 있습니다. 재생성하면 생성된 HTML의 직접 수정 내용은 덮어씁니다.</p><p>위키 파일은 현재 내부 개발용 자료입니다. 표시 문구와 검색엔진 제외 설정은 접근 제어가 아니므로, 실제 공개 범위는 게시 환경에서 결정합니다.</p>`);
write('guide.html',shell({title:'자료·편집 안내',subtitle:'출처와 미확정 항목을 함께 관리합니다',page:'guide.html',content:guide,toc:[['sources','1. 원본 자료'],['rules','2. 작성 기준'],['missing','3. 추가 자료'],['editing','4. 편집 방법']]}));
write('README.md',`# 스타라이트 페어리즈 개발 위키\n\n분홍색 계열의 정적 HTML·CSS·JavaScript 내부 개발 위키입니다. 배포 작업은 수행하지 않았습니다.\n\n## 열기\n\nindex.html을 브라우저에서 열면 됩니다. 모든 문서는 정적 HTML이며, file:// 열람과 GitHub Pages 하위 경로를 지원하는 상대 경로를 사용합니다. 검색에 필요한 데이터도 로컬 JS 파일입니다.\n\n## 내용\n\n- 캐릭터 10명: 기본 프로필, 제작용 프로필, 원작 내용, 1~5권 화별 행적, 출처·게임화 메모\n- 세계관·용어, 50화 통합 목차, ADV·3D 전투 기획, 제작 기준, 편집 안내\n- 이름·변신명·본문 검색, 분류 필터, 권별 접기, 다크 모드, 모바일 메뉴, 인쇄 시 행적 펼치기\n\n## 편집\n\nNode.js 20 이상 권장. 의존성은 정적 파일을 재생성할 때만 필요합니다.\n\n1. npm install\n2. sources/*.md와 assets/characters.json 수정\n3. npm run build\n4. npm run check\n\n생성된 HTML을 직접 수정하면 다음 build에서 덮어씁니다. 공통 문서 내용은 scripts/build.mjs, 디자인은 assets/style.css, 상호작용은 assets/app.js에서 수정합니다. 필요 시 npm run preview로 로컬 HTTP 미리보기를 실행합니다.\n\n## 자료 기준\n\n제공 캐릭터 MD 10개를 보관했습니다. 우미코는 사용자가 지정한 작업 폴더의 문서를 기준으로 반영했습니다. 원작소설 전문과 직접 대조한 것은 아닙니다. 제작 키워드는 원문 요약으로 표시했고, 신장·체중·쓰리사이즈 등 미확인 정보는 TBD입니다.\n\n게임 기획은 이번 요청의 ADV, 전투만 3D, 원작과 같은 기본 스토리, 일부 변경·축소·확장 가능성을 적용했습니다. 세부 규칙·수치·게임 챕터 대응은 TBD입니다.\n\n문서 내 가상 캐스팅은 확정 성우가 아닙니다. MD 첨부 식별자의 이미지는 제공되지 않아 실제 이미지로 연결하지 않았습니다. 캐릭터별 녹색·푸른색 등 고유 색은 원작대로 보존하고 공통 UI에 로즈핑크를 적용했습니다.\n\n회사·게임 로고와 기존 저장소 파일은 보존합니다. 이 사이트에는 인증 기능이 없습니다. 내부용 표기와 noindex는 접근을 제한하지 않습니다.\n`);
console.log(`Built ${data.length} character pages, 7 reference pages, ${data.reduce((n,c)=>n+c.chapters.length,0)} chapter records.`);
