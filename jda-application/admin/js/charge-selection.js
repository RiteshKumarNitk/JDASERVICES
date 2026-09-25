/* =====================================================================
   JDA Admin Panel — charge-selection.js   (select-charge.html)
   FLOW:  login → [this page] → Select Charge → dashboard.html
   The selected charge decides the sidebar, counters and inbox.
   ===================================================================== */

(function (window, document) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminAuth, AdminUtil } = window;
  const { icon, escapeHtml, formatNumber } = AdminUtil;
  const { ChargeStore, Session, countFor } = AdminData;

  const grid = document.getElementById("chargeGrid");
  const empty = document.getElementById("noCharges");

  function cardHtml(c, selectedId) {
    const selected = c.id === selectedId;
    const zoneLabel = c.kind === "counselling" ? c.department : c.zone.replace("ZONE-", "Zone ");
    const metrics = c.kind === "counselling"
      ? [["Pending Counselling", countFor("pending-counselling", c.id)], ["Forward Without Counselling", countFor("forward-without-counselling", c.id)]]
      : [["Pending Applications", countFor("my-pending", c.id)], ["Received Applications", countFor("received", c.id)]];
    return `
      <article class="admin-charge-card${selected ? " is-selected" : ""}" aria-labelledby="charge-${c.id}">
        <div class="admin-charge-head">
          <span class="admin-charge-avatar" aria-hidden="true">${icon("i-briefcase")}</span>
          <div>
            <h2 class="admin-charge-title" id="charge-${c.id}">${escapeHtml(c.role)}</h2>
            <p class="admin-charge-sub">${escapeHtml(zoneLabel)}</p>
          </div>
          <span class="admin-charge-tag">${icon("i-check")} Current</span>
        </div>
        <div class="admin-charge-body">
          <dl class="admin-detail-grid">
            <div class="admin-detail-span"><dt>Department</dt><dd>${escapeHtml(c.department)}</dd></div>
            <div><dt>Designation</dt><dd>${escapeHtml(c.designation)}</dd></div>
            <div><dt>Role</dt><dd>${escapeHtml(c.role)}</dd></div>
          </dl>
          <div class="admin-charge-metrics">
            ${metrics.map(([label, n]) => `<div><span>${escapeHtml(label)}</span><strong>${formatNumber(n)}</strong></div>`).join("")}
          </div>
        </div>
        <div class="admin-charge-foot">
          <button type="button" class="admin-btn admin-btn-primary admin-btn-block" data-select-charge="${c.id}"
                  aria-label="Select charge ${escapeHtml(c.name)}">
            Select Charge ${icon("i-arrow-right")}
          </button>
        </div>
      </article>`;
  }

  /* BACKEND INTEGRATION: charges held by the logged-in employee. */
  function render() {
    const user = AdminAuth.getSession();
    const charges = ChargeStore.getForEmployee(user.employeeId);
    const current = Session.getCharge();

    document.getElementById("chargeIntro").textContent = charges.length > 1
      ? `You hold ${charges.length} charges. Select the charge you want to work in — the menu, dashboard and applications will be shown for that charge.`
      : "Select your charge to continue. The menu, dashboard and applications will be shown for that charge.";

    empty.hidden = charges.length > 0;
    grid.hidden = charges.length === 0;
    grid.innerHTML = charges.map(c => cardHtml(c, current && current.id)).join("");
    grid.setAttribute("aria-busy", "false");
  }

  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-select-charge]");
    if (!btn) return;
    const c = ChargeStore.getById(btn.dataset.selectCharge);
    if (!c) return;
    Session.setCharge(c);
    grid.querySelectorAll(".admin-charge-card").forEach(card => card.classList.remove("is-selected"));
    btn.closest(".admin-charge-card").classList.add("is-selected");
    AdminUtil.setButtonLoading(btn, true, "Opening dashboard...");
    setTimeout(() => { window.location.href = AdminData.homePage(c); }, 300);
  });

  render();
})(window, document);
