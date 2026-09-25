/* =====================================================================
   JDA Admin Panel — counselor-dashboard.js   (counselor-dashboard.html)
   Citizen Care Center (HQ): counselling queue cards, verification status
   of the queue, and files recently forwarded to the zones.
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminUtil } = window;
  const { icon, escapeHtml, formatNumber, formatDateTime, statusBadge } = AdminUtil;
  const { COUNSELLING_LISTS, CASE_STATUS, Session, ApplicationStore, MovementStore, Verification, countFor, statusLabel } = AdminData;

  const charge = Session.getCharge();
  const listUrl = (key, extra) => `forward-without-counselling.html?list=${key}${extra || ""}`;

  /* BACKEND INTEGRATION: replace counts with the counselling-summary API. */
  function renderCards() {
    document.getElementById("counsellingCards").innerHTML = Object.keys(COUNSELLING_LISTS).map(key => {
      const def = COUNSELLING_LISTS[key];
      return `
        <a class="admin-counter admin-counter--${def.tone}" href="${listUrl(key)}">
          <span class="admin-counter-icon">${icon(def.icon)}</span>
          <span class="admin-counter-body">
            <span class="admin-counter-label">${escapeHtml(def.title)}</span>
            <span class="admin-counter-value">${formatNumber(countFor(key, charge.id))}</span>
          </span>
          <span class="admin-counter-link">Open list ${icon("i-arrow-right")}</span>
        </a>`;
    }).join("");
  }

  /* How many queued files are at each verification status. */
  function renderQueueStatus() {
    const queue = ApplicationStore.counsellingQueue();
    const rows = [
      { code: CASE_STATUS.PENDING_VERIFICATION, icon: "i-clock",        tone: "",        text: "Waiting for review of applicant, service, property, witness, registry and documents." },
      { code: CASE_STATUS.INCOMPLETE_DOCUMENTS, icon: "i-doc-alert",    tone: "danger",  text: "At least one mandatory document is rejected — final submission is locked." },
      { code: CASE_STATUS.CASE_FOUND_OK,        icon: "i-check-circle", tone: "in",      text: "Verified — waiting for Forward to Zone." }
    ];
    document.getElementById("queueStatus").innerHTML = rows.map(r => {
      const n = queue.filter(a => Verification.caseStatus(a) === r.code).length;
      return `
        <li class="admin-activity-item">
          <span class="admin-activity-icon${r.tone ? " admin-activity-icon--" + r.tone : ""}">${icon(r.icon)}</span>
          <div class="admin-grow">
            <p class="admin-activity-text">${statusBadge(statusLabel(r.code))} <span class="admin-queue-count">${n} file${n === 1 ? "" : "s"}</span></p>
            <p class="admin-activity-meta">${escapeHtml(r.text)}</p>
          </div>
          ${n ? `<a class="admin-action-btn admin-action-btn--edit" href="${listUrl("forward-without-counselling", "&status=" + r.code)}">${icon("i-eye")} View</a>` : ""}
        </li>`;
    }).join("");
  }

  function renderForwarded() {
    const list = MovementStore.outbox(charge.id).slice(0, 6);
    document.getElementById("forwardedList").innerHTML = list.length ? list.map(m => `
      <li class="admin-activity-item">
        <span class="admin-activity-icon admin-activity-icon--in">${icon("i-send")}</span>
        <div>
          <p class="admin-activity-text">
            <a href="application-review.html?app=${encodeURIComponent(m.appNo)}&from=forward-without-counselling">#${escapeHtml(m.appNo)}</a>
            forwarded to ${escapeHtml(m.toRole)} — ${escapeHtml(m.toName)}
          </p>
          <p class="admin-activity-meta">
            <span class="admin-activity-module">${escapeHtml(m.caseStatus || m.action)}</span>
            <time datetime="${m.at}">${formatDateTime(m.at)}</time>
          </p>
        </div>
      </li>`).join("") : `<li class="admin-empty-inline">No file has been forwarded to a zone yet.</li>`;
  }

  renderCards();
  renderQueueStatus();
  renderForwarded();
})(window, document);
