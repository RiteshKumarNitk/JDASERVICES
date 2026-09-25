/* =====================================================================
   JDA Admin Panel — admin-dashboard.js
   dashboard.html        → clickable counters, recent movements, due alerts
   pending-summary.html  → category-wise and service-wise pending counts
   All numbers are computed for the SELECTED CHARGE only.
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminUtil } = window;
  const { icon, escapeHtml, formatNumber, formatDateTime } = AdminUtil;
  const { LISTS, DASHBOARD_LISTS, Session, MovementStore, ApplicationStore, countFor, listApplications, daysFromToday } = AdminData;

  const charge = Session.getCharge();
  const listUrl = (key, extra) => `application-list.html?list=${key}${extra || ""}`;
  const detailUrl = (appNo, from) => `application-detail.html?app=${encodeURIComponent(appNo)}&from=${from}`;

  /* ---------------- DASHBOARD ---------------- */

  /* BACKEND INTEGRATION: counters → dashboard-summary API for the charge. */
  function renderCounters() {
    document.getElementById("counterGrid").innerHTML = DASHBOARD_LISTS.map(key => {
      const def = LISTS[key];
      return `
        <a class="admin-counter admin-counter--${def.tone}" href="${listUrl(key)}">
          <span class="admin-counter-icon">${icon(def.icon)}</span>
          <span class="admin-counter-body">
            <span class="admin-counter-label">${escapeHtml(def.title)}</span>
            <span class="admin-counter-value">${formatNumber(countFor(key, charge.id))}</span>
          </span>
          <span class="admin-counter-link">View list ${icon("i-arrow-right")}</span>
        </a>`;
    }).join("");
  }

  function renderMovements() {
    const list = MovementStore.getAll()
      .filter(m => m.toChargeId && m.toChargeId !== m.fromChargeId && (m.fromChargeId === charge.id || m.toChargeId === charge.id))
      .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id)
      .slice(0, 6);

    document.getElementById("movementList").innerHTML = list.length ? list.map(m => {
      const outgoing = m.fromChargeId === charge.id;
      return `
        <li class="admin-activity-item">
          <span class="admin-activity-icon${outgoing ? "" : " admin-activity-icon--in"}">${icon(outgoing ? "i-send" : "i-inbox")}</span>
          <div>
            <p class="admin-activity-text">
              <a href="${detailUrl(m.appNo, outgoing ? "outbox" : "received")}">#${escapeHtml(m.appNo)}</a>
              ${outgoing ? `sent to ${escapeHtml(m.toName)} (${escapeHtml(m.toRole)})` : `received from ${escapeHtml(m.fromName)} (${escapeHtml(m.fromRole)})`}
            </p>
            <p class="admin-activity-meta">
              <span class="admin-activity-module">${escapeHtml(m.action)}</span>
              <time datetime="${m.at}">${formatDateTime(m.at)}</time>
              ${m.remarks ? `<span>“${escapeHtml(m.remarks)}”</span>` : ""}
            </p>
          </div>
        </li>`;
    }).join("") : `<li class="admin-empty-inline">No file movements yet for this charge.</li>`;
  }

  function renderDueAlerts() {
    const list = listApplications("received", charge.id)
      .map(a => ({ a, left: daysFromToday(a.dueDate) }))
      .filter(x => x.left <= 5)
      .sort((x, y) => x.left - y.left)
      .slice(0, 6);

    document.getElementById("dueList").innerHTML = list.length ? list.map(({ a, left }) => `
      <li class="admin-activity-item">
        <span class="admin-activity-icon ${left < 0 ? "admin-activity-icon--danger" : "admin-activity-icon--warn"}">${icon(left < 0 ? "i-alert" : "i-clock")}</span>
        <div>
          <p class="admin-activity-text"><a href="${detailUrl(a.appNo, left < 0 ? "due-expired" : "received")}">#${escapeHtml(a.appNo)}</a> ${escapeHtml(a.service)}</p>
          <p class="admin-activity-meta">
            <span class="${left < 0 ? "admin-text-danger" : "admin-text-warning"}">${left < 0 ? `Expired ${-left} day${left === -1 ? "" : "s"} ago` : left === 0 ? "Due today" : `${left} day${left === 1 ? "" : "s"} left`}</span>
            <span>${escapeHtml(a.applicant.name)}</span>
          </p>
        </div>
      </li>`).join("") : `<li class="admin-empty-inline">No files are close to their due date.</li>`;
  }

  /* ---------------- PENDING SUMMARY ---------------- */

  function renderSummary() {
    const categories = ["received", "my-pending", "due-expired", "pending-applicant", "pending-other-dept", "on-hold",
                        "case-open", "vigyapti", "agenda", "layout", "checklist", "pdc"];
    document.getElementById("categoryBody").innerHTML = categories.map(key => `
      <tr>
        <td><span class="admin-cell-icon">${icon(LISTS[key].icon)}</span>${escapeHtml(LISTS[key].title)}</td>
        <td class="admin-col-amount"><a class="admin-count-link" href="${listUrl(key)}">${countFor(key, charge.id)}</a></td>
        <td class="admin-col-actions"><a class="admin-action-btn admin-action-btn--edit" href="${listUrl(key)}">${icon("i-eye")} View</a></td>
      </tr>`).join("");

    const inbox = ApplicationStore.inbox(charge.id);
    const services = [...new Set(inbox.map(a => a.service))].sort();
    const cell = (key, svc) => {
      const n = listApplications(key, charge.id).filter(a => a.service === svc).length;
      return n ? `<a class="admin-count-link" href="${listUrl(key, "&service=" + encodeURIComponent(svc))}">${n}</a>` : `<span class="admin-muted">0</span>`;
    };
    document.getElementById("serviceBody").innerHTML = services.length ? services.map(svc => `
      <tr>
        <td>${escapeHtml(svc)}</td>
        <td class="admin-col-amount">${cell("received", svc)}</td>
        <td class="admin-col-amount">${cell("my-pending", svc)}</td>
        <td class="admin-col-amount">${cell("on-hold", svc)}</td>
        <td class="admin-col-amount">${cell("due-expired", svc)}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="admin-muted">No pending files.</td></tr>`;
  }

  /* ---------------- INIT ---------------- */
  if (document.getElementById("counterGrid")) {
    document.getElementById("dashSubtitle").textContent =
      `Applications and files of ${charge.name}. Click any counter to open its list.`;
    renderCounters();
    renderMovements();
    renderDueAlerts();
  }
  if (document.getElementById("categoryBody")) renderSummary();
})(window, document);
