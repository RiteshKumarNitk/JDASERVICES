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
  minor:      { name: 'ADITYA SHARMA',     father: 'ARUN KUMAR SHARMA', dob: '2013-08-21', gender: 'Male' },
  guardian:   { name: 'ARUN KUMAR SHARMA', father: 'RAKESH KUMAR SHARMA', mobile: '9829012345', relation: 'Father', email: 'arun.sharma@example.com' },
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

  const dob = $('#minorDob', container);
  if (dob) dob.max = new Date().toISOString().split('T')[0];

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

  container.querySelectorAll('.form-card.section').forEach((card) => {
    const title = (card.querySelector('.head-txt h2') || {}).textContent || 'Details';
    const rows = [];
    const seen = new Set();

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

function initApplicantProfilePage() {
  let type = readQuery('type') || getFlow().applicantType || 'self';
  if (!TYPE_FORMS[type]) type = 'self';
  const container = $('#sectionsRoot');
  if (!container) return;

  const radio = $('input[name="applicantType"][value="' + type + '"]');
  if (radio) radio.checked = true;

  // keep every filled detail in the flow store for Review / Final Submission
  bindSaveSections(container);

  // live type switching on this page
  const group = $('#applicantTypeGroup');
  if (group) {
    group.addEventListener('change', (e) => {
      if (e.target.name !== 'applicantType') return;
      loadForms(e.target.value, container);
      history.replaceState(null, '', '?type=' + e.target.value);
    });
  }

  // radio toggles inside the loaded fragments
  container.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.matches('input[type="radio"]')) return;

    if (t.name === 'applicantMode') {
      const panel = t.closest('.form-card').querySelector('[data-joint-panel]');
      if (panel) panel.hidden = t.value !== 'joint';
    } else if (t.name && t.name.indexOf('aadhaar-') === 0) {
      const article = t.closest('.form-card');
      const block = article && article.querySelector('.fetch-block');
      if (block) block.hidden = t.value !== 'with';
      applyAadhaarMode(article, t.value === 'with');
    }
  });

  const continueBtn = $('#continueProfile');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      const bad = validateScope(container);
      if (bad) return;
      const radio = $('input[name="applicantType"]:checked');
      const applicantType = radio ? radio.value : type;
      setFlow({ applicantType: applicantType, formSections: collectFormSections(container) });
      window.location.href = 'witness-details.html';
    });
  }

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
