/* =====================================================================
   JDA Admin Panel — admin-common.js
   Shared helpers used by every admin page (including login):
     AdminIcons   – inline SVG icon sprite (no icon-font dependency)
     AdminAuth    – simulated login session
     AdminUtil    – formatting / escaping / small helpers
     AdminForm    – field-level validation display
     AdminModal   – accessible modal open / close
     AdminToast   – success / error notifications
   Load order on every page:
     jQuery 4.0.0 → Bootstrap 5.2.3 bundle → admin-data.js → admin-common.js
     → admin-layout.js → page js
   ===================================================================== */

(function (window, document, $) {
  "use strict";

  /* ===================================================================
     ICONS — injected once as an SVG sprite.
     Usage in HTML:  <svg class="admin-ic"><use href="#i-plus"/></svg>
     =================================================================== */
  const ICON_PATHS = {
    "i-menu":         '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    "i-bell":         '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    "i-chev-down":    '<polyline points="6 9 12 15 18 9"/>',
    "i-chev-right":   '<polyline points="9 6 15 12 9 18"/>',
    "i-chev-left":    '<polyline points="15 6 9 12 15 18"/>',
    "i-user":         '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "i-users":        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "i-user-plus":    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    "i-key":          '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/>',
    "i-logout":       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    "i-grid":         '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "i-id-card":      '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="17" y2="14"/>',
    "i-rupee":        '<path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13h3a5 5 0 0 0 0-10"/><path d="m6 13 8.5 8"/>',
    "i-building":     '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8" y2="6.01"/><line x1="12" y1="6" x2="12" y2="6.01"/><line x1="16" y1="6" x2="16" y2="6.01"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/>',
    "i-briefcase":    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    "i-shield":       '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    "i-layers":       '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    "i-chart":        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>',
    "i-list":         '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    "i-settings":     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    "i-search":       '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    "i-plus":         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    "i-edit":         '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    "i-trash":        '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    "i-eye":          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    "i-eye-off":      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    "i-x":            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    "i-arrow-right":  '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>',
    "i-arrow-left":   '<line x1="20" y1="12" x2="4" y2="12"/><polyline points="11 5 4 12 11 19"/>',
    "i-check":        '<polyline points="20 6 9 17 4 12"/>',
    "i-check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    "i-clock":        '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    "i-files":        '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
    "i-doc-alert":    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="15"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    "i-alert":        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "i-info":         '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    "i-lock":         '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "i-refresh":      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    "i-map-pin":      '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    "i-tag":          '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    "i-calendar":     '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    "i-inbox":        '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    "i-activity":     '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    "i-pause":        '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>',
    "i-map":          '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
    "i-check-square": '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    "i-folder-open":  '<path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>',
    "i-megaphone":    '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    "i-send":         '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    "i-transfer":     '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    "i-handover":     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
    "i-home":         '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    "i-phone":        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "i-mail":         '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    "i-git":          '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>',
    "i-download":     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    "i-printer":      '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    "i-columns":      '<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>',
    "i-ban":          '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'
  };

  function injectIconSprite() {
    if ($("#admin-icon-sprite").length) return;
    const symbols = Object.keys(ICON_PATHS).map(id =>
      `<symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[id]}</symbol>`
    ).join("");
    $("body").prepend(`<svg id="admin-icon-sprite" xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols}</svg>`);
  }

  function icon(id, extraClass) {
    return `<svg class="admin-ic${extraClass ? " " + extraClass : ""}" aria-hidden="true"><use href="#${id}"/></svg>`;
  }

  /* ===================================================================
     AUTH — simulated session.
     BACKEND INTEGRATION:
     Replace with the server-side authentication cookie / session.
     Pages will be protected by [Authorize] on the server instead of
     AdminAuth.requireAuth().
     =================================================================== */
  const AdminAuth = {
    getSession() {
      return window.AdminData.Session.getUser();
    },

    /* remember = true keeps the session after the browser closes */
    startSession(employee, remember) {
      const user = window.AdminData.Session.start(employee, remember);
      try {
        if (remember) localStorage.setItem(window.AdminData.KEYS.rememberId, employee.employeeId);
        else localStorage.removeItem(window.AdminData.KEYS.rememberId);
      } catch (e) { /* ignore */ }
      return user;
    },

    logout() {
      window.AdminData.Session.end();
      window.location.href = "login.html?loggedout=1";
    },

    /* Every protected page: must be logged in. */
    requireAuth() {
      if (this.getSession()) return true;
      const page = window.location.pathname.split("/").pop() || "dashboard.html";
      window.location.replace("login.html?next=" + encodeURIComponent(page + window.location.search));
      return false;
    },

    /* Workflow pages: must have selected a charge that the user still holds. */
    requireCharge() {
      const user = this.getSession();
      const selected = window.AdminData.Session.getCharge();
      const current = selected && window.AdminData.ChargeStore.getById(selected.id);
      if (user && current && current.holderId === user.employeeId) return true;
      window.AdminData.Session.clearCharge();
      window.location.replace("select-charge.html");
      return false;
    },

    /* PROTOTYPE ONLY — lets the tester continue as the officer who just
       received a file, to demonstrate that it arrives in their inbox. */
    switchToOfficer(chargeId) {
      const D = window.AdminData;
      const c = D.ChargeStore.getById(chargeId);
      if (!c || !c.holder) return;
      D.Session.start(c.holder, false);
      D.Session.setCharge(c);
      window.location.href = c.kind === "counselling" ? D.homePage(c) : "application-list.html?list=received";
    }
  };

  /* ===================================================================
     UTIL
     =================================================================== */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const AdminUtil = {
    icon,

    escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    /* 5000 → "₹5,000", 2100.5 → "₹2,100.50"  (Indian digit grouping) */
    formatINR(amount) {
      const n = Number(amount);
      if (!isFinite(n)) return "—";
      const paise = !Number.isInteger(n);
      return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2 });
    },

    formatNumber(n) {
      return Number(n).toLocaleString("en-IN");
    },

    /* "2025-09-12T11:30:00" → "12 Sep 2025, 11:30 AM" */
    formatDateTime(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (isNaN(d)) return "—";
      let h = d.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(h).padStart(2, "0")}:${mm} ${ampm}`;
    },

    formatDate(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (isNaN(d)) return "—";
      return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },

    initials(name) {
      return String(name || "")
        .trim().split(/\s+/).filter(Boolean)
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map(w => w[0].toUpperCase()).join("");
    },

    debounce(fn, wait) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait || 200);
      };
    },

    /* Simulates network latency so loading states are visible. */
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /* Toggles a button's loading state (spinner + label). btn = element or jQuery. */
    setButtonLoading(btn, loading, loadingText) {
      const $btn = $(btn);
      if (!$btn.length) return;
      if (loading) {
        $btn.data("originalHtml", $btn.html())
          .prop("disabled", true).addClass("is-loading").attr("aria-busy", "true")
          .html(`<span class="admin-spinner" aria-hidden="true"></span><span>${AdminUtil.escapeHtml(loadingText || "Please wait...")}</span>`);
      } else {
        $btn.prop("disabled", false).removeClass("is-loading").removeAttr("aria-busy");
        if ($btn.data("originalHtml")) $btn.html($btn.data("originalHtml"));
      }
    },

    /* Application / movement status badge (colour + dot + text, never colour alone) */
    statusBadge(status) {
      const map = {
        "active": "active", "completed": "active", "disposed": "active",
        "pending": "pending", "forwarded": "pending", "returned": "pending", "received": "pending", "transferred": "pending",
        "on hold": "hold", "case on hold": "hold", "pending at applicant": "hold", "sent to applicant": "hold",
        "query - other department": "muted", "query from other department": "muted", "inactive": "muted",
        /* counselling / verification statuses */
        "approved": "active", "verified": "active", "case found ok": "active", "forwarded to dc": "active",
        "forwarded to zone": "active", "verification completed": "active", "submitted": "pending",
        "pending verification": "pending", "ready": "pending", "skipped": "muted", "locked": "muted",
        "rejected": "danger", "incomplete documents": "danger", "not received": "muted"
      };
      const tone = map[String(status).toLowerCase()] || "muted";
      return `<span class="admin-status admin-status--${tone}">` +
             `<span class="admin-status-dot" aria-hidden="true"></span>${AdminUtil.escapeHtml(status)}</span>`;
    }
  };

  /* ===================================================================
     FORM — shows / clears field errors (input = element or jQuery).
     Expected markup:
       <div class="admin-field">
         <label for="x">Label <span class="admin-req">*</span></label>
         <input id="x" class="admin-input">
         <p class="admin-field-error"></p>
       </div>
     =================================================================== */
  const AdminForm = {
    setError(input, message) {
      const $input = $(input);
      const $field = $input.closest(".admin-field");
      if (!$field.length) return;
      $field.addClass("is-invalid");
      $input.attr("aria-invalid", "true");
      $field.find(".admin-field-error").html(icon("i-alert") + "<span>" + AdminUtil.escapeHtml(message) + "</span>");
    },

    clearError(input) {
      const $input = $(input);
      $input.closest(".admin-field").removeClass("is-invalid").find(".admin-field-error").text("");
      $input.removeAttr("aria-invalid");
    },

    clearAll(form) {
      const $form = $(form);
      $form.find("[aria-invalid]").removeAttr("aria-invalid");
      $form.find(".admin-field.is-invalid").removeClass("is-invalid").find(".admin-field-error").text("");
    },

    /* Clears a field's error as soon as the user edits it. */
    liveClear(form) {
      $(form)
        .on("input", ".admin-input, .admin-select, .admin-textarea", function () { AdminForm.clearError(this); })
        .on("change", "input[type=radio]", function () {
          AdminForm.clearError($(this).closest(".admin-field").find("input").first());
        });
    },

    focusFirstError(form) {
      $(form).find("[aria-invalid='true']").first().trigger("focus");
    }
  };

  /* ===================================================================
     MODAL — Bootstrap 5.2.3 Modal.
     Markup (see any page):
       <div class="modal admin-modal" id="proceedModal" tabindex="-1">
         <div class="modal-dialog modal-dialog-centered">
           <div class="modal-content admin-modal-dialog">
             … <button data-bs-dismiss="modal">Cancel</button> …
     AdminModal.open("proceedModal", { onClose: fn })   AdminModal.close("proceedModal")
     A modal with class "is-busy" (saving) cannot be closed.
     =================================================================== */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const modalOf = m => $(typeof m === "string" ? "#" + m : m);

  const AdminModal = {
    open(modalOrId, options) {
      const $modal = modalOf(modalOrId);
      if (!$modal.length) return;
      const returnFocus = document.activeElement;
      $modal.one("hidden.bs.modal", function () {
        if (options && typeof options.onClose === "function") options.onClose();
        if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      });
      // focus:false — stacked modals (e.g. Reject over Preview) would fight over focus;
      // focus is handled below instead.
      bootstrap.Modal.getOrCreateInstance($modal[0], { focus: false }).show();
    },

    close(modalOrId) {
      const $modal = modalOf(modalOrId);
      const instance = $modal.length ? bootstrap.Modal.getInstance($modal[0]) : null;
      if (instance) instance.hide();
    },

    top() {
      return $(".admin-modal.show").last()[0] || null;
    }
  };

  // While saving (class is-busy) Esc, backdrop click and Cancel do nothing.
  $(document).on("hide.bs.modal", ".admin-modal", function (e) {
    if ($(this).hasClass("is-busy")) e.preventDefault();
  });

  // Focus the [data-autofocus] field (or the first control) when a modal opens.
  $(document).on("shown.bs.modal", ".admin-modal", function () {
    const $target = $(this).find("[data-autofocus]").first();
    ($target.length ? $target : $(this).find(".admin-modal-dialog " + FOCUSABLE).first()).trigger("focus");
  });

  // A second modal opened over the first: put it (and its backdrop) on top.
  $(document).on("show.bs.modal", ".admin-modal", function () {
    const depth = $(".admin-modal.show").length;
    $(this).css("z-index", 1055 + depth * 20);
    setTimeout(() => $(".modal-backdrop").last().css("z-index", 1054 + depth * 20));
  });

  // Closing the top modal keeps the page locked while another one is still open.
  $(document).on("hidden.bs.modal", ".admin-modal", function () {
    if ($(".admin-modal.show").length) $("body").addClass("modal-open").css("overflow", "hidden");
  });

  // Esc closes the top-most modal even when focus has left it (e.g. the
  // focused button was hidden by a re-render). Inside the modal Bootstrap handles Esc.
  $(document).on("keydown", function (e) {
    const modal = AdminModal.top();
    if (modal && e.key === "Escape" && !modal.contains(document.activeElement)) AdminModal.close(modal);
  });

  // Keep Tab inside the top-most modal.
  $(document).on("keydown", function (e) {
    const modal = AdminModal.top();
    if (!modal || e.key !== "Tab") return;
    const $items = $(modal).find(".admin-modal-dialog " + FOCUSABLE).filter(":visible");
    if (!$items.length) return;
    const first = $items[0], last = $items[$items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ===================================================================
     TOAST
     AdminToast.show("Charge saved successfully", "success");
     types: success | error | info
     =================================================================== */
  const AdminToast = {
    show(message, type, title) {
      let $region = $("#adminToastRegion");
      if (!$region.length) {
        $region = $('<div id="adminToastRegion" class="admin-toast-region" role="status" aria-live="polite"></div>').appendTo("body");
      }
      const kind = type || "success";
      const iconId = kind === "error" ? "i-alert" : kind === "info" ? "i-info" : "i-check-circle";
      const heading = title || (kind === "error" ? "Something went wrong" : kind === "info" ? "Note" : "Success");
      const $toast = $(`<div class="admin-toast admin-toast--${kind}">` +
        `<span class="admin-toast-icon">${icon(iconId)}</span>` +
        `<div class="admin-toast-body"><strong>${AdminUtil.escapeHtml(heading)}</strong><p>${AdminUtil.escapeHtml(message)}</p></div>` +
        `<button type="button" class="admin-toast-close" aria-label="Dismiss">${icon("i-x")}</button></div>`).appendTo($region);
      const remove = () => { $toast.addClass("is-leaving"); setTimeout(() => $toast.remove(), 200); };
      $toast.find(".admin-toast-close").on("click", remove);
      setTimeout(remove, 4200);
    }
  };

  /* Scripts load at the end of <body>, so the sprite exists before any <use href="#i-…"> renders. */
  injectIconSprite();

  window.AdminIcons = { inject: injectIconSprite, icon };
  window.AdminAuth = AdminAuth;
  window.AdminUtil = AdminUtil;
  window.AdminForm = AdminForm;
  window.AdminModal = AdminModal;
  window.AdminToast = AdminToast;
})(window, document, jQuery);
