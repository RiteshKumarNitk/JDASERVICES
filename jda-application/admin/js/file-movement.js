/* =====================================================================
   JDA Admin Panel — file-movement.js
   THE CORE BUSINESS FLOW: moving a file (application) between officers.

     AdminFileMovement.forward(appNo, toChargeId, remarks, action)
        → adds a movement record  (from = selected charge, to = chosen charge)
        → application.currentChargeId = toChargeId, status = Pending
        → file leaves MY inbox, appears in MY outbox and in THEIR inbox

     AdminFileMovement.recordAction(appNo, action, remarks, changes)
        → actions that do not move the file (On Hold, Query, Dispose ...)

     AdminFileMovement.initProceedModal(options)
        → wires the "Proceed Application" modal in application-detail.html:
          Role ▸ Employee (depends on role) ▸ Remarks ▸ Submit

   There is NO fixed route: any role/employee of the department can be chosen.
   ===================================================================== */

(function (window, document) {
  "use strict";

  const { AdminData, AdminModal, AdminForm, AdminUtil } = window;
  const { escapeHtml, icon } = AdminUtil;
  const { ApplicationStore, MovementStore, ChargeStore, Session, STATUS, ROLES } = AdminData;

  /* Snapshot of a charge + its holder at the moment of the movement.
     (Names are stored so history stays correct after a charge handover.) */
  function party(chargeId) {
    const c = ChargeStore.getById(chargeId);
    return {
      chargeId,
      role: c ? c.role : "",
      name: c && c.holder ? c.holder.name : "",
      employeeId: c ? c.holderId : ""
    };
  }

  function movementRecord(appNo, from, to, action, remarks) {
    return {
      appNo,
      fromChargeId: from.chargeId, fromRole: from.role, fromName: from.name, fromEmployeeId: from.employeeId,
      toChargeId: to.chargeId,     toRole: to.role,     toName: to.name,     toEmployeeId: to.employeeId,
      action, remarks
    };
  }

  const AdminFileMovement = {
    /* Only the charge that currently holds an open file may act on it. */
    canAct(app) {
      const charge = Session.getCharge();
      return !!(app && charge && app.currentChargeId === charge.id && app.status !== STATUS.DISPOSED);
    },

    /* BACKEND INTEGRATION:
       POST { appNo, toChargeId, remarks, action } to the forward/proceed action.
       The server must write the movement row and change the file's owner
       in ONE transaction, then return the updated application. */
    forward(appNo, toChargeId, remarks, action) {
      const me = Session.getCharge();
      const from = party(me.id);
      const to = party(toChargeId);
      const movement = MovementStore.add(movementRecord(appNo, from, to, action || "Forwarded", remarks));
      const app = ApplicationStore.update(appNo, { currentChargeId: toChargeId, status: STATUS.PENDING });
      Session.setLastForward(to.role, toChargeId);
      return { app, movement, to };
    },

    /* BACKEND INTEGRATION: POST the action + remarks; server updates status. */
    recordAction(appNo, action, remarks, changes) {
      const me = party(Session.getCharge().id);
      const movement = MovementStore.add(movementRecord(appNo, me, me, action, remarks));
      const app = ApplicationStore.update(appNo, changes || {});
      return { app, movement };
    },

    /* Roles that have at least one OTHER officer in the zone. */
    rolesForZone(zoneId) {
      const me = Session.getCharge();
      const charges = ChargeStore.getByZone(zoneId).filter(c => c.id !== me.id && c.holder);
      return ROLES.filter(r => charges.some(c => c.role === r));
    },

    officersForRole(zoneId, role) {
      const me = Session.getCharge();
      return ChargeStore.getByZone(zoneId).filter(c => c.role === role && c.id !== me.id && c.holder);
    },

    /* ---------------------------------------------------------------
       PROCEED MODAL
       options.getApp()          → current application
       options.onMoved(result)   → page re-renders after the move
       --------------------------------------------------------------- */
    initProceedModal(options) {
      const modal   = document.getElementById("proceedModal");
      const form    = document.getElementById("proceedForm");
      const formBox = document.getElementById("proceedFormView");
      const doneBox = document.getElementById("proceedDoneView");
      const roleSel = document.getElementById("proceedRole");
      const empSel  = document.getElementById("proceedEmployee");
      const remarks = document.getElementById("proceedRemarks");
      const count   = document.getElementById("proceedRemarksCount");
      const route   = document.getElementById("proceedRoute");
      const submit  = document.getElementById("proceedSubmit");
      const appLbl  = document.getElementById("proceedAppLabel");
      const self    = this;

      function fillEmployees() {
        const app = options.getApp();
        const role = roleSel.value;
        empSel.innerHTML = `<option value="">${role ? "Select " + escapeHtml(role) : "Select Role first"}</option>` +
          (role ? self.officersForRole(app.zoneId, role).map(c =>
            `<option value="${c.id}">${escapeHtml(c.holder.name)} (${escapeHtml(c.holderId)}) — ${escapeHtml(c.name)}</option>`).join("") : "");
        empSel.disabled = !role;
        // Auto-pick when the role has exactly one officer.
        if (role && empSel.options.length === 2) empSel.selectedIndex = 1;
        updateRoute();
      }

      function updateRoute() {
        const me = Session.getCharge();
        const target = empSel.value && ChargeStore.getById(empSel.value);
        route.hidden = !target;
        if (target) {
          route.innerHTML =
            `<span><small>From</small><strong>${escapeHtml(me.role)}</strong>${escapeHtml(AdminData.Session.getUser().name)}</span>` +
            icon("i-arrow-right", "admin-route-arrow") +
            `<span><small>To</small><strong>${escapeHtml(target.role)}</strong>${escapeHtml(target.holder.name)}</span>`;
        }
      }

      function open(presetChargeId) {
        const app = options.getApp();
        form.reset();
        AdminForm.clearAll(form);
        formBox.hidden = false;
        doneBox.hidden = true;
        appLbl.textContent = `Application No. ${app.appNo} · ${app.service}`;
        roleSel.innerHTML = `<option value="">Select Role</option>` +
          self.rolesForZone(app.zoneId).map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");
        if (presetChargeId) {
          const c = ChargeStore.getById(presetChargeId);
          if (c) { roleSel.value = c.role; fillEmployees(); empSel.value = c.id; updateRoute(); }
        } else {
          fillEmployees();
        }
        count.textContent = "0 / 500";
        AdminModal.open(modal);
      }

      roleSel.addEventListener("change", () => { AdminForm.clearError(empSel); fillEmployees(); });
      empSel.addEventListener("change", updateRoute);
      remarks.addEventListener("input", () => { count.textContent = `${remarks.value.length} / 500`; });
      AdminForm.liveClear(form);

      form.addEventListener("submit", async e => {
        e.preventDefault();
        AdminForm.clearAll(form);
        let ok = true;
        if (!roleSel.value) { AdminForm.setError(roleSel, "Please select a role."); ok = false; }
        if (!empSel.value)  { AdminForm.setError(empSel, "Please select an employee."); ok = false; }
        if (remarks.value.trim().length < 5) { AdminForm.setError(remarks, "Please enter remarks / instructions (at least 5 characters)."); ok = false; }
        if (!ok) { AdminForm.focusFirstError(form); return; }

        const app = options.getApp();
        modal.classList.add("is-busy");
        AdminUtil.setButtonLoading(submit, true, "Forwarding...");
        await AdminUtil.delay(800);
        const result = self.forward(app.appNo, empSel.value, remarks.value.trim(), "Forwarded");
        modal.classList.remove("is-busy");
        AdminUtil.setButtonLoading(submit, false);

        // Success view inside the modal
        const target = ChargeStore.getById(result.to.chargeId);
        document.getElementById("proceedDoneText").innerHTML =
          `Application <strong>${escapeHtml(app.appNo)}</strong> has been forwarded to ` +
          `<strong>${escapeHtml(result.to.name)}</strong> (${escapeHtml(target.name)}).`;
        document.getElementById("proceedSwitchBtn").innerHTML =
          `${icon("i-user")} Continue as ${escapeHtml(result.to.name)} <small>(demo)</small>`;
        document.getElementById("proceedSwitchBtn").dataset.chargeId = target.id;
        formBox.hidden = true;
        doneBox.hidden = false;
        document.getElementById("proceedOutboxBtn").focus();

        if (options.onMoved) options.onMoved(result);
      });

      document.getElementById("proceedSwitchBtn").addEventListener("click", e => {
        window.AdminAuth.switchToOfficer(e.currentTarget.dataset.chargeId);
      });

      return { open };
    }
  };

  window.AdminFileMovement = AdminFileMovement;
})(window, document);
