/* =====================================================================
   JDA Property Services — registry.js   (document-section.html)

   The two lookup forms that open inside a document row:
     #registryDetail     "Registered Gift Deed"  → Registry Number
     #electricityDetail  "Electricity / Water Bill" → K Number
   Each form: enter the number → Get Detail → one detail row,
              OR upload the document instead → Save.
   Saved as registryData / electricityData:
     { method: 'fetch'|'upload', ref, fileName, rows }
   Uses the document state from enclosures.js (loaded first).
   ===================================================================== */

var lookupRows = { registry: null, electricity: null };   // last fetched detail row
var lookupFiles = {};                                     // kind → File uploaded in this visit

/* BACKEND INTEGRATION:
   Demo answers for "Get Detail". Replace with the Registry (IGRS) and
   DISCOM (electricity) APIs. */
var DEMO_NAMES = ['ARUN KUMAR SHARMA', 'SUNITA DEVI', 'RAJESH AGARWAL', 'MOHAMMED IQBAL', 'PRIYA MEENA'];
var DEMO_FATHERS = ['RAKESH KUMAR SHARMA', 'GOPAL DAS', 'BANWARI LAL AGARWAL', 'ABDUL RAHMAN', 'HARI SINGH MEENA'];
var DEMO_ADDRESSES = ['12, Vidhyadhar Nagar, Jaipur', '45-B, Malviya Nagar, Jaipur', 'Plot 7, Mansarovar, Jaipur', '3, Bani Park, Jaipur'];

function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }

function randomDigits(count) {
  var s = '';
  for (var i = 0; i < count; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function randomDate() {
  var d = new Date(2015 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
  return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
}

function demoLookupRow(kind, number) {
  if (kind === 'registry') {
    // S.No, Party Name, Property Address, Document No, Registry No, Registry Date, Document Status
    return ['1', randomItem(DEMO_NAMES), randomItem(DEMO_ADDRESSES),
      randomDigits(4) + '/' + (2015 + Math.floor(Math.random() * 10)), number, randomDate(), 'Registered'];
  }
  // S.No, K Number, Consumer Name, Fathers Name, Address, Category Of Connection, Date Of Connection
  return ['1', number, randomItem(DEMO_NAMES), randomItem(DEMO_FATHERS), randomItem(DEMO_ADDRESSES),
    randomItem(['Domestic', 'Commercial']), randomDate()];
}

// Show one fetched row in the form's table (with a delete button).
function showLookupRow($form, cells) {
  var $row = $('<tr>');
  $.each(cells, function (i, c) { $row.append($('<td>').text(c)); });
  $row.append('<td><button type="button" class="tbtn tbtn-del remove-detail">delete</button></td>');
  $form.find('.tbl tbody').removeClass('empty-state').empty().append($row);
}

function showNoDataRow($form) {
  var columns = $form.find('.tbl thead th').length;
  $form.find('.tbl tbody').addClass('empty-state').html('<tr><td colspan="' + columns + '">No data available in table</td></tr>');
}

// Called by enclosures.js when the Registry / Electricity document is deleted.
function clearLookupForm(kind) {
  var $form = $('#' + kind + 'Detail');
  delete lookupFiles[kind];
  lookupRows[kind] = null;
  setFlow(kind === 'registry' ? { registryDone: false, registryData: null } : { electricityDone: false, electricityData: null });
  showNoDataRow($form);
  $form.find('#regNo, #kNo').val('');
  $form.find('[data-file-result]').prop('hidden', true);
  $form.find('[data-file-name]').text('No file chosen');
  $form.find('[data-file-upload]').text('Upload');
}

$(function () {
  // Saved on an earlier visit → put the number, fetched row and file name back
  var flow = getFlow();
  $.each(['registry', 'electricity'], function (i, kind) {
    var saved = flow[kind + 'Data'];
    var $form = $('#' + kind + 'Detail');
    if (!saved) return;
    if (saved.ref) $form.find('#regNo, #kNo').val(saved.ref);
    if (saved.rows && saved.rows.length) {
      lookupRows[kind] = saved.rows;
      showLookupRow($form, saved.rows);
    }
    if (saved.method === 'upload' && saved.fileName) {
      $form.find('[data-file-final]').text(saved.fileName);
      $form.find('[data-file-result]').prop('hidden', false);
      $form.find('[data-file-upload]').text('Re-upload');
    }
  });

  // Get Detail
  $(document).on('click', '.get-detail', function () {
    var $form = $(this).closest('.row-detail');
    var $number = $(this).closest('.detail-card').find('.input');
    var kind = $form.attr('id') === 'registryDetail' ? 'registry' : 'electricity';
    if (!$number.val().trim()) {
      markFieldError($number, 'Please enter ' + $(this).data('topic') + '.');
      return;
    }
    clearFieldError($number.closest('.field'));
    // BACKEND INTEGRATION: call the Registry / DISCOM API with the number.
    lookupRows[kind] = demoLookupRow(kind, $number.val().trim());
    showLookupRow($form, lookupRows[kind]);
    showToast('Details fetched successfully (mock — connect live API).', true);
  });

  // delete a fetched row
  $(document).on('click', '.remove-detail', function () {
    var $form = $(this).closest('.row-detail');
    lookupRows[$form.attr('id') === 'registryDetail' ? 'registry' : 'electricity'] = null;
    showNoDataRow($form);
  });

  $(document).on('click', '.help', function () {
    showToast('Help: ' + $(this).text().trim().replace(/^\?\s*/, '') + ' — guidance placeholder.');
  });

  /* --- upload instead of fetch --- */
  $('.upload-fallback').each(function () {
    var $box = $(this);
    var kind = $box.data('upload');
    var $input = $box.find('.up-input');
    var $uploadBtn = $box.find('[data-file-upload]');

    $box.find('[data-file-pick]').on('click', function () { $input.trigger('click'); });

    $input.on('change', function () {
      $box.find('[data-file-name]').text(this.files[0] ? this.files[0].name : 'No file chosen');
    });

    $uploadBtn.on('click', function () {
      var file = $input[0].files[0];
      if (!file) {
        showToast(lookupFiles[kind] ? 'Choose a replacement file first.' : 'Please choose a file to upload.');
        return;
      }
      lookupFiles[kind] = file;
      $box.find('[data-file-final], [data-file-name]').text(file.name);
      $box.find('[data-file-result]').prop('hidden', false);
      $uploadBtn.text('Re-upload');
      showToast('Document uploaded.', true);
    });

    $box.find('[data-file-preview]').on('click', function () {
      openFilePreview(lookupFiles[kind], 'No preview available.');
    });

    $box.find('[data-file-remove]').on('click', function () {
      delete lookupFiles[kind];
      $input.val('');
      $box.find('[data-file-name]').text('No file chosen');
      $box.find('[data-file-result]').prop('hidden', true);
      $uploadBtn.text('Upload');
    });
  });

  /* --- Cancel / Save at the bottom of the lookup form --- */
  $('[data-detail-cancel]').on('click', closeUploadCard);

  $('[data-detail-save]').on('click', function () {
    var kind = $(this).attr('data-detail-save');
    var $form = $(this).closest('.row-detail');
    var hasRow = !$form.find('.tbl tbody').hasClass('empty-state') && $form.find('.tbl tbody tr').length > 0;
    var file = lookupFiles[kind];
    var number = ($form.find('#regNo, #kNo').val() || '').trim();
    var i = documents.findIndex(function (d) { return d.detail === kind; });

    if (!hasRow && !file) {
      showToast(kind === 'registry'
        ? 'Enter the Registry Number and fetch details, or upload the registry document.'
        : 'Enter the K Number and fetch details, or upload the connection document.');
      return;
    }

    documents[i].uploaded = true;
    documents[i].name = file ? file.name
      : (number ? (kind === 'registry' ? 'Registry No. ' : 'K No. ') + number : 'Fetched details');
    if (file) docFiles[i] = file;

    var data = { method: file ? 'upload' : 'fetch', ref: number, fileName: file ? file.name : '', rows: hasRow ? lookupRows[kind] : null };
    setFlow(kind === 'registry' ? { registryDone: true, registryData: data } : { electricityDone: true, electricityData: data });
    saveDocumentsToFlow();
    openUploadRow = null;
    openViewRow = i;                 // back to the read-only view with the new data
    renderDocTable();
    showToast((kind === 'registry' ? 'Registry' : 'Electricity connection') + ' details saved.', true);
  });
});
