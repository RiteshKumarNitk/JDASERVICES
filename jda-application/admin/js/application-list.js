/* =====================================================================
   JDA Admin Panel — application-list.js   (application-list.html)

   FLOW
     Dashboard counter / sidebar item → this page (?list=<key>)
     Search · Entries per page · Status · Service → filter demo data
     Application Number or [View] → application-detail.html?app=<no>&from=<key>

   Three column layouts:
     inbox lists  → the columns of the existing JDA application table
     find         → same, "Forward By" replaced by "Currently With"
     outbox       → one row per file forwarded by this charge
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminUtil } = window;
  const { icon, escapeHtml, formatDate, formatDateTime, statusBadge } = AdminUtil;
  const { LISTS, STATUS, Session, ApplicationStore, MovementStore, ChargeStore, listApplications, daysFromToday } = AdminData;

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const listKey = LISTS[params.get("list")] ? params.get("list") : "received";
  const def = LISTS[listKey];
  const mode = listKey === "outbox" ? "outbox" : listKey === "find" ? "find" : "inbox";
  const charge = Session.getCharge();
  const lastOpened = Session.getApplication();

  let rows = [];
  let page = 1;

  /* ===================================================================
     DATA → ROWS
     =================================================================== */
  function holderText(app) {
    const c = ChargeStore.getById(app.currentChargeId);
    if (!c) return "—";
    return app.status === STATUS.DISPOSED ? "Disposed" : `${c.holder ? c.holder.name : "Vacant"} (${c.role})`;
  }

  function appRow(app) {
    const last = MovementStore.last(app.appNo);
    return {
      app,
      remark: last ? last.remarks : "",
      forwardBy: last ? `${last.fromName} (${last.fromRole})` : "—",
      currentlyWith: holderText(app),
      pendingDays: Math.max(0, -daysFromToday(app.startDate)),
      daysLeft: daysFromToday(app.dueDate)
    };
  }

  /* BACKEND INTEGRATION:
     Replace with the application-list API for (list key, selected charge).
     Outbox = movement rows where fromCharge = selected charge. */
  function loadRows() {
    if (mode === "outbox") {
      rows = MovementStore.outbox(charge.id).map(m => {
        const app = ApplicationStore.get(m.appNo);
        return app ? { ...appRow(app), movement: m } : null;
      }).filter(Boolean);
    } else {
      rows = listApplications(listKey, charge.id)
        .map(appRow)
        .sort((a, b) => a.daysLeft - b.daysLeft);
    }
  }

  function filteredRows() {
    const q = $("listSearch").value.trim().toLowerCase();
    const status = $("statusFilter").value;
    const service = $("serviceFilter").value;
    return rows.filter(r => {
      const a = r.app;
      if (status && a.status !== status) return false;
      if (service && a.service !== service) return false;
      if (!q) return true;
      return [a.appNo, a.applicant.name, a.service, a.property.sectorPlot, a.property.serviceNo, a.property.scheme]
        .join(" ").toLowerCase().includes(q);
    });
  }

  /* ===================================================================
     RENDER
     =================================================================== */
  const detailUrl = appNo => `application-detail.html?app=${encodeURIComponent(appNo)}&from=${listKey}`;

  function daysLeftHtml(n, status) {
    if (status === STATUS.DISPOSED) return `<span class="admin-muted">Disposed</span>`;
    if (n < 0) return `<span class="admin-days admin-days--danger">Expired ${-n}d ago</span>`;
    if (n <= 5) return `<span class="admin-days admin-days--warn">${n} day${n === 1 ? "" : "s"}</span>`;
    return `<span class="admin-days">${n} days</span>`;
  }

  function appNoCell(a) {
    const opened = lastOpened && lastOpened.appNo === a.appNo;
    return `
      <a class="admin-app-link" href="${detailUrl(a.appNo)}" data-open-app="${a.appNo}">${escapeHtml(a.appNo)}</a>
      <div class="admin-cell-badges">${statusBadge(a.status)}${opened ? `<span class="admin-opened-tag">Last opened</span>` : ""}</div>`;
  }

  function viewBtn(a) {
    return `<a class="admin-action-btn admin-action-btn--edit" href="${detailUrl(a.appNo)}" data-open-app="${a.appNo}" aria-label="View application ${escapeHtml(a.appNo)}">${icon("i-eye")} View</a>`;
  }

  function headHtml() {
    if (mode === "outbox") {
      return `<tr>
        <th scope="col" class="admin-col-num">S.No</th><th scope="col">Application Number</th><th scope="col">Service Name</th>
        <th scope="col">Applicant Name</th><th scope="col">Forwarded On</th><th scope="col">Forwarded To</th>
        <th scope="col">Remarks</th><th scope="col">Currently With</th><th scope="col" class="admin-col-actions">Action</th></tr>`;
    }
    return `<tr>
      <th scope="col" class="admin-col-num">S.No</th>
      <th scope="col">Application Number</th>
      <th scope="col" class="admin-col-amount">Pending Days</th>
      <th scope="col">Application Start - Due Date</th>
      <th scope="col">Days Remaining on Dispose</th>
      <th scope="col">Service Name</th>
      <th scope="col">Applicant Name</th>
      <th scope="col">Property No. / Service No.</th>
      <th scope="col">Scheme / Scheme Developer</th>
      <th scope="col">Remark</th>
      <th scope="col">${mode === "find" ? "Currently With" : "Forward By"}</th>
      <th scope="col" class="admin-col-actions">Action</th></tr>`;
  }

  function rowHtml(r, index) {
    const a = r.app;
    const selected = lastOpened && lastOpened.appNo === a.appNo ? " is-selected" : "";
    if (mode === "outbox") {
      const m = r.movement;
      return `<tr class="${selected}">
        <td class="admin-col-num">${index}</td>
        <td>${appNoCell(a)}</td>
        <td>${escapeHtml(a.service)}</td>
        <td>${escapeHtml(a.applicant.name)}</td>
        <td class="admin-col-nowrap">${formatDateTime(m.at)}</td>
        <td><div class="admin-cell-title">${escapeHtml(m.toName)}</div><div class="admin-cell-sub">${escapeHtml(m.toRole)} · ${escapeHtml(m.action)}</div></td>
        <td><div class="admin-cell-clamp">${escapeHtml(m.remarks)}</div></td>
        <td>${escapeHtml(r.currentlyWith)}</td>
        <td class="admin-col-actions">${viewBtn(a)}</td></tr>`;
    }
    return `<tr class="${selected}">
      <td class="admin-col-num">${index}</td>
      <td>${appNoCell(a)}</td>
      <td class="admin-col-amount">${r.pendingDays}</td>
      <td class="admin-col-nowrap">${formatDate(a.startDate)}<br><span class="admin-muted">to ${formatDate(a.dueDate)}</span></td>
      <td>${daysLeftHtml(r.daysLeft, a.status)}</td>
      <td><div class="admin-cell-title">${escapeHtml(a.service)}</div></td>
      <td>${escapeHtml(a.applicant.name)}</td>
      <td>${escapeHtml(a.property.sectorPlot)}<div class="admin-cell-sub">S.No. ${escapeHtml(a.property.serviceNo)}</div></td>
      <td>${escapeHtml(a.property.scheme)}<div class="admin-cell-sub">${escapeHtml(a.property.developerName)}</div></td>
      <td><div class="admin-cell-clamp">${escapeHtml(r.remark)}</div></td>
      <td>${escapeHtml(mode === "find" ? r.currentlyWith : r.forwardBy)}</td>
      <td class="admin-col-actions">${viewBtn(a)}</td></tr>`;
  }

  function renderPager(total, size, from, to) {
    const pages = Math.max(1, Math.ceil(total / size));
    $("pager").hidden = total === 0;
    $("pagerInfo").textContent = total ? `Showing ${from} to ${to} of ${total} entries` : "";
    const btn = (p, label, disabled, current) =>
      `<li><button type="button" class="admin-page-btn${current ? " is-current" : ""}" data-page="${p}" ${disabled ? "disabled" : ""} ${current ? 'aria-current="page"' : ""}>${label}</button></li>`;
    let html = btn(page - 1, "Previous", page === 1);
    for (let p = 1; p <= pages; p++) {
      if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - page) > 1) {
        if (!html.endsWith("…</li>")) html += `<li class="admin-page-gap">…</li>`;
        continue;
      }
      html += btn(p, p, false, p === page);
    }
    html += btn(page + 1, "Next", page === pages);
    $("pagerLinks").innerHTML = html;
  }

  function render() {
    const list = filteredRows();
    const size = Number($("pageSize").value);
    const pages = Math.max(1, Math.ceil(list.length / size));
    page = Math.min(page, pages);
    const start = (page - 1) * size;
    const slice = list.slice(start, start + size);

    $("tableWrap").hidden = list.length === 0;
    $("listEmpty").hidden = list.length !== 0;
    const filtering = $("listSearch").value.trim() || $("statusFilter").value || $("serviceFilter").value;
    $("clearFilters").hidden = !filtering;
    $("listEmptyTitle").textContent = filtering ? "No matching applications" : `No ${def.title.toLowerCase()}`;
    $("listEmptyText").textContent = filtering
      ? "No application matches the current search or filters."
      : mode === "outbox" ? "You have not forwarded any file from this charge yet."
      : "There are no files in this list for your charge right now.";

    $("tableBody").innerHTML = slice.map((r, i) => rowHtml(r, start + i + 1)).join("");
    renderPager(list.length, size, start + 1, start + slice.length);
  }

  function renderSkeleton() {
    $("tableBody").innerHTML = Array.from({ length: 5 }, () =>
      `<tr aria-hidden="true"><td colspan="12"><div class="admin-skeleton admin-skel-line"></div></td></tr>`).join("");
  }

  function fillFilters() {
    const statuses = mode === "find" ? Object.values(STATUS) : Object.values(STATUS).filter(s => s !== STATUS.DISPOSED);
    $("statusFilter").insertAdjacentHTML("beforeend", statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""));
    const services = [...new Set(rows.map(r => r.app.service))].sort();
    $("serviceFilter").insertAdjacentHTML("beforeend", services.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""));
    if (params.get("service")) $("serviceFilter").value = params.get("service");
    if (params.get("q")) $("listSearch").value = params.get("q");
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    document.title = `${def.title} — JDA Admin Panel`;
    $("crumbTitle").textContent = def.title;
    $("listTitle").textContent = def.title;
    $("listDescription").textContent = `${def.description} Charge: ${charge.name}.`;
    $("tableCaption").textContent = `${def.title} — ${charge.name}`;
    $("tableHead").innerHTML = headHtml();
    $("appTable").classList.toggle("admin-app-table--outbox", mode === "outbox");
    if (mode === "find") $("listSearch").placeholder = "Enter Application No., applicant name or property no.";

    renderSkeleton();
    setTimeout(() => {
      loadRows();
      fillFilters();
      render();
      if (mode === "find") $("listSearch").focus();
    }, 250);

    const rerender = () => { page = 1; render(); };
    $("listSearch").addEventListener("input", AdminUtil.debounce(rerender, 150));
    $("statusFilter").addEventListener("change", rerender);
    $("serviceFilter").addEventListener("change", rerender);
    $("pageSize").addEventListener("change", rerender);
    $("clearFilters").addEventListener("click", () => {
      $("listSearch").value = ""; $("statusFilter").value = ""; $("serviceFilter").value = "";
      rerender();
      $("listSearch").focus();
    });
    $("pagerLinks").addEventListener("click", e => {
      const b = e.target.closest("[data-page]");
      if (!b || b.disabled) return;
      page = Number(b.dataset.page);
      render();
      $("tableWrap").scrollIntoView({ block: "nearest" });
    });
    // Remember the selected application before leaving the list.
    $("tableBody").addEventListener("click", e => {
      const link = e.target.closest("[data-open-app]");
      if (!link) return;
      const app = ApplicationStore.get(link.dataset.openApp);
      if (app) Session.setApplication(app);
    });
  }

  init();
})(window, document);
