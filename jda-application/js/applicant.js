/* =====================================================================
   JDA Property Services — applicant.js
   Applicant type selection (applicant-type.html) and the dynamic
   applicant-profile.html page that loads the matching form fragments
   from the /forms folder into one flow.
   ===================================================================== */
'use strict';

const TYPE_OPTIONS = [
  ['self', 'Self'],
  ['poa', 'POA'],
  ['minor', 'Minor'],
  ['company', 'Company'],
  ['poaCompany', 'POA of Company']
];

// Form fragment (from /forms) rendered for each applicant type.
const TYPE_FORMS = {
  self: ['applicant-details'],
  poa: ['applicant-details', 'poa-details'],
  minor: ['minor-details', 'guardian-details'],
  company: ['company-details'],
  poaCompany: ['company-details', 'company-poa-details']
};

// Mock e-KYC data used by "Fetch Detail" for local demonstration only.
// Replace with the live Aadhaar/KYC integration when available.
const PROFILES = {
  applicant:  { name: 'ARUN KUMAR SHARMA', father: 'RAKESH KUMAR SHARMA', mobile: '9829012345', relation: 'Father', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039', email: 'arun.sharma@example.com', whatsapp: '9829012345' },
  poa:        { name: 'VIKASH SINGH',      father: 'SURESH SINGH',      mobile: '9812233445', relation: 'Father', address: '45-B, Malviya Nagar, Jaipur, Rajasthan 302017', email: 'vikash.singh@example.com', whatsapp: '9812233445' },
  witness:    { name: 'DEEPAK VERMA',      father: 'RAMESH VERMA',      relation: 'Other',  address: '7, Bani Park, Jaipur, Rajasthan 302016' },
  minor:      { name: 'ADITYA SHARMA',     father: 'ARUN KUMAR SHARMA', mobile: '9829012345', relation: 'Father', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039' },
  guardian:   { name: 'ARUN KUMAR SHARMA', father: 'RAKESH KUMAR SHARMA', mobile: '9829012345', relation: 'Father', email: 'arun.sharma@example.com', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039' },
  company:    { name: 'NEERAJ MEENA',      father: 'MOHAN LAL MEENA',   mobile: '9887766554', address: 'Plot 21, Sitapura Industrial Area, Tonk Road, Jaipur, Rajasthan 302022' },
  companyPoa: { name: 'NEERAJ MEENA',      father: 'MOHAN LAL MEENA',   mobile: '9887766554', address: 'Plot 21, Sitapura Industrial Area, Jaipur' }
};

function formUrl(name) {
  // pages/applicant-profile.html -> ../forms/<name>.html
  return new URL('../forms/' + name + '.html', window.location.href).href;
}

/* ------------------------------------------------------------------ */
/* Shared: mark/clear a group-level error (used next to radio groups)  */
/* ------------------------------------------------------------------ */
function groupError(groupEl, message) {
  if (!groupEl) return;
  clearGroupError(groupEl);
  const p = document.createElement('p');
  p.className = 'err-msg type-err';
  p.textContent = message;
  groupEl.appendChild(p);
}

function clearGroupError(groupEl) {
  if (!groupEl) return;
  const old = groupEl.querySelector('.type-err');
  if (old) old.remove();
}

/* ------------------------------------------------------------------ */
/* applicant-type.html — pick the type, then continue                  */
/* ------------------------------------------------------------------ */
function initApplicantTypePage() {
  // preselect from flow
  const stored = getFlow().applicantType;
  if (stored) {
    const radio = $('input[name="applicantType"][value="' + stored + '"]');
    if (radio) radio.checked = true;
  }

  const group = $('#applicantTypeGroup');
  const continueBtn = $('#continueType');

  if (group) {
    group.addEventListener('change', () => {
      const radio = $('input[name="applicantType"]:checked', group);
      if (radio) setFlow({ applicantType: radio.value });
      clearGroupError(group);
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      const radio = $('input[name="applicantType"]:checked');
      if (!radio) {
        groupError(group, 'Please select an Applicant Type.');
        group.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      setFlow({ applicantType: radio.value });
      window.location.href = 'applicant-profile.html?type=' + radio.value;
    });
  }
}

/* ------------------------------------------------------------------ */
/* applicant-profile.html — render the forms for the chosen type       */
/* ------------------------------------------------------------------ */
async function loadForms(type, container) {
  // last request wins — rapid type switching can never clear newer forms
  const ticket = (loadForms._t = (loadForms._t || 0) + 1);
  const names = TYPE_FORMS[type] || [];
  container.innerHTML = '';
  container.hidden = names.length === 0;

  for (const name of names) {
    let html = '';
    try {
      // no-store: always pull the latest fragment (avoids stale cached forms in local dev)
      const res = await fetch(formUrl(name), { cache: 'no-store' });
      html = await res.text();
    } catch (e) {
      html = '<section class="form-card section"><div class="card-body">' +
             '<p style="color:#dc2626">Could not load <strong>' + esc(name) + '.html</strong> \u2014 serve this app over HTTP.</p>' +
             '</div></section>';
    }
    if (ticket !== loadForms._t) return; // a newer selection superseded this one
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    Array.from(wrap.children).forEach((node) => container.appendChild(node));
  }

  if (ticket !== loadForms._t) return;

  // (re)initialise everything the injected fragments need
  enhanceSelects(container);
  initCounters(container);
  bindFetches(container);

  // Individual / Joint applies to every applicant type
  const modeGroup = $('#applicantModeGroup');
  if (modeGroup) modeGroup.hidden = false;

  setFlow({ applicantType: type });
}

/* ------------------------------------------------------------------ */
/* Capture every filled detail into the flow store (used by Review &   */
/* Final Submission)                                                   */
/* ------------------------------------------------------------------ */
const PILL_MAPS = {
  applicantMode: { label: 'Applicant Mode', values: { individual: 'Individual', joint: 'Joint' } },
  'aadhaar-applicant': { label: 'Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-poa': { label: 'POA Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-witness': { label: 'Witness Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-minor': { label: 'Minor Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-guardian': { label: 'Guardian Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-company': { label: 'Company Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } },
  'aadhaar-companyPoa': { label: 'POA Aadhaar', values: { with: 'With Aadhaar', without: 'Without Aadhaar' } }
};

function visibleValue(el) {
  // searchable selects keep a hidden native control — judge visibility via the widget
  const host = (el.classList && el.classList.contains('ss-native') && el._ss) ? el._ss.root : el;
  if (host.hidden || host.closest('[hidden]')) return '';
  return (el.value || '').trim();
}

function collectFormSections(container) {
  const sections = [];

  container.querySelectorAll('.form-card.section').forEach((card, idx) => {
    const titleEl = card.querySelector('.block-title, .head-txt h2, .card-head h2, .page-hero h1');
    const title = (titleEl && titleEl.textContent.trim()) || 'Details';
    const rows = [];
    const seen = new Set();

    // Individual / Joint sits on the page — record it against the first section
    if (idx === 0) {
      const mg = $('#applicantModeGroup');
      const mode = mg && !mg.hidden ? $('input[name="applicantMode"]:checked', mg) : null;
      if (mode) rows.push({ label: PILL_MAPS.applicantMode.label, value: PILL_MAPS.applicantMode.values[mode.value] || mode.value });
    }

    // pill-style groups (Individual/Joint, With/Without Aadhaar)
    card.querySelectorAll('input[type="radio"]:checked').forEach((r) => {
      const map = PILL_MAPS[r.name];
      if (!map || !r.checked) return;
      rows.push({ label: map.label, value: (map.values && map.values[r.value]) || r.value });
      seen.add(r.name);
    });

    // labelled fields with a value
    card.querySelectorAll('.field').forEach((field) => {
      if (field.closest('[hidden]')) return;
      const labelEl = field.querySelector('.field-head .f-label');
      if (!labelEl) return;
      const label = labelEl.textContent.replace(/\s*\*\s*$/, '').trim();
      const control =
        field.querySelector('select.ss-native, input:not([type="radio"]):not([type="checkbox"]), textarea');
      if (!control || seen.has(label)) return;
      const val = visibleValue(control);
      if (val) rows.push({ label: label, value: val });
    });

    if (rows.length) sections.push({ title: title, rows: rows });
  });

  return sections;
}

function saveFormSections(container) {
  if (!container.querySelector('.form-card')) return; // never wipe while empty
  setFlow({ formSections: collectFormSections(container) });
}

function bindSaveSections(container) {
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveFormSections(container), 400);
  };
  container.addEventListener('input', schedule);
  container.addEventListener('change', schedule);
}

/* ------------------------------------------------------------------ */
/* Aadhaar-sourced fields: shown read-only, released on "Without Aadhaar" */
/* ------------------------------------------------------------------ */
function fireInput(el) {
  if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
}

// Mark / release the [data-aadhaar-lock] fields inside a form card
function setAadhaarLock(scope, locked) {
  $$('[data-aadhaar-lock]', scope).forEach((el) => {
    if (el.classList.contains('ss-native') && el._ss) {
      locked ? el._ss.disable() : el._ss.enable();
    } else {
      el.readOnly = locked;
    }
    el.classList.toggle('is-locked', locked);
  });
}

// WhatsApp number defaults to the (Aadhaar) mobile number but stays editable
function syncWhatsApp(scope) {
  const mob = $('[data-auto="mobile"]', scope);
  const wa = $('[data-auto="whatsapp"]', scope);
  if (mob && wa) { wa.value = mob.value; fireInput(wa); }
}

/* With Aadhaar  => Aadhaar fields prefilled from the profile + read-only
   Without Aadhaar => same fields cleared and released for manual entry
   Works for every form card that has a .fetch-block (applicant, POA,
   minor, guardian, company POA, witness). */
function applyAadhaarMode(article, withAadhaar) {
  if (!article) return;
  const block = article.querySelector('.fetch-block');
  const profile = (block && PROFILES[block.dataset.block]) || {};

  $$('[data-aadhaar-lock]', article).forEach((el) => {
    const val = withAadhaar ? profile[el.dataset.auto] : '';
    if (el.classList.contains('ss-native') && el._ss) el._ss.setValue(val || '', true);
    else el.value = val == null ? '' : val;
    fireInput(el);
  });

  if (withAadhaar) syncWhatsApp(article);
  setAadhaarLock(article, withAadhaar);
}

function bindFetches(scope) {
  $$('.fetch-block', scope).forEach((block) => {
    const btn = $('[data-fetch]', block);
    const aadhaarInput = $('[data-aadhaar]', block);
    if (!btn || !aadhaarInput) return;

    btn.addEventListener('click', () => {
      const digits = (aadhaarInput.value || '').replace(/\D/g, '');
      if (digits.length !== 12) {
        markError(aadhaarInput, 'Please enter a valid 12-digit Aadhaar number.');
        return;
      }
      clearFieldError(aadhaarInput.closest('.field'));
      btn.classList.add('is-loading');
      btn.disabled = true;

      setTimeout(() => {
        const profile = PROFILES[block.dataset.block] || {};
        const article = block.closest('.form-card') || block;
        $$('[data-auto]', article).forEach((el) => {
          const val = profile[el.dataset.auto];
          if (val == null || val === '') return;
          if (el.classList.contains('ss-native') && el._ss) el._ss.setValue(val, true);
          else el.value = val;
          const field = el.closest('.field');
          if (field) clearFieldError(field);
        });
        syncWhatsApp(article);
        setAadhaarLock(article, true);
        btn.classList.remove('is-loading');
        btn.disabled = false;
        toast('Details fetched successfully.', true);
      }, 700);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Multi-applicant collection (Individual = one, Joint = many)         */
/* ------------------------------------------------------------------ */
function getApplicants() { return getFlow().applicants || []; }

function pickValue(sections, re) {
  for (const s of sections) for (const r of (s.rows || [])) if (re.test(r.label)) return r.value;
  return '';
}

// Flatten saved applicants into the { title, rows } shape Review / Final expect
function flattenApplicants(list) {
  const many = list.length > 1;
  // one card per applicant — all its sub-forms merged inside
  return list.map((a, i) => {
    const subs = a.sections || [];
    const rows = [{ label: 'Applicant Type', value: a.typeLabel || a.type }];
    subs.forEach((s) => {
      if (subs.length > 1) rows.push({ label: s.title, value: '', group: true });
      (s.rows || []).forEach((r) => rows.push(r));
    });
    const title = many
      ? 'Applicant ' + (i + 1) + (a.typeLabel ? '  ·  ' + a.typeLabel : '')
      : (subs.length === 1 ? (subs[0].title || 'Applicant Details') : (a.typeLabel || 'Applicant Details'));
    return { title: title, rows: rows };
  });
}

function initApplicantProfilePage() {
  let type = readQuery('type') || getFlow().applicantType || 'self';
  if (!TYPE_FORMS[type]) type = 'self';
  const container = $('#sectionsRoot');
  if (!container) return;

  const radio = $('input[name="applicantType"][value="' + type + '"]');
  if (radio) radio.checked = true;

  const panel = $('#typePanel');
  const savedWrap = $('#savedApplicants');
  const savedRows = $('#savedRows');
  const addMoreBtn = $('#addMoreApplicant');
  const saveBtn = $('#saveApplicant');
  const modeGroup = $('#applicantModeGroup');

  // restore Individual / Joint choice
  const savedMode = getFlow().applicantMode;
  if (savedMode && modeGroup) {
    const mr = $('input[name="applicantMode"][value="' + savedMode + '"]', modeGroup);
    if (mr) mr.checked = true;
  }

  const currentMode = () => {
    const m = modeGroup && $('input[name="applicantMode"]:checked', modeGroup);
    return m ? m.value : 'individual';
  };
  const currentType = () => {
    const t = $('input[name="applicantType"]:checked');
    return t ? t.value : type;
  };

  function persist(list) {
    setFlow({
      applicants: list,
      applicantMode: currentMode(),
      applicantType: list.length ? list[list.length - 1].type : currentType(),
      formSections: flattenApplicants(list)
    });
  }

  function render(showForm) {
    const list = getApplicants();
    if (savedWrap) savedWrap.hidden = list.length === 0;

    if (savedRows) {
      savedRows.innerHTML = '';
      list.forEach((a, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td>' + esc(a.typeLabel || a.type) + '</td>' +
          '<td>' + esc(a.name || '—') + '</td>' +
          '<td>' + esc(a.mobile || '—') + '</td>' +
          '<td><button class="tbtn tbtn-view" type="button" data-view="' + a.id + '">View</button></td>' +
          '<td><button class="tbtn tbtn-del" type="button" data-remove="' + a.id + '">Remove</button></td>';
        savedRows.appendChild(tr);

        const dr = document.createElement('tr');
        dr.className = 'saved-detail-row';
        dr.dataset.detail = a.id;
        dr.hidden = true;
        dr.innerHTML = '<td colspan="6">' + (a.sections || []).map((s) =>
          '<div class="sd-group"><h4>' + esc(s.title) + '</h4><dl>' +
          (s.rows || []).map((r) => '<div><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value || '—') + '</dd></div>').join('') +
          '</dl></div>').join('') + '</td>';
        savedRows.appendChild(dr);
      });
    }

    const hasSaved = list.length > 0;
    if (panel) panel.hidden = hasSaved && !showForm;
    if (addMoreBtn) addMoreBtn.hidden = !(currentMode() === 'joint' && hasSaved) || !!showForm;
  }

  function snapshotForm() {
    const bad = validateScope(container);
    if (bad) return null;
    const sections = collectFormSections(container);
    if (!sections.length) { toast('Please fill the form before saving.'); return null; }
    const t = currentType();
    return {
      id: 'a' + Date.now(),
      type: t,
      typeLabel: TYPE_LABELS[t] || t,
      name: pickValue(sections, /name/i),
      mobile: pickValue(sections, /mobile|whats\s?app/i),
      sections: sections
    };
  }

  // type tabs — reload the matching form(s)
  const group = $('#applicantTypeGroup');
  if (group) {
    group.addEventListener('change', (e) => {
      if (e.target.name !== 'applicantType') return;
      loadForms(e.target.value, container);
      history.replaceState(null, '', '?type=' + e.target.value);
    });
  }

  // Individual / Joint
  if (modeGroup) {
    modeGroup.addEventListener('change', (e) => {
      if (e.target.name !== 'applicantMode') return;
      let list = getApplicants();
      if (e.target.value === 'individual' && list.length > 1) {
        list = list.slice(0, 1);
        toast('Individual mode keeps a single applicant.');
      }
      persist(list);
      render(list.length === 0);
    });
  }

  // fragment-internal radio toggles (Aadhaar with / without)
  container.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.matches('input[type="radio"]')) return;
    if (t.name && t.name.indexOf('aadhaar-') === 0) {
      const article = t.closest('.form-card');
      const block = article && article.querySelector('.fetch-block');
      if (block) block.hidden = t.value !== 'with';
      applyAadhaarMode(article, t.value === 'with');
    }
  });

  // Save the applicant currently on screen
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const rec = snapshotForm();
      if (!rec) return;
      persist(getApplicants().concat([rec]));
      render(false);
      toast('Applicant saved.', true);
      if (savedWrap) savedWrap.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  // Add More Applicant (Joint) — reopen a blank form
  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      loadForms(currentType(), container);
      render(true);
      if (panel) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  // table actions — view / remove
  if (savedRows) {
    savedRows.addEventListener('click', (e) => {
      const v = e.target.closest('[data-view]');
      const d = e.target.closest('[data-remove]');
      if (v) {
        const row = savedRows.querySelector('tr[data-detail="' + v.dataset.view + '"]');
        if (row) { row.hidden = !row.hidden; v.textContent = row.hidden ? 'View' : 'Hide'; }
      } else if (d) {
        const list = getApplicants().filter((a) => a.id !== d.dataset.remove);
        persist(list);
        if (!list.length) loadForms(currentType(), container);
        render(list.length === 0);
        toast('Applicant removed.');
      }
    });
  }

  // Proceed to witness
  const continueBtn = $('#continueProfile');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      let list = getApplicants();
      if (!list.length) {
        const rec = snapshotForm();
        if (!rec) { toast('Please fill and save at least one applicant.'); return; }
        list = [rec];
      }
      persist(list);
      window.location.href = 'witness-details.html';
    });
  }

  render(getApplicants().length === 0);
  loadForms(type, container);
}

/* ------------------------------------------------------------------ */
/* witness-details.html — standalone step between Applicant & Property */
/* ------------------------------------------------------------------ */
function initWitnessPage() {
  const container = $('#witnessRoot');
  if (!container) return;

  enhanceSelects(container);
  initCounters(container);
  bindFetches(container);

  // With / Without Aadhaar toggle: show/hide the fetch row + lock/release Aadhaar fields
  container.addEventListener('change', (e) => {
    if (e.target.name !== 'aadhaar-witness') return;
    const article = e.target.closest('.form-card') || container;
    const block = container.querySelector('.fetch-block');
    if (block) block.hidden = e.target.value !== 'with';
    applyAadhaarMode(article, e.target.value === 'with');
  });

  const continueBtn = $('#continueWitness');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      const bad = validateScope(container);
      if (bad) return;
      const kept = (getFlow().formSections || []).filter((s) => s.title !== 'Witness Detail');
      const witnessSection = collectFormSections(container)[0];
      setFlow({ formSections: witnessSection ? kept.concat([witnessSection]) : kept });
      window.location.href = 'property-profile.html';
    });
  }
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'applicant-type') initApplicantTypePage();
  if (page === 'applicant-profile') initApplicantProfilePage();
  if (page === 'witness-details') initWitnessPage();
});
