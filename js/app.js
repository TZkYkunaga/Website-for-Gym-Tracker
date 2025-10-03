// Gym Tracker main script with optional Firebase integration
(function(){
  const STORAGE_KEY = 'gym-tracker-data-v1';

  let state = { exercises: [], selectedId: null };
  let user = null; // firebase user or simple username string

  // Elements
  const addForm = document.getElementById('addExerciseForm');
  const exerciseList = document.getElementById('exerciseList');
  const emptyState = document.getElementById('emptyState');
  const detail = document.getElementById('exerciseDetail');
  const detailName = document.getElementById('detailName');
  const detailGroup = document.getElementById('detailGroup');
  const detailSummary = document.getElementById('detailSummary');
  const setList = document.getElementById('setList');
  const btnLogSet = document.getElementById('btnLogSet');
  const btnDeleteExercise = document.getElementById('btnDeleteExercise');
  const loginLink = document.getElementById('loginLink');
  const signOutBtn = document.getElementById('signOutBtn');
  const userEmail = document.getElementById('userEmail');

  // Modal
  const logSetModalEl = document.getElementById('logSetModal');
  const logSetModal = new bootstrap.Modal(logSetModalEl);
  const logSetForm = document.getElementById('logSetForm');

  // Local simple auth detection
  function getLocalUser(){ return localStorage.getItem('simple-user') || null; }
  function signOutLocal(){ localStorage.removeItem('simple-user'); }

  function uid(){ return 'id-' + Math.random().toString(36).slice(2,9); }

  // Local persistence (IndexedDB via GymDB, fallback to localStorage)
  function userLocalKey(){
    const simple = getLocalUser();
    if(simple) return STORAGE_KEY.replace('v1', `-${simple}`);
    return STORAGE_KEY;
  }

  async function saveLocal(){
    const username = getLocalUser() || 'default';
    if(window.GymDB && GymDB.saveState){
      try{ await GymDB.saveState(username, state); return; } catch(e){ console.warn('IndexedDB save failed', e); }
    }
    localStorage.setItem(userLocalKey(), JSON.stringify(state));
  }

  async function loadLocal(){
    const username = getLocalUser() || 'default';
    if(window.GymDB && GymDB.getState){
      try{
        const s = await GymDB.getState(username);
        if(s){ state = s; return; }
      }catch(e){ console.warn('IndexedDB load failed', e); }
    }
    const raw = localStorage.getItem(userLocalKey());
    if(raw){ try { state = JSON.parse(raw); } catch(e){ console.warn('local data corrupt', e); state = { exercises: [], selectedId: null }; } }
    if(!state || !state.exercises) state = { exercises: [], selectedId: null };
  }

  // No cloud persistence — local-only

  function renderList(){
    exerciseList.innerHTML = '';
    state.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      if(state.selectedId === ex.id) li.classList.add('active');
      li.dataset.id = ex.id;
      li.innerHTML = `<div><strong>${escapeHtml(ex.name)}</strong><div class="small text-muted">${escapeHtml(ex.muscle||'')}</div></div><span class="badge bg-secondary rounded-pill">${ex.sets?ex.sets.length:0}</span>`;
      li.addEventListener('click', ()=> selectExercise(ex.id));
      exerciseList.appendChild(li);
    });
  }

  function renderDetail(){
    const ex = state.exercises.find(e=>e.id===state.selectedId);
    if(!ex){ detail.classList.add('d-none'); emptyState.classList.remove('d-none'); return; }
    emptyState.classList.add('d-none'); detail.classList.remove('d-none');
    detailName.textContent = ex.name;
    detailGroup.textContent = ex.muscle || '';
    detailSummary.textContent = `Total sets: ${ex.sets.length}`;

    setList.innerHTML = '';
    ex.sets.slice().reverse().forEach(s=>{
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-start';
      li.innerHTML = `<div><div><strong>${s.weight} kg × ${s.reps} rep</strong></div><div class="small text-muted">${s.note||''} • ${new Date(s.t).toLocaleString()}</div></div>`;
      setList.appendChild(li);
    });
  }

  async function selectExercise(id){
    state.selectedId = id;
    await saveLocal();
    renderList();
    renderDetail();
  }

  addForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('exerciseName').value.trim();
    const muscle = document.getElementById('muscleGroup').value.trim();
    if(!name) return;
    const ex = { id: uid(), name, muscle, sets: [] };
    state.exercises.push(ex);
    state.selectedId = ex.id;
    await saveLocal();
    addForm.reset();
    renderList();
    renderDetail();
  });

  btnLogSet.addEventListener('click', ()=>{
    if(!state.selectedId) return;
    logSetForm.reset();
    logSetModal.show();
  });

  logSetForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const weight = parseFloat(document.getElementById('setWeight').value);
    const reps = parseInt(document.getElementById('setReps').value,10);
    const note = document.getElementById('setNote').value.trim();
    const ex = state.exercises.find(x=>x.id===state.selectedId);
    if(!ex) return;
    ex.sets.push({ weight, reps, note, t: Date.now() });
    await saveLocal();
    logSetModal.hide();
    renderList();
    renderDetail();
  });

  btnDeleteExercise.addEventListener('click', async ()=>{
    if(!state.selectedId) return;
    if(!confirm('Xóa bài tập này?')) return;
    state.exercises = state.exercises.filter(x=>x.id!==state.selectedId);
    state.selectedId = state.exercises.length?state.exercises[0].id:null;
    await saveLocal();
    renderList();
    renderDetail();
  });

  // removed firebase sign-out; local sign-out handled later

  // escape helper
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; }); }

  // Seed sample data when empty
  async function seedIfEmpty(){
    if(state.exercises.length) return;
    const squat = { id: uid(), name: 'Back Squat', muscle: 'Legs', sets: [ { weight:100, reps:5, note:'Warmup', t: Date.now()-86400000 }, { weight:120, reps:5, note:'Working', t: Date.now()-3600000 } ] };
    const bench = { id: uid(), name: 'Bench Press', muscle: 'Chest', sets: [ { weight:80, reps:5, note:'Working', t: Date.now()-7200000 } ] };
    state.exercises.push(squat, bench);
    state.selectedId = squat.id;
    await saveLocal();
  }

  // Auth state handling
  async function onAuthChanged(){
    const simple = getLocalUser();
    user = simple;
    if(user){
      userEmail.textContent = user;
      signOutBtn.classList.remove('d-none');
      loginLink.classList.add('d-none');
      await loadLocal();
      // if empty, seed
      if(!state.exercises || !state.exercises.length) await seedIfEmpty();
      renderList(); renderDetail();
    } else {
      userEmail.textContent = '';
      signOutBtn.classList.add('d-none');
      loginLink.classList.remove('d-none');
      await loadLocal();
      if(!state.exercises || !state.exercises.length) await seedIfEmpty();
      renderList(); renderDetail();
    }
  }

  // Init: migrate then run auth flow
  (async function init(){
    try{
      const username = getLocalUser() || 'default';
      if(window.GymDB && GymDB.migrateFromLocal){
        await GymDB.migrateFromLocal(username, userLocalKey());
      }
    }catch(e){ /* ignore */ }
    await onAuthChanged();
  })();

  // sign out button for local auth
  signOutBtn && signOutBtn.addEventListener('click', ()=>{
    signOutLocal();
    location.href = 'index.html';
  });

})();
