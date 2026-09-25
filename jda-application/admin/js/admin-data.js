/* =====================================================================
   JDA Admin Panel — admin-data.js
   FRONTEND DEMO DATA + STATE LAYER (no server calls).

   Core concept:  CHARGE → APPLICATION → FILE → OFFICER → ACTION → FORWARD

     charge       an officer's post, e.g. "Deputy Commissioner (Zone 11)".
                  One employee can hold several charges.
     application  a citizen's service request = one physical/electronic FILE.
                  The file always sits with exactly ONE charge
                  (application.currentChargeId).
     movement     one step in the file's history (received, forwarded,
                  put on hold, disposed ...). Inbox / Outbox are derived
                  from applications + movements.

   Every place a real API / controller will replace demo data is marked:
       // BACKEND INTEGRATION: ...
   ===================================================================== */

(function (window) {
  "use strict";

  /* localStorage keys (prefixed so they never clash with the client portal) */
  const KEYS = {
    loggedInUser:        "jdaAdmin.loggedInUser",
    rememberId:          "jdaAdmin.rememberId",
    selectedCharge:      "jdaAdmin.selectedCharge",
    selectedApplication: "jdaAdmin.selectedApplication",
    selectedRole:        "jdaAdmin.selectedRole",
    selectedEmployee:    "jdaAdmin.selectedEmployee",
    fileMovementHistory: "jdaAdmin.fileMovementHistory",
    applications:        "jdaAdmin.applications",
    charges:             "jdaAdmin.charges",
    handoverLog:         "jdaAdmin.handoverLog",
    sidebar:             "jdaAdmin.sidebarCollapsed",
    dataVersion:         "jdaAdmin.dataVersion"
  };

  /* Bump when the demo data shape changes — stored data from an older
     prototype version is then discarded and re-seeded automatically. */
  const DATA_VERSION = "2";

  /* Keys used by the first prototype version (fee-based "Multiple Charges"). */
  const LEGACY_KEYS = ["jdaAdmin.session", "jdaAdmin.selectedDC"];

  /* Demo password for every demo employee (prototype only). */
  const DEMO_PASSWORD = "Admin@123";

  /* -------------------------------------------------------------------
     ROLES — every role a file can be forwarded to.
     BACKEND INTEGRATION: replace with the Role master table.
     ------------------------------------------------------------------- */
  const ROLES = [
    "Deputy Commissioner",
    "Additional Administrative Officer",
    "Assistant Administrative Officer",
    "Assistant Accounts Officer",
    "Accountant",
    "Tehsildar",
    "Junior Engineer",
    "Junior Assistant",
    "Dealing Assistant",
    "Town Planner",
    "Assistant Town Planner",
    "Assistant Advocate"
  ];

  /* Departments for "Query from Other Department" */
  const OTHER_DEPARTMENTS = [
    "Revenue Department",
    "Town Planning Department",
    "Engineering Department",
    "Legal Cell",
    "Accounts Department",
    "Land Records (Patwar)"
  ];

  /* -------------------------------------------------------------------
     EMPLOYEES
     BACKEND INTEGRATION: replace with the Employee / User master.
     ------------------------------------------------------------------- */
  const employees = [
    { employeeId: "JDA1001", name: "SHATRUGHAN SINGH GURJAR", mobile: "9414012345", email: "ss.gurjar@jda.gov.in" },
    { employeeId: "JDA1102", name: "MAHESH CHAND SHARMA",     mobile: "9414023456", email: "mc.sharma@jda.gov.in" },
    { employeeId: "JDA1103", name: "SUNITA MEENA",            mobile: "9414034567", email: "sunita.meena@jda.gov.in" },
    { employeeId: "JDA1104", name: "RAKESH AGARWAL",          mobile: "9414045678", email: "r.agarwal@jda.gov.in" },
    { employeeId: "JDA1105", name: "PRADEEP JAIN",            mobile: "9414056789", email: "pradeep.jain@jda.gov.in" },
    { employeeId: "JDA1106", name: "RAJ KUMAR",               mobile: "9414067890", email: "raj.kumar@jda.gov.in" },
    { employeeId: "JDA1107", name: "AMIT SHARMA",             mobile: "9414078901", email: "amit.sharma@jda.gov.in" },
    { employeeId: "JDA1108", name: "VIKAS CHOUDHARY",         mobile: "9414089012", email: "v.choudhary@jda.gov.in" },
    { employeeId: "JDA1109", name: "NEHA SAINI",              mobile: "9414090123", email: "neha.saini@jda.gov.in" },
    { employeeId: "JDA1110", name: "KULDEEP SINGH",           mobile: "9414101234", email: "kuldeep.singh@jda.gov.in" },
    { employeeId: "JDA1111", name: "RAMESH SONI",             mobile: "9414112345", email: "ramesh.soni@jda.gov.in" },
    { employeeId: "JDA1112", name: "ANIL MATHUR",             mobile: "9414123456", email: "anil.mathur@jda.gov.in" },
    { employeeId: "JDA1113", name: "POOJA KHANDELWAL",        mobile: "9414134567", email: "p.khandelwal@jda.gov.in" },
    { employeeId: "JDA1114", name: "DEEPAK VERMA",            mobile: "9414145678", email: "deepak.verma@jda.gov.in" },
    { employeeId: "JDA1903", name: "KAVITA RATHORE",          mobile: "9414156789", email: "kavita.rathore@jda.gov.in" },
    { employeeId: "JDA1905", name: "HARISH GUPTA",            mobile: "9414167890", email: "harish.gupta@jda.gov.in" },
    { employeeId: "JDA1906", name: "SURESH YADAV",            mobile: "9414178901", email: "suresh.yadav@jda.gov.in" },
    { employeeId: "JDA1907", name: "MANOJ KUMAWAT",           mobile: "9414189012", email: "manoj.kumawat@jda.gov.in" },
    { employeeId: "JDA1909", name: "ROHIT BANSAL",            mobile: "9414190123", email: "rohit.bansal@jda.gov.in" },
    { employeeId: "JDA1911", name: "GEETA SHARMA",            mobile: "9414201234", email: "geeta.sharma@jda.gov.in" },
    { employeeId: "JDA1912", name: "NARENDRA SWAMI",          mobile: "9414212345", email: "n.swami@jda.gov.in" },
    { employeeId: "JDA1914", name: "ANJALI TIWARI",           mobile: "9414223456", email: "anjali.tiwari@jda.gov.in" }
  ];

  /* -------------------------------------------------------------------
     CHARGES (posts). holderId = employee currently holding the charge.
     "Handover Charge" changes holderId.
     BACKEND INTEGRATION: replace with the Charge / Post master.
     ------------------------------------------------------------------- */
  const ZONES = {
    11: { id: 11, code: "ZONE-11", label: "Zone 11" },
    19: { id: 19, code: "ZONE-19", label: "Zone 19" }
  };

  function charge(id, zoneId, role, holderId, suffix) {
    const zone = ZONES[zoneId];
    return {
      id,
      zoneId,
      zone: zone.code,
      role,
      designation: role,
      department: `Deputy Commissioner (${zone.label})`,
      name: `${role} (${zone.label})${suffix ? " - " + suffix : ""}`,
      holderId
    };
  }

  const chargesSeed = [
    charge("Z11-DC",   11, "Deputy Commissioner",               "JDA1001"),
    charge("Z11-ADAO", 11, "Additional Administrative Officer", "JDA1102"),
    charge("Z11-AAO",  11, "Assistant Administrative Officer",  "JDA1103"),
    charge("Z11-AACO", 11, "Assistant Accounts Officer",        "JDA1104"),
    charge("Z11-ACC",  11, "Accountant",                        "JDA1105"),
    charge("Z11-TEH",  11, "Tehsildar",                         "JDA1106"),
    charge("Z11-JE1",  11, "Junior Engineer",                   "JDA1107", "I"),
    charge("Z11-JE2",  11, "Junior Engineer",                   "JDA1108", "II"),
    charge("Z11-JA1",  11, "Junior Assistant",                  "JDA1109", "I"),
    charge("Z11-JA2",  11, "Junior Assistant",                  "JDA1110", "II"),
    charge("Z11-DA",   11, "Dealing Assistant",                 "JDA1111"),
    charge("Z11-TP",   11, "Town Planner",                      "JDA1112"),
    charge("Z11-ATP",  11, "Assistant Town Planner",            "JDA1113"),
    charge("Z11-ADV",  11, "Assistant Advocate",                "JDA1114"),

    charge("Z19-DC",   19, "Deputy Commissioner",               "JDA1001"),
    charge("Z19-AAO",  19, "Assistant Administrative Officer",  "JDA1903"),
    charge("Z19-ACC",  19, "Accountant",                        "JDA1905"),
    charge("Z19-TEH",  19, "Tehsildar",                         "JDA1906"),
    charge("Z19-JE1",  19, "Junior Engineer",                   "JDA1907"),
    charge("Z19-JA1",  19, "Junior Assistant",                  "JDA1909"),
    charge("Z19-DA",   19, "Dealing Assistant",                 "JDA1911"),
    charge("Z19-TP",   19, "Town Planner",                      "JDA1912"),
    charge("Z19-ADV",  19, "Assistant Advocate",                "JDA1914")
  ];

  /* -------------------------------------------------------------------
     SERVICES & SCHEMES (reference data used by applications)
     ------------------------------------------------------------------- */
  const SERVICES = [
    "Name Transfer Through Aarakshan",
    "Name Transfer Through Sale Deed",
    "Lease Deed (Patta) Issue",
    "Sub Division / Reconstitution of Plot",
    "Name Transfer Through Succession (Varasat)",
    "Duplicate Allotment Letter",
    "NOC for Mortgage",
    "Layout Plan Approval",
    "Free Hold Patta"
  ];

  const SCHEMES = {
    VDN: { name: "Vidhyadhar Nagar",          zoneId: 11, developerType: "JDA",                   developer: "Jaipur Development Authority" },
    SRN: { name: "Shri Ram Nagar Extension",  zoneId: 11, developerType: "Co-operative Society",  developer: "Shri Ram Grih Nirman Sahkari Samiti Ltd." },
    JAY: { name: "Jhotwara Aawasiya Yojana",  zoneId: 11, developerType: "JDA",                   developer: "Jaipur Development Authority" },
    RHB: { name: "Sikar Road Housing Scheme", zoneId: 11, developerType: "Housing Board",         developer: "Rajasthan Housing Board" },
    MSE: { name: "Mansarovar Extension",      zoneId: 19, developerType: "JDA",                   developer: "Jaipur Development Authority" },
    PRN: { name: "Pratap Nagar",              zoneId: 19, developerType: "Housing Board",         developer: "Rajasthan Housing Board" },
    SHV: { name: "Shiv Vihar",                zoneId: 19, developerType: "Co-operative Society",  developer: "Shiv Shakti Grih Nirman Sahkari Samiti Ltd." }
  };

  /* Documents uploaded by the applicant (per application) */
  const DEFAULT_DOCUMENTS = [
    "Application Form (Signed)",
    "Aadhaar Card of Applicant",
    "Allotment Letter / Registry Copy",
    "Aarakshan / Sale Deed Copy",
    "Affidavit on Stamp Paper",
    "Site Photograph"
  ];

  /* Status values an application can have */
  const STATUS = {
    PENDING:   "Pending",
    HOLD:      "On Hold",
    APPLICANT: "Pending At Applicant",
    OTHER:     "Query - Other Department",
    DISPOSED:  "Disposed"
  };

  /* -------------------------------------------------------------------
     APPLICATIONS — seed rows (one row = one file)
     [appNo, service#, applicant, father/husband, mobile, scheme, sector,
      plot, area(sq.yd), startedDaysAgo, slaDays, status, currentChargeId,
      flags, lastRemark, previousHolderChargeId]
     flags: agenda | layout | checklist | pdc | caseOpen | vigyapti
     previousHolder: when set, the file went DC → previous → current.
     BACKEND INTEGRATION: replace with the application-list API response.
     ------------------------------------------------------------------- */
  const APPLICATION_ROWS = [
    ["279670", 0, "Arvind Kumar",        "Deen Dayal Gupta",     "8946887702", "VDN", "Sector 4",  "112",  150, 18, 30, "Pending",   "Z11-DC",  "",                 "Documents verified. Put up for orders.",       "Z11-DA"],
    ["279652", 1, "Sunita Agarwal",      "Mahesh Agarwal",       "9829045120", "SRN", "Block B",   "27",   200, 25, 30, "Pending",   "Z11-DC",  "checklist",        "Physical checklist to be received.",           null],
    ["279648", 2, "Mohan Lal Saini",     "Gopal Lal Saini",      "9460123478", "JAY", "Sector 2",  "58-A", 120, 34, 30, "Pending",   "Z11-DC",  "agenda",           "Put up in next agenda meeting.",               "Z11-TEH"],
    ["279641", 3, "Rekha Sharma",        "Vinod Sharma",         "9414998812", "VDN", "Sector 9",  "301",  300, 12, 45, "Pending",   "Z11-DC",  "layout",           "Layout plan attached for approval.",           "Z11-ATP"],
    ["279633", 4, "Farhan Qureshi",      "Late Salim Qureshi",   "9785001234", "RHB", "Block C",   "14",   180, 41, 30, "Pending",   "Z11-DC",  "vigyapti",         "Vigyapti published, objections awaited.",      null],
    ["279627", 0, "Kamla Devi",          "Late Ram Prasad",      "9352207781", "SRN", "Block A",   "9",    160, 9,  30, "Pending At Applicant", "Z11-DC", "",       "Applicant asked to submit NOC of society.",    null],
    ["279619", 5, "Harsh Vardhan Singh", "Bhupendra Singh",      "9001234567", "JAY", "Sector 5",  "77",   100, 6,  15, "Pending",   "Z11-DC",  "",                 "Duplicate letter request received online.",    null],
    ["279611", 6, "Priya Khandelwal",    "Ashok Khandelwal",     "9829111222", "VDN", "Sector 6",  "210",  250, 22, 21, "Query - Other Department", "Z11-DC", "", "Encumbrance report sought from Revenue Department.", null],
    ["279604", 1, "Rajendra Prasad Meena","Chhotu Ram Meena",    "9460777812", "RHB", "Block D",   "63",   220, 38, 30, "On Hold",   "Z11-DC",  "caseOpen",         "Court stay order — case on hold.",             null],
    ["279598", 8, "Suresh Chand Jain",   "Nemi Chand Jain",      "9314567890", "VDN", "Sector 3",  "18",   500, 15, 45, "Pending",   "Z11-DC",  "pdc",              "Post dated cheque deposited for lease money.", "Z11-ACC"],
    ["279590", 2, "Anita Choudhary",     "Ramesh Choudhary",     "9783344556", "JAY", "Sector 7",  "144",  130, 3,  30, "Pending",   "Z11-DC",  "checklist",        "Received online, checklist pending.",          null],
    ["279583", 0, "Imran Khan",          "Abdul Rashid Khan",    "9928765432", "SRN", "Block E",   "33",   175, 29, 30, "Pending",   "Z11-DC",  "agenda,vigyapti",  "Objection received, put up in agenda.",        "Z11-ADV"],
    ["279577", 3, "Geeta Rani",          "Om Prakash",           "9414332211", "RHB", "Block A",   "5",    400, 10, 45, "Pending",   "Z11-DC",  "layout",           "Sub division layout received.",                null],
    ["279570", 7, "Maruti Developers Pvt. Ltd.", "Authorised: Naveen Goyal", "9829900011", "VDN", "Sector 11", "Khasra 412", 12000, 20, 60, "Pending", "Z11-DC", "layout,agenda", "Layout plan for approval in BPC.", "Z11-TP"],
    ["279562", 4, "Savitri Devi",        "Late Hanuman Sahay",   "9460556677", "JAY", "Sector 1",  "90",   140, 44, 30, "Pending At Applicant", "Z11-DC", "caseOpen", "Legal heir certificate awaited from applicant.", null],

    /* Zone 11 files currently with other officers (not in the DC's inbox) */
    ["279588", 1, "Deepak Mittal",       "Suresh Mittal",        "9829333444", "VDN", "Sector 8",  "56",   210, 14, 30, "Pending",   "Z11-TEH", "",                 "Please verify documents and site.",            null],
    ["279601", 3, "Laxmi Narayan Soni",  "Bhanwar Lal Soni",     "9414776655", "SRN", "Block C",   "71",   320, 11, 45, "Pending",   "Z11-JE1", "",                 "Site verification required.",                  "Z11-TEH"],
    ["279612", 2, "Pushpa Kanwar",       "Mahendra Singh",       "9783221100", "JAY", "Sector 4",  "39",   160, 8,  30, "Pending",   "Z11-JA1", "",                 "Prepare draft lease deed.",                    null],
    ["279655", 7, "Shree Balaji Colonisers", "Authorised: R. K. Gupta", "9829012345", "RHB", "Block F", "Khasra 88", 9000, 16, 60, "Pending", "Z11-ATP", "layout", "Examine layout as per master plan.", null],
    ["279640", 0, "Om Prakash Kumawat",  "Kalyan Sahay Kumawat", "9352112233", "VDN", "Sector 2",  "205",  150, 5,  30, "Pending",   "Z11-DA",  "",                 "Please verify documents.",                     null],
    ["279535", 5, "Vijay Laxmi",         "Rajesh Kumar",         "9460998877", "SRN", "Block B",   "12",   120, 60, 15, "Disposed",  "Z11-DC",  "",                 "Duplicate allotment letter issued.",           null],

    /* Zone 19 */
    ["281204", 0, "Naresh Kumar Gupta",  "Shyam Sundar Gupta",   "9414551234", "MSE", "Sector 12", "88",   150, 13, 30, "Pending",   "Z19-DC",  "",                 "Received online.",                             null],
    ["281198", 2, "Babita Sharma",       "Anil Sharma",          "9829667788", "PRN", "Sector 18", "140",  200, 36, 30, "Pending",   "Z19-DC",  "agenda",           "Put up in agenda.",                            "Z19-TEH"],
    ["281190", 1, "Mukesh Choudhary",    "Ramdhan Choudhary",    "9783445566", "SHV", "Block D",   "22",   180, 19, 30, "Pending At Applicant", "Z19-DC", "",       "Sale deed copy illegible, re-upload asked.",   null],
    ["281185", 3, "Kiran Bala",          "Satish Bala",          "9460221133", "MSE", "Sector 7",  "305",  360, 7,  45, "Pending",   "Z19-DC",  "layout,checklist", "Sub division plan received.",                  null],
    ["281177", 8, "Harish Chandra Joshi","Gauri Shankar Joshi",  "9314223344", "PRN", "Sector 9",  "66",   250, 27, 45, "On Hold",   "Z19-DC",  "pdc",              "Awaiting cheque clearance.",                   "Z19-ACC"],
    ["281170", 4, "Rukhsana Bano",       "Late Mohd. Yusuf",     "9928334455", "SHV", "Block A",   "4",    120, 33, 30, "Pending",   "Z19-DC",  "vigyapti,caseOpen","Objection period over, case open requested.",  null],
    ["281162", 6, "Sanjay Maheshwari",   "Kailash Maheshwari",   "9829778899", "MSE", "Sector 3",  "119",  220, 4,  21, "Query - Other Department", "Z19-DC", "", "Title report sought from Legal Cell.", null],
    ["281158", 0, "Pankaj Sharma",       "Mool Chand Sharma",    "9414889900", "PRN", "Sector 14", "77",   160, 10, 30, "Pending",   "Z19-TEH", "",                 "Verify Aarakshan papers.",                     null]
  ];

  /* ===================================================================
     STORAGE HELPERS
     =================================================================== */
  function readJSON(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ===================================================================
     DATE HELPERS (demo dates are generated relative to "today")
     =================================================================== */
  const DAY = 86400000;

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isoLocal(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function nowIso() { return isoLocal(new Date()); }

  function daysAgoIso(days, hour, minute) {
    const d = new Date(startOfToday().getTime() - days * DAY);
    d.setHours(hour || 10, minute || 0, 0, 0);
    return isoLocal(d);
  }

  /* Whole days between today and an ISO date (positive = future). */
  function daysFromToday(iso) {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - startOfToday()) / DAY);
  }

  /* ===================================================================
     SEED BUILDERS
     =================================================================== */
  function chargeSnapshot(chargeList, chargeId) {
    const c = chargeList.find(x => x.id === chargeId);
    const emp = c && employees.find(e => e.employeeId === c.holderId);
    return {
      chargeId,
      role: c ? c.role : "",
      chargeName: c ? c.name : "",
      employeeId: emp ? emp.employeeId : "",
      name: emp ? emp.name : ""
    };
  }

  function buildSeed() {
    const applications = [];
    const movements = [];
    let mid = 1;

    function move(appNo, at, from, to, action, remarks) {
      movements.push({
        id: mid++, appNo, at,
        fromChargeId: from.chargeId, fromRole: from.role, fromName: from.name, fromEmployeeId: from.employeeId,
        toChargeId: to.chargeId,     toRole: to.role,     toName: to.name,     toEmployeeId: to.employeeId,
        action, remarks
      });
    }

    APPLICATION_ROWS.forEach((r, i) => {
      const [appNo, svc, applicant, father, mobile, schemeKey, sector, plot, area,
             startedAgo, sla, status, holderId, flags, remark, previousId] = r;
      const scheme = SCHEMES[schemeKey];
      const zone = ZONES[scheme.zoneId];
      const dcId = `Z${zone.id}-DC`;
      const startDate = daysAgoIso(startedAgo, 10, 15 + (i % 40));
      const serviceNo = `${zone.id}${String(40000 + i * 1379 + 521)}`;

      applications.push({
        appNo,
        service: SERVICES[svc],
        zoneId: zone.id,
        startDate,
        dueDate: daysAgoIso(startedAgo - sla, 17, 30),
        status,
        currentChargeId: holderId,
        flags: flags ? flags.split(",") : [],
        applicant: {
          name: applicant,
          fatherHusband: father,
          mobile,
          email: applicant.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@gmail.com"
        },
        property: {
          sectorPlot: `${sector}, Plot No. ${plot}`,
          serviceNo,
          scheme: scheme.name,
          zone: zone.code,
          developerType: scheme.developerType,
          developerName: scheme.developer,
          fileBarcode: `JDA${zone.id}${appNo}`,
          originalDocumentReceived: i % 3 === 0 ? "No" : "Yes"
        },
        selectedProperty: {
          serviceNo,
          zone: zone.code,
          developer: scheme.developer,
          scheme: scheme.name,
          sector,
          plotNo: plot,
          area,
          areaUnit: "Sq. Yard",
          propertyDetails: area > 1000 ? "Land parcel for colonisation" : "Residential Plot",
          deposit: area > 1000 ? "₹12,50,000" : `₹${(area * 55).toLocaleString("en-IN")}`
        },
        documents: DEFAULT_DOCUMENTS.map((name, d) => ({ name, uploadedOn: daysAgoIso(startedAgo, 9, 5 + d) }))
      });

      /* Movement history: citizen → DC → (previous) → current holder */
      const citizen = { chargeId: null, role: "Applicant (Online)", name: applicant.toUpperCase(), employeeId: "" };
      const dc = chargeSnapshot(chargesSeed, dcId);
      move(appNo, startDate, citizen, dc, "Received", "Application submitted online.");

      const midDay = Math.max(1, Math.floor(startedAgo / 2));
      if (previousId && holderId === dcId) {
        const prev = chargeSnapshot(chargesSeed, previousId);
        move(appNo, daysAgoIso(midDay + 1, 11, 20), dc, prev, "Forwarded", "Please verify documents.");
        move(appNo, daysAgoIso(Math.max(0, midDay - 1), 15, 45), prev, dc, "Returned", remark);
      } else if (previousId) {
        const prev = chargeSnapshot(chargesSeed, previousId);
        const cur = chargeSnapshot(chargesSeed, holderId);
        move(appNo, daysAgoIso(midDay + 1, 11, 5), dc, prev, "Forwarded", "Please verify documents.");
        move(appNo, daysAgoIso(Math.max(0, midDay - 1), 13, 10), prev, cur, "Forwarded", remark);
      } else if (holderId !== dcId) {
        move(appNo, daysAgoIso(midDay, 12, 30), dc, chargeSnapshot(chargesSeed, holderId), "Forwarded", remark);
      } else if (status !== STATUS.PENDING) {
        const action = status === STATUS.DISPOSED ? "Disposed" :
                       status === STATUS.HOLD ? "Case On Hold" :
                       status === STATUS.APPLICANT ? "Sent to Applicant" : "Query from Other Department";
        move(appNo, daysAgoIso(midDay, 16, 0), dc, dc, action, remark);
      }
    });

    return { applications, movements };
  }

  /* ===================================================================
     STORES
     =================================================================== */

  /* Stored charges must be officer posts with a holder, otherwise re-seed. */
  function validCharges(list) {
    return Array.isArray(list) && list.length > 0 &&
      list.every(c => c && c.id && c.holderId && c.zoneId && c.role);
  }

  function ensureSeed() {
    let version = null;
    try { version = localStorage.getItem(KEYS.dataVersion); } catch (e) { /* ignore */ }
    const stale = version !== DATA_VERSION || !validCharges(readJSON(localStorage, KEYS.charges, null));

    if (stale) {
      [KEYS.applications, KEYS.fileMovementHistory, KEYS.charges, KEYS.handoverLog,
       KEYS.selectedCharge, KEYS.selectedApplication, ...LEGACY_KEYS].forEach(removeKey);
      try { localStorage.setItem(KEYS.dataVersion, DATA_VERSION); } catch (e) { /* ignore */ }
    }
    if (!readJSON(localStorage, KEYS.applications, null) || !readJSON(localStorage, KEYS.fileMovementHistory, null)) {
      const seed = buildSeed();
      writeJSON(localStorage, KEYS.applications, seed.applications);
      writeJSON(localStorage, KEYS.fileMovementHistory, seed.movements);
    }
    if (!validCharges(readJSON(localStorage, KEYS.charges, null))) {
      writeJSON(localStorage, KEYS.charges, chargesSeed);
    }
  }

  /* ---------- Employees ---------- */
  const EmployeeStore = {
    getAll() { return employees.slice(); },
    getById(id) { return employees.find(e => e.employeeId === String(id).toUpperCase()) || null; }
  };

  /* ---------- Charges ---------- */
  const ChargeStore = {
    /* BACKEND INTEGRATION: GET charges (posts) with their current holder. */
    getAll() {
      ensureSeed();
      return readJSON(localStorage, KEYS.charges, chargesSeed).map(c => ({
        ...c,
        holder: EmployeeStore.getById(c.holderId)
      }));
    },

    getById(id) { return this.getAll().find(c => c.id === id) || null; },

    /* Charges held by one employee → the "Select Charge" cards. */
    getForEmployee(employeeId) { return this.getAll().filter(c => c.holderId === employeeId); },

    /* All posts of a zone → "Users Of Department", Proceed dropdowns. */
    getByZone(zoneId) {
      return this.getAll()
        .filter(c => c.zoneId === Number(zoneId))
        .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
    },

    /* BACKEND INTEGRATION: POST handover (charge, new holder, reason). */
    handover(chargeId, newHolderId, reason, byEmployeeId) {
      const list = readJSON(localStorage, KEYS.charges, chargesSeed);
      const c = list.find(x => x.id === chargeId);
      if (!c) return null;
      const log = readJSON(localStorage, KEYS.handoverLog, []);
      log.unshift({ at: nowIso(), chargeId, chargeName: c.name, fromId: c.holderId, toId: newHolderId, reason, byEmployeeId });
      c.holderId = newHolderId;
      writeJSON(localStorage, KEYS.charges, list);
      writeJSON(localStorage, KEYS.handoverLog, log);
      return c;
    },

    handoverLog() { return readJSON(localStorage, KEYS.handoverLog, []); }
  };

  /* ---------- File movements ---------- */
  const MovementStore = {
    getAll() { ensureSeed(); return readJSON(localStorage, KEYS.fileMovementHistory, []); },

    /* Oldest → newest */
    forApp(appNo) {
      return this.getAll().filter(m => m.appNo === appNo).sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
    },

    last(appNo) { const list = this.forApp(appNo); return list[list.length - 1] || null; },

    /* BACKEND INTEGRATION: POST a movement / action record. */
    add(entry) {
      const list = this.getAll();
      const id = list.reduce((max, m) => Math.max(max, m.id), 0) + 1;
      const record = { id, at: nowIso(), ...entry };
      list.push(record);
      writeJSON(localStorage, KEYS.fileMovementHistory, list);
      return record;
    },

    /* OUTBOX: files this charge sent onward (newest first). */
    outbox(chargeId) {
      return this.getAll()
        .filter(m => m.fromChargeId === chargeId && m.toChargeId && m.toChargeId !== chargeId)
        .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id);
    }
  };

  /* ---------- Applications ---------- */
  const ApplicationStore = {
    /* BACKEND INTEGRATION: replace with the application-list API response. */
    getAll() { ensureSeed(); return readJSON(localStorage, KEYS.applications, []); },

    get(appNo) { return this.getAll().find(a => a.appNo === String(appNo)) || null; },

    /* BACKEND INTEGRATION: save application changes. */
    update(appNo, changes) {
      const list = this.getAll();
      const idx = list.findIndex(a => a.appNo === String(appNo));
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...changes };
      writeJSON(localStorage, KEYS.applications, list);
      return list[idx];
    },

    /* INBOX: open files currently with this charge. */
    inbox(chargeId) {
      return this.getAll().filter(a => a.currentChargeId === chargeId && a.status !== STATUS.DISPOSED);
    },

    byZone(zoneId) { return this.getAll().filter(a => a.zoneId === Number(zoneId)); }
  };

  /* ===================================================================
     APPLICATION LISTS — one definition per dashboard card / sidebar item.
     Each list = a filter over the selected charge's INBOX.
     Used by: dashboard counters, sidebar badges, application-list.html
     =================================================================== */
  const hasFlag = f => a => a.flags.includes(f);
  const isStatus = s => a => a.status === s;

  const LISTS = {
    "received":           { title: "Received Applications",                   icon: "i-inbox",      tone: "blue",  description: "All files currently received in your charge (your inbox).",          filter: () => true },
    "my-pending":         { title: "My Pending Applications",                 icon: "i-clock",      tone: "blue",  description: "Files waiting for your action.",                                        filter: isStatus(STATUS.PENDING) },
    "pending-client":     { title: "Total Pending with Client",               icon: "i-user",       tone: "amber", description: "Files waiting for the applicant to respond.",                           filter: isStatus(STATUS.APPLICANT) },
    "pending-other-dept": { title: "Total Pending with Other Department",     icon: "i-building",   tone: "slate", description: "Files with an open query to another department.",                      filter: isStatus(STATUS.OTHER) },
    "on-hold":            { title: "On Hold Application",                     icon: "i-pause",      tone: "amber", description: "Files put on hold (e.g. court stay).",                                 filter: isStatus(STATUS.HOLD) },
    "agenda":             { title: "Total Pending For Agenda Details",        icon: "i-calendar",   tone: "blue",  description: "Files to be placed in the next agenda meeting.",                        filter: hasFlag("agenda") },
    "layout":             { title: "Layout Applications",                     icon: "i-map",        tone: "blue",  description: "Layout / sub-division plan applications.",                              filter: hasFlag("layout") },
    "checklist":          { title: "Pending For Physically Receive Checklist",icon: "i-check-square", tone: "amber", description: "Online files whose physical checklist is not yet received.",       filter: hasFlag("checklist") },
    "pdc":                { title: "Deposited Post Dated Cheque List",        icon: "i-rupee",      tone: "slate", description: "Files with a post dated cheque deposited.",                            filter: hasFlag("pdc") },
    "due-expired":        { title: "Due Date Expired",                        icon: "i-alert",      tone: "red",   description: "Files that have crossed their disposal due date.",                     filter: a => daysFromToday(a.dueDate) < 0 },
    "pending-applicant":  { title: "Pending At Applicant",                    icon: "i-user",       tone: "amber", description: "Files returned to the applicant for compliance.",                      filter: isStatus(STATUS.APPLICANT) },
    "case-open":          { title: "Case Open Request",                       icon: "i-folder-open",tone: "blue",  description: "Requests to reopen a case.",                                            filter: hasFlag("caseOpen") },
    "vigyapti":           { title: "Vigyapti For Objections",                 icon: "i-megaphone",  tone: "blue",  description: "Files with a public notice (vigyapti) inviting objections.",           filter: hasFlag("vigyapti") },

    /* Special lists (not inbox filters) */
    "outbox":             { title: "Outbox",                                  icon: "i-send",       tone: "blue",  description: "Files forwarded by you from this charge, and where they are now.",   special: true },
    "find":               { title: "Find Application",                        icon: "i-search",     tone: "blue",  description: "Search any application of this zone and see who currently holds it.", special: true }
  };

  /* Dashboard counter order (as in the existing system) */
  const DASHBOARD_LISTS = ["received", "my-pending", "pending-client", "pending-other-dept", "on-hold", "agenda", "layout", "checklist", "pdc"];

  function listApplications(key, chargeId) {
    const def = LISTS[key];
    if (!def) return [];
    if (key === "find") {
      const c = ChargeStore.getById(chargeId);
      return c ? ApplicationStore.byZone(c.zoneId) : [];
    }
    return ApplicationStore.inbox(chargeId).filter(def.filter);
  }

  function countFor(key, chargeId) {
    if (key === "outbox") return MovementStore.outbox(chargeId).length;
    return listApplications(key, chargeId).length;
  }

  /* ===================================================================
     SESSION STATE
     =================================================================== */
  const Session = {
    getUser() {
      return readJSON(localStorage, KEYS.loggedInUser, null) || readJSON(sessionStorage, KEYS.loggedInUser, null);
    },

    /* remember = keep the session after the browser closes */
    start(employee, remember) {
      const user = { employeeId: employee.employeeId, name: employee.name, email: employee.email, mobile: employee.mobile, loginAt: nowIso() };
      removeKey(KEYS.loggedInUser);
      removeKey(KEYS.selectedCharge);
      writeJSON(remember ? localStorage : sessionStorage, KEYS.loggedInUser, user);
      return user;
    },

    end() {
      [KEYS.loggedInUser, KEYS.selectedCharge, KEYS.selectedApplication, KEYS.selectedRole, KEYS.selectedEmployee].forEach(removeKey);
    },

    getCharge() { return readJSON(localStorage, KEYS.selectedCharge, null); },

    setCharge(c) {
      const selectedCharge = { id: c.id, name: c.name, department: c.department, designation: c.designation, role: c.role, zoneId: c.zoneId, zone: c.zone };
      writeJSON(localStorage, KEYS.selectedCharge, selectedCharge);
      removeKey(KEYS.selectedApplication);
      return selectedCharge;
    },

    clearCharge() { removeKey(KEYS.selectedCharge); },

    getApplication() { return readJSON(localStorage, KEYS.selectedApplication, null); },
    setApplication(app) {
      writeJSON(localStorage, KEYS.selectedApplication, { appNo: app.appNo, service: app.service, applicant: app.applicant.name });
    },

    setLastForward(role, chargeId) {
      writeJSON(localStorage, KEYS.selectedRole, role);
      writeJSON(localStorage, KEYS.selectedEmployee, chargeId);
    }
  };

  /* Demo helper — restores all seed data (footer "Reset demo data"). */
  function resetDemo() {
    [KEYS.applications, KEYS.fileMovementHistory, KEYS.charges, KEYS.handoverLog, KEYS.selectedApplication].forEach(removeKey);
  }

  window.AdminData = {
    KEYS,
    DEMO_PASSWORD,
    ROLES,
    OTHER_DEPARTMENTS,
    SERVICES,
    STATUS,
    LISTS,
    DASHBOARD_LISTS,
    EmployeeStore,
    ChargeStore,
    ApplicationStore,
    MovementStore,
    Session,
    listApplications,
    countFor,
    daysFromToday,
    nowIso,
    resetDemo,
    readJSON,
    writeJSON
  };
})(window);
