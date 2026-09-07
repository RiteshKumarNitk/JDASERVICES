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

/* Build widgets for every hidden native select inside a scope */
function enhanceSelects(scope) {
  $$('select.ss-native', scope || document).forEach((sel) => new SearchSelect(sel));
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

function initPropertyPage() {
  propertyRows = [];
  renderPropertyRows();

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

  const proceed = $('#proceedProperty');
  if (proceed) {
    proceed.addEventListener('click', () => {
      const patta = $('input[name="pattaType"]:checked');
      setFlow({
        pattaType: patta ? patta.value : '',
        propertyCount: propertyRows.length
      });
      window.location.href = 'document-section.html';
    });
  }
}

/* ------------------------------------------------------------------ */
/* Document Section                                                   */
/* ------------------------------------------------------------------ */
// Mock list — extend with the actual requirement set per service.
const DOCS = [
  { req: 'Photo ID issued by Government (Aadhaar Card / Driving License / Passport / Voter ID)', type: 'mandatory', uploaded: true, name: 'Photo_ID.pdf' },
  { req: 'Registered Gift Deed', type: 'mandatory', uploaded: false },
  { req: 'Lease Deed (Patta) including Stamps issued by JDA', type: 'mandatory', uploaded: false },
  { req: 'Site Plan issued by JDA', type: 'mandatory', uploaded: false },
  { req: 'Allotment Letter issued by JDA', type: 'applicable', uploaded: false },
  { req: 'Possession Letter issued by JDA', type: 'applicable', uploaded: false },
  { req: 'For constructed property: latest Electricity / Water Bill', type: 'applicable', uploaded: false },
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

function fillDetailTable(panel, topic, refValue) {
  const table = panel.querySelector('.tbl');
  const tbody = table && table.querySelector('tbody');
  if (!tbody) return;

  let cells;
  if (topic === 'Registry Number') {
    cells = [
      '1', pick(NAME_POOL), pick(FATHER_POOL), pick(ADDR_POOL),
      randDigits(4) + '/' + (2015 + Math.floor(Math.random() * 10)),
      esc(refValue), randDate(), 'Jaipur', pick(TEHSIL_POOL), 'Registered'
    ];
  } else {
    cells = [
      '1', esc(refValue), pick(NAME_POOL), pick(FATHER_POOL), pick(ADDR_POOL),
      pick(['Domestic', 'Commercial']), randDate()
    ];
  }

  tbody.classList.remove('empty-state');
  tbody.innerHTML =
    '<tr>' + cells.map((c) => '<td>' + c + '</td>').join('') +
    '<td><button type="button" class="tbtn tbtn-del remove-detail">delete</button></td></tr>';
}

function renderDocTable() {
  const tbody = $('#docRows');
  if (!tbody) return;
  tbody.innerHTML = '';

  DOCS.forEach((item, i) => {
    const tr = document.createElement('tr');
    const badge = item.type === 'mandatory' ? 'Mandatory' : 'If Applicable';
    const cls = item.type === 'mandatory' ? 'mandatory' : 'applicable';

    let action;
    if (item.uploading) {
      action = '<button type="button" class="tbtn tbtn-upload" data-act="none" disabled>Uploading\u2026</button>';
    } else if (item.uploaded) {
      action = '<button type="button" class="tbtn tbtn-ok" data-act="upload">Uploaded</button>';
    } else {
      action = '<button type="button" class="tbtn tbtn-upload" data-act="upload">Upload</button>';
    }

    const view = item.uploaded ? '<button type="button" class="tbtn tbtn-view" data-act="view">View</button>' : '';
    const del = item.uploaded ? '<button type="button" class="tbtn tbtn-del" data-act="del">delete</button>' : '';

    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td class="req-text">' + esc(item.req) + '</td>' +
      '<td><span class="req-badge ' + cls + '">' + badge + '</span></td>' +
      '<td>' + view + '</td>' +
      '<td>' + del + '</td>' +
      '<td>' + action + '</td>';
    tbody.appendChild(tr);
  });
}

function initDocumentsPage() {
  renderDocTable();

  const tbody = $('#docRows');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.tbtn[data-act]');
      if (!btn || btn.dataset.act === 'none') return;
      const tr = btn.closest('tr');
      const idx = Array.prototype.indexOf.call(tr.parentNode.children, tr);
      const item = DOCS[idx];
      if (!item) return;

      const act = btn.dataset.act;
      if (act === 'upload') {
        if (item.uploaded || item.uploading) return;
        item.uploading = true;
        renderDocTable();
        setTimeout(() => {
          item.uploading = false;
          item.uploaded = true;
          item.name = item.name || 'document_' + (idx + 1) + '.pdf';
          renderDocTable();
          toast('Document uploaded successfully.', true);
        }, 650);
      } else if (act === 'view') {
        toast('Viewing ' + (item.name || 'document') + ' (mock preview)');
      } else if (act === 'del') {
        item.uploaded = false;
        delete item.name;
        renderDocTable();
        toast('Document removed.');
      }
    });
  }

  $$('.get-detail').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.detail-card');
      const input = card.querySelector('.input');
      if (!(input.value || '').trim()) {
        markError(input, 'Please enter ' + btn.dataset.topic + '.');
        return;
      }
      clearFieldError(input.closest('.field'));
      fillDetailTable(btn.closest('.block-panel'), btn.dataset.topic, input.value.trim());
      toast('Details fetched successfully (mock \u2014 connect live API).', true);
    });
  });

  // remove a fetched Registry / Connection detail row
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('.remove-detail');
    if (!rm) return;
    const table = rm.closest('.tbl');
    const tbody = table && table.querySelector('tbody');
    if (!tbody) return;
    const cols = table.querySelectorAll('thead th').length;
    tbody.classList.add('empty-state');
    tbody.innerHTML = '<tr><td colspan="' + cols + '">No data available in table</td></tr>';
  });

  $$('.help').forEach((h) => {
    h.addEventListener('click', () => {
      toast('Help: ' + h.textContent.trim().replace(/^\?\s*/, '') + ' \u2014 guidance placeholder.');
    });
  });

  const save = $('#saveDocuments');
  if (save) {
    save.addEventListener('click', () => {
      const missing = DOCS.some((d) => d.type === 'mandatory' && !d.uploaded);
      if (missing) {
        const card = $('.block-card:last-of-type');
        if (card) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
        toast('Please upload all Mandatory documents before proceeding.');
        renderDocTable();
        const body = $('#docRows');
        DOCS.forEach((d, i) => {
          if (d.type === 'mandatory' && !d.uploaded && body.children[i]) body.children[i].classList.add('is-missing');
        });
        setTimeout(() => { $$('#docRows tr.is-missing').forEach((r) => r.classList.remove('is-missing')); }, 2600);
        return;
      }
      setFlow({
        uploadedDocs: DOCS.filter((d) => d.uploaded).map((d) => d.req),
        uploadedDocNames: DOCS.filter((d) => d.uploaded).map((d) => d.name || d.req),
        documentsVerified: true
      });
      window.location.href = 'review-application.html';
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
  const root = $('#reviewSummary');
  if (root) root.innerHTML = buildSummaryHtml();

  const print = $('#printReview');
  if (print) print.addEventListener('click', () => window.print());
}

/* ------------------------------------------------------------------ */
/* Final Submission                                                    */
/* ------------------------------------------------------------------ */
function finalSection(title, rows) {
  const body = (rows || [])
    .map((r) => '<div class="summary-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1] || '\u2014') + '</dd></div>')
    .join('');
  return '<div class="summary-card"><h3>' + esc(title) + '</h3><dl class="summary-grid">' + body + '</dl></div>';
}

/* Shared summary markup used by both Review Application and Final Submission */
function buildSummaryHtml() {
  const flow = getFlow();
  let html = '';

  // step 1 + applicant profile overview
  html += finalSection('Service & Applicant', [
    ['Service', flow.service],
    ['Sub Service', flow.subService],
    ['Based On', flow.basedOn],
    ['Applicant Type', TYPE_LABELS[flow.applicantType]]
  ]);

  // every filled form detail, grouped by the form section it belongs to
  (flow.formSections || []).forEach((sec) => {
    html += finalSection(sec.title || 'Details', (sec.rows || []).map((r) => [r.label, r.value]));
  });

  // property + documents
  const patta = flow.pattaType === 'freeHold' ? 'Free Hold' : (flow.pattaType === 'leaseHold' ? 'Lease Hold' : null);
  const docRows = [
    ['Patta Type', patta],
    ['Property', flow.propertyCount ? flow.propertyCount + ' record(s) added' : null],
    ['Documents', flow.documentsVerified ? 'Verified' : null]
  ];
  (flow.uploadedDocNames || []).forEach((n, i) => docRows.push(['Document ' + (i + 1), n]));
  html += finalSection('Property & Documents', docRows);

  return html;
}

function renderFinalSummary() {
  const root = $('#finalSummary');
  if (root) root.innerHTML = buildSummaryHtml();
}

function initFinalPage() {
  renderFinalSummary();

  const form = $('#finalForm');
  const success = $('#finalSuccess');

  if (getFlow().submitted && success && form) {
    form.hidden = true;
    success.hidden = false;
    return;
  }

  const submit = $('#submitFinal');
  if (!submit) return;

  submit.addEventListener('click', () => {
    const box = $('#declarationBox');
    const checked = $('input[name="declaration"]:checked');
    if (!checked) {
      box.classList.add('is-invalid');
      toast('Please accept the declaration to submit your application.');
      return;
    }
    box.classList.remove('is-invalid');
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
