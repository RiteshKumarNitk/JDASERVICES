# JDA Admin Panel — Frontend Reference Implementation

Plain HTML + CSS + vanilla JavaScript. No framework, no CDN, no build step, and no icon fonts (icons are inline SVG).
This is a clickable prototype for the backend developer to rebuild in ASP.NET MVC.
It is fully separate from the client portal (`../`): its own CSS and JS, and every class name starts with `admin-`.

**Start:** open `index.html` (it redirects to `pages/login.html`). Demo password for every account: **Admin@123**

| Employee ID | Officer | Charges |
|---|---|---|
| JDA1001 | SHATRUGHAN SINGH GURJAR | Deputy Commissioner (Zone 11) and (Zone 19) |
| JDA1106 | RAJ KUMAR | Tehsildar (Zone 11) |
| JDA1107 | AMIT SHARMA | Junior Engineer (Zone 11) - I |

Every officer listed under **Users Of Department** can log in to see their own inbox.

## Core concept

```
CHARGE → APPLICATION → FILE → OFFICER → ACTION → FORWARD → NEXT OFFICER
```

- **Charge**: a post such as "Deputy Commissioner (Zone 11)". One employee can hold several charges.
- **Application**: one file. It always sits with exactly one charge (`currentChargeId`).
- **Movement**: one row of the file's history (Received, Forwarded, Returned, Transferred, Case On Hold, Query from Other Department, Disposed and so on).
- **Inbox** = open files whose `currentChargeId` is my selected charge.
- **Outbox** = movements whose `fromChargeId` is my selected charge.

The route is **not fixed**. Proceed lets the officer pick any role, then any employee holding that role in the department.

## Page flow

```
login.html
  └► select-charge.html          (no sidebar until a charge is selected)
       └► dashboard.html          (9 clickable counters + sidebar for that charge)
            └► application-list.html?list=received   (or any other list)
                 └► application-detail.html?app=279670&from=received
                      ├ Proceed ─► Role ▸ Employee ▸ Remarks ▸ Submit
                      │            → file moves; history, inbox and outbox update
                      ├ Edit Detail · Case On Hold · Change Property
                      ├ Query from Other Department
                      └ Dispose Ticket (confirmation)
```

**Sidebar:**
- Dashboard, Find Application
- Received Applications, My Pending Applications, Outbox
- Pending Summary, Due Date Expired, Pending At Applicant, Case Open Request, Vigyapti For Objections
- Application Transfer To, Handover Charge, Reports

Items that are lists show a live count. **Switch Charge** returns to `select-charge.html`.

## Files

| File | Purpose | MVC equivalent |
|---|---|---|
| `pages/*.html` | One file per screen. Modals are plain markup inside each page | Views / partials |
| `js/admin-data.js` | **All demo data and state.** `LISTS` defines every list and counter. Each `BACKEND INTEGRATION:` comment marks a controller/API call | Controllers / services |
| `js/file-movement.js` | `forward()`, `recordAction()` and the Proceed modal (role → employee cascade) | File-movement service |
| `js/admin-layout.js` | Header, charge-specific sidebar, footer, Profile and Change Password modals | `_Layout.cshtml` |
| `js/admin-common.js` | Icons, auth guards (`requireAuth`, `requireCharge`), modal, toast, form errors, formatters | Shared scripts |
| `js/charge-selection.js` · `admin-dashboard.js` · `application-list.js` · `application-detail.js` · `application-transfer.js` · `handover-charge.js` · `reports.js` · `admin-login.js` | Page logic. The flow is described at the top of each file | Page scripts |
| `css/admin-layout.css` · `admin-components.css` · `admin-pages.css` · `responsive.css` | Tokens + chrome · reusable parts · screens · breakpoints | |

## Data shapes

```js
charge      { id: "Z11-DC", zoneId: 11, zone: "ZONE-11", role, designation, department, name, holderId }
application { appNo, service, zoneId, startDate, dueDate, status, currentChargeId, flags[],
              applicant{name, fatherHusband, mobile, email},
              property{sectorPlot, serviceNo, scheme, zone, developerType, developerName, fileBarcode, originalDocumentReceived},
              selectedProperty{serviceNo, zone, developer, scheme, sector, plotNo, area, areaUnit, propertyDetails, deposit},
              documents[{name, uploadedOn}] }
movement    { id, appNo, at, fromChargeId, fromRole, fromName, fromEmployeeId,
              toChargeId, toRole, toName, toEmployeeId, action, remarks }
status      "Pending" | "On Hold" | "Pending At Applicant" | "Query - Other Department" | "Disposed"
flags       agenda | layout | checklist | pdc | caseOpen | vigyapti
```

Movements store role and name as they were at that moment, so history stays correct after a charge handover.

## Rules the backend must enforce

- Only the charge that holds a file can act on it. Everyone else sees it read-only.
- Forward = write the movement row **and** change `currentChargeId` in one transaction.
- A disposed file leaves every pending list and cannot be changed.
- Handover changes the charge's holder. The files stay with the charge, so they go to the new holder.

## localStorage keys (prototype only)

`jdaAdmin.loggedInUser`, `jdaAdmin.selectedCharge`, `jdaAdmin.selectedApplication`, `jdaAdmin.selectedRole`, `jdaAdmin.selectedEmployee`, `jdaAdmin.fileMovementHistory`, `jdaAdmin.applications`, `jdaAdmin.charges`, `jdaAdmin.handoverLog`, `jdaAdmin.sidebarCollapsed`, `jdaAdmin.dataVersion`.

If `jdaAdmin.dataVersion` does not match `DATA_VERSION` in `admin-data.js`, all demo data is re-seeded automatically. Bump it whenever the demo data shape changes.

**Reset demo data** in the footer restores every application, charge and history record.
Demo dates are generated relative to today, so "pending days" and "due date expired" always look realistic.
