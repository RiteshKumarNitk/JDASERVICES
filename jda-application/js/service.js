/* =====================================================================
   JDA Property Services — service.js
   Choose Service page: Service -> Sub Service -> Based On cascade with
   inline validation; the chosen options are stored for later pages.
   ===================================================================== */
'use strict';

// Main services (Select Service) with their Developer Type / Based On lists.
const BASED_ON = [
  'Purchased from Original Allottee Through Sale Deed',
  'On the basis of Death Certificate',
  'On the basis of Gift Deed'
];

// Developer Type is unchanged — same three options under every service.
const DEVELOPER_TYPES = [
  { label: 'JDA Scheme', basedOn: BASED_ON },
  { label: 'Co-Operative', basedOn: BASED_ON },
  { label: 'Niji Khatedar', basedOn: BASED_ON }
];

const SERVICES = [
  { label: 'Lease Hold E-Patta', subServices: DEVELOPER_TYPES },
  { label: 'Free Hold E-Patta', subServices: DEVELOPER_TYPES },
  { label: 'Free Hold E-Patta in lieu of already issued Patta (Lease Deed)', subServices: DEVELOPER_TYPES }
];

const SERVICE_FIELD = {
  service: 'Please select a Service.',
  subService: 'Please select a Sub Service.',
  basedOn: 'Please select Based On.'
};

function initChoosePage() {
  const service = $('#serviceSelect')._ss;
  const sub = $('#subServiceSelect')._ss;
  const based = $('#basedOnSelect')._ss;

  service.setOptions(SERVICES.map((s) => s.label));
  sub.disable();
  based.disable();

  $('#serviceSelect').addEventListener('change', () => {
    clearFieldError($('#fld-service'));
    handleServiceChange();
  });
  $('#subServiceSelect').addEventListener('change', () => {
    clearFieldError($('#fld-subservice'));
    handleSubServiceChange();
  });
  $('#basedOnSelect').addEventListener('change', () => clearFieldError($('#fld-basedon')));

  const continueBtn = $('#continueChoose');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (!validateChoose()) return;
      setFlow({
        service: $('#serviceSelect').value,
        subService: $('#subServiceSelect').value,
        basedOn: $('#basedOnSelect').value
      });
      window.location.href = 'applicant-profile.html';
    });
  }

  // restore a previously chosen selection when coming back
  restore();
}

/* Hide the optional “Package with Services” panel once step 1 is complete. */
function hidePackageWhenDone() {
  const pkg = $('.package-panel');
  if (!pkg) return;
  const flow = getFlow();
  pkg.hidden = !!(flow.service && flow.subService && flow.basedOn);
}

function currentService() {
  return SERVICES.find((s) => s.label === $('#serviceSelect').value);
}

function currentSubService() {
  const svc = currentService();
  if (!svc) return null;
  return svc.subServices.find((s) => s.label === $('#subServiceSelect').value);
}

function handleServiceChange() {
  const svc = currentService();
  const sub = $('#subServiceSelect')._ss;
  const based = $('#basedOnSelect')._ss;

  sub.setValue('', true);
  based.setOptions([]);
  based.disable();

  if (!svc) { sub.setOptions([]); sub.disable(); return; }
  sub.enable();
  sub.setOptions(svc.subServices.map((s) => s.label));
}

function handleSubServiceChange() {
  const subObj = currentSubService();
  const based = $('#basedOnSelect')._ss;
  based.setValue('', true);

  if (!subObj) { based.setOptions([]); based.disable(); return; }
  based.enable();
  based.setOptions(subObj.basedOn.map((b) => ({ value: b, label: b })));
}

function validateChoose() {
  clearErrorsIn('#chooseFields');
  const service = $('#serviceSelect');
  const sub = $('#subServiceSelect');
  const based = $('#basedOnSelect');

  const checks = [
    [service, 'service'],
    [sub, 'subService'],
    [based, 'basedOn']
  ];

  for (const [ctrl, key] of checks) {
    if (!ctrl.value) {
      markError(ctrl, SERVICE_FIELD[key]);
      scrollToControl(ctrl);
      return false;
    }
  }
  return true;
}

/* Restore selections from the flow store (e.g. after Back) */
function restore() {
  hidePackageWhenDone();

  const flow = getFlow();
  if (!flow.service) return;
  const svc = SERVICES.find((s) => s.label === flow.service);
  if (!svc) return;

  const service = $('#serviceSelect')._ss;
  service.setValue(flow.service, true);
  handleServiceChange();

  const sub = svc.subServices.find((s) => s.label === flow.subService);
  if (!sub) return;
  $('#subServiceSelect')._ss.setValue(flow.subService, true);
  handleSubServiceChange();

  if (sub.basedOn.indexOf(flow.basedOn) !== -1) {
    $('#basedOnSelect')._ss.setValue(flow.basedOn, true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'choose') initChoosePage();
});
