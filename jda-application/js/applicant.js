/* =====================================================================
   JDA Property Services — applicant.js
   Step 2 · Applicant Profile   (applicant-profile.html)
   + the stand-alone applicant-type.html page.

   Applicant Type → form(s) loaded from /forms:
     Self            applicant-details
     POA             applicant-details + poa-details
     Minor           minor-details + guardian-details
     Company         company-details
     POA of Company  company-details + company-poa-details

   Page flow:
     • No applicant yet  → Applicant Type tabs shown, nothing selected.
     • Pick a type       → its form(s) load below the tabs.
     • Save Applicant    → validated, added to the "saved applicants" table,
                           tabs hidden again.
     • + Add More        → tabs shown again for the next (joint) applicant.
     • View / Edit / Remove on each saved row.
     • Proceed           → witness-details.html (or back to Final Submission
                           when editing from there).
   ===================================================================== */

var APPLICANT_TYPES = {
  self:       { label: 'Self',           forms: ['applicant-details'] },
  poa:        { label: 'POA',            forms: ['applicant-details', 'poa-details'] },
  minor:      { label: 'Minor',          forms: ['minor-details', 'guardian-details'] },
  company:    { label: 'Company',        forms: ['company-details'] },
  poaCompany: { label: 'POA of Company', forms: ['company-details', 'company-poa-details'] }
};

/* ---------------------------------------------------------------------
   Load the form fragment(s) of one applicant type into #sectionsRoot.
   $.parseHTML() drops <script> tags, so code injected into the fragment
   by a development server (e.g. VS Code Live Server) never runs.
   --------------------------------------------------------------------- */
var formLoadId = 0;

function loadApplicantForms(type, done) {
  var $root = $('#sectionsRoot').empty();
  var names = APPLICANT_TYPES[type] ? APPLICANT_TYPES[type].forms : [];
  var requestId = ++formLoadId;              // a newer click cancels an older load
  var fragments = [];
  var waiting = names.length;

  function showForms() {
    if (requestId !== formLoadId) return;
    $.each(names, function (i, name) {
      if (fragments[i] === null) {
        $root.append('<section class="form-card section"><div class="card-body"><p style="color:#dc2626">Could not load <strong>' +
          name + '.html</strong> — serve this app over HTTP.</p></div></section>');
      } else {
        $root.append($.parseHTML(fragments[i].trim()));
      }
    });
    initSearchSelects($root);
    updateCharCounters($root);
    initSameAddress($root);
    setFlow({ applicantType: type });
    if (done) done();
  }

  $.each(names, function (i, name) {
    // cache:false — always fetch the latest fragment
    $.ajax({ url: '../forms/' + name + '.html', dataType: 'html', cache: false })
      .done(function (html) { fragments[i] = html; })
      .fail(function () { fragments[i] = null; })
      .always(function () { if (--waiting === 0) showForms(); });
  });
  if (!names.length) showForms();
}

/* ---------------------------------------------------------------------
   Saved applicants (stored in the application data as "applicants")
   --------------------------------------------------------------------- */
function getApplicants() {
  return getFlow().applicants || [];
}

function firstValue(sections, pattern) {
  for (var s = 0; s < sections.length; s++) {
    var rows = sections[s].rows || [];
    for (var r = 0; r < rows.length; r++) if (pattern.test(rows[r].label)) return rows[r].value;
  }
  return '';
}

// One summary card per applicant for Review / Final Submission / PDF.
function applicantSummaryCards(list) {
  return $.map(list, function (applicant, i) {
    var parts = applicant.sections || [];
    var rows = [{ label: 'Applicant Type', value: applicant.typeLabel || applicant.type }];
    $.each(parts, function (j, part) {
      if (parts.length > 1) rows.push({ label: part.title, value: '', group: true });
      $.each(part.rows || [], function (k, row) { rows.push(row); });
    });
    var title = list.length > 1
      ? 'Applicant ' + (i + 1) + (applicant.typeLabel ? '  ·  ' + applicant.typeLabel : '')
      : (parts.length === 1 ? (parts[0].title || 'Applicant Details') : (applicant.typeLabel || 'Applicant Details'));
    return { title: title, rows: rows };
  });
}

function saveApplicants(list, currentType) {
  setFlow({
    applicants: list,
    applicantType: list.length ? list[list.length - 1].type : currentType,
    formSections: applicantSummaryCards(list)
  });
}

/* ---------------------------------------------------------------------
   applicant-profile.html
   --------------------------------------------------------------------- */
function initApplicantProfilePage() {
  var $root = $('#sectionsRoot');
  var editingId = null;          // id of the applicant being edited
  var addingApplicant = false;   // true after "+ Add More Applicant"
  var openDetails = {};          // ids whose View details are open

  function selectedType() {
    return $('input[name="applicantType"]:checked').val() || '';
  }

  function formIsOpen() {
    return $root.find('.form-card.section').length > 0;
  }

  function clearForm() {
    $root.empty().prop('hidden', true);
    $('input[name="applicantType"]').prop('checked', false);
  }

  function finishEntry() {
    editingId = null;
    addingApplicant = false;
    openDetails = {};
    clearForm();
    history.replaceState(null, '', location.pathname);
    render();
  }

  /* --- the saved applicants table --- */
  function savedRow(applicant, index) {
    var shown = !!openDetails[applicant.id];
    return $('<tr>').toggleClass('is-editing', applicant.id === editingId).append(
      $('<td>').text(index + 1),
      $('<td>').text(applicant.typeLabel || applicant.type),
      $('<td>').text(applicant.name || '—'),
      $('<td>').text(applicant.mobile || '—'),
      $('<td>').append($('<button class="tbtn tbtn-view" type="button">').attr('data-view', applicant.id).text(shown ? 'Hide' : 'View')),
      $('<td>').append($('<button class="tbtn tbtn-del" type="button">').attr('data-remove', applicant.id).text('Remove'))
    );
  }

  function detailRow(applicant) {
    var $card = $('<div class="sd-card">').append(
      $('<div class="sd-card-head">').append(
        '<h4 class="sd-card-title"></h4>',
        $('<button class="btn btn-outline btn-sm" type="button">').attr('data-edit', applicant.id).text('Edit')
      )
    );
    $.each(applicant.sections || [], function (i, section) {
      $('<div class="sd-group">').append(
        $('<h4>').append($('<span class="section-title-underline">').text(section.title)),
        summaryRowsElement(section.rows)
      ).appendTo($card);
    });
    return $('<tr class="saved-detail-row">').prop('hidden', !openDetails[applicant.id])
      .append($('<td colspan="6">').append($card));
  }

  function render() {
    var list = getApplicants();
    var open = formIsOpen();
    var showTypePanel = list.length === 0 || addingApplicant || !!editingId;

    $('#savedApplicants').prop('hidden', list.length === 0);
    var $rows = $('#savedRows').empty();
    $.each(list, function (i, applicant) {
      $rows.append(savedRow(applicant, i), detailRow(applicant));
    });

    $('#typePanel').prop('hidden', !showTypePanel);
    $root.prop('hidden', !open);
    $('.type-panel-foot').prop('hidden', !open);
    $('#saveApplicant').prop('hidden', !open).find('.save-label').text(editingId ? 'Update Applicant' : 'Save Applicant');
    $('#editBadge').prop('hidden', !editingId);
    $('#apHeading').text(editingId ? 'Edit Applicant Profile' : 'Applicant Profile');
    $('#typeHint').prop('hidden', !showTypePanel || open);
    $('#addMoreApplicant').prop('hidden', list.length === 0);
  }

  // Validate the open form and turn it into a saved-applicant record.
  function readApplicantForm() {
    if (!validateSection($root)) return null;
    var sections = readPersonSections($root);
    if (!sections.length) { showToast('Please fill the form before saving.'); return null; }
    var type = selectedType();
    return {
      id: 'a' + Date.now(),
      type: type,
      typeLabel: APPLICANT_TYPES[type] ? APPLICANT_TYPES[type].label : type,
      name: firstValue(sections, /name/i),
      mobile: firstValue(sections, /mobile|whats\s?app/i),
      sections: sections
    };
  }

  function editApplicant(id) {
    var applicant = $.grep(getApplicants(), function (a) { return a.id === id; })[0];
    if (!applicant) return;
    addingApplicant = false;
    openDetails = {};
    editingId = id;
    $('input[name="applicantType"][value="' + applicant.type + '"]').prop('checked', true);
    render();
    loadApplicantForms(applicant.type, function () {
      restorePersonSections($root, applicant.sections || []);
      render();
      $('#typePanel')[0].scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  /* --- events --- */

  // Applicant Type tab clicked → load that type's form(s) for a new applicant
  $('#applicantTypeGroup').on('change', 'input[name="applicantType"]', function () {
    editingId = null;
    addingApplicant = true;
    loadApplicantForms(this.value, render);
    history.replaceState(null, '', '?type=' + this.value);
  });

  $('#saveApplicant').on('click', function () {
    var record = readApplicantForm();
    if (!record) return;
    var list = getApplicants();
    if (editingId) {
      list = $.map(list, function (a) { return a.id === editingId ? $.extend({}, record, { id: editingId }) : a; });
      showToast('Applicant updated.', true);
    } else {
      list.push(record);
      showToast('Applicant saved.', true);
    }
    saveApplicants(list, selectedType());
    finishEntry();
    $('#savedApplicants')[0].scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  $('#addMoreApplicant').on('click', function () {
    addingApplicant = true;
    editingId = null;
    openDetails = {};
    clearForm();
    render();
    $('#typePanel')[0].scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  $('#savedRows').on('click', '[data-view]', function () {
    var id = $(this).attr('data-view');
    openDetails[id] = !openDetails[id];
    render();
  });

  $('#savedRows').on('click', '[data-edit]', function () {
    editApplicant($(this).attr('data-edit'));
  });

  $('#savedRows').on('click', '[data-remove]', function () {
    var id = $(this).attr('data-remove');
    delete openDetails[id];
    saveApplicants($.grep(getApplicants(), function (a) { return a.id !== id; }), selectedType());
    if (editingId === id) finishEntry(); else render();
    showToast('Applicant removed.');
  });

  $('#continueProfile').on('click', function () {
    var list = getApplicants();
    if (!list.length) {
      if (!formIsOpen()) { showToast('Please add at least one applicant.'); return; }
      var record = readApplicantForm();
      if (!record) { showToast('Please fill and save at least one applicant.'); return; }
      list = [record];
    }
    saveApplicants(list, selectedType());
    window.location.href = getFlow().editReturn ? 'final-submission.html' : 'witness-details.html';
  });

  /* --- first view --- */
  clearForm();
  render();
  // ?type=… opens that type directly (only before any applicant is saved)
  var typeFromUrl = new URLSearchParams(location.search).get('type');
  if (APPLICANT_TYPES[typeFromUrl] && getApplicants().length === 0) {
    $('input[name="applicantType"][value="' + typeFromUrl + '"]').prop('checked', true);
    loadApplicantForms(typeFromUrl, render);
  }
}

/* ---------------------------------------------------------------------
   applicant-type.html (stand-alone type picker)
   --------------------------------------------------------------------- */
function initApplicantTypePage() {
  var $group = $('#applicantTypeGroup');
  var stored = getFlow().applicantType;
  if (stored) $('input[name="applicantType"][value="' + stored + '"]').prop('checked', true);

  $group.on('change', 'input[name="applicantType"]', function () {
    setFlow({ applicantType: this.value });
    $group.find('.type-err').remove();
  });

  $('#continueType').on('click', function () {
    var type = $('input[name="applicantType"]:checked').val();
    if (!type) {
      $group.find('.type-err').remove();
      $group.append('<p class="err-msg type-err">Please select an Applicant Type.</p>');
      $group[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setFlow({ applicantType: type });
    window.location.href = 'applicant-profile.html?type=' + type;
  });
}

$(function () {
  var page = $('body').data('page');
  if (page === 'applicant-profile') initApplicantProfilePage();
  if (page === 'applicant-type') initApplicantTypePage();
});
