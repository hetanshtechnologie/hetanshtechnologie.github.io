/* ============================================================
   EduERP - Smart / Stimulus Attendance Module
   Lecture capture (camera AI / WiFi / Bluetooth / manual),
   face enrollment, weekly ratings + leaderboard, attendance vs
   exam correlation, and prize draws for high attendance.
   ============================================================ */

const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const FACE_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_MATCH_THRESHOLD = 0.55;

let smartState = {
  session: null,
  photos: [],
  enrolled: [],
  wifiList: [],
  btList: [],
  stream: null,
};

function smartForbidden() {
  el('content-area').innerHTML = '<div class="empty-state"><p>Access restricted for your role.</p></div>';
}

function smartToday() { return new Date().toISOString().split('T')[0]; }

function smartWeekStart(d) {
  const dt = new Date(d || new Date());
  dt.setHours(0, 0, 0, 0);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  return dt.toISOString().split('T')[0];
}

function smartAddDays(iso, n) {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

function smartEscape(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function smartBadge(status) {
  const map = { completed: 'success', draft: 'warning', processing: 'info', failed: 'danger', scheduled: 'info', drawn: 'success', cancelled: 'danger', published: 'success' };
  return `<span class="badge badge-${map[status] || 'info'}">${status}</span>`;
}

function smartStopCamera() {
  if (smartState.stream) {
    smartState.stream.getTracks().forEach(t => t.stop());
    smartState.stream = null;
  }
}

/* ============================================================
   SCHOOL ADMIN / TEACHER: SMART ATTENDANCE HUB
   ============================================================ */

async function renderSmartAttendance() {
  if (!['school_admin', 'teacher'].includes(erpProfile.role)) return smartForbidden();
  smartStopCamera();
  const [classesRes, sessionsRes, facesRes] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', erpOrg.id).order('name'),
    erp.from('attendance_sessions').select('*, classes(name), subjects(name)').eq('org_id', erpOrg.id).order('date', { ascending: false }).limit(25),
    erp.from('student_faces').select('id, student_id').eq('org_id', erpOrg.id),
  ]);
  const classes = classesRes.data || [];
  const sessions = sessionsRes.data || [];
  const enrolledCount = (facesRes.data || []).length;
  let html = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Capture Sessions</div><div class="value">${sessions.length}</div></div>
      <div class="stat-card"><div class="label">Face Enrollments</div><div class="value">${enrolledCount}</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value" style="color:var(--success)">${sessions.filter(s => s.status === 'completed').length}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Start New Capture Session</h3>
        <button class="btn btn-outline btn-sm" onclick="smartEnrollPage()">👤 Face Enrollment</button>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Class</label><select id="sa-class" onchange="smartLoadSubjects()">
            <option value="">Select Class</option>${classes.map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Subject</label><select id="sa-subject"><option value="">General / All</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Date</label><input type="date" id="sa-date" value="${smartToday()}"></div>
          <div class="form-group"><label>Start Time</label><input type="time" id="sa-start" value="09:00"></div>
          <div class="form-group"><label>End Time</label><input type="time" id="sa-end" value="09:55"></div>
        </div>
        <div class="form-group"><label>Capture Method</label>
          <select id="sa-method">
            <option value="camera">📷 Camera AI (face recognition)</option>
            <option value="wifi">📡 WiFi device scan (MAC list)</option>
            <option value="bluetooth">📶 Bluetooth device scan (MAC list)</option>
            <option value="manual">📝 Manual roster</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="smartStartCapture()">Start Capture</button>
      </div>
    </div>
    <div id="sa-capture"></div>
    <div class="card mt-2">
      <div class="card-header"><h3>Recent Sessions</h3></div>
      <div class="card-body">${renderTable(
        ['Date', 'Class', 'Subject', 'Method', 'Status'],
        sessions.map(s => ({
          _id: s.id,
          'Date': new Date(s.date).toLocaleDateString(),
          'Class': s.classes?.name || '-',
          'Subject': s.subjects?.name || '-',
          'Method': s.capture_method,
          'Status': smartBadge(s.status),
        })),
        row => `<button class="btn btn-sm btn-outline" onclick="smartViewSession(${row._id})">View</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('attendance_sessions',${row._id},'Session')">Delete</button>`
      )}</div>
    </div>`;
  el('content-area').innerHTML = html;
}

async function smartLoadSubjects() {
  const classId = el('sa-class').value;
  const sel = el('sa-subject');
  sel.innerHTML = '<option value="">General / All</option>';
  if (!classId) return;
  const { data } = await erp.from('subjects').select('*').eq('org_id', erpOrg.id).eq('class_id', classId);
  (data || []).forEach(s => { sel.innerHTML += `<option value="${s.id}">${s.name} ${s.code || ''}</option>`; });
}

async function smartStartCapture() {
  const classId = el('sa-class').value;
  const date = el('sa-date').value;
  const start = el('sa-start').value;
  const end = el('sa-end').value;
  const method = el('sa-method').value;
  if (!classId || !date) { showToast('Select a class and date', 'warning'); return; }
  const session = {
    org_id: erpOrg.id,
    class_id: parseInt(classId),
    subject_id: el('sa-subject').value ? parseInt(el('sa-subject').value) : null,
    date,
    start_time: start || null,
    end_time: end || null,
    capture_method: method,
    status: 'draft',
    photo_urls: [],
    wifi_macs: [],
    bluetooth_macs: [],
  };
  const { data, error } = await erp.from('attendance_sessions').insert(session).select().single();
  if (error) { showToast('Failed to create session: ' + error.message, 'error'); return; }
  smartState.session = data;
  const { data: cls } = await erp.from('classes').select('name, section').eq('id', classId).single();
  smartState.session._classLabel = cls.data ? `${cls.data.name} ${cls.data.section || ''}`.trim() : classId;
  if (method === 'camera') smartSetupCamera();
  else if (method === 'wifi') smartSetupDevice('wifi');
  else if (method === 'bluetooth') smartSetupDevice('bluetooth');
  else smartSetupManual();
}

async function smartLoadEnrolled(classId) {
  let q = erp.from('student_faces').select('*, students(id, first_name, last_name, roll_number, phone_mac)').eq('org_id', erpOrg.id);
  if (classId) q = q.eq('students.class_id', classId);
  const { data } = await q;
  smartState.enrolled = (data || []).map(f => ({
    studentId: f.students.id,
    name: `${f.students.first_name} ${f.students.last_name}`,
    roll: f.students.roll_number || '',
    phoneMac: f.students.phone_mac || '',
    descriptor: new Float32Array(f.descriptor || []),
  }));
  return smartState.enrolled;
}

async function smartLoadModels() {
  if (!window.faceapi) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = FACE_API_CDN;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load face-api.js from CDN.'));
      document.head.appendChild(s);
    });
  }
  await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL);
}

function smartSetupCamera() {
  const s = smartState.session;
  el('sa-capture').innerHTML = `
    <div class="card mt-2">
      <div class="card-header"><h3>📷 Camera Capture — ${s._classLabel}</h3></div>
      <div class="card-body">
        <div class="flex gap-2" style="flex-wrap:wrap">
          <video id="sa-video" width="360" height="240" autoplay playsinline muted style="background:#000;border-radius:8px"></video>
          <div>
            <div class="flex gap-2 mb-2" style="flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="smartStartCamera()">Start Camera</button>
              <button class="btn btn-success btn-sm" onclick="smartCapturePhoto()">Capture Photo (<span id="sa-count">0</span>/10)</button>
              <button class="btn btn-outline btn-sm" onclick="smartStopCamera()">Stop Camera</button>
            </div>
            <div id="sa-thumbs" class="flex gap-1" style="flex-wrap:wrap;gap:6px"></div>
            <div class="mt-2"><button class="btn btn-warning" onclick="smartProcessCamera()">Finish &amp; Process Photos</button></div>
          </div>
        </div>
        <p class="mt-2" style="font-size:.8rem;color:var(--gray-500)">Tip: capture 5-10 photos covering all students. Faces are matched against enrolled students with 128-d descriptors.</p>
      </div>
    </div>`;
}

async function smartStartCamera() {
  try {
    smartState.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    el('sa-video').srcObject = smartState.stream;
  } catch (e) {
    showToast('Camera not available: ' + e.message, 'error');
  }
}

function smartCapturePhoto() {
  if (!smartState.stream) { showToast('Start the camera first', 'warning'); return; }
  if (smartState.photos.length >= 10) { showToast('Max 10 photos', 'warning'); return; }
  const video = el('sa-video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  smartState.photos.push(canvas.toDataURL('image/jpeg', 0.9));
  el('sa-count').textContent = smartState.photos.length;
  el('sa-thumbs').innerHTML = smartState.photos.map(p => `<img src="${p}" style="width:72px;height:54px;object-fit:cover;border-radius:6px;border:2px solid var(--gray-200)">`).join('');
  showToast(`Photo ${smartState.photos.length}/10 captured`, 'success');
}

async function smartProcessCamera() {
  if (!smartState.photos.length) { showToast('Capture at least one photo first', 'warning'); return; }
  const s = smartState.session;
  const processingEl = document.getElementById('sa-capture');
  processingEl.innerHTML = '<div class="loading">Processing photos with face recognition...</div>';
  try {
    await smartLoadModels();
    const enrolled = smartState.enrolled.length ? smartState.enrolled : await smartLoadEnrolled(s.class_id);
    if (!enrolled.length) {
      showToast('No face enrollments for this class. Enroll students first (using manual roster as fallback).', 'warning');
      return smartSetupManual();
    }
    const countMap = {};
    const confMap = {};
    for (const dataURL of smartState.photos) {
      const img = await faceapi.fetchImage(dataURL);
      const dets = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks().withFaceDescriptors();
      for (const d of dets) {
        const match = smartMatchDescriptor(d.descriptor, enrolled);
        if (match) {
          countMap[match.studentId] = (countMap[match.studentId] || 0) + 1;
          confMap[match.studentId] = Math.min(confMap[match.studentId] ?? 1, match.distance);
        }
      }
    }
    const detectedIds = Object.keys(countMap).map(Number);
    await smartSaveSession(detectedIds, enrolled.map(e => e.studentId), 'camera', {
      counts: countMap,
      confidences: confMap,
    });
  } catch (e) {
    showToast('Face processing failed: ' + e.message, 'error');
    processingEl.innerHTML = '';
    smartSetupCamera();
  }
}

function smartMatchDescriptor(desc, enrolled) {
  let best = null;
  for (const e of enrolled) {
    let sum = 0;
    const d = e.descriptor;
    for (let i = 0; i < 128; i++) { const x = desc[i] - d[i]; sum += x * x; }
    const dist = Math.sqrt(sum);
    if (!best || dist < best.distance) best = { studentId: e.studentId, distance: dist };
  }
  return best && best.distance < FACE_MATCH_THRESHOLD ? best : null;
}

function smartSetupDevice(kind) {
  const s = smartState.session;
  const label = kind === 'wifi' ? '📡 WiFi Device Scan' : '📶 Bluetooth Device Scan';
  const placeholder = kind === 'wifi'
    ? 'Paste WiFi client MAC addresses, one per line (from router DHCP / scan)\nA4:B2:C3:D4:E5:F6'
    : 'Paste Bluetooth device MAC addresses, one per line\nA4:B2:C3:D4:E5:F6';
  el('sa-capture').innerHTML = `
    <div class="card mt-2">
      <div class="card-header"><h3>${label} — ${s._classLabel}</h3></div>
      <div class="card-body">
        <div class="form-group"><label>Detected device MACs (one per line)</label>
          <textarea id="sa-macs" rows="6" placeholder="${placeholder}"></textarea>
        </div>
        <p style="font-size:.8rem;color:var(--gray-500)">MACs are matched against the "Phone MAC" saved on each student's profile. Students whose device is detected are marked present.</p>
        <button class="btn btn-warning" onclick="smartProcessDevice('${kind}')">Match &amp; Save Attendance</button>
      </div>
    </div>`;
}

async function smartProcessDevice(kind) {
  const s = smartState.session;
  const raw = el('sa-macs').value.split(/\r?\n/).map(x => x.trim().toUpperCase()).filter(Boolean);
  if (!raw.length) { showToast('Paste at least one MAC address', 'warning'); return; }
  if (kind === 'wifi') smartState.wifiList = raw;
  else smartState.btList = raw;
  const { data: students } = await erp.from('students').select('id, first_name, last_name, phone_mac').eq('org_id', erpOrg.id).eq('class_id', s.class_id).eq('status', 'active');
  const detected = (students || []).filter(st => st.phone_mac && raw.includes(st.phone_mac.toUpperCase()));
  if (!detected.length) { showToast('No students matched these MACs. Check student Phone MAC entries.', 'warning'); return; }
  const detectedIds = detected.map(st => st.id);
  const rosterIds = (students || []).map(st => st.id);
  await smartSaveSession(detectedIds, rosterIds, kind, {});
}

function smartSetupManual() {
  const s = smartState.session;
  el('sa-capture').innerHTML = `
    <div class="card mt-2">
      <div class="card-header"><h3>📝 Manual Roster — ${s._classLabel}</h3></div>
      <div class="card-body" id="sa-manual-roster"><div class="loading">Loading students...</div></div>
    </div>`;
  smartRenderManualRoster();
}

async function smartRenderManualRoster() {
  const s = smartState.session;
  const { data: students } = await erp.from('students').select('*').eq('org_id', erpOrg.id).eq('class_id', s.class_id).eq('status', 'active');
  const c = el('sa-manual-roster');
  if (!students || !students.length) { c.innerHTML = '<p class="empty-state">No active students in this class.</p>'; return; }
  smartState.manualRoster = students;
  let html = '<table><thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead><tbody>';
  students.forEach(st => {
    html += `<tr><td>${smartEscape(st.roll_number || '-')}</td><td>${smartEscape(st.first_name + ' ' + st.last_name)}</td>
      <td><select class="sa-manual-status" data-sid="${st.id}">
        <option value="present">Present</option><option value="absent">Absent</option>
      </select></td></tr>`;
  });
  html += '</tbody></table>';
  html += '<div class="mt-2"><button class="btn btn-success" onclick="smartProcessManual()">Save Manual Attendance</button></div>';
  c.innerHTML = html;
}

async function smartProcessManual() {
  const s = smartState.session;
  const present = [];
  document.querySelectorAll('.sa-manual-status').forEach(sel => { if (sel.value === 'present') present.push(parseInt(sel.dataset.sid)); });
  const rosterIds = smartState.manualRoster.map(st => st.id);
  await smartSaveSession(present, rosterIds, 'manual', {});
}

async function smartSaveSession(detectedIds, rosterIds, source, meta) {
  const s = smartState.session;
  const detectedSet = new Set(detectedIds);
  const presentRows = [];
  const absentRows = [];
  for (const sid of rosterIds) {
    if (detectedSet.has(sid)) {
      presentRows.push({
        session_id: s.id,
        student_id: sid,
        status: 'present',
        source,
        confidence: meta.confidences?.[sid] ?? null,
        detected_in: meta.counts?.[sid] ?? null,
      });
    } else {
      absentRows.push({ session_id: s.id, student_id: sid, status: 'absent', source });
    }
  }
  const photoUrls = smartState.photos.length ? await smartUploadPhotos(s) : [];
  const update = {
    status: 'completed',
    photo_urls: photoUrls,
    wifi_macs: source === 'wifi' ? smartState.wifiList : s.wifi_macs,
    bluetooth_macs: source === 'bluetooth' ? smartState.btList : s.bluetooth_macs,
  };
  if (source === 'wifi') update.wifi_macs = smartState.wifiList;
  if (source === 'bluetooth') update.bluetooth_macs = smartState.btList;
  const rows = [...presentRows, ...absentRows];
  if (rows.length) await erp.from('session_attendance').upsert(rows, { onConflict: 'session_id,student_id' });
  await erp.from('attendance_sessions').update(update).eq('id', s.id);
  showToast(`Attendance saved: ${presentRows.length} present, ${absentRows.length} absent (${source})`, 'success');
  smartState.photos = [];
  smartState.session = null;
  renderSmartAttendance();
}

async function smartUploadPhotos(s) {
  const urls = [];
  const { data: user } = await erp.auth.getUser();
  for (let i = 0; i < smartState.photos.length; i++) {
    const dataURL = smartState.photos[i];
    const blob = await (await fetch(dataURL)).blob();
    const path = `${erpOrg.id}/${s.id}/${Date.now()}-${i}.jpg`;
    const { error } = await erp.storage.from('attendance-photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (!error) urls.push(`${erp.storage.from('attendance-photos').getPublicUrl(path).data.publicUrl}`);
  }
  return urls;
}

async function smartViewSession(id) {
  smartState._lastViewId = id;
  const [sessionRes, recordsRes, facesRes] = await Promise.all([
    erp.from('attendance_sessions').select('*, classes(name, section), subjects(name)').eq('id', id).single(),
    erp.from('session_attendance').select('*, students(first_name, last_name, roll_number)').eq('session_id', id),
    erp.from('student_faces').select('*').eq('org_id', erpOrg.id),
  ]);
  const s = sessionRes.data;
  const records = recordsRes.data || [];
  const present = records.filter(r => r.status === 'present');
  const absent = records.filter(r => r.status === 'absent');
  const photos = s.photo_urls || [];
  let html = `<div class="card"><div class="card-header"><h3>${s.classes?.name || ''} ${s.classes?.section || ''} — ${s.subjects?.name || 'General'}</h3>
    <button class="btn btn-sm btn-outline" onclick="renderSmartAttendance()">Back</button></div>
    <div class="card-body">
      <div class="flex gap-4" style="flex-wrap:wrap;color:var(--gray-600);font-size:.85rem">
        <span>Date: <strong>${new Date(s.date).toLocaleDateString()}</strong></span>
        <span>Time: <strong>${s.start_time || '-'} - ${s.end_time || '-'}</strong></span>
        <span>Method: <strong>${s.capture_method}</strong></span>
        <span>Status: ${smartBadge(s.status)}</span>
        <span>Present: <strong style="color:var(--success)">${present.length}</strong></span>
        <span>Absent: <strong style="color:var(--danger)">${absent.length}</strong></span>
      </div>
    </div></div>`;
  if (photos.length) {
    html += `<div class="card mt-2"><div class="card-header"><h3>Captured Photos (${photos.length})</h3></div>
      <div class="card-body flex gap-2" style="flex-wrap:wrap">${photos.map(p => `<img src="${p}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--gray-200)" onclick="window.open('${p}','_blank')">`).join('')}</div></div>`;
  }
  html += `<div class="card mt-2"><div class="card-header"><h3>Attendance (${records.length})</h3></div>
    <div class="card-body">${renderTable(
      ['Roll', 'Student', 'Status', 'Source', 'Confidence', 'Detected In'],
      records.map(r => ({
        _id: r.id,
        'Roll': r.students?.roll_number || '-',
        'Student': r.students ? `${r.students.first_name} ${r.students.last_name}` : '-',
        'Status': r.status === 'present' ? '<span class="badge badge-success">present</span>' : '<span class="badge badge-danger">absent</span>',
        'Source': r.source,
        'Confidence': r.confidence != null ? (r.confidence * 100).toFixed(1) + '%' : '-',
        'Detected In': r.detected_in != null ? `${r.detected_in}/${photos.length || 1}` : '-',
      })),
      row => `<button class="btn btn-sm btn-outline" onclick="smartToggleRecord(${row._id})">Toggle</button>`
    )}</div></div>`;
  el('content-area').innerHTML = html;
}

async function smartToggleRecord(id) {
  const { data } = await erp.from('session_attendance').select('status').eq('id', id).single();
  const next = data?.status === 'present' ? 'absent' : 'present';
  await erp.from('session_attendance').update({ status: next }).eq('id', id);
  showToast(`Marked ${next}`, 'success');
  smartViewSession(smartState._lastViewId || undefined);
}

/* ============================================================
   FACE ENROLLMENT
   ============================================================ */

async function smartEnrollPage() {
  const [students, faces] = await Promise.all([
    erp.from('students').select('id, first_name, last_name, class_id, roll_number, classes(name, section)').eq('org_id', erpOrg.id).eq('status', 'active').order('first_name'),
    erp.from('student_faces').select('id, student_id').eq('org_id', erpOrg.id),
  ]);
  const faceMap = {};
  (faces.data || []).forEach(f => { faceMap[f.student_id] = true; });
  el('content-area').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Face Enrollment</h3><button class="btn btn-outline btn-sm" onclick="renderSmartAttendance()">Back</button></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Student</label><select id="en-student">
            <option value="">Select Student</option>
            ${(students.data || []).map(st => `<option value="${st.id}">${st.first_name} ${st.last_name} (${st.classes?.name || ''}${st.classes?.section ? ' ' + st.classes.section : ''})${faceMap[st.id] ? ' ✓' : ''}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Reference Photo</label><input type="file" id="en-file" accept="image/*" capture="user"></div>
        </div>
        <div class="form-group"><label>Phone MAC (for WiFi/Bluetooth matching)</label><input id="en-mac" placeholder="A4:B2:C3:D4:E5:F6"></div>
        <div id="en-preview" class="mb-2"></div>
        <button class="btn btn-primary" onclick="smartEnrollStudent()">Save Enrollment</button>
      </div>
    </div>
    <div class="card mt-2"><div class="card-header"><h3>Enrolled (${(faces.data || []).length})</h3></div>
      <div class="card-body">${renderTable(
        ['Student', 'Status'],
        (students.data || []).filter(st => faceMap[st.id]).map(st => ({ _id: st.id, 'Student': `${st.first_name} ${st.last_name}`, 'Status': '<span class="badge badge-success">enrolled</span>' })),
        row => `<button class="btn btn-sm btn-outline" onclick="smartRemoveFace(${row._id})">Remove</button>`
      )}</div>
    </div>`;
}

async function smartEnrollStudent() {
  const studentId = el('en-student').value;
  const file = el('en-file').files[0];
  if (!studentId) { showToast('Select a student', 'warning'); return; }
  if (!file) { showToast('Choose a reference photo', 'warning'); return; }
  try {
    await smartLoadModels();
    const img = await faceapi.browserImageToImage(file);
    const res = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks().withFaceDescriptor();
    if (!res) { showToast('No face detected in that photo. Try a clearer, front-facing shot.', 'error'); return; }
    const descriptor = Array.from(res.descriptor);
    const mac = (el('en-mac').value || '').trim().toUpperCase();
    if (mac) await erp.from('students').update({ phone_mac: mac }).eq('id', parseInt(studentId));
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 640;
    canvas.height = img.height || 480;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await (await fetch(canvas.toDataURL('image/jpeg'))).blob();
    const path = `${erpOrg.id}/faces/${studentId}.jpg`;
    const { error: upErr } = await erp.storage.from('attendance-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (upErr) showToast('Photo upload failed: ' + upErr.message, 'warning');
    const photoUrl = erp.storage.from('attendance-photos').getPublicUrl(path).data.publicUrl;
    await erp.from('student_faces').upsert(
      { org_id: erpOrg.id, student_id: parseInt(studentId), photo_url: photoUrl, descriptor },
      { onConflict: 'student_id' }
    );
    showToast('Face enrolled successfully!', 'success');
    smartEnrollPage();
  } catch (e) {
    showToast('Enrollment failed: ' + e.message, 'error');
  }
}

async function smartRemoveFace(studentId) {
  if (!confirm('Remove this student\'s face enrollment?')) return;
  await erp.from('student_faces').delete().eq('student_id', studentId);
  showToast('Face enrollment removed', 'success');
  smartEnrollPage();
}

/* ============================================================
   WEEKLY RATINGS, LEADERBOARD & CORRELATION
   ============================================================ */

async function renderAttendanceAnalytics() {
  const role = erpProfile.role;
  if (!['school_admin', 'teacher', 'student', 'parent'].includes(role)) return smartForbidden();
  const ws = smartWeekStart();
  const isStaff = ['school_admin', 'teacher'].includes(role);
  let html = `<div class="card">
    <div class="card-header"><h3>Weekly Attendance Ratings</h3></div>
    <div class="card-body">
      <div class="filter-bar">
        <input type="date" id="aa-week" value="${ws}" class="filter-input" onchange="smartRenderLeaderboard()">
        ${isStaff ? `<button class="btn btn-primary btn-sm" onclick="smartGenerateRatings()">Generate Ratings</button>
        <button class="btn btn-success btn-sm" onclick="smartPublishRatings()">Publish to Portal</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="smartRenderLeaderboard()">Refresh</button>
      </div>
      <div id="aa-leaderboard"><div class="loading">Loading...</div></div>
    </div></div>`;
  if (isStaff) {
    html += `<div class="card mt-2"><div class="card-header"><h3>Attendance vs Exam Correlation</h3></div>
      <div class="card-body" id="aa-correlation"><div class="loading">Loading...</div></div></div>`;
  } else {
    html += `<div class="card mt-2"><div class="card-header"><h3>My Performance</h3></div>
      <div class="card-body" id="aa-correlation"><div class="loading">Loading...</div></div></div>`;
  }
  el('content-area').innerHTML = html;
  await smartRenderLeaderboard();
  if (isStaff) smartRenderCorrelation();
  else smartRenderMyInsights();
}

async function smartGenerateRatings() {
  const ws = el('aa-week').value || smartWeekStart();
  const we = smartAddDays(ws, 6);
  const [studentsRes, sessionsRes] = await Promise.all([
    erp.from('students').select('id, class_id').eq('org_id', erpOrg.id).eq('status', 'active'),
    erp.from('attendance_sessions').select('id, class_id').eq('org_id', erpOrg.id).gte('date', ws).lte('date', we),
  ]);
  const students = studentsRes.data || [];
  const sessions = sessionsRes.data || [];
  const sessionClass = {};
  sessions.forEach(s => { sessionClass[s.id] = s.class_id; });
  const sessIds = sessions.map(s => s.id);
  const recordsRes = sessIds.length ? await erp.from('session_attendance').select('session_id, student_id, status').in('session_id', sessIds) : { data: [] };
  const perClass = {};
  students.forEach(st => { perClass[st.class_id] = perClass[st.class_id] || {}; perClass[st.class_id][st.id] = { attended: 0, total: 0 }; });
  (recordsRes.data || []).forEach(r => {
    const cid = sessionClass[r.session_id];
    const map = perClass[cid];
    if (map && map[r.student_id]) { map[r.student_id].total++; if (r.status === 'present') map[r.student_id].attended++; }
  });
  const rows = [];
  for (const [cid, map] of Object.entries(perClass)) {
    const list = Object.entries(map).map(([sid, v]) => ({
      student_id: parseInt(sid),
      attended: v.attended,
      total_units: v.total,
      rating: v.total ? Math.round((v.attended / v.total) * 1000) / 10 : 0,
    })).filter(r => r.total_units > 0);
    list.sort((a, b) => b.rating - a.rating || a.student_id - b.student_id);
    list.forEach((r, i) => rows.push({ org_id: erpOrg.id, class_id: parseInt(cid), week_start: ws, week_end: we, ...r, rank: i + 1, published: false }));
  }
  if (!rows.length) { showToast('No sessions in this week to rate', 'warning'); return; }
  await erp.from('attendance_ratings').upsert(rows, { onConflict: 'org_id,class_id,week_start,student_id' });
  showToast('Ratings generated for ' + rows.length + ' students', 'success');
  smartRenderLeaderboard();
}

async function smartPublishRatings() {
  const ws = el('aa-week').value || smartWeekStart();
  await erp.from('attendance_ratings').update({ published: true }).eq('org_id', erpOrg.id).eq('week_start', ws);
  showToast('Ratings published to the school portal!', 'success');
  smartRenderLeaderboard();
}

async function smartRenderLeaderboard() {
  const ws = el('aa-week')?.value || smartWeekStart();
  const c = el('aa-leaderboard');
  if (!c) return;
  const q = erp.from('attendance_ratings').select('*, classes(name, section), students(first_name, last_name, roll_number)')
    .eq('org_id', erpOrg.id).eq('week_start', ws).order('rating', { ascending: false }).order('rank');
  const { data } = await q;
  const rows = data || [];
  if (!rows.length) { c.innerHTML = '<p class="empty-state">No ratings for this week yet. Generate them to start.</p>'; return; }
  const top = Math.max(1, Math.max(...rows.map(r => r.total_units)));
  c.innerHTML = renderTable(
    ['Rank', 'Student', 'Class', 'Present', 'Attendance', 'Rating'],
    rows.map(r => ({
      _id: r.id,
      'Rank': r.rank <= 3 ? `<span class="badge badge-${r.rank === 1 ? 'success' : r.rank === 2 ? 'info' : 'warning'}">#${r.rank}</span>` : '#' + r.rank,
      'Student': r.students ? `${r.students.first_name} ${r.students.last_name}` : '-',
      'Class': r.classes ? `${r.classes.name} ${r.classes.section || ''}`.trim() : '-',
      'Present': `${r.attended}/${r.total_units}`,
      'Attendance': smartBar(r.attended / top),
      'Rating': `<strong>${r.rating}%</strong>`,
    }))
  ) + `<p style="font-size:.75rem;color:var(--gray-500);margin-top:6px">${rows[0] && rows[0].week_end ? `Week ${rows[0].week_start} to ${rows[0].week_end}` : ''}${rows[0] && rows[0].published ? ' · Published' : ''}</p>`;
}

function smartBar(frac) {
  const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
  return `<div style="background:var(--gray-100);border-radius:6px;height:8px;min-width:80px"><div style="width:${pct}%;background:${pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'};height:8px;border-radius:6px"></div></div>`;
}

async function smartRenderCorrelation() {
  const c = el('aa-correlation');
  const points = await smartCorrelationPoints();
  if (!points.length) { c.innerHTML = '<p class="empty-state">Not enough data yet. Generate weekly ratings and exam results first.</p>'; return; }
  const r = pearson(points.map(p => p.att), points.map(p => p.score));
  const rows = points.sort((a, b) => b.att - a.att).map(p => ({
    'Student': p.name,
    'Attendance': `${p.att}%`,
    'Avg Exam Score': `${p.score}%`,
    'Trend': p.score >= 75 ? '<span class="badge badge-success">Strong</span>' : p.score >= 50 ? '<span class="badge badge-warning">Moderate</span>' : '<span class="badge badge-danger">Needs help</span>',
  }));
  c.innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="label">Correlation (r)</div><div class="value" style="font-size:1.3rem">${r == null ? '-' : r.toFixed(3)}</div><div class="sub">${r == null ? '' : r > 0.5 ? 'Strong positive' : r > 0.25 ? 'Moderate positive' : r < -0.25 ? 'Negative' : 'Weak'}</div></div>
      <div class="stat-card"><div class="label">Students Analyzed</div><div class="value" style="font-size:1.3rem">${points.length}</div></div>
      <div class="stat-card"><div class="label">Avg Attendance</div><div class="value" style="font-size:1.3rem">${Math.round(points.reduce((s, p) => s + p.att, 0) / points.length)}%</div></div>
    </div>
    <div class="mt-2">${renderTable(['Student', 'Attendance', 'Avg Exam Score', 'Trend'], rows)}</div>
    <p style="font-size:.75rem;color:var(--gray-500);margin-top:6px">Attendance % comes from published weekly ratings; exam scores average all published exams.</p>`;
}

async function smartCorrelationPoints() {
  const [ratingsRes, examsRes] = await Promise.all([
    erp.from('attendance_ratings').select('student_id, rating').eq('org_id', erpOrg.id).eq('published', true),
    erp.from('exams').select('id').eq('org_id', erpOrg.id).eq('status', 'published'),
  ]);
  const examIds = (examsRes.data || []).map(e => e.id);
  const resultsRes = examIds.length ? await erp.from('exam_results').select('student_id, percentage').in('exam_id', examIds) : { data: [] };
  const attMap = {};
  (ratingsRes.data || []).forEach(r => {
    const k = r.student_id;
    attMap[k] = attMap[k] || [];
    attMap[k].push(Number(r.rating));
  });
  const scoreMap = {};
  (resultsRes.data || []).forEach(r => {
    const k = r.student_id;
    scoreMap[k] = scoreMap[k] || [];
    scoreMap[k].push(Number(r.percentage));
  });
  const { data: students } = await erp.from('students').select('id, first_name, last_name').eq('org_id', erpOrg.id);
  const points = [];
  (students || []).forEach(st => {
    const att = attMap[st.id];
    const sc = scoreMap[st.id];
    if (att && att.length && sc && sc.length) {
      points.push({ name: `${st.first_name} ${st.last_name}`, att: Math.round(att.reduce((a, b) => a + b, 0) / att.length), score: Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) });
    }
  });
  return points;
}

async function smartRenderMyInsights() {
  const c = el('aa-correlation');
  const { data: myRatings } = await erp.from('attendance_ratings').select('*, classes(name, section)').eq('org_id', erpOrg.id).eq('published', true).order('week_start', { ascending: false }).limit(8);
  let html = '';
  if (myRatings && myRatings.length) {
    html += renderTable(['Week', 'Class', 'Attended', 'Rating', 'Rank'], myRatings.map(r => ({
      'Week': `${r.week_start}`, 'Class': r.classes ? `${r.classes.name} ${r.classes.section || ''}`.trim() : '-', 'Attended': `${r.attended}/${r.total_units}`,
      'Rating': `<strong>${r.rating}%</strong>`, 'Rank': r.rank ? '#' + r.rank : '-',
    })));
  } else {
    html = '<p class="empty-state">No published ratings yet.</p>';
  }
  c.innerHTML = html;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  const den = Math.sqrt(dx * dy);
  if (!den) return null;
  return num / den;
}

/* ============================================================
   PRIZE DRAWS
   ============================================================ */

async function renderPrizes() {
  const role = erpProfile.role;
  if (!['school_admin', 'teacher', 'student', 'parent'].includes(role)) return smartForbidden();
  const isStaff = ['school_admin', 'teacher'].includes(role);
  const drawsRes = await erp.from('prize_draws').select('*, prize_winners(*, students(first_name, last_name, roll_number))').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  const draws = drawsRes.data || [];
  let html = isStaff ? `<div class="card"><div class="card-header"><h3>Prize Draws</h3>
      <button class="btn btn-primary btn-sm" onclick="smartShowCreateDraw()">+ New Prize Draw</button></div>
    <div class="card-body">${renderDrawCards(draws)}</div></div>`
    : `<div class="card"><div class="card-header"><h3>Prize Draw Results</h3></div>
    <div class="card-body">${renderDrawCards(draws)}</div></div>`;
  el('content-area').innerHTML = html;
}

function renderDrawCards(draws) {
  if (!draws.length) return '<p class="empty-state">No prize draws yet.</p>';
  return draws.map(d => {
    const winners = (d.prize_winners || []).map(w => ({
      name: w.students ? `${w.students.first_name} ${w.students.last_name}` : 'Student #' + w.student_id,
      rank: w.rank,
    })).sort((a, b) => (a.rank || 99) - (b.rank || 99));
    return `<div class="card" style="margin-bottom:12px"><div class="card-header"><h3>${smartEscape(d.title)}</h3>${smartBadge(d.status)}</div>
      <div class="card-body">
        <div class="flex gap-4" style="flex-wrap:wrap;color:var(--gray-600);font-size:.85rem">
          <span>Period: <strong>${d.period}</strong></span>
          <span>Min Attendance: <strong>${d.min_attendance}%</strong></span>
          <span>Winners: <strong>${d.winners_count}</strong></span>
          <span>Prize: <strong>${smartEscape(d.prize || '-')}</strong></span>
          ${d.draw_date ? `<span>Drawn: <strong>${new Date(d.draw_date).toLocaleDateString()}</strong></span>` : ''}
        </div>
        ${winners.length ? `<div class="mt-2">${renderTable(['Rank', 'Winner'], winners.map(w => ({ 'Rank': `<span class="badge badge-${w.rank === 1 ? 'success' : w.rank === 2 ? 'info' : 'warning'}">${w.rank <= 3 ? '🏆 #' + w.rank : '#' + w.rank}</span>`, 'Winner': smartEscape(w.name) })))}</div>` : '<p class="mt-2" style="font-size:.8rem;color:var(--gray-500)">No winners drawn yet.</p>'}
        ${['school_admin', 'teacher'].includes(erpProfile.role) && d.status === 'scheduled' ? `<div class="mt-2"><button class="btn btn-warning btn-sm" onclick="smartDraw(${d.id})">🎯 Draw Winners</button><button class="btn btn-danger btn-sm ms-1" onclick="deleteRecord('prize_draws',${d.id},'Prize draw')">Delete</button></div>` : ''}
      </div></div>`;
  }).join('');
}

async function smartShowCreateDraw() {
  openSlideModal('New Prize Draw', `
    <form id="draw-form">
      <div class="form-group"><label>Title</label><input name="title" placeholder="e.g. September Attendance Lucky Draw" required></div>
      <div class="form-row">
        <div class="form-group"><label>Period</label><select name="period"><option value="week">Week</option><option value="month">Month</option><option value="term">Term</option></select></div>
        <div class="form-group"><label>Min Attendance %</label><input type="number" name="min_attendance" value="85" step="0.1" min="0" max="100"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Winners Count</label><input type="number" name="winners_count" value="3" min="1"></div>
        <div class="form-group"><label>Prize</label><input name="prize" placeholder="e.g. ₹500 gift voucher"></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('draw-form');
    fd.org_id = erpOrg.id;
    fd.min_attendance = parseFloat(fd.min_attendance) || 85;
    fd.winners_count = parseInt(fd.winners_count) || 3;
    fd.status = 'scheduled';
    await erp.from('prize_draws').insert(fd);
    showToast('Prize draw created!', 'success');
    closeSlideModal();
    renderPrizes();
  });
}

function smartPeriodStart(period) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === 'month') { now.setDate(1); return now.toISOString().split('T')[0]; }
  if (period === 'term') { now.setMonth(now.getMonth() - 3); return now.toISOString().split('T')[0]; }
  return smartWeekStart(now);
}

async function smartDraw(drawId) {
  const { data: d } = await erp.from('prize_draws').select('*').eq('id', drawId).single();
  if (!d || d.status === 'drawn') { showToast('Draw already completed', 'warning'); return; }
  const ws = smartPeriodStart(d.period);
  const [studentsRes, sessionsRes] = await Promise.all([
    erp.from('students').select('id').eq('org_id', erpOrg.id).eq('status', 'active'),
    erp.from('attendance_sessions').select('id, class_id').eq('org_id', erpOrg.id).gte('date', ws).lte('date', smartToday()),
  ]);
  const sessions = sessionsRes.data || [];
  const sessIds = sessions.map(s => s.id);
  const recordsRes = sessIds.length ? await erp.from('session_attendance').select('session_id, student_id, status').in('session_id', sessIds) : { data: [] };
  const sessionClass = {};
  sessions.forEach(s => { sessionClass[s.id] = s.class_id; });
  const stats = {};
  (recordsRes.data || []).forEach(r => {
    const k = r.student_id;
    stats[k] = stats[k] || { attended: 0, total: 0 };
    stats[k].total++;
    if (r.status === 'present') stats[k].attended++;
  });
  const eligible = (studentsRes.data || []).filter(st => {
    const s = stats[st.id];
    if (!s || !s.total) return false;
    return (s.attended / s.total) * 100 >= d.min_attendance;
  });
  if (eligible.length < d.winners_count) { showToast(`Only ${eligible.length} eligible students (need ${d.winners_count}). Lower min attendance or winners count.`, 'warning'); return; }
  const shuffled = eligible.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const winners = shuffled.slice(0, d.winners_count).map((st, i) => ({ draw_id: d.id, student_id: st.id, rank: i + 1 }));
  await erp.from('prize_winners').upsert(winners, { onConflict: 'draw_id,student_id' });
  await erp.from('prize_draws').update({ status: 'drawn', draw_date: smartToday() }).eq('id', d.id);
  showToast(`🎉 ${d.winners_count} winners drawn!`, 'success');
  renderPrizes();
}
