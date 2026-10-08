/* =====================================================================
   JDA Property Services — service.js   (choose-service.html)

   Step 1 · Select Service
     Select Service  →  Developer Type  →  Applicable Provision
   Each list is filled from the one before it.
   Proceed: all three are required → saved → applicant-profile.html
   ===================================================================== */

// Applicable Provision options (same for every developer type).
var BASED_ON_OPTIONS = [
  'Purchased from Original Allottee Through Sale Deed',
  'On the basis of Death Certificate',
  'On the basis of Gift Deed'
];

// Developer Type options (same for every service).
var DEVELOPER_TYPES = ['JDA Scheme', 'Co-Operative', 'Niji Khatedar'];

// BACKEND INTEGRATION: replace with the service master (service → developer types → provisions).
var SERVICE_OPTIONS = [
  'Lease Hold E-Patta',
  'Free Hold E-Patta',
  'Free Hold E-Patta in lieu of already issued Patta (Lease Deed)'
];

$(function () {
  var $service = $('#serviceSelect');
  var $developer = $('#subServiceSelect');
  var $provision = $('#basedOnSelect');

  // Fill "Developer Type" when a service is chosen; "Applicable Provision" is reset.
  function onServiceChange() {
    setSelectValue($provision, '', true);
    setSelectOptions($provision, []);
    setSelectDisabled($provision, true);

    if (!$service.val()) {
      setSelectOptions($developer, []);
      setSelectDisabled($developer, true);
      return;
    }
    setSelectValue($developer, '', true);
    setSelectOptions($developer, DEVELOPER_TYPES);
    setSelectDisabled($developer, false);
  }

  // Fill "Applicable Provision" when a developer type is chosen.
  function onDeveloperChange() {
    setSelectValue($provision, '', true);
    if (!$developer.val()) {
      setSelectOptions($provision, []);
      setSelectDisabled($provision, true);
      return;
    }
    setSelectOptions($provision, BASED_ON_OPTIONS);
    setSelectDisabled($provision, false);
  }

  function validateChooseService() {
    var checks = [
      [$service, 'Please select a Service.'],
      [$developer, 'Please select a Sub Service.'],
      [$provision, 'Please select Applicable Provision.']
    ];
    clearErrors($('#chooseFields'));
    for (var i = 0; i < checks.length; i++) {
      if (!checks[i][0].val()) {
        markFieldError(checks[i][0], checks[i][1]);
        scrollToControl(checks[i][0]);
        return false;
      }
    }
    return true;
  }

  // Coming back to this page: show what was chosen before.
  function restoreChoice() {
    var flow = getFlow();
    if (!flow.service || SERVICE_OPTIONS.indexOf(flow.service) === -1) return;
    setSelectValue($service, flow.service, true);
    onServiceChange();
    if (DEVELOPER_TYPES.indexOf(flow.subService) === -1) return;
    setSelectValue($developer, flow.subService, true);
    onDeveloperChange();
    if (BASED_ON_OPTIONS.indexOf(flow.basedOn) !== -1) setSelectValue($provision, flow.basedOn, true);
  }

  setSelectOptions($service, SERVICE_OPTIONS);
  setSelectDisabled($developer, true);
  setSelectDisabled($provision, true);

  $service.on('change', onServiceChange);
  $developer.on('change', onDeveloperChange);

  $('#continueChoose').on('click', function () {
    if (!validateChooseService()) return;
    setFlow({ service: $service.val(), subService: $developer.val(), basedOn: $provision.val() });
    window.location.href = 'applicant-profile.html';
  });

  restoreChoice();
});
