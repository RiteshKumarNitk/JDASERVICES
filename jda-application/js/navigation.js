/* =====================================================================
   JDA Property Services — navigation.js
   Renders the shared progress stepper and provides the cross-page
   flow store (service/type/property/document state) used by all pages.
   ===================================================================== */
'use strict';

const STEPS = [
  ['CS', 'Choose', 'Service'],
  ['AP', 'Applicant', 'Profile'],
  ['WT', 'Witness', 'Detail'],
  ['PP', 'Property', 'Profile'],
  ['DS', 'Document', 'Section'],
  ['FS', 'Final', 'Submission']
];

const FLOW_KEY = 'jdaFlow_v1';

/* ---------- tiny helpers (shared early; main.js also defines esc/$$) ---------- */
function $q(sel, ctx) { return (ctx || document).querySelector(sel); }
function $qa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- cross-page flow state ---------- */
function getFlow() {
  try { return JSON.parse(localStorage.getItem(FLOW_KEY)) || {}; } catch (e) { return {}; }
}
function setFlow(patch) {
  const next = Object.assign({}, getFlow(), patch);
  try { localStorage.setItem(FLOW_KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
  return next;
}
function clearFlow() {
  try { localStorage.removeItem(FLOW_KEY); } catch (e) { /* ignore */ }
}

function readQuery(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

/* ---------- stepper ---------- */
function renderStepper(activeIndex) {
  const ol = $q('#stepper');
  if (!ol) return;
  ol.innerHTML = '';
  STEPS.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'step';
    if (i < activeIndex) li.classList.add('is-done');
    if (i === activeIndex) li.classList.add('is-current');
    li.innerHTML =
      '<span class="step-badge">' + step[0] + '</span>' +
      '<span class="step-txt"><b>' + esc(step[1]) + '</b><span>' + esc(step[2]) + '</span></span>';
    ol.appendChild(li);
    if (i < STEPS.length - 1) {
      const sep = document.createElement('li');
      sep.className = 'step-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '>>';
      ol.appendChild(sep);
    }
  });
}

/* ---------- right info sidebar (required documents / help) ---------- */
// Fallback list if the Document Section catalogue (DOCS, defined in main.js) is unavailable
const ASIDE_DOCS_FALLBACK = [
  { req: 'Aadhaar Card', type: 'mandatory' },
  { req: 'Address Proof', type: 'mandatory' },
  { req: 'Land Documents (Khasra / Khatuni)', type: 'mandatory' },
  { req: 'Passport Size Photo', type: 'mandatory' },
  { req: 'Any other supporting document', type: 'applicable' }
];
const IC_PHONE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const IC_MAIL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>';

// A service is "chosen" once Choose Service has been completed & continued.
// This is the same condition Choose Service uses to collapse its package panel.
function serviceChosen() {
  const f = getFlow();
  return !!(f.service && f.subService && f.basedOn);
}

// Required-documents checklist for the chosen service. There is no separate
// per-service rules table in the project, so the Document Section catalogue
// (DOCS, defined in main.js) is the single source of truth; it already holds
// the requirement set for the current service (Patta).
function asideDocList() {
  const catalogue = (typeof DOCS !== 'undefined' && Array.isArray(DOCS)) ? DOCS : ASIDE_DOCS_FALLBACK;
  return catalogue.map((d) => {
    const opt = d.type === 'applicable';
    return '<li' + (opt ? ' class="is-opt"' : '') + '><span class="as-req"></span>' +
      '<span>' + esc(d.req) + (opt ? ' <em>(if applicable)</em>' : '') + '</span></li>';
  }).join('');
}

function buildAside() {
  let html = '';

  // Required Documents — only after a service has been selected & continued.
  if (serviceChosen()) {
    html += '<section class="aside-card">' +
        '<h3>Required Documents</h3><ul class="aside-docs">' + asideDocList() + '</ul>' +
      '</section>';
  }

  html += '<section class="aside-card">' +
      '<h3>Need Help?</h3><div class="aside-help">' +
        '<p>' + IC_PHONE + '<b> +91 141 2569696</b></p>' +
        '<p class="as-muted">Toll Free: 10:00 AM to 6:00 PM</p>' +
        '<p>' + IC_MAIL + '<a href="mailto:jda@rajasthan.gov.in">jda@rajasthan.gov.in</a></p>' +
      '</div>' +
    '</section>';

  return html;
}

function mountAside() {
  if (document.body.dataset.page === 'index') return;
  const pageEl = $q('.page');
  const main = pageEl && pageEl.querySelector('main');
  if (!pageEl || !main || pageEl.querySelector('.page-layout')) return;

  const layout = document.createElement('div');
  layout.className = 'page-layout';
  pageEl.insertBefore(layout, main);
  layout.appendChild(main);

  const aside = document.createElement('aside');
  aside.className = 'app-aside';
  aside.setAttribute('aria-label', 'Application help');
  aside.innerHTML = buildAside();
  layout.appendChild(aside);
}

document.addEventListener('DOMContentLoaded', () => {
  const idx = parseInt(document.body.dataset.step || '-1', 10);
  if (idx >= 0) renderStepper(idx);
  mountAside();
});
