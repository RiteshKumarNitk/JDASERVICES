/* =====================================================================
   JDA Admin Panel — forward-to-zone.js
   "Forward to Zone" modal of application-review.html.

   Available only after Final Submission (Case Found OK).
     Forward To                    → DC of the property's zone (read-only)
     Original Documents Received   → No / Yes
         Yes → mark each original document Received (+ Verified);
               every required original must be marked Received
     Current Status                → required
     Remark                        → required
   [Forward to Zone] → confirmation → AdminFileMovement.forwardToZone()
   The file then appears in the DC's Received Applications and the existing
   DC file-movement workflow continues.
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminAuth, AdminModal, AdminForm, AdminToast, AdminUtil, AdminFileMovement } = window;
  const { escapeHtml, icon } = AdminUtil;
  const { STAGE, FORWARD_STATUS_OPTIONS, ChargeStore } = AdminData;

  const $ = id => document.getElementById(id);
  let ctx = null;

  const originals = app => app.documents.filter(d => d.original);

  function renderOriginals(app) {
    $("fzOriginalBody").innerHTML = originals(app).map((d, i) => `
      <tr>
        <td>${escapeHtml(d.name)} ${d.mandatory ? `<span class="admin-req-tag is-mandatory">Required</span>` : `<span class="admin-req-tag">If applicable</span>`}</td>
        <td class="admin-col-center"><input type="checkbox" data-orig-received="${i}" aria-label="${escapeHtml(d.name)} received"></td>
        <td class="admin-col-center"><input type="checkbox" data-orig-verified="${i}" aria-label="${escapeHtml(d.name)} verified" disabled></td>
      </tr>`).join("");
  }

  function open() {
    const app = ctx.getApp();
    if (!app.finalSubmission || app.stage !== STAGE.COUNSELLING) {
      AdminToast.show("Forward to Zone is available only after Final Submission (Case Found OK).", "info", "Locked");
      return;
    }
    const dc = ChargeStore.dcForZone(app.zoneId);
    const form = $("forwardForm");
    form.reset();
    AdminForm.clearAll(form);
    $("forwardFormView").hidden = false;
    $("forwardDoneView").hidden = true;
    $("forwardAppLabel").textContent = `Application No. ${app.appNo} · ${app.service.name} · ${app.applicant.name}`;
    $("fzTo").value = `${dc.name} — ${dc.holder ? dc.holder.name : "Vacant"}`;
    $("fzStatus").innerHTML = `<option value="">Select Current Status</option>` +
      FORWARD_STATUS_OPTIONS.map(s => `<option>${escapeHtml(s)}</option>`).join("");
    renderOriginals(app);
    $("fzOriginalBox").hidden = true;
    AdminModal.open("forwardModal");
  }

  function collectOriginals(app) {
    return originals(app).map((d, i) => ({
      name: d.name,
      required: d.mandatory,
      received: $("fzOriginalBody").querySelector(`[data-orig-received="${i}"]`).checked,
      verified: $("fzOriginalBody").querySelector(`[data-orig-verified="${i}"]`).checked
    }));
  }

  function validate(app) {
    const form = $("forwardForm");
    AdminForm.clearAll(form);
    let ok = true;
    const orig = $("fzOriginal").value;
    if (!orig) { AdminForm.setError($("fzOriginal"), "Please select whether original documents were received."); ok = false; }
    if (orig === "Yes") {
      const missing = collectOriginals(app).filter(d => d.required && !d.received);
      if (missing.length) {
        AdminForm.setError($("fzOriginalCheck"), `Mark every required original document as received: ${missing.map(d => d.name).join(", ")}.`);
        ok = false;
      }
    }
    if (!$("fzStatus").value) { AdminForm.setError($("fzStatus"), "Please select the Current Status."); ok = false; }
    if ($("fzRemark").value.trim().length < 10) { AdminForm.setError($("fzRemark"), "Please enter a remark (at least 10 characters)."); ok = false; }
    return ok;
  }

  async function confirmForward() {
    const app = ctx.getApp();
    const modal = $("forwardConfirm");
    const btn = $("fcSubmit");
    const orig = $("fzOriginal").value;
    const details = {
      originalDocumentsReceived: orig,
      originalDocuments: orig === "Yes" ? collectOriginals(app) : [],
      currentStatus: $("fzStatus").value,
      remark: $("fzRemark").value.trim()
    };
    modal.classList.add("is-busy");
    AdminUtil.setButtonLoading(btn, true, "Forwarding...");
    await AdminUtil.delay(800);

    // BACKEND INTEGRATION: Submit file movement / forwarding request.
    const result = AdminFileMovement.forwardToZone(app.appNo, details);

    modal.classList.remove("is-busy");
    AdminUtil.setButtonLoading(btn, false);
    AdminModal.close(modal);

    $("forwardFormView").hidden = true;
    $("forwardDoneView").hidden = false;
    $("fzDoneText").innerHTML = `Application <strong>${escapeHtml(app.appNo)}</strong> has been forwarded to ` +
      `<strong>${escapeHtml(result.dc.name)}</strong> (${escapeHtml(result.dc.holder.name)}) with status <strong>${escapeHtml(details.currentStatus)}</strong>.`;
    $("fzSwitch").innerHTML = `${icon("i-user")} Continue as ${escapeHtml(result.dc.holder.name)} <small>(demo)</small>`;
    $("fzSwitch").dataset.chargeId = result.dc.id;
    ctx.refresh();
    $("fzBackList").focus();
  }

  function init(context) {
    ctx = context;
    const form = $("forwardForm");
    AdminForm.liveClear(form);

    $("fzOriginal").addEventListener("change", e => {
      $("fzOriginalBox").hidden = e.target.value !== "Yes";
      AdminForm.clearError($("fzOriginalCheck"));
    });

    // "Verified" can only be ticked for a document that was received.
    $("fzOriginalBody").addEventListener("change", e => {
      const rec = e.target.closest("[data-orig-received]");
      if (!rec) return;
      const ver = $("fzOriginalBody").querySelector(`[data-orig-verified="${rec.dataset.origReceived}"]`);
      ver.disabled = !rec.checked;
      if (!rec.checked) ver.checked = false;
      AdminForm.clearError($("fzOriginalCheck"));
    });

    form.addEventListener("submit", e => {
      e.preventDefault();
      const app = ctx.getApp();
      if (!validate(app)) { AdminForm.focusFirstError(form); return; }
      const dc = ChargeStore.dcForZone(app.zoneId);
      $("fcText").innerHTML = `Are you sure you want to forward application <strong>${escapeHtml(app.appNo)}</strong> to ` +
        `<strong>${escapeHtml(dc.name)}</strong>?`;
      AdminModal.open("forwardConfirm");
    });

    $("fcSubmit").addEventListener("click", confirmForward);
    $("fzSwitch").addEventListener("click", e => AdminAuth.switchToOfficer(e.currentTarget.dataset.chargeId));
  }

  window.AdminForwardToZone = { init, open };
})(window, document);
