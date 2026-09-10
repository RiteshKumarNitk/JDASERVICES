/* =====================================================================
   JDA Property Services — main.js
   Shared runtime: DOM/validation helpers, the reusable searchable select
   widget, toasts, collapse behaviour, plus the Property Profile,
   Supporting Documents, Review and Final Submission page logic.
   (Choose Service lives in service.js; applicant screens in applicant.js)
   ===================================================================== */
'use strict';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
function toast(message, ok) {
  const el = $('#toast');
  if (!el) return;
  el.hidden = false;
  el.className = 'toast' + (ok ? ' is-ok' : '');
  el.innerHTML = '<svg class="ic"><use href="#i-check"/></svg><span>' + esc(message) + '</span>';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

/* ------------------------------------------------------------------ */
/* Reusable searchable select widget                                   */
/* ------------------------------------------------------------------ */
class SearchSelect {
  constructor(native) {
    this.native = native;
    this.placeholder = native.dataset.placeholder || 'Select';
    this.options = [];

    Array.from(native.options).forEach((o) => {
      if (o.value !== '') this.options.push({ value: o.value, label: o.text.trim() });
    });

    this.root = document.createElement('div');
    this.root.className = 'ss';
    native.insertAdjacentElement('afterend', this.root);
    native.setAttribute('hidden', '');
    native.setAttribute('aria-hidden', 'true');
    native._ss = this;

    this.root.innerHTML =
      '<button type="button" class="ss-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-label="' + esc(this.placeholder) + '">' +
        '<span class="ss-value ph"></span>' +
        '<span class="ss-icons">' +
          '<svg class="ic si-search"><use href="#i-search"/></svg>' +
          '<svg class="ic si-chev"><use href="#i-chev"/></svg>' +
        '</span>' +
      '</button>' +
      '<div class="ss-panel">' +
        '<div class="ss-search">' +
          '<svg class="ic"><use href="#i-search"/></svg>' +
          '<input type="text" placeholder="Search option\u2026" aria-label="Search options" autocomplete="off" />' +
        '</div>' +
        '<ul class="ss-list" role="listbox"></ul>' +
      '</div>';

    this.trigger  = $('.ss-trigger', this.root);
    this.valueEl  = $('.ss-value', this.root);
    this.panel    = $('.ss-panel', this.root);
    this.search   = $('.ss-search input', this.root);
    this.listEl   = $('.ss-list', this.root);
    this.filtered = [];
    this.activeIdx = -1;
    this.open = false;

    this._bind();
    this._value = native.value || '';
    this.renderValue();
  }

  get value() { return this.native.value; }

  _bind() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open ? this.close() : this.openPanel();
    });

    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && !this.open) { e.preventDefault(); this.openPanel(); }
    });

    this.search.addEventListener('input', () => this.render());
    this.search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.pickActive(); }
      else if (e.key === 'Escape') { this.close(); this.trigger.focus(); }
    });

    this.listEl.addEventListener('mousedown', (e) => e.preventDefault());
    this.listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.ss-opt');
      if (item) this.pick(item.dataset.value);
    });

    document.addEventListener('pointerdown', (e) => {
      if (this.open && !this.root.contains(e.target)) this.close();
    });
  }

  /* ---------- options ---------- */
  setOptions(items) {
    this.options = (items || []).map((it) =>
      (typeof it === 'string') ? { value: it, label: it } : { value: it.value, label: it.label }
    );
    this.native.innerHTML = '';
    this.options.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      this.native.appendChild(opt);
    });
    if (this._value && !this.options.some((o) => o.value === this._value)) this.setValue('');
    this.renderValue();
  }

  /* ---------- state ---------- */
  setValue(v, silent) {
    this._value = v || '';
    this.native.value = this._value;
    this.renderValue();
    if (!silent && this._value) this.native.dispatchEvent(new Event('change', { bubbles: true }));
  }

  disable() {
    this.native.disabled = true;
    this.root.classList.add('is-disabled');
    this.trigger.disabled = true;
  }

  enable() {
    this.native.disabled = false;
    this.root.classList.remove('is-disabled');
    this.trigger.disabled = false;
  }

  renderValue() {
    const hit = this.options.find((o) => o.value === this._value);
    const label = hit ? hit.label : (this._value || '');
    this.valueEl.textContent = label || this.placeholder;
    this.valueEl.classList.toggle('ph', !label);
  }

  /* ---------- menu ---------- */
  openPanel() {
    if (this.root.classList.contains('is-disabled')) return;
    this.open = true;
    this.root.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.search.value = '';
    this.render();
    requestAnimationFrame(() => this.search.focus());
  }

  close() {
    this.open = false;
    this.root.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.activeIdx = -1;
  }

  render() {
    const q = this.search.value.trim().toLowerCase();
    this.filtered = q
      ? this.options.filter((o) => o.label.toLowerCase().indexOf(q) !== -1)
      : this.options.slice();

    this.listEl.innerHTML = '';
    if (!this.filtered.length) {
      const li = document.createElement('li');
      li.className = 'ss-empty';
      li.textContent = 'No matching options';
      this.listEl.appendChild(li);
      this.activeIdx = -1;
      return;
    }

    this.filtered.forEach((o, i) => {
      const li = document.createElement('li');
      li.className = 'ss-opt';
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', o.value);
      li.setAttribute('aria-selected', o.value === this._value ? 'true' : 'false');
      li.textContent = o.label;
      if (o.value === this._value) {
        li.classList.add('is-active');
        this.activeIdx = i;
      }
      this.listEl.appendChild(li);
    });

    if (this.activeIdx === -1) this.activeIdx = 0;
    this._markActive();
  }

  _markActive() {
    $$('.ss-opt', this.listEl).forEach((li, i) => {
      li.classList.toggle('is-active', i === this.activeIdx);
      li.setAttribute('aria-selected', i === this.activeIdx ? 'true' : 'false');
    });
    const cur = this.listEl.children[this.activeIdx];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  move(dir) {
    if (!this.open || !this.filtered.length) return;
    this.activeIdx = (this.activeIdx + dir + this.filtered.length) % this.filtered.length;
    this._markActive();
  }

  pickActive() {
    const opt = this.filtered[this.activeIdx];
    if (opt) this.pick(opt.value);
  }

  pick(value) {
    const opt = this.options.find((o) => o.value === value);
    if (!opt) return;
    this._value = opt.value;
    this.native.value = opt.value;
    this.renderValue();
    this.close();
    this.trigger.focus();
    this.native.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/* Build widgets for every hidden native select inside a scope
   (skips any select that already has a widget, so a page + its
   init function can both call this without doubling the dropdown) */
function enhanceSelects(scope) {
  $$('select.ss-native', scope || document).forEach((sel) => {
    if (!sel._ss) new SearchSelect(sel);
  });
}

/* ------------------------------------------------------------------ */
/* Error display / validation helpers                                  */
/* ------------------------------------------------------------------ */
function ctrlBox(ctrl) {
  const host = (ctrl.classList && ctrl.classList.contains('ss-native') && ctrl._ss) ? ctrl._ss.root : ctrl;
  const group = ctrl.closest && ctrl.closest('.input-group');
  return group || host;
}

function markError(ctrl, message) {
  const box = ctrlBox(ctrl);
  const field = ctrl.closest('.field');
  clearFieldError(field);

  box.classList.add('is-invalid');
  const p = document.createElement('p');
  p.className = 'err-msg';
  p.textContent = message;
  (field || box.parentNode).appendChild(p);
}

function clearFieldError(field) {
  if (!field) return;
  $$('.is-invalid', field).forEach((el) => el.classList.remove('is-invalid'));
  const p = field.querySelector('.err-msg');
  if (p) p.remove();
}

function clearErrorsIn(scope) {
  const root = (scope instanceof Element) ? scope : document.querySelector(scope);
  if (!root) return;
  $$('.is-invalid', root).forEach((el) => el.classList.remove('is-invalid'));
  $$('.err-msg', root).forEach((p) => p.remove());
}

function scrollToControl(ctrl) {
  const isNative = ctrl.classList && ctrl.classList.contains('ss-native') && ctrl._ss;
  const target = isNative ? ctrl._ss.trigger : ctrl;
  try { target.focus({ preventScroll: true }); } catch (_) { if (target.focus) target.focus(); }
  try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { if (target.scrollIntoView) target.scrollIntoView(); }
}

function isVisible(ctrl) {
  const root = (ctrl.classList && ctrl.classList.contains('ss-native') && ctrl._ss) ? ctrl._ss.root : ctrl;
  return !root.closest('[hidden]') && root.getClientRects().length > 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldFormatMessage(ctrl, rawVal) {
  if (!rawVal) return '';
  const type = ctrl.dataset.vtype;
  if (type === 'aadhaar' && !/^\d{12}$/.test(rawVal.replace(/\s/g, ''))) return 'Please enter a valid 12-digit Aadhaar number.';
  if (type === 'mobile' && !/^\d{10}$/.test(rawVal)) return 'Please enter a valid 10-digit mobile number.';
  if (type === 'email' && !EMAIL_RE.test(rawVal)) return 'Please enter a valid email address.';
  return '';
}

/* Validate required + typed fields inside a visible scope. Returns first invalid control (or null). */
function validateScope(scope) {
  clearErrorsIn(scope);
  let firstBad = null;
  const report = (ctrl, msg) => { if (!firstBad) firstBad = ctrl; markError(ctrl, msg); };

  $$('[required]', scope).forEach((ctrl) => {
    if (!isVisible(ctrl)) return;
    const val = (ctrl.value || '').trim();
    if (!val) { report(ctrl, 'This field is required.'); return; }
    const msg = fieldFormatMessage(ctrl, val);
    if (msg) report(ctrl, msg);
  });

  $$('[data-vtype]', scope).forEach((ctrl) => {
    if (!isVisible(ctrl)) return;
    if (ctrl.hasAttribute('required')) return; // handled above
    const msg = fieldFormatMessage(ctrl, (ctrl.value || '').trim());
    if (msg) report(ctrl, msg);
  });

  if (firstBad) scrollToControl(firstBad);
  return firstBad;
}

/* ------------------------------------------------------------------ */
/* Textarea character counters                                         */
/* ------------------------------------------------------------------ */
function initCounters(scope) {
  $$('textarea[data-count]', scope || document).forEach((ta) => {
    const counter = ta.parentElement.querySelector('.char-count');
    if (!counter) return;
    const update = () => { counter.textContent = ta.value.length + '/' + (ta.maxLength || 500); };
    ta.addEventListener('input', update);
    update();
  });
}

/* ------------------------------------------------------------------ */
/* Property Profile                                                   */
/* ------------------------------------------------------------------ */
// Mock property lookup results — replace with the live JDA property API.
const PROPERTY_RESULTS = [
  {
    id: '2330000017',
    zone: 'ZONE-B',
    scheme: 'VIDHYADHAR NAGAR',
    sectorPlot: '2 CANDLE WICK',
    area: '5000.00',
    unit: 'SQ. METER',
    owner: 'SANDVEEK PUBLIC SCHOOL'
  }
];

let propertyRows = [];
let propertyEditing = false;

function rowField(row, key) {
  if (key === 'plot' || key === 'sector') return row.sectorPlot || '';
  return row[key] || '';
}

function renderPropertyRows() {
  const tbody = $('#ppResults');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!propertyRows.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-state';
    tr.innerHTML = '<td colspan="8">No data available in table</td>';
    tbody.appendChild(tr);
    return;
  }

  propertyRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(row.id) + '</td>' +
      '<td>' + esc(row.zone) + '</td>' +
      '<td>' + esc(row.scheme) + '</td>' +
      '<td>' + esc(row.sectorPlot) + '</td>' +
      '<td>' + esc(row.area) + '</td>' +
      '<td>' + esc(row.unit) + '</td>' +
      '<td>' + esc(row.owner) + '</td>' +
      '<td><button type="button" class="remove-link">Remove</button></td>';
    tbody.appendChild(tr);
  });
}

function doPropertySearch(card) {
  const panel = card.querySelector('.tab-panel.is-active');
  const terms = Array.from(panel.querySelectorAll('input[data-k]')).map((inp) => ({
    key: inp.dataset.k,
    val: inp.value.trim().toUpperCase()
  }));
  propertyRows = PROPERTY_RESULTS.filter((row) =>
    terms.every((t) => !t.val || rowField(row, t.key).toUpperCase().indexOf(t.val) !== -1)
  );
  renderPropertyRows();
}

// Persist the current property selection into the shared flow store.
function persistProperty() {
  setFlow({
    propertyRecords: propertyRows.slice(),
    propertyCount: propertyRows.length
  });
}

// Read-only summary of the saved property(ies) + an Edit action.
function renderPropertySummary() {
  const wrap = $('#propertySummary');
  const searchArea = $('#propertySearchArea');
  const saveBtn = $('#savePropertyEdit');
  const recs = getFlow().propertyRecords || [];
  const showSummary = recs.length > 0 && !propertyEditing;

  if (wrap) {
    wrap.hidden = !showSummary;
    wrap.innerHTML = !showSummary ? '' : recs.map((r, i) => {
      const rows = [
        ['Property ID', r.id], ['Zone', r.zone], ['Scheme', r.scheme],
        ['Sector & Plot No', r.sectorPlot], ['Area', r.area],
        ['Area Unit', r.unit], ['Owner Name', r.owner]
      ];
      const title = recs.length > 1 ? 'Property ' + (i + 1) : 'Property Details';
      const editBtn = i === 0
        ? '<button class="btn btn-outline btn-sm summary-edit" type="button" id="editProperty">Edit</button>'
        : '';
      return '<div class="summary-card"><h3>' + esc(title) + editBtn + '</h3><dl class="summary-grid">' +
        rows.map((kv) => '<div class="summary-row"><dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1] || '—') + '</dd></div>').join('') +
        '</dl></div>';
    }).join('');
  }
  if (searchArea) searchArea.hidden = showSummary;
  if (saveBtn) saveBtn.hidden = !propertyEditing;

  const editBtn = $('#editProperty');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      propertyEditing = true;
      propertyRows = (getFlow().propertyRecords || []).slice();
      renderPropertyRows();
      renderPropertySummary();
      const area = $('#propertySearchArea');
      if (area) area.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }
}

function initPropertyPage() {
  propertyEditing = false;
  propertyRows = (getFlow().propertyRecords || []).slice();
  renderPropertyRows();
  renderPropertySummary();

  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.find-card');
      $$('.tab-btn', card).forEach((b) => b.classList.toggle('is-active', b === btn));
      $$('.tab-panel', card).forEach((p) => p.classList.toggle('is-active', p.dataset.panel === btn.dataset.tab));
    });
  });

  $$('.find-search').forEach((btn) => {
    btn.addEventListener('click', () => {
      toast('Searching property records\u2026 (mock lookup)');
      setTimeout(() => doPropertySearch(btn.closest('.find-card')), 350);
    });
  });

  const tbody = $('#ppResults');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-link');
      if (!btn) return;
      const rowEl = btn.closest('tr');
      const idx = Array.prototype.indexOf.call(rowEl.parentNode.children, rowEl);
      if (idx > -1) { propertyRows.splice(idx, 1); renderPropertyRows(); }
    });
  }

  // Save (edit mode only): persist the updated selection and return to summary.
  const saveEdit = $('#savePropertyEdit');
  if (saveEdit) {
    saveEdit.addEventListener('click', () => {
      persistProperty();
      propertyEditing = false;
      renderPropertyRows();
      renderPropertySummary();
      toast('Property details updated.', true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const proceed = $('#proceedProperty');
  if (proceed) {
    proceed.addEventListener('click', () => {
      persistProperty();
      window.location.href = getFlow().editReturn ? 'final-submission.html' : 'document-section.html';
    });
  }
}

/* ------------------------------------------------------------------ */
/* Document Section                                                   */
/* ------------------------------------------------------------------ */
// Mock list — extend with the actual requirement set per service.
const DOCS = [
  { req: 'Photo ID issued by Government (Aadhaar Card / Driving License / Passport / Voter ID)', type: 'mandatory', uploaded: true, name: 'Photo_ID.pdf' },
  { req: 'Registered Gift Deed', type: 'mandatory', uploaded: false, detail: 'registry' },
  { req: 'Lease Deed (Patta) including Stamps issued by JDA', type: 'mandatory', uploaded: false },
  { req: 'Site Plan issued by JDA', type: 'mandatory', uploaded: false },
  { req: 'Allotment Letter issued by JDA', type: 'applicable', uploaded: false },
  { req: 'Possession Letter issued by JDA', type: 'applicable', uploaded: false },
  { req: 'For constructed property: latest Electricity / Water Bill', type: 'applicable', uploaded: false, detail: 'electricity' },
  { req: 'Receipt(s) of amount deposited in JDA', type: 'applicable', uploaded: false }
];

/* Mock lookup pools for the "Get Detail" buttons (Registry / Electricity).
   Replace with the live registry & DISCOM integrations. */
const NAME_POOL   = ['ARUN KUMAR SHARMA', 'SUNITA DEVI', 'RAJESH AGARWAL', 'MOHAMMED IQBAL', 'PRIYA MEENA'];
const FATHER_POOL = ['RAKESH KUMAR SHARMA', 'GOPAL DAS', 'BANWARI LAL AGARWAL', 'ABDUL RAHMAN', 'HARI SINGH MEENA'];
const ADDR_POOL   = ['12, Vidhyadhar Nagar, Jaipur', '45-B, Malviya Nagar, Jaipur', 'Plot 7, Mansarovar, Jaipur', '3, Bani Park, Jaipur'];
const TEHSIL_POOL = ['Jaipur', 'Amber', 'Sanganer', 'Bassi'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDigits(n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }
function randDate() {
  const d = new Date(2015 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
  return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
}

// Last fetched detail row per sub-form, so "View" can redraw it after the
// user navigates away and back (persisted into flow on Save).
const detailRows = { registry: null, electricity: null };

// Paint one saved/fetched detail row into a sub-form's table.
function renderDetailRows(block, cells) {
  const tbody = block && block.querySelector('.tbl tbody');
  if (!tbody || !cells || !cells.length) return;
  tbody.classList.remove('empty-state');
  tbody.innerHTML =
    '<tr>' + cells.map((c) => '<td>' + c + '</td>').join('') +
    '<td><button type="button" class="tbtn tbtn-del remove-detail">delete</button></td></tr>';
}

function fillDetailTable(panel, topic, refValue) {
  const table = panel.querySelector('.tbl');
  const tbody = table && table.querySelector('tbody');
  if (!tbody) return;

  let cells, kind;
  if (topic === 'Registry Number') {
    kind = 'registry';
    // Reduced 8-column view: S.No, Party Name, Property Address, Document No,
    // Registry No, Registry Date, Document Status, Action.
    cells = [
      '1', pick(NAME_POOL), pick(ADDR_POOL),
      randDigits(4) + '/' + (2015 + Math.floor(Math.random() * 10)),
      esc(refValue), randDate(), 'Registered'
    ];
  } else {
    kind = 'electricity';
    cells = [
      '1', esc(refValue), pick(NAME_POOL), pick(FATHER_POOL), pick(ADDR_POOL),
      pick(['Domestic', 'Commercial']), randDate()
    ];
  }

  detailRows[kind] = cells;
  renderDetailRows(panel, cells);
}

/* One reusable inline upload card, opened directly below the clicked row.
   Only one card open at a time. */
const docFiles = {};       // DOCS index -> File (session only, for preview)
let openDocIdx = null;     // index of the row whose EDIT card is open
let openViewIdx = null;    // index of the row whose READ-ONLY view is open
let stagedDocFile = null;  // file picked in the open card, not yet saved

function docActionHtml(item) {
  return item.uploaded
    ? '<button type="button" class="tbtn tbtn-ok" data-act="upload">Uploaded</button>'
    : '<button type="button" class="tbtn tbtn-upload" data-act="upload">Upload</button>';
}

function filePreviewHtml(file) {
  return (file && /^image\//.test(file.type))
    ? '<img src="' + URL.createObjectURL(file) + '" alt="preview" />'
    : '';
}

// registry / electricity sub-forms live in #detailHolder; move them back there
function stashRowDetails() {
  const holder = document.getElementById('detailHolder');
  if (!holder) return;
  ['registryDetail', 'electricityDetail'].forEach((id) => {
    const b = document.getElementById(id);
    if (b && b.parentElement !== holder) holder.appendChild(b);
  });
}

function mountDocCard(idx) {
  const tbody = $('#docRows');
  const rowTr = tbody && tbody.children[idx];
  const item = DOCS[idx];
  if (!rowTr || !item) return;

  // registry / electricity rows: drop the shared detail sub-form into this row
  if (item.detail) {
    const block = document.getElementById(item.detail + 'Detail');
    const tr = document.createElement('tr');
    tr.className = 'doc-detail-row';
    tr.dataset.docDetail = idx;
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'row-detail-cell';
    tr.appendChild(td);
    rowTr.after(tr);
    if (block) td.appendChild(block);
    tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }

  const shownName = stagedDocFile ? stagedDocFile.name
    : (item.uploaded ? (item.name || 'document') : 'No file chosen');
  const hasFile = !!stagedDocFile || !!item.uploaded;
  const preview = filePreviewHtml(stagedDocFile || docFiles[idx]);

  const tr = document.createElement('tr');
  tr.className = 'doc-detail-row';
  tr.dataset.docDetail = idx;
  tr.innerHTML =
    '<td colspan="6"><div class="up-card">' +
      '<div class="up-card-head">' + esc(item.req) + '</div>' +
      '<div class="up-card-body">' +
        '<p class="mini-note">Upload Document</p>' +
        '<input type="file" class="up-input" accept=".jpg,.jpeg,.png,.pdf" hidden />' +
        '<div class="upload-row">' +
          '<button class="btn btn-outline" type="button" data-pick>Choose File</button>' +
          '<span class="file-name" data-name>' + esc(shownName) + '</span>' +
        '</div>' +
        '<p class="mini-hint">Supported formats: JPG, JPEG, PNG, PDF</p>' +
        '<div class="up-preview" data-preview' + (preview ? '' : ' hidden') + '>' + preview + '</div>' +
        '<div class="upload-result" data-result' + (hasFile ? '' : ' hidden') + '>' +
          '<span class="up-name">' + esc(shownName) + '</span>' +
          '<button type="button" class="tbtn tbtn-view" data-preview-open>Preview</button>' +
          '<button type="button" class="tbtn tbtn-upload" data-pick>Replace</button>' +
          '<button type="button" class="tbtn tbtn-del" data-remove>Remove</button>' +
        '</div>' +
      '</div>' +
      '<div class="up-card-foot">' +
        '<button class="btn btn-outline btn-sm" type="button" data-cancel>Cancel</button>' +
        '<button class="btn btn-primary btn-sm" type="button" data-save>Save</button>' +
      '</div>' +
    '</div></td>';
  rowTr.after(tr);

  const input = tr.querySelector('.up-input');
  const nameEls = tr.querySelectorAll('[data-name], .up-name');
  const previewBox = tr.querySelector('[data-preview]');
  const resultBox = tr.querySelector('[data-result]');

  tr.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => input.click()));
  input.addEventListener('change', () => {
    stagedDocFile = input.files[0] || null;
    const n = stagedDocFile ? stagedDocFile.name
      : (item.uploaded ? (item.name || 'document') : 'No file chosen');
    nameEls.forEach((el) => { el.textContent = n; });
    const pv = filePreviewHtml(stagedDocFile);
    previewBox.innerHTML = pv;
    previewBox.hidden = !pv;
    resultBox.hidden = !(stagedDocFile || item.uploaded);
  });
  tr.querySelector('[data-preview-open]').addEventListener('click', () => {
    const f = stagedDocFile || docFiles[idx];
    if (f) window.open(URL.createObjectURL(f), '_blank');
    else toast('No local preview available for this file.');
  });
  tr.querySelector('[data-remove]').addEventListener('click', () => {
    stagedDocFile = null;
    delete docFiles[idx];
    item.uploaded = false;
    delete item.name;
    persistDocs();
    renderDocTable();
    toast('File removed.');
  });
  tr.querySelector('[data-cancel]').addEventListener('click', closeDocCard);
  tr.querySelector('[data-save]').addEventListener('click', () => {
    if (!stagedDocFile && !item.uploaded) { toast('Please choose a file to upload.'); return; }
    if (stagedDocFile) {
      item.uploaded = true;
      item.name = stagedDocFile.name;
      docFiles[idx] = stagedDocFile;
    }
    persistDocs();
    openDocIdx = null;
    stagedDocFile = null;
    renderDocTable();
    toast('Document saved.', true);
  });

  tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// keep the flow store in sync with DOCS so uploads survive navigation
function persistDocs() {
  setFlow({
    uploadedDocs: DOCS.filter((d) => d.uploaded).map((d) => d.req),
    uploadedDocNames: DOCS.filter((d) => d.uploaded).map((d) => d.name || d.req)
  });
}

function openDocCard(idx) {
  if (openDocIdx === idx) { closeDocCard(); return; }
  openViewIdx = null;               // leaving read-only view for the edit card
  openDocIdx = idx;
  stagedDocFile = null;
  renderDocTable();
}
function closeDocCard() {
  openDocIdx = null;
  openViewIdx = null;
  stagedDocFile = null;
  renderDocTable();
}

// READ-ONLY view of a Registry / Electricity row's saved details (no inputs)
function openDocView(idx) {
  if (openViewIdx === idx) { openViewIdx = null; renderDocTable(); return; }
  openDocIdx = null;
  stagedDocFile = null;
  openViewIdx = idx;
  renderDocTable();
}

function mountDocView(idx) {
  const tbody = $('#docRows');
  const rowTr = tbody && tbody.children[idx];
  const item = DOCS[idx];
  if (!rowTr || !item || !item.detail) return;

  const kind = item.detail;
  const data = getFlow()[kind + 'Data'] || {};
  const cells = Array.isArray(data.rows) && data.rows.length ? data.rows : (detailRows[kind] || null);
  const title = kind === 'registry' ? 'Registry Details' : 'Electricity Connection Details';
  const refLabel = kind === 'registry' ? 'Registry Number' : 'K Number';
  const docLabel = kind === 'registry' ? 'Registry Document' : 'Connection Document';
  const detailTitle = kind === 'registry' ? 'Registry Detail' : 'Connection Detail';
  const headers = kind === 'registry'
    ? ['S.No', 'Party Name', 'Property Address', 'Document No', 'Registry No', 'Registry Date', 'Document Status', 'Action']
    : ['S.No', 'K Number', 'Consumer Name', 'Fathers Name', 'Address', 'Category Of Connection', 'Date Of Connection', 'Action'];

  const refHtml = data.ref
    ? '<p class="ro-line"><span class="ro-key">' + esc(refLabel) + ':</span> <span class="ro-val">' + esc(data.ref) + '</span></p>'
    : '';

  let tableHtml = '';
  if (cells && cells.length) {
    tableHtml =
      '<h4 class="table-title">' + esc(detailTitle) + '</h4>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        headers.map((h) => '<th>' + esc(h) + '</th>').join('') +
      '</tr></thead><tbody><tr>' +
        cells.map((c) => '<td>' + c + '</td>').join('') + '<td>—</td>' +
      '</tr></tbody></table></div>';
  }

  let fileHtml = '';
  if (data.method === 'upload' && data.fileName) {
    fileHtml =
      '<div class="ro-file"><span class="ro-key">' + esc(docLabel) + ':</span> ' +
      '<span class="ro-val">' + esc(data.fileName) + '</span>' +
      '<button type="button" class="tbtn tbtn-view" data-view-preview="' + idx + '">Preview</button></div>';
  }

  const bodyHtml = (refHtml || tableHtml || fileHtml)
    ? (refHtml + tableHtml + fileHtml)
    : '<p class="ro-empty">No saved details yet — click <strong>Edit</strong> to add them.</p>';

  const tr = document.createElement('tr');
  tr.className = 'doc-detail-row';
  tr.dataset.docDetail = idx;
  tr.innerHTML =
    '<td colspan="6"><div class="row-detail row-detail-ro">' +
      '<div class="ro-head">' +
        '<h4 class="ro-title">' + esc(title) + '</h4>' +
        '<button class="btn btn-outline btn-sm" type="button" data-detail-edit="' + idx + '">Edit</button>' +
      '</div>' + bodyHtml +
    '</div></td>';
  rowTr.after(tr);

  const pv = tr.querySelector('[data-view-preview]');
  if (pv) pv.addEventListener('click', () => {
    const f = docFiles[idx];
    if (f) window.open(URL.createObjectURL(f), '_blank');
    else toast('Preview not available for this file.');
  });
  const ed = tr.querySelector('[data-detail-edit]');
  if (ed) ed.addEventListener('click', () => openDocCard(idx));

  tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function renderDocTable() {
  const tbody = $('#docRows');
  if (!tbody) return;
  stashRowDetails();          // rescue moved sub-forms before wiping the table
  tbody.innerHTML = '';

  DOCS.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.dataset.docIdx = i;
    const badge = item.type === 'mandatory' ? 'Mandatory' : 'If Applicable';
    const cls = item.type === 'mandatory' ? 'mandatory' : 'applicable';
    const view = item.uploaded ? '<button type="button" class="tbtn tbtn-view" data-act="view">View</button>' : '';
    const del = item.uploaded ? '<button type="button" class="tbtn tbtn-del" data-act="del">delete</button>' : '';

    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td class="req-text">' + esc(item.req) + '</td>' +
      '<td><span class="req-badge ' + cls + '">' + badge + '</span></td>' +
      '<td>' + view + '</td>' +
      '<td>' + del + '</td>' +
      '<td>' + docActionHtml(item) + '</td>';
    tbody.appendChild(tr);
  });

  if (openDocIdx != null) mountDocCard(openDocIdx);
  else if (openViewIdx != null) mountDocView(openViewIdx);
}

function initDocumentsPage() {
  const upFiles = {}; // registry | electricity -> File (session only)

  // restore previously uploaded documents from the flow store
  const savedDocs = getFlow().uploadedDocs || [];
  const savedNames = getFlow().uploadedDocNames || [];
  savedDocs.forEach((req, i) => {
    const d = DOCS.find((x) => x.req === req);
    if (d) { d.uploaded = true; d.name = savedNames[i] || d.name || 'document'; }
  });

  renderDocTable();

  const tbody = $('#docRows');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.tbtn[data-act]');
      if (!btn) return;
      const rowTr = btn.closest('tr[data-doc-idx]');
      if (!rowTr) return;
      const idx = parseInt(rowTr.dataset.docIdx, 10);
      const item = DOCS[idx];
      if (!item) return;
      const act = btn.dataset.act;

      if (act === 'upload') {
        openDocCard(idx);                 // "Upload" / green "Uploaded" -> document management / edit card
      } else if (act === 'view') {
        if (item.detail) {
          openDocView(idx);              // Registry / Electricity -> READ-ONLY view of saved details
        } else {
          const f = docFiles[idx];
          if (f) window.open(URL.createObjectURL(f), '_blank');
          else toast('Viewing ' + (item.name || 'document') + ' (no local preview).');
        }
      } else if (act === 'del') {
        item.uploaded = false;
        delete item.name;
        delete docFiles[idx];
        if (item.detail) {
          delete upFiles[item.detail];
          detailRows[item.detail] = null;
          setFlow(item.detail === 'registry'
            ? { registryDone: false, registryData: null }
            : { electricityDone: false, electricityData: null });
          const block = document.getElementById(item.detail + 'Detail');
          if (block) {
            const tb = block.querySelector('.tbl tbody');
            const cols = block.querySelectorAll('.tbl thead th').length;
            if (tb) { tb.classList.add('empty-state'); tb.innerHTML = '<tr><td colspan="' + cols + '">No data available in table</td></tr>'; }
            const ii = block.querySelector('#regNo, #kNo'); if (ii) ii.value = '';
            const fr = block.querySelector('[data-file-result]'); if (fr) fr.hidden = true;
            const fn = block.querySelector('[data-file-name]'); if (fn) fn.textContent = 'No file chosen';
            const ub = block.querySelector('[data-file-upload]'); if (ub) ub.textContent = 'Upload';
          }
        }
        if (openDocIdx === idx) openDocIdx = null;
        if (openViewIdx === idx) openViewIdx = null;
        persistDocs();
        renderDocTable();
        toast('Document removed.');
      }
    });
  }

  /* ---- Registry Number / K Number fetch (existing behaviour) ---- */
  $$('.get-detail').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.detail-card');
      const input = card.querySelector('.input');
      if (!(input.value || '').trim()) {
        markError(input, 'Please enter ' + btn.dataset.topic + '.');
        return;
      }
      clearFieldError(input.closest('.field'));
      fillDetailTable(btn.closest('.row-detail'), btn.dataset.topic, input.value.trim());
      toast('Details fetched successfully (mock \u2014 connect live API).', true);
    });
  });

  /* ---- remove a fetched Registry / Connection row ---- */
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('.remove-detail');
    if (!rm) return;
    const table = rm.closest('.tbl');
    const tb = table && table.querySelector('tbody');
    if (!tb) return;
    const detailBlock = rm.closest('.row-detail');
    if (detailBlock && detailBlock.id === 'registryDetail') detailRows.registry = null;
    if (detailBlock && detailBlock.id === 'electricityDetail') detailRows.electricity = null;
    const cols = table.querySelectorAll('thead th').length;
    tb.classList.add('empty-state');
    tb.innerHTML = '<tr><td colspan="' + cols + '">No data available in table</td></tr>';
  });

  $$('.help').forEach((h) => {
    h.addEventListener('click', () => {
      toast('Help: ' + h.textContent.trim().replace(/^\?\s*/, '') + ' \u2014 guidance placeholder.');
    });
  });

  /* ---- Registry / Electricity sub-forms (live inside their document row) ---- */
  // restore previously saved reference / uploaded filename
  const f0 = getFlow();
  ['registry', 'electricity'].forEach((kind) => {
    const d = f0[kind + 'Data'];
    const block = document.getElementById(kind + 'Detail');
    if (!d || !block) return;
    if (d.ref) {
      const idInput = block.querySelector('#regNo, #kNo');
      if (idInput) idInput.value = d.ref;
    }
    if (Array.isArray(d.rows) && d.rows.length) {
      detailRows[kind] = d.rows;
      renderDetailRows(block, d.rows);        // so "View" shows the saved fetched data
    }
    if (d.method === 'upload' && d.fileName) {
      block.querySelector('[data-file-final]').textContent = d.fileName;
      block.querySelector('[data-file-result]').hidden = false;
      const ub = block.querySelector('[data-file-upload]');
      if (ub) ub.textContent = 'Re-upload';
    }
  });

  // upload fallback inside the Registry / Electricity sub-forms (mock)
  $$('.upload-fallback').forEach((box) => {
    const kind = box.dataset.upload;
    const input = box.querySelector('.up-input');
    box.querySelector('[data-file-pick]').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      box.querySelector('[data-file-name]').textContent = input.files[0] ? input.files[0].name : 'No file chosen';
    });
    const uploadBtn = box.querySelector('[data-file-upload]');
    uploadBtn.addEventListener('click', () => {
      const file = input.files[0];
      // Re-upload: only replace the existing file once a new one is chosen & this succeeds.
      if (!file) {
        toast(upFiles[kind] ? 'Choose a replacement file first.' : 'Please choose a file to upload.');
        return;
      }
      upFiles[kind] = file;
      box.querySelector('[data-file-final]').textContent = file.name;
      box.querySelector('[data-file-name]').textContent = file.name;
      box.querySelector('[data-file-result]').hidden = false;
      uploadBtn.textContent = 'Re-upload';       // stays "Re-upload" for every subsequent replace
      toast('Document uploaded.', true);
    });
    box.querySelector('[data-file-preview]').addEventListener('click', () => {
      const file = upFiles[kind];
      if (file) window.open(URL.createObjectURL(file), '_blank');
      else toast('No preview available.');
    });
    box.querySelector('[data-file-remove]').addEventListener('click', () => {
      delete upFiles[kind];
      input.value = '';
      box.querySelector('[data-file-name]').textContent = 'No file chosen';
      box.querySelector('[data-file-result]').hidden = true;
      uploadBtn.textContent = 'Upload';
    });
  });

  // Cancel / Save at the bottom of a row's Registry / Electricity sub-form
  $$('[data-detail-cancel]').forEach((b) => b.addEventListener('click', closeDocCard));
  $$('[data-detail-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.detailSave;
      const block = btn.closest('.row-detail');
      const idx = DOCS.findIndex((d) => d.detail === kind);
      const tb = block.querySelector('.tbl tbody');
      const hasRow = tb && !tb.classList.contains('empty-state') && !!tb.querySelector('tr');
      const hasFile = !!upFiles[kind];
      const idInput = block.querySelector('#regNo, #kNo');
      const idVal = idInput ? (idInput.value || '').trim() : '';

      if (!hasRow && !hasFile) {
        toast(kind === 'registry'
          ? 'Enter the Registry Number and fetch details, or upload the registry document.'
          : 'Enter the K Number and fetch details, or upload the connection document.');
        return;
      }

      if (idx >= 0) {
        DOCS[idx].uploaded = true;
        DOCS[idx].name = hasFile ? upFiles[kind].name
          : (idVal ? (kind === 'registry' ? 'Registry No. ' + idVal : 'K No. ' + idVal) : 'Fetched details');
        if (hasFile) docFiles[idx] = upFiles[kind];
      }
      const data = {
        method: hasFile ? 'upload' : 'fetch',
        ref: idVal,
        fileName: hasFile ? upFiles[kind].name : '',
        rows: hasRow ? detailRows[kind] : null      // keep fetched table so "View" can redraw it
      };
      setFlow(kind === 'registry'
        ? { registryDone: true, registryData: data }
        : { electricityDone: true, electricityData: data });
      persistDocs();
      openDocIdx = null;
      openViewIdx = idx >= 0 ? idx : null;   // Save -> back to READ-ONLY view with the updated data
      renderDocTable();
      toast((kind === 'registry' ? 'Registry' : 'Electricity connection') + ' details saved.', true);
    });
  });

  /* ---- Save & Proceed ---- */
  const save = $('#saveDocuments');
  if (save) {
    save.addEventListener('click', () => {
      const missingDocs = DOCS.some((d) => d.type === 'mandatory' && !d.uploaded);
      if (missingDocs) {
        toast('Please upload all Mandatory documents before proceeding.');
        $$('#docRows tr[data-doc-idx]').forEach((r) => {
          const d = DOCS[parseInt(r.dataset.docIdx, 10)];
          if (d && d.type === 'mandatory' && !d.uploaded) r.classList.add('is-missing');
        });
        setTimeout(() => { $$('#docRows tr.is-missing').forEach((r) => r.classList.remove('is-missing')); }, 2600);
        const dt = $('.doc-tbl');
        if (dt) dt.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      setFlow({
        uploadedDocs: DOCS.filter((d) => d.uploaded).map((d) => d.req),
        uploadedDocNames: DOCS.filter((d) => d.uploaded).map((d) => d.name || d.req),
        documentsVerified: true,
        submitted: false
      });
      window.location.href = 'final-submission.html';
    });
  }
}

/* ------------------------------------------------------------------ */
/* Review Application                                                 */
/* ------------------------------------------------------------------ */
const TYPE_LABELS = {
  self: 'Self', poa: 'POA', minor: 'Minor', company: 'Company', poaCompany: 'POA of Company'
};

function initReviewPage() {
  // Re-entering the flow: this application isn't submitted yet, so the
  // Final Submission page must show the payment form, not the success screen.
  if (getFlow().submitted) setFlow({ submitted: false });
  if (getFlow().editReturn) setFlow({ editReturn: false });

  const root = $('#reviewSummary');
  if (root) root.innerHTML = buildSummaryHtml();

  const print = $('#printReview');
  if (print) print.addEventListener('click', () => window.print());
}

/* ------------------------------------------------------------------ */
/* Final Submission                                                    */
/* ------------------------------------------------------------------ */
function finalSection(title, rows, editHref) {
  const body = (rows || []).map((r) => {
    if (r && !Array.isArray(r) && r.group) {
      return '<div class="summary-row grp"><dt>' + esc(r.label) + '</dt></div>';
    }
    const label = Array.isArray(r) ? r[0] : r.label;
    const value = Array.isArray(r) ? r[1] : r.value;
    return '<div class="summary-row"><dt>' + esc(label) + '</dt><dd>' + esc(value || '\u2014') + '</dd></div>';
  }).join('');
  const edit = editHref
    ? '<a class="btn btn-outline btn-sm summary-edit" href="' + esc(editHref) + '" data-edit>Edit</a>'
    : '';
  return '<div class="summary-card"><h3>' + esc(title) + edit + '</h3><dl class="summary-grid">' + body + '</dl></div>';
}

/* Shared summary markup used by both Review Application and Final Submission */
function buildSummaryHtml() {
  const flow = getFlow();
  let html = '';

  const applicantHref = 'applicant-profile.html' + (flow.applicantType ? '?type=' + flow.applicantType : '');

  // step 1 + applicant profile overview
  html += finalSection('Service & Applicant', [
    ['Service', flow.service],
    ['Sub Service', flow.subService],
    ['Based On', flow.basedOn],
    ['Applicant Type', TYPE_LABELS[flow.applicantType]]
  ], 'choose-service.html');

  // every filled form detail — one card per applicant (sub-forms merged inside)
  (flow.formSections || []).forEach((sec) => {
    const t = sec.title || 'Details';
    const href = /witness/i.test(t) ? 'witness-details.html' : applicantHref;
    html += finalSection(t, sec.rows || [], href);
  });

  // property + documents
  const props = flow.propertyRecords || [];
  const docRows = [];
  if (props.length === 1) {
    const p = props[0];
    docRows.push(
      ['Property ID', p.id], ['Zone', p.zone], ['Scheme', p.scheme],
      ['Sector & Plot No', p.sectorPlot], ['Area', p.area],
      ['Area Unit', p.unit], ['Owner Name', p.owner]
    );
  } else if (props.length > 1) {
    docRows.push(['Property', props.length + ' record(s) selected']);
  }
  docRows.push(['Documents', flow.documentsVerified ? 'Verified' : null]);
  (flow.uploadedDocNames || []).forEach((n, i) => docRows.push(['Document ' + (i + 1), n]));

  const detailLabel = (d) => !d ? 'Provided'
    : (d.method === 'upload' ? ('Uploaded — ' + (d.fileName || 'document'))
       : ('Fetched' + (d.ref ? ' (' + d.ref + ')' : '')));
  if (flow.registryDone) docRows.push(['Registry Details', detailLabel(flow.registryData)]);
  if (flow.electricityDone) docRows.push(['Electricity Connection', detailLabel(flow.electricityData)]);

  html += finalSection('Property & Documents', docRows, 'property-profile.html');

  return html;
}

function renderFinalSummary() {
  const root = $('#finalSummary');
  if (root) root.innerHTML = buildSummaryHtml();
}

function initFinalPage() {
  // arrived back at the review — the edit round-trip is complete
  if (getFlow().editReturn) setFlow({ editReturn: false });

  renderFinalSummary();

  const form = $('#finalForm');
  const success = $('#finalSuccess');

  if (getFlow().submitted && success && form) {
    form.hidden = true;
    success.hidden = false;
    return;
  }

  // "Review Application" — reveal / hide the dynamic group-wise summary
  const reviewBtn = $('#reviewApplication');
  const reviewPanel = $('#fsReviewPanel');
  if (reviewBtn && reviewPanel) {
    reviewBtn.addEventListener('click', () => {
      const open = reviewPanel.hidden;
      reviewPanel.hidden = !open;
      reviewBtn.setAttribute('aria-expanded', String(open));
      reviewBtn.textContent = open ? 'Hide Review' : 'Review Application';
      if (open) reviewPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  const submit = $('#submitFinal');
  if (!submit) return;

  submit.addEventListener('click', () => {
    const box = $('#declarationBox');
    const checked = $('input[name="declaration"]:checked');
    if (!checked) {
      if (box) box.classList.add('is-invalid');
      toast('Please accept the declaration to submit your application.');
      return;
    }
    if (box) box.classList.remove('is-invalid');
    const appNo = 'JDA/2026/' + String(Math.floor(10000 + Math.random() * 89999));
    setFlow({ submitted: true, applicationNo: appNo });
    const noEl = $('#applicationNo');
    if (noEl) noEl.textContent = appNo;
    if (form) form.hidden = true;
    if (success) success.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ------------------------------------------------------------------ */
/* Global behaviour + page bootstrap                                   */
/* ------------------------------------------------------------------ */
function initGlobal() {
  // live error clearing + input hygiene
  const HYGIENE = {
    mobile: (v) => v.replace(/\D/g, '').slice(0, 10),
    aadhaar: (v) => {
      const d = v.replace(/\D/g, '').slice(0, 12);
      return d ? d.replace(/(\d{4})(?=\d)/g, '$1 ') : '';
    }
  };

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t || !t.dataset) return;
    const field = t.closest('.field');
    if (field && field.querySelector('.err-msg')) clearFieldError(field);
    if (t.dataset.vtype && HYGIENE[t.dataset.vtype]) t.value = HYGIENE[t.dataset.vtype](t.value);
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || !t.matches) return;
    const field = t.closest('.field');
    if (field && field.querySelector('.err-msg')) clearFieldError(field);
  });

  // Review "Edit" — flag the return trip, then go to the section's own page
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.summary-edit[data-edit]');
    if (!link) return;
    e.preventDefault();
    setFlow({ editReturn: true });
    window.location.href = link.getAttribute('href');
  });

  // collapsible section bars
  document.addEventListener('click', (e) => {
    const bar = e.target.closest('[data-collapse]');
    if (!bar) return;
    const card = bar.closest('.collapsible');
    if (!card) return;
    const collapsed = card.classList.toggle('is-collapsed');
    bar.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const tog = bar.querySelector('.block-tog');
    if (tog) tog.textContent = collapsed ? '+' : '\u2212';
  });

  initCounters();
}

const PAGE_INIT = {
  property: initPropertyPage,
  documents: initDocumentsPage,
  review: initReviewPage,
  final: initFinalPage
};

document.addEventListener('DOMContentLoaded', () => {
  initGlobal();
  enhanceSelects(document); // static selects on the page (choose-service etc.)
  const page = document.body.dataset.page;
  if (PAGE_INIT[page]) PAGE_INIT[page]();
});
