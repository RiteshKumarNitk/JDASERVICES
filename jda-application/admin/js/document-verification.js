/* =====================================================================
   JDA Admin Panel — document-verification.js
   Section 6 "Enclosures" of application-review.html.

   The counselor REVIEWS the documents the citizen uploaded (no upload here):
     [Preview]  → #previewModal   (viewing never changes the status)
     [Approve]  → status APPROVED
     [Reject]   → status REJECTED + rejection remark (required)
     [Change]   → back to PENDING
   Rule: every MANDATORY document must be APPROVED, otherwise the case is
   "Incomplete Documents" and Final Submission stays locked.
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminModal, AdminUtil } = window;
  const { icon, escapeHtml, formatDate, formatDateTime, statusBadge } = AdminUtil;
  const { VERIFY, Verification, statusLabel } = AdminData;

  const $ = id => document.getElementById(id);
  let ctx = null;
  let previewIndex = 0;

  /* BACKEND INTEGRATION:
     Save document verification result (document id, status, remark). */
  function setDocStatus(docId, status, remark) {
    const app = ctx.getApp();
    const documents = app.documents.map(d => d.id !== docId ? d : {
      ...d, status, remark: status === VERIFY.REJECTED ? remark : "",
      reviewedOn: status === VERIFY.PENDING ? null : AdminData.nowIso()
    });
    ctx.save({ documents });
  }

  async function reject(doc) {
    const remark = await ctx.askReject(`Reject: ${doc.name}`, `${doc.fileName} · Application ${ctx.getApp().appNo}`);
    if (!remark) return false;
    setDocStatus(doc.id, VERIFY.REJECTED, remark);
    ctx.announce(`${doc.name} rejected.`);
    return true;
  }

  function approve(doc) {
    setDocStatus(doc.id, VERIFY.APPROVED);
    ctx.announce(`${doc.name} approved.`);
  }

  /* ---------------- rendering ---------------- */
  function summaryHtml(app) {
    const s = Verification.docSummary(app);
    const attention = s.pending.length + s.rejected.length;
    const stats = `
      <div class="admin-doc-stats">
        <div><span>Mandatory approved</span><strong>${s.approved} / ${s.mandatory}</strong></div>
        <div><span>All documents approved</span><strong>${s.approvedAll} / ${s.total}</strong></div>
        <div><span>Rejected</span><strong class="${s.rejected.length ? "admin-text-danger" : ""}">${s.rejected.length}</strong></div>
      </div>`;
    if (s.complete) {
      return stats + `<div class="admin-alert admin-alert--success">${icon("i-check-circle")}
        <span><strong>All required documents verified.</strong> Every mandatory document is approved.</span></div>`;
    }
    const list = (title, docs, withRemark) => docs.length ? `<p class="admin-incomplete-head">${title}:</p><ul>${docs.map(d =>
      `<li>${escapeHtml(d.name)}${withRemark && d.remark ? ` — <em>${escapeHtml(d.remark)}</em>` : ""}</li>`).join("")}</ul>` : "";
    return stats + `<div class="admin-alert ${s.rejected.length ? "admin-alert--error" : "admin-alert--warning"} admin-incomplete">
      ${icon("i-doc-alert")}
      <div>
        <strong>Incomplete Documents — ${attention} mandatory document${attention === 1 ? "" : "s"} require${attention === 1 ? "s" : ""} attention.</strong>
        ${list("Rejected", s.rejected, true)}${list("Pending review", s.pending, false)}
        <p class="admin-incomplete-foot">Final Submission stays locked until every mandatory document is approved.</p>
      </div></div>`;
  }

  function rowHtml(d, i, editable) {
    const actions = !editable ? `<span class="admin-muted">${icon("i-lock")} Locked</span>`
      : d.status === VERIFY.PENDING
        ? `<div class="admin-actions">
             <button type="button" class="admin-action-btn admin-action-btn--approve" data-doc-approve="${d.id}" aria-label="Approve ${escapeHtml(d.name)}">${icon("i-check")} Approve</button>
             <button type="button" class="admin-action-btn admin-action-btn--delete" data-doc-reject="${d.id}" aria-label="Reject ${escapeHtml(d.name)}">${icon("i-x")} Reject</button>
           </div>`
        : `<button type="button" class="admin-action-btn" data-doc-reset="${d.id}" aria-label="Change decision for ${escapeHtml(d.name)}">Change</button>`;
    return `
      <tr class="admin-doc-row admin-doc-row--${d.status.toLowerCase()}">
        <td class="admin-col-num">${i + 1}</td>
        <td>
          <div class="admin-cell-title">${escapeHtml(d.name)}</div>
          <div class="admin-cell-sub">
            <span class="admin-req-tag${d.mandatory ? " is-mandatory" : ""}">${d.mandatory ? "Mandatory" : "Applicable"}</span>
            ${escapeHtml(d.fileName)}
          </div>
        </td>
        <td><span class="admin-file-type">${escapeHtml(d.fileType)}</span></td>
        <td class="admin-col-nowrap">${formatDate(d.uploadedOn)}</td>
        <td><button type="button" class="admin-action-btn admin-action-btn--edit" data-doc-preview="${i}" aria-label="Preview ${escapeHtml(d.name)}">${icon("i-eye")} Preview</button></td>
        <td>
          ${statusBadge(statusLabel(d.status))}
          ${d.status === VERIFY.REJECTED && d.remark ? `<div class="admin-cell-sub admin-text-danger">${escapeHtml(d.remark)}</div>` : ""}
          ${d.reviewedOn ? `<div class="admin-cell-sub">${formatDateTime(d.reviewedOn)}</div>` : ""}
        </td>
        <td class="admin-col-actions">${actions}</td>
      </tr>`;
  }

  function render() {
    const app = ctx.getApp();
    const s = Verification.docSummary(app);
    const badge = s.complete ? "Approved" : s.rejected.length ? "Incomplete Documents" : "Pending";
    document.querySelector('[data-status-for="documents"]').innerHTML =
      statusBadge(badge) + `<span class="admin-vsec-count">${s.approved}/${s.mandatory} mandatory</span>`;
    $("sec-documents").dataset.state = s.complete ? VERIFY.APPROVED : s.rejected.length ? VERIFY.REJECTED : VERIFY.PENDING;
    $("docSummary").innerHTML = summaryHtml(app);
    $("docBody").innerHTML = app.documents.map((d, i) => rowHtml(d, i, ctx.editable())).join("");
    if (!$("previewModal").hidden) renderPreview();
  }

  /* ---------------- preview modal ---------------- */
  function renderPreview() {
    const app = ctx.getApp();
    const d = app.documents[previewIndex];
    $("previewTitle").textContent = d.name;
    $("previewMeta").textContent = `${d.fileName} · ${d.fileType} · ${d.sizeKb} KB · uploaded ${formatDateTime(d.uploadedOn)}`;
    $("previewPos").textContent = `${previewIndex + 1} of ${app.documents.length}`;
    $("previewPrev").disabled = previewIndex === 0;
    $("previewNext").disabled = previewIndex === app.documents.length - 1;
    $("previewStatus").innerHTML = statusBadge(statusLabel(d.status));
    const canDecide = ctx.editable();
    $("previewApprove").hidden = !canDecide || d.status === VERIFY.APPROVED;
    $("previewReject").hidden = !canDecide || d.status === VERIFY.REJECTED;

    // Placeholder "scan" of the document — the backend will show the real file here.
    $("previewPaper").className = `admin-paper${d.fileType === "JPG" ? " admin-paper--image" : ""}`;
    $("previewPaper").innerHTML = `
      <div class="admin-paper-head">
        <span class="admin-brand-mark admin-brand-mark--sm" aria-hidden="true">JDA</span>
        <div><strong>Jaipur Development Authority</strong><small>Government of Rajasthan</small></div>
      </div>
      <h3>${escapeHtml(d.name)}</h3>
      <dl class="admin-paper-fields">
        <div><dt>Application No.</dt><dd>${escapeHtml(app.appNo)}</dd></div>
        <div><dt>Applicant</dt><dd>${escapeHtml(app.applicant.name)}</dd></div>
        <div><dt>Father / Husband</dt><dd>${escapeHtml(app.applicant.fatherHusband)}</dd></div>
        <div><dt>Property</dt><dd>Plot ${escapeHtml(app.selectedProperty.plotNo)}, ${escapeHtml(app.selectedProperty.sector)}, ${escapeHtml(app.selectedProperty.scheme)}</dd></div>
      </dl>
      <div class="admin-paper-lines" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <p class="admin-paper-note">Prototype preview — the uploaded ${escapeHtml(d.fileType)} file is shown here in the live system.</p>
      <span class="admin-paper-stamp" aria-hidden="true">Uploaded copy</span>`;
  }

  function preview(index) {
    previewIndex = index;
    renderPreview();
    AdminModal.open("previewModal");
  }

  /* ---------------- init ---------------- */
  function init(context) {
    ctx = context;

    $("docBody").addEventListener("click", e => {
      const app = ctx.getApp();
      const find = id => app.documents.find(d => d.id === id);
      const pv = e.target.closest("[data-doc-preview]");
      if (pv) return preview(Number(pv.dataset.docPreview));
      const ap = e.target.closest("[data-doc-approve]");
      if (ap) return approve(find(ap.dataset.docApprove));
      const rj = e.target.closest("[data-doc-reject]");
      if (rj) return reject(find(rj.dataset.docReject));
      const rs = e.target.closest("[data-doc-reset]");
      if (rs) setDocStatus(rs.dataset.docReset, VERIFY.PENDING);
    });

    $("previewPrev").addEventListener("click", () => { if (previewIndex > 0) { previewIndex--; renderPreview(); } });
    $("previewNext").addEventListener("click", () => {
      if (previewIndex < ctx.getApp().documents.length - 1) { previewIndex++; renderPreview(); }
    });
    $("previewApprove").addEventListener("click", () => approve(ctx.getApp().documents[previewIndex]));
    $("previewReject").addEventListener("click", () => reject(ctx.getApp().documents[previewIndex]));
  }

  window.AdminDocVerification = { init, render, preview };
})(window, document);
