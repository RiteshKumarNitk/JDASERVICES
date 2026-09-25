/* =====================================================================
   JDA Admin Panel — application-detail.js   (application-detail.html)

   FLOW
     list → ?app=<no>&from=<list>  → render every section
     Action panel enabled ONLY if the file is with the selected charge
       Proceed         → file-movement.js (moves the file to another officer)
       Edit Detail     → update applicant contact / file fields
       Case On Hold    → status On Hold  (again → Release Hold → Pending)
       Change Property → update Service No.
       Query from Other Department → status "Query - Other Department"
       Dispose Ticket  → status Disposed (confirmation required)
     Every action adds a row to File Movement History.
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminModal, AdminForm, AdminToast, AdminUtil, AdminFileMovement } = window;
  const { icon, escapeHtml, formatDate, formatDateTime, statusBadge } = AdminUtil;
  const { LISTS, STATUS, OTHER_DEPARTMENTS, Session, ApplicationStore, MovementStore, ChargeStore, countFor, daysFromToday } = AdminData;

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const appNo = params.get("app") || (Session.getApplication() || {}).appNo;
  const fromKey = LISTS[params.get("from")] ? params.get("from") : "received";
  const charge = Session.getCharge();

  let app = null;
  let proceed = null;

  /* BACKEND INTEGRATION: GET application detail by number. */
  function load() { app = ApplicationStore.get(appNo); }

  const dl = pairs => pairs.map(([label, value, span]) =>
    `<div${span ? ' class="admin-detail-span"' : ""}><dt>${escapeHtml(label)}</dt><dd>${value === "" || value == null ? "—" : escapeHtml(value)}</dd></div>`).join("");

  /* ===================================================================
     RENDER
     =================================================================== */
  function renderHeader() {
    const listUrl = `application-list.html?list=${fromKey}`;
    $("crumbList").textContent = LISTS[fromKey].title;
    $("crumbList").href = listUrl;
    $("backToList").href = listUrl;
    $("crumbApp").textContent = `Application #${app.appNo}`;
    $("appTitle").textContent = `Application Number : ${app.appNo}`;
    $("appSubtitle").textContent = `Service : ${app.service.name}`;
    document.title = `Application ${app.appNo} — JDA Admin Panel`;

    const holder = ChargeStore.getById(app.currentChargeId);
    const left = daysFromToday(app.dueDate);
    const leftText = app.status === STATUS.DISPOSED ? "Disposed"
      : left < 0 ? `Expired ${-left} day${left === -1 ? "" : "s"} ago` : `${left} day${left === 1 ? "" : "s"}`;
    $("appSummary").innerHTML = `
      <div><dt>Status</dt><dd>${statusBadge(app.status)}</dd></div>
      <div class="admin-summary-holder"><dt>Currently With</dt><dd>${holder && holder.holder ? `${escapeHtml(holder.holder.name)}<small>${escapeHtml(holder.name)}</small>` : "—"}</dd></div>
      <div><dt>Application Start</dt><dd>${formatDate(app.startDate)}</dd></div>
      <div><dt>Due Date</dt><dd>${formatDate(app.dueDate)}</dd></div>
      <div><dt>Days Remaining on Dispose</dt><dd class="${left < 0 && app.status !== STATUS.DISPOSED ? "admin-text-danger" : ""}">${leftText}</dd></div>
      <div><dt>Pending Days</dt><dd>${Math.max(0, -daysFromToday(app.startDate))}</dd></div>`;
  }

  function renderOwnership() {
    const banner = $("ownershipBanner");
    const holder = ChargeStore.getById(app.currentChargeId);
    let tone, text;
    if (app.status === STATUS.DISPOSED) {
      tone = "success"; text = `This application has been disposed. The file is closed and read-only.`;
    } else if (AdminFileMovement.canAct(app)) {
      tone = "info"; text = `This file is currently with you (${charge.name}). Take an action or proceed it to the next officer.`;
    } else {
      tone = "warning";
      text = `This file is currently with ${holder && holder.holder ? holder.holder.name : "another officer"} — ${holder ? holder.name : ""}. You can view it, but actions are available only to the current holder.`;
    }
    banner.className = `admin-alert admin-alert--${tone} admin-ownership`;
    banner.innerHTML = icon(tone === "warning" ? "i-lock" : tone === "success" ? "i-check-circle" : "i-info") + `<span>${escapeHtml(text)}</span>`;
  }

  function renderSections() {
    const a = app.applicant, p = app.property, s = app.selectedProperty;
    $("applicantDetail").innerHTML = dl([
      ["Applicant Name", a.name], ["Father/Husband Name", a.fatherHusband], ["Mobile Number", a.mobile], ["Email ID", a.email]
    ]);
    $("propertyDetail").innerHTML = dl([
      ["Sector & Plot No.", p.sectorPlot], ["Service No.", p.serviceNo], ["Scheme Name", p.scheme], ["Zone", p.zone],
      ["Developer Type", p.developerType], ["Developer Name", p.developerName], ["File Barcode No.", p.fileBarcode],
      ["Original Document Received", p.originalDocumentReceived]
    ]);
    $("selectedProperty").innerHTML = `<tr>
      <td>${escapeHtml(s.serviceNo)}</td><td>${escapeHtml(s.zone)}</td><td>${escapeHtml(s.developer)}</td><td>${escapeHtml(s.scheme)}</td>
      <td>${escapeHtml(s.sector)}</td><td>${escapeHtml(s.plotNo)}</td><td class="admin-col-amount">${escapeHtml(s.area)}</td>
      <td>${escapeHtml(s.areaUnit)}</td><td>${escapeHtml(s.propertyDetails)}</td><td class="admin-col-amount">${escapeHtml(s.deposit)}</td></tr>`;

    $("docList").innerHTML = app.documents.map((d, i) => `
      <li class="admin-doc-item">
        <span class="admin-doc-icon">${icon("i-files")}</span>
        <span class="admin-doc-name">${escapeHtml(d.name)}<small>Uploaded ${formatDateTime(d.uploadedOn)}</small></span>
        <button type="button" class="admin-action-btn admin-action-btn--edit" data-doc-index="${i}" aria-label="View ${escapeHtml(d.name)}">${icon("i-eye")} View</button>
      </li>`).join("");
  }

  /* Counselling Verification — result of the Citizen Care Center (HQ) review. */
  function renderCounselling() {
    const f = app.finalSubmission, z = app.forwardToZone;
    $("counsellingCard").hidden = !f;
    if (!f) return;
    const v = app.verification || {};
    const L = AdminData.statusLabel;
    const docs = AdminData.Verification.docSummary(app);
    const originals = z && z.originalDocuments && z.originalDocuments.length
      ? `<ul class="admin-orig-list">${z.originalDocuments.map(d =>
          `<li>${icon(d.received ? "i-check" : "i-x")} ${escapeHtml(d.name)} — ${d.received ? "Received" : "Not received"}${d.verified ? ", Verified" : ""}</li>`).join("")}</ul>`
      : "";
    $("counsellingSummary").innerHTML = `
      <dl class="admin-detail-grid admin-detail-grid--4">
        <div><dt>Case Status</dt><dd>${statusBadge(L(f.caseStatus))}</dd></div>
        <div><dt>Verified By</dt><dd>${escapeHtml(f.by)}<small class="admin-block admin-muted">${formatDateTime(f.at)}</small></dd></div>
        <div><dt>Registry</dt><dd>${statusBadge(L(v.registry))}</dd></div>
        <div><dt>Mandatory Documents</dt><dd>${docs.approved}/${docs.mandatory} approved</dd></div>
        <div><dt>Current Status at Forward</dt><dd>${escapeHtml(z ? z.currentStatus : "—")}</dd></div>
        <div><dt>Original Documents Received</dt><dd>${escapeHtml(z ? z.originalDocumentsReceived : "—")}</dd></div>
        <div class="admin-detail-span"><dt>Counselling Remark</dt><dd>${escapeHtml(z ? z.remark : f.remark)}</dd></div>
      </dl>${originals}`;
  }

  /* Users Of Department — every charge of the application's zone. */
  function renderUsers() {
    const canAct = AdminFileMovement.canAct(app);
    const list = ChargeStore.getByZone(app.zoneId);
    $("usersDept").textContent = list[0] ? list[0].department : "";
    $("usersBody").innerHTML = list.map((c, i) => {
      const isMe = c.id === charge.id;
      const hasFile = c.id === app.currentChargeId && app.status !== STATUS.DISPOSED;
      return `<tr class="${hasFile ? "is-selected" : ""}">
        <td class="admin-col-num">${i + 1}</td>
        <td><div class="admin-cell-title">${escapeHtml(c.role)}</div><div class="admin-cell-sub">${escapeHtml(c.name)}</div></td>
        <td><div class="admin-cell-name">${escapeHtml(c.holder ? c.holder.name : "Vacant")}</div>
            ${hasFile ? `<span class="admin-opened-tag">Has this file</span>` : ""}${isMe ? `<span class="admin-you-tag">You</span>` : ""}</td>
        <td>${escapeHtml(c.holderId || "—")}</td>
        <td class="admin-col-amount">${countFor("received", c.id)}</td>
        <td class="admin-col-actions">${canAct && !isMe && c.holder
          ? `<button type="button" class="admin-action-btn admin-action-btn--edit" data-forward-to="${c.id}" aria-label="Forward file to ${escapeHtml(c.holder.name)}">${icon("i-send")} Forward</button>`
          : `<span class="admin-muted">—</span>`}</td>
      </tr>`;
    }).join("");
  }

  /* File Movement History — shared renderer in file-movement.js */
  function renderHistory() {
    const list = MovementStore.forApp(app.appNo);
    $("historyCount").textContent = list.length;
    $("historyList").innerHTML = AdminFileMovement.timelineHtml(app, list);
  }

  function renderActions() {
    const canAct = AdminFileMovement.canAct(app);
    document.querySelectorAll(".admin-action-panel [data-action]").forEach(b => { b.disabled = !canAct; });
    $("headerProceed").hidden = !canAct;
    const onHold = app.status === STATUS.HOLD;
    $("holdBtn").querySelector("span").textContent = onHold ? "Release Hold" : "Case On Hold";
    $("actionNote").textContent = canAct
      ? "Proceed moves the file to another officer. Other actions keep the file with you."
      : app.status === STATUS.DISPOSED ? "No actions — the application is disposed." : "View only — the file is not in your charge.";
  }

  function renderAll() {
    load();
    renderHeader();
    renderOwnership();
    renderSections();
    renderCounselling();
    renderUsers();
    renderHistory();
    renderActions();
    window.AdminLayout.refreshCounts();
  }

  /* ===================================================================
     ACTION MODALS
     =================================================================== */

  /* Runs a simulated save with loading state, then refreshes the page. */
  async function submitAction(modalId, btn, work, toastTitle, toastText) {
    const modal = $(modalId);
    modal.classList.add("is-busy");
    AdminUtil.setButtonLoading(btn, true, "Saving...");
    await AdminUtil.delay(600);
    work();
    modal.classList.remove("is-busy");
    AdminUtil.setButtonLoading(btn, false);
    AdminModal.close(modal);
    renderAll();
    AdminToast.show(toastText, "success", toastTitle);
  }

  function requireText(input, min, message) {
    if (input.value.trim().length < min) { AdminForm.setError(input, message); return false; }
    return true;
  }

  function openForm(modalId, formId) {
    const form = $(formId);
    form.reset();
    AdminForm.clearAll(form);
    AdminModal.open(modalId);
    return form;
  }

  function bindActions() {
    ["editForm", "holdForm", "propertyForm", "queryForm", "disposeForm"].forEach(id => AdminForm.liveClear($(id)));
    $("queryDept").insertAdjacentHTML("beforeend", OTHER_DEPARTMENTS.map(d => `<option>${escapeHtml(d)}</option>`).join(""));

    document.querySelector(".admin-action-panel").addEventListener("click", e => {
      const btn = e.target.closest("[data-action]");
      if (!btn || btn.disabled) return;
      const action = btn.dataset.action;

      if (action === "proceed") proceed.open();

      if (action === "edit") {
        openForm("editModal", "editForm");
        $("editName").value = app.applicant.name;
        $("editMobile").value = app.applicant.mobile;
        $("editEmail").value = app.applicant.email;
        $("editOriginalDoc").value = app.property.originalDocumentReceived;
        $("editBarcode").value = app.property.fileBarcode;
      }

      if (action === "hold") {
        openForm("holdModal", "holdForm");
        const release = app.status === STATUS.HOLD;
        $("holdTitle").textContent = release ? "Release Hold" : "Case On Hold";
        $("holdSubtitle").textContent = release ? "The file becomes Pending again." : "The file stays with you but is marked On Hold.";
        $("holdSubmit").textContent = release ? "Release Hold" : "Put On Hold";
      }

      if (action === "property") {
        openForm("propertyModal", "propertyForm");
        $("propCurrent").value = app.selectedProperty.serviceNo;
      }

      if (action === "query") openForm("queryModal", "queryForm");

      if (action === "dispose") {
        openForm("disposeModal", "disposeForm");
        $("disposeAppNo").textContent = app.appNo;
      }
    });

    /* Edit Detail */
    $("editForm").addEventListener("submit", e => {
      e.preventDefault();
      AdminForm.clearAll(e.target);
      let ok = true;
      if (!/^[6-9]\d{9}$/.test($("editMobile").value.trim())) { AdminForm.setError($("editMobile"), "Enter a valid 10-digit mobile number starting with 6–9."); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($("editEmail").value.trim())) { AdminForm.setError($("editEmail"), "Enter a valid email address."); ok = false; }
      if (!/^[A-Z0-9]{6,20}$/i.test($("editBarcode").value.trim())) { AdminForm.setError($("editBarcode"), "Barcode must be 6–20 letters or digits."); ok = false; }
      if (!ok) { AdminForm.focusFirstError(e.target); return; }
      submitAction("editModal", $("editSubmit"), () => {
        AdminFileMovement.recordAction(app.appNo, "Details Edited", "Applicant contact / file details updated.", {
          applicant: { ...app.applicant, mobile: $("editMobile").value.trim(), email: $("editEmail").value.trim() },
          property: { ...app.property, originalDocumentReceived: $("editOriginalDoc").value, fileBarcode: $("editBarcode").value.trim().toUpperCase() }
        });
      }, "Details updated", `Application ${app.appNo} has been updated.`);
    });

    /* Case On Hold / Release Hold */
    $("holdForm").addEventListener("submit", e => {
      e.preventDefault();
      AdminForm.clearAll(e.target);
      if (!requireText($("holdReason"), 5, "Please enter a reason (at least 5 characters).")) { $("holdReason").focus(); return; }
      const release = app.status === STATUS.HOLD;
      submitAction("holdModal", $("holdSubmit"), () => {
        AdminFileMovement.recordAction(app.appNo, release ? "Hold Released" : "Case On Hold", $("holdReason").value.trim(),
          { status: release ? STATUS.PENDING : STATUS.HOLD });
      }, release ? "Hold released" : "Case put on hold", `Application ${app.appNo} is now ${release ? "Pending" : "On Hold"}.`);
    });

    /* Change Property */
    $("propertyForm").addEventListener("submit", e => {
      e.preventDefault();
      AdminForm.clearAll(e.target);
      let ok = true;
      const val = $("propNew").value.trim();
      if (!/^\d{6,10}$/.test(val)) { AdminForm.setError($("propNew"), "Service No. must be 6–10 digits."); ok = false; }
      else if (val === app.selectedProperty.serviceNo) { AdminForm.setError($("propNew"), "This is already the current Service No."); ok = false; }
      if (!requireText($("propReason"), 5, "Please enter a reason (at least 5 characters).")) ok = false;
      if (!ok) { AdminForm.focusFirstError(e.target); return; }
      submitAction("propertyModal", $("propSubmit"), () => {
        AdminFileMovement.recordAction(app.appNo, "Property Changed",
          `Service No. ${app.selectedProperty.serviceNo} → ${val}. ${$("propReason").value.trim()}`, {
            property: { ...app.property, serviceNo: val },
            selectedProperty: { ...app.selectedProperty, serviceNo: val }
          });
      }, "Property changed", `Application ${app.appNo} is now linked to Service No. ${val}.`);
    });

    /* Query from Other Department */
    $("queryForm").addEventListener("submit", e => {
      e.preventDefault();
      AdminForm.clearAll(e.target);
      let ok = true;
      if (!$("queryDept").value) { AdminForm.setError($("queryDept"), "Please select a department."); ok = false; }
      if (!requireText($("queryText"), 5, "Please enter the query (at least 5 characters).")) ok = false;
      if (!ok) { AdminForm.focusFirstError(e.target); return; }
      submitAction("queryModal", $("querySubmit"), () => {
        AdminFileMovement.recordAction(app.appNo, "Query from Other Department",
          `${$("queryDept").value}: ${$("queryText").value.trim()}`, { status: STATUS.OTHER });
      }, "Query sent", `Query sent to ${$("queryDept").value}.`);
    });

    /* Dispose Ticket */
    $("disposeForm").addEventListener("submit", e => {
      e.preventDefault();
      AdminForm.clearAll(e.target);
      if (!requireText($("disposeRemarks"), 5, "Disposal remarks are required (at least 5 characters).")) { $("disposeRemarks").focus(); return; }
      submitAction("disposeModal", $("disposeSubmit"), () => {
        AdminFileMovement.recordAction(app.appNo, "Disposed", $("disposeRemarks").value.trim(), { status: STATUS.DISPOSED });
      }, "Ticket disposed", `Application ${app.appNo} has been disposed and closed.`);
    });

    /* Documents */
    $("docList").addEventListener("click", e => {
      const b = e.target.closest("[data-doc-index]");
      if (!b) return;
      const d = app.documents[Number(b.dataset.docIndex)];
      $("docTitle").textContent = d.name;
      $("docMeta").textContent = `Application ${app.appNo} · uploaded ${formatDateTime(d.uploadedOn)}`;
      AdminModal.open("docModal");
    });
    document.querySelector(".admin-doc-tools").addEventListener("click", e => {
      const b = e.target.closest("[data-doc]");
      if (!b) return;
      $("docTitle").textContent = b.dataset.doc;
      $("docMeta").textContent = `Application ${app.appNo} · ${app.property.scheme}`;
      AdminModal.open("docModal");
    });

    $("headerProceed").addEventListener("click", () => proceed.open());

    /* "Forward" from Users Of Department → Proceed modal pre-filled */
    $("usersBody").addEventListener("click", e => {
      const b = e.target.closest("[data-forward-to]");
      if (b) proceed.open(b.dataset.forwardTo);
    });
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    load();
    if (!app) { $("appNotFound").hidden = false; return; }
    Session.setApplication(app);
    $("appWorkspace").hidden = false;

    proceed = AdminFileMovement.initProceedModal({
      getApp: () => app,
      onMoved: () => renderAll()
    });
    bindActions();
    renderAll();
  }

  init();
})(window, document);
