/* Job applications local folder archive.
   Uses the File System Access API to save downloaded CVs + parsed application
   details as real files into a folder the admin picks once
   (e.g. C:\HetanshTechnologie\edu\Hetansh Technologie \db). The folder handle is remembered in
   IndexedDB so it persists across page loads.
   Requires Chrome or Edge (secure context: localhost or https). */

var JOB_DIR_DB = 'siteng_job_dir';
var JOB_DIR_STORE = 'files';
var JOB_DIR_KEY = 'dir';

var jobDirHandle = null;   // granted (read/write) handle
var jobSavedHandle = null; // handle restored from IndexedDB (may need permission)
var jobStoreReady = null;
var jobArchiveCache = null;

function jobIDBOpen() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(JOB_DIR_DB, 1);
    req.onupgradeneeded = function (e) {
      if (!e.target.result.objectStoreNames.contains(JOB_DIR_STORE)) {
        e.target.result.createObjectStore(JOB_DIR_STORE);
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function jobIDBGet(db, key) {
  return new Promise(function (resolve, reject) {
    var req = db.transaction(JOB_DIR_STORE, 'readonly').objectStore(JOB_DIR_STORE).get(key);
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function jobIDBPut(db, key, val) {
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(JOB_DIR_STORE, 'readwrite');
    tx.objectStore(JOB_DIR_STORE).put(val, key);
    tx.oncomplete = function () { resolve(); };
    tx.onerror = function () { reject(tx.error); };
  });
}

function jobIsFSA() {
  return typeof window.showDirectoryPicker === 'function';
}

function jobSanitize(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
}

function base64ToBytes(b64) {
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function jobMsgField(msg, field) {
  var re = new RegExp(field + ':\\s*(.+?)(?:\\n|$)');
  var x = msg.match(re);
  return x ? x[1].trim() : '';
}

function jobPositionFromService(service) {
  if (!service) return '-';
  return service.replace('Career Application - ', '').replace(' - Shortlisted', '').replace(' - Rejected', '');
}

function jobStatusFromService(service) {
  if (!service) return 'Pending';
  if (service.indexOf('Shortlisted') !== -1) return 'Shortlisted';
  if (service.indexOf('Rejected') !== -1) return 'Rejected';
  return 'Pending';
}

function jobParseDetail(row) {
  var msg = row.message || '';
  var fields = {};
  ['Name', 'Email', 'Phone', 'LinkedIn', 'Experience', 'Current CTC', 'Expected CTC', 'Location'].forEach(function (f) {
    fields[f] = jobMsgField(msg, f);
  });

  var cover = msg.replace(/--- CV Data ---[\s\S]*/, '').replace(/--- CV ---[\s\S]*/, '');
  var idx = cover.indexOf('--- Cover Letter ---');
  cover = idx !== -1 ? cover.substring(idx + '--- Cover Letter ---'.length).trim() : cover.trim();

  var cvFile = '', cvMime = 'application/pdf', cvBase64 = '';
  var cvInfo = msg.match(/--- CV ---\n(.+?)(?:\n|$)/);
  if (cvInfo) cvFile = cvInfo[1].trim();
  var cvData = msg.match(/--- CV Data ---\n(data:([^,]+);base64,([\s\S]+))/);
  if (cvData) { cvMime = cvData[2].trim(); cvBase64 = cvData[3].trim(); }

  return { fields: fields, coverLetter: cover, cvFile: cvFile, cvMime: cvMime, cvBase64: cvBase64, hasCv: !!cvBase64 };
}

async function jobPersistHandle() {
  var idb = await jobIDBOpen();
  await jobIDBPut(idb, JOB_DIR_KEY, jobDirHandle);
}

// Load the saved folder handle from IndexedDB (no permission prompt on load).
function initJobStore() {
  // A handle picked this session always wins over the cached (possibly null) load.
  if (jobDirHandle) return Promise.resolve(jobDirHandle);
  if (jobStoreReady) return jobStoreReady;
  jobStoreReady = (async function () {
    if (!jobIsFSA()) throw new Error('This browser does not support the File System Access API. Use Chrome or Edge.');
    jobSavedHandle = null;
    var idb = await jobIDBOpen();
    var saved = await jobIDBGet(idb, JOB_DIR_KEY);
    if (saved) {
      var p = await saved.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') { jobDirHandle = saved; return jobDirHandle; }
      jobSavedHandle = saved;
    }
    return null;
  })();
  return jobStoreReady;
}

// Ask for a folder via the native picker (must be called from a user gesture).
async function connectJobFolder() {
  var handle = await window.showDirectoryPicker({ id: 'job-dir', mode: 'readwrite' });
  jobDirHandle = handle;
  jobSavedHandle = handle;
  jobStoreReady = null;
  jobArchiveCache = null;
  await jobPersistHandle();
  return handle;
}

// Ensure we have a writable folder handle; prompts only if needed.
async function ensureJobFolder() {
  if (jobDirHandle) {
    var p = await jobDirHandle.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted') p = await jobDirHandle.requestPermission({ mode: 'readwrite' });
    if (p === 'granted') return jobDirHandle;
  }
  if (jobSavedHandle) {
    var p2 = await jobSavedHandle.requestPermission({ mode: 'readwrite' });
    if (p2 === 'granted') { jobDirHandle = jobSavedHandle; return jobDirHandle; }
  }
  return connectJobFolder();
}

function isFolderConnected() {
  return !!jobDirHandle;
}

async function saveApplicationLocal(contactId) {
  var dir = await ensureJobFolder();
  var { data: row, error } = await _admin.from('contact').select('*').eq('id', contactId).single();
  if (error) throw error;

  var detail = jobParseDetail(row);
  if (!detail.hasCv) throw new Error('This application has no CV file to archive.');

  var base = 'contact_' + row.id;
  var cvFileName = base + '__' + (jobSanitize(detail.cvFile) || 'CV_' + jobSanitize(row.name || 'applicant') + '.pdf');
  var fh = await dir.getFileHandle(cvFileName, { create: true });
  var w = await fh.createWritable();
  await w.write(base64ToBytes(detail.cvBase64));
  await w.close();

  var record = {
    contactId: row.id,
    cvFile: cvFileName,
    cvMime: detail.cvMime,
    savedAt: new Date().toISOString()
  };

  var jf = await dir.getFileHandle(base + '.json', { create: true });
  var jw = await jf.createWritable();
  await jw.write(JSON.stringify(record, null, 2));
  await jw.close();

  jobArchiveCache = null;
  return cvFileName;
}

async function listLocalArchive() {
  if (jobArchiveCache) return jobArchiveCache;
  var dir = await initJobStore();
  if (!dir) return [];
  var records = [];
  for await (var entry of dir.values()) {
    if (entry.kind === 'file' && /^contact_\d+\.json$/.test(entry.name)) {
      try {
        var file = await entry.getFile();
        var text = await file.text();
        if (text.trim()) records.push(JSON.parse(text));
      } catch (_) {}
    }
  }
  records.sort(function (a, b) { return String(b.savedAt || '').localeCompare(String(a.savedAt || '')); });
  jobArchiveCache = records;
  return records;
}

async function getLocalRecord(contactId) {
  var records = await listLocalArchive();
  for (var i = 0; i < records.length; i++) {
    if (Number(records[i].contactId) === Number(contactId)) return records[i];
  }
  return null;
}

async function downloadLocalCv(record) {
  var dir = await ensureJobFolder();
  if (!record.cvFile) throw new Error('No CV stored for this record.');
  var fh;
  try { fh = await dir.getFileHandle(record.cvFile); }
  catch (e) { throw new Error('CV file not found: ' + record.cvFile); }
  var file = await fh.getFile();
  var url = URL.createObjectURL(file);
  var a = document.createElement('a');
  a.href = url;
  a.download = String(record.cvFile).replace(/^contact_\d+__/, '');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function jobWriteRecord(dir, record) {
  var jf = await dir.getFileHandle('contact_' + record.contactId + '.json', { create: true });
  var jw = await jf.createWritable();
  await jw.write(JSON.stringify(record, null, 2));
  await jw.close();
  jobArchiveCache = null;
}

async function updateLocalStatus(contactId, status) {
  var rec = await getLocalRecord(contactId);
  if (!rec) throw new Error('Record not found in local folder.');
  rec.status = status;
  var dir = await ensureJobFolder();
  await jobWriteRecord(dir, rec);
  return rec;
}

async function updateLocalInterview(contactId, interviewAt) {
  var rec = await getLocalRecord(contactId);
  if (!rec) throw new Error('Record not found in local folder.');
  rec.interviewAt = interviewAt;
  var dir = await ensureJobFolder();
  await jobWriteRecord(dir, rec);
  return rec;
}

async function deleteLocalRecord(contactId) {
  var dir = await ensureJobFolder();
  var rec = await getLocalRecord(contactId);
  try { await dir.removeEntry('contact_' + contactId + '.json'); } catch (_) {}
  if (rec && rec.cvFile) { try { await dir.removeEntry(rec.cvFile); } catch (_) {} }
  jobArchiveCache = null;
}

async function clearLocalArchive() {
  var dir = await ensureJobFolder();
  var names = [];
  for await (var entry of dir.values()) {
    if (entry.kind === 'file' && /^contact_/.test(entry.name)) names.push(entry.name);
  }
  for (var i = 0; i < names.length; i++) {
    try { await dir.removeEntry(names[i]); } catch (_) {}
  }
  jobArchiveCache = null;
}
