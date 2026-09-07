/* =====================================================================
   JDA Property Services — navigation.js
   Renders the shared progress stepper and provides the cross-page
   flow store (service/type/property/document state) used by all pages.
   ===================================================================== */
'use strict';

const STEPS = [
  ['CS', 'Choose', 'Service'],
  ['AP', 'Applicant', 'Profile'],
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

document.addEventListener('DOMContentLoaded', () => {
  const idx = parseInt(document.body.dataset.step || '-1', 10);
  if (idx >= 0) renderStepper(idx);
});
