/* =====================================================================
   JDA Admin Panel — handover-charge.js   (handover-charge.html)
   Current charge → new officer (confirmation) → charge.holderId changes.
   Files stay attached to the CHARGE, so they automatically belong to the
   new holder.
   ===================================================================== */

(function (window, document, $) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminAuth, AdminModal, AdminForm, AdminUtil } = window;
  const { icon, escapeHtml, formatDateTime } = AdminUtil;
  const { Session, ChargeStore, EmployeeStore, ApplicationStore } = AdminData;

  const user = AdminAuth.getSession();
  const charge = Session.getCharge();
  const $form = $("#handoverForm");

  /* Officers of the same department first, then everyone else. */
  function fillOfficers() {
    const sameDept = new Set(ChargeStore.getByZone(charge.zoneId).map(c => c.holderId));
    const others = EmployeeStore.getAll().filter(e => e.employeeId !== user.employeeId);
    const opt = e => `<option value="${e.employeeId}">${escapeHtml(e.name)} (${e.employeeId})</option>`;
    $("#hoOfficer").html(`<option value="">Select Employee</option>` +
      `<optgroup label="${escapeHtml(charge.department)}">${others.filter(e => sameDept.has(e.employeeId)).map(opt).join("")}</optgroup>` +
      `<optgroup label="Other departments">${others.filter(e => !sameDept.has(e.employeeId)).map(opt).join("")}</optgroup>`);
  }

  function renderLog() {
    const log = ChargeStore.handoverLog().slice(0, 8);
    $("#hoLog").html(log.length ? log.map(h => {
      const from = EmployeeStore.getById(h.fromId), to = EmployeeStore.getById(h.toId);
      return `<li class="admin-activity-item">
        <span class="admin-activity-icon">${icon("i-handover")}</span>
        <div>
          <p class="admin-activity-text">${escapeHtml(h.chargeName)}</p>
          <p class="admin-activity-meta"><span>${escapeHtml(from ? from.name : h.fromId)} → ${escapeHtml(to ? to.name : h.toId)}</span>
          <time datetime="${h.at}">${formatDateTime(h.at)}</time><span>“${escapeHtml(h.reason)}”</span></p>
        </div></li>`;
    }).join("") : `<li class="admin-empty-inline">No charge has been handed over yet.</li>`);
  }

  $("#hoCharge").val(charge.name);
  $("#hoUser").val(`${user.name} (${user.employeeId})`);
  $("#hoFiles").text(ApplicationStore.inbox(charge.id).length);
  fillOfficers();
  renderLog();
  AdminForm.liveClear($form);

  $form.on("submit", function (e) {
    e.preventDefault();
    AdminForm.clearAll($form);
    let ok = true;
    if (!$("#hoOfficer").val()) { AdminForm.setError("#hoOfficer", "Please select the officer who will take over the charge."); ok = false; }
    if ($("#hoReason").val().trim().length < 5) { AdminForm.setError("#hoReason", "Please enter a reason (at least 5 characters)."); ok = false; }
    if (!ok) { AdminForm.focusFirstError($form); return; }
    const to = EmployeeStore.getById($("#hoOfficer").val());
    $("#hcText").html(`<strong>${escapeHtml(charge.name)}</strong> will be handed over from <strong>${escapeHtml(user.name)}</strong> ` +
      `to <strong>${escapeHtml(to.name)}</strong>. You will lose access to this charge and its files.`);
    AdminModal.open("hoConfirm");
  });

  $("#hcSubmit").on("click", async function () {
    const $modal = $("#hoConfirm");
    const to = EmployeeStore.getById($("#hoOfficer").val());
    $modal.addClass("is-busy");
    AdminUtil.setButtonLoading(this, true, "Handing over...");
    await AdminUtil.delay(800);
    ChargeStore.handover(charge.id, to.employeeId, $("#hoReason").val().trim(), user.employeeId);
    $modal.removeClass("is-busy");
    AdminUtil.setButtonLoading(this, false);
    AdminModal.close($modal);

    // The user no longer holds this charge.
    Session.clearCharge();
    $form.prop("hidden", true);
    $("#handoverDone").prop("hidden", false);
    $("#hoDoneText").html(`<strong>${escapeHtml(charge.name)}</strong> is now held by <strong>${escapeHtml(to.name)}</strong>.`);
    $("#hoSwitch").html(`${icon("i-user")} Continue as ${escapeHtml(to.name)} <small>(demo)</small>`);
    $(".admin-sidebar-charge strong").text("Charge handed over");
    renderLog();
  });

  $("#hoSwitch").on("click", () => AdminAuth.switchToOfficer(charge.id));
})(window, document, jQuery);
