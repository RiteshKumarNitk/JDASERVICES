# JDA Admin Panel — Frontend Reference Implementation

Plain HTML + CSS + vanilla JavaScript. No framework, no CDN, no build step, and no icon fonts (icons are inline SVG).
This is a clickable prototype for the backend developer to rebuild in ASP.NET MVC.
It is fully separate from the client portal (`../`): its own CSS and JS, and every class name starts with `admin-`.

**Start:** open `index.html` (it redirects to `pages/login.html`). Demo password for every account: **Admin@123**.
The login page lists every demo officer; click one to fill in the form.

| Employee ID | Officer | Charge |
|---|---|---|
| JDA2001 | JUHI SHARMA | Informatics Assistant (Admin-CO), **Citizen Care Center (HQ)** — counselling |
| JDA0701 | OM PRAKASH MEENA | Deputy Commissioner (Zone 07) |
| JDA1001 | SHATRUGHAN SINGH GURJAR | Deputy Commissioner (Zone 11) and (Zone 19) |
| JDA1106 | RAJ KUMAR | Tehsildar (Zone 11) |

## End-to-end workflow

```
CLIENT SUBMITS APPLICATION                       (client portal, jdaFlow_v1)
  ↓
CITIZEN CARE CENTER (HQ) — counselling / verification      stage = COUNSELLING
  Counselor Dashboard → Forward Without Counselling → search → Proceed
  1 Applicant Detail          Mark Verified / Reject
  2 Choose Service            Approve / Reject
  3 Selected Property Detail  Approve / Reject
  4 Selected Witness Detail   Approve / Reject
  5 Registry Detail           Approve / SKIP / Reject   (Skipped ≠ Approved)
  6 Enclosures                Preview · Approve / Reject each document (remark on reject)
       any mandatory document not Approved → INCOMPLETE DOCUMENTS, Final Submission LOCKED
  7 Final Submission          Current Status "Case Found OK" + Remark → Submit
  ↓
FORWARD TO ZONE (modal)
  Original Documents Received? No | Yes → mark each original Received / Verified
  Current Status + Remark → confirmation → file moves to the zone's DC   stage = ZONE
  ↓
DC WORKFLOW (unchanged)
  Select Charge → Dashboard → Received Applications → Application Detail
  → Proceed → Role → Employee → Remarks → next officer → … file movement continues
```

The route between officers is **not fixed**. Proceed lets an officer pick any role, then any employee holding that role in the department.

## Pages (`pages/`)

| Page | Who | Purpose |
|---|---|---|
| `login.html` | all | CCC users go straight to the Counselor Dashboard; others go to Select Charge |
| `counselor-dashboard.html` | CCC | Pending Counselling · Forward Without Counselling · Applicant Not Appeared (clickable) |
| `forward-without-counselling.html?list=…` | CCC | Counselling list (all three queues): search, status filter, **Proceed** |
| `application-review.html?app=…` | CCC | Verification sections 1–7, progress panel, Forward to Zone |
| `select-charge.html` | zone | Charge cards |
| `dashboard.html`, `application-list.html`, `application-detail.html`, `pending-summary.html`, `application-transfer.html`, `handover-charge.html`, `reports.html` | zone | DC / officer file-movement workflow |

Pages declare `data-charge-kind="zone"` or `"counselling"`, and a user with the wrong kind of charge is sent to their own home page.
The sidebar is built for the selected charge's kind (`admin-layout.js`: `NAV_SECTIONS` / `COUNSELLING_NAV_SECTIONS`).

## JavaScript (`js/`)

| File | Purpose |
|---|---|
| `admin-data.js` | **All demo data, status constants and rules.** `Verification` decides what blocks Final Submission. Every `BACKEND INTEGRATION:` comment marks a controller/API call |
| `file-movement.js` | `forward()` (DC Proceed), `forwardToZone()` (CCC → DC), `recordAction()`, shared movement timeline, Proceed modal |
| `application-review.js` | Review page state + sections 1–5 + progress panel; passes a `ctx` to the modules below |
| `document-verification.js` | Section 6: preview, approve / reject documents, incomplete-documents rule |
| `final-submission.js` | Section 7: locked / ready / submitted states, validation |
| `forward-to-zone.js` | Forward to Zone modal, original documents, confirmation |
| `counselor-dashboard.js`, `forward-without-counselling.js` | CCC dashboard and list |
| `admin-layout.js`, `admin-common.js`, `admin-login.js`, `charge-selection.js`, `admin-dashboard.js`, `application-list.js`, `application-detail.js`, `application-transfer.js`, `handover-charge.js`, `reports.js` | Layout, shared helpers and the DC workflow |

## CSS (`css/`)

`admin-layout.css` (tokens, header, sidebar) · `admin-components.css` (buttons, forms, tables, modals, status badges) ·
`admin-pages.css` (DC screens) · `admin-verification.css` (counselling screens, verification sections, document preview) ·
`responsive.css` (breakpoints). Tables scroll inside their own container, and the Action column stays pinned to the right.

## Application data (same blocks as the client submission)

```js
application {
  appNo, stage: "COUNSELLING" | "ZONE", source, zoneId, currentChargeId, status, startDate, dueDate, flags[],
  service   { name, subService, basedOn, category, description, slaDays, isFreeHoldPatta },
  applicantType,
  applicant { name, relation, fatherHusband, mobile, whatsapp, email, aadhaar, currentAddress, permanentAddress, present, idProof },
  property  { sectorPlot, serviceNo, scheme, zone, developerType, developerName, fileBarcode, originalDocumentReceived },
  selectedProperty { serviceNo, zone, developer, scheme, sector, plotNo, area, areaUnit, propertyDetails, deposit, ownerName },
  witness[]  { name, relation, fatherHusband, aadhaar, mobile, currentAddress, permanentAddress },
  registry[] { partyName, fatherName, partyAddress, documentNo, registryNo, registryDate, district, tehsil, documentStatus },
  documents[]{ id, name, mandatory, original, fileType, fileName, sizeKb, uploadedOn, status, remark, reviewedOn },
  counselling { status, date, timeSlot },
  verification { applicant, service, property, witness, registry, remarks{} },
  finalSubmission { caseStatus, remark, at, by },
  forwardToZone { toChargeId, originalDocumentsReceived, originalDocuments[{name, required, received, verified}], currentStatus, remark, at, by },
  caseStatus
}
movement { id, appNo, at, fromChargeId, fromRole, fromName, fromEmployeeId, toChargeId, toRole, toName, toEmployeeId, action, remarks, caseStatus }
```

**Status constants** (`admin-data.js`, never raw strings):

- `VERIFY`: PENDING · APPROVED · REJECTED · SKIPPED
- `CASE_STATUS`: PENDING_VERIFICATION · INCOMPLETE_DOCUMENTS · CASE_FOUND_OK · FORWARDED_TO_ZONE · FORWARDED_TO_DC
- `COUNSELLING`: PENDING_COUNSELLING · FORWARD_WITHOUT_COUNSELLING · APPLICANT_NOT_APPEARED
- `STAGE`: COUNSELLING · ZONE
- `STATUS` (DC file): Pending · On Hold · Pending At Applicant · Query - Other Department · Disposed

`STATUS_LABELS` gives the display text; badges always show text, never colour alone.

## Rules the backend must enforce

- **Final Submission** only when the Applicant is verified; Service, Property and Witness are approved; Registry is approved **or skipped**; every **mandatory** document is approved; and Current Status and Remark are filled in.
- A rejected mandatory document makes the case **Incomplete Documents**. Previewing a document never changes its status.
- **Forward to Zone** only after Final Submission. If Original Documents Received = Yes, every required original must be marked Received.
- Forward (CCC → DC, or officer → officer) = write the movement row **and** change `currentChargeId` in one transaction.
- Only the charge that holds a file can act on it. Everyone else sees it read-only.
- Handover changes a charge's holder. The files stay with the charge, so they go to the new holder.

## localStorage keys (prototype only)

`jdaAdmin.loggedInUser`, `jdaAdmin.selectedCharge`, `jdaAdmin.selectedApplication`, `jdaAdmin.selectedRole`, `jdaAdmin.selectedEmployee`,
`jdaAdmin.fileMovementHistory`, `jdaAdmin.applications`, `jdaAdmin.charges`, `jdaAdmin.handoverLog`, `jdaAdmin.sidebarCollapsed`, `jdaAdmin.dataVersion`.

If `jdaAdmin.dataVersion` does not match `DATA_VERSION` in `admin-data.js` (currently `"3"`), all demo data is re-seeded automatically. Bump it whenever the demo data shape changes.
**Reset demo data** in the footer restores everything. Demo dates are generated relative to today.
