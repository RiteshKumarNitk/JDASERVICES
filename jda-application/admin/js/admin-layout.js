/* =====================================================================
   JDA Admin Panel — admin-layout.js
   Builds the shared chrome for every protected admin page.

   Two layouts:
     <body data-layout="plain">   header only — used by select-charge.html
                                   (no sidebar until a charge is selected)
     <body> (default)             header + CHARGE-SPECIFIC sidebar + footer;
                                   redirects to select-charge.html when no
                                   charge is selected.

   Page content lives in <main class="admin-main" id="adminMain">.

   BACKEND HANDOFF:
   renderHeader / renderSidebar / renderFooter = _Layout.cshtml.
   NAV_SECTIONS = the menu; in MVC it can be built per role/charge.
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminAuth, AdminModal, AdminForm, AdminToast, AdminUtil } = window;
  const { icon, escapeHtml, initials } = AdminUtil;

  /* -------------------------------------------------------------------
     SIDEBAR MENU (names as in the existing JDA system)
       key   – active-state key (see activeKey())
       count – list key whose count is shown as a badge
     ------------------------------------------------------------------- */
  const NAV_SECTIONS = [
    { heading: null, items: [
      { key: "dashboard",   label: "Dashboard",        icon: "i-grid",   href: "dashboard.html" },
      { key: "find",        label: "Find Application", icon: "i-search", href: "application-list.html?list=find" }
    ]},
    { heading: "Files", items: [
      { key: "received",    label: "Received Applications",   icon: "i-inbox", href: "application-list.html?list=received",   count: "received" },
      { key: "my-pending",  label: "My Pending Applications", icon: "i-clock", href: "application-list.html?list=my-pending", count: "my-pending" },
      { key: "outbox",      label: "Outbox",                  icon: "i-send",  href: "application-list.html?list=outbox",     count: "outbox" }
    ]},
    { heading: "Pending", items: [
      { key: "pending-summary",   label: "Pending Summary",         icon: "i-list",        href: "pending-summary.html" },
      { key: "due-expired",       label: "Due Date Expired",        icon: "i-alert",       href: "application-list.html?list=due-expired",       count: "due-expired", alert: true },
      { key: "pending-applicant", label: "Pending At Applicant",    icon: "i-user",        href: "application-list.html?list=pending-applicant", count: "pending-applicant" },
      { key: "case-open",         label: "Case Open Request",       icon: "i-folder-open", href: "application-list.html?list=case-open",         count: "case-open" },
      { key: "vigyapti",          label: "Vigyapti For Objections", icon: "i-megaphone",   href: "application-list.html?list=vigyapti",          count: "vigyapti" }
    ]},
    { heading: "Charge", items: [
      { key: "transfer",    label: "Application Transfer To", icon: "i-transfer", href: "application-transfer.html" },
      { key: "handover",    label: "Handover Charge",         icon: "i-handover", href: "handover-charge.html" },
      { key: "reports",     label: "Reports",                 icon: "i-chart",    href: "reports.html" }
    ]}
  ];

  /* Sidebar of the Citizen Care Center (HQ) — counselling / verification.
     Shown when the selected charge has kind "counselling". */
  const COUNSELLING_NAV_SECTIONS = [
    { heading: null, items: [
      { key: "counselor-dashboard", label: "Counselor Dashboard", icon: "i-grid",   href: "counselor-dashboard.html" },
      { key: "find",                label: "Find Application",    icon: "i-search", href: "application-list.html?list=find" }
    ]},
    { heading: "Counselling", items: [
      { key: "pending-counselling",         label: "Pending Counselling",         icon: "i-calendar", href: "forward-without-counselling.html?list=pending-counselling",         count: "pending-counselling" },
      { key: "forward-without-counselling", label: "Forward Without Counselling", icon: "i-send",     href: "forward-without-counselling.html?list=forward-without-counselling", count: "forward-without-counselling" },
      { key: "applicant-not-appeared",      label: "Applicant Not Appeared",      icon: "i-user",     href: "forward-without-counselling.html?list=applicant-not-appeared",      count: "applicant-not-appeared" }
    ]},
    { heading: "Files", items: [
      { key: "outbox", label: "Outbox", icon: "i-inbox", href: "application-list.html?list=outbox", count: "outbox" }
    ]}
  ];

  const MOBILE_QUERY = window.matchMedia("(max-width: 991.98px)");
  let layoutEl, sidebarEl, toggleBtn;

  /* Which menu item is active on this page. */
  function activeKey() {
    const page = document.body.dataset.adminPage || "";
    const params = new URLSearchParams(window.location.search);
    if (page === "application-list") return params.get("list") || "received";
    if (page === "application-detail") return params.get("from") || "received";
    if (page === "counselling-list") return params.get("list") || "forward-without-counselling";
    if (page === "application-review") return params.get("from") || "forward-without-counselling";
    return page;
  }

  /* ===================================================================
     RENDER
     =================================================================== */
  function renderNavItem(item, active, chargeId) {
    const isActive = item.key === active;
    const count = item.count ? AdminData.countFor(item.count, chargeId) : null;
    return `
      <li class="admin-nav-item">
        <a class="admin-nav-link${isActive ? " is-active" : ""}" href="${item.href}" ${isActive ? 'aria-current="page"' : ""} title="${escapeHtml(item.label)}">
          ${icon(item.icon, "admin-nav-icon")}
          <span class="admin-nav-label">${escapeHtml(item.label)}</span>
          ${item.count ? `<span class="admin-nav-count${item.alert ? " admin-nav-count--alert" : ""}" data-count-key="${item.count}"${count ? "" : " hidden"}>${count}</span>` : ""}
        </a>
      </li>`;
  }

  function renderSidebar(charge) {
    const active = activeKey();
    return `
      <aside class="admin-sidebar" id="adminSidebar" aria-label="Charge navigation">
        <div class="admin-sidebar-brand">
          <span class="admin-brand-mark" aria-hidden="true">JDA</span>
          <span class="admin-brand-text"><strong>JDA</strong><small>Admin Panel</small></span>
          <button type="button" class="admin-sidebar-close" id="adminSidebarClose" aria-label="Close menu">${icon("i-x")}</button>
        </div>

        <div class="admin-sidebar-charge" title="${escapeHtml(charge.name)}">
          <span class="admin-sidebar-charge-label">Current Charge</span>
          <strong>${escapeHtml(AdminData.chargeLabel(charge))}</strong>
          <a href="select-charge.html" class="admin-sidebar-charge-switch">${icon("i-refresh")} Switch Charge</a>
        </div>

        <nav class="admin-nav">
          ${(charge.kind === "counselling" ? COUNSELLING_NAV_SECTIONS : NAV_SECTIONS).map(sec => `
            ${sec.heading ? `<p class="admin-nav-heading">${escapeHtml(sec.heading)}</p>` : ""}
            <ul class="admin-nav-list">${sec.items.map(i => renderNavItem(i, active, charge.id)).join("")}</ul>`).join("")}
        </nav>
      </aside>
      <div class="admin-sidebar-overlay" id="adminSidebarOverlay" aria-hidden="true"></div>`;
  }

  function renderHeader(user, charge, plain) {
    const subtitle = charge ? AdminData.chargeLabel(charge) : "No charge selected";
    return `
      <header class="admin-header">
        <div class="admin-header-left">
          ${plain ? "" : `<button type="button" class="admin-icon-btn admin-hamburger" id="adminNavToggle"
                  aria-label="Toggle navigation" aria-controls="adminSidebar" aria-expanded="true">${icon("i-menu")}</button>`}
          <a class="admin-header-logo${plain ? " is-always" : ""}" href="${charge ? AdminData.homePage(charge) : "select-charge.html"}" aria-label="JDA Admin home">
            <span class="admin-brand-mark admin-brand-mark--sm" aria-hidden="true">JDA</span>
          </a>
          <div class="admin-header-title">
            <span class="admin-header-title-full">Jaipur Development Authority : Property Services</span>
            <span class="admin-header-title-short">JDA : Property Services</span>
            ${charge ? `<span class="admin-header-charge">${icon("i-map-pin")}${escapeHtml(AdminData.chargeLabel(charge))}</span>` : ""}
          </div>
        </div>

        <div class="admin-header-right">
          <div class="admin-dropdown" data-dropdown>
            <button type="button" class="admin-user-btn" aria-haspopup="menu" aria-expanded="false" data-dropdown-toggle>
              <span class="admin-avatar" aria-hidden="true">${escapeHtml(initials(user.name))}</span>
              <span class="admin-user-text">
                <span class="admin-user-name">Welcome ${escapeHtml(user.name)}</span>
                <span class="admin-user-role">${escapeHtml(subtitle)}</span>
              </span>
              ${icon("i-chev-down", "admin-user-caret")}
            </button>
            <div class="admin-dropdown-menu admin-user-menu" role="menu">
              <div class="admin-user-menu-head">
                <span class="admin-avatar admin-avatar--lg" aria-hidden="true">${escapeHtml(initials(user.name))}</span>
                <div>
                  <strong>${escapeHtml(user.name)}</strong>
                  <span>${escapeHtml(subtitle)}</span>
                  <span class="admin-muted">Employee ID: ${escapeHtml(user.employeeId)}</span>
                </div>
              </div>
              <button type="button" class="admin-menu-item" role="menuitem" data-open-profile>${icon("i-user")}<span>Profile</span></button>
              <button type="button" class="admin-menu-item" role="menuitem" data-open-password>${icon("i-key")}<span>Change Password</span></button>
              ${charge ? `<a href="select-charge.html" class="admin-menu-item" role="menuitem">${icon("i-refresh")}<span>Switch Charge</span></a>` : ""}
              <div class="admin-menu-divider" role="separator"></div>
              <button type="button" class="admin-menu-item admin-menu-item--danger" role="menuitem" data-logout>${icon("i-logout")}<span>Logout</span></button>
            </div>
          </div>
        </div>
      </header>`;
  }

  function renderFooter() {
    return `
      <footer class="admin-footer">
        <p>© ${new Date().getFullYear()} Jaipur Development Authority, Government of Rajasthan. All rights reserved.</p>
        <p class="admin-footer-meta">
          Admin Panel · Frontend prototype
          <button type="button" class="admin-link-btn" data-reset-demo title="Restore all demo applications, charges and history">Reset demo data</button>
        </p>
      </footer>`;
  }

  /* Profile + Change Password modals (shared by every page) */
  function renderAccountModals(user, charge) {
    const held = AdminData.ChargeStore.getForEmployee(user.employeeId);
    return `
      <div class="admin-modal" id="profileModal" hidden role="dialog" aria-modal="true" aria-labelledby="profileTitle">
        <div class="admin-modal-backdrop" data-modal-close></div>
        <div class="admin-modal-dialog admin-modal-dialog--sm">
          <div class="admin-modal-head">
            <h2 class="admin-modal-title" id="profileTitle">My Profile</h2>
            <button type="button" class="admin-modal-close" data-modal-close aria-label="Close">${icon("i-x")}</button>
          </div>
          <div class="admin-modal-body">
            <dl class="admin-detail-grid admin-detail-grid--2">
              <div><dt>Name</dt><dd>${escapeHtml(user.name)}</dd></div>
              <div><dt>Employee ID</dt><dd>${escapeHtml(user.employeeId)}</dd></div>
              <div><dt>Mobile</dt><dd>${escapeHtml(user.mobile || "—")}</dd></div>
              <div><dt>Email</dt><dd>${escapeHtml(user.email || "—")}</dd></div>
              <div class="admin-detail-span"><dt>Current Charge</dt><dd>${escapeHtml(charge ? charge.name : "Not selected")}</dd></div>
              <div class="admin-detail-span"><dt>Charges Held</dt><dd>${held.map(c => escapeHtml(c.name)).join("<br>") || "—"}</dd></div>
            </dl>
          </div>
          <div class="admin-modal-foot"><button type="button" class="admin-btn admin-btn-outline" data-modal-close>Close</button></div>
        </div>
      </div>

      <div class="admin-modal" id="passwordModal" hidden role="dialog" aria-modal="true" aria-labelledby="passwordTitle">
        <div class="admin-modal-backdrop" data-modal-close></div>
        <div class="admin-modal-dialog admin-modal-dialog--sm">
          <div class="admin-modal-head">
            <h2 class="admin-modal-title" id="passwordTitle">Change Password</h2>
            <button type="button" class="admin-modal-close" data-modal-close aria-label="Close">${icon("i-x")}</button>
          </div>
          <form id="passwordForm" novalidate>
            <div class="admin-modal-body admin-stack">
              <div class="admin-field">
                <label for="pwCurrent">Current Password <span class="admin-req">*</span></label>
                <input type="password" id="pwCurrent" class="admin-input" autocomplete="current-password" data-autofocus>
                <p class="admin-field-error"></p>
              </div>
              <div class="admin-field">
                <label for="pwNew">New Password <span class="admin-req">*</span></label>
                <input type="password" id="pwNew" class="admin-input" autocomplete="new-password" aria-describedby="pwNewHint">
                <p class="admin-hint" id="pwNewHint">At least 8 characters with a letter, a number and a symbol.</p>
                <p class="admin-field-error"></p>
              </div>
              <div class="admin-field">
                <label for="pwConfirm">Confirm New Password <span class="admin-req">*</span></label>
                <input type="password" id="pwConfirm" class="admin-input" autocomplete="new-password">
                <p class="admin-field-error"></p>
              </div>
            </div>
            <div class="admin-modal-foot">
              <button type="button" class="admin-btn admin-btn-outline" data-modal-close>Cancel</button>
              <button type="submit" class="admin-btn admin-btn-primary" id="pwSubmit">Update Password</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  /* ===================================================================
     BEHAVIOUR
     =================================================================== */
  function isMobile() { return MOBILE_QUERY.matches; }

  function syncToggleState() {
    if (!toggleBtn) return;
    const expanded = isMobile()
      ? layoutEl.classList.contains("admin-layout--nav-open")
      : !layoutEl.classList.contains("admin-layout--collapsed");
    toggleBtn.setAttribute("aria-expanded", String(expanded));
  }

  function openMobileNav() {
    layoutEl.classList.add("admin-layout--nav-open");
    document.body.classList.add("admin-nav-locked");
    syncToggleState();
    const first = sidebarEl.querySelector(".admin-nav-link");
    if (first) first.focus();
  }

  function closeMobileNav() {
    if (!layoutEl.classList.contains("admin-layout--nav-open")) return;
    layoutEl.classList.remove("admin-layout--nav-open");
    document.body.classList.remove("admin-nav-locked");
    syncToggleState();
  }

  function setCollapsed(collapsed) {
    layoutEl.classList.toggle("admin-layout--collapsed", collapsed);
    try { localStorage.setItem(AdminData.KEYS.sidebar, collapsed ? "1" : "0"); } catch (e) { /* ignore */ }
    syncToggleState();
  }

  function bindSidebar() {
    toggleBtn.addEventListener("click", () => {
      if (isMobile()) {
        layoutEl.classList.contains("admin-layout--nav-open") ? closeMobileNav() : openMobileNav();
      } else {
        setCollapsed(!layoutEl.classList.contains("admin-layout--collapsed"));
      }
    });
    document.getElementById("adminSidebarOverlay").addEventListener("click", closeMobileNav);
    document.getElementById("adminSidebarClose").addEventListener("click", () => { closeMobileNav(); toggleBtn.focus(); });
    MOBILE_QUERY.addEventListener("change", () => { closeMobileNav(); syncToggleState(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !AdminModal.top()) closeMobileNav();
    });
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll("[data-dropdown].is-open").forEach(dd => {
      if (dd === except) return;
      dd.classList.remove("is-open");
      dd.querySelector("[data-dropdown-toggle]").setAttribute("aria-expanded", "false");
    });
  }

  function bindDropdowns() {
    document.querySelectorAll("[data-dropdown]").forEach(dd => {
      const toggle = dd.querySelector("[data-dropdown-toggle]");
      toggle.addEventListener("click", e => {
        e.stopPropagation();
        const open = !dd.classList.contains("is-open");
        closeAllDropdowns(dd);
        dd.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        if (open) {
          const firstItem = dd.querySelector("[role=menuitem]");
          if (firstItem) firstItem.focus();
        }
      });
      dd.addEventListener("keydown", e => {
        const items = Array.from(dd.querySelectorAll("[role=menuitem]"));
        const idx = items.indexOf(document.activeElement);
        if (e.key === "ArrowDown" && items.length) { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
        if (e.key === "ArrowUp" && items.length)   { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
        if (e.key === "Escape") { closeAllDropdowns(); toggle.focus(); }
      });
    });
    document.addEventListener("click", e => {
      if (!e.target.closest("[data-dropdown]")) closeAllDropdowns();
    });
  }

  function bindPasswordForm() {
    const form = document.getElementById("passwordForm");
    const cur = document.getElementById("pwCurrent");
    const nw = document.getElementById("pwNew");
    const cf = document.getElementById("pwConfirm");
    const btn = document.getElementById("pwSubmit");
    AdminForm.liveClear(form);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      AdminForm.clearAll(form);
      let ok = true;
      if (!cur.value) { AdminForm.setError(cur, "Current password is required."); ok = false; }
      if (!nw.value) { AdminForm.setError(nw, "New password is required."); ok = false; }
      else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(nw.value)) { AdminForm.setError(nw, "Use at least 8 characters with a letter, a number and a symbol."); ok = false; }
      else if (nw.value === cur.value) { AdminForm.setError(nw, "New password must be different from the current password."); ok = false; }
      if (!cf.value) { AdminForm.setError(cf, "Please confirm the new password."); ok = false; }
      else if (cf.value !== nw.value) { AdminForm.setError(cf, "Passwords do not match."); ok = false; }
      if (!ok) { AdminForm.focusFirstError(form); return; }

      AdminUtil.setButtonLoading(btn, true, "Updating...");
      // BACKEND INTEGRATION: POST current + new password to the change-password action.
      await AdminUtil.delay(700);
      AdminUtil.setButtonLoading(btn, false);
      AdminModal.close("passwordModal");
      form.reset();
      AdminToast.show("Your password has been changed. (Prototype: nothing was actually saved.)", "success", "Password updated");
    });
  }

  function bindGlobalActions() {
    document.addEventListener("click", e => {
      if (e.target.closest("[data-open-profile]")) { closeAllDropdowns(); AdminModal.open("profileModal"); return; }
      if (e.target.closest("[data-open-password]")) {
        closeAllDropdowns();
        const form = document.getElementById("passwordForm");
        form.reset();
        AdminForm.clearAll(form);
        AdminModal.open("passwordModal");
        return;
      }
      if (e.target.closest("[data-logout]")) { AdminAuth.logout(); return; }
      if (e.target.closest("[data-reset-demo]")) {
        AdminData.resetDemo();
        AdminToast.show("Demo data restored.", "info");
        setTimeout(() => window.location.reload(), 400);
      }
    });
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    const plain = document.body.dataset.layout === "plain";
    if (!AdminAuth.requireAuth()) return;
    if (!plain && !AdminAuth.requireCharge()) return;

    /* A page can belong to one kind of charge only:
       <body data-charge-kind="zone">         DC / zone officer pages
       <body data-charge-kind="counselling">  Citizen Care Center (HQ) pages
       Opening the wrong kind sends the user to their own home page. */
    const needKind = document.body.dataset.chargeKind;
    const selected = AdminData.Session.getCharge();
    if (!plain && needKind && selected && (selected.kind || "zone") !== needKind) {
      window.location.replace(AdminData.homePage(selected));
      return;
    }

    const user = AdminAuth.getSession();
    const charge = plain ? null : AdminData.Session.getCharge();
    const main = document.getElementById("adminMain");

    layoutEl = document.createElement("div");
    layoutEl.className = "admin-layout" + (plain ? " admin-layout--plain" : "");
    layoutEl.innerHTML =
      (plain ? "" : renderSidebar(charge)) +
      `<div class="admin-shell">${renderHeader(user, charge, plain)}<div class="admin-content"></div>${renderFooter()}</div>`;
    layoutEl.querySelector(".admin-content").appendChild(main);
    document.body.appendChild(layoutEl);
    document.body.insertAdjacentHTML("beforeend", renderAccountModals(user, charge));

    if (!plain) {
      sidebarEl = document.getElementById("adminSidebar");
      toggleBtn = document.getElementById("adminNavToggle");
      // Saved preference wins; otherwise tablet widths (992–1199px) start as the icon rail.
      let collapsed = window.matchMedia("(max-width: 1199.98px)").matches;
      try {
        const saved = localStorage.getItem(AdminData.KEYS.sidebar);
        if (saved !== null) collapsed = saved === "1";
      } catch (e) { /* ignore */ }
      layoutEl.classList.toggle("admin-layout--collapsed", collapsed);
      bindSidebar();
      syncToggleState();
    }

    bindDropdowns();
    bindPasswordForm();
    bindGlobalActions();
    document.body.classList.add("admin-ready");
  }

  /* Re-count sidebar badges after a file moves (no page reload needed). */
  function refreshCounts() {
    const charge = AdminData.Session.getCharge();
    if (!charge) return;
    document.querySelectorAll("[data-count-key]").forEach(el => {
      const n = AdminData.countFor(el.dataset.countKey, charge.id);
      el.textContent = n;
      el.hidden = !n;
    });
  }

  /* Page scripts check `ready` before running. */
  window.AdminLayout = { ready: false, refreshCounts };
  init();
  window.AdminLayout.ready = document.body.classList.contains("admin-ready");
})(window, document);
