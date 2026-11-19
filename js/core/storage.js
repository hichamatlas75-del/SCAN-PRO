// =========================================================
// Stockage — remplace le dossier Documents/ScanPro (IndexedDB)
// Enregistrement : { id, name, blob, size, mime, modified, thumb }
// =========================================================
const DB_NAME = 'scanpro';
const STORE = 'documents';
let dbPromise;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      s.createIndex('name', 'name', { unique: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tr = d.transaction(STORE, mode);
    const store = tr.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    tr.oncomplete = () => resolve(result);
    tr.onerror = () => reject(tr.error);
    tr.onabort = () => reject(tr.error);
  });
}

const req2p = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const DocumentStore = {
  async list() {
    return tx('readonly', (s) => req2p(s.getAll()));
  },

  async exists(name) {
    return tx('readonly', (s) => req2p(s.index('name').count(name))).then((n) => n > 0);
  },

  /** Enregistre un fichier ; si le nom existe déjà, ajoute un suffixe (1), (2)… */
  async save(name, blob, thumb = null) {
    const finalName = await this.uniqueName(name);
    const rec = { name: finalName, blob, size: blob.size, mime: blob.type, modified: Date.now(), thumb };
    rec.id = await tx('readwrite', (s) => req2p(s.add(rec)));
    return rec;
  },

  async uniqueName(name) {
    if (!(await this.exists(name))) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 1; ; i++) { const n = `${base} (${i})${ext}`; if (!(await this.exists(n))) return n; }
  },

  /** Renomme ; retourne false si un fichier porte déjà ce nom. */
  async rename(id, newName) {
    if (await this.exists(newName)) return false;
    return tx('readwrite', async (s) => {
      const rec = await req2p(s.get(id));
      rec.name = newName;
      await req2p(s.put(rec));
      return true;
    });
  },

  async remove(id) { return tx('readwrite', (s) => req2p(s.delete(id))).then(() => true); },
};
