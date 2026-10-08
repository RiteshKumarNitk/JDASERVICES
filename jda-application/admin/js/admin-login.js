/* =====================================================================
   JDA Admin Panel — admin-login.js   (login.html)
   Simulated authentication. Success → select-charge.html
   (the user must pick one of their charges before the sidebar appears).
   ===================================================================== */

(function (window, document, $) {
  "use strict";

  const { AdminData, AdminAuth, AdminForm, AdminModal, AdminUtil } = window;

  const $form     = $("#loginForm");
  const $id       = $("#employeeId");
  const $pw       = $("#password");
  const $remember = $("#rememberMe");
  const $loginBtn = $("#loginBtn");
  const $alert    = $("#loginAlert");
  const $togglePw = $("#togglePassword");

  /* After login the user always selects a charge first. A ?next= page
     (session expired mid-work) is honoured only for local admin pages. */
  function nextPage() {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    return /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(next) && !next.startsWith("login.html") ? next : "select-charge.html";
  }

  function showAlert(type, message) {
    const iconId = type === "error" ? "i-alert" : type === "success" ? "i-check-circle" : "i-info";
    $alert.attr("class", `admin-alert admin-alert--${type}`)
      .html(AdminUtil.icon(iconId) + `<span>${AdminUtil.escapeHtml(message)}</span>`)
      .prop("hidden", false);
  }

  function hideAlert() { $alert.prop("hidden", true); }

  function validate() {
    let ok = true;
    const id = $id.val().trim();
    const pw = $pw.val();

    if (!id) { AdminForm.setError($id, "Employee ID is required."); ok = false; }
    else if (!/^[A-Za-z0-9]{4,20}$/.test(id)) { AdminForm.setError($id, "Employee ID must be 4–20 letters or digits."); ok = false; }

    if (!pw) { AdminForm.setError($pw, "Password is required."); ok = false; }
    else if (pw.length < 6) { AdminForm.setError($pw, "Password must be at least 6 characters."); ok = false; }

    return ok;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();
    AdminForm.clearAll($form);
    if (!validate()) { AdminForm.focusFirstError($form); return; }

    AdminUtil.setButtonLoading($loginBtn, true, "Signing in...");

    /* BACKEND INTEGRATION:
       Replace this block with the real login request. The server
       validates credentials and returns the user profile / auth cookie. */
    await AdminUtil.delay(900);
    const user = AdminData.EmployeeStore.getById($id.val().trim());
    const valid = !!user && $pw.val() === AdminData.DEMO_PASSWORD;

    if (!valid) {
      AdminUtil.setButtonLoading($loginBtn, false);
      showAlert("error", "Invalid Employee ID or password. Please check your credentials and try again.");
      $pw.val("").trigger("focus");
      return;
    }

    AdminAuth.startSession(user, $remember.prop("checked"));

    /* Citizen Care Center (HQ) users hold one counselling charge — they go
       straight to the Counselor Dashboard. Everyone else selects a charge. */
    const held = AdminData.ChargeStore.getForEmployee(user.employeeId);
    const direct = held.length === 1 && held[0].kind === "counselling" ? held[0] : null;
    if (direct) AdminData.Session.setCharge(direct);
    $loginBtn.html(AdminUtil.icon("i-check") + "<span>Login successful — redirecting...</span>");
    showAlert("success", `Welcome, ${user.name}. Loading your charges...`);
    setTimeout(() => { window.location.href = direct ? AdminData.homePage(direct) : nextPage(); }, 600);
  }

  function togglePassword() {
    const show = $pw.attr("type") === "password";
    $pw.attr("type", show ? "text" : "password");
    $togglePw.attr({ "aria-pressed": String(show), "aria-label": show ? "Hide password" : "Show password" })
      .html(AdminUtil.icon(show ? "i-eye-off" : "i-eye"));
  }

  /* ---------- Forgot password (placeholder flow) ---------- */
  function bindForgotPassword() {
    const $fForm   = $("#forgotForm");
    const $fInput  = $("#forgotEmployeeId");
    const $fField  = $("#forgotField");
    const $fOk     = $("#forgotSuccess");
    const $fSubmit = $("#forgotSubmit");

    $("#forgotPasswordLink").on("click", function (e) {
      e.preventDefault();
      $fForm[0].reset();
      AdminForm.clearAll($fForm);
      $fOk.prop("hidden", true);
      $fField.prop("hidden", false);
      $fSubmit.prop("hidden", false);
      $fInput.val($id.val().trim());
      AdminModal.open("forgotModal");
    });

    AdminForm.liveClear($fForm);
    $fForm.on("submit", async function (e) {
      e.preventDefault();
      if (!$fInput.val().trim()) {
        AdminForm.setError($fInput, "Employee ID is required.");
        $fInput.trigger("focus");
        return;
      }
      AdminUtil.setButtonLoading($fSubmit, true, "Sending...");
      // BACKEND INTEGRATION: request a password reset email.
      await AdminUtil.delay(800);
      AdminUtil.setButtonLoading($fSubmit, false);
      $fField.prop("hidden", true);
      $fSubmit.prop("hidden", true);
      $fOk.prop("hidden", false);
    });
  }

  /* ---------- Demo account list (PROTOTYPE ONLY — remove with real login) ---------- */
  function renderDemoAccounts() {
    const $box = $("#demoAccounts");
    if (!$box.length) return;
    const { escapeHtml } = AdminUtil;
    const charges = AdminData.ChargeStore.getAll().filter(c => c.holder);
    const depts = [...new Set(charges.map(c => c.department))];
    $box.html(depts.map(d => `
      <p class="admin-demo-dept">${escapeHtml(d)}</p>
      <ul class="admin-demo-list">
        ${charges.filter(c => c.department === d).map(c => `
          <li><button type="button" class="admin-demo-account" data-demo-id="${c.holderId}">
            <code>${c.holderId}</code>
            <span><strong>${escapeHtml(c.holder.name)}</strong>${escapeHtml(AdminData.chargeLabel(c))}</span>
          </button></li>`).join("")}
      </ul>`).join(""));

    $box.on("click", "[data-demo-id]", function () {
      $id.val($(this).attr("data-demo-id"));
      $pw.val(AdminData.DEMO_PASSWORD);
      AdminForm.clearAll($form);
      hideAlert();
      $loginBtn.trigger("focus");
    });
  }

  /* ---------- Init ---------- */
  function init() {
    // Already signed in → skip the login screen.
    if (AdminAuth.getSession()) { window.location.replace(nextPage()); return; }

    const params = new URLSearchParams(window.location.search);
    if (params.has("loggedout")) showAlert("success", "You have been logged out successfully.");
    else if (params.has("next")) showAlert("info", "Please log in to continue.");

    try {
      const rememberedId = localStorage.getItem(AdminData.KEYS.rememberId);
      if (rememberedId) { $id.val(rememberedId); $remember.prop("checked", true); }
    } catch (err) { /* ignore */ }

    ($id.val() ? $pw : $id).trigger("focus");

    AdminForm.liveClear($form);
    $form.on("submit", handleSubmit);
    $togglePw.on("click", togglePassword);
    bindForgotPassword();
    renderDemoAccounts();
  }

  init();
})(window, document, jQuery);
