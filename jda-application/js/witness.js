/* =====================================================================
   JDA Property Services — witness.js   (witness-details.html)

   Step 3 · Witness Profile
     • No witness saved yet → the Witness Details form.
     • Witness saved        → read-only summary with an Edit button.
     • Edit                 → form filled with the saved values + Save.
     • Proceed              → property-profile.html (or back to Final
                              Submission when editing from there).
   With / Without Aadhaar, Fetch Detail and Same as Current Address come
   from person-form.js.
   ===================================================================== */

$(function () {
  var $root = $('#witnessRoot');
  var editing = false;

  initSameAddress($root);

  // The witness is stored inside formSections, under the title "Witness Details".
  function savedWitness() {
    return $.grep(getFlow().formSections || [], function (s) { return /witness/i.test(s.title || ''); })[0] || null;
  }

  // Save the witness, replacing any earlier one (never duplicated).
  function saveWitness() {
    var others = $.grep(getFlow().formSections || [], function (s) { return !/witness/i.test(s.title || ''); });
    var witness = readPersonSections($root)[0];
    setFlow({ formSections: witness ? others.concat([witness]) : others });
  }

  function showSummaryOrForm() {
    var saved = savedWitness();
    var showSummary = !!saved && !editing;
    var $summary = $('#witnessSummary').empty().prop('hidden', !showSummary);

    if (showSummary) {
      $('<div class="summary-card">').append(
        $('<h3>').append(
          '<span class="section-title-underline">Witness Details</span>',
          '<button class="btn btn-outline btn-sm summary-edit" type="button" id="editWitness">Edit</button>'
        ),
        summaryRowsElement(saved.rows, 'summary-row').addClass('summary-grid')
      ).appendTo($summary);
    }
    $('#witnessFormCard').prop('hidden', showSummary);
    $('#saveWitnessEdit').prop('hidden', !editing);
  }

  $('#witnessSummary').on('click', '#editWitness', function () {
    editing = true;
    restorePersonSections($root, [savedWitness()]);
    showSummaryOrForm();
    $('#witnessFormCard')[0].scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  $('#saveWitnessEdit').on('click', function () {
    if (!validateSection($root)) return;
    saveWitness();
    editing = false;
    showSummaryOrForm();
    showToast('Witness details updated.', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#continueWitness').on('click', function () {
    var next = getFlow().editReturn ? 'final-submission.html' : 'property-profile.html';
    if (!editing && savedWitness()) {        // summary on screen → nothing to check
      window.location.href = next;
      return;
    }
    if (!validateSection($root)) return;
    saveWitness();
    window.location.href = next;
  });

  showSummaryOrForm();
});
