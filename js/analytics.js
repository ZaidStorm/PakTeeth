// js/analytics.js - Analytics and Reports

document.addEventListener("DOMContentLoaded", () => {
    let analyticsData = [];

    const statNewPatients = document.getElementById("statNewPatients");
    const statAppointments = document.getElementById("statAppointments");
    const statPrescriptions = document.getElementById("statPrescriptions");

    // Load analytics data from API
    async function loadAnalyticsData() {
        try {
            // Get real data from API
            const [patients, appointments, prescriptions] = await Promise.all([
                APP.api.get("/patients"),
                APP.api.get("/appointments"),
                APP.api.get("/prescriptions")
            ]);

            // Group by date for analytics
            const groupedData = {};

            // Process patients
            patients.forEach(p => {
                const date = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : null;
                if (date) {
                    if (!groupedData[date]) groupedData[date] = { newPatients: 0, appointments: 0, prescriptions: 0 };
                    groupedData[date].newPatients++;
                }
            });

            // Process appointments
            appointments.forEach(a => {
                if (a.date) {
                    if (!groupedData[a.date]) groupedData[a.date] = { newPatients: 0, appointments: 0, prescriptions: 0 };
                    groupedData[a.date].appointments++;
                }
            });

            // Process prescriptions
            prescriptions.forEach(p => {
                const date = p.date || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : null);
                if (date) {
                    if (!groupedData[date]) groupedData[date] = { newPatients: 0, appointments: 0, prescriptions: 0 };
                    groupedData[date].prescriptions++;
                }
            });



            // Convert to array
            analyticsData = Object.keys(groupedData).sort().map(date => ({
                date,
                ...groupedData[date]
            }));

            // Initialize chart
            initChart();
            generateReports();
        } catch (err) {
            console.error("Failed to load analytics data:", err);
        }
    }

    let analyticsChart;

    function initChart() {
        const ctx = document.createElement("canvas");
        ctx.id = "analyticsChart";
        const pageContent = document.querySelector(".page-content");
        if (pageContent) pageContent.appendChild(ctx);

        const labels = analyticsData.map(d => d.date);
        const newPatientsData = analyticsData.map(d => d.newPatients);
        const appointmentsData = analyticsData.map(d => d.appointments);
        const prescriptionsData = analyticsData.map(d => d.prescriptions);

        analyticsChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    { label: "New Patients", data: newPatientsData, borderColor: "#4caf50", fill: false },
                    { label: "Appointments", data: appointmentsData, borderColor: "#2196f3", fill: false },
                    { label: "Prescriptions", data: prescriptionsData, borderColor: "#f44336", fill: false },
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Clinic Analytics Over Time' } },
                scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Count' }, beginAtZero: true } }
            }
        });
    }

    function updateKPIs(filteredData) {
        if (statNewPatients) statNewPatients.textContent = filteredData.reduce((sum, d) => sum + (d.newPatients || 0), 0);
        if (statAppointments) statAppointments.textContent = filteredData.reduce((sum, d) => sum + (d.appointments || 0), 0);
        if (statPrescriptions) statPrescriptions.textContent = filteredData.reduce((sum, d) => sum + (d.prescriptions || 0), 0);
    }

    // Date Filtering
    const dateStart = document.getElementById("dateStart");
    const dateEnd = document.getElementById("dateEnd");

    window.generateReports = function() {
        const start = dateStart?.value ? new Date(dateStart.value) : null;
        const end = dateEnd?.value ? new Date(dateEnd.value) : null;

        const filtered = analyticsData.filter(d => {
            const current = new Date(d.date);
            if (start && current < start) return false;
            if (end && current > end) return false;
            return true;
        });

        updateKPIs(filtered);

        if (analyticsChart) {
            analyticsChart.data.labels = filtered.map(d => d.date);
            analyticsChart.data.datasets[0].data = filtered.map(d => d.newPatients);
            analyticsChart.data.datasets[1].data = filtered.map(d => d.appointments);
            analyticsChart.data.datasets[2].data = filtered.map(d => d.prescriptions);
            analyticsChart.update();
        }
    };

    // Quick set "This Month"
    window.setThisMonth = function() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (dateStart) dateStart.value = start.toISOString().split("T")[0];
        if (dateEnd) dateEnd.value = end.toISOString().split("T")[0];
        generateReports();
    };

    // Export CSV
    window.exportAnalytics = function() {
        if (analyticsData.length === 0) {
            Toast.warning("No data to export");
            return;
        }
        let csv = "Date,New Patients,Appointments,Prescriptions\n";
        analyticsData.forEach(d => {
            csv += `${d.date},${d.newPatients || 0},${d.appointments || 0},${d.prescriptions || 0}\n`;
        });
        Utils.exportToCSV("analytics.csv", ["Date", "New Patients", "Appointments", "Prescriptions"],
            analyticsData.map(d => [d.date, d.newPatients || 0, d.appointments || 0, d.prescriptions || 0]));
    };

    // Initialize
    loadAnalyticsData();
});