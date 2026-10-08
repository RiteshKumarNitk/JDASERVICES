/* =====================================================================
   JDA Property Services — person-form.js
   Behaviour shared by the person forms: applicant-details, poa-details,
   minor-details, guardian-details, company-details, company-poa-details
   (applicant-profile.html) and the Witness form (witness-details.html).

   Every person form is one <section class="form-card section"> and may have:
     radios  name="aadhaar-…" value="with|without"   With / Without Aadhaar
     .fetch-block[data-block="…"]                     Aadhaar Number + Fetch Detail
     [data-auto="name|father|mobile|…"]               filled by Fetch Detail
     [data-aadhaar-lock]                              read-only while "With Aadhaar"
     [data-same-address]                              "Same as Current Address" checkbox

     With Aadhaar    → Aadhaar row shown, details filled from e-KYC and locked
     Without Aadhaar → Aadhaar row hidden, the same fields cleared and editable
                       (the rest of the form always stays visible)
   ===================================================================== */

/* BACKEND INTEGRATION:
   Demo e-KYC answers for "Fetch Detail" / "With Aadhaar".
   Replace with the Aadhaar / e-KYC API response for the entered number. */
var KYC_DEMO_PROFILES = {
  applicant:  { name: 'ARUN KUMAR SHARMA', father: 'RAKESH KUMAR SHARMA', mobile: '9829012345', relation: 'Father', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039', email: 'arun.sharma@example.com', whatsapp: '9829012345' },
  poa:        { name: 'VIKASH SINGH', father: 'SURESH SINGH', mobile: '9812233445', relation: 'Father', address: '45-B, Malviya Nagar, Jaipur, Rajasthan 302017', email: 'vikash.singh@example.com', whatsapp: '9812233445' },
  witness:    { name: 'DEEPAK VERMA', father: 'RAMESH VERMA', relation: 'Other', address: '7, Bani Park, Jaipur, Rajasthan 302016' },
  minor:      { name: 'ADITYA SHARMA', father: 'ARUN KUMAR SHARMA', mobile: '9829012345', relation: 'Father', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039' },
  guardian:   { name: 'ARUN KUMAR SHARMA', father: 'RAKESH KUMAR SHARMA', mobile: '9829012345', relation: 'Father', email: 'arun.sharma@example.com', address: '12, Vidhyadhar Nagar, Sector 4, Jaipur, Rajasthan 302039' },
  company:    { name: 'NEERAJ MEENA', father: 'MOHAN LAL MEENA', mobile: '9887766554', address: 'Plot 21, Sitapura Industrial Area, Tonk Road, Jaipur, Rajasthan 302022' },
  companyPoa: { name: 'NEERAJ MEENA', father: 'MOHAN LAL MEENA', mobile: '9887766554', address: 'Plot 21, Sitapura Industrial Area, Jaipur' }
};

// How each With/Without Aadhaar choice is named in the saved summary.
var AADHAAR_MODE_LABELS = {
  'aadhaar-applicant': 'Aadhaar',
  'aadhaar-poa': 'POA Aadhaar',
  'aadhaar-witness': 'Witness Aadhaar',
  'aadhaar-minor': 'Minor Aadhaar',
  'aadhaar-guardian': 'Guardian Aadhaar',
  'aadhaar-company': 'Company Aadhaar',
  'aadhaar-companyPoa': 'POA Aadhaar'
};

/* ---------------------------------------------------------------------
   Set a field value (input, textarea or searchable select) and let the
   page react (counters, "Same as Current Address", …).
   --------------------------------------------------------------------- */
function setFieldValue($control, value) {
  if ($control.hasClass('ss-native')) {
    setSelectValue($control, value, true);
  } else {
    $control.val(value).trigger('input');
  }
}

/* ---------------------------------------------------------------------
   With / Without Aadhaar
   --------------------------------------------------------------------- */
function demoProfileFor($card) {
  return KYC_DEMO_PROFILES[$card.find('.fetch-block').data('block')] || {};
}

// Lock (read-only) or release the Aadhaar-sourced fields of one form card.
function lockAadhaarFields($card, locked) {
  $card.find('[data-aadhaar-lock]').each(function () {
    var $control = $(this);
    if ($control.hasClass('ss-native')) setSelectDisabled($control, locked);
    else $control.prop('readOnly', locked);
    $control.toggleClass('is-locked', locked);
  });
}

// WhatsApp number defaults to the mobile number (still editable).
function copyMobileToWhatsApp($card) {
  var $mobile = $card.find('[data-auto="mobile"]');
  var $whatsapp = $card.find('[data-auto="whatsapp"]');
  if ($mobile.length && $whatsapp.length) setFieldValue($whatsapp, $mobile.val());
}

function applyAadhaarMode($card, withAadhaar) {
  var profile = demoProfileFor($card);
  $card.find('[data-aadhaar-lock]').each(function () {
    var key = $(this).data('auto');
    setFieldValue($(this), withAadhaar ? (profile[key] || '') : '');
  });
  if (withAadhaar) copyMobileToWhatsApp($card);
  lockAadhaarFields($card, withAadhaar);
}

$(document).on('change', 'input[name^="aadhaar-"]', function () {
  var $card = $(this).closest('.form-card');
  var withAadhaar = $(this).val() === 'with';
  $card.find('.fetch-block').prop('hidden', !withAadhaar);   // Aadhaar Number + Fetch Detail only
  applyAadhaarMode($card, withAadhaar);
});

/* ---------------------------------------------------------------------
   Fetch Detail
   --------------------------------------------------------------------- */
$(document).on('click', '[data-fetch]', function () {
  var $button = $(this);
  var $block = $button.closest('.fetch-block');
  var $aadhaar = $block.find('[data-aadhaar]');
  var $card = $button.closest('.form-card');

  if ($aadhaar.val().replace(/\D/g, '').length !== 12) {
    markFieldError($aadhaar, 'Please enter a valid 12-digit Aadhaar number.');
    return;
  }
  clearFieldError($aadhaar.closest('.field'));
  $button.addClass('is-loading').prop('disabled', true);

  // BACKEND INTEGRATION: call the Aadhaar / e-KYC API here instead of the timer.
  setTimeout(function () {
    var profile = KYC_DEMO_PROFILES[$block.data('block')] || {};
    $card.find('[data-auto]').each(function () {
      var value = profile[$(this).data('auto')];
      if (!value) return;
      setFieldValue($(this), value);
      clearFieldError($(this).closest('.field'));
    });
    copyMobileToWhatsApp($card);
    lockAadhaarFields($card, true);
    $button.removeClass('is-loading').prop('disabled', false);
    showToast('Details fetched successfully.', true);
  }, 700);
});

/* ---------------------------------------------------------------------
   Same as Current Address
   checked   → Permanent Address = Current Address, read-only
   unchecked → Permanent Address editable (keeps its value)
   --------------------------------------------------------------------- */
function applySameAddress($checkbox) {
  var $current = $('#' + $checkbox.data('source'));
  var $permanent = $('#' + $checkbox.data('target'));
  var same = $checkbox.prop('checked');

  if ($permanent.attr('data-was-required') === undefined) {
    $permanent.attr('data-was-required', $permanent.prop('required') ? '1' : '0');
  }
  if (same) $permanent.val($current.val()).trigger('input');
  $permanent.prop('readOnly', same).toggleClass('is-locked', same);
  // While it mirrors Current Address it is not checked on its own.
  $permanent.prop('required', $permanent.attr('data-was-required') === '1' && !same);
}

function initSameAddress($scope) {
  $scope.find('[data-same-address]').each(function () { applySameAddress($(this)); });
}

$(document).on('change', '[data-same-address]', function () {
  applySameAddress($(this));
});

// Typing in Current Address keeps the Permanent Address copy up to date.
$(document).on('input', 'textarea', function () {
  var $checkbox = $('[data-same-address][data-source="' + this.id + '"]');
  if ($checkbox.length && $checkbox.prop('checked')) applySameAddress($checkbox);
});

/* ---------------------------------------------------------------------
   Read a form into { title, rows: [{label, value}] } — the shape used by
   the saved-applicant table, the witness summary, Review and the PDF.
   --------------------------------------------------------------------- */
function fieldLabel($field) {
  return $field.find('.field-head .f-label').first().text().replace(/\s*\*\s*$/, '').trim();
}

function readPersonSections($scope) {
  var sections = [];

  $scope.find('.form-card.section').each(function () {
    var $card = $(this);
    var title = $card.find('.block-title').first().text().trim() || 'Details';
    var rows = [];

    // With / Without Aadhaar
    $card.find('input[name^="aadhaar-"]:checked').each(function () {
      rows.push({ label: AADHAAR_MODE_LABELS[this.name], value: this.value === 'with' ? 'With Aadhaar' : 'Without Aadhaar' });
    });

    // every visible labelled field that has a value
    $card.find('.field').each(function () {
      var $field = $(this);
      var label = fieldLabel($field);
      var $control = $field.find('select.ss-native, input:not([type="radio"]):not([type="checkbox"]), textarea').first();
      if (!label || !$control.length || !visiblePart($control).is(':visible')) return;
      var value = ($control.val() || '').trim();
      if (value) rows.push({ label: label, value: value });
    });

    if (rows.length) sections.push({ title: title, rows: rows });
  });

  return sections;
}

/* Put saved { title, rows } back into freshly loaded form cards (Edit). */
function restorePersonSections($scope, sections) {
  $scope.find('.form-card.section').each(function (index) {
    var section = sections[index];
    if (!section) return;
    var $card = $(this);
    var values = {};
    $.each(section.rows || [], function (i, row) { values[String(row.label).toLowerCase().trim()] = row.value; });
    useLegacyAddress(values);

    // With / Without Aadhaar first — it locks or clears the identity fields
    var $modeRadio = $card.find('input[name^="aadhaar-"]').first();
    var savedMode = $modeRadio.length && values[AADHAAR_MODE_LABELS[$modeRadio.attr('name')].toLowerCase()];
    if (savedMode) {
      var mode = /without/i.test(savedMode) ? 'without' : 'with';
      var $radio = $card.find('input[name="' + $modeRadio.attr('name') + '"][value="' + mode + '"]');
      if (!$radio.prop('checked')) $radio.prop('checked', true).trigger('change');
    }

    $card.find('.field').each(function () {
      var value = values[fieldLabel($(this)).toLowerCase()];
      if (value == null || value === '') return;
      var $control = $(this).find('select.ss-native, input:not([type="radio"]):not([type="checkbox"]), textarea').first();
      if ($control.length) setFieldValue($control, value);
    });

    restoreSameAddress($card);
  });
}

// Records saved before the Current / Permanent Address split have one
// "Address" value — use it for both so nothing is lost.
function useLegacyAddress(values) {
  if (values['current address'] != null && values['permanent address'] != null) return;
  var oldKey = Object.keys(values).filter(function (key) {
    return /address/i.test(key) && key !== 'current address' && key !== 'permanent address';
  })[0];
  if (!oldKey || !values[oldKey]) return;
  if (values['current address'] == null) values['current address'] = values[oldKey];
  if (values['permanent address'] == null) values['permanent address'] = values[oldKey];
}

// After restoring, tick "Same as Current Address" only if both really match.
function restoreSameAddress($scope) {
  var $checkbox = $scope.find('[data-same-address]').first();
  if (!$checkbox.length) return;
  var current = $('#' + $checkbox.data('source')).val();
  var permanent = $('#' + $checkbox.data('target')).val();
  $checkbox.prop('checked', current.trim() !== '' && current === permanent);
  applySameAddress($checkbox);
}

/* Summary list <dl> — Aadhaar never appears in summaries, only in the form. */
function summaryRowsElement(rows, rowClass) {
  var $dl = $('<dl>');
  $.each(rows || [], function (i, row) {
    if (/aadhaar/i.test(row.label || '')) return;
    $('<div>').addClass(rowClass || '')
      .append($('<dt>').text(row.label), $('<dd>').text(row.value || '—'))
      .appendTo($dl);
  });
  return $dl;
}
