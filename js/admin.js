// Admin UI: manage users (list, create, delete)
(function(){
  const usersContainer = document.getElementById('usersContainer');
  const addForm = document.getElementById('addUserForm');

  function getUsersLocal(){ try{ return JSON.parse(localStorage.getItem('simple-users')||'[]'); }catch(e){ return []; } }
  function saveUsersLocal(list){ localStorage.setItem('simple-users', JSON.stringify(list)); }

  async function api(action, payload){
    try{
      const res = await fetch(`/api/auth?action=${action}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload||{}) });
      const json = await res.json();
      return { ok: res.ok, status: res.status, body: json };
    }catch(e){ return { ok:false, error: e.message }; }
  }

  async function loadAndRender(){
    // try remote list
    const remote = await api('list');
    let list = [];
    if(remote.ok){ list = remote.body; }
    else { list = getUsersLocal().map((u,i)=>({ id: i+1, username: u.username })); }

    render(list);
  }

  function render(list){
    if(!list || !list.length){ usersContainer.innerHTML = '<div class="text-muted">No users</div>'; return; }
    const table = document.createElement('table');
    table.className = 'table table-sm';
    table.innerHTML = `<thead><tr><th>ID</th><th>Username</th><th></th></tr></thead>`;
    const tbody = document.createElement('tbody');
    list.forEach(u=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.id}</td><td>${u.username}</td><td><button class="btn btn-sm btn-outline-danger btn-delete" data-id="${u.id}">Delete</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    usersContainer.innerHTML = '';
    usersContainer.appendChild(table);

    usersContainer.querySelectorAll('.btn-delete').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.dataset.id;
        if(!confirm('Xóa người dùng này?')) return;
        const remote = await api('delete', { id: Number(id) });
        if(remote.ok){ loadAndRender(); return; }
        // fallback: local
        let users = getUsersLocal();
        users = users.filter((_,i)=> (i+1) !== Number(id));
        saveUsersLocal(users);
        loadAndRender();
      });
    });
  }

  addForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    if(!username || !password) return alert('Provide username and password');

    const remote = await api('create', { username, password });
    if(remote.ok){ loadAndRender(); addForm.reset(); return; }

    // fallback local
    const users = getUsersLocal();
    if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())) return alert('Username exists');
    users.push({ username, password });
    saveUsersLocal(users);
    loadAndRender();
    addForm.reset();
  });

  // initial
  loadAndRender();

})();
