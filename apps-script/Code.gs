// You are the dungeon: wyniki testów trafiają jako pliki JSON do folderu na Twoim Dysku Google.
// Jeden plik na każdą falę (waves_...) i jeden na cały run (runs_..., nadpisywany po każdej fali).
const FOLDER_NAME = 'YATD wyniki testów';
const TOKEN = 'MbXRWYl39HSknxQLoxzSAqdJ';   // ten sam znacznik siedzi w grze; inne zapisy są odrzucane

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const p = JSON.parse(e.postData.contents);
    if (p.t !== TOKEN) return out('bad token');
    const c = String(p.c || '').replace(/[^a-z]/g, '').slice(0, 10);
    const id = String(p.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
    if (!c || !id) return out('bad id');
    const body = JSON.stringify(p.d);
    if (body.length > 600000) return out('too big');
    save(c + '_' + id + '.json', body);
    return out('ok');
  } catch (err) {
    return out('error: ' + err);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Otwarcie adresu w przeglądarce z ?ping=<TOKEN> zapisuje plik testowy: tak sprawdzimy, czy wszystko działa.
function doGet(e) {
  if (e && e.parameter && e.parameter.ping === TOKEN) {
    save('ping.json', JSON.stringify({ ok: true, at: new Date().toISOString() }));
    return out('YATD: zapis działa, plik ping.json jest w folderze "' + FOLDER_NAME + '".');
  }
  return out('YATD: skrypt działa.');
}

function save(name, body) {
  const folder = getFolder();
  const files = folder.getFilesByName(name);
  if (files.hasNext()) files.next().setContent(body);
  else folder.createFile(name, body, 'application/json');
}

function getFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function out(s) { return ContentService.createTextOutput(s); }
