// js/system-appointments.js

let appointments = [];
let dentists = [];
let patients = [];

/* =====================================================
   API HELPER
==================================================== */

const API = {
    get: async (url) => {
        const res = await fetch(`http://localhost:3000${url}`);
        if (!res.ok) throw new Error(`GET ${url} failed`);
        return await res.json();
    },

    post: async (url, data) => {
        const res = await fetch(`http://localhost:3000${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            let errStr = await res.text();
            try {
                const parsed = JSON.parse(errStr);
                if (parsed.message) errStr = parsed.message;
                else if (parsed.error) errStr = parsed.error;
            } catch (e) { }
            console.error("SERVER ERROR:", errStr);
            throw new Error(errStr || `POST ${url} failed`);
        };
        return await res.json();
    },

    put: async (url, data) => {
        const res = await fetch(`http://localhost:3000${url}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error(`PUT ${url} failed`);
        return await res.json();
    },

    delete: async (url) => {
        const res = await fetch(`http://localhost:3000${url}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error(`DELETE ${url} failed`);
        return await res.json();
    }
};


/* =====================================================
   INIT
==================================================== */

document.addEventListener("DOMContentLoaded", initAppointments);

let _systemSettings = null;  // cached clinic settings

async function getSystemSettings() {
    if (_systemSettings) return _systemSettings;
    try {
        // Fetch both and merge, prioritizing calendar-specific times for the slot range
        const [sysRes, calRes] = await Promise.all([
            fetch("http://localhost:3000/system-settings"),
            fetch("http://localhost:3000/calendar-settings")
        ]);

        const sys = sysRes.ok ? await sysRes.json() : {};
        const cal = calRes.ok ? await calRes.json() : {};

        _systemSettings = {
            ...sys,
            startTime: cal.calendarStartTime || sys.startTime || "08:00",
            endTime: cal.calendarEndTime || sys.endTime || "22:00",
            slotInterval: cal.slotInterval || sys.slotInterval || 30
        };
    } catch (e) {
        _systemSettings = { startTime: "08:00", endTime: "22:00", slotInterval: 30 };
    }
    return _systemSettings;
}



async function initAppointments() {
    await loadDentists();
    await loadPatients();
    await loadAppointments();

    switchPatientTab("existing");
    setupAgeCalculation();

    // Hook up slot filtering whenever date or dentist changes
    const dtInput = document.getElementById("apt_date");
    const docInput = document.getElementById("apt_dentist");
    if (dtInput) dtInput.addEventListener("change", () => filterTimeSlots());
    if (docInput) {
        docInput.addEventListener("change", () => {
            if (typeof filterTimeSlots === 'function') filterTimeSlots();
            if (typeof fillDoctorFees === 'function') fillDoctorFees();
        });
    }
}

function fillDoctorFees() {
    const docInput = document.getElementById("apt_dentist");
    if (!docInput || !docInput.value) return;

    const docName = docInput.value;
    const doc = dentists.find(d => d.name === docName);

    if (doc && doc.appointmentFees) {
        document.getElementById("inv_total").value = doc.appointmentFees;
        document.getElementById("inv_services").value = `Consultation fee for ${doc.name}`;
        if (typeof calcAptBalance === 'function') calcAptBalance();
    } else {
        document.getElementById("inv_total").value = 0;
        document.getElementById("inv_services").value = `Consultation for ${docName}`;
        if (typeof calcAptBalance === 'function') calcAptBalance();
    }
}

function setupAgeCalculation() {
    const dobInput = document.getElementById('p_dob');
    const ageInput = document.getElementById('p_age');
    if (dobInput && ageInput) {
        dobInput.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const birthDate = new Date(e.target.value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            ageInput.value = age > 0 ? age : 0;
        });
    }
}

/* =====================================================
   SLOT FILTERING – Dynamic generation from DB settings
==================================================== */

/** Convert "HH:MM" or "HH:MM AM/PM" → total minutes since midnight */
function parseTimeTo24hMins(timeStr) {
    if (!timeStr) return 0;
    const str = timeStr.trim();
    const isPM = /pm/i.test(str);
    const isAM = /am/i.test(str);
    const cleaned = str.replace(/am|pm/gi, '').trim();
    const parts = cleaned.split(':');
    let h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
}

/** Format total minutes → "09:15 AM" style label */
function minsToAMPM(mins) {
    let h = Math.floor(mins / 60);
    const m = mins % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

/** Format total minutes → "HH:MM" 24-hour value stored in option.value */
function minsTo24h(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Completely rebuild the #apt_time dropdown from scratch each time:
 *  • Fetches start/end/interval from DB (cached after first call)
 *  • Removes past slots (today only)
 *  • Removes slots already booked for this dentist on this date
 *    (respects full appointment duration, e.g. 60-min blocks 09:00–09:59)
 *  • If editing, excludes the current appointment's own slot so it stays selectable
 *
 * @param {string|null} excludeAppointmentId – skip this appt when checking overlaps
 * @param {string|null} preselectValue       – restore this value after rebuild (edit mode)
 */
async function filterTimeSlots(excludeAppointmentId = null, preselectValue = null) {
    const select = document.getElementById("apt_time");
    if (!select) return;

    const dateVal = document.getElementById("apt_date")?.value;
    const dentist = document.getElementById("apt_dentist")?.value;

    // Always start fresh
    select.innerHTML = '<option value="">— Select a time slot —</option>';

    if (!dateVal) return;

    // --- Load settings (cached) ---
    const cfg = await getSystemSettings();
    const startMin = parseTimeTo24hMins(cfg.startTime || "09:00");
    const endMin = parseTimeTo24hMins(cfg.endTime || "20:00");
    const interval = parseInt(cfg.slotInterval) || 30;

    // --- Today / current time ---
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = (dateVal === todayStr);
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // --- Booked windows for this dentist on this date ---
    const bookedWindows = appointments
        .filter(a =>
            a.date === dateVal &&
            a.dentist === dentist &&
            a.status !== 'cancelled' &&
            a._id !== excludeAppointmentId &&
            a.appointmentId !== excludeAppointmentId
        )
        .map(a => ({
            start: parseTimeTo24hMins(a.time),
            end: parseTimeTo24hMins(a.time) + (parseInt(a.scheduledDuration) || interval)
        }));

    // --- Build options ---
    let addedCount = 0;
    // Normalize preselectValue for comparison
    const normalizedPreselect = (preselectValue && preselectValue.includes(':'))
        ? minsTo24h(parseTimeTo24hMins(preselectValue))
        : preselectValue;

    // Check if we need to manually inject a slot because it's outside the loop range
    const preselectMins = normalizedPreselect ? parseTimeTo24hMins(normalizedPreselect) : null;
    let preselectIncluded = false;

    for (let slot = startMin; slot <= endMin; slot += interval) {
        const slot24h = minsTo24h(slot);
        const isSelectedSlot = (normalizedPreselect && slot24h === normalizedPreselect);

        if (isSelectedSlot) preselectIncluded = true;

        // Skip past slots (today only), UNLESS it's the one we're trying to pre-select
        if (isToday && slot <= nowMins && !isSelectedSlot) continue;

        // Skip slots that fall inside any booked window, UNLESS it's the one we're trying to pre-select
        const blocked = bookedWindows.some(w => slot >= w.start && slot < w.end);
        if (blocked && !isSelectedSlot) continue;

        const opt = document.createElement("option");
        opt.value = slot24h;
        opt.textContent = minsToAMPM(slot);
        if (isSelectedSlot) opt.selected = true;
        select.appendChild(opt);
        addedCount++;
    }

    // Force injection if still missing (e.g. outside start/end bounds)
    if (normalizedPreselect && !preselectIncluded) {
        const opt = document.createElement("option");
        opt.value = normalizedPreselect;
        opt.textContent = minsToAMPM(preselectMins);
        opt.selected = true;
        select.appendChild(opt);
        addedCount++;
    }

    // Explicit fallback for value setting
    if (normalizedPreselect) {
        select.value = normalizedPreselect;
    }

    if (addedCount === 0) {
        select.innerHTML = '<option value="">No available slots</option>';
    }
}

window.filterTimeSlots = filterTimeSlots;



/* =====================================================
   LOAD DENTISTS
==================================================== */

async function loadDentists() {
    try {
        const allStaff = await API.get("/staff");
        dentists = allStaff.filter(s => s.role === "Doctor");

        const select = document.getElementById("apt_dentist");
        const filter = document.getElementById("filterDentist");

        if (select) select.innerHTML = `<option value="">Select Dentist</option>`;
        if (filter) filter.innerHTML = `<option value="">All Dentists</option>`;

        dentists.forEach(d => {
            if (select) {
                const opt = document.createElement("option");
                opt.value = d.name;
                opt.textContent = d.name;
                select.appendChild(opt);
            }
            if (filter) {
                const opt = document.createElement("option");
                opt.value = d.name;
                opt.textContent = d.name;
                filter.appendChild(opt);
            }
        });
    } catch (err) {
        console.error("Failed to load dentists", err);
    }
}


/* =====================================================
   LOAD PATIENTS
==================================================== */

async function loadPatients() {
    try {
        patients = await API.get("/patients");

        const select = document.getElementById("apptPatient");
        if (!select) return;

        select.innerHTML = `<option value="">Select Patient From the Following;</option>`;

        patients.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.patientId; // Save String (P001), NOT ObjectId
            opt.textContent = `${p.patientId} - ${p.firstName} ${p.lastName}`;
            select.appendChild(opt);
        });

        // Reset search input
        const search = document.getElementById("apptPatientSearch");
        if (search) search.value = '';
    } catch (err) {
        console.error("Failed to load patients", err);
    }
}

// Allow filtering patient dropdown by name or ID
if (!window.filterPatientDropdown) {
    window.filterPatientDropdown = function () {
        const search = document.getElementById("apptPatientSearch");
        const select = document.getElementById("apptPatient");
        const clearBtn = document.getElementById("apptPatientSearchClear");
        const countEl = document.getElementById("apptPatientCount");
        if (!search || !select) return;

        const term = search.value.trim().toLowerCase();
        if (clearBtn) clearBtn.style.display = term ? 'inline' : 'none';

        select.innerHTML = '<option value="">Select Patient</option>';

        const matches = term
            ? patients.filter(p => {
                const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
                const pid = (p.patientId || '').toLowerCase();
                const phone = (p.phone || '').toLowerCase().replace(/[-\s]/g, '');
                const termClean = term.replace(/[-\s]/g, '');
                return fullName.includes(term) || pid.includes(term) || phone.includes(termClean);
            })
            : patients;

        matches.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.patientId;
            opt.textContent = `${p.patientId} - ${p.firstName || ''} ${p.lastName || ''}`;
            select.appendChild(opt);
        });

        if (matches.length === 1) {
            select.value = matches[0].patientId;
        }

        if (countEl) {
            countEl.textContent = term
                ? (matches.length === 0 ? 'No patients found' : `${matches.length} patient${matches.length > 1 ? 's' : ''} found`)
                : `${matches.length} patients total`;
        }
    };
}

if (!window.onPatientSelected) {
    window.onPatientSelected = function () {
        const select = document.getElementById("apptPatient");
        const searchGroup = document.getElementById("apptPatientSearchGroup");
        const listGroup = document.getElementById("apptPatientListGroup");
        const confirmCard = document.getElementById("apptPatientConfirm");
        const confirmName = document.getElementById("apptPatientConfirmName");

        if (!select || !select.value) return;

        let nameStr = select.options[select.selectedIndex].text;
        if (typeof patients !== 'undefined' && Array.isArray(patients)) {
            const patientObj = patients.find(p => p.patientId === select.value);
            if (patientObj) nameStr = `${patientObj.patientId} - ${patientObj.firstName || ''} ${patientObj.lastName || ''}`;
        }

        if (confirmName) confirmName.textContent = nameStr;
        if (searchGroup) searchGroup.style.display = 'none';
        if (listGroup) listGroup.style.display = 'none';
        if (confirmCard) confirmCard.style.display = 'block';
    };
}

if (!window.clearPatientSelection) {
    window.clearPatientSelection = function () {
        const select = document.getElementById("apptPatient");
        const searchGroup = document.getElementById("apptPatientSearchGroup");
        const listGroup = document.getElementById("apptPatientListGroup");
        const confirmCard = document.getElementById("apptPatientConfirm");
        const searchInput = document.getElementById("apptPatientSearch");

        if (select) select.value = '';
        if (searchGroup) searchGroup.style.display = 'block';
        if (listGroup) listGroup.style.display = 'block';
        if (confirmCard) confirmCard.style.display = 'none';

        if (searchInput) {
            searchInput.value = '';
            if (window.filterPatientDropdown) window.filterPatientDropdown();
        }
    };
}

/* =====================================================
   LOAD APPOINTMENTS
==================================================== */

async function loadAppointments() {
    try {
        appointments = await API.get("/appointments"); // Point to unified route
        renderAppointments(appointments);
    } catch (err) {
        console.error("Failed to load appointments", err);
    }
}


/* =====================================================
   RENDER TABLE
==================================================== */

function renderAppointments(list) {
    const tbody = document.querySelector("#appointmentsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML =
            `<tr>
                <td colspan="6" style="text-align:center;color:var(--text-muted)">
                No appointments found
                </td>
            </tr>`;
        return;
    }

    list.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${a.time || ''}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${a.date || ''}</div>
            </td>
            <td>
                <div style="font-weight:500;color:var(--primary)">${a.patientName || a.patientId}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">ID: ${a.patientId}</div>
            </td>
            <td>${a.type}</td>
            <td>${a.dentist}</td>
            <td>
                <select class="form-control" style="font-size: 0.8rem; padding: 4px; border: 1px solid var(--border-color); border-radius: 6px; background-color: ${a.status === 'confirmed' ? '#dcfce7' : (a.status === 'cancelled' ? '#fee2e2' : (a.status === 'done' ? '#e0f2fe' : '#fef9c3'))};" onchange="changeAppointmentStatus('${a.appointmentId || a._id}', this.value)" ${a.status === 'done' ? 'disabled' : ''}>
                    <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="done" ${a.status === 'done' ? 'selected' : ''}>Done</option>
                    <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-icon" title="View Profile" style="color:#2a9df4" onclick="window.location.href='../patients/patient-profile.html?id=${encodeURIComponent(a.patientId)}'">👤</button>
                    <button class="btn btn-icon" style="color:var(--primary)" onclick="editAppointment('${a.appointmentId || a._id}')">✏️</button>
                    ${a.status !== 'done' ? `<button class="btn btn-icon" style="color:var(--danger)" onclick="cancelAppointment('${a.appointmentId || a._id}')">🗑️</button>` : ''}
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


/* =====================================================
   OPEN MODAL
==================================================== */

async function addAppointmentModal(initDate = null, initTime = null, initDentist = null) {
    document.getElementById("bookingForm").reset();
    document.getElementById("apt_id").value = "";
    const balLabel = document.getElementById("inv_balance_label");
    if (balLabel) balLabel.textContent = "0.00";

    const dateInput = document.getElementById("apt_date");
    const dentistInput = document.getElementById("apt_dentist");

    // Set Date
    if (dateInput) {
        dateInput.value = initDate || new Date().toISOString().split('T')[0];
    }

    // Set Dentist
    if (dentistInput && initDentist) {
        dentistInput.value = initDentist;
        if (typeof fillDoctorFees === 'function') fillDoctorFees();
    }

    switchPatientTab("existing");

    // Filter and set Time
    await filterTimeSlots(null, initTime);

    Modal.open("addAppointmentModal");
}

window.addAppointmentModal = addAppointmentModal;


/* =====================================================
   CALCULATE BALANCE
==================================================== */

function calcAptBalance() {
    const balLabel = document.getElementById("inv_balance_label");
    const amt = parseFloat(document.getElementById("inv_total")?.value) || 0;
    const disc = parseFloat(document.getElementById("inv_discount")?.value) || 0;
    const paid = parseFloat(document.getElementById("inv_paid")?.value) || 0;

    const balance = amt - disc - paid;
    if (balLabel) balLabel.textContent = balance.toFixed(2);
}

window.calcAptBalance = calcAptBalance;
window.calculateBalance = calcAptBalance; // Support both names


/* =====================================================
   SAVE APPOINTMENT
==================================================== */

async function saveAppointment() {
    try {
        const mode = document.getElementById("patient_mode")?.value || "existing";
        let patientId;

        if (mode === "existing") {
            patientId = document.getElementById("apptPatient").value;
            if (!patientId) { Toast.error("Select a patient"); return; }
        } else {
            const newPatient = {
                patientId: `P${Date.now()}`, // Temporary ID generation for purely new patients
                firstName: document.getElementById("p_firstName").value,
                lastName: document.getElementById("p_lastName").value,
                phone: document.getElementById("p_phone").value,
                email: document.getElementById("p_email").value,
                dob: document.getElementById("p_dob").value,
                gender: document.getElementById("p_gender").value,
                age: document.getElementById("p_age").value,
                city: document.getElementById("p_city").value,
                address: document.getElementById("p_address").value
            };

            try {
                const res = await API.post("/patients", newPatient);
                patientId = res.patient?.patientId || res.patientId;
            } catch (pErr) {
                Toast.error("Failed to register patient: " + pErr.message);
                return; // Stop appointment saving if patient creation fails
            }
        }

        const date = document.getElementById("apt_date").value;
        const time = document.getElementById("apt_time").value;
        const duration = parseInt(document.getElementById("apt_duration").value) || 30;
        const type = document.getElementById("apt_type").value;
        const dentist = document.getElementById("apt_dentist").value;

        if (!date || !time) {
            Toast.error("Date and Time slot are required."); return;
        }
        if (!dentist) {
            Toast.error("Please select a dentist."); return;
        }

        const services = document.getElementById("inv_services").value;
        const amount = parseFloat(document.getElementById("inv_total").value) || 0;
        const discount = parseFloat(document.getElementById("inv_discount").value) || 0;
        const paid = parseFloat(document.getElementById("inv_paid").value) || 0;

        const appointmentData = {
            patientId,
            date,
            time,
            scheduledDuration: duration,
            type,
            dentist,
            status: "pending",
            invoice: {
                services,
                amount,
                discount,
                paid,
                balance: amount - discount - paid
            }
        };

        const aptId = document.getElementById("apt_id").value;

        let finalApptResult;
        if (aptId) {
            const existing = appointments.find(x => x._id === aptId || x.appointmentId === aptId);
            if (existing) appointmentData.status = existing.status;
            finalApptResult = await API.put(`/appointments/${aptId}`, appointmentData);
        } else {
            finalApptResult = await API.post("/appointments", appointmentData);
        }

        // Also post to Capital Invoices pool so it shows in capital summary
        if (amount > 0) {
            try {
                const invoiceData = {
                    patientId: patientId,
                    items: [{
                        description: services,
                        quantity: 1,
                        unitPrice: amount,
                        total: amount
                    }],
                    subtotal: amount,
                    discount: discount,
                    total: amount - discount,
                    totalAmount: amount,       // ← billing.js reads this field
                    paid: paid,
                    balance: Math.max(0, amount - discount - paid),
                    status: (amount - discount - paid) > 0 ? "Pending" : "Paid",
                    notes: `Appointment on ${date} at ${time} `,
                    date: date || new Date().toISOString().split('T')[0]
                };

                await fetch("http://localhost:3000/invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(invoiceData)
                });
            } catch (err) {
                console.error("Failed to save corresponding invoice:", err);
            }
        }

        Modal.close("addAppointmentModal");
        await loadAppointments();

        // Refresh calendar if it's loaded in the same context (e.g. embedded calendar page)
        if (typeof window.fetchCalendarAppointments === 'function') {
            window.fetchCalendarAppointments();
        }
        // Refresh dashboard upcoming appointments table if present
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        }

    } catch (err) {
        console.error("Failed to save appointment", err);
        Toast.error(err.message || "Error saving appointment");
    }
}

window.saveAppointment = saveAppointment;


/* =====================================================
   CHANGE APPOINTMENT STATUS
==================================================== */

async function changeAppointmentStatus(id, newStatus) {
    try {
        await API.put(`/appointments/${id}`, { status: newStatus });
        await loadAppointments();
        Toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
        console.error(err);
        Toast.error("Failed to update status");
        await loadAppointments(); // revert the dropdown visually
    }
}

window.changeAppointmentStatus = changeAppointmentStatus;

/* =====================================================
   CANCEL APPOINTMENT
==================================================== */

async function cancelAppointment(id) {
    const ok = await Confirm.show("Cancel this appointment?");
    if (!ok) return;

    try {
        await API.put(`/ appointments / ${id} `, { status: "cancelled" }); // Unified route
        await loadAppointments();
    } catch (err) {
        console.error(err);
        Toast.error("Failed to cancel appointment");
    }
}

window.cancelAppointment = cancelAppointment;


/* =====================================================
   EDIT APPOINTMENT
==================================================== */

async function editAppointment(id) {
    const a = appointments.find(x => x._id === id || x.appointmentId === id);
    if (!a) return;

    document.getElementById("apt_id").value = id;
    document.getElementById("apt_date").value = a.date;
    document.getElementById("apt_dentist").value = a.dentist;
    document.getElementById("apt_duration").value = a.scheduledDuration || 30;
    document.getElementById("apt_type").value = a.type;

    // Rebuild slots excluding this appointment's own slot, then pre-select its time
    await filterTimeSlots(id, a.time);

    const patientSelect = document.getElementById("apptPatient");
    if (patientSelect) patientSelect.value = a.patientId;

    document.getElementById("inv_services").value = a.invoice?.services || "";
    document.getElementById("inv_total").value = a.invoice?.amount || 0;
    document.getElementById("inv_discount").value = a.invoice?.discount || 0;
    document.getElementById("inv_paid").value = a.invoice?.paid || 0;

    if (typeof calcAptBalance === 'function') calcAptBalance();
    switchPatientTab("existing");
    Modal.open("addAppointmentModal");
}

window.editAppointment = editAppointment;


/* =====================================================
   SWITCH PATIENT TAB
==================================================== */

function switchPatientTab(mode) {
    const existingTab = document.getElementById("tab-existing");
    const newTab = document.getElementById("tab-new");

    const btnExisting = document.querySelector('[data-tab="tab-existing"]');
    const btnNew = document.querySelector('[data-tab="tab-new"]');

    if (!existingTab || !newTab) return;

    if (mode === "existing") {
        existingTab.style.display = "block";
        newTab.style.display = "none";
        if (btnExisting) btnExisting.classList.add('active');
        if (btnNew) btnNew.classList.remove('active');
    } else {
        existingTab.style.display = "none";
        newTab.style.display = "block";
        if (btnNew) btnNew.classList.add('active');
        if (btnExisting) btnExisting.classList.remove('active');
    }

    document.getElementById("patient_mode").value = mode;
}

window.switchPatientTab = switchPatientTab;


/* =====================================================
   FILTER
==================================================== */

function filterAppointments() {
    const query = document.getElementById("searchAppt").value.toLowerCase();
    const type = document.getElementById("searchTypeAppt").value;
    const dentistName = document.getElementById("filterDentist").value; // string
    const status = document.getElementById("filterStatus").value;
    const date = document.getElementById("filterDate").value;

    let filtered = [...appointments];

    filtered = filtered.filter(a => {
        if (dentistName && a.dentist !== dentistName) return false;
        if (status && a.status !== status) return false;
        if (date && a.date !== date) return false;

        if (query) {
            const patientName = (a.patientName || "").toLowerCase();
            const aptId = (a.appointmentId || a._id || "").toLowerCase();
            const aptDate = (a.date || "").toLowerCase();

            if (type === "id") return aptId.includes(query);
            if (type === "name") return patientName.includes(query);
            if (type === "date") return aptDate.includes(query);

            return (
                patientName.includes(query) ||
                aptId.includes(query) ||
                aptDate.includes(query)
            );
        }

        return true;
    });

    renderAppointments(filtered);
}

window.filterAppointments = filterAppointments;


/* =====================================================
   EXPORT CSV
==================================================== */

function exportAppointments() {
    let csv = "ID,Date,Time,Patient,Type,Dentist,Status\n";

    appointments.forEach(a => {
        csv += `${a.appointmentId || ''},${a.date},${a.time},${a.patientName || a.patientId},${a.type},${a.dentist},${a.status} \n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "appointments.csv";
    link.click();
}

window.exportAppointments = exportAppointments;