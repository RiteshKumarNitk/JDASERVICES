/* =====================================================================
   JDA Property Services — submission.js
   Step 6 · Final Submission   (final-submission.html)
   + Review Application        (review-application.html)

   Final Submission:
     • "Review Application" opens / closes the summary (Bootstrap Collapse).
     • Every summary card has Edit → that step's page; Proceed there comes
       straight back here (editReturn).
     • Proceed to Submit → declaration must be ticked → application number
       → success screen (Download PDF is in pdf.js).
   ===================================================================== */

var APPLICANT_TYPE_LABELS = { self: 'Self', poa: 'POA', minor: 'Minor', company: 'Company', poaCompany: 'POA of Company' };

/* ---------------------------------------------------------------------
   Summary cards (same markup on both pages)
   rows: [label, value] pairs or { label, value, group }
   --------------------------------------------------------------------- */
function summaryCard(title, rows, editPage) {
  var $heading = $('<h3>').append($('<span class="section-title-underline">').text(title));
  if (editPage) $heading.append($('<a class="btn btn-outline btn-sm summary-edit" data-edit>').attr('href', editPage).text('Edit'));

  var $grid = $('<dl class="summary-grid">');
  $.each(rows || [], function (i, row) {
    var label = Array.isArray(row) ? row[0] : row.label;
    var value = Array.isArray(row) ? row[1] : row.value;
    if (/aadhaar/i.test(label || '')) return;           // Aadhaar is never shown in a summary
    if (!Array.isArray(row) && row.group) {
      $grid.append($('<div class="summary-row grp">').append($('<dt>').append($('<span class="section-title-underline">').text(label))));
    } else {
      $grid.append($('<div class="summary-row">').append($('<dt>').text(label), $('<dd>').text(value || '—')));
    }
  });
  return $('<div class="summary-card">').append($heading, $grid);
}

// Documents card: S.No | Document Name | View
function documentsCard() {
  var names = getFlow().uploadedDocNames || [];
  var $body = $('<tbody>');
  if (!names.length) {
    $body.append('<tr class="empty-state"><td colspan="3">No documents uploaded yet</td></tr>');
  }
  $.each(names, function (i, name) {
    $('<tr>').append(
      $('<td>').text(i + 1),
      $('<td class="rv-doc-name">').text(name),
      $('<td>').append($('<button type="button" class="tbtn tbtn-view">').attr('data-review-doc', i).text('View'))
    ).appendTo($body);
  });

  return $('<div class="summary-card">').append(
    $('<h3>').append('<span class="section-title-underline">Documents</span>',
      '<a class="btn btn-outline btn-sm summary-edit" href="document-section.html" data-edit>Edit</a>'),
    $('<div class="table-wrap rv-doc-wrap">').append(
      $('<table class="tbl rv-doc-tbl">').append('<thead><tr><th>S.No</th><th>Document Name</th><th>View</th></tr></thead>', $body)
    )
  );
}

function applicationSummary() {
  var flow = getFlow();
  var applicantPage = 'applicant-profile.html' + (flow.applicantType ? '?type=' + flow.applicantType : '');
  var $cards = $();

  $cards = $cards.add(summaryCard('Service & Applicant', [
    ['Service', flow.service],
    ['Sub Service', flow.subService],
    ['Based On', flow.basedOn],
    ['Applicant Type', APPLICANT_TYPE_LABELS[flow.applicantType]]
  ], 'choose-service.html'));

  // one card per applicant, then the witness
  $.each(flow.formSections || [], function (i, section) {
    var title = section.title || 'Details';
    $cards = $cards.add(summaryCard(title, section.rows, /witness/i.test(title) ? 'witness-details.html' : applicantPage));
  });

  var properties = flow.propertyRecords || [];
  var propertyRows = [];
  if (properties.length === 1) {
    var p = properties[0];
    propertyRows = [['Property ID', p.id], ['Zone', p.zone], ['Scheme', p.scheme], ['Sector & Plot No', p.sectorPlot],
                    ['Area', p.area], ['Area Unit', p.unit], ['Owner Name', p.owner]];
  } else if (properties.length > 1) {
    propertyRows = [['Property', properties.length + ' record(s) selected']];
  }
  $cards = $cards.add(summaryCard('Property Profile', propertyRows, 'property-profile.html'));

  return $cards.add(documentsCard());
}

/* ---------------------------------------------------------------------
   Events used on both pages
   --------------------------------------------------------------------- */
// Edit on a summary card → that step's page, then straight back here
$(document).on('click', '.summary-edit[data-edit]', function (e) {
  e.preventDefault();
  setFlow({ editReturn: true });
  window.location.href = $(this).attr('href');
});

// View in the Documents card — read-only preview only
$(document).on('click', '[data-review-doc]', function () {
  var name = (getFlow().uploadedDocNames || [])[Number($(this).attr('data-review-doc'))] || 'document';
  showToast('Viewing ' + name + ' (no local preview after navigation).');
});

/* ---------------------------------------------------------------------
   final-submission.html
   --------------------------------------------------------------------- */
function initFinalSubmissionPage() {
  if (getFlow().editReturn) setFlow({ editReturn: false });   // the edit round-trip is complete
  $('#finalSummary').empty().append(applicationSummary());

  if (getFlow().submitted) {
    $('#finalForm').prop('hidden', true);
    $('#finalSuccess').prop('hidden', false);
    return;
  }

  // Review Application — Bootstrap Collapse opens / closes #fsReviewPanel
  $('#fsReviewPanel')
    .on('shown.bs.collapse', function () {
      $('#reviewApplication').text('Hide Review');
      this.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    })
    .on('hidden.bs.collapse', function () {
      $('#reviewApplication').text('Review Application');
    });

  $('#submitFinal').on('click', function () {
    var $declaration = $('#declarationBox');
    if (!$('#fsDeclare').prop('checked')) {
      $declaration.addClass('is-invalid');
      showToast('Please accept the declaration to submit your application.');
      return;
    }
    $declaration.removeClass('is-invalid');

    // BACKEND INTEGRATION: submit the application; the server returns the application number.
    var applicationNo = 'JDA/2026/' + String(Math.floor(10000 + Math.random() * 89999));
    setFlow({ submitted: true, applicationNo: applicationNo, submittedAt: new Date().toISOString() });
    $('#applicationNo').text(applicationNo);
    $('#finalForm').prop('hidden', true);
    $('#finalSuccess').prop('hidden', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#printReceipt').on('click', function () { window.print(); });
}

/* ---------------------------------------------------------------------
   review-application.html
   --------------------------------------------------------------------- */
function initReviewPage() {
  // coming back into the flow: not submitted yet, not an edit round-trip
  if (getFlow().submitted) setFlow({ submitted: false });
  if (getFlow().editReturn) setFlow({ editReturn: false });
  $('#reviewSummary').empty().append(applicationSummary());
  $('#printReview').on('click', function () { window.print(); });
}

$(function () {
  var page = $('body').data('page');
  if (page === 'final') initFinalSubmissionPage();
  if (page === 'review') initReviewPage();
});
