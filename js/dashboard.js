// js/dashboard.js - Dashboard Module

document.addEventListener("DOMContentLoaded", () => {
    // Check authentication
    if (window.APP && APP.ensureAuth) {
        APP.ensureAuth();
    }

    // Sign out button listener
    const btnSignOut = document.getElementById('btnSignOut');
    if (btnSignOut) {
        btnSignOut.addEventListener('click', () => {
            if (window.APP && APP.logout) {
                APP.logout();
            }
        });
    }

    let patientsList = [];
    let todayAppointments = [];

    // Load data from API
    async function loadDashboardData() {
        try {
            console.log('Loading dashboard data...');

            // Check authentication first
            const token = localStorage.getItem('authToken');
            console.log('Auth token:', token);

            const [patients, appointments] = await Promise.all([
                APP.api.get("/patients"),
                APP.api.get("/appointments")
            ]);

            console.log('Patients loaded:', patients.length);
            console.log('Appointments loaded:', appointments.length);
            console.log('Patients data:', patients);

            patientsList = patients;

            // Filter appointments for today and attach patient objects
            const today = new Date().toISOString().split('T')[0];
            todayAppointments = appointments
                .filter(a => a.date === today)
                .map(a => {
                    // Handle case where patientId is already populated as an object by backend
                    let patientObj = typeof a.patientId === 'object' ? a.patientId : null;

                    if (!patientObj) {
                        // Fallback to manual search in patientsList
                        patientObj = patientsList.find(p => p.patientId === a.patientId);
                    }

                    return { ...a, patient: patientObj };
                });
            // Filt
            updateKPIs();
            renderTodayAppointments();
            renderPatientsByCity();
        } catch (err) {
            console.error("Failed to load dashboard data:", err);

            // Show error on page
            const cityTableBody = document.getElementById('patientsByCityTableBody');
            if (cityTableBody) {
                cityTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">
                    Error loading data: ${err.message}<br>
                    Please check console for details
                </td></tr>`;
            }
        }
    }

    // Update KPIs
    function updateKPIs() {
        const kpiTodayAppts = document.getElementById('kpi-today-appts');
        const kpiTotalPat = document.getElementById('kpi-total-pat');

        if (kpiTodayAppts) kpiTodayAppts.textContent = todayAppointments.length;
        if (kpiTotalPat) kpiTotalPat.textContent = patientsList.length;

        // Revenue and Outstanding would come from invoices API
        const kpiTodayRev = document.getElementById('kpi-today-rev');
        const kpiTotalOut = document.getElementById('kpi-total-out');

        if (kpiTodayRev) kpiTodayRev.textContent = "Rs 0";
        if (kpiTotalOut) kpiTotalOut.textContent = "Rs 0";
    }

    // Unlock protected KPI
    const kpiProtected = document.querySelectorAll('.kpi-protected');
    const btnUnlockKpi = document.getElementById('btn-unlock-kpi');

    // Check if previously unlocked in this session
    if (sessionStorage.getItem('kpisUnlocked') === 'true') {
        kpiProtected.forEach(kpi => kpi.classList.remove('kpi-protected'));
        if (btnUnlockKpi) btnUnlockKpi.textContent = "Capital Unlocked";
    }

    if (btnUnlockKpi) {
        btnUnlockKpi.addEventListener('click', () => {
            // Check if already unlocked
            if (sessionStorage.getItem('kpisUnlocked') === 'true') {
                Toast.info("Capital already unlocked.");
                return;
            }

            const password = prompt("Please enter password to show capital data:");
            if (password === "userpakteeth") {
                sessionStorage.setItem('kpisUnlocked', 'true');
                kpiProtected.forEach(kpi => kpi.classList.remove('kpi-protected'));
                btnUnlockKpi.textContent = "Capital Unlocked";
                Toast.success("Financial data revealed");
            } else if (password !== null) {
                Toast.error("Incorrect password.");
            }
        });
    }

    // Today's Appointments Table
    const todayApptTableBody = document.querySelector("#todayApptTable tbody");

    function renderTodayAppointments() {
        if (!todayApptTableBody) return;
        todayApptTableBody.innerHTML = '';

        todayAppointments.forEach(appt => {
            const tr = document.createElement('tr');
            const patientName = `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim() || appt.patientName || appt.patientId;

            // Resolve the raw patient ID string (e.g. "P001") for the profile URL
            const rawPatientId = typeof appt.patientId === 'object'
                ? (appt.patientId?.patientId || appt.patientId?._id || '')
                : (appt.patientId || '');

            tr.innerHTML = `
                <td>${appt.time || '-'}</td>
                <td>${patientName || '-'}</td>
                <td>${appt.type || '-'}</td>
                <td>${appt.dentist || '-'}</td>
                <td>${appt.status || '-'}</td>
                <td>
                    <button
                        onclick="window.location.href='../patients/patient-profile.html?id=${encodeURIComponent(rawPatientId)}'"
                        style="
                            background: linear-gradient(135deg, #2a9df4, #1a7cd4);
                            color: white;
                            border: none;
                            padding: 5px 12px;
                            border-radius: 6px;
                            font-size: 0.78rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: opacity 0.2s;
                            white-space: nowrap;
                        "
                        onmouseover="this.style.opacity='0.85'"
                        onmouseout="this.style.opacity='1'"
                        title="Open patient profile"
                    >👤 View</button>
                </td>
            `;
            todayApptTableBody.appendChild(tr);
        });

        if (todayAppointments.length === 0) {
            todayApptTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No appointments today</td></tr>';
        }
    }

    // Removed Patients by City logic as it was migrated to Patient Dashboard


    // Initialize
    loadDashboardData();

    // Expose for cross-module refresh (e.g. after saving an appointment)
    window.loadDashboardData = loadDashboardData;
});
// Logout function
window.APP = window.APP || {};

APP.logout = function () {
    // Clear session/local storage tokens
    localStorage.removeItem('authToken'); // or whatever key you use
    sessionStorage.removeItem('authToken');

    // Redirect to login page
    window.location.href = "../../index.html";
};