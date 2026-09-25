/* =====================================================================
   JDA Admin Panel — application-review.js   (application-review.html)
   Citizen Care Center (HQ) — Application Verification.

   This file owns the page state and sections 1–5:
     1 Applicant Detail   2 Choose Service   3 Selected Property Detail
     4 Selected Witness   5 Registry Detail
   Other sections live in their own files and receive the shared `ctx`:
     document-verification.js  → 6 Enclosures (preview, approve / reject)
     final-submission.js       → 7 Final Submission (locked until ready)
     forward-to-zone.js        → Forward to Zone modal → DC

   Status codes come from AdminData.VERIFY / CASE_STATUS (no raw strings).
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminModal, AdminForm, AdminToast, AdminUtil, AdminFileMovement } = window;
  const { icon, escapeHtml, formatDate, formatDateTime, statusBadge } = AdminUtil;
  const { VERIFY, STAGE, CASE_STATUS, COUNSELLING_LISTS, ApplicationStore, MovementStore, ChargeStore,
          Session, Verification, statusLabel } = AdminData;

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const appNo = params.get("app") || (Session.getApplication() || {}).appNo;
  const fromKey = COUNSELLING_LISTS[params.get("from")] ? params.get("from") : "forward-without-counselling";

  let app = null;

  /* ===================================================================
     SHARED CONTEXT for the section modules
     =================================================================== */
  const ctx = {
    getApp: () => app,

    /* Verification may change only while the file is in counselling and
       Final Submission has not happened yet. */
    editable: () => app.stage === STAGE.COUNSELLING && !app.finalSubmission,

    /* BACKEND INTEGRATION:
       Persist verification status to backend (one call per decision). */
    save(changes) {
      const merged = { ...app, ...changes };
      app = ApplicationStore.update(app.appNo, { ...changes, caseStatus: Verification.caseStatus(merged) });
      renderAll();
      return app;
    },

    refresh() { load(); renderAll(); },

    /* Reject dialog shared by sections and documents → resolves remark or null. */
    askReject(title, subtitle) {
      return new Promise(resolve => {
        const form = $("rejectForm");
        form.reset();
        AdminForm.clearAll(form);
        $("rejectTitle").textContent = title;
        $("rejectSubtitle").textContent = subtitle || "";
        let done = false;
        form.onsubmit = e => {
          e.preventDefault();
          const remark = $("rejectRemark").value.trim();
          if (remark.length < 5) { AdminForm.setError($("rejectRemark"), "Please enter the rejection remark (at least 5 characters)."); $("rejectRemark").focus(); return; }
          done = true;
          AdminModal.close("rejectModal");
          resolve(remark);
        };
        AdminModal.open("rejectModal", { onClose: () => { if (!done) resolve(null); } });
      });
    },

    /* Screen-reader announcement (no visual toast — the badge already changes). */
    announce(message) {
      const live = $("rvLive");
      live.textContent = "";
      setTimeout(() => { live.textContent = message; }, 50);
    },

    labelFor(key, status) {
      if (key === "applicant" && status === VERIFY.APPROVED) return "Verified";
      return statusLabel(status);
    }
  };
  window.AdminReview = ctx;

  /* BACKEND INTEGRATION: replace with the application-detail API response. */
  function load() { app = ApplicationStore.get(appNo); }

  const dl = pairs => pairs.map(([label, value, span]) =>
    `<div${span ? ' class="admin-detail-span"' : ""}><dt>${escapeHtml(label)}</dt><dd>${value === "" || value == null ? "—" : escapeHtml(value)}</dd></div>`).join("");

  /* ===================================================================
     HEADER / SUMMARY
     =================================================================== */
  function renderHeader() {
    const listUrl = `forward-without-counselling.html?list=${fromKey}`;
    $("crumbList").textContent = COUNSELLING_LISTS[fromKey].title;
    $("crumbList").href = listUrl;
    $("rvBack").href = listUrl;
    $("crumbApp").textContent = `Application #${app.appNo}`;
    $("rvTitle").textContent = `Application Number : ${app.appNo}`;
    $("rvSubtitle").textContent = `Service : ${app.service.name} · Applicant : ${app.applicant.name}`;
    document.title = `Verify ${app.appNo} — JDA Admin Panel`;

    const dc = ChargeStore.dcForZone(app.zoneId);
    const caseStatus = Verification.caseStatus(app);
    $("rvSummary").innerHTML = `
      <div><dt>Case Status</dt><dd>${statusBadge(statusLabel(caseStatus))}</dd></div>
      <div><dt>Application Source</dt><dd>${escapeHtml(app.source)}</dd></div>
      <div><dt>Submitted On</dt><dd>${formatDate(app.startDate)}</dd></div>
      <div><dt>Counselling</dt><dd>${escapeHtml(statusLabel(app.counselling.status))}<small>${formatDate(app.counselling.date)} · ${escapeHtml(app.counselling.timeSlot)}</small></dd></div>
      <div><dt>Zone</dt><dd>${escapeHtml(app.selectedProperty.zone)}</dd></div>
      <div class="admin-summary-holder"><dt>Forward To</dt><dd>${dc ? `${escapeHtml(dc.name)}<small>${escapeHtml(dc.holder ? dc.holder.name : "")}</small>` : "—"}</dd></div>`;

    const banner = $("rvForwardedBanner");
    banner.hidden = app.stage === STAGE.COUNSELLING;
    if (!banner.hidden) {
      const f = app.forwardToZone || {};
      const holder = ChargeStore.getById(app.currentChargeId);
      banner.innerHTML = icon("i-check-circle") +
        `<span>Forwarded to <strong>${escapeHtml(dc ? dc.name : "the zone")}</strong> on ${formatDateTime(f.at)}. ` +
        `The file is now with <strong>${escapeHtml(holder && holder.holder ? holder.holder.name : "")}</strong> (${escapeHtml(holder ? holder.name : "")}). Verification is read-only.</span>`;
    }
  }

  /* ===================================================================
     SECTIONS 1–5
     =================================================================== */
  function renderSections() {
    const a = app.applicant, s = app.service, p = app.selectedProperty;
    $("body-applicant").innerHTML = `
      <dl class="admin-detail-grid admin-detail-grid--4">${dl([
        ["Applicant Type", app.applicantType], ["Name of Applicant", a.name], ["Relation", a.relation],
        ["Father / Husband Name", a.fatherHusband], ["Mobile Number", a.mobile], ["WhatsApp Number", a.whatsapp],
        ["Email Id", a.email], ["Aadhaar Number of Applicant", a.aadhaar], ["Applicant Present", a.present],
        ["Current Address", a.currentAddress, true], ["Permanent Address", a.permanentAddress, true]
      ])}</dl>
      <div class="admin-id-proof">
        ${icon("i-id-card")}
        <span><strong>Identity proof submitted:</strong> ${escapeHtml(a.idProof)} — see “Photo ID” under Enclosures.</span>
        <button type="button" class="admin-link-btn" data-preview-doc="0">Preview Photo ID</button>
      </div>`;

    $("body-service").innerHTML = `<dl class="admin-detail-grid admin-detail-grid--4">${dl([
      ["Service Name", s.name], ["Sub Service", s.subService], ["Applicable Provision (Based On)", s.basedOn, true],
      ["Service Category", s.category], ["Is Free Hold Patta", s.isFreeHoldPatta ? "Yes" : "No"],
      ["Disposal Time Limit", `${s.slaDays} days`], ["Service Description", s.description, true]
    ])}</dl>`;

    $("body-property").innerHTML = `<tr>
      <td>${escapeHtml(p.serviceNo)}</td><td>${escapeHtml(p.zone)}</td><td>${escapeHtml(p.developer)}</td><td>${escapeHtml(p.scheme)}</td>
      <td>${escapeHtml(p.sector)}</td><td>${escapeHtml(p.plotNo)}</td><td class="admin-col-amount">${escapeHtml(p.area)}</td>
      <td>${escapeHtml(p.areaUnit)}</td><td>${escapeHtml(p.propertyDetails)}</td><td class="admin-col-amount">${escapeHtml(p.deposit)}</td></tr>`;

    $("body-witness").innerHTML = app.witness.map((w, i) => `<tr>
      <td class="admin-col-num">${i + 1}</td><td class="admin-cell-title">${escapeHtml(w.name)}</td><td>${escapeHtml(w.relation)}</td>
      <td>${escapeHtml(w.fatherHusband)}</td><td>${escapeHtml(w.mobile)}</td><td>${escapeHtml(w.aadhaar)}</td>
      <td>${escapeHtml(w.currentAddress)}</td><td>${escapeHtml(w.permanentAddress)}</td></tr>`).join("");

    $("body-registry").innerHTML = app.registry.length ? app.registry.map((r, i) => `<tr>
      <td class="admin-col-num">${i + 1}</td><td class="admin-cell-title">${escapeHtml(r.partyName)}</td><td>${escapeHtml(r.fatherName)}</td>
      <td>${escapeHtml(r.partyAddress)}</td><td>${escapeHtml(r.documentNo)}</td><td>${escapeHtml(r.registryNo)}</td>
      <td class="admin-col-nowrap">${escapeHtml(r.registryDate)}</td><td>${escapeHtml(r.district)}</td><td>${escapeHtml(r.tehsil)}</td>
      <td>${statusBadge(r.documentStatus)}</td></tr>`).join("")
      : `<tr><td colspan="10" class="admin-muted">No registry detail was submitted.</td></tr>`;
  }

  const ACTIONS = {
    applicant: { approve: "Mark Applicant Verified" },
    service:   { approve: "Approve Service" },
    property:  { approve: "Approve Property" },
    witness:   { approve: "Approve Witness" },
    registry:  { approve: "Approve Registry Details", skip: "Skip Registry Details" }
  };

  function renderSectionStates() {
    Verification.SECTIONS.forEach(sec => {
      const st = app.verification[sec.key];
      document.querySelector(`[data-status-for="${sec.key}"]`).innerHTML = statusBadge(ctx.labelFor(sec.key, st));
      document.getElementById(`sec-${sec.key}`).dataset.state = st;

      const foot = document.querySelector(`[data-actions-for="${sec.key}"]`);
      const remark = app.verification.remarks && app.verification.remarks[sec.key];
      const note = st === VERIFY.REJECTED && remark ? `<p class="admin-vsec-remark">${icon("i-alert")} Rejection remark: ${escapeHtml(remark)}</p>` : "";
      if (!ctx.editable()) {
        foot.innerHTML = note + `<p class="admin-muted admin-vsec-locked">${icon("i-lock")} Decision recorded — locked after final submission.</p>`;
        return;
      }
      const a = ACTIONS[sec.key];
      foot.innerHTML = note + (st === VERIFY.PENDING
        ? `<button type="button" class="admin-btn admin-btn-primary admin-btn-sm" data-decide="${sec.key}" data-to="${VERIFY.APPROVED}">${icon("i-check")} ${a.approve}</button>
           ${a.skip ? `<button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-decide="${sec.key}" data-to="${VERIFY.SKIPPED}">${a.skip}</button>` : ""}
           <button type="button" class="admin-btn admin-btn-danger-outline admin-btn-sm" data-decide="${sec.key}" data-to="${VERIFY.REJECTED}">Reject</button>`
        : `<span class="admin-vsec-decided">${ctx.labelFor(sec.key, st)} ${st === VERIFY.SKIPPED ? "— registry check skipped (not treated as approved)" : ""}</span>
           <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-decide="${sec.key}" data-to="${VERIFY.PENDING}">Change decision</button>`);
    });
  }

  async function decide(key, to) {
    const sec = Verification.SECTIONS.find(s => s.key === key);
    const remarks = { ...(app.verification.remarks || {}) };
    if (to === VERIFY.REJECTED) {
      const remark = await ctx.askReject(`Reject ${sec.title}`, `Application ${app.appNo}`);
      if (!remark) return;
      remarks[key] = remark;
    } else {
      delete remarks[key];
    }
    // BACKEND INTEGRATION: Persist verification status to backend.
    ctx.save({ verification: { ...app.verification, [key]: to, remarks } });
    ctx.announce(to === VERIFY.PENDING ? `${sec.title} set back to Pending.` : `${sec.title}: ${ctx.labelFor(key, to)}.`);
  }

  /* ===================================================================
     PROGRESS PANEL (right side)
     =================================================================== */
  function renderProgress() {
    const docs = Verification.docSummary(app);
    const tone = st => st === VERIFY.APPROVED || st === VERIFY.SKIPPED ? "done" : st === VERIFY.REJECTED ? "danger" : "todo";
    const steps = Verification.SECTIONS.map((s, i) => {
      const st = app.verification[s.key];
      return { n: i + 1, label: s.label, anchor: `sec-${s.key}`, text: ctx.labelFor(s.key, st), tone: tone(st) };
    });
    steps.push({ n: 6, label: "Documents", anchor: "sec-documents",
      text: `${docs.approved}/${docs.mandatory} mandatory approved`,
      tone: docs.complete ? "done" : docs.rejected.length ? "danger" : "todo" });
    const ready = Verification.canFinalSubmit(app);
    steps.push({ n: 7, label: "Final Submission", anchor: "sec-final",
      text: app.finalSubmission ? "Submitted — Case Found OK" : ready ? "Ready" : "Locked",
      tone: app.finalSubmission ? "done" : ready ? "ready" : "locked" });
    steps.push({ n: 8, label: "Forward to Zone", anchor: "sec-final",
      text: app.stage === STAGE.ZONE ? "Forwarded to DC" : app.finalSubmission ? "Available" : "Locked",
      tone: app.stage === STAGE.ZONE ? "done" : app.finalSubmission ? "ready" : "locked" });

    $("progressCount").textContent = `${steps.filter(s => s.tone === "done").length} / ${steps.length} done`;
    $("progressList").innerHTML = steps.map(s => `
      <li class="admin-progress-item admin-progress-item--${s.tone}">
        <a href="#${s.anchor}">
          <span class="admin-progress-no" aria-hidden="true">${s.tone === "done" ? icon("i-check") : s.tone === "locked" ? icon("i-lock") : s.n}</span>
          <span class="admin-progress-text"><strong>${escapeHtml(s.label)}</strong><small>${escapeHtml(s.text)}</small></span>
        </a>
      </li>`).join("");

    const next = $("progressNext");
    if (app.stage === STAGE.ZONE) {
      next.innerHTML = `<p class="admin-progress-msg admin-progress-msg--done">${icon("i-check-circle")} Forwarded to DC. The zone now handles this file.</p>
        <a class="admin-btn admin-btn-outline admin-btn-block admin-btn-sm" href="application-list.html?list=outbox">Open Outbox</a>`;
    } else if (app.finalSubmission) {
      next.innerHTML = `<p class="admin-progress-msg admin-progress-msg--done">${icon("i-check-circle")} Verification completed — Case Found OK.</p>
        <button type="button" class="admin-btn admin-btn-primary admin-btn-block" data-open-forward>${icon("i-send")} Forward to Zone</button>`;
    } else {
      const blockers = Verification.blockers(app);
      next.innerHTML = blockers.length
        ? `<p class="admin-progress-msg">${icon("i-lock")} <strong>Final Submission locked.</strong> Remaining:</p>
           <ul class="admin-blocker-list">${blockers.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
           <button type="button" class="admin-btn admin-btn-primary admin-btn-block" disabled>${icon("i-lock")} Forward to Zone</button>`
        : `<p class="admin-progress-msg admin-progress-msg--ready">${icon("i-check-circle")} All checks complete. Submit the final verification.</p>
           <a class="admin-btn admin-btn-primary admin-btn-block" href="#sec-final">Go to Final Submission</a>`;
    }
  }

  function renderHistory() {
    const list = MovementStore.forApp(app.appNo);
    $("rvHistoryCount").textContent = list.length;
    $("rvHistory").innerHTML = AdminFileMovement.timelineHtml(app, list);
  }

  function renderAll() {
    renderHeader();
    renderSections();
    renderSectionStates();
    window.AdminDocVerification.render();
    window.AdminFinalSubmission.render();
    renderProgress();
    renderHistory();
    window.AdminLayout.refreshCounts();
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    load();
    if (!app) { $("rvNotFound").hidden = false; return; }
    Session.setApplication(app);
    $("rvWorkspace").hidden = false;

    window.AdminDocVerification.init(ctx);
    window.AdminFinalSubmission.init(ctx);
    window.AdminForwardToZone.init(ctx);

    document.querySelector(".admin-rv-main").addEventListener("click", e => {
      const b = e.target.closest("[data-decide]");
      if (b) decide(b.dataset.decide, b.dataset.to);
      const pv = e.target.closest("[data-preview-doc]");
      if (pv) window.AdminDocVerification.preview(Number(pv.dataset.previewDoc));
    });
    document.addEventListener("click", e => {
      if (e.target.closest("[data-open-forward]")) window.AdminForwardToZone.open();
    });

    renderAll();
  }

  init();
})(window, document);
