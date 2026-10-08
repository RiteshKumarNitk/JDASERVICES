/* =====================================================================
   JDA Property Services — main.js   (loaded on EVERY page)

   Shared helpers only — each page has its own file for its logic:
     choose-service.html     → service.js
     applicant-profile.html  → applicant.js   (+ person-form.js)
     witness-details.html    → witness.js     (+ person-form.js)
     property-profile.html   → property.js
     document-section.html   → enclosures.js  + registry.js
     final-submission.html   → submission.js  (+ pdf.js)
     review-application.html → submission.js

   Contents of this file:
     1. Application data      getFlow() / setFlow()
     2. Required documents    REQUIRED_DOCUMENTS + right-hand sidebar
     3. Toast message         showToast()
     4. Validation            validateSection(), markFieldError(), clearFieldError()
     5. Input clean-up        mobile / Aadhaar formatting, textarea counters

   Libraries: jQuery 4.0.0 and Bootstrap 5.2.3 (loaded before this file).
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. APPLICATION DATA
   The whole application is kept in ONE object in localStorage
   (key "jdaFlow_v1") so it survives moving between pages:

     service, subService, basedOn          Choose Service
     applicantType, applicants[ ]          Applicant Profile (one entry per saved applicant)
     formSections[ {title, rows[]} ]       applicant + witness details (Review / PDF)
     propertyRecords[ ]                    Property Profile
     uploadedDocs[ ], uploadedDocNames[ ]  Upload Documents
     registryData, electricityData         Registry / Electricity details
     submitted, applicationNo, submittedAt Final Submission
     editReturn                            true while editing from Final Submission

   BACKEND INTEGRATION:
   Replace getFlow() / setFlow() with the server-side application model
   (load on page open, save on Continue).
   --------------------------------------------------------------------- */
var FLOW_KEY = 'jdaFlow_v1';

function getFlow() {
  try {
    return JSON.parse(localStorage.getItem(FLOW_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function setFlow(changes) {
  var flow = $.extend(getFlow(), changes);
  try {
    localStorage.setItem(FLOW_KEY, JSON.stringify(flow));
  } catch (e) {
    // private mode / storage full — the page still works, data just isn't kept
  }
  return flow;
}

/* ---------------------------------------------------------------------
   2. REQUIRED DOCUMENTS
   One list, used by the right-hand sidebar on every step and by the
   Upload Documents page (enclosures.js).
     type   "mandatory" | "applicable"
     detail "registry" | "electricity" → that row opens a lookup form
   BACKEND INTEGRATION: replace with the document list of the chosen service.
   --------------------------------------------------------------------- */
var REQUIRED_DOCUMENTS = [
  { req: 'Photo ID issued by Government (Aadhaar Card / Driving License / Passport / Voter ID)', type: 'mandatory' },
  { req: 'Registered Gift Deed', type: 'mandatory', detail: 'registry' },
  { req: 'Lease Deed (Patta) including Stamps issued by JDA', type: 'mandatory' },
  { req: 'Site Plan issued by JDA', type: 'mandatory' },
  { req: 'Allotment Letter issued by JDA', type: 'applicable' },
  { req: 'Possession Letter issued by JDA', type: 'applicable' },
  { req: 'For constructed property: latest Electricity / Water Bill', type: 'applicable', detail: 'electricity' },
  { req: 'Receipt(s) of amount deposited in JDA', type: 'applicable' }
];

// The "Required Documents" sidebar card appears once a service has been chosen.
function showRequiredDocumentsCard() {
  var flow = getFlow();
  var serviceChosen = flow.service && flow.subService && flow.basedOn;
  if (!serviceChosen || !$('#requiredDocsCard').length) return;

  var $list = $('#asideDocs').empty();
  $.each(REQUIRED_DOCUMENTS, function (i, doc) {
    var optional = doc.type === 'applicable';
    var $text = $('<span>').text(optional ? doc.req + ' ' : doc.req);
    var $item = $('<li>').append('<span class="as-req"></span>', $text);
    if (optional) {
      $item.addClass('is-opt');
      $text.append($('<em>').text('(if applicable)'));
    }
    $list.append($item);
  });
  $('#requiredDocsCard').prop('hidden', false);
}

/* ---------------------------------------------------------------------
   3. TOAST — short message at the bottom of the page
   --------------------------------------------------------------------- */
var toastTimer = null;

function showToast(message, ok) {
  var $toast = $('#toast');
  $toast
    .attr('class', ok ? 'app-toast is-ok' : 'app-toast')
    .html('<svg class="ic"><use href="#i-check"/></svg>')
    .append($('<span>').text(message))
    .prop('hidden', false);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { $toast.prop('hidden', true); }, 3200);
}

/* ---------------------------------------------------------------------
   4. VALIDATION
   Mark a field:  <div class="field"> … control … <p class="err-msg">…</p>
   Rules come from the HTML: required, data-vtype="mobile|aadhaar|email".
   --------------------------------------------------------------------- */
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatError(value, type) {
  if (!value) return '';
  if (type === 'aadhaar' && !/^\d{12}$/.test(value.replace(/\s/g, ''))) return 'Please enter a valid 12-digit Aadhaar number.';
  if (type === 'mobile' && !/^\d{10}$/.test(value)) return 'Please enter a valid 10-digit mobile number.';
  if (type === 'email' && !EMAIL_PATTERN.test(value)) return 'Please enter a valid email address.';
  return '';
}

// Searchable selects hide the real <select>; their visible part is the .ss box after it.
function visiblePart($control) {
  return $control.hasClass('ss-native') ? $control.next('.ss') : $control;
}

// The element that gets the red border.
function errorBox($control) {
  var $group = $control.closest('.input-group');
  return $group.length ? $group : visiblePart($control);
}

function clearFieldError($field) {
  $field.find('.is-invalid').removeClass('is-invalid');
  $field.find('.err-msg').remove();
}

function markFieldError($control, message) {
  var $field = $control.closest('.field');
  clearFieldError($field);
  errorBox($control).addClass('is-invalid');
  $('<p class="err-msg">').text(message).appendTo($field.length ? $field : errorBox($control).parent());
}

function clearErrors($scope) {
  $scope.find('.is-invalid').removeClass('is-invalid');
  $scope.find('.err-msg').remove();
}

function scrollToControl($control) {
  var target = $control.hasClass('ss-native') ? visiblePart($control).find('.ss-trigger')[0] : $control[0];
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/* Check every visible [required] / [data-vtype] control inside $scope.
   Shows the messages and returns false when something is wrong. */
function validateSection($scope) {
  clearErrors($scope);
  var $firstBad = null;

  $scope.find('[required], [data-vtype]').each(function () {
    var $control = $(this);
    if (!visiblePart($control).is(':visible')) return;

    var value = ($control.val() || '').trim();
    var message = '';
    if ($control.prop('required') && !value) message = 'This field is required.';
    else message = formatError(value, $control.data('vtype'));

    if (message) {
      markFieldError($control, message);
      if (!$firstBad) $firstBad = $control;
    }
  });

  if ($firstBad) scrollToControl($firstBad);
  return $firstBad === null;
}

/* ---------------------------------------------------------------------
   5. INPUT CLEAN-UP + TEXTAREA COUNTERS (work for forms loaded later too)
   --------------------------------------------------------------------- */
function cleanMobile(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function cleanAadhaar(value) {
  var digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');   // 1234 5678 9012
}

// "123/500" under every textarea[data-count]
function updateCharCounter($textarea) {
  var max = $textarea.attr('maxlength') || 500;
  $textarea.parent().find('.char-count').text($textarea.val().length + '/' + max);
}

function updateCharCounters($scope) {
  $scope.find('textarea[data-count]').each(function () { updateCharCounter($(this)); });
}

$(document).on('input', 'input, textarea', function () {
  var $input = $(this);
  var $field = $input.closest('.field');
  if ($field.find('.err-msg').length) clearFieldError($field);

  if ($input.data('vtype') === 'mobile') $input.val(cleanMobile($input.val()));
  if ($input.data('vtype') === 'aadhaar') $input.val(cleanAadhaar($input.val()));
  if ($input.is('textarea[data-count]')) updateCharCounter($input);
});

$(document).on('change', 'input, select', function () {
  var $field = $(this).closest('.field');
  if ($field.find('.err-msg').length) clearFieldError($field);
});

$(function () {
  showRequiredDocumentsCard();
  updateCharCounters($(document));
});
