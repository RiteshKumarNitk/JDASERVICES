/* =====================================================================
   JDA Admin Panel — forward-without-counselling.js
   (forward-without-counselling.html)

   FLOW
     Counselor Dashboard card → this list (?list=<key>)
     Search (Application No. / Applicant / Service) · status filter · paging
     [Proceed] → application-review.html?app=<no>&from=<key>
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminUtil } = window;
  const { icon, escapeHtml, formatDate, statusBadge } = AdminUtil;
  const { COUNSELLING_LISTS, CASE_STATUS, Session, Verification, listApplications, statusLabel } = AdminData;

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const listKey = COUNSELLING_LISTS[params.get("list")] ? params.get("list") : "forward-without-counselling";
  const def = COUNSELLING_LISTS[listKey];
  const charge = Session.getCharge();
  const lastOpened = Session.getApplication();

  let rows = [];
  let page = 1;

  /* BACKEND INTEGRATION:
     Replace demo applications with the counselling-list API response
     for this queue (listKey). */
  function load() {
    rows = listApplications(listKey, charge.id).sort((a, b) => b.appNo.localeCompare(a.appNo));
  }

  function filtered() {
    const q = $("clSearch").value.trim().toLowerCase();
    const st = $("clStatus").value;
    return rows.filter(a =>
      (!st || Verification.caseStatus(a) === st) &&
      (!q || `${a.appNo} ${a.applicant.name} ${a.service.name}`.toLowerCase().includes(q)));
  }

  const reviewUrl = a => `application-review.html?app=${encodeURIComponent(a.appNo)}&from=${listKey}`;

  function rowHtml(a, n) {
    const status = Verification.caseStatus(a);
    const opened = lastOpened && lastOpened.appNo === a.appNo;
    const p = a.selectedProperty;
    return `
      <tr class="${opened ? "is-selected" : ""}">
        <td class="admin-col-num">${n}</td>
        <td>${escapeHtml(a.source)}</td>
        <td><div class="admin-cell-title">${escapeHtml(a.service.name)}</div><div class="admin-cell-sub">${escapeHtml(a.service.subService)}</div></td>
        <td>
          <a class="admin-app-link" href="${reviewUrl(a)}">${escapeHtml(a.appNo)}</a>
          <div class="admin-cell-badges">${statusBadge(statusLabel(status))}${opened ? `<span class="admin-opened-tag">Last opened</span>` : ""}</div>
        </td>
        <td>Plot ${escapeHtml(p.plotNo)}, ${escapeHtml(p.sector)}<div class="admin-cell-sub">${escapeHtml(p.scheme)} · ${escapeHtml(p.zone)}</div></td>
        <td class="admin-col-nowrap">${formatDate(a.counselling.date)}</td>
        <td class="admin-col-nowrap">${escapeHtml(a.counselling.timeSlot)}</td>
        <td>${escapeHtml(a.applicant.name)}</td>
        <td>${a.service.isFreeHoldPatta ? `<span class="admin-yesno admin-yesno--yes">Yes</span>` : `<span class="admin-yesno">No</span>`}</td>
        <td class="admin-col-actions">
          <a class="admin-btn admin-btn-primary admin-btn-sm" href="${reviewUrl(a)}" aria-label="Proceed with application ${escapeHtml(a.appNo)}">
            ${status === CASE_STATUS.CASE_FOUND_OK ? "Forward" : "Proceed"} ${icon("i-arrow-right")}
          </a>
        </td>
      </tr>`;
  }

  function renderPager(total, size, from, to) {
    const pages = Math.max(1, Math.ceil(total / size));
    $("clPager").hidden = total === 0;
    $("clPagerInfo").textContent = total ? `Showing ${from} to ${to} of ${total} entries` : "";
    const btn = (p, label, disabled, current) =>
      `<li><button type="button" class="admin-page-btn${current ? " is-current" : ""}" data-page="${p}" ${disabled ? "disabled" : ""} ${current ? 'aria-current="page"' : ""}>${label}</button></li>`;
    let html = btn(page - 1, "Previous", page === 1);
    for (let p = 1; p <= pages; p++) html += btn(p, p, false, p === page);
    $("clPagerLinks").innerHTML = html + btn(page + 1, "Next", page === pages);
  }

  function render() {
    const list = filtered();
    const size = Number($("pageSize").value);
    page = Math.min(page, Math.max(1, Math.ceil(list.length / size)));
    const start = (page - 1) * size;
    const slice = list.slice(start, start + size);
    const filtering = $("clSearch").value.trim() || $("clStatus").value;

    $("clTableWrap").hidden = !list.length;
    $("clEmpty").hidden = !!list.length;
    $("clClear").hidden = !filtering;
    $("clEmptyTitle").textContent = filtering ? "No matching application" : `No applications in ${def.title}`;
    $("clEmptyText").textContent = filtering
      ? "No application matches this Application No., applicant name, service or status."
      : "There are no applications in this counselling queue right now.";
    $("clBody").innerHTML = slice.map((a, i) => rowHtml(a, start + i + 1)).join("");
    renderPager(list.length, size, start + 1, start + slice.length);
  }

  function init() {
    document.title = `${def.title} — JDA Admin Panel`;
    $("crumbTitle").textContent = def.title;
    $("listTitle").textContent = def.title;
    $("listDescription").textContent = def.description;
    $("clCaption").textContent = def.title;
    $("clStatus").insertAdjacentHTML("beforeend",
      [CASE_STATUS.PENDING_VERIFICATION, CASE_STATUS.INCOMPLETE_DOCUMENTS, CASE_STATUS.CASE_FOUND_OK]
        .map(c => `<option value="${c}">${escapeHtml(statusLabel(c))}</option>`).join(""));
    if (params.get("q")) $("clSearch").value = params.get("q");
    if (params.get("status")) $("clStatus").value = params.get("status");

    load();
    render();

    const rerender = () => { page = 1; render(); };
    $("clSearch").addEventListener("input", AdminUtil.debounce(rerender, 150));
    $("clStatus").addEventListener("change", rerender);
    $("pageSize").addEventListener("change", rerender);
    $("clClear").addEventListener("click", () => { $("clSearch").value = ""; $("clStatus").value = ""; rerender(); $("clSearch").focus(); });
    $("clPagerLinks").addEventListener("click", e => {
      const b = e.target.closest("[data-page]");
      if (!b || b.disabled) return;
      page = Number(b.dataset.page);
      render();
    });
  }

  init();
})(window, document);
