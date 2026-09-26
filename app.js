const hospitals = [
  { id: 1, name: 'CityCare Multispeciality', type: 'Private Hospital', distance: '2.8 km', rating: '4.5', reviews: '1.8k', fees: '₹700–₹1,200', specialties: ['Dermatology','General Medicine','ENT'], availability: 'Today · 4:00 PM', address: 'Sector 62, Noida', tag: 'Strong match' },
  { id: 2, name: 'District Government Hospital', type: 'Government Hospital', distance: '4.1 km', rating: '4.1', reviews: '2.4k', fees: 'Low / subsidised', specialties: ['Dermatology','Medicine','Diagnostics'], availability: 'Tomorrow · 9:30 AM', address: 'Sector 30, Noida', tag: 'Government option' },
  { id: 3, name: 'AyurWellness Centre', type: 'AYUSH Clinic', distance: '5.6 km', rating: '4.7', reviews: '780', fees: '₹450–₹800', specialties: ['Ayurveda','Lifestyle Care'], availability: 'Today · 6:00 PM', address: 'Sector 50, Noida', tag: 'AYUSH pathway' }
];

let records = [
  { id: 1, title: 'CBC + Lipid Profile', type: 'Lab Report', source: 'City Diagnostics', date: '18 Sep 2026', status: 'Verified' },
  { id: 2, title: 'Prescription — Dermatology', type: 'Prescription', source: 'CityCare Multispeciality', date: '12 Sep 2026', status: 'Documented' },
  { id: 3, title: 'Discharge Summary', type: 'Discharge', source: 'District Government Hospital', date: '03 Jun 2026', status: 'Documented' },
  { id: 4, title: 'Skin Allergy Test', type: 'Investigation', source: 'City Diagnostics', date: '22 Apr 2026', status: 'Unverified' }
];

const state = {
  active: 'Dashboard', step: 1, query: '', booked: false, selectedHospital: null
};

const icons = {
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 19.5z"/><path d="M9 7h7M9 11h7M9 15h4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M7 2.5v4M17 2.5v4M3 9h18"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M7 2.5h7l4 4V21H7a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z"/><path d="M14 2.5V7h4"/></svg>',
  activity: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.3 8-8 10-4.7-2-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 18 3.5 21V6L9 3l6 3 5.5-3v15L15 21z"/><path d="M9 3v15M15 6v15"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></svg>'
};
function I(name){ return icons[name] || ''; }

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function toast(message){
  const el = document.getElementById('toast');
  el.innerHTML = I('check') + '<span>' + escapeHtml(message) + '</span>';
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

function statusClass(status){ return String(status).toLowerCase().replace(/\s+/g,'-'); }

function nav(){
  const items = [['Dashboard','grid'],['My Case','note'],['Care Finder','search'],['Appointments','calendar'],['Records','file']];
  return items.map(([label,icon]) => `<button class="nav-item ${state.active===label?'active':''}" data-nav="${label}">${I(icon)}<span>${label}</span></button>`).join('');
}

function shell(){
  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand" data-nav="Dashboard"><div class="brand-mark"><span></span><span></span><span></span><span></span></div><div><strong>MediSync</strong><small>CONNECTED CARE</small></div></div>
      <div class="side-label">PATIENT</div>
      <div class="profile-card"><div class="avatar">AS</div><div><strong>Aarav Sharma</strong><span>ABHA •••• 4621</span></div><button class="icon-btn ghost"><span>${I('more')}</span></button></div>
      <nav>${nav()}</nav>
      <div class="side-footer"><div class="privacy-mini">${I('shield')}<div><strong>Privacy first</strong><span>Consent-controlled sharing</span></div></div><button class="help-link" data-help>Need help?</button></div>
    </aside>
    <main class="main">
      <header class="topbar"><div><div class="eyebrow">PATIENT-CENTRIC HEALTHCARE</div><h1>${escapeHtml(state.active)}</h1></div><div class="top-actions"><button class="emergency-btn" data-emergency>Emergency</button><button class="icon-btn">${I('bell')}</button><button class="user-chip">AS <span>Aarav</span></button></div></header>
      <div id="page"></div>
      <footer class="main-footer">Prototype UI • Demo data only • Not for medical diagnosis or emergency care</footer>
    </main>
  </div>`;
}

function dashboard(){
  return `<div class="content">
    <section class="welcome-row"><div><p class="welcome">Good evening, Aarav</p><p class="muted">Your health information, appointments and care journey in one place.</p></div><button class="primary" data-nav="My Case">${I('plus')} Start a new case</button></section>
    <section class="hero-grid">
      <div class="hero-card"><div class="hero-copy"><span class="pill teal">CLINICAL CASE PASSPORT</span><h2>Your story, ready for the next consultation.</h2><p>MediSync brings together your history, documents and care journey — and highlights what is documented, missing or needs verification.</p><div class="hero-actions"><button class="primary" data-nav="My Case">Continue case ${I('arrow')}</button><button class="secondary" data-nav="Records">View records</button></div></div><div class="passport-visual"><div class="passport-line"></div><div class="passport-item"><span class="dot green"></span><div><strong>12 clinical facts</strong><small>documented / verified</small></div></div><div class="passport-item"><span class="dot amber"></span><div><strong>2 items to verify</strong><small>requires clinician review</small></div></div><div class="passport-item"><span class="dot purple"></span><div><strong>1 report missing</strong><small>possible source identified</small></div></div></div></div>
      <div class="status-card"><div class="card-head"><span>Case readiness</span><span class="score">82%</span></div><div class="progress"><span style="width:82%"></span></div><p class="muted">Your case is almost ready for the next appointment.</p><div class="readiness-list"><div>${I('check')}<span>Current medication list</span></div><div>${I('check')}<span>Recent lab reports</span></div><div>${I('clock')}<span>Previous allergy record needs verification</span></div></div><button class="text-btn" data-nav="My Case">Review missing information ${I('arrow')}</button></div>
    </section>
    <section class="stats-grid">
      ${stat('Health documents',records.length,'Across 3 providers','file')}${stat('Upcoming','01','Consultation booked','calendar')}${stat('Clinical timeline','08','Recorded events','activity')}${stat('Consent status','Active','Patient-controlled sharing','shield')}
    </section>
    <section class="two-col"><div class="panel"><div class="panel-head"><div><span class="overline">RECENT DOCUMENTS</span><h3>Your health records</h3></div><button class="text-btn" data-nav="Records">See all ${I('arrow')}</button></div><div class="record-list">${records.slice(0,3).map(recordRow).join('')}</div><button class="upload-btn" data-upload>${I('upload')} Add a document</button></div>
    <div class="panel"><div class="panel-head"><div><span class="overline">CLINICAL TIMELINE</span><h3>Recent care activity</h3></div><button class="icon-btn ghost">${I('more')}</button></div><div class="timeline">${timeline().join('')}</div></div></section>
  </div>`;
}
function stat(label,value,helper,icon){ return `<div class="stat-card"><div class="stat-icon">${I(icon)}</div><div><span>${label}</span><strong>${value}</strong><small>${helper}</small></div></div>`; }
function recordRow(r){ return `<div class="record-row"><div class="record-icon">${I('file')}</div><div class="record-main"><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.type)} · ${escapeHtml(r.source)}</span></div><div class="record-side"><span>${escapeHtml(r.date)}</span><em class="status ${statusClass(r.status)}">${escapeHtml(r.status)}</em></div></div>`; }
function timeline(){ const data=[['18 Sep 2026','Lab report added','CBC + Lipid Profile','green'],['12 Sep 2026','Dermatology consultation','Prescription added · follow-up in 4 weeks','teal'],['03 Jun 2026','Hospital discharge','Discharge summary added','blue']]; return data.map(x=>`<div class="timeline-item"><span class="timeline-dot ${x[3]}"></span><div><span class="date">${x[0]}</span><strong>${x[1]}</strong><span>${x[2]}</span></div></div>`); }

function caseView(){
  const steps = ['Concern','History','Records','Review'];
  const content = {
    1: `<div class="question-card"><span class="question-kicker">01 · CURRENT CONCERN</span><h3>What would you like help with today?</h3><div class="choice-grid"><button data-demo>Skin / hair</button><button data-demo>General health</button><button data-demo>Follow-up</button><button data-demo>AYUSH consultation</button></div><div class="voice-entry"><button class="mic-btn" data-mic>${I('mic')}</button><div><strong>Prefer to speak?</strong><span>Tap the microphone and describe the concern naturally.</span></div></div></div>`,
    2: `<div class="question-card"><span class="question-kicker">02 · HISTORY</span><h3>Tell us a little more</h3><label>When did this start?</label><div class="input-row"><button class="choice active">Within 1 week</button><button class="choice">1–4 weeks</button><button class="choice">1–6 months</button><button class="choice">More than 6 months</button></div><label>Anything else we should know?</label><textarea placeholder="You can write in simple language or use voice...">It comes and goes, and gets worse after outdoor exposure.</textarea><div class="case-note">${I('shield')}<span>Your answers are draft inputs. A clinician reviews the final clinical interpretation.</span></div></div>`,
    3: `<div class="question-card"><span class="question-kicker">03 · RECORDS</span><h3>Add previous medical information</h3><div class="dropzone" data-upload>${I('upload',)}<strong>Drop a prescription, lab report or discharge summary here</strong><span>PDF, JPG or PNG · demo upload</span></div><div class="review-list"><div><span class="dot green"></span><strong>Recent prescription</strong><small>12 Sep 2026 · Documented</small></div><div><span class="dot amber"></span><strong>Allergy history</strong><small>Previous record found · verification needed</small></div></div></div>`,
    4: `<div class="question-card"><span class="question-kicker">04 · REVIEW</span><h3>Clinical readiness snapshot</h3><div class="review-grid"><div class="mini-fact green-bg"><strong>8</strong><span>Documented facts</span></div><div class="mini-fact amber-bg"><strong>2</strong><span>Items to verify</span></div><div class="mini-fact purple-bg"><strong>1</strong><span>Missing report</span></div></div><div class="summary-preview"><span class="overline">PHYSICIAN-READY DRAFT</span><p><strong>Current concern:</strong> recurring skin irritation</p><p><strong>Duration:</strong> 2–4 weeks</p><p><strong>Previous treatment:</strong> documented in prescription</p><p><strong>Flag:</strong> allergy history requires clinician verification</p></div></div>`
  }[state.step];
  return `<div class="content narrow"><div class="case-shell panel"><div class="case-top"><div><span class="overline">ADAPTIVE CASE INTAKE</span><h2>Let's build your clinical case.</h2><p class="muted">Answer in your own words. You can switch between voice, touch and text.</p></div><span class="pill neutral">Step ${state.step} of 4</span></div><div class="stepper">${steps.map((s,i)=>`<div class="step ${i+1<=state.step?'done':''}"><span>${i+1}</span><small>${s}</small></div>`).join('')}</div>${content}<div class="case-footer"><button class="secondary" data-prev ${state.step===1?'disabled':''}>Back</button><div><button class="secondary" data-save>Save draft</button><button class="primary" data-next>${state.step===4?'Prepare my case':'Continue'} ${I('arrow')}</button></div></div></div></div>`;
}

function careFinder(){
  const filtered = hospitals.filter(h => !state.query || [h.name,h.type,h.address,...h.specialties].join(' ').toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="content"><section class="finder-hero"><div><span class="pill teal">CARE DISCOVERY</span><h2>Find care that fits your case.</h2><p>Compare nearby facilities and doctors using transparent information. You stay in control of the final choice.</p></div><div class="finder-mini"><div>${I('map')}<span>NEAR YOU</span><strong>Sector 62</strong></div><div>${I('note')}<span>PATHWAY</span><strong>Dermatology</strong></div></div></section><div class="searchbar">${I('search')}<input id="finderSearch" value="${escapeHtml(state.query)}" placeholder="Search hospitals, doctors, specialties or services" /><button class="filter-btn" data-filter>Filters</button></div><div class="finder-grid"><div class="results-list">${filtered.map(hospitalCard).join('')}</div><div class="map-card"><div class="map-grid"></div><div class="map-pin pin-a">●</div><div class="map-pin pin-b">●</div><div class="map-pin pin-c">●</div><div class="map-overlay"><span class="overline">MAP VIEW</span><strong>Sector 62, Noida</strong><span>${filtered.length} matched facilities</span></div></div></div></div>`;
}
function hospitalCard(h){ return `<div class="hospital-card"><div class="hospital-card-top"><div class="hospital-logo">${h.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><span class="hospital-tag">${h.tag}</span><h3>${h.name}</h3><span class="muted">${h.type} · ${h.distance}</span></div><button class="icon-btn ghost">${I('more')}</button></div><div class="hospital-meta"><span>★ ${h.rating} <small>(${h.reviews})</small></span><span>${h.fees}</span><span>${I('map',15)} ${h.address}</span></div><div class="specialties">${h.specialties.map(s=>`<span>${s}</span>`).join('')}</div><div class="availability"><div><span class="overline">NEXT AVAILABLE</span><strong>${h.availability}</strong></div><button class="primary small" data-book="${h.id}">View & book ${I('arrow')}</button></div></div>`; }

function appointments(){
  const has = state.booked && state.selectedHospital;
  return `<div class="content"><div class="appointments-grid"><div class="panel"><div class="panel-head"><div><span class="overline">UPCOMING</span><h3>Your appointments</h3></div><button class="primary small" data-nav="Care Finder">${I('plus')} New</button></div>${has?`<div class="appointment-card"><div class="appointment-date"><strong>30</strong><span>SEP</span></div><div class="appointment-main"><span class="pill teal">CONFIRMED · DEMO</span><h3>Dermatology consultation</h3><p>${state.selectedHospital.name}</p><span>${I('clock',15)} 4:00 PM · Arrive 15 min early</span><span>${I('map',15)} ${state.selectedHospital.address}</span></div><button class="secondary" data-demo>Directions</button></div>`:`<div class="empty-state"><div class="empty-icon">${I('calendar')}</div><h3>No upcoming appointments</h3><p>Find a provider and book a consultation from Care Finder.</p><button class="primary" data-nav="Care Finder">Find care ${I('arrow')}</button></div>`}</div><div class="panel"><span class="overline">PAST VISITS</span><h3>Recent consultations</h3><div class="visit-list"><div><span>12 Sep 2026</span><strong>Dermatology · CityCare Multispeciality</strong><small>Prescription added</small></div><div><span>03 Jun 2026</span><strong>General Medicine · District Government Hospital</strong><small>Discharge summary added</small></div></div></div></div></div>`;
}

function recordsView(){ return `<div class="content"><div class="records-head"><div><span class="overline">PERSONAL HEALTH DASHBOARD</span><h2>Your records</h2><p class="muted">A single place for reports, prescriptions and care documents.</p></div><button class="primary" data-upload>${I('upload')} Add record</button></div><div class="record-filter"><button class="filter-chip active">All</button><button class="filter-chip">Lab</button><button class="filter-chip">Prescription</button><button class="filter-chip">Discharge</button><button class="filter-chip">Other</button></div><div class="records-table"><div class="table-row table-head"><span>DOCUMENT</span><span>SOURCE</span><span>DATE</span><span>STATUS</span><span></span></div>${records.map(r=>`<div class="table-row"><span class="doc-cell"><span class="record-icon">${I('file')}</span><div><strong>${escapeHtml(r.title)}</strong><small>${escapeHtml(r.type)}</small></div></span><span>${escapeHtml(r.source)}</span><span>${escapeHtml(r.date)}</span><span><em class="status ${statusClass(r.status)}">${escapeHtml(r.status)}</em></span><button class="icon-btn ghost">${I('more')}</button></div>`).join('')}</div></div>`; }

function render(){
  document.getElementById('app').innerHTML = shell();
  const page = document.getElementById('page');
  page.innerHTML = state.active==='Dashboard'?dashboard():state.active==='My Case'?caseView():state.active==='Care Finder'?careFinder():state.active==='Appointments'?appointments():recordsView();
  bind();
}

function addRecord(){ records.unshift({id:Date.now(),title:'Uploaded medical document',type:'Document',source:'Patient upload',date:'27 Sep 2026',status:'Unverified'}); toast('Document added to your health dashboard.'); render(); }

function bind(){
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click',()=>{ state.active=btn.dataset.nav; if(state.active!=='My Case') state.step=1; render(); }));
  document.querySelectorAll('[data-upload]').forEach(btn=>btn.addEventListener('click',addRecord));
  document.querySelectorAll('[data-help]').forEach(btn=>btn.addEventListener('click',()=>toast('Demo support is available in this prototype.')));
  document.querySelectorAll('[data-emergency]').forEach(btn=>btn.addEventListener('click',()=>toast('Emergency flow: call local emergency services. This prototype does not place live calls.')));
  document.querySelectorAll('[data-demo]').forEach(btn=>btn.addEventListener('click',()=>toast('Demo interaction — live healthcare services are not connected.')));
  const next=document.querySelector('[data-next]'); if(next) next.addEventListener('click',()=>{ if(state.step<4){state.step++;render();} else toast('Case prepared for care discovery.'); });
  const prev=document.querySelector('[data-prev]'); if(prev) prev.addEventListener('click',()=>{ if(state.step>1){state.step--;render();} });
  const save=document.querySelector('[data-save]'); if(save) save.addEventListener('click',()=>toast('Draft saved locally in this demo.'));
  const mic=document.querySelector('[data-mic]'); if(mic) mic.addEventListener('click',()=>toast('Voice capture demo started.'));
  document.querySelectorAll('[data-book]').forEach(btn=>btn.addEventListener('click',()=>{ state.selectedHospital=hospitals.find(h=>String(h.id)===btn.dataset.book); state.booked=true; toast('Appointment request created.'); state.active='Appointments'; render(); }));
  const search=document.getElementById('finderSearch'); if(search){ search.addEventListener('input',e=>{state.query=e.target.value; document.getElementById('page').innerHTML=careFinder(); bind();}); }
  const filter=document.querySelector('[data-filter]'); if(filter) filter.addEventListener('click',()=>toast('Filters are shown in the prototype.'));
}

render();
