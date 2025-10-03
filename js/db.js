// Minimal IndexedDB helper for the Gym Tracker
// Stores per-user state objects in an object store 'states' with key = username (or 'default')
(function(window){
  const DB_NAME = 'gym-tracker-db';
  const DB_VERSION = 1;
  const STORE = 'states';

  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function getState(username){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const r = store.get(username || 'default');
      r.onsuccess = ()=> resolve(r.result || null);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function saveState(username, state){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const r = store.put(state, username || 'default');
      r.onsuccess = ()=> resolve(true);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function migrateFromLocal(username, localKey){
    // If indexedDB already has data, do nothing. Otherwise, try to load from localStorage key and save.
    const existing = await getState(username);
    if(existing) return false;
    const raw = localStorage.getItem(localKey);
    if(!raw) return false;
    try{ const s = JSON.parse(raw); await saveState(username, s); return true; } catch(e){ return false; }
  }

  window.GymDB = { openDB, getState, saveState, migrateFromLocal };
})(window);
