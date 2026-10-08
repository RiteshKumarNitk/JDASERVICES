/* =====================================================================
   JDA Property Services — enclosures.js   (document-section.html)

   Step 5 · Upload Documents
     • One row per required document (REQUIRED_DOCUMENTS in main.js).
     • Upload / Uploaded → opens the upload card under the row
       (Registry and Electricity rows open their lookup form instead —
       see registry.js).
     • View  → preview of the file (Registry / Electricity: saved details).
     • Delete → removes the file.
     • Save & Proceed → every Mandatory document must be uploaded
       → final-submission.html
   ===================================================================== */

// Working copy of the document list with upload state.
// (Photo ID is pre-uploaded in this demo.)
var documents = $.map(REQUIRED_DOCUMENTS, function (doc, i) {
  return $.extend({ uploaded: i === 0, name: i === 0 ? 'Photo_ID.pdf' : '' }, doc);
});

var docFiles = {};          // row index → File chosen in this visit (for preview)
var openUploadRow = null;   // row whose upload card / lookup form is open
var openViewRow = null;     // Registry / Electricity row whose saved details are shown
var chosenFile = null;      // file picked in the open upload card, not saved yet

// BACKEND INTEGRATION: upload the files to the server instead of only remembering names.
function saveDocumentsToFlow() {
  var uploaded = $.grep(documents, function (d) { return d.uploaded; });
  setFlow({
    uploadedDocs: $.map(uploaded, function (d) { return d.req; }),
    uploadedDocNames: $.map(uploaded, function (d) { return d.name || d.req; })
  });
}

function openFilePreview(file, fallbackMessage) {
  if (file) window.open(URL.createObjectURL(file), '_blank');
  else showToast(fallbackMessage);
}

function imagePreview(file) {
  return file && /^image\//.test(file.type) ? $('<img alt="preview">').attr('src', URL.createObjectURL(file)) : null;
}

/* ---------------------------------------------------------------------
   Document table
   --------------------------------------------------------------------- */
function documentRow(doc, i) {
  var mandatory = doc.type === 'mandatory';
  return $('<tr>').attr('data-doc-idx', i).append(
    $('<td>').text(i + 1),
    $('<td class="req-text">').text(doc.req),
    $('<td>').append($('<span class="req-badge">').addClass(mandatory ? 'mandatory' : 'applicable').text(mandatory ? 'Mandatory' : 'If Applicable')),
    $('<td>').append(doc.uploaded ? '<button type="button" class="tbtn tbtn-view" data-act="view">View</button>' : ''),
    $('<td>').append(doc.uploaded ? '<button type="button" class="tbtn tbtn-del" data-act="del">delete</button>' : ''),
    $('<td>').append(doc.uploaded
      ? '<button type="button" class="tbtn tbtn-ok" data-act="upload">Uploaded</button>'
      : '<button type="button" class="tbtn tbtn-upload" data-act="upload">Upload</button>')
  );
}

function renderDocTable() {
  // put the Registry / Electricity forms back in their holder before the rows are rebuilt
  $('#registryDetail, #electricityDetail').appendTo('#detailHolder');

  var $body = $('#docRows').empty();
  $.each(documents, function (i, doc) { $body.append(documentRow(doc, i)); });

  if (openUploadRow !== null) showUploadCard(openUploadRow);
  else if (openViewRow !== null) showSavedDetails(openViewRow);
}

// A full-width row placed right under document row i.
function rowBelow(i) {
  var $row = $('<tr class="doc-detail-row">').attr('data-doc-detail', i);
  $('#docRows tr[data-doc-idx="' + i + '"]').after($row);
  return $row;
}

/* ---------------------------------------------------------------------
   Upload card (markup: <template id="uploadCardTemplate">)
   --------------------------------------------------------------------- */
function showUploadCard(i) {
  var doc = documents[i];

  // Registry / Electricity rows show their lookup form (registry.js) instead
  if (doc.detail) {
    var $cell = $('<td colspan="6" class="row-detail-cell">').append($('#' + doc.detail + 'Detail'));
    rowBelow(i).append($cell)[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }

  var $row = rowBelow(i).append($($('#uploadCardTemplate').html()));
  var fileName = chosenFile ? chosenFile.name : (doc.uploaded ? (doc.name || 'document') : 'No file chosen');
  var $preview = imagePreview(chosenFile || docFiles[i]);

  $row.find('.up-card-head').text(doc.req);
  $row.find('[data-name], .up-name').text(fileName);
  $row.find('[data-preview]').append($preview).prop('hidden', !$preview);
  $row.find('[data-result]').prop('hidden', !(chosenFile || doc.uploaded));
  $row[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function openUploadCard(i) {
  if (openUploadRow === i) { closeUploadCard(); return; }
  openViewRow = null;
  openUploadRow = i;
  chosenFile = null;
  renderDocTable();
}

function closeUploadCard() {
  openUploadRow = null;
  openViewRow = null;
  chosenFile = null;
  renderDocTable();
}

/* ---------------------------------------------------------------------
   Read-only saved details of a Registry / Electricity row
   --------------------------------------------------------------------- */
var DETAIL_TEXT = {
  registry: {
    title: 'Registry Details', ref: 'Registry Number', doc: 'Registry Document', table: 'Registry Detail',
    headers: ['S.No', 'Party Name', 'Property Address', 'Document No', 'Registry No', 'Registry Date', 'Document Status', 'Action']
  },
  electricity: {
    title: 'Electricity Connection Details', ref: 'K Number', doc: 'Connection Document', table: 'Connection Detail',
    headers: ['S.No', 'K Number', 'Consumer Name', 'Fathers Name', 'Address', 'Category Of Connection', 'Date Of Connection', 'Action']
  }
};

function showSavedDetails(i) {
  var kind = documents[i].detail;
  var text = DETAIL_TEXT[kind];
  var saved = getFlow()[kind + 'Data'] || {};
  var cells = (saved.rows && saved.rows.length) ? saved.rows : lookupRows[kind];

  var $box = $('<div class="row-detail row-detail-ro">').append(
    $('<div class="ro-head">').append(
      $('<h4 class="ro-title">').append($('<span class="section-title-underline">').text(text.title)),
      $('<button class="btn btn-outline btn-sm" type="button">').attr('data-detail-edit', i).text('Edit')
    )
  );

  if (saved.ref) {
    $box.append($('<p class="ro-line">').append($('<span class="ro-key">').text(text.ref + ':'), ' ', $('<span class="ro-val">').text(saved.ref)));
  }
  if (cells && cells.length) {
    var $head = $('<tr>');
    $.each(text.headers, function (j, h) { $head.append($('<th>').text(h)); });
    var $cells = $('<tr>');
    $.each(cells, function (j, c) { $cells.append($('<td>').text(c)); });
    $cells.append('<td>—</td>');
    $box.append(
      $('<h4 class="table-title">').text(text.table),
      $('<div class="table-wrap">').append($('<table class="tbl">').append($('<thead>').append($head), $('<tbody>').append($cells)))
    );
  }
  if (saved.method === 'upload' && saved.fileName) {
    $box.append($('<div class="ro-file">').append(
      $('<span class="ro-key">').text(text.doc + ':'), ' ', $('<span class="ro-val">').text(saved.fileName),
      $('<button type="button" class="tbtn tbtn-view">').attr('data-view-preview', i).text('Preview')
    ));
  }
  if (!saved.ref && !(cells && cells.length) && !(saved.method === 'upload' && saved.fileName)) {
    $box.append('<p class="ro-empty">No saved details yet — click <strong>Edit</strong> to add them.</p>');
  }

  rowBelow(i).append($('<td colspan="6">').append($box))[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function toggleSavedDetails(i) {
  openUploadRow = null;
  chosenFile = null;
  openViewRow = openViewRow === i ? null : i;
  renderDocTable();
}

/* ---------------------------------------------------------------------
   Page set-up and events
   --------------------------------------------------------------------- */
$(function () {
  // documents uploaded on an earlier visit
  var flow = getFlow();
  $.each(flow.uploadedDocs || [], function (k, req) {
    var doc = $.grep(documents, function (d) { return d.req === req; })[0];
    if (doc) { doc.uploaded = true; doc.name = (flow.uploadedDocNames || [])[k] || doc.name || 'document'; }
  });
  renderDocTable();

  var $rows = $('#docRows');

  // Upload / Uploaded / View / delete buttons of a document row
  $rows.on('click', 'tr[data-doc-idx] .tbtn[data-act]', function () {
    var i = Number($(this).closest('tr').attr('data-doc-idx'));
    var doc = documents[i];
    var action = $(this).attr('data-act');

    if (action === 'upload') openUploadCard(i);

    if (action === 'view') {
      if (doc.detail) toggleSavedDetails(i);
      else openFilePreview(docFiles[i], 'Viewing ' + (doc.name || 'document') + ' (no local preview).');
    }

    if (action === 'del') {
      doc.uploaded = false;
      doc.name = '';
      delete docFiles[i];
      if (doc.detail) clearLookupForm(doc.detail);      // registry.js
      if (openUploadRow === i) openUploadRow = null;
      if (openViewRow === i) openViewRow = null;
      saveDocumentsToFlow();
      renderDocTable();
      showToast('Document removed.');
    }
  });

  /* --- inside the open upload card --- */
  $rows.on('click', '.up-card [data-pick]', function () {
    $(this).closest('.up-card').find('.up-input').trigger('click');
  });

  $rows.on('change', '.up-card .up-input', function () {
    var $card = $(this).closest('.up-card');
    var doc = documents[openUploadRow];
    chosenFile = this.files[0] || null;
    $card.find('[data-name], .up-name').text(chosenFile ? chosenFile.name : (doc.uploaded ? (doc.name || 'document') : 'No file chosen'));
    var $preview = imagePreview(chosenFile);
    $card.find('[data-preview]').empty().append($preview).prop('hidden', !$preview);
    $card.find('[data-result]').prop('hidden', !(chosenFile || doc.uploaded));
  });

  $rows.on('click', '.up-card [data-preview-open]', function () {
    openFilePreview(chosenFile || docFiles[openUploadRow], 'No local preview available for this file.');
  });

  $rows.on('click', '.up-card [data-remove]', function () {
    var doc = documents[openUploadRow];
    chosenFile = null;
    delete docFiles[openUploadRow];
    doc.uploaded = false;
    doc.name = '';
    saveDocumentsToFlow();
    renderDocTable();
    showToast('File removed.');
  });

  $rows.on('click', '.up-card [data-cancel]', closeUploadCard);

  $rows.on('click', '.up-card [data-save]', function () {
    var doc = documents[openUploadRow];
    if (!chosenFile && !doc.uploaded) { showToast('Please choose a file to upload.'); return; }
    if (chosenFile) {
      doc.uploaded = true;
      doc.name = chosenFile.name;
      docFiles[openUploadRow] = chosenFile;
    }
    saveDocumentsToFlow();
    openUploadRow = null;
    chosenFile = null;
    renderDocTable();
    showToast('Document saved.', true);
  });

  /* --- read-only Registry / Electricity details --- */
  $rows.on('click', '[data-detail-edit]', function () {
    openUploadCard(Number($(this).attr('data-detail-edit')));
  });
  $rows.on('click', '[data-view-preview]', function () {
    openFilePreview(docFiles[Number($(this).attr('data-view-preview'))], 'Preview not available for this file.');
  });

  /* --- Save & Proceed --- */
  $('#saveDocuments').on('click', function () {
    var missing = $.grep(documents, function (d) { return d.type === 'mandatory' && !d.uploaded; });
    if (missing.length) {
      showToast('Please upload all Mandatory documents before proceeding.');
      $('#docRows tr[data-doc-idx]').each(function () {
        var doc = documents[Number($(this).attr('data-doc-idx'))];
        if (doc.type === 'mandatory' && !doc.uploaded) $(this).addClass('is-missing');
      });
      setTimeout(function () { $('#docRows tr.is-missing').removeClass('is-missing'); }, 2600);
      $('.doc-tbl')[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    saveDocumentsToFlow();
    setFlow({ documentsVerified: true, submitted: false });
    window.location.href = 'final-submission.html';
  });
});
