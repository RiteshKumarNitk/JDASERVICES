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
   The user menu is a Bootstrap 5.2.3 Dropdown; account forms are Bootstrap Modals.
   ===================================================================== */

(function (window, document, $) {
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
  let $layout, $sidebar, $toggle;

  /* Which menu item is active on this page. */
  function activeKey() {
    const page = $("body").attr("data-admin-page") || "";
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
          <div class="admin-dropdown">
            <button type="button" class="admin-user-btn" aria-haspopup="menu" aria-expanded="false"
                    data-bs-toggle="dropdown" data-bs-display="static">
              <span class="admin-avatar" aria-hidden="true">${escapeHtml(initials(user.name))}</span>
              <span class="admin-user-text">
                <span class="admin-user-name">Welcome ${escapeHtml(user.name)}</span>
                <span class="admin-user-role">${escapeHtml(subtitle)}</span>
              </span>
              ${icon("i-chev-down", "admin-user-caret")}
            </button>
            <div class="dropdown-menu admin-dropdown-menu admin-user-menu" role="menu">
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
      <div class="modal admin-modal admin-modal--sm" id="profileModal" tabindex="-1" role="dialog" aria-labelledby="profileTitle">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content admin-modal-dialog">
            <div class="admin-modal-head">
              <h2 class="admin-modal-title" id="profileTitle">My Profile</h2>
              <button type="button" class="admin-modal-close" data-bs-dismiss="modal" aria-label="Close">${icon("i-x")}</button>
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
            <div class="admin-modal-foot"><button type="button" class="admin-btn admin-btn-outline" data-bs-dismiss="modal">Close</button></div>
          </div>
        </div>
      </div>

      <div class="modal admin-modal admin-modal--sm" id="passwordModal" tabindex="-1" role="dialog" aria-labelledby="passwordTitle">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content admin-modal-dialog">
            <div class="admin-modal-head">
              <h2 class="admin-modal-title" id="passwordTitle">Change Password</h2>
              <button type="button" class="admin-modal-close" data-bs-dismiss="modal" aria-label="Close">${icon("i-x")}</button>
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
                <button type="button" class="admin-btn admin-btn-outline" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="admin-btn admin-btn-primary" id="pwSubmit">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  }

  /* ===================================================================
     BEHAVIOUR
     =================================================================== */
  function isMobile() { return MOBILE_QUERY.matches; }

  function syncToggleState() {
    if (!$toggle || !$toggle.length) return;
    const expanded = isMobile()
      ? $layout.hasClass("admin-layout--nav-open")
      : !$layout.hasClass("admin-layout--collapsed");
    $toggle.attr("aria-expanded", String(expanded));
  }

  function openMobileNav() {
    $layout.addClass("admin-layout--nav-open");
    $("body").addClass("admin-nav-locked");
    syncToggleState();
    $sidebar.find(".admin-nav-link").first().trigger("focus");
  }

  function closeMobileNav() {
    if (!$layout.hasClass("admin-layout--nav-open")) return;
    $layout.removeClass("admin-layout--nav-open");
    $("body").removeClass("admin-nav-locked");
    syncToggleState();
  }

  function setCollapsed(collapsed) {
    $layout.toggleClass("admin-layout--collapsed", collapsed);
    try { localStorage.setItem(AdminData.KEYS.sidebar, collapsed ? "1" : "0"); } catch (e) { /* ignore */ }
    syncToggleState();
  }

  function bindSidebar() {
    $toggle.on("click", function () {
      if (isMobile()) {
        $layout.hasClass("admin-layout--nav-open") ? closeMobileNav() : openMobileNav();
      } else {
        setCollapsed(!$layout.hasClass("admin-layout--collapsed"));
      }
    });
    $("#adminSidebarOverlay").on("click", closeMobileNav);
    $("#adminSidebarClose").on("click", function () { closeMobileNav(); $toggle.trigger("focus"); });
    MOBILE_QUERY.addEventListener("change", () => { closeMobileNav(); syncToggleState(); });
    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && !AdminModal.top()) closeMobileNav();
    });
  }

  /* Bootstrap opens/closes the user menu (click, outside click, Esc).
     Added here: focus the first item on open, and Up/Down arrows between items. */
  function bindUserMenu() {
    $(".admin-dropdown").on("shown.bs.dropdown", function () {
      $(this).find("[role=menuitem]").first().trigger("focus");
    });

    // Bootstrap catches Up/Down on document in the CAPTURE phase and only moves
    // between .dropdown-item elements, so this handler listens on window (earlier).
    window.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const $items = $(e.target).closest(".admin-dropdown-menu.show").find("[role=menuitem]");
      if (!$items.length) return;
      e.preventDefault();
      e.stopPropagation();
      const idx = $items.index(document.activeElement);
      const next = e.key === "ArrowDown" ? (idx + 1) % $items.length : (idx - 1 + $items.length) % $items.length;
      $items.eq(next).trigger("focus");
    }, true);
  }

  function bindPasswordForm() {
    const $form = $("#passwordForm");
    const $cur = $("#pwCurrent"), $new = $("#pwNew"), $confirm = $("#pwConfirm");
    AdminForm.liveClear($form);

    $form.on("submit", async function (e) {
      e.preventDefault();
      AdminForm.clearAll($form);
      const cur = $cur.val(), nw = $new.val(), cf = $confirm.val();
      let ok = true;
      if (!cur) { AdminForm.setError($cur, "Current password is required."); ok = false; }
      if (!nw) { AdminForm.setError($new, "New password is required."); ok = false; }
      else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(nw)) { AdminForm.setError($new, "Use at least 8 characters with a letter, a number and a symbol."); ok = false; }
      else if (nw === cur) { AdminForm.setError($new, "New password must be different from the current password."); ok = false; }
      if (!cf) { AdminForm.setError($confirm, "Please confirm the new password."); ok = false; }
      else if (cf !== nw) { AdminForm.setError($confirm, "Passwords do not match."); ok = false; }
      if (!ok) { AdminForm.focusFirstError($form); return; }

      AdminUtil.setButtonLoading("#pwSubmit", true, "Updating...");
      // BACKEND INTEGRATION: POST current + new password to the change-password action.
      await AdminUtil.delay(700);
      AdminUtil.setButtonLoading("#pwSubmit", false);
      AdminModal.close("passwordModal");
      $form[0].reset();
      AdminToast.show("Your password has been changed. (Prototype: nothing was actually saved.)", "success", "Password updated");
    });
  }

  function bindGlobalActions() {
    $(document)
      .on("click", "[data-open-profile]", function () { AdminModal.open("profileModal"); })
      .on("click", "[data-open-password]", function () {
        const $form = $("#passwordForm");
        $form[0].reset();
        AdminForm.clearAll($form);
        AdminModal.open("passwordModal");
      })
      .on("click", "[data-logout]", function () { AdminAuth.logout(); })
      .on("click", "[data-reset-demo]", function () {
        AdminData.resetDemo();
        AdminToast.show("Demo data restored.", "info");
        setTimeout(() => window.location.reload(), 400);
      });
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    const $body = $("body");
    const plain = $body.attr("data-layout") === "plain";
    if (!AdminAuth.requireAuth()) return;
    if (!plain && !AdminAuth.requireCharge()) return;

    /* A page can belong to one kind of charge only:
       <body data-charge-kind="zone">         DC / zone officer pages
       <body data-charge-kind="counselling">  Citizen Care Center (HQ) pages
       Opening the wrong kind sends the user to their own home page. */
    const needKind = $body.attr("data-charge-kind");
    const selected = AdminData.Session.getCharge();
    if (!plain && needKind && selected && (selected.kind || "zone") !== needKind) {
      window.location.replace(AdminData.homePage(selected));
      return;
    }

    const user = AdminAuth.getSession();
    const charge = plain ? null : AdminData.Session.getCharge();

    $layout = $('<div class="admin-layout"></div>')
      .toggleClass("admin-layout--plain", plain)
      .html((plain ? "" : renderSidebar(charge)) +
        `<div class="admin-shell">${renderHeader(user, charge, plain)}<div class="admin-content"></div>${renderFooter()}</div>`);
    $layout.find(".admin-content").append($("#adminMain"));
    $body.append($layout).append(renderAccountModals(user, charge));

    if (!plain) {
      $sidebar = $("#adminSidebar");
      $toggle = $("#adminNavToggle");
      // Saved preference wins; otherwise tablet widths (992–1199px) start as the icon rail.
      let collapsed = window.matchMedia("(max-width: 1199.98px)").matches;
      try {
        const saved = localStorage.getItem(AdminData.KEYS.sidebar);
        if (saved !== null) collapsed = saved === "1";
      } catch (e) { /* ignore */ }
      $layout.toggleClass("admin-layout--collapsed", collapsed);
      bindSidebar();
      syncToggleState();
    }

    bindUserMenu();
    bindPasswordForm();
    bindGlobalActions();
    $body.addClass("admin-ready");
  }

  /* Re-count sidebar badges after a file moves (no page reload needed). */
  function refreshCounts() {
    const charge = AdminData.Session.getCharge();
    if (!charge) return;
    $("[data-count-key]").each(function () {
      const n = AdminData.countFor($(this).attr("data-count-key"), charge.id);
      $(this).text(n).prop("hidden", !n);
    });
  }

  /* Page scripts check `ready` before running. */
  window.AdminLayout = { ready: false, refreshCounts };
  init();
  window.AdminLayout.ready = $("body").hasClass("admin-ready");
})(window, document, jQuery);
