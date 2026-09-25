/* =====================================================================
   JDA Admin Panel — final-submission.js
   Section 7 "Final Submission" of application-review.html.

   LOCKED   until: Applicant verified, Service / Property / Witness approved,
            Registry approved OR skipped, every mandatory document approved.
   READY    → Verification Summary + Current Status (Case Found OK) + Remark
   SUBMIT   → validates again, stores finalSubmission, records
              "Verification Completed", then opens Forward to Zone.
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminForm, AdminToast, AdminUtil, AdminFileMovement } = window;
  const { icon, escapeHtml, formatDateTime, statusBadge } = AdminUtil;
  const { VERIFY, CASE_STATUS, STAGE, FINAL_STATUS_OPTIONS, MovementStore, Session, ChargeStore, Verification, statusLabel } = AdminData;

  const $ = id => document.getElementById(id);
  let ctx = null;

  function summaryRows(app) {
    const docs = Verification.docSummary(app);
    const rows = Verification.SECTIONS.map(s => [s.label, ctx.labelFor(s.key, app.verification[s.key])]);
    rows.push(["Enclosures", docs.complete ? `All Mandatory Documents Approved (${docs.approved}/${docs.mandatory})` : `Incomplete Documents (${docs.approved}/${docs.mandatory})`]);
    return rows.map(([label, value]) => `
      <div class="admin-vsum-row">
        <span>${escapeHtml(label)}</span>
        ${statusBadge(/^All Mandatory/.test(value) ? "Approved" : /^Incomplete/.test(value) ? "Incomplete Documents" : value)}
        ${/Enclosures/.test(label) ? `<small>${escapeHtml(value)}</small>` : ""}
      </div>`).join("");
  }

  function lockedHtml(app) {
    const blockers = Verification.blockers(app);
    return `
      <div class="admin-locked">
        <span class="admin-locked-icon">${icon("i-lock")}</span>
        <div>
          <h3>Final Submission is locked</h3>
          <p>Complete these verification steps first:</p>
          <ul class="admin-blocker-list">${blockers.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="admin-vsum">${summaryRows(app)}</div>`;
  }

  function readyHtml(app) {
    return `
      <div class="admin-alert admin-alert--success">${icon("i-check-circle")}
        <span><strong>All required documents verified.</strong> Application ready for final submission.</span></div>
      <h3 class="admin-subheading admin-mt">Verification Summary</h3>
      <div class="admin-vsum">${summaryRows(app)}</div>
      <form id="finalForm" class="admin-form-grid admin-mt" novalidate>
        <div class="admin-alert admin-alert--error admin-field--full" id="finalAlert" role="alert" hidden></div>
        <div class="admin-field">
          <label for="finalStatus">Current Status <span class="admin-req">*</span></label>
          <select id="finalStatus" class="admin-select">
            <option value="">Select Current Status</option>
            ${FINAL_STATUS_OPTIONS.map(c => `<option value="${c}">${escapeHtml(statusLabel(c))}</option>`).join("")}
          </select>
          <p class="admin-field-error"></p>
        </div>
        <div class="admin-field admin-field--full">
          <label for="finalRemark">Remark <span class="admin-req">*</span></label>
          <textarea id="finalRemark" class="admin-textarea" rows="3" maxlength="500"
                    placeholder="e.g. Documents verified and application found complete."></textarea>
          <p class="admin-field-error"></p>
        </div>
        <div class="admin-form-actions admin-field--full">
          <button type="submit" class="admin-btn admin-btn-primary" id="finalSubmit">${icon("i-check")} Submit</button>
        </div>
      </form>`;
  }

  function doneHtml(app) {
    const f = app.finalSubmission;
    const forwarded = app.stage === STAGE.ZONE;
    const dc = ChargeStore.dcForZone(app.zoneId);
    return `
      <div class="admin-final-done">
        <span class="admin-done-icon">${icon("i-check-circle")}</span>
        <div>
          <h3>Application verification completed.</h3>
          <p>Status: ${statusBadge(statusLabel(f.caseStatus))} <span class="admin-muted">by ${escapeHtml(f.by)} · ${formatDateTime(f.at)}</span></p>
          <p class="admin-final-remark">“${escapeHtml(f.remark)}”</p>
          ${forwarded
            ? `<p>${statusBadge("Forwarded to DC")} ${escapeHtml(dc ? dc.name : "")} · ${formatDateTime(app.forwardToZone.at)}</p>`
            : `<button type="button" class="admin-btn admin-btn-primary" data-open-forward>${icon("i-send")} Forward to Zone</button>`}
        </div>
      </div>
      <div class="admin-vsum">${summaryRows(app)}</div>`;
  }

  function render() {
    const app = ctx.getApp();
    const ready = Verification.canFinalSubmit(app);
    const state = app.finalSubmission ? "Submitted" : ready ? "Ready" : "Locked";
    document.querySelector('[data-status-for="final"]').innerHTML = statusBadge(state);
    $("sec-final").dataset.state = app.finalSubmission ? VERIFY.APPROVED : ready ? "READY" : "LOCKED";
    $("finalBody").innerHTML = app.finalSubmission ? doneHtml(app) : ready ? readyHtml(app) : lockedHtml(app);

    const form = $("finalForm");
    if (form) {
      AdminForm.liveClear(form);
      form.addEventListener("submit", submit);
    }
  }

  /* Spec rule: every condition is checked again at submit time. */
  function validate(app) {
    const form = $("finalForm");
    AdminForm.clearAll(form);
    const errors = Verification.blockers(app);
    let ok = errors.length === 0;
    if (!$("finalStatus").value) { AdminForm.setError($("finalStatus"), "Please select the Current Status."); ok = false; }
    if ($("finalRemark").value.trim().length < 10) { AdminForm.setError($("finalRemark"), "Please enter a remark (at least 10 characters)."); ok = false; }
    $("finalAlert").hidden = errors.length === 0;
    $("finalAlert").innerHTML = errors.length ? icon("i-alert") + `<span>${errors.map(escapeHtml).join("<br>")}</span>` : "";
    return ok;
  }

  async function submit(e) {
    e.preventDefault();
    const app = ctx.getApp();
    if (!validate(app)) { AdminForm.focusFirstError($("finalForm")); return; }

    const btn = $("finalSubmit");
    AdminUtil.setButtonLoading(btn, true, "Submitting...");
    await AdminUtil.delay(700);

    const me = ChargeStore.getById(Session.getCharge().id);
    const finalSubmission = {
      caseStatus: $("finalStatus").value,
      remark: $("finalRemark").value.trim(),
      at: AdminData.nowIso(),
      by: me && me.holder ? me.holder.name : ""
    };
    // BACKEND INTEGRATION: Persist verification status to backend (final submission).
    MovementStore.add({
      appNo: app.appNo,
      fromChargeId: me.id, fromRole: me.role, fromName: finalSubmission.by, fromEmployeeId: me.holderId,
      toChargeId: me.id,   toRole: me.role,   toName: finalSubmission.by,   toEmployeeId: me.holderId,
      action: "Verification Completed", remarks: finalSubmission.remark, caseStatus: statusLabel(finalSubmission.caseStatus)
    });
    ctx.save({ finalSubmission });
    AdminToast.show("Application verification completed. Status: Case Found OK.", "success", "Final submission saved");

    // Next workflow step
    window.AdminForwardToZone.open();
  }

  function init(context) { ctx = context; }

  window.AdminFinalSubmission = { init, render };
})(window, document);
