const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const db = { get: (k, d) => JSON.parse(localStorage.getItem(k) || 'null') ?? d, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mins = t => Math.max(1, Math.round((Date.now() - t) / 60000));
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2600); };

/* ---- Demo data (replace with MySQL through a PHP/Node API) ---- */
if (!db.get('users')) db.set('users', [
  { username: 'Gandara Mapagmahal', password: 'alaga1234', role: 'student' },
  { username: 'Mrs. Santos', password: 'alaga1234', role: 'teacher' },
  { username: 'Nurse Reyes', password: 'alaga1234', role: 'nurse' }]);
if (!db.get('reports')) { const n = Date.now(); db.set('reports', [
  { id: 1, who: 'Gandara Mapagmahal • Grade 5', desc: 'May rashes sa dalawang braso, nilalagnat simula umaga', sev: 'k', t: n - 3 * 6e4, status: 'new', by: 'Mrs. Santos' },
  { id: 2, who: 'John Dimakalimot • Grade 3', desc: 'Masakit ang ulo, nahihilo, mainit ng kaunti', sev: 'm', t: n - 5 * 6e4, status: 'new', by: 'Mrs. Santos' },
  { id: 3, who: 'Jerome D. — Grade 5, Section B', desc: 'Nawalan ng malay pagkatapos maglaro sa init', sev: 'u', t: n - 4 * 6e4, status: 'new', by: 'Coach Dela Cruz' },
  { id: 4, who: 'Ana R. — Grade 3, Section A', desc: 'Sugat sa tuhod, di kaya tumayo', sev: 'k', t: n - 12 * 6e4, status: 'new', by: 'Mrs. Santos' }]); }

const SYMPTOMS = [['🩹', 'Sugat/Wound'], ['🌡️', 'Lagnat/Fever'], ['🦴', 'Bali/Fracture'], ['🤧', 'Allergy reaction'], ['😮‍💨', 'Hirap huminga'], ['🤮', 'Pagsusuka'], ['😷', 'Pananakit ng lalamunan/ubo'], ['🔴', 'Pantal sa balat (skin rash)'], ['🤕', 'Sakit ng ulo/Headache'], ['➕', 'Iba pa']];
const URGENT = /malay|hirap huminga|bali|fracture|allergy|dugo|seizure|kombulsyon/i, MID = /sugat|wound|lagnat|fever|suka|di kaya tumayo/i;
const severity = d => URGENT.test(d) ? 'u' : MID.test(d) ? 'k' : 'm';
const SEV = { u: ['URGENT', '#5a2a33', '#ff9bb4'], k: ['KATAMTAMAN', '#54481f', '#ffd76a'], m: ['MILD', '#1f4a33', '#86e6a8'] };

/* ---- Session + navigation ---- */
let session = db.get('session', null), mode = 'login', role = '', current = 's-splash', refId = null;
const PUBLIC = ['s-splash', 's-welcome', 's-role', 's-auth'];
const HOOKS = { 's-home': () => mapHome(), 's-cases': renderCases, 's-triage': renderTriage, 's-referral': () => mapRef(0) };

function go(id) {
  if (!PUBLIC.includes(id) && !session) id = 's-welcome';
  $$('.screen').forEach(s => s.hidden = s.id !== id);
  $('#topbar').hidden = PUBLIC.includes(id);
  $('#menu').hidden = true; $('#q').value = ''; filter('');
  current = id; window.scrollTo(0, 0);
  if (HOOKS[id]) HOOKS[id]();
}
function logout() { session = null; localStorage.removeItem('session'); go('s-welcome'); toast('Naka-log out ka na.'); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-action],[data-role]');
  if (!el) { if (!e.target.closest('.menu-wrap')) $('#menu').hidden = true; return; }
  if (el.dataset.role) { role = el.dataset.role; $('#authBtn').textContent = mode === 'login' ? 'Log-in' : 'Sign-up'; $('#authMsg').textContent = ''; $('#authForm').reset(); return go('s-auth'); }
  if (el.dataset.action === 'start') { mode = el.dataset.mode; return go('s-role'); }
  if (el.dataset.action === 'logout') return logout();
  go(el.dataset.go);
  if (el.dataset.focus) setTimeout(() => $('#rImg').click(), 50);
});

/* ---- Auth ---- */
$('#authForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('#user').value.trim(), p = $('#pass').value, users = db.get('users', []), msg = $('#authMsg');
  const found = users.find(x => x.username.toLowerCase() === u.toLowerCase() && x.role === role);
  if (mode === 'signup') {
    if (users.some(x => x.username.toLowerCase() === u.toLowerCase())) return msg.textContent = 'Ginagamit na ang username na ito. Pumili ng iba.';
    users.push({ username: u, password: p, role }); db.set('users', users); found && 0;
    session = { username: u, role };
  } else {
    if (!found || found.password !== p) return msg.textContent = 'Mali ang username o password. Subukan ulit.';
    session = { username: found.username, role };
  }
  db.set('session', session); $('#who').textContent = `${session.username} (${session.role})`; go('s-home');
});
$('#menuBtn').onclick = () => { const m = $('#menu'); m.hidden = !m.hidden; $('#menuBtn').setAttribute('aria-expanded', !m.hidden); };
$('#bell').onclick = () => { const n = db.get('reports', []).filter(r => r.status === 'new').length; toast(n ? `${n} bagong kaso ang naghihintay.` : 'Walang bagong abiso.'); };

/* ---- Search (filters whatever is on the current screen) ---- */
function filter(v) { v = v.toLowerCase(); $$('.find').forEach(x => x.hidden = !x.textContent.toLowerCase().includes(v)); }
$('#q').addEventListener('input', e => filter(e.target.value));

/* ---- Reporting ---- */
$('#symGrid').innerHTML = SYMPTOMS.map(([e, t]) => `<button class="find" data-sym="${esc(t)}"><span class="e">${e}</span>${esc(t)}</button>`).join('');
$('#symGrid').addEventListener('click', e => { const b = e.target.closest('[data-sym]'); if (!b) return; $('#rDesc').value = b.dataset.sym + ': '; go('s-form'); $('#rDesc').focus(); });

let photo = '';
$('#rImg').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'), s = Math.min(1, 480 / img.width); c.width = img.width * s; c.height = img.height * s;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    photo = c.toDataURL('image/jpeg', .6); $('#rPrev').src = photo; $('#rPrev').hidden = false; $('#rHint').hidden = true;
  }; img.src = URL.createObjectURL(f);
});
$('#reportForm').addEventListener('submit', e => {
  e.preventDefault();
  const list = db.get('reports', []), desc = $('#rDesc').value.trim();
  list.push({ id: Date.now(), who: $('#rWho').value.trim(), desc, img: photo, sev: severity(desc), t: Date.now(), status: 'new', by: session.username });
  try { db.set('reports', list); } catch (_) { list[list.length - 1].img = ''; db.set('reports', list); }
  e.target.reset(); photo = ''; $('#rPrev').hidden = true; $('#rHint').hidden = false;
  toast('Naipadala na sa School Nurse.'); go('s-home');
});

/* ---- Nurse: cases + triage ---- */
function renderCases() {
  const open = db.get('reports', []).filter(r => r.status === 'new' || r.status === 'monitor'), c = k => open.filter(r => r.sev === k).length;
  $('#counts').innerHTML = ['u', 'k', 'm'].map(k => `<div class="${k}"><b>${c(k)}</b>${SEV[k][0]}</div>`).join('');
  const order = { u: 0, k: 1, m: 2 };
  $('#caseList').innerHTML = open.sort((a, b) => order[a.sev] - order[b.sev] || b.t - a.t).map(r => `
    <article class="case"><header><span class="tag" style="background:${SEV[r.sev][1]};color:${SEV[r.sev][2]}">${SEV[r.sev][0]}</span><time>${mins(r.t)} min ago</time></header>
    <div class="body">${esc(r.who)}<br>${esc(r.desc)}
    <div class="acts"><button class="pill" data-go="s-triage">Buksan</button>
    ${r.sev === 'u' ? `<button class="pill red" data-refer="${r.id}">I-refer sa RHU</button>` : r.sev === 'k' ? `<button class="pill" data-reply="${r.id}">Sumagot</button>` : ''}</div></div></article>`).join('')
    || '<p class="sub">Walang aktibong kaso. Magaling!</p>';
}
function setStatus(id, s) { const l = db.get('reports', []); l.find(r => r.id == id).status = s; db.set('reports', l); }
function renderTriage() {
  const q = db.get('reports', []).filter(r => r.status === 'new');
  $('#queueInfo').textContent = `Pila sa Triage • ${q.length} new`;
  $('#triageList').innerHTML = q.map((r, i) => `<div class="tcard ${i % 2 ? 'alt' : ''}">
    <div class="thumb">${r.img ? `<img src="${r.img}" alt="">` : '🖼️'}</div>
    <div><div class="no">NO. ${String(r.id).slice(-4).padStart(4, '0')}</div><b>${esc(r.who)}</b><small>${esc(r.desc)}</small><small>Ipinadala ${mins(r.t)} minuto nakalipas ni ${esc(r.by)}</small></div>
    <div class="decide"><button class="d1" data-dec="home" data-id="${r.id}">🏠 Home Care - Magbigay ng Payo</button>
    <button class="d2" data-dec="monitor" data-id="${r.id}">👁️ Monitor - Obserbahan pa muna</button>
    <button class="d3" data-dec="refer" data-id="${r.id}">🚑 Refer - Dalhin na sa Ospital</button></div></div>`).join('') || '<p class="small">Walang naghihintay na kaso.</p>';
}
document.addEventListener('click', e => {
  const d = e.target.closest('[data-dec]'), rf = e.target.closest('[data-refer]'), rp = e.target.closest('[data-reply]');
  if (d) { const id = d.dataset.id; if (d.dataset.dec === 'refer') { setStatus(id, 'referred'); openReferral(id); } else { setStatus(id, d.dataset.dec); toast('Nai-save ang desisyon.'); renderTriage(); } }
  if (rf) { setStatus(rf.dataset.refer, 'referred'); openReferral(rf.dataset.refer); }
  if (rp) toast('Naipadala ang sagot sa guro.');
});

/* ---- Maps ---- */
async function mapHome() { const r = await RHUMap.render('map-home'); $('#eta-home').textContent = r.target ? r.min : '–'; }
function openReferral(id) { refId = id; go('s-referral'); }
async function mapRef(i) {
  const rep = db.get('reports', []).find(r => r.id == refId);
  $('#refWho').textContent = rep ? 'Refer: ' + rep.who : 'Pinakamalapit na RHU'; $('#refDesc').textContent = rep ? rep.desc : '';
  const r = await RHUMap.render('map-ref', i), t = r.target;
  if (!t) { $('#rhuCard').innerHTML = '<b>Walang nahanap na RHU</b>Buksan ang location at subukan ulit.'; return; }
  $('#rhuCard').innerHTML = `<b>${esc(t.name)}</b>📍 ${r.km.toFixed(1)} km away • ${r.min} min<br>🕑 ${esc(t.hours || 'Tawagan para sa oras')}`;
  $('#callBtn').href = t.phone ? 'tel:' + t.phone.replace(/[^+\d]/g, '') : '#'; $('#callBtn').onclick = e => { if (!t.phone) { e.preventDefault(); toast('Walang nakalistang numero. Gamitin ang Direction.'); } };
  $('#dirBtn').href = `https://www.google.com/maps/dir/?api=1&origin=${r.me.join(',')}&destination=${t.lat},${t.lon}`;
  const more = r.list.map((f, n) => [f, n]).filter(([, n]) => n !== i).slice(0, 2);
  $('#moreBtn').textContent = `Tingnan ang iba pang ${more.length} malapit na RHU`; $('#moreBtn').hidden = !more.length;
  $('#moreList').innerHTML = more.map(([f, n]) => `<button data-pick="${n}">${esc(f.name)} • ${f.km.toFixed(1)} km</button>`).join('');
}
$('#moreBtn').onclick = () => $('#moreList').hidden = !$('#moreList').hidden;
$('#moreList').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { $('#moreList').hidden = true; mapRef(+b.dataset.pick); } });

/* ---- Start ---- */
if (session) $('#who').textContent = `${session.username} (${session.role})`;
setTimeout(() => go(session ? 's-home' : 's-welcome'), 1600);
