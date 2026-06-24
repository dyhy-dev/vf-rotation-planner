/* Velvet Frequency — Rotation Text Parser (external, separately editable).
   Pure: text in -> { state, warnings, got } out, no DOM. Loaded by index.html as
   a classic <script> AFTER the main script; reads its shared DATA tables. Edit
   and re-upload this file alone — no rebuild needed. Version lives in the
   VF_PARSER_VERSION constant (bottom of file). Contract, bump rule & the full
   list of shared tables: see CLAUDE.md. */
(function(){
const _n = s => String(s||'').trim().toLowerCase();
/* reforge rank: "F" is an accepted alternate spelling of "R" (e.g. "A6F6" == "A6 R6"). Normalise to R. */
const _rev = s => String(s||'').toUpperCase().replace(/^F/,'R');
function lev(a,b){ a=_n(a);b=_n(b);const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);}return d[m][n]; }

function resolveActor(token){
  const t=_n(token); if(!t) return null;
  const chars=DATA.characterNames, pers=DATA.personaNames;
  let h=chars.find(c=>c.toLowerCase()===t); if(h) return {type:'char',name:h};
  for(const c in CHAR_ALIASES){ if(CHAR_ALIASES[c].some(a=>a.toLowerCase()===t)) return {type:'char',name:c}; }
  h=pers.find(p=>p.toLowerCase()===t); if(h) return {type:'persona',name:h};
  for(const p in PERSONA_ALIASES){ if(PERSONA_ALIASES[p].some(a=>a.toLowerCase()===t)) return {type:'persona',name:p}; }
  // a "·"-variant roster name written without the separator ("MontF" -> MONT·F, "JokerS" -> JOKER·S)
  { const dh=chars.find(c=>c.indexOf('·')>=0 && c.toLowerCase().replace(/·/g,'')===t); if(dh) return {type:'char',name:dh}; }
  if(t.length>=3){
    h=chars.find(c=>c.toLowerCase().startsWith(t)); if(h) return {type:'char',name:h,fuzzy:true};
    h=pers.find(p=>p.toLowerCase().startsWith(t)); if(h) return {type:'persona',name:h,fuzzy:true};
    for(const c in CHAR_ALIASES){ if(CHAR_ALIASES[c].some(a=>a.toLowerCase().startsWith(t))) return {type:'char',name:c,fuzzy:true}; }
    for(const p in PERSONA_ALIASES){ if(PERSONA_ALIASES[p].some(a=>a.toLowerCase().startsWith(t))) return {type:'persona',name:p,fuzzy:true}; }
  }
  if(t.length>=4){ const tol=t.length>=6?2:1;
    for(const c of chars){ if(lev(c,t)<=tol) return {type:'char',name:c,fuzzy:true}; }
    for(const p of pers){ if(lev(p,t)<=tol) return {type:'persona',name:p,fuzzy:true}; }
    for(const c in CHAR_ALIASES){ if(CHAR_ALIASES[c].some(a=>a.length>=4&&lev(a,t)<=tol)) return {type:'char',name:c,fuzzy:true}; }
    for(const p in PERSONA_ALIASES){ if(PERSONA_ALIASES[p].some(a=>a.length>=4&&lev(a,t)<=tol)) return {type:'persona',name:p,fuzzy:true}; }
  }
  return null;
}
const ELEM_MAP={f:'Fire',fire:'Fire',i:'Ice',ice:'Ice',e:'Elec',el:'Elec',elec:'Elec',electric:'Elec',w:'Wind',wind:'Wind',p:'Psy',psy:'Psy',n:'Nuke',nuke:'Nuke',nuclear:'Nuke',b:'Bless',bless:'Bless',c:'Curse',curse:'Curse'};
const VALID_DUALS=['Fire/Ice','Elec/Wind','Psy/Nuke','Bless/Curse'];
function _knownName(s){ const a=resolveActor((s||'').split(/\s+/)[0]); return !!(a && !a.fuzzy); }
function normDual(str){ const parts=String(str).split('/').map(p=>ELEM_MAP[_n(p)]).filter(Boolean);
  if(parts.length<2) return ''; for(const d of VALID_DUALS){ const ds=d.split('/'); if(ds.includes(parts[0])&&ds.includes(parts[1])) return d; } return ''; }
/* Twins dual-element detector. Recognises every common spelling:
   "Fire/Ice", "F/I" (slash), "FI"/"EW"/"PN"/"BC" (2-letter), and "Fire Ice"/"Wind Elec"/"F I" (two tokens). */
function _dual2(a,b){ const x=ELEM_MAP[_n(a)], y=ELEM_MAP[_n(b)]; if(!x||!y||x===y) return '';
  for(const d of VALID_DUALS){ const ds=d.split('/'); if(ds.includes(x)&&ds.includes(y)) return d; } return ''; }
function _matchDualAt(toks,i){ const t=toks[i]; if(t==null) return null;
  let d=normDual(t); if(d) return {dual:d,len:1};                                   // Fire/Ice, F/I
  if(/^[a-z]{2}$/i.test(t)){ d=_dual2(t[0],t[1]); if(d) return {dual:d,len:1}; }     // FI, EW, PN, BC (+ reverses)
  if(toks[i+1]!=null){ d=_dual2(t,toks[i+1]); if(d) return {dual:d,len:2}; }         // Fire Ice, Wind Elec, F I
  return null; }
function _findDual(toks){ for(let i=0;i<toks.length;i++){ const m=_matchDualAt(toks,i); if(m) return {dual:m.dual,start:i,len:m.len}; } return null; }
const CODE={s1:'S1',s2:'S2',s3:'S3',hl:'HL',tg:'HL',th:'HL',theurgy:'HL',gun:'Gn',attack:'Atk',atk:'Atk',melee:'Atk',guard:'Gd',gaurd:'Gd',gd:'Gd',g:'Gd',assist:'Ast',ast:'Ast',button:'ALT',alt:'ALT',dc:'ALT',masq:'ALT',mask:'ALT',mas:'ALT',msq:'ALT',masquerade:'ALT',punch:'ALT'};
function codeOf(token){
  const t=_n(token).replace(/[().]/g,'');
  if(CODE[t]) return {btn:CODE[t],extra:''};
  if(/^[123]$/.test(t)) return {btn:'S'+t,extra:''};
  if(/^(da ?capo|de ?capo|dacapo|decapo)$/.test(t)) return {btn:'ALT',extra:''};
  let m=t.match(/^(\d+)x?(da ?capo|decapo|dacapo)$/); if(m) return {btn:'ALT',extra:'x'+m[1]};
  m=t.match(/^(s[123]|hl)(x?\d+)?$/); if(m&&CODE[m[1]]) return {btn:CODE[m[1]],extra:(m[2]||'')};
  return null;
}
// common stat-note words that aren't cards but collide with one (notably "pierce" fuzz-matches "Peace").
const CARD_STOP=/^(pierce|crit|critical|percent|pct|reset|resets)$/;
// per-character damage-stat requirements ("Makoto: 7.4% Pierce", "Twins: 25% CR", "30 CM") belong in that
// unit's note, not the team notes. Covers pierce, crit, and the CR (crit rate) / CM (crit mult) abbreviations.
const STAT_NOTE=/\b(pierce|crit|critical|cr|cm)\b/i;
// a *floating* (no character prefix) stat requirement pairs a number with such a keyword ("15.7 Pierce",
// "25.3 CR min"); a number is required so a plain instruction like "Adjust Pierce & Crit" stays a team note.
const STAT_REQ=/\d[\d.,]*\s*%?\s*\b(?:pierce|crit(?:ical)?|cr|cm)\b|\b(?:pierce|crit(?:ical)?|cr|cm)\b\s*[:=]?\s*%?\s*\d/i;
// import-only abbreviations for passive skills the skill-alias map doesn't carry.
const SKILL_ABBR={'atk master':'Attack Master','agi master':'Agility Master','def master':'Defense Master'};
// passive skills (a persona can stack several) go in the persona NOTE, not a skill slot. They follow the
// regular "X Boost / X Master / X Reduction" and "Auto-X" families, plus a few irregular passive lines.
// Anything not in the skill list at all is also very likely a passive (handled at the call site).
function isPassiveSkill(name){ name=String(name||'');
  if(/^auto-/i.test(name)) return true;
  if(/\b(boost|master|reduction)\b/i.test(name)) return true;
  return /^(adverse resolve|ironclad resolve|fortified moxy|battle acumen|apt pupil|sharp student|divine grace|divine guidance|nurture|life aid|ambient aid|regenerate|resist (?:forget|sleep)|pinpoint|power surge)\b/i.test(name); }
function cardPair(str){
  // when several card options are listed (comma- or "or"-separated), only the first pair counts
  str=String(str==null?'':str).split(/\s*,\s*|\s+or\s+/i)[0]||'';
  const parts=str.split(/[\/+\s;]+/).map(s=>s.trim()).filter(Boolean);
  let space='',sunsky='';
  const findSp=p=>{ const t=_n(p); if(t.length<3||CARD_STOP.test(t))return ''; return DATA.spaceCards.find(c=>c.toLowerCase()===t)||DATA.spaceCards.find(c=>c.toLowerCase().startsWith(t))||(t.length>=6&&DATA.spaceCards.find(c=>lev(c,t)<=2))||''; };
  const findSs=p=>{ const t=_n(p); if(t.length<3||CARD_STOP.test(t))return ''; return DATA.sunSkyCards.find(c=>c.toLowerCase()===t)||DATA.sunSkyCards.find(c=>c.toLowerCase().startsWith(t))||(t.length>=6&&DATA.sunSkyCards.find(c=>lev(c,t)<=2))||''; };
  for(const part of parts){ if(space&&sunsky)break; const sp=findSp(part),ss=findSs(part);
    if(sp&&!ss){ if(!space)space=sp; } else if(ss&&!sp){ if(!sunsky)sunsky=ss; }
    else if(sp&&ss){ if(!space)space=sp; else if(!sunsky)sunsky=ss; } }
  return {space,sunsky};
}
// highest score in a string -> "<n><M/B/T>". A range shares one magnitude ("23 - 30 mils" -> 30M); pick the larger.
function scoreHigh(str){
  const MAG={b:1e9,bn:1e9,bil:1e9,billion:1e9,t:1e12,tril:1e12,trillion:1e12,m:1e6,mil:1e6,mils:1e6,mill:1e6,mills:1e6,million:1e6};
  const ms=[...String(str||'').matchAll(/(\d+(?:\.\d+)?)\s*(billion|trillion|million|tril|bil|mil{1,2}s?|bn|[bmt])?\b/ig)];
  let shared=''; ms.forEach(m=>{ if(m[2]) shared=m[2]; });
  let best=null;
  ms.forEach(m=>{ const mag=(m[2]||shared); if(!mag) return; const v=parseFloat(m[1])*(MAG[mag.toLowerCase()]||1);
    if(best===null||v>best.v) best={v, str:m[1]+mag[0].toUpperCase()}; });
  return best?best.str:'';
}
const DAGGER_ALIAS={cyber:'Cyclotron'};   // common short forms that fuzzy-matching misses
function matchDagger(str){ const t=_n(str);
  if(DAGGER_ALIAS[t]) return DAGGER_ALIAS[t];
  let h=DATA.daggerNames.find(d=>d.toLowerCase()===t)||DATA.daggerNames.find(d=>d.toLowerCase().startsWith(t)&&t.length>=3);
  // input is the significant word(s) of a dagger name, ignoring filler ("Compass" -> "Starry Compass")
  if(!h && t.length>=3){ const stop=new Set(['of','the','a','an','and','de','la']);
    const inW=t.split(/\s+/).filter(w=>w&&!stop.has(w));
    if(inW.length){ let best='',bestLen=1e9;
      for(const d of DATA.daggerNames){ const dW=d.toLowerCase().split(/\s+/).filter(w=>w&&!stop.has(w));
        // every input word is a word of this dagger; prefer the dagger with the fewest extra words
        if(inW.every(iw=>dW.includes(iw)) && dW.length<bestLen){ best=d; bestLen=dW.length; } }
      if(best) h=best; } }
  if(!h&&t.length>=4) h=DATA.daggerNames.find(d=>lev(d,t)<=2);
  return h||''; }
/* strip a trailing/standalone reforge token (R5, R0X, R3 …) so "Plasma Blade R5" -> "Plasma Blade" */
function stripReforge(s){ return String(s||'').replace(/\b[RF][0-6X]\b/ig,' ').replace(/\b[RF]\d+\b/ig,' ').replace(/\s+/g,' ').trim(); }
/* find a known dagger anywhere in a short line via exact (normalized) word-window match — no fuzzy, to avoid false hits in prose */
function findDaggerIn(base){
  base=String(base||'').replace(/[^A-Za-z0-9·\s]/g,' ').replace(/\s+/g,' ').trim(); if(!base) return '';   // drop stray punctuation ("Arc Knife;" -> "Arc Knife")
  let dg=DATA.daggerNames.find(d=>_n(d)===_n(base)); if(dg) return dg;
  const words=base.split(/\s+/).filter(Boolean); if(words.length>5) return '';
  for(let wlen=Math.min(4,words.length); wlen>=1; wlen--){
    for(let i=0;i+wlen<=words.length;i++){ const c=words.slice(i,i+wlen).join(' ');
      dg=DATA.daggerNames.find(d=>_n(d)===_n(c)); if(dg) return dg; } }
  return '';
}

/* "Sig"/"Signature" -> the persona's signature skill; a known abbreviation -> its full skill name; otherwise unchanged. Only the leading token is touched. */
function expandSkillText(text, persona){
  const t=String(text||'').trim(); if(!t) return text;
  const words=t.split(/\s+/);
  // expand the LONGEST leading phrase that is a known skill / alias / signature; keep the remainder as-is
  for(let k=words.length;k>=1;k--){
    const lc=words.slice(0,k).join(' ').toLowerCase(); let rep=null;
    if(lc==='sig'||lc==='signature') rep=(persona&&PERSONA_SIGNATURES[persona])||null;
    else if(SKILL_ALIAS_MAP[lc]) rep=SKILL_ALIAS_MAP[lc];
    if(rep!==null){ const tail=words.slice(k).join(' '); return tail?(rep+' '+tail):rep; }
  }
  return text;
}
function buildActions(actor,toks,raw,warn){
  if(!actor){ if(raw&&raw.trim())warn.push(raw.trim()); return []; }
  // collapse the two-word button name "Da Capo"/"De Capo" into the DC token (Ange's ALT), and a spaced
  // repeat count "x 2" into "x2" so the lone "2" isn't mistaken for an S2 action ("Da Capo x 2" = DC twice).
  { const t2=[]; for(let i=0;i<toks.length;i++){ if(i+1<toks.length && /^(da|de)$/i.test(toks[i]) && /^capo$/i.test(toks[i+1].replace(/[().]/g,''))){ t2.push('DC'); i++; }
      else if(i+1<toks.length && /^x$/i.test(toks[i]) && /^\d+$/.test(toks[i+1])){ t2.push('x'+toks[i+1]); i++; }
      else t2.push(toks[i]); } toks=t2; }
  const isW=actor.type==='persona'||actor.name==='WONDER';
  if(isW){ const hl=toks.some(t=>_n(t).replace(/[().]/g,'')==='hl');
    const pname=actor.type==='persona'?actor.name:'';
    const rest2=toks.filter(t=>_n(t).replace(/[().]/g,'')!=='hl');
    // Wonder acting as the unit itself (no persona) leading with a standard button -> set the button, not skill text ("Wonder Guard")
    if(!pname && rest2.length){ const c0=codeOf(rest2[0]);
      if(c0){ const tail=rest2.slice(1).join(' ').trim();
        return [{char:'WONDER',btn:c0.btn,text:[c0.extra,tail].filter(Boolean).join(' '),hl,_fuzzy:!!actor.fuzzy}]; } }
    const text=expandSkillText(rest2.join(' ').trim(), pname);
    return [{char:'WONDER',persona:pname,hl,skill:'',text,_fuzzy:!!actor.fuzzy}]; }
  // character: one action per action-code; non-code tokens attach as text to the current code.
  // tokens inside parentheses are treated as a note (never as new action codes), e.g. "S3 (Turbo HL if ...)".
  const acts=[]; let cur=null; const pending=[]; let paren=0;
  for(const tok of toks){ const startsParen=/^[(\[]/.test(tok);
    const c=(paren>0||startsParen)?null:codeOf(tok);
    if(c){ if(cur)acts.push(cur); cur={char:actor.name,btn:c.btn,text:c.extra||'',_fuzzy:!!actor.fuzzy};
      if(pending.length){ cur.text=(pending.join(' ')+(cur.text?(' '+cur.text):'')).trim(); pending.length=0; } }
    else { if(cur) cur.text=(cur.text+' '+tok).trim(); else pending.push(tok); }
    paren+=(tok.match(/[(\[]/g)||[]).length-(tok.match(/[)\]]/g)||[]).length; if(paren<0)paren=0; }
  if(cur) acts.push(cur);
  if(!acts.length) acts.push({char:actor.name,btn:'',text:pending.join(' ').trim(),_fuzzy:!!actor.fuzzy,_uncertain:true});
  // drop "auto-cast" skills: some tools list skills a unit casts automatically ("Auto S3", "Auto S1", "Auto TH2").
  // they aren't part of a hand-played rotation, so skip them — but only an "Auto" paired with a skill, never a plain note.
  const _isAuto=a=>{ const t=(a.text||'').trim(); return /^auto\b/i.test(t) && (/^S[123]$/i.test(a.btn||'') || /^auto\s+(s[123]|th\d*|hl)\b/i.test(t)); };
  return acts.filter(a=>!_isAuto(a));
}
// split a segment at mid-segment actor boundaries (compensates a missing comma): an exact character
// (or Wonder) name that is directly followed by an action code — or, for Wonder, by a persona — starts
// a new action. Targets like "Chord S2 Wonder" (actor at the end, no following code) are left intact.
function splitMidActor(seg){
  const toks=seg.split(/\s+/).filter(Boolean); if(toks.length<2) return [seg];
  const out=[]; let start=0, depth=0;
  for(let i=1;i<toks.length;i++){
    depth+=(toks[i-1].match(/[(\[]/g)||[]).length-(toks[i-1].match(/[)\]]/g)||[]).length; if(depth<0)depth=0;
    if(depth>0) continue;
    const isWonder=_n(toks[i])==='wonder'; const a=isWonder?null:resolveActor(toks[i]);
    const isActor=isWonder || (a && !a.fuzzy && a.type==='char');
    if(!isActor) continue;
    const nxt=toks[i+1]; if(!nxt) continue;
    const boundary = !!codeOf(nxt) || (isWonder && resolveActor(nxt) && resolveActor(nxt).type==='persona');
    if(boundary){ out.push(toks.slice(start,i).join(' ')); start=i; }
  }
  out.push(toks.slice(start).join(' '));
  return out;
}
// split on top-level separators only; a separator inside (...) or [...] does not split,
// so a parenthetical note with commas ("Violet S3 (kill with S1, do it)") stays one unit.
function splitTop(s, sepChars){ const out=[]; let buf='', depth=0;
  for(let i=0;i<s.length;i++){ const ch=s[i];
    if(ch==='('||ch==='[') depth++; else if(ch===')'||ch===']'){ if(depth>0)depth--; }
    if(depth===0 && sepChars.indexOf(ch)>=0){ out.push(buf); buf=''; } else buf+=ch; }
  out.push(buf); return out; }
/* Hatsune Miku's songs (elucidator). Recognised in turns and mapped to Miku, with abbreviations. */
const MIKU='MIKU';
const SONG_ALIAS_MAP={'heaven':'Heaven','song 1':'Heaven','song1':'Heaven','spring storm':'Spring Storm','ss':'Spring Storm','spring':'Spring Storm','storm':'Spring Storm','song 2':'Spring Storm','song2':'Spring Storm','play-with-fire':'Play-With-Fire','play with fire':'Play-With-Fire','playwithfire':'Play-With-Fire','play':'Play-With-Fire','pwf':'Play-With-Fire','song 3':'Play-With-Fire','song3':'Play-With-Fire'};
function leadingSong(toks){ for(let k=Math.min(2,toks.length);k>=1;k--){ const p=_n(toks.slice(0,k).join(' ')).replace(/[().]/g,''); if(SONG_ALIAS_MAP[p]) return {song:SONG_ALIAS_MAP[p],len:k}; } return null; }
function _hasMiku(){ try{ return DATA.characterNames.indexOf(MIKU)>=0; }catch(e){ return false; } }
function parseTurnContent(content,warn){
  const actions=[];
  // a Twins dual element written with a "+" joiner ("F+I", "Elec+Wind") must not be split into two actions
  // by the "+" separator below — normalise it to a slash so the dual detector sees "F/I" / "Elec/Wind".
  content=String(content||'').replace(/\b(fire|ice|elec|electric|wind|psy|nuke|nuclear|bless|curse|[fiewpnbc])\s*\+\s*(fire|ice|elec|electric|wind|psy|nuke|nuclear|bless|curse|[fiewpnbc])\b/ig,'$1/$2');
  // a leading separator dash/colon left over from the turn label ("T2 - Yurl ..." -> content "- Yurl ...")
  // or written before a unit; strip it so the first action isn't lost as an unrecognised "- Actor".
  let lastActor=null;
  for(const unit of splitTop(content,',|>\u203a\u2192').map(u=>u.trim().replace(/^[-\u2013\u2014:]\s*/,'').trim()).filter(Boolean)){
    let cur=null, pendingLead=[]; const unitStart=actions.length;
    const segs=[]; unit.split(/\+|\s+\/\s+|(?<![\swW])\/\s+/).map(s=>s.trim()).filter(Boolean).forEach(s=>splitMidActor(s).forEach(x=>{ if(x.trim())segs.push(x.trim()); }));
    for(const seg of segs){
      const toks=seg.split(/\s+/).filter(Boolean); if(!toks.length)continue;
      // split a no-space actor+highlight token ("NianHL" -> "Nian" "HL", "MatoiTG" -> "Matoi" "TG")
      for(let ti=0;ti<toks.length;ti++){ const hm=toks[ti].match(/^(.{2,}?)(hl|tg)$/i);
        if(hm && !codeOf(toks[ti])){ const pa=resolveActor(hm[1]); if(pa && (pa.type==='char'||pa.type==='persona')){ toks.splice(ti,1,hm[1],hm[2].toUpperCase()); } } }
      // "Guard All" / "All Guard": every non-elucidator team unit guards; expanded after the team is known.
      if(/^(g(?:ua|au)rd\s+all|all\s+g(?:ua|au)rd)$/i.test(seg)){ actions.push({guardAll:true}); cur=null; continue; }
      // a lone "Guard" (no actor) -> resolved after the team is known, to the next due actor idle this turn.
      // BUT a "+Guard" chained onto an actor whose only action so far is a (free) HL belongs to that actor
      // ("Haru HL+Guard" = Haru pops HL and guards), mirroring how "+Gun" attaches. After a full action
      // (S1/S2/S3/Atk/Gn) the "+Guard" stays a floating guard for an idle team-mate ("Futaba S2+Guard").
      if(/^g(?:(?:ua|au)rds?)?$/i.test(seg)){   // "Guard", "Gaurd", or a bare "G"
        const tgtName=cur?(cur.type==='persona'?'WONDER':cur.name):null;
        const curActs=tgtName?actions.slice(unitStart).filter(a=>a.char===tgtName&&!a.guardAll&&!a.guardSolo):[];
        if(cur && curActs.length && curActs.every(a=>a.btn==='HL')){
          const tgt=cur.type==='persona'?{char:'WONDER',persona:cur.name}:{char:cur.name};
          actions.push(Object.assign(tgt,{btn:'Gd',text:''})); continue; }
        actions.push({guardSolo:true}); cur=null; continue; }
      // a leading bare button with no actor yet ("Alt + Turbo S2") belongs to the *next* actor in the unit.
      // Masquerade is excluded — it is always Violet's own ALT (handled just below), never a floating button.
      if(!cur && toks.length===1){ const c1=codeOf(toks[0]); const a1=resolveActor(toks[0]);
        if(c1 && !(a1&&!a1.fuzzy) && _n(toks[0])!=='wonder' && !/^(mas|masq|msq|masquerade)$/.test(_n(toks[0]).replace(/[().]/g,''))){ pendingLead.push(c1.btn); continue; } }
      const segHl=toks.some(t=>_n(t).replace(/[().]/g,'')==='hl');
      // Twins HL dual-element action: "Fire Ice HL", "F/I HL", "FI HL", "Twins HL Fire Ice", "Twins Fire Ice HL"...
      // fires on HL + a dual, unless an *exact, non-Twins* actor leads the segment.
      if(segHl){ const fd=_findDual(toks);
        if(fd){ const a0e=(_n(toks[0])==='wonder')?{fuzzy:false,type:'char',name:'WONDER'}:resolveActor(toks[0]);
          const exactOther=a0e&&!a0e.fuzzy&&!(a0e.type==='char'&&a0e.name==='TWINS');
          if(!exactOther){ actions.push({char:'TWINS',btn:'HL',text:fd.dual,_twinsHL:fd.dual}); cur={type:'char',name:'TWINS'}; lastActor=cur; continue; } } }
      if(!((_n(toks[0])==='wonder')||resolveActor(toks[0]))){
        const t0=_n(toks[0]).replace(/[().]/g,'');
        // Violet's Masquerade button (her ALT). Any trailing words ("Masquerade (Kasumi Start)") become its note.
        if(/^(mas|masq|msq|masquerade)$/.test(t0)){ const tail=toks.slice(1).join(' ').trim(); actions.push({char:'VIOLET',btn:'ALT',text:tail}); cur={type:'char',name:'VIOLET'}; lastActor=cur; continue; }
      }
      // Miku song action: a song name (Heaven / Spring Storm / Play-With-Fire, incl. SS/Spring/Storm/Play/PWF),
      // optionally led by "Miku"; even a bare song name (no actor) becomes a Hatsune Miku action with that song.
      if(_hasMiku()){ let stoks=toks, mikuLed=false;
        while(stoks.length){ const am=resolveActor(stoks[0]); if(am&&!am.fuzzy&&am.name===MIKU){ stoks=stoks.slice(1); mikuLed=true; } else break; }
        const ls=leadingSong(stoks); const a0=resolveActor(toks[0]);
        if(ls && (mikuLed || !(a0&&!a0.fuzzy))){
          const after=stoks.slice(ls.len); let btn=''; const txt=[];
          after.forEach(t=>{ const c=codeOf(t); if(c&&!btn) btn=c.btn; else txt.push(t); });
          actions.push({char:MIKU,btn,song:ls.song,text:txt.join(' ').trim(),_fuzzy:false});
          cur={type:'char',name:MIKU}; lastActor=cur; continue; } }
      let actor=null,rest=toks;
      // a two-word persona name ("Nian Shou", "Neko Shogun", "King Frost", "Cu Chulainn") must consume BOTH
      // tokens, else the second word leaks into the skill text. Only exact, space-containing persona matches
      // qualify, so two unrelated tokens are never collapsed.
      const twoPersona=(i)=>{ if(!toks[i+1]) return null; const m=resolveActor(toks[i]+' '+toks[i+1]); return (m&&!m.fuzzy&&m.type==='persona'&&m.name.includes(' '))?m:null; };
      if(_n(toks[0])==='wonder'){ const tw=twoPersona(1); const pa=tw||(toks[1]?resolveActor(toks[1]):null);
        if(pa&&pa.type==='persona'){actor={type:'persona',name:pa.name,fuzzy:!!pa.fuzzy};rest=toks.slice(tw?3:2);}
        else{actor={type:'char',name:'WONDER'};rest=toks.slice(1);} }
      else{ const tw=twoPersona(0); const a0=tw||resolveActor(toks[0]);
        const sk0=SKILL_ALIAS_MAP[_n(toks[0]).replace(/[().]/g,'')];
        if(sk0 && !(a0 && !a0.fuzzy)){ actor={type:'char',name:'WONDER'}; rest=toks; }  // leading known skill, no exact actor -> Wonder persona action ("Maraku", "Suku Twins")
        else if(a0 && !(a0.fuzzy && cur)){actor=a0;rest=toks.slice(tw?2:1);} }
      if(actor)cur=actor; else{actor=cur;rest=toks;}
      if(actor)lastActor=actor;
      // flush any leading bare buttons ("Alt + ...") onto this actor, in order
      if(pendingLead.length && actor){ const tgt=actor.type==='persona'?{char:'WONDER',persona:actor.name}:{char:actor.name};
        pendingLead.forEach(b=>actions.push(Object.assign({},tgt,{btn:b,text:''}))); pendingLead=[]; }
      // Twins non-HL dual-element action ("Twins Fire Ice", "Twins S2 Fire Ice", "Twins FI") -> normalise dual, keep any button
      if(actor && actor.type==='char' && actor.name==='TWINS'){ const fd=_findDual(rest);
        if(fd){ let btn=''; rest.forEach((t,k)=>{ if(k>=fd.start&&k<fd.start+fd.len)return; const c=codeOf(t); if(c) btn=btn||c.btn; });
          actions.push({char:'TWINS',btn,text:fd.dual,_twinsHL:fd.dual,_fuzzy:!!actor.fuzzy}); continue; } }
      buildActions(actor,rest,seg,warn).forEach(a=>actions.push(a));
    }
    // a comma-unit that was only bare button(s) with no actor of its own ("…, S3, S3") continues the
    // most recent actor in the turn — e.g. SEES theurgy follow-ups ("Makoto HL, S3, S3").
    if(pendingLead.length && lastActor){ const tgt=lastActor.type==='persona'?{char:'WONDER',persona:lastActor.name}:{char:lastActor.name};
      pendingLead.forEach(b=>actions.push(Object.assign({},tgt,{btn:b,text:''}))); pendingLead=[]; }
  }
  return actions;
}

/* ---- main ---- */
function parseRotationText(text, opts){
  const warn=[];
  const forceDod=!!(opts&&opts.dod);
  const lines=text.split(/\r?\n/).map(s=>s.replace(/\*\*|__/g,'').replace(/^\s*(?:[\u2022\u00b7\u25aa\u2023\u2043\u25e6\u2027\u2219]\s*|[-\u2013\u2014*]\s+)/,''));
  // "B1"/"B2" are break turns (the common short form of "Break 1"/"Break 2"), just as "T1" is a normal
  // turn; the brk flag below keys off the leading "b". Same false-positive risk as the accepted "t" prefix.
  const reInline=/^\s*(turn|break|t|b)\s*(\d+)(?:\s*[:.)]\s*|\s+)(.+)$/i;
  const reAlone=/^\s*(turn|break|t|b)\s*(\d+)\s*[:.)]?\s*$/i;
  // "W1"/"W2" (weak/break phase). Only honored AFTER a standalone BREAK divider, so the
  // "W1:/W2:" lines that often appear in Defense/Crit-calc notes are not mistaken for turns.
  const reWInline=/^\s*(w)\s*(\d+)(?:\s*[:.)]\s*|\s+)(.+)$/i;
  const reWAlone=/^\s*(w)\s*(\d+)\s*[:.)]?\s*$/i;
  // a line that is just "BREAK" (optionally "BREAKS"/"BREAK PHASE"/"BREAK TURNS", optional colon):
  // a divider meaning every turn after it is a break turn.
  // a divider meaning every following turn is a break turn. Tolerates decorative wrapping
  // ("--BREAK--", "== BREAK ==", "** Break Phase **"), but still rejects "Break 1" (a turn).
  const reBreakDiv=/^[\s\-=~*_#.–—]*breaks?(?:\s+(?:phase|turns?))?[\s\-=~*_#.:–—]*$/i;
  // also accept the letter-spaced emphasis form ("B R E A K") — only when every token is a single letter.
  const isBreakDiv=ln=>{ if(reBreakDiv.test(ln)) return true;
    const toks=String(ln||'').trim().split(/\s+/);
    return toks.length>=3 && toks.every(t=>t.length<=1) && reBreakDiv.test(toks.join('')); };
  const isTurnStart=s=>reInline.test(s)||reAlone.test(s)||reWInline.test(s)||reWAlone.test(s);
  // classify lines: turn vs header  (a "Break N" line is a turn too, flagged brk)
  const turnEntries=[]; const headerLines=[]; const lineIsTurn=new Array(lines.length).fill(false);
  let afterBreak=false;
  const grabContent=(i)=>{ let j=i+1,content=''; while(j<lines.length){ if(isTurnStart(lines[j])||isBreakDiv(lines[j]))break; if(lines[j].trim()){content=lines[j].trim();lineIsTurn[j]=true;break;} j++; } return content; };
  for(let i=0;i<lines.length;i++){
    if(isBreakDiv(lines[i])){ afterBreak=true; lineIsTurn[i]=true; continue; }   // divider, consumed
    let m=lines[i].match(reInline);
    if(m){ turnEntries.push({num:+m[2],content:m[3],brk:/^b/i.test(m[1])||afterBreak}); lineIsTurn[i]=true; continue; }
    if(afterBreak){ m=lines[i].match(reWInline); if(m){ turnEntries.push({num:+m[2],content:m[3],brk:true}); lineIsTurn[i]=true; continue; } }
    m=lines[i].match(reAlone);
    if(m){ lineIsTurn[i]=true; turnEntries.push({num:+m[2],content:grabContent(i),brk:/^b/i.test(m[1])||afterBreak}); continue; }
    if(afterBreak){ m=lines[i].match(reWAlone); if(m){ lineIsTurn[i]=true; turnEntries.push({num:+m[2],content:grabContent(i),brk:true}); continue; } }
  }
  for(let i=0;i<lines.length;i++){ if(!lineIsTurn[i]&&lines[i].trim()) headerLines.push(lines[i].trim()); }

  // state skeleton
  const blankUnit=()=>({name:'',awareness:'',rev:'',gear:'',space:'',sunsky:'',role:'',companion:'',note:''});
  const setup={rotationName:'',tier:'',boss:'',type:'MLD',patch:'',score:'',notes:'',credits:''};
  const charData={}; // name -> {awareness,rev,space,sunsky,note}
  const charOrder=[];
  let dagger='', personas=[], twinsRole=''; const headerDuals=[];
  let backupName='';   // Fuuka's off-team backup character, from an explicit "Backup:" line
  const noteLines=[];
  const got={}; // track which info recognized
  const titleBuilds={}; // builds stated in the title (name -> {awareness,rev}); applied only to real units at the end

  function addChar(name,info){ if(!charData[name]){charData[name]={};charOrder.push(name);} Object.assign(charData[name],info); }

  // inline "Score 175m" — the word "Score" directly followed by a number+magnitude, even mid-sentence
  for(let i=0;i<headerLines.length && !setup.score;i++){
    const im=headerLines[i].match(/\bscores?\b\s*[:\-–—]?\s*(\d+(?:\.\d+)?)\s*(billion|trillion|million|tril|bil|mil{1,2}s?|bn|[bmt])\b/i);
    if(im){ setup.score=im[1]+im[2][0].toUpperCase(); got.score=1; } }
  // a standalone "Score" / "Expected Score" section header: the score sits on the next non-empty line
  // ("Score\n86M with A1R0 …") — grab the first number+magnitude (the field holds one number)
  for(let i=0;i<headerLines.length && !setup.score;i++){
    if(!/^(?:expected\s+)?scores?\s*:?\s*$/i.test(headerLines[i])) continue;
    for(let k=i+1;k<headerLines.length;k++){ const v=headerLines[k]; if(!v||v===' ') continue;
      const sm=v.match(/\b(\d+(?:\.\d+)?)\s*(billion|trillion|million|tril|bil|mil{1,2}s?|bn|[bmt])\b/i);
      if(sm){ setup.score=sm[1]+sm[2][0].toUpperCase(); got.score=1; } break; }
  }
  // inline "Credits to/by/from <Name>" anywhere in the text ("… Credits to Fantaa for base rot") -> Credits field.
  // The name must be capitalised so "credits to the team" doesn't grab "the"; the line stays as a note.
  for(let i=0;i<headerLines.length && !setup.credits;i++){
    const cm=headerLines[i].match(/\b[Cc]redits?\s+(?:[Tt]o|[Bb]y|[Ff]rom)\s+([A-Z][\w.]*(?:\s*(?:,|&|\+|and)\s*[A-Z][\w.]*)*)/);
    if(cm){ setup.credits=cm[1].trim(); got.credit=1; } }

  // title (first header line) -> boss/mode/patch
  let titleConsumed=false;
  // once a stats/calc section starts, every following line is a note — never a team/persona/card line,
  // so "A1 Noir is -18", "A0R0 S.Moko: 12.1" etc. are kept verbatim instead of read as team members.
  let inNotesSection=false;
  const reNotesSection=/^\**\s*(stats|crit\s*rate|pierce\s*rate|(?:\w+\s+)?calcs?|alternatives?|damage)\s*:?\s*\**\s*$/i;
  for(let hi=0; hi<headerLines.length; hi++){
    let line=headerLines[hi];
    const low=line.toLowerCase();
    if(line==='\u0000') continue;
    if(inNotesSection){
      // a redundant turn-order line ("Turbo > Wonder > Smoko > Haru" / "Turn order: …") carries no note value -> drop it
      if(/^turn\s*order\s*[:–—-]/i.test(line)) continue;
      if(/[>›→]/.test(line)){ const og=line.split(/\s*[>›→]\s*/).map(x=>x.trim()).filter(Boolean);
        if(og.length>=2 && og.every(sg=>{ const a=resolveActor(sg.split(/\s+/)[0]); return a&&a.type==='char'; })) continue; }
      noteLines.push(line); continue;
    }
    if(reNotesSection.test(line)){ inNotesSection=true; noteLines.push(line); continue; }

    // peel inline labels from a packed non-title header line ("A0 Mont F … credit : X - Est score : 60-70 mils
    // Notes :") so the credit + score survive instead of the whole line being read as one unit's build. Only
    // fires when the line carries SEVERAL labels; a single-label line ("Expected Score: 600 Mil", "Credit: X")
    // keeps its own dedicated (verbatim) branch below so it still round-trips exactly.
    if(hi>0){ const labRe=/\b(credits?|score|notes?|boss|patch|tier)\s*:\s*/ig; const hits=[]; let lm;
      while((lm=labRe.exec(line))) hits.push({lab:lm[1].toLowerCase(), valAt:labRe.lastIndex, at:lm.index});
      if(hits.length>=2){
        hits.forEach((h,k)=>{ const val=line.slice(h.valAt, k+1<hits.length?hits[k+1].at:line.length).trim().replace(/[-–—;,\s]+$/,'').trim();
          if(/^credit/.test(h.lab)){ const cv=val.split(/\s+[-–—]\s+/)[0].trim(); if(cv && !setup.credits){ setup.credits=cv; got.credit=1; } }
          else if(h.lab==='score'){ const sc=scoreHigh(val); if(sc && !setup.score){ setup.score=sc; got.score=1; } }
          else if(/^note/.test(h.lab)){ if(val) noteLines.push(val); }
          else if(h.lab==='boss'){ const b=matchBoss(val); if(b && !setup.boss){ setup.boss=b; got.boss=1; } }
          else if(h.lab==='patch'){ const pm=(val.match(/\d{1,2}\.\d+/)||[])[0]; if(pm && !setup.patch){ setup.patch=pm; got.patch=1; } } });
        line=line.slice(0,hits[0].at).trim();
        if(!line) continue;   // line was nothing but labels
        // the run-in text before the labels is title-area prose ("A0 Mont F w/ Low Howler"); if the real title
        // line gave no name (e.g. it was just "SoS 3.2 Melchizedek"), use it as the rotation name.
        if(!setup.rotationName){ setup.rotationName=line; continue; }
      }
    }

    // Credit line ("Credit: A + B from C + D") -> Credits field (may list several people), never the title
    { const cm=line.match(/^credits?\s*[:\u2013\u2014\-]\s*(.+)$/i);
      if(cm){ const v=cm[1].trim(); if(v){ setup.credits=v; got.credit=1; } continue; } }

    // "Expected Score: 600 Mil" / "Score: ..." / bare "Score 175m" (no colon) -> score field; line is consumed either way.
    // The colon form keeps the verbatim value (so "600 Mil" round-trips); a bare form just defers to the pre-scanned value.
    { const sm=line.match(/^(?:expected\s+)?scores?\b\s*([:\u2013\u2014\-])?\s*(\d.*)$/i)
            // tolerate a leading prefix before the label ("June 18 Expected Score: 2,700,000,000"); a
            // colon/dash separator is then required, and the prefix must carry no colon of its own.
            || (hi>0 && line.match(/^[^:]*?\b(?:expected\s+)?scores?\b\s*([:\u2013\u2014\-])\s*(\d.*)$/i));
      if(sm){ const v=sm[2].trim(); if(v && (sm[1] || !setup.score)){ setup.score=v; got.score=1; } continue; } }

    // Wonder line: "Wonder [R#] [Dagger] [, persona (skills), …]"
    if(/^wonder\b/i.test(line)){
      let rest=line.replace(/^wonder\b/i,'').replace(/^[\s:\u2013\u2014-]+/,'').trim();
      // Wonder revelation rank (R0-R6 / RX)
      const rv=rest.match(/\b[RF]([0-6X])\b/i); if(rv){ addChar('WONDER',{rev:('R'+rv[1]).toUpperCase()}); got.team=1; rest=rest.replace(rv[0],' ').replace(/\s+/g,' ').trim(); }
      // dagger = a known dagger name in the leading chunk (before the first comma/colon/paren)
      { const dgChunk=rest.split(/[,:(]/)[0].trim(); const dg=matchDagger(dgChunk)||findDaggerIn(stripReforge(dgChunk));
        if(dg){ dagger=dg; got.dagger=1;
          // strip the canonical dagger name if it is spelled out; otherwise the user wrote a short/alias
          // form ("Starry" for "Starry Compass", possibly glued to the personas by ":"), so strip that chunk.
          const before=rest; rest=rest.replace(new RegExp('\\b'+dg.split(/\s+/).join('\\s+')+'\\b','i'),' ');
          if(rest===before) rest=rest.replace(new RegExp('^\\s*'+dgChunk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*','i'),' ');
          rest=rest.replace(/^[\s,:]+/,'').replace(/\s+/g,' ').trim(); } }
      // personas from the remainder (comma separated)
      parsePersonaList(rest);
      continue;
    }
    // Twins role / dual header: "Twins Healer: S1 Fire and Ice | S2 Elec and Wind", "Twins: Strategist", …
    // Reads an explicit role word (Healer == Medic) and/or the two duals (which also pin the role).
    { const tw=line.match(/^twins\b\s*[:\-–—]?\s*(.*)$/i);
      if(tw){ const body=tw[1]||'';
        const ROLE_ALIAS={healer:'Medic',medic:'Medic',sweeper:'Sweeper',assassin:'Assassin',strategist:'Strategist',saboteur:'Saboteur',guardian:'Guardian'};
        let foundRole=''; body.toLowerCase().split(/[^a-z]+/).forEach(w=>{ if(!foundRole&&ROLE_ALIAS[w]) foundRole=ROLE_ALIAS[w]; });
        // duals written with "and"/"+"/"/" joiners ("Fire and Ice", "Elec+Wind", "P/N") -> collect, normalised
        const norm=body.replace(/\b(fire|ice|elec|electric|wind|psy|nuke|nuclear|bless|curse|[fiewpnbc])\s*(?:and|\+|\/)\s*(fire|ice|elec|electric|wind|psy|nuke|nuclear|bless|curse|[fiewpnbc])\b/ig,'$1/$2');
        const duals=[]; (norm.match(/[A-Za-z]+\/[A-Za-z]+/g)||[]).forEach(t=>{ const d=normDual(t); if(d&&!duals.includes(d))duals.push(d); });
        if(foundRole||duals.length){ duals.forEach(d=>{ if(!headerDuals.includes(d))headerDuals.push(d); }); if(foundRole)twinsRole=foundRole;
          // the line may also carry the Twins' build cards before the duals ("Twins: Harmony + Victory - Fire/Ice + Psy/Nuke");
          // cardPair stops at the first complete space+sun/sky pair, so the trailing duals don't interfere.
          const cpt=cardPair(body); if(cpt.space&&cpt.sunsky){ addChar('TWINS',{space:cpt.space,sunsky:cpt.sunsky}); got.cards=1; }
          // a pierce/crit stat segment ("Twins: 25% CR - Fire/Ice + Psy/Nuke") is the Twins' note — skip the
          // dual segments (they carry a "/") and any card pair, keep the stat leftover.
          const statSeg=body.split(/\s+[-–—]\s+/).map(s=>s.trim()).find(s=>s && !/[A-Za-z]+\/[A-Za-z]+/.test(s) && !(cardPair(s).space&&cardPair(s).sunsky) && STAT_NOTE.test(s));
          if(statSeg){ const prev=(charData['TWINS']||{}).note; addChar('TWINS',{note:prev?prev+' '+statSeg:statSeg}); }
          got.team=1; continue; }
      } }
    if(/^(knife|dagger|weapon)s?\s*:/i.test(line)){ const val=line.slice(line.indexOf(':')+1);
      const rfm=val.match(/\b[RF]([0-6X])\b/i); if(rfm) addChar('WONDER',{rev:('R'+rfm[1]).toUpperCase()});   // a lone "R5" on the dagger line is Wonder's reforge (Wonder has no awareness prefix)
      const dg=matchDagger(stripReforge(val))||findDaggerIn(stripReforge(val)); if(dg){dagger=dg;got.dagger=1;} continue; }
    { const pInline=line.match(/^person(?:a|ae|as)\s*:\s*(.+)$/i); if(pInline){ parsePersonaList(pInline[1]); continue; } }
    if(/^person(?:a|ae|as)\s*:?\s*$/i.test(line)){ // following lines are personas until a blank-separated block / colon-header
      let j=hi+1; while(j<headerLines.length && !/^(cards?|knife|dagger)\s*:/i.test(headerLines[j]) && !/[:]/.test(headerLines[j].split(' ')[0]||'')){ 
        const pl=headerLines[j]; let ok;
        if(/ [-–—] |:/.test(pl)) ok=parsePersonaLine(pl);   // "Name - skills" / "Name: skills" -> one persona's skill line (commas separate skills)
        else { const before=personas.length; parsePersonaList(pl); ok=personas.length>before; }   // otherwise a comma list of persona names
        if(!ok) break; headerLines[j]='\u0000'; j++; }
      continue;
    }
    if(/^cards?\s*:?\s*$/i.test(line)){ let j=hi+1; while(j<headerLines.length){ if(!parseCardLine(headerLines[j])) break; headerLines[j]='\u0000'; j++; } continue; }
    // standalone "Dagger" / "Knife" / "Weapon" header -> dagger sits on the following non-blank line ("Plasma Blade R5")
    if(/^(knife|dagger|weapon)s?\s*:?\s*$/i.test(line)){
      for(let j=hi+1;j<headerLines.length;j++){ const hl=headerLines[j]; if(!hl||hl==='\u0000') continue;
        const rfm=hl.match(/\b[RF]([0-6X])\b/i); if(rfm) addChar('WONDER',{rev:('R'+rfm[1]).toUpperCase()});   // "Plasma Blade R5" -> Wonder reforge
        const dg=matchDagger(stripReforge(hl))||findDaggerIn(stripReforge(hl)); if(dg){ dagger=dg; got.dagger=1; headerLines[j]='\u0000'; }
        break; }
      continue;
    }
    // bare section headers that carry no data themselves
    if(/^(rotation|rotations|turns?|team|comp|composition|notes?|info|setup|revelations?|revs?|reves?|personae?|personas)\s*:?\s*$/i.test(line)) continue;
    // a "Turn order: A > B > C > D" line (an optional text-export summary) is derived from the unit order — ignore it
    if(/^turn\s*order\s*[:–—-]/i.test(line)) continue;
    if(line==='\u0000') continue;

    // a per-persona skill line outside the Personae block ("Ame - Wild Thunder, Ail passives", "Jikokuten - Rebellion (…)")
    // -> route to the persona parser, but only when the leading name is a persona already listed (so card lines like
    // "Smoko - Harmony Victory" (a character) and prose are untouched).
    { const pm=line.match(/^([^:>]{2,40}?)\s*[:\-–—]\s+\S/);
      if(pm){ const a=resolveActor(pm[1].trim().split(/\s+/)[0]);
        if(a && a.type==='persona' && personas.some(p=>p.name===a.name)){ parsePersonaLine(line); continue; } } }

    // Fuuka's off-team backup: "Backup: [A#R#] Name [: space + sunsky] [(note)]" -> build into charData, name remembered
    { const bkm=line.match(/^back-?up\b\s*[:\-–—]?\s*(.+)$/i);
      if(bkm){ let s2=bkm[1].trim(), info={};
        const am2=s2.match(/^(A[0-6]|DGR)\s*([RF][0-6X])?\s+/i);
        if(am2){ info.awareness=am2[1].toUpperCase(); if(am2[2])info.rev=_rev(am2[2]); s2=s2.slice(am2[0].length).trim(); }
        let note=''; const nm2=s2.match(/\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s*$/);   // trailing note; tolerates one level of nested parens ("(7.4% Pierce (or 0%))")
      if(nm2){ const inside=nm2[1].trim(); const awm=inside.match(/^(A[0-6]|DGR)\s*([RF][0-6X])?$/i);
        // a trailing "(A6R0)" is the unit's build, not a note ("Luce: Creation + Reconciliation (A6R0)")
        if(awm && !info.awareness){ info.awareness=awm[1].toUpperCase(); if(awm[2])info.rev=_rev(awm[2]); }
        else note=inside;
        s2=s2.slice(0,nm2.index).trim(); }
        let namePart=s2, cardsPart=''; const cm2=s2.match(/^([^:]+):\s*(.+)$/)||s2.match(/^(.+?)\s+[-–—]\s+(.+)$/); if(cm2){ namePart=cm2[1].trim(); cardsPart=cm2[2].trim(); }
        if(!info.awareness){ const am3=namePart.match(/\b(A[0-6]|DGR)\s*([RF][0-6X])?\b/i); if(am3){ info.awareness=am3[1].toUpperCase(); if(am3[2])info.rev=_rev(am3[2]); namePart=namePart.replace(am3[0],' ').replace(/\s+/g,' ').trim(); } }
        const a2=resolveActor((namePart.split(/\s+/)[0]||''));
        if(a2 && a2.type==='char'){ let cp2=cardPair(cardsPart);
          if(!cp2.space && !cp2.sunsky){ const restToks=namePart.split(/\s+/).slice(1).join(' '); if(restToks) cp2=cardPair(restToks); }
          const ci={}; if(info.awareness)ci.awareness=info.awareness; if(info.rev)ci.rev=info.rev; if(cp2.space)ci.space=cp2.space; if(cp2.sunsky)ci.sunsky=cp2.sunsky; if(note)ci.note=note;
          addChar(a2.name, ci); backupName=a2.name; got.team=1;
          continue;
        }
      } }

    // "<Boss>: <persona> (skills), <persona> (skills), …" -> boss + Wonder personas
    { const lm0=line.match(/^([^:]+):\s*(.+)$/);
      const looksTitle = hi===0 && (/^\s*\d{1,2}\.\d+\b/.test(line) || /\b(MLD|DOD|NOD|SOS)\b/i.test(line));
      if(lm0 && !looksTitle){ const b=matchBoss(lm0[1].trim());
        if(b){ setup.boss=b; got.boss=1; const before=personas.length; parsePersonaList(lm0[2]); if(personas.length>before) got.personas=1; continue; } } }

    // team character line with awareness prefix or "Name: cards":  "[A#R#|DGR] Name [: space + sunsky] [(note)]"
    { let s2=line, info={};
      const am2=s2.match(/^(A[0-6]|DGR)\s*([RF][0-6X])?\s+/i);
      if(am2){ info.awareness=am2[1].toUpperCase(); if(am2[2])info.rev=_rev(am2[2]); s2=s2.slice(am2[0].length).trim(); }
      let note=''; const nm2=s2.match(/\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s*$/);   // trailing note; tolerates one level of nested parens ("(7.4% Pierce (or 0%))")
      if(nm2){ const inside=nm2[1].trim(); const awm=inside.match(/^(A[0-6]|DGR)\s*([RF][0-6X])?$/i);
        // a trailing "(A6R0)" is the unit's build, not a note ("Luce: Creation + Reconciliation (A6R0)")
        if(awm && !info.awareness){ info.awareness=awm[1].toUpperCase(); if(awm[2])info.rev=_rev(awm[2]); }
        else note=inside;
        s2=s2.slice(0,nm2.index).trim(); }
      // name/cards separator: a colon ("Name: space + sunsky") or a spaced dash ("Name - space/sunsky")
      let namePart=s2, cardsPart=''; const cm2=s2.match(/^([^:]+):\s*(.+)$/)||s2.match(/^(.+?)\s+[-–—]\s+(.+)$/); if(cm2){ namePart=cm2[1].trim(); cardsPart=cm2[2].trim(); }
      if(!info.awareness){ const am3=namePart.match(/\b(A[0-6]|DGR)\s*([RF][0-6X])?\b/i); if(am3){ info.awareness=am3[1].toUpperCase(); if(am3[2])info.rev=_rev(am3[2]); namePart=namePart.replace(am3[0],' ').replace(/\s+/g,' ').trim(); } }
      // a parenthetical card set anywhere in the line, not only at the end, e.g. "Twins A6R6 (Freedom/Dis) S2 is B/C…".
      // a single unambiguous space+sun/sky pair -> cards (trailing prose becomes the note); a multi-option "or" stays a note.
      if(!cardsPart && !note){ const pm=namePart.match(/\(([^)]*)\)/);
        if(pm && /[\/+&]/.test(pm[1]) && !/\bor\b/i.test(pm[1])){ const cpx=cardPair(pm[1]);
          if(cpx.space && cpx.sunsky){ cardsPart=pm[1];
            const after=namePart.slice(pm.index+pm[0].length).trim(); if(after) note=after;
            namePart=namePart.slice(0,pm.index).trim(); } } }
      const _np=namePart.split(/\s+/);
      let a2=resolveActor(_np[0]||'');
      // a "·"-variant written with a space ("Mont F" -> MONT·F): join the first two tokens
      if(_np[1]){ const v=resolveActor((_np[0]||'')+_np[1]); if(v && !v.fuzzy && v.type==='char' && v.name.indexOf('·')>=0) a2=v; }
      let cp2=cardPair(cardsPart);
      // inline team line with no separator ("Chord A6R6 Trust/Prosp"): awareness was pulled out of the
      // middle, so the words left after the name are the card pair.
      if(!cp2.space && !cp2.sunsky && info.awareness && a2 && a2.type==='char'){
        const restToks=namePart.split(/\s+/).slice(1).join(' '); if(restToks) cp2=cardPair(restToks); }
      // a pierce/crit/CR/CM stat in the card portion is the unit's note ("A6R6 Makoto: 7.4% Pierce",
      // "A6R6 Twins: Harmony + Victory - 30 CM - Fire/Ice + Psy/Nuke"): skip card pairs and dual ("/") segments.
      let statNote='';
      if(!note && cardsPart){ const semi=cardsPart.indexOf(';');
        if(semi>=0 && /\d/.test(cardsPart.slice(semi+1))){ statNote=cardsPart.slice(semi+1).trim(); }   // "Worry + Creation; 3053 ATK, 8.8% CR, …" -> the stats after ; are the unit's note
        else { statNote=cardsPart.split(/\s+[-–—]\s+/).map(s=>s.trim())
          .find(s=>s && !/[A-Za-z]+\/[A-Za-z]+/.test(s) && !(cardPair(s).space&&cardPair(s).sunsky) && STAT_NOTE.test(s)) || ''; } }
      if(statNote) note=statNote;
      if(a2 && a2.type==='char' && (am2 || info.awareness || cp2.space || cp2.sunsky || statNote)){
        if(a2.name==='TWINS'){ (cardsPart.match(/[A-Za-z]+\/[A-Za-z]+/g)||[]).forEach(tok=>{ const d=normDual(tok); if(d&&!headerDuals.includes(d))headerDuals.push(d); }); }
        const ci={}; if(info.awareness)ci.awareness=info.awareness; if(info.rev)ci.rev=info.rev; if(cp2.space)ci.space=cp2.space; if(cp2.sunsky)ci.sunsky=cp2.sunsky; if(note)ci.note=note;
        addChar(a2.name, ci);
        if(info.awareness) got.team=1; if(cp2.space||cp2.sunsky) got.cards=1;
        continue;
      }
    }

    // "<name>: <rest>" — dagger line, card line, or a stat note, even without a "Cards:" header
    { const lm=line.match(/^([^:]{1,24}):\s*(.+)$/);
      if(lm){ const label=lm[1].trim(), rest=lm[2].trim();
        const dg=matchDagger(label);
        if(dg){ dagger=dg; got.dagger=1; parsePersonaList(rest); continue; }
        const a=resolveActor(label.split(/\s+/)[0]);
        if(a && a.type==='char'){ const cp=cardPair(rest);
          if(a.name==='TWINS'){ (rest.match(/[A-Za-z]+\/[A-Za-z]+/g)||[]).forEach(tok=>{ const d=normDual(tok); if(d&&!headerDuals.includes(d))headerDuals.push(d); }); }
          if(cp.space||cp.sunsky){ const info={}; if(cp.space)info.space=cp.space; if(cp.sunsky)info.sunsky=cp.sunsky; addChar(a.name,info); got.cards=1; continue; }
          // pierce/crit info for a character is that unit's note, not a team note ("Makoto: 7.4% Pierce, or 0%")
          if(STAT_NOTE.test(rest)){ const prev=(charData[a.name]||{}).note; addChar(a.name,{note:prev?prev+' '+rest:rest}); continue; }
          noteLines.push(line); continue; } } }

    // "<name> - <space> <sun/sky>" revelation line (dash separator), e.g. "Chord - Trust Prosperity".
    // Cards may be written without the "&" ("Trust Prosperity") — cardPair handles that.
    { const dm=line.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
      // dagger + persona list with a dash separator ("Purgatory - Dion (Taru), Dominion"), the dash-form
      // twin of the "Dagger: persona, persona" line above \u2014 only when the dagger maps and the first
      // right-hand token is a known persona (so "Makoto - Hope + Ruin" stays a card line).
      if(dm){ const dgd=matchDagger(dm[1].trim()), p0=resolveActor((dm[2].trim().split(/[\s,(]+/)[0])||'');
        if(dgd && p0 && p0.type==='persona'){ dagger=dgd; got.dagger=1; parsePersonaList(dm[2].trim()); continue; } }
      if(dm){ const a=resolveActor(dm[1].trim().split(/\s+/)[0]);
        if(a && a.type==='char'){ const cp=cardPair(dm[2].trim());
          if(cp.space||cp.sunsky){ const info={}; if(cp.space)info.space=cp.space; if(cp.sunsky)info.sunsky=cp.sunsky; addChar(a.name,info); got.cards=1; continue; } } } }


    // team chain line: "A A1R0 > B > C A2R0 > D" — split on chevrons, each segment carries its own awareness/reforge
    if(/[>\u203a\u2192]/.test(line)){
      const segs=line.split(/\s*[>\u203a\u2192]\s*/).map(s=>s.trim()).filter(Boolean);
      const parsed=[]; let clean=segs.length>=2;
      for(const seg of segs){
        const am=seg.match(/\b(A[0-6]|DGR)\s*([RF][0-6X])?\b/i);
        let nm=seg, info={};
        if(am){ nm=seg.slice(0,seg.indexOf(am[0])).trim()||seg; info.awareness=am[1].toUpperCase(); info.rev=_rev(am[2]); }
        const a=resolveActor(nm.split(/\s+/)[0]);
        if(a && a.type==='char'){ parsed.push({name:a.name,info}); }
        else { clean=false; break; }
      }
      if(clean && parsed.length>=2){ parsed.forEach(p=>addChar(p.name,p.info)); got.team=1; continue; }
    }

    // team character line: has awareness token AND a recognized character before it
    const aw=line.match(/\b(A[0-6]|DGR)\s*([RF][0-6X])?\b/i);
    if(aw){
      const idx=line.indexOf(aw[0]);
      const namePart=line.slice(0,idx).trim();
      const afterPart=line.slice(idx+aw[0].length).trim();
      const names=namePart.split('/').map(s=>s.trim()).filter(Boolean);
      const recog=[];
      names.forEach((nm,k)=>{ const a=resolveActor(nm.split(/\s+/)[0]); if(a&&a.type==='char') recog.push({name:a.name,last:k===names.length-1}); });
      if(recog.length){
        recog.forEach(r=>{ const info={awareness:aw[1].toUpperCase(),rev:_rev(aw[2])};
          if(r.last && afterPart){ const cp=cardPair(afterPart); if(cp.space)info.space=cp.space; if(cp.sunsky)info.sunsky=cp.sunsky; }
          addChar(r.name,info); });
        got.team=1; continue;
      }
      // no recognized character -> fall through (likely the title line)
    }

    // bare Wonder-persona list ("Koumokuten, Yurl (Wild Thunder + Taru), Kohryu (Agi)") —
    // the boss is in the title now, so the persona line carries no "Boss:" prefix. Only fires
    // when every comma chunk begins with a known persona, to avoid catching notes/team lines.
    if(hi>0){ const chunks=line.split(/,(?![^(\[]*[)\]])/).map(x=>x.trim()).filter(Boolean);   // keep commas inside (skills) and [notes] together
      if(chunks.length && chunks.every(c=>{ const w=(c.replace(/\(.*$/,'').trim().split(/\s+/)[0]||''); const a=resolveActor(w); return a && a.type==='persona'; })){
        const before=personas.length; parsePersonaList(line); if(personas.length>before){ got.personas=1; continue; } } }

    // title line: only the very first header line
    if(hi===0 && !titleConsumed){
      titleConsumed=true;
      let t2=line;
      // inline labelled fields in the title line ("Title  credit : me  Score : 23 - 30 mils  Notes : ...")
      // -> peel each labelled value off (it runs to the next label) so the leftover is the clean title.
      { const labRe=/\b(credits?|score|notes?|boss|patch|tier)\s*:\s*/ig; const hits=[]; let lm;
        while((lm=labRe.exec(t2))) hits.push({lab:lm[1].toLowerCase(), valAt:labRe.lastIndex, at:lm.index});
        if(hits.length){
          hits.forEach((h,k)=>{ const val=t2.slice(h.valAt, k+1<hits.length?hits[k+1].at:t2.length).trim().replace(/[-–—;,\s]+$/,'').trim();
            if(/^credit/.test(h.lab)){ if(val && !setup.credits){ setup.credits=val; got.credit=1; } }
            else if(h.lab==='score'){ const sc=scoreHigh(val); if(sc && !setup.score){ setup.score=sc; got.score=1; } }
            else if(/^note/.test(h.lab)){ if(val) noteLines.push(val); }
            else if(h.lab==='boss'){ const b=matchBoss(val); if(b && !setup.boss){ setup.boss=b; got.boss=1; } }
            else if(h.lab==='patch'){ const pm=(val.match(/\d{1,2}\.\d+/)||[])[0]; if(pm && !setup.patch){ setup.patch=pm; got.patch=1; } } });
          t2=t2.slice(0,hits[0].at).trim();
          // a score qualifier left dangling once "Score: …" was peeled ("Fleuret Est. Score: 20-28 mils")
          t2=t2.replace(/[\s,;:.\-–—]*\b(est\.?|estimated|expected)\s*$/i,'').trim();
        }
      }
      // builds written into the title -> remember per unit (applied at the end only to real team members, never
      // creating one). Handles "A0R0 Haru, A0R0 Turbo" (rank before name) and "Haru A0R0" / chains (rank after).
      { let mt; const rmem=(name,aw,rv)=>{ const o=titleBuilds[name]||(titleBuilds[name]={}); if(aw)o.awareness=aw.toUpperCase(); if(rv)o.rev=_rev(rv); };
        const reAN=/(?:^|[\s,>(])(A[0-6]|DGR)\s*([RF][0-6X])?\s+([A-Za-z·'’.]{2,})/gi;
        while((mt=reAN.exec(line))){ const a=resolveActor(mt[3]); if(a&&a.type==='char'&&!a.fuzzy) rmem(a.name,mt[1],mt[2]); }
        const reNA=/(?:^|[\s,>(])([A-Za-z·'’.]{2,})\s+(A[0-6]|DGR)\s*([RF][0-6X])?(?=$|[\s,>)])/gi;
        while((mt=reNA.exec(line))){ const a=resolveActor(mt[1]); if(a&&a.type==='char'&&!a.fuzzy) rmem(a.name,mt[2],mt[3]); } }
      // an explicit inline "Credit: <name>" inside the title (e.g. "... rot - Credit: Misu - 2.4bil"):
      // pull it into Credits; the value runs to the next " - " segment break or end of line. The export
      // always writes Credit on its own line, so this only fires on hand-written titles, never round-trips.
      { const cm0=t2.match(/\bcredits?\s*:\s*(.+?)\s*(?=\s[-–—]\s|$)/i);
        if(cm0 && cm0[1].trim()){ setup.credits=cm0[1].trim(); got.credit=1;
          t2=t2.replace(/\s*[-–—]?\s*\bcredits?\s*:\s*.+?(?=\s[-–—]\s|$)/i,' '); } }
      // possessive author ("Kimmy's rot", "Misu's rotation") -> that name is the credit. Left in the title
      // (removing it would leave a dangling "'s rot"), only the Credits field is filled.
      if(!setup.credits){ const cm1=t2.match(/\b([A-Z][\w.]*)['’]s\s+rot(?:ation)?s?\b/);
        if(cm1){ setup.credits=cm1[1]; got.credit=1; } }
      // expected score: a number followed by a magnitude — a bare letter (2.4B) or spelled out
      // (2.4bil / 600 mil / 2.8 trillion). The score field holds one number, so when several are
      // listed ("2.4bil with A1, 2.8bil with A2") only the FIRST is copied into the field. It is NOT
      // cut from the title — the score usually sits inside prose ("2.4bil with A1"), so removing it
      // would leave the rotation name unreadable; it simply stays in the name as written.
      const sm=t2.match(/\b(\d+(?:\.\d+)?)\s*(billion|trillion|million|tril|bil|mil{1,2}s?|bn|[bmt])\b/i);
      if(sm && !setup.score){ setup.score=sm[1]+sm[2][0].toUpperCase(); got.score=1; }
      // patch: an x.y version number (major 1-19). The export always writes it first
      // ("4.1 DOD ..."), so prefer one at the start of the (score-stripped) title.
      { const at=t2.trim().match(/^(\d{1,2}\.\d+)\b/);
        const pm=(at && +at[1]>=1 && +at[1]<20) ? at[1] : ([...t2.matchAll(/\b(\d{1,2}\.\d+)\b/g)].map(x=>x[1]).find(v=>+v>=1 && +v<20)||'');
        if(pm){ setup.patch=pm; got.patch=1; t2=t2.replace(pm,' '); } }
      // boss + mode
      // mode first, so an SOS title can match its own boss list (persona-bosses like Melchizedek aren't in DATA.bossNames)
      const mm=t2.match(/\b(MLD|DOD|NOD|SOS)\b/i); if(mm){ setup.type=mm[1].toUpperCase(); got.mode=1; t2=t2.replace(/\b(MLD|DOD|NOD|SOS)\b/i,' '); }
      let bm=matchBoss(t2); if(!bm && setup.type==='SOS') bm=matchSosBoss(t2);
      if(bm){ setup.boss=bm; got.boss=1; t2=t2.replace(new RegExp('\\b'+bm.split(' ').join('\\s+')+'\\b','i'),' '); }
      let rn=t2.replace(/\s+/g,' ').trim().replace(/^[:\s]+|[:\s]+$/g,'').trim();
      // credit: an unknown name after "by" (1-2 words) or a single unknown word after "-"
      const cmBy=rn.match(/^(.*?)\bby\s+(.+)$/i); const cmDash=rn.match(/^(.*?)\s*[-–]\s*(\S+)$/);
      const _notSide=s=>!/^(side|weak|strong)$/i.test(s);
      if(!setup.credits && cmBy){ const r=(cmBy[2]||'').trim(); if(r && r.split(/\s+/).length<=2 && _notSide(r) && !matchBoss(r) && !_knownName(r)){ setup.credits=r; got.credit=1; rn=(cmBy[1]||'').trim(); } }
      else if(!setup.credits && cmDash){ const r=(cmDash[2]||'').trim(); if(r && _notSide(r) && !matchBoss(r) && !_knownName(r)){ setup.credits=r; got.credit=1; rn=(cmDash[1]||'').trim(); } }
      // otherwise: a single leftover word that is not awareness / boss / character is likely the credit (name kept intact)
      if(!setup.credits){ const unknown=rn.split(/\s+/).filter(Boolean).filter(t=>{ const tl=t.replace(/[^A-Za-z0-9\u00b7]/g,'');
        if(!tl||/^(all|a[0-6]|dgr|r[0-6x]|weak|strong|side|dolphin|f2p|minnow|whale)$/i.test(tl)) return false;
        if(matchBoss(tl)) return false; const a=resolveActor(tl); return !(a && !a.fuzzy); });
        if(unknown.length===1){ setup.credits=unknown[0]; got.credit=1; } }
      rn=rn.replace(/[-–]/g,' ').replace(/\s+/g,' ').trim().replace(/[.\-–?!\s]+$/,'').trim();
      if(rn) setup.rotationName=rn;
      continue;
    }
    // leftover -> note
    noteLines.push(line);
  }

  // general dagger fallback: if nothing structured gave a dagger, look for a known dagger name
  // anywhere in the leftover (non-turn) lines — daggers are usually mentioned somewhere in the header text.
  if(!got.dagger && noteLines.length){
    for(let n=0;n<noteLines.length;n++){
      const raw=noteLines[n]; const base=stripReforge(raw); const dg=findDaggerIn(base);
      if(dg){ dagger=dg; got.dagger=1;
        const rfm=raw.match(/\b[RF]([0-6X])\b/i); if(rfm) addChar('WONDER',{rev:('R'+rfm[1]).toUpperCase()});   // "Starry Compass R5" -> Wonder reforge
        if(base.split(/\s+/).filter(Boolean).length<=3) noteLines.splice(n,1); // drop a bare "Plasma Blade R5"-style line
        break; }
    }
  }

  // general score fallback: if nothing labelled gave a score, a number with a damage magnitude in the
  // prose ("This was 465 mill for me") is almost certainly the score — crit/pierce are written as %, which
  // carry no magnitude word, so they're skipped. scoreHigh() only returns when a magnitude is present.
  if(!setup.score){ for(const ln of noteLines){ const sc=scoreHigh(ln); if(sc){ setup.score=sc; got.score=1; break; } } }

  function parsePersonaList(str){ if(!str)return; str.split(/,(?![^(\[]*[)\]])/).forEach(chunk=>parsePersonaLine(chunk)); }
  function parsePersonaLine(line){
    line=String(line||'').replace(/^\s*(?:[\u2022\u00b7\u25aa\u2023\u2043\u25e6\u2027\u2219]\s*|[-\u2013\u2014*]\s+)/,'').trim();
    if(!line) return false;
    // a bracketed [note] (how the text export writes a persona note) -> note, removed from the line
    let bnote=''; { const bm=line.match(/\[([^\]]*)\]/); if(bm){ bnote=bm[1].trim(); line=line.replace(/\s*\[[^\]]*\]\s*/,' ').trim(); } }
    let nameStr=line, skillStr='', noteStr=bnote;
    // 1) Name <dash/colon> skills  — separator wins; a parenthetical here is a note on the skill, not the skill
    let dm=line.match(/^(.*?)\s*[:\u2013\u2014]\s*(.+)$/) || line.match(/^(.*?)\s+-\s+(.+)$/);
    if(dm){ nameStr=dm[1].trim(); let rhs=dm[2].trim();
      const pn=rhs.match(/\(([^)]*)\)/); if(pn){ noteStr=[noteStr,pn[1].trim()].filter(Boolean).join(', '); rhs=rhs.replace(/\s*\([^)]*\)/g,'').trim(); }
      skillStr=rhs; }
    else {
      // 2) Name (skills) — here the parenthetical IS the skill list (e.g. boss line "Vishnu (Wind of Nirvana)")
      let pm=line.match(/^(.*?)\s*\(([^)]*)\)/);
      if(pm){ nameStr=pm[1].trim(); skillStr=pm[2]; }
      else { // 3) Name skillA/skillB
        const cm=line.match(/^(\S+)\s+(.*)$/); if(cm && /\//.test(cm[2])){ nameStr=cm[1]; skillStr=cm[2]; }
      }
    }
    // an Overclock level on the persona ("Vishnu OC3", "OC III") belongs in the persona note, not the name
    { const ocm=nameStr.match(/\bOC\s*([1-3]|I{1,3})\b/i);
      if(ocm){ const lvl=/^[1-3]$/.test(ocm[1])?ocm[1]:String(ocm[1].length);
        noteStr=[noteStr,'OC'+lvl].filter(Boolean).join(', '); nameStr=nameStr.replace(ocm[0],' ').replace(/\s+/g,' ').trim(); } }
    const tok=nameStr.split(/\s+/)[0];
    const a=resolveActor(tok);
    if(a&&a.type==='persona'){ const sig=(PERSONA_SIGNATURES[a.name]||'').toLowerCase();
      // each comma/slash/plus item is sorted into the two ACTIVE skill slots or the persona note. Recognition
      // is space/hyphen tolerant ("Auto Mataru" == "Auto-Mataru"). A passive skill, or anything not in the
      // skill list at all (very likely a passive), goes to the note — under its canonical name when known.
      const skills=[], noteParts=noteStr?[noteStr]:[];
      skillStr.split(/[\/,+]/).map(s=>s.trim()).filter(Boolean).forEach(s=>{
        if(/^(sig|signature)$/i.test(s)) return;
        const k=s.toLowerCase();
        const canon=SKILL_ALIAS_MAP[k]||SKILL_ABBR[k]||SKILL_ALIAS_MAP[k.replace(/[\s-]+/g,'-')]||SKILL_ALIAS_MAP[k.replace(/[\s-]+/g,' ')]||'';
        if(canon){ if(canon.toLowerCase()===sig) return;   // own signature is innate
          if(!isPassiveSkill(canon) && skills.length<2) skills.push(canon);   // active -> a skill slot
          else noteParts.push(canon); }                                       // passive (or slots full) -> note
        else if(s.split(/\s+/).length<=1 && skills.length<2) skills.push(s);  // a lone token is a shorthand for an active skill ("Agi"), kept in a slot
        else noteParts.push(s);                                               // multi-word unknown -> very likely a passive -> note
      });
      const exist=personas.find(p=>(p.name||'').toLowerCase()===a.name.toLowerCase());   // merge into an already-listed persona (e.g. a names line then a per-persona skill line) instead of duplicating
      if(exist){ if(skills.length) exist.skills=[skills[0]||exist.skills[0]||'',skills[1]||exist.skills[1]||''];
        if(noteParts.length) exist.note=[exist.note,noteParts.join(', ')].filter(Boolean).join(', '); }
      else personas.push({name:a.name,skills:[skills[0]||'',skills[1]||''],note:noteParts.join(', ')});
      got.personas=1; return true; }
    return false;
  }
  function parseCardLine(line){
    line=String(line||'').trim(); if(!line||line==='\u0000') return false;
    const m=line.match(/^([^:]+):\s*(.+)$/); if(!m) return false;
    const a=resolveActor(m[1].trim().split(/\s+/)[0]); if(!(a&&a.type==='char')) return false;
    const cp=cardPair(m[2].replace(/[\d.%]+/g,'').trim());
    const info={}; if(cp.space)info.space=cp.space; if(cp.sunsky)info.sunsky=cp.sunsky;
    addChar(a.name,info); got.cards=1; return true;
  }
  function matchBoss(line){ const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    // 1) prefer a boss name whose every word is present in the line, longest wins (so "Baal Zebul" beats "Baal")
    let best='',bestLen=0; for(const b of DATA.bossNames){ const re=new RegExp('\\b'+b.split(/\s+/).map(esc).join('\\s+')+'\\b','i');
      if(re.test(line) && b.length>bestLen){ best=b; bestLen=b.length; } }
    if(best) return best;
    // 1b) common boss abbreviations that aren't a prefix of the full name ("SD" -> Slaughter Drive).
    // Whole-word only; checked after full names so a spelt-out boss always wins.
    const BOSS_ALIASES={sd:'SLAUGHTER DRIVE'};
    for(const k in BOSS_ALIASES){ if(new RegExp('\\b'+esc(k)+'\\b','i').test(line)) return BOSS_ALIASES[k]; }
    // 2) fallback: a boss referenced by only its leading word (first match in list order)
    for(const b of DATA.bossNames){ if(new RegExp('\\b'+esc(b.split(' ')[0])+'\\b','i').test(line)) return b; } return ''; }
  // SOS rotations fight a separate set of (often persona) bosses kept in the main tool's SOS_BOSSES list.
  // Only consulted in SOS mode, so loose entries like "POWER" can't hijack a normal title. Full-name match only.
  function matchSosBoss(line){ if(typeof SOS_BOSSES==='undefined') return ''; const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    let best='',bestLen=0; for(const b of SOS_BOSSES){ const re=new RegExp('\\b'+b.split(/\s+/).map(esc).join('\\s+')+'\\b','i');
      if(re.test(line) && b.length>bestLen){ best=b; bestLen=b.length; } } return best; }
  function boggWord(line,boss){ return boss.split(' ')[0]; }

  // turns (parse first, so we can fill the team from turn actors if the header is sparse)
  const turns=[];
  const hasExplicitBreaks=turnEntries.some(te=>te.brk);
  const isDod=forceDod||hasExplicitBreaks;
  const mkTurn=(te,name)=>({name,note:'',actions:parseTurnContent(te.content,warn)});
  if(isDod){
    setup.type='DOD'; got.mode=1;
    const normal=turnEntries.filter(te=>!te.brk).sort((a,b)=>a.num-b.num);
    let breaks=turnEntries.filter(te=>te.brk).sort((a,b)=>a.num-b.num);
    let normalForTurns=normal;
    // no explicitly-labelled breaks -> the last DOD_BREAKS normal turns are the breaks
    if(!breaks.length && normal.length>=DOD_BREAKS){ breaks=normal.slice(-DOD_BREAKS); normalForTurns=normal.slice(0,-DOD_BREAKS); }
    normalForTurns.forEach((te,i)=>turns.push(mkTurn(te,'TURN '+(i+1))));
    breaks.slice(0,DOD_BREAKS).forEach((te,i)=>turns.push(mkTurn(te,'Break '+(i+1))));   // breaks pinned at the end
  } else {
    turnEntries.sort((a,b)=>a.num-b.num);
    turnEntries.forEach(te=>turns.push(mkTurn(te,'TURN '+te.num)));
    // DOD inference without an explicit Break/Weak marker: a very short (<=5) or very long (>=9) turn
    // count strongly implies a DOD rotation. Only the mode is set (no auto break-split) and only when the
    // type wasn't stated in the title, so a stated MLD/NOD/SOS is never overridden.
    if(!got.mode && turnEntries.length && (turnEntries.length<=5 || turnEntries.length>=9)){ setup.type='DOD'; }
  }
  // a bare "Wonder HL" (HL only, no persona/skill/text) inherits the most recently used Wonder persona
  { let lastP=''; turns.forEach(t=>(t.actions||[]).forEach(a=>{ if((a.char||'').toUpperCase()!=='WONDER') return;
      if(a.persona){ lastP=a.persona; return; }
      if(a.hl && !a.persona && !String(a.text||'').trim() && lastP) a.persona=lastP; })); }
  // for each Wonder persona action, pull the leading skill out of the free text into the skill dropdown.
  // candidates: the persona's own (header-parsed) skills + its signature + all globally known skills/aliases.
  { const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\u00b7]/g,'');
    const skillSetFor=pname=>{ const set=new Map(); const add=s=>{ s=String(s||'').trim(); if(s) set.set(s.toLowerCase(),s); };
      const sig=PERSONA_SIGNATURES[pname]; if(sig) add(sig);
      const p=personas.find(x=>(x.name||'').toLowerCase()===(pname||'').toLowerCase()); if(p)(p.skills||[]).forEach(add);
      Object.keys(SKILL_ALIASES).forEach(add); Object.values(SKILL_ALIAS_MAP).forEach(add); return set; };
    turns.forEach(t=>(t.actions||[]).forEach(a=>{ if((a.char||'').toUpperCase()!=='WONDER'||!a.persona||a.hl) return;
      const body=String(a.text||'').trim(); if(!body){ a.skill=a.skill||''; return; }
      const words=body.split(/\s+/); const set=skillSetFor(a.persona); let best='',bestLen=0;
      // a slashed first token ("Reb/Mataru") is a choice, not a separator: resolve the part before
      // the slash as the skill, the rest goes to the note.
      let noteSuffix='';
      if(words[0] && /[^/]\/[^/]/.test(words[0])){ const parts=words[0].split('/');
        const ln=norm(parts[0]); let leftCanon=SKILL_ALIAS_MAP[ln]||SKILL_ALIAS_MAP[_n(parts[0])]||(set.has(_n(parts[0]))?set.get(_n(parts[0])):'');
        if(!leftCanon){ for(const [lc,canon] of set){ if(lc.indexOf(' ')<0 && norm(lc)===ln){ leftCanon=canon; break; } } }
        if(leftCanon){ noteSuffix=parts.slice(1).join('/'); words[0]=leftCanon; } }
      for(const [lc,canon] of set){ const cw=lc.split(/\s+/); if(cw.length>words.length||cw.length<=bestLen) continue;
        let ok=true; for(let i=0;i<cw.length;i++){ if(norm(words[i])!==norm(cw[i])){ ok=false; break; } }
        if(ok){ best=canon; bestLen=cw.length; } }
      if(best){ a.skill=best; a.text=(words.slice(bestLen).join(' ')+(noteSuffix?(' '+noteSuffix):'')).trim(); } })); }
  // a Wonder action with no explicit persona whose leading skill belongs to a known Wonder persona
  // (its signature or a header-listed skill) -> select that persona and put the skill in the dropdown.
  { const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\u00b7]/g,'');
    turns.forEach(t=>(t.actions||[]).forEach(a=>{ if((a.char||'').toUpperCase()!=='WONDER'||a.persona||a.skill) return;
      const body=String(a.text||'').trim(); if(!body) return; const words=body.split(/\s+/);
      let bp='',bs='',blen=0;
      for(const p of personas){ if(!p.name)continue; const cands=[]; const sig=PERSONA_SIGNATURES[p.name]; if(sig)cands.push(sig); (p.skills||[]).forEach(s=>{ if(s)cands.push(s); });
        for(const c of cands){ const cw=String(c).toLowerCase().split(/\s+/); if(cw.length>words.length||cw.length<=blen)continue;
          let ok=true; for(let i=0;i<cw.length;i++){ if(norm(words[i])!==norm(cw[i])){ok=false;break;} }
          if(ok){ bp=p.name; bs=c; blen=cw.length; } } }
      if(bp){ a.persona=bp; a.skill=bs; a.text=words.slice(blen).join(' ').trim(); } })); }
  const turnChars=[]; let turnHasWonder=false;
  turns.forEach(t=>t.actions.forEach(a=>{ if(a.char==='WONDER'){turnHasWonder=true;} else if(a.char && !turnChars.includes(a.char)) turnChars.push(a.char); }));

  // assemble units from header chars first, then any turn-only chars (no data -> empty fields highlighted)
  // "All A6": every character is A6R6 unless stated otherwise; capture explicit overrides like "Yukari A2"
  const allA6=/\ball\s*a6\b/i.test(text);
  if(allA6){ headerLines.forEach(hl=>{ if(!hl||hl==='\u0000')return; const re=/\b([A-Za-z\u00b7]+)\s+(A[0-6]|DGR)(?:\s*([RF][0-6X]))?\b/gi; let m2;
    while((m2=re.exec(hl))){ if(m2[1].toLowerCase()==='all')continue; const a=resolveActor(m2[1]); if(a&&a.type==='char') addChar(a.name,{awareness:m2[2].toUpperCase(),rev:_rev(m2[3])}); } }); }

  // Wind/Puppet disambiguation: WIND and PUPPET are elucidator codenames, but each also has a
  // non-elucidator unit variant (WIND·T = "Wind Tempest", PUPPET·S = "Puppet Summer"). If a
  // different elucidator (Ange/Fuuka/Oracle/Phoebe/Okyann) is present, Wind/Puppet must mean
  // their unit variants — there is only one elucidator slot.
  { const REAL_ELU=['ANGE','FUUKA','ORACLE','PHOEBE','OKYANN'];
    const present=new Set(charOrder); turns.forEach(t=>t.actions.forEach(a=>{ if(a.char)present.add(a.char); }));
    if(REAL_ELU.some(n=>present.has(n))){ const remap={'WIND':'WIND\u00b7T','PUPPET':'PUPPET\u00b7S'};
      Object.keys(remap).forEach(src=>{ const dst=remap[src]; if(!present.has(src)||!DATA.characterNames.includes(dst))return;
        if(charData[src]){ charData[dst]=Object.assign(charData[dst]||{},charData[src]); delete charData[src]; }
        const oi=charOrder.indexOf(src); if(oi>=0)charOrder[oi]=dst;
        const ti=turnChars.indexOf(src); if(ti>=0)turnChars[ti]=dst;
        turns.forEach(t=>t.actions.forEach(a=>{ if(a.char===src)a.char=dst; }));
      });
    }
  }

  // Rin variant disambiguation: a rota may name the base "Rin" (RIN) in the team and the Firecracker
  // variant ("CrackRin" -> RIN·F) in the turns for the SAME unit. When RIN·F is present, fold the base
  // RIN into it (its cards/build merge in), so they don't end up as two separate Rins.
  { const present=new Set(charOrder); turns.forEach(t=>t.actions.forEach(a=>{ if(a.char)present.add(a.char); }));
    if(present.has('RIN·F') && present.has('RIN') && DATA.characterNames.includes('RIN·F')){
      const src='RIN', dst='RIN·F';
      if(charData[src]){ charData[dst]=Object.assign({},charData[src],charData[dst]||{}); delete charData[src]; }
      const oi=charOrder.indexOf(src); if(oi>=0)charOrder[oi]=dst;
      const ti=turnChars.indexOf(src); if(ti>=0)turnChars[ti]=dst;
      turns.forEach(t=>t.actions.forEach(a=>{ if(a.char===src)a.char=dst; }));
    }
  }

  // character order: by first Skill/Attack/Gun/Guard in the turns (HL/TG/Assist + elucidator are ignored).
  // Wonder is ordered too, via its persona-skill actions (a HL-only Wonder action is ignored like any HL).
  const hasWonder = charOrder.includes('WONDER') || dagger || personas.length || turnHasWonder;
  const actionOrder=[];
  turns.forEach(t=>t.actions.forEach(a=>{
    if(a.char==='WONDER'){ if(((a.text||'').trim()||(a.skill||'').trim()||['S1','S2','S3','Atk','Gn','Gd'].includes(a.btn)) && !actionOrder.includes('WONDER')) actionOrder.push('WONDER'); }
    else if(a.char && ['S1','S2','S3','Atk','Gn','Gd'].includes(a.btn) && !actionOrder.includes(a.char)) actionOrder.push(a.char); }));
  const ordered=[]; const addOrd=c=>{ if(c&&!ordered.includes(c)) ordered.push(c); };
  // TURBO's kit makes her the fastest unit on the field, so wherever she appears she always acts first —
  // pin her to the front of the order regardless of when her first scripted skill happens to show up.
  if(charOrder.includes('TURBO')||turnChars.includes('TURBO')||actionOrder.includes('TURBO')) addOrd('TURBO');
  actionOrder.forEach(addOrd); if(hasWonder) addOrd('WONDER'); charOrder.forEach(addOrd); turnChars.forEach(addOrd);

  // Fuuka's explicit backup (from a "Backup:" line) is off-team: keep it out of the 4 team slots
  let backup=blankUnit();
  if(backupName){ const bi=ordered.indexOf(backupName); if(bi>=0) ordered.splice(bi,1); }

  const units=[blankUnit(),blankUnit(),blankUnit(),blankUnit()];
  let elucidator=blankUnit();
  let ui=0; const placed=new Set();
  // elucidator (prefer the classic navis ORACLE/FUUKA, else first elucidator-capable; never Wonder)
  { const cands=ordered.filter(nm=>nm!=='WONDER'&&!placed.has(nm)&&(DATA.elucidatorNames||[]).includes(nm));
    const eluName=cands.find(nm=>nm==='ORACLE'||nm==='FUUKA')||cands[0];
    if(eluName){ elucidator=Object.assign(blankUnit(),{name:eluName},pick(charData[eluName])); placed.add(eluName); } }
  // place every character (incl. Wonder, at its action-order position) into units; a 5th extra char becomes Fuuka's backup
  for(const nm of ordered){ if(placed.has(nm))continue;
    if(ui>3){ const fuuka=[...units,elucidator].find(u=>(u.name||'').toUpperCase()==='FUUKA');
      if(fuuka && !fuuka.companion){ fuuka.companion=nm; if(!backupName) backup=Object.assign(blankUnit(),pick(charData[nm])); placed.add(nm); } else warn.push(nm+' (no free team slot)'); continue; }
    if(nm==='WONDER'){ units[ui]=Object.assign(blankUnit(),{name:'WONDER',awareness:'DGR',rev:(charData['WONDER']&&charData['WONDER'].rev)||'',gear:dagger||''}); }
    else units[ui]=Object.assign(blankUnit(),{name:nm},pick(charData[nm]));
    placed.add(nm); ui++; }
  // Twins role: an explicit role from the header ("Twins Healer") wins; otherwise infer it from the two
  // Fire/Ice-style duals seen in the header line or the turn HLs.
  { const tw=units.find(u=>(u.name||'').toUpperCase()==='TWINS');
    if(tw && !tw.role){ if(twinsRole){ tw.role=twinsRole; }
      else { const seen=headerDuals.slice(); turns.forEach(t=>t.actions.forEach(a=>{ if(a._twinsHL && !seen.includes(a._twinsHL)) seen.push(a._twinsHL); }));
        if(seen.length>=2){ const role=TWINS_ROLES.find(r=>{ const d=TWINS_ROLE_DUALS[r]; return d.includes(seen[0])&&d.includes(seen[1]); }); if(role) tw.role=role; } } } }
  // builds stated in the title fill awareness/reforge where no explicit line set them (explicit lines win)
  [...units,elucidator].forEach(u=>{ if(!u.name||(u.name||'').toUpperCase()==='WONDER')return; const tb=titleBuilds[(u.name||'').toUpperCase()]; if(!tb)return;
    if(!u.awareness && tb.awareness) u.awareness=tb.awareness;
    if(!u.rev && tb.rev) u.rev=tb.rev; });
  // apply All-A6 defaults (explicit per-character awareness already set above wins; bare overrides get R0)
  if(allA6){ [...units,elucidator].forEach(u=>{ if(!u.name)return;
    if((u.name||'').toUpperCase()==='WONDER'){ u.awareness='DGR'; if(!u.rev)u.rev='R6'; return; }
    if(!u.awareness){ u.awareness='A6'; if(!u.rev)u.rev='R6'; } else if(!u.rev){ u.rev='R0'; } }); }
  // default card set per character: fill space/sun-sky only when the text gave none (an explicit set in the import wins)
  [...units,elucidator].forEach(u=>{ if(!u.name)return;
    if(!u.space && !u.sunsky){ const def=CHAR_CARD_DEFAULTS[(u.name||'').toUpperCase()]; if(def){ u.space=def.space; u.sunsky=def.sunsky; } } });
  // explicit "Backup:" line -> hang it on Fuuka's companion + restore the off-team build (name lives in the companion)
  if(backupName){ const fuuka=[...units,elucidator].find(u=>(u.name||'').toUpperCase()==='FUUKA');
    if(fuuka){ fuuka.companion=backupName; } else warn.push(backupName+' (Backup needs Fuuka on the team)');
    backup=Object.assign(blankUnit(),pick(charData[backupName])); }
  function pick(d){ d=d||{}; return {awareness:d.awareness||'',rev:d.rev||'',space:d.space||'',sunsky:d.sunsky||'',role:d.role||'',companion:d.companion||'',note:d.note||''}; }

  // merge in Wonder-action personas not already listed (more sources -> more reliable), header order first, up to 3
  { const have=personas.map(p=>(p.name||'').toLowerCase());
    turns.forEach(t=>t.actions.forEach(a=>{ if(a.char==='WONDER'&&a.persona){ const lc=a.persona.toLowerCase();
      if(!have.includes(lc) && personas.length<3){ personas.push({name:a.persona,skills:['',''],note:''}); have.push(lc); } } })); }
  // personas -> 3 slots
  const pslots=[{name:'',skills:['',''],note:''},{name:'',skills:['',''],note:''},{name:'',skills:['',''],note:''}];
  personas.slice(0,3).forEach((p,i)=>pslots[i]=p);

  // expand "Guard All" markers now that the team is known: every non-elucidator team unit
  // (Wonder included) guards, in team-slot order; a unit with its own explicit action in the
  // same turn keeps that action instead of guarding (e.g. "Guard All, Chord S3 Wonder").
  { const slotNames=units.filter(u=>u&&u.name).map(u=>u.name);
    const eluName=(elucidator&&elucidator.name)||'';
    turns.forEach(t=>{ if(!(t.actions||[]).some(a=>a&&a.guardAll))return;
      const explicit=t.actions.filter(a=>a&&!a.guardAll);
      const rebuilt=[];
      slotNames.forEach(nm=>{ const own=explicit.filter(a=>a.char===nm);
        if(own.length) rebuilt.push(...own);
        else if(nm!==eluName) rebuilt.push({char:nm,btn:'Gd',text:''}); });
      explicit.forEach(a=>{ if(!a.char||!slotNames.includes(a.char)) rebuilt.push(a); });
      t.actions=rebuilt; });
  }
  // a lone "Guard" -> the next due team member with no action this turn. Order is the team-slot order
  // normally; for DOD it is taken (as a fallback when the slot order is ambiguous) from the order actors
  // first act in the post-break phases, where Guards are rare so the true turn order shows. Slot members
  // not seen in the breaks keep their slot order at the end.
  { const slotNames=units.filter(u=>u&&u.name).map(u=>u.name);
    const eluName=(elucidator&&elucidator.name)||'';
    let dueOrder=slotNames;
    if((setup.type||'').toUpperCase()==='DOD'){ const seen=[];
      turns.forEach(t=>{ if(!/break/i.test(t.name))return; (t.actions||[]).forEach(a=>{ if(a&&a.char&&!seen.includes(a.char))seen.push(a.char); }); });
      if(seen.length) dueOrder=seen.filter(n=>slotNames.includes(n)).concat(slotNames.filter(n=>!seen.includes(n))); }
    turns.forEach(t=>{ const acts=t.actions||[]; if(!acts.some(a=>a&&a.guardSolo))return;
      // a unit whose only actions are free (HL / Assist) hasn't used its main action yet, so it's still idle and can take a lone Guard
      const acting=new Set(acts.filter(a=>a&&a.char&&!a.guardSolo&&!['HL','Ast'].includes(a.btn)).map(a=>a.char));
      const idle=dueOrder.filter(nm=>nm!==eluName && !acting.has(nm)); let gi=0;
      t.actions=acts.map(a=>{ if(!a||!a.guardSolo)return a; const nm=idle[gi++]; return nm?{char:nm,btn:'Gd',text:''}:a; })
        .filter(a=>!(a&&a.guardSolo)); });
  }

  // floating crit/pierce stat requirements (no character prefix) default to the team's Assassin/Sweeper unit's
  // note; with no such unit they stay team notes. Stats meant for other roles are written attributed already.
  // Every character has a fixed role (DATA.classTags); only the Twins vary, so their picked role wins for them.
  { const _cls=DATA.classTags||{};
    const roleOf=u=>{ const nm=(u.name||'').toUpperCase(); if(!nm)return ''; return nm==='TWINS' ? (u.role||'') : (_cls[nm]||''); };
    const carrier=[...units,elucidator].find(u=>/^(assassin|sweeper)$/i.test(roleOf(u)));
    if(carrier){ const keep=[],moved=[];
      noteLines.forEach(ln=>{ (STAT_REQ.test(ln)?moved:keep).push(ln); });
      if(moved.length){ carrier.note=(carrier.note?carrier.note+' ':'')+moved.join(' '); noteLines.length=0; noteLines.push(...keep); } } }

  if(noteLines.length){ setup.notes=''; } // free notes -> could go to teamNotes
  // drop a standalone notes header ("Notes", "Build Notes :"), then strip a leading "Notes" label from a
  // content line ("Notes: foo" -> "foo").
  const teamNotes=noteLines
    .filter(l=>!/^\s*(?:\w+\s+)?notes?\s*[:\-–—]?\s*$/i.test(l))
    .map(l=>l.replace(/^\s*notes?\b\s*[:\-–—]?\s*/i,''))
    .filter(l=>l.trim()).join('\n');

  return { state:{setup,units,elucidator,backup,personas:pslots,teamNotes,turns}, warnings:warn, got };
}

  /* ---- expose to the tool (and to tests). assignments, so re-loading is safe ---- */
  var _g = (typeof window!=='undefined') ? window : this;
  _g.parseRotationText = parseRotationText;
  _g.parseTurnContent  = parseTurnContent;
  _g.buildActions      = buildActions;
  _g.resolveActor      = resolveActor;
  _g.codeOf            = codeOf;
  _g.normDual          = normDual;
  _g._dual2            = _dual2;
  _g._matchDualAt      = _matchDualAt;
  _g._findDual         = _findDual;
  _g.cardPair          = cardPair;
  _g.matchDagger       = matchDagger;
  _g.findDaggerIn      = findDaggerIn;
  _g.expandSkillText   = expandSkillText;
  _g._knownName        = _knownName;
  _g.lev               = lev;
  _g._n                = _n;
  _g.ELEM_MAP          = ELEM_MAP;
  _g.VALID_DUALS       = VALID_DUALS;
  _g.CODE              = CODE;
  // single source of truth for the parser version — bump +1 on every change (A199 -> B001). See CLAUDE.md.
  _g.VF_PARSER_VERSION = 'A116';
})();
