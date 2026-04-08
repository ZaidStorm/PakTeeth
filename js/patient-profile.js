// =======================
// Patient Profile Page JS
// =======================

// Patient Data
let selectedPatient = null;

// Get patient ID from URL
function getPatientId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load patient data and related overview stats
async function loadPatientData() {
    const patientId = getPatientId();
    if (!patientId) {
        Toast.error("No patient ID provided");
        return;
    }

    try {
        // Load basic profile
        selectedPatient = await APP.api.get(`/patients/${patientId}`);
        populateProfile();
        setupModalEventListeners();

        // Load overview data (Parallel fetch for performance)
        const pid = selectedPatient.patientId || selectedPatient._id;
        const [appts, meds, invs] = await Promise.all([
            APP.api.get(`/appointments/patient/${pid}`).catch(() => []),
            APP.api.get(`/prescriptions/patient/${pid}`).catch(() => []),
            APP.api.get(`/invoices/patient/${pid}`).catch(() => [])
        ]);

        renderVisitSummary(appts, invs);
        renderRecentActivity(appts, meds, invs);
        renderMedicalSnapshot(meds);

    } catch (err) {
        console.error("Failed to load patient data:", err);
        Toast.error("Failed to load patient data");
    }
}

// Populate Profile
function populateProfile() {
    if (!selectedPatient) return;

    // Update Hero Section
    const heroName = document.getElementById('heroName');
    const heroId = document.getElementById('heroId');
    const heroStats = document.getElementById('heroStats');

    if (heroName) heroName.textContent = `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim();
    const heroRegDate = document.getElementById('heroRegDate');
    if (heroRegDate) {
        const regDate = selectedPatient.registrationDate ? Utils.formatDate(selectedPatient.registrationDate) : (selectedPatient.createdAt ? Utils.formatDate(selectedPatient.createdAt).split('T')[0] : 'N/A');
        heroRegDate.textContent = `Registered: ${regDate}`;
    }
    if (heroId) heroId.textContent = `Patient ID: ${Utils.formatPatientId(selectedPatient.patientId) || '-'}`;

    // Update Tab Navigation Links with Patient ID
    const tabNav = document.getElementById('profileTabNav');
    if (tabNav) {
        const patientId = selectedPatient.patientId || selectedPatient._id;

        const dentalPath = (selectedPatient.age !== null && selectedPatient.age !== undefined && selectedPatient.age < 12) ? 'baby-dental-chart.html' : 'dental-chart.html';

        // Update tab links to include patient ID
        const tabLinks = tabNav.querySelectorAll('a.tab');
        const linkMappings = [
            { index: 1, href: `appointments.html?id=${patientId}` },
            { index: 2, href: `prescriptions.html?id=${patientId}` },
            { index: 3, href: `billing.html?id=${patientId}` },
            { index: 4, href: `reports.html?id=${patientId}` },
            { index: 5, href: `${dentalPath}?id=${patientId}` }
        ];

        linkMappings.forEach(mapping => {
            if (tabLinks[mapping.index]) {
                tabLinks[mapping.index].setAttribute('href', mapping.href);
            }
        });
    }

    if (heroStats) {
        heroStats.innerHTML = `
            <div class="hero-stat-item" id="statCard-age">
                <div class="hero-stat-content">
                    <span class="hero-stat-value" id="heroAge">${selectedPatient.age || '-'}</span>
                    <input type="number" id="heroAgeInput" class="hero-stat-input" style="display: none;">
                    <button class="btn-inline-edit-sm" onclick="toggleStatEdit('age', 'edit')" id="editAgeBtn" title="Edit Age">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <div id="ageEditActions" class="stat-edit-actions" style="display: none;">
                        <button class="btn-stat-save" onclick="saveStatEdit('age')" title="Save Age">✓</button>
                        <button class="btn-stat-cancel" onclick="toggleStatEdit('age', 'view')" title="Cancel">×</button>
                    </div>
                </div>
                <span class="hero-stat-label">Age</span>
            </div>
            <div class="hero-stat-item" id="statCard-gender">
                <div class="hero-stat-content">
                    <span class="hero-stat-value" id="heroGender">${selectedPatient.gender || '-'}</span>
                    <select id="heroGenderInput" class="hero-stat-input" style="display: none;">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                    <button class="btn-inline-edit-sm" onclick="toggleStatEdit('gender', 'edit')" id="editGenderBtn" title="Edit Gender">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <div id="genderEditActions" class="stat-edit-actions" style="display: none;">
                        <button class="btn-stat-save" onclick="saveStatEdit('gender')" title="Save Gender">✓</button>
                        <button class="btn-stat-cancel" onclick="toggleStatEdit('gender', 'view')" title="Cancel">×</button>
                    </div>
                </div>
                <span class="hero-stat-label">Gender</span>
            </div>
        `;
    }

    // Update Aside Details
    const detailsAside = document.getElementById('patientDetailsAside');
    if (detailsAside) {
        detailsAside.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Phone</div>
                <div class="detail-value">${selectedPatient.phone || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Email</div>
                <div class="detail-value">${selectedPatient.email || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">City</div>
                <div class="detail-value">${selectedPatient.city || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Address</div>
                <div class="detail-value">${selectedPatient.address || '-'}</div>
            </div>
        `;
    }

    // Medical Snapshot is rendered by renderMedicalSnapshot(meds)
    
    // Update Actions
    const profileActions = document.getElementById('profileActions');
    if (profileActions) {
        profileActions.innerHTML = `
            <button class="btn btn-secondary btn-sm" onclick="openEditPersonalModal()">✏️ Edit Info</button>
        `;
    }

    setupTabLogic();
}

// Tab Switching Logic
function setupTabLogic() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Check if this is a navigation link (has href and goes to different page)
            if (tab.tagName === 'A' && tab.href && !tab.href.includes('#')) {
                // Let navigation links work normally - don't prevent default
                return;
            }

            // Handle local tab switching (only for tabs with data-tab)
            const target = tab.getAttribute('data-tab');
            if (!target) return; // Skip if no data-tab attribute

            e.preventDefault(); // Prevent default for local tabs

            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding panel
            panels.forEach(panel => {
                if (panel.id === target) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });
}

// Setup Modal Event Listeners
function setupModalEventListeners() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                Modal.close(modal.id);
            }
        });
    });
}

// =======================
// Overview Tab Rendering
// =======================

function renderMedicalSnapshot(meds) {
    const medSnapshot = document.getElementById('medSnapshotAside');
    if (!medSnapshot) return;

    // Extract unique allergies
    let allAllergies = [];
    let allMedicines = [];

    meds.forEach(rx => {
        if (rx.allergies) {
            rx.allergies.split(',').forEach(a => {
                const trimmed = a.trim();
                if (trimmed && !allAllergies.includes(trimmed)) allAllergies.push(trimmed);
            });
        }
        if (rx.medications) {
            rx.medications.forEach(m => {
                const medName = m.name.trim();
                if (medName && !allMedicines.includes(medName)) allMedicines.push(medName);
            });
        }
    });

    const allergiesDisplay = allAllergies.length > 0 ? allAllergies.join(', ') : 'None known.';
    const medicinesDisplay = allMedicines.length > 0 ? allMedicines.join(', ') : 'No prescribed medications on record.';

    medSnapshot.innerHTML = `
        <div class="detail-item" style="margin-bottom: 1rem;">
            <div class="detail-label" style="font-weight: 600; color: #2766ba; margin-bottom: 4px;">Medications</div>
            <div class="detail-value" style="font-size: 0.9rem; line-height: 1.4;">${medicinesDisplay}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label" style="font-weight: 600; color: #d32f2f; margin-bottom: 4px;">Allergies</div>
            <div class="detail-value" style="font-size: 0.9rem; line-height: 1.4;">${allergiesDisplay}</div>
        </div>
    `;
}

function renderVisitSummary(appointments = [], invoices = []) {
    const container = document.getElementById('overviewStats');
    if (!container) return;

    // Filter valid appointments
    const validAppts = appointments.filter(a => a.status !== 'cancelled');
    const today = new Date().toISOString().split('T')[0];

    // Sort appointments by date
    const sorted = [...validAppts].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Find next and last visits
    const future = sorted.filter(a => a.date >= today);
    const past = sorted.filter(a => a.date < today);

    const nextVisit = future.length > 0 ? future[0].date : 'None Scheduled';
    const lastVisit = past.length > 0 ? past[past.length - 1].date : 'No Past Visits';

    // Calculate total balance
    const balance = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balance) || 0), 0);

    // Find active session (Confirmed appointment with startTime)
    const activeAppt = appointments.find(a => a.status === 'confirmed' && a.startTime);
    const activeContainer = document.getElementById('activeSessionContainer');

    if (activeContainer) {
        if (activeAppt) {
            activeContainer.innerHTML = `
                <div class="active-session-banner">
                    <div class="session-info">
                        <div class="session-label">Active Treatment Session</div>
                        <div class="session-timer">
                            <span class="timer-icon">⏱️</span>
                            <span class="timer-active" data-start="${activeAppt.startTime}">00:00:00</span>
                        </div>
                    </div>
                    <div class="session-details" style="text-align: right;">
                        <div style="font-size: 0.8rem; opacity: 0.9;">Doctor: ${activeAppt.dentist || 'N/A'}</div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">Type: ${activeAppt.type || 'N/A'}</div>
                    </div>
                </div>
            `;
        } else {
            activeContainer.innerHTML = '';
        }
    }

    const stats = [
        { label: 'Total Visits', value: validAppts.length, color: 'blue' },
        { label: 'Next Visit', value: nextVisit, color: 'green' },
        { label: 'Last Visit', value: lastVisit, color: 'orange' },
        { label: 'Outstanding Balance', value: `Rs ${balance.toFixed(2)}`, color: 'red' }
    ];

    container.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-label">${stat.label}</div>
            <div class="stat-value" style="color: var(--${stat.color}-600, ${stat.color})">${stat.value}</div>
        </div>
    `).join('');
}

function renderRecentActivity(appointments = [], prescriptions = [], invoices = []) {
    const container = document.getElementById('activityTimeline');
    if (!container) return;

    // Build unified activity list
    const activities = [
        ...appointments.map(a => {
            let timerSuffix = "";
            if (a.status === "confirmed" && a.startTime) {
                timerSuffix = ` <span class="timer-active" data-start="${a.startTime}" style="color: var(--success-600); font-weight: bold; margin-left:10px;">(Elapsed: ...)</span>`;
            } else if (a.status === "done" && a.duration) {
                const mins = Math.floor(a.duration / 60);
                const secs = a.duration % 60;
                timerSuffix = ` <small style="color: var(--gray-500); margin-left:10px;">(Duration: ${mins}m ${secs}s)</small>`;
            }

            return {
                date: a.date,
                type: 'calendar',
                title: `Appointment: ${a.type}${timerSuffix}`,
                desc: `Status: ${a.status} with ${a.dentist || 'N/A'}`
            };
        }),
        ...prescriptions.map(p => ({
            date: p.date,
            type: 'pill',
            title: `Prescription: ${p.diagnosis || 'General'}`,
            desc: `${p.medications?.length || 0} medicine(s) prescribed`
        })),
        ...invoices.map(i => {
            const dateStr = i.date || (i.createdAt ? i.createdAt.split('T')[0] : 'Unknown Date');
            const invNum = i.invoiceNumber || i._id?.slice(-6) || 'NEW';
            const total = parseFloat(i.totalAmount || i.total || i.subtotal || 0).toFixed(2);
            const paid = parseFloat(i.paid || 0).toFixed(2);
            return {
                date: dateStr,
                type: 'invoice',
                title: `Invoice Generated: ${invNum}`,
                desc: `Total: Rs ${total} | Paid: Rs ${paid}`
            };
        })
    ];

    // Sort newest first
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Slice to top 10
    const recent = activities.slice(0, 10);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent activity recorded.</p>';
        return;
    }

    container.innerHTML = recent.map(act => `
        <div class="timeline-item">
            <div class="timeline-date">${act.date}</div>
            <div class="timeline-content">
                <div class="timeline-title">${act.title}</div>
                <div class="timeline-desc">${act.desc}</div>
            </div>
        </div>
    `).join('');
}

async function resetPatientActivity() {
    if (!selectedPatient) return;
    const pid = selectedPatient.patientId || selectedPatient._id;

    const confirmed = await Confirm.show("WARNING: This will permanently delete ALL appointments, prescriptions, and invoices for this patient. This action cannot be undone.\n\nAre you sure you want to proceed?");

    if (!confirmed) return;

    try {
        Toast.info("Resetting activity...");

        // 1. Fetch all related records
        const [appts, meds, invs] = await Promise.all([
            APP.api.get(`/appointments/patient/${pid}`).catch(() => []),
            APP.api.get(`/prescriptions/patient/${pid}`).catch(() => []),
            APP.api.get(`/invoices/patient/${pid}`).catch(() => [])
        ]);

        // 2. Delete everything (Sequential for simplicity/server load)
        const deletePromises = [
            ...appts.map(a => APP.api.delete(`/appointments/${a._id || a.appointmentId}`)),
            ...meds.map(p => APP.api.delete(`/prescriptions/${p._id}`)),
            ...invs.map(i => APP.api.delete(`/invoices/${i._id}`))
        ];

        await Promise.all(deletePromises);

        Toast.success("Patient activity has been reset.");

        // 3. Reload overview
        await loadPatientData();

    } catch (err) {
        console.error("Failed to reset activity:", err);
        Toast.error("Failed to reset some records. Please try again.");
    }
}

// Make globally available
window.resetPatientActivity = resetPatientActivity;

// Page Load
window.addEventListener('DOMContentLoaded', () => {
    loadPatientData();
    setupEditAgeCalculation();
    setInterval(updateProfileTimers, 1000);
});

function updateProfileTimers() {
    const timers = document.querySelectorAll('.timer-active');
    if (!timers.length) return;

    const now = new Date();
    timers.forEach(timer => {
        const startStr = timer.getAttribute('data-start');
        if (!startStr) return;

        const start = new Date(startStr);
        if (isNaN(start.getTime())) return;

        const diffSecs = Math.floor((now - start) / 1000);
        if (diffSecs < 0) return;

        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        const s = diffSecs % 60;

        timer.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });
}

function setupEditAgeCalculation() {
    const dobInput = document.getElementById('edit_dob');
    const ageInput = document.getElementById('edit_age');
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

// =======================
// Prescription Functions
// =======================
function openPrescriptionModal() {
    if (!selectedPatient) return;

    document.getElementById('prescriptionPatientId').value = selectedPatient.patientId || selectedPatient._id;
    document.getElementById('prescriptionDate').value = new Date().toISOString().split('T')[0];

    // Load doctors
    loadDoctors('prescriptionDoctor');

    // Clear medicines container and add first row
    document.getElementById('medicinesContainer').innerHTML = '';
    addMedicineRow();

    Modal.open('prescriptionModal');
}

function addMedicineRow() {
    const container = document.getElementById('medicinesContainer');
    const medicineRow = document.createElement('div');
    medicineRow.className = 'medicine-row';
    medicineRow.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Medicine Name" required>
            </div>
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Dosage (e.g., 1-0-1)" required>
            </div>
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Instructions" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">Remove</button>
            </div>
        </div>
    `;
    container.appendChild(medicineRow);
}

async function savePrescription() {
    const patientId = document.getElementById('prescriptionPatientId').value;
    const date = document.getElementById('prescriptionDate').value;
    const doctor = document.getElementById('prescriptionDoctor').value;
    const diagnosis = document.getElementById('prescriptionDiagnosis').value;

    if (!patientId || !date || !doctor) {
        Toast.error('Please fill in all required fields');
        return;
    }

    // Get medicines
    const medicines = [];
    const medicineRows = document.querySelectorAll('#medicinesContainer .medicine-row');

    for (const row of medicineRows) {
        const inputs = row.querySelectorAll('input');
        if (inputs[0].value && inputs[1].value && inputs[2].value) {
            medicines.push({
                name: inputs[0].value,
                dosage: inputs[1].value,
                instructions: inputs[2].value
            });
        }
    }

    if (medicines.length === 0) {
        Toast.error('Please add at least one medicine');
        return;
    }

    try {
        const prescriptionData = {
            patientId,
            date,
            doctor,
            diagnosis,
            medicines,
            status: 'active'
        };

        await APP.api.post('/prescriptions', prescriptionData);
        Toast.success('Prescription saved successfully');
        Modal.close('prescriptionModal');
    } catch (err) {
        console.error('Failed to save prescription:', err);
        Toast.error('Failed to save prescription');
    }
}

// =======================
// Appointment Functions
// =======================
function openAppointmentModal() {
    if (!selectedPatient) return;

    document.getElementById('appointmentPatientId').value = selectedPatient.patientId || selectedPatient._id;
    document.getElementById('appointmentDate').value = new Date().toISOString().split('T')[0];

    // Load doctors
    loadDoctors('appointmentDoctor');

    Modal.open('appointmentModal');
}

async function saveProfileAppointment() {
    const patientId = document.getElementById('appointmentPatientId').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const doctor = document.getElementById('appointmentDoctor').value;
    const type = document.getElementById('appointmentType').value;
    const notes = document.getElementById('appointmentNotes').value;

    if (!patientId || !date || !time || !doctor) {
        Toast.error('Please fill in all required fields');
        return;
    }

    try {
        const appointmentData = {
            patientId,
            date,
            time,
            dentist: doctor,   // model field is 'dentist', not 'doctor'
            type,
            notes,
            status: 'pending'  // valid enum: pending, confirmed, cancelled
        };

        await APP.api.post('/appointments', appointmentData);
        Toast.success('Appointment booked successfully');
        Modal.close('appointmentModal');
    } catch (err) {
        console.error('Failed to book appointment:', err);
        Toast.error('Failed to book appointment');
    }
}

// =======================
// Dental Chart Functions
// =======================
function openDentalChartNotesModal() {
    if (!selectedPatient) return;

    document.getElementById('notesPatientId').value = selectedPatient._id;

    Modal.open('dentalChartNotesModal');
}

async function saveDentalChartNotes() {
    const patientId = document.getElementById('notesPatientId').value;
    const toothNumber = document.getElementById('toothNumber').value;
    const condition = document.getElementById('toothCondition').value;
    const notes = document.getElementById('toothNotes').value;
    const treatmentRequired = document.getElementById('treatmentRequired').value;

    if (!patientId || !toothNumber || !condition) {
        Toast.error('Please fill in tooth number and condition');
        return;
    }

    try {
        const dentalNoteData = {
            patientId,
            toothNumber,
            condition,
            notes,
            treatment: treatmentRequired,
            date: new Date().toISOString().split('T')[0]
        };

        await APP.api.post('/dental-charts', dentalNoteData);  // correct route
        Toast.success('Dental chart notes saved successfully');
        Modal.close('dentalChartNotesModal');
    } catch (err) {
        console.error('Failed to save dental chart notes:', err);
        Toast.error('Failed to save dental chart notes');
    }
}

// =======================
// Procedure Functions
// =======================
function openProcedureModal() {
    if (!selectedPatient) return;

    const patientIdInput = document.getElementById('procedurePatientId');
    const dateInput = document.getElementById('procedureDate');

    if (patientIdInput) patientIdInput.value = selectedPatient._id;
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Load doctors
    loadDoctors('procedureDoctor');

    Modal.open('procedureModal');
}

async function saveProcedure() {
    const patientId = document.getElementById('procedurePatientId').value;
    const date = document.getElementById('procedureDate').value;
    const type = document.getElementById('procedureType').value;
    const toothNumber = document.getElementById('procedureToothNumber').value;
    const doctor = document.getElementById('procedureDoctor').value;
    const cost = document.getElementById('procedureCost').value;
    const status = document.getElementById('procedureStatus').value;
    const notes = document.getElementById('procedureNotes').value;

    if (!patientId || !date || !type || !doctor) {
        Toast.error('Please fill in all required fields');
        return;
    }

    try {
        const procedureData = {
            patientId,
            date,
            type,
            toothNumber,
            doctor,
            cost: parseFloat(cost) || 0,
            status,
            notes
        };

        await APP.api.post('/procedures', procedureData);
        Toast.success('Procedure saved successfully');
        Modal.close('procedureModal');
    } catch (err) {
        console.error('Failed to save procedure:', err);
        Toast.error('Failed to save procedure');
    }
}

// =======================
// Follow-up Functions
// =======================
function openFollowupModal() {
    if (!selectedPatient) return;

    document.getElementById('followupPatientId').value = selectedPatient._id;

    // Set default date to today
    document.getElementById('followupDate').value = new Date().toISOString().split('T')[0];

    Modal.open('followupModal');
}

async function saveFollowup() {
    const patientId = document.getElementById('followupPatientId').value;
    const type = document.getElementById('followupType').value;
    const date = document.getElementById('followupDate').value;
    const time = document.getElementById('followupTime').value;
    const reason = document.getElementById('followupReason').value;
    const notes = document.getElementById('followupNotes').value;

    if (!patientId || !type || !date || !time) {
        Toast.error('Please fill in all required fields');
        return;
    }

    try {
        const followupData = {
            patientId,
            type,
            date,
            time,
            reason,
            notes,
            status: 'scheduled'
        };

        await APP.api.post('/followups', followupData);
        Toast.success('Follow-up scheduled successfully');
        Modal.close('followupModal');
    } catch (err) {
        console.error('Failed to schedule follow-up:', err);
        Toast.error('Failed to schedule follow-up');
    }
}

// =======================
// Edit Personal Info Functions
// =======================
function openEditPersonalModal() {
    if (!selectedPatient) return;

    document.getElementById('editPersonalPatientId').value = selectedPatient._id;
    document.getElementById('edit_firstName').value = selectedPatient.firstName || '';
    document.getElementById('edit_lastName').value = selectedPatient.lastName || '';
    document.getElementById('edit_dob').value = selectedPatient.dob || '';
    document.getElementById('edit_age').value = selectedPatient.age || '';
    document.getElementById('edit_gender').value = selectedPatient.gender || '';
    document.getElementById('edit_phone').value = selectedPatient.phone || '';
    document.getElementById('edit_email').value = selectedPatient.email || '';
    document.getElementById('edit_city').value = selectedPatient.city || '';
    document.getElementById('edit_address').value = selectedPatient.address || '';

    Modal.open('editPersonalModal');
}

async function savePersonalInfo() {
    const patientId = document.getElementById('editPersonalPatientId').value;
    const firstName = document.getElementById('edit_firstName').value.trim();
    const lastName = document.getElementById('edit_lastName').value.trim();
    const dob = document.getElementById('edit_dob').value;
    const age = document.getElementById('edit_age').value;
    const gender = document.getElementById('edit_gender').value;
    const phone = document.getElementById('edit_phone').value.trim();
    const email = document.getElementById('edit_email').value.trim();
    const city = document.getElementById('edit_city').value.trim();
    const address = document.getElementById('edit_address').value.trim();

    if (!firstName || !lastName || !phone) {
        Toast.error('Please fill in required fields: First Name, Last Name, Phone');
        return;
    }

    try {
        const updateData = {
            firstName,
            lastName,
            dob: dob || null,
            age: age || null,
            gender: gender || null,
            phone,
            email: email || null,
            city: city || null,
            address: address || null
        };

        await APP.api.put(`/patients/${patientId}`, updateData);
        Toast.success('Personal information updated successfully');
        Modal.close('editPersonalModal');

        // Reload patient data
        await loadPatientData();
    } catch (err) {
        console.error('Failed to update personal info:', err);
        Toast.error(err.message || 'Failed to update personal information');
    }
}

// =======================
// Inline Name Edit Functions
// =======================
function toggleNameEdit(mode) {
    const heroName = document.getElementById('heroName');
    const heroNameInput = document.getElementById('heroNameInput');
    const editNameBtn = document.getElementById('editNameBtn');
    const nameEditActions = document.getElementById('nameEditActions');

    if (mode === 'edit') {
        const currentName = heroName.textContent.trim();
        heroNameInput.value = currentName === 'Loading...' ? '' : currentName;
        
        heroName.style.display = 'none';
        editNameBtn.style.display = 'none';
        
        heroNameInput.style.display = 'block';
        nameEditActions.style.display = 'flex';
        
        heroNameInput.focus();
        
        // Handle Enter/Esc keys
        heroNameInput.onkeydown = (e) => {
            if (e.key === 'Enter') saveInlineName();
            if (e.key === 'Escape') toggleNameEdit('view');
        };
    } else {
        heroName.style.display = 'block';
        editNameBtn.style.display = 'flex';
        
        heroNameInput.style.display = 'none';
        nameEditActions.style.display = 'none';
    }
}

async function saveInlineName() {
    if (!selectedPatient) return;

    const heroId = selectedPatient._id;
    const input = document.getElementById('heroNameInput');
    const newFullName = input.value.trim();

    if (!newFullName) {
        Toast.error('Name cannot be empty');
        return;
    }

    // Split name: Last word is lastName, others are firstName
    const parts = newFullName.split(' ');
    let firstName = newFullName;
    let lastName = '';
    
    if (parts.length > 1) {
        lastName = parts.pop();
        firstName = parts.join(' ');
    }

    try {
        Toast.info('Saving name...');
        
        const updateData = {
            firstName,
            lastName
        };

        await APP.api.put(`/patients/${heroId}`, updateData);
        
        // Update local state
        selectedPatient.firstName = firstName;
        selectedPatient.lastName = lastName;
        
        // Update UI
        document.getElementById('heroName').textContent = newFullName;
        
        Toast.success('Name updated successfully');
        toggleNameEdit('view');
        
    } catch (err) {
        console.error('Failed to save inline name:', err);
        Toast.error(err.message || 'Failed to update name');
    }
}

// Export to window
window.toggleNameEdit = toggleNameEdit;
window.saveInlineName = saveInlineName;

// =======================
// Inline Stat Edit Functions (Age/Gender)
// =======================
function toggleStatEdit(stat, mode) {
    const display = document.getElementById(`hero${stat.charAt(0).toUpperCase() + stat.slice(1)}`);
    const input = document.getElementById(`hero${stat.charAt(0).toUpperCase() + stat.slice(1)}Input`);
    const editBtn = document.getElementById(`edit${stat.charAt(0).toUpperCase() + stat.slice(1)}Btn`);
    const actions = document.getElementById(`${stat}EditActions`);

    if (mode === 'edit') {
        const currentValue = display.textContent.trim();
        input.value = currentValue === '-' ? '' : currentValue;
        
        display.style.display = 'none';
        editBtn.style.display = 'none';
        
        input.style.display = 'block';
        actions.style.display = 'flex';
        
        input.focus();
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveStatEdit(stat);
            if (e.key === 'Escape') toggleStatEdit(stat, 'view');
        };
    } else {
        display.style.display = 'block';
        editBtn.style.display = 'flex';
        
        input.style.display = 'none';
        actions.style.display = 'none';
    }
}

async function saveStatEdit(stat) {
    if (!selectedPatient) return;

    const patientId = selectedPatient._id;
    const input = document.getElementById(`hero${stat.charAt(0).toUpperCase() + stat.slice(1)}Input`);
    const newValue = input.value.trim();

    if (!newValue && stat === 'age') {
        Toast.error('Age cannot be empty');
        return;
    }

    try {
        Toast.info(`Saving ${stat}...`);
        
        const updateData = {};
        updateData[stat] = stat === 'age' ? parseInt(newValue) : newValue;

        await APP.api.put(`/patients/${patientId}`, updateData);
        
        // Update local state
        selectedPatient[stat] = updateData[stat];
        
        // Update UI
        document.getElementById(`hero${stat.charAt(0).toUpperCase() + stat.slice(1)}`).textContent = newValue;
        
        Toast.success(`${stat.charAt(0).toUpperCase() + stat.slice(1)} updated successfully`);
        toggleStatEdit(stat, 'view');
        
    } catch (err) {
        console.error(`Failed to save stat ${stat}:`, err);
        Toast.error(err.message || `Failed to update ${stat}`);
    }
}

window.toggleStatEdit = toggleStatEdit;
window.saveStatEdit = saveStatEdit;


// =======================
// Utility Functions
// =======================
async function loadDoctors(selectId) {
    try {
        const doctors = await APP.api.get('/staff');  // correct route: /staff not /doctors
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Doctor...</option>';

        doctors.forEach(doctor => {
            if (doctor.role === 'Doctor') {
                const option = document.createElement('option');
                option.value = doctor.name; // Use name instead of _id for consistency
                option.textContent = doctor.name;
                select.appendChild(option);
            }
        });
    } catch (err) {
        console.error('Failed to load doctors:', err);
    }
}

// Make functions globally available
window.openPrescriptionModal = openPrescriptionModal;
window.openAppointmentModal = openAppointmentModal;
window.openDentalChartNotesModal = openDentalChartNotesModal;
window.openProcedureModal = openProcedureModal;
window.openFollowupModal = openFollowupModal;
window.openEditPersonalModal = openEditPersonalModal;

window.addMedicineRow = addMedicineRow;
window.savePrescription = savePrescription;
window.saveProfileAppointment = saveProfileAppointment;
window.saveDentalChartNotes = saveDentalChartNotes;
window.saveProcedure = saveProcedure;
window.saveFollowup = saveFollowup;
window.savePersonalInfo = savePersonalInfo;

// Timer Update Logic
function updateLiveTimers() {
    const activeTimers = document.querySelectorAll('.timer-active');
    activeTimers.forEach(el => {
        const startRaw = el.getAttribute('data-start');
        if (!startRaw) return;
        const start = new Date(startRaw);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        if (isNaN(diff) || diff < 0) return;
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;

        // Check if it's the premium banner timer or the timeline timer
        if (el.classList.contains('timer-active')) {
            if (el.parentElement.classList.contains('session-timer')) {
                // Banner format
                const hrs = Math.floor(mins / 60);
                const displayMins = mins % 60;
                el.textContent = `${String(hrs).padStart(2, '0')}:${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            } else {
                // Timeline format
                el.textContent = ` (Elapsed: ${mins}m ${secs}s)`;
            }
        }
    });
}

setInterval(updateLiveTimers, 1000);

