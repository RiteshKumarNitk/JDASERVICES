/* =====================================================================
   JDA Admin Panel — admin-login.js   (login.html)
   Simulated authentication. Success → select-charge.html
   (the user must pick one of their charges before the sidebar appears).
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminAuth, AdminForm, AdminModal, AdminUtil } = window;

  const form        = document.getElementById("loginForm");
  const idInput     = document.getElementById("employeeId");
  const pwInput     = document.getElementById("password");
  const remember    = document.getElementById("rememberMe");
  const loginBtn    = document.getElementById("loginBtn");
  const alertBox    = document.getElementById("loginAlert");
  const togglePwBtn = document.getElementById("togglePassword");

  /* After login the user always selects a charge first. A ?next= page
     (session expired mid-work) is honoured only for local admin pages. */
  function nextPage() {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    return /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(next) && !next.startsWith("login.html") ? next : "select-charge.html";
  }

  function showAlert(type, message) {
    const iconId = type === "error" ? "i-alert" : type === "success" ? "i-check-circle" : "i-info";
    alertBox.className = `admin-alert admin-alert--${type}`;
    alertBox.innerHTML = AdminUtil.icon(iconId) + `<span>${AdminUtil.escapeHtml(message)}</span>`;
    alertBox.hidden = false;
  }

  function hideAlert() { alertBox.hidden = true; }

  function validate() {
    let ok = true;
    const id = idInput.value.trim();
    const pw = pwInput.value;

    if (!id) { AdminForm.setError(idInput, "Employee ID is required."); ok = false; }
    else if (!/^[A-Za-z0-9]{4,20}$/.test(id)) { AdminForm.setError(idInput, "Employee ID must be 4–20 letters or digits."); ok = false; }

    if (!pw) { AdminForm.setError(pwInput, "Password is required."); ok = false; }
    else if (pw.length < 6) { AdminForm.setError(pwInput, "Password must be at least 6 characters."); ok = false; }

    return ok;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();
    AdminForm.clearAll(form);
    if (!validate()) { AdminForm.focusFirstError(form); return; }

    AdminUtil.setButtonLoading(loginBtn, true, "Signing in...");

    /* BACKEND INTEGRATION:
       Replace this block with the real login request. The server
       validates credentials and returns the user profile / auth cookie. */
    await AdminUtil.delay(900);
    const user = AdminData.EmployeeStore.getById(idInput.value.trim());
    const valid = !!user && pwInput.value === AdminData.DEMO_PASSWORD;

    if (!valid) {
      AdminUtil.setButtonLoading(loginBtn, false);
      showAlert("error", "Invalid Employee ID or password. Please check your credentials and try again.");
      pwInput.value = "";
      pwInput.focus();
      return;
    }

    AdminAuth.startSession(user, remember.checked);
    loginBtn.innerHTML = AdminUtil.icon("i-check") + "<span>Login successful — redirecting...</span>";
    showAlert("success", `Welcome, ${user.name}. Loading your charges...`);
    setTimeout(() => { window.location.href = nextPage(); }, 600);
  }

  function togglePassword() {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    togglePwBtn.setAttribute("aria-pressed", String(show));
    togglePwBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    togglePwBtn.innerHTML = AdminUtil.icon(show ? "i-eye-off" : "i-eye");
  }

  /* ---------- Forgot password (placeholder flow) ---------- */
  function bindForgotPassword() {
    const modal   = document.getElementById("forgotModal");
    const fForm   = document.getElementById("forgotForm");
    const fInput  = document.getElementById("forgotEmployeeId");
    const fField  = document.getElementById("forgotField");
    const fOk     = document.getElementById("forgotSuccess");
    const fSubmit = document.getElementById("forgotSubmit");

    document.getElementById("forgotPasswordLink").addEventListener("click", e => {
      e.preventDefault();
      fForm.reset();
      AdminForm.clearAll(fForm);
      fOk.hidden = true;
      fField.hidden = false;
      fSubmit.hidden = false;
      fInput.value = idInput.value.trim();
      AdminModal.open(modal);
    });

    AdminForm.liveClear(fForm);
    fForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!fInput.value.trim()) {
        AdminForm.setError(fInput, "Employee ID is required.");
        fInput.focus();
        return;
      }
      AdminUtil.setButtonLoading(fSubmit, true, "Sending...");
      // BACKEND INTEGRATION: request a password reset email.
      await AdminUtil.delay(800);
      AdminUtil.setButtonLoading(fSubmit, false);
      fField.hidden = true;
      fSubmit.hidden = true;
      fOk.hidden = false;
    });
  }

  /* ---------- Demo account list (PROTOTYPE ONLY — remove with real login) ---------- */
  function renderDemoAccounts() {
    const box = document.getElementById("demoAccounts");
    if (!box) return;
    const { escapeHtml } = AdminUtil;
    const charges = AdminData.ChargeStore.getAll().filter(c => c.holder);
    const depts = [...new Set(charges.map(c => c.department))];
    box.innerHTML = depts.map(d => `
      <p class="admin-demo-dept">${escapeHtml(d)}</p>
      <ul class="admin-demo-list">
        ${charges.filter(c => c.department === d).map(c => `
          <li><button type="button" class="admin-demo-account" data-demo-id="${c.holderId}">
            <code>${c.holderId}</code>
            <span><strong>${escapeHtml(c.holder.name)}</strong>${escapeHtml(c.name)}</span>
          </button></li>`).join("")}
      </ul>`).join("");

    box.addEventListener("click", e => {
      const b = e.target.closest("[data-demo-id]");
      if (!b) return;
      idInput.value = b.dataset.demoId;
      pwInput.value = AdminData.DEMO_PASSWORD;
      AdminForm.clearAll(form);
      hideAlert();
      loginBtn.focus();
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
      if (rememberedId) { idInput.value = rememberedId; remember.checked = true; }
    } catch (err) { /* ignore */ }

    (idInput.value ? pwInput : idInput).focus();

    AdminForm.liveClear(form);
    form.addEventListener("submit", handleSubmit);
    togglePwBtn.addEventListener("click", togglePassword);
    bindForgotPassword();
    renderDemoAccounts();
  }

  init();
})(window, document);
