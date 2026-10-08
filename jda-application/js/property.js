/* =====================================================================
   JDA Property Services — property.js   (property-profile.html)

   Step 4 · Property Profile
     • Three Bootstrap tabs: Scheme Name / Property ID / Advance Search.
     • Search → result rows (View opens the Bootstrap modal, Remove deletes).
     • Property saved before → read-only summary with an Edit button.
     • Proceed → document-section.html (or back to Final Submission when
       editing from there).
   ===================================================================== */

/* BACKEND INTEGRATION:
   Demo property records. Replace with the JDA property search API. */
var PROPERTY_SEARCH_RESULTS = [
  {
    id: '2330000017',
    zone: 'ZONE-B',
    scheme: 'VIDHYADHAR NAGAR',
    sectorPlot: '2 CANDLE WICK',
    area: '5000.00',
    unit: 'SQ. METER',
    owner: 'SANDVEEK PUBLIC SCHOOL'
  }
];

// Labels used by the result modal and the saved summary.
var PROPERTY_FIELDS = [
  ['id', 'Property ID'], ['zone', 'Zone'], ['scheme', 'Scheme'],
  ['sectorPlot', 'Sector & Plot No'], ['area', 'Area'],
  ['unit', 'Area Unit'], ['owner', 'Owner Name']
];

$(function () {
  var selectedProperties = (getFlow().propertyRecords || []).slice();   // rows in the table
  var editing = false;

  /* ---------- search results table ---------- */
  function showResults() {
    var $body = $('#ppResults').empty();
    if (!selectedProperties.length) {
      $body.append('<tr class="empty-state"><td colspan="9">No data available in table</td></tr>');
      return;
    }
    $.each(selectedProperties, function (i, p) {
      $('<tr>').append(
        $('<td>').text(p.id), $('<td>').text(p.zone), $('<td>').text(p.scheme), $('<td>').text(p.sectorPlot),
        $('<td>').text(p.area), $('<td>').text(p.unit), $('<td>').text(p.owner),
        '<td><button type="button" class="tbtn tbtn-view view-link">View</button></td>',
        '<td><button type="button" class="remove-link">Remove</button></td>'
      ).appendTo($body);
    });
  }

  // Match every filled search box of the active tab against the records.
  function searchProperties() {
    var terms = $('#findPanes .tab-panel.active input[data-k]').map(function () {
      return { key: $(this).data('k'), value: $(this).val().trim().toUpperCase() };
    }).get();

    selectedProperties = $.grep(PROPERTY_SEARCH_RESULTS, function (p) {
      return terms.every(function (t) {
        var field = (t.key === 'plot' || t.key === 'sector') ? p.sectorPlot : p[t.key];
        return !t.value || String(field || '').toUpperCase().indexOf(t.value) !== -1;
      });
    });
    showResults();
  }

  function propertyDetailRows(p) {
    var $rows = $();
    $.each(PROPERTY_FIELDS, function (i, f) {
      $rows = $rows.add($('<div class="summary-row">').append($('<dt>').text(f[1]), $('<dd>').text(p[f[0]] || '—')));
    });
    return $rows;
  }

  /* ---------- saved summary (shown instead of the search) ---------- */
  function showSummaryOrSearch() {
    var saved = getFlow().propertyRecords || [];
    var showSummary = saved.length > 0 && !editing;
    var $summary = $('#propertySummary').empty().prop('hidden', !showSummary);

    if (showSummary) {
      $.each(saved, function (i, p) {
        var title = saved.length > 1 ? 'Property ' + (i + 1) : 'Property Details';
        var $heading = $('<h3>').append($('<span class="section-title-underline">').text(title));
        if (i === 0) $heading.append('<button class="btn btn-outline btn-sm summary-edit" type="button" id="editProperty">Edit</button>');
        $('<div class="summary-card">').append($heading, $('<dl class="summary-grid">').append(propertyDetailRows(p))).appendTo($summary);
      });
    }
    $('#propertySearchArea').prop('hidden', showSummary);
    $('#savePropertyEdit').prop('hidden', !editing);
  }

  function saveProperties() {
    setFlow({ propertyRecords: selectedProperties.slice(), propertyCount: selectedProperties.length });
  }

  /* ---------- events ---------- */
  $('.find-search').on('click', function () {
    showToast('Searching property records… (mock lookup)');
    // BACKEND INTEGRATION: call the property search API here instead of the timer.
    setTimeout(searchProperties, 350);
  });

  $('#ppResults').on('click', '.view-link', function () {
    var property = selectedProperties[$(this).closest('tr').index()];
    $('#propertyViewGrid').empty().append(propertyDetailRows(property));
    bootstrap.Modal.getOrCreateInstance('#propertyViewModal').show();
  });

  $('#ppResults').on('click', '.remove-link', function () {
    selectedProperties.splice($(this).closest('tr').index(), 1);
    showResults();
  });

  $('#propertySummary').on('click', '#editProperty', function () {
    editing = true;
    selectedProperties = (getFlow().propertyRecords || []).slice();
    showResults();
    showSummaryOrSearch();
    $('#propertySearchArea')[0].scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  $('#savePropertyEdit').on('click', function () {
    saveProperties();
    editing = false;
    showResults();
    showSummaryOrSearch();
    showToast('Property details updated.', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#proceedProperty').on('click', function () {
    saveProperties();
    window.location.href = getFlow().editReturn ? 'final-submission.html' : 'document-section.html';
  });

  showResults();
  showSummaryOrSearch();
});
