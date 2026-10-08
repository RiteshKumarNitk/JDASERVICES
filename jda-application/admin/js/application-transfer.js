/* =====================================================================
   JDA Admin Panel — application-transfer.js   (application-transfer.html)
   Bulk move: selected inbox files → another charge, action "Transferred".
   Uses AdminFileMovement.forward() — the same logic as Proceed.
   ===================================================================== */

(function (window, document, $) {
  "use strict";

  if (!window.AdminLayout.ready) return;

  const { AdminData, AdminModal, AdminForm, AdminToast, AdminUtil, AdminFileMovement } = window;
  const { escapeHtml, statusBadge } = AdminUtil;
  const { Session, ApplicationStore, ChargeStore, daysFromToday } = AdminData;

  const charge = Session.getCharge();
  const $form = $("#transferForm");
  const picked = new Set();
  let inbox = [];

  function visible() {
    const q = $("#transferSearch").val().trim().toLowerCase();
    return inbox.filter(a => !q || `${a.appNo} ${a.applicant.name} ${a.service.name}`.toLowerCase().includes(q));
  }

  function render() {
    inbox = ApplicationStore.inbox(charge.id);
    const list = visible();
    $("#transferEmpty").prop("hidden", inbox.length > 0);
    $("#transferBody").closest(".admin-table-wrap").prop("hidden", inbox.length === 0);
    $("#transferBody").html(list.map(a => `
      <tr class="${picked.has(a.appNo) ? "is-selected" : ""}">
        <td class="admin-col-check"><input type="checkbox" data-pick="${a.appNo}" ${picked.has(a.appNo) ? "checked" : ""} aria-label="Select application ${a.appNo}"></td>
        <td><a class="admin-app-link" href="application-detail.html?app=${a.appNo}&from=received">${a.appNo}</a></td>
        <td>${escapeHtml(a.service.name)}</td>
        <td>${escapeHtml(a.applicant.name)}</td>
        <td class="admin-col-amount">${Math.max(0, -daysFromToday(a.startDate))}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>`).join(""));
    $("#selectedCount").text(`${picked.size} selected`);
    $("#checkAll").prop("checked", list.length > 0 && list.every(a => picked.has(a.appNo)));
  }

  /* Targets: every other charge, grouped by department (zone). */
  function fillTargets() {
    const all = ChargeStore.getAll().filter(c => c.id !== charge.id && c.holder);
    const depts = [...new Set(all.map(c => c.department))];
    $("#transferTo").html(`<option value="">Select charge</option>` + depts.map(d =>
      `<optgroup label="${escapeHtml(d)}">${all.filter(c => c.department === d).map(c =>
        `<option value="${c.id}">${escapeHtml(c.name)} — ${escapeHtml(c.holder.name)}</option>`).join("")}</optgroup>`).join(""));
    $("#transferFrom").val(charge.name);
  }

  $("#transferBody").on("change", "[data-pick]", function () {
    const appNo = $(this).attr("data-pick");
    this.checked ? picked.add(appNo) : picked.delete(appNo);
    AdminForm.clearError("#transferPick");
    render();
  });

  $("#checkAll").on("change", function () {
    const checked = this.checked;
    visible().forEach(a => checked ? picked.add(a.appNo) : picked.delete(a.appNo));
    AdminForm.clearError("#transferPick");
    render();
  });

  $("#transferSearch").on("input", AdminUtil.debounce(render, 150));
  AdminForm.liveClear($form);

  $form.on("submit", function (e) {
    e.preventDefault();
    AdminForm.clearAll($form);
    let ok = true;
    if (!picked.size) { AdminForm.setError("#transferPick", "Select at least one application."); ok = false; }
    if (!$("#transferTo").val()) { AdminForm.setError("#transferTo", "Please choose where to transfer the files."); ok = false; }
    if ($("#transferRemarks").val().trim().length < 5) { AdminForm.setError("#transferRemarks", "Please enter remarks (at least 5 characters)."); ok = false; }
    if (!ok) { AdminForm.focusFirstError($form); return; }
    const target = ChargeStore.getById($("#transferTo").val());
    $("#tcText").html(`<strong>${picked.size}</strong> application${picked.size === 1 ? "" : "s"} will move from ` +
      `<strong>${escapeHtml(charge.name)}</strong> to <strong>${escapeHtml(target.name)}</strong> (${escapeHtml(target.holder.name)}).`);
    AdminModal.open("transferConfirm");
  });

  $("#tcSubmit").on("click", async function () {
    const $modal = $("#transferConfirm");
    const target = ChargeStore.getById($("#transferTo").val());
    const remarks = $("#transferRemarks").val().trim();
    $modal.addClass("is-busy");
    AdminUtil.setButtonLoading(this, true, "Transferring...");
    await AdminUtil.delay(700);
    const n = picked.size;
    // BACKEND INTEGRATION: POST the list of application numbers + target charge + remarks.
    picked.forEach(appNo => AdminFileMovement.forward(appNo, target.id, remarks, "Transferred"));
    picked.clear();
    $modal.removeClass("is-busy");
    AdminUtil.setButtonLoading(this, false);
    AdminModal.close($modal);
    $form[0].reset();
    fillTargets();
    render();
    window.AdminLayout.refreshCounts();
    AdminToast.show(`${n} application${n === 1 ? "" : "s"} transferred to ${target.name}. They are now listed in your Outbox.`, "success", "Transfer complete");
  });

  fillTargets();
  render();
})(window, document, jQuery);
