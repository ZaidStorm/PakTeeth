document.addEventListener("DOMContentLoaded", () => {
    let patientsFinancials = [];
    let appointmentsData = [];
    let patientsList = [];

    // Load data from API
    async function loadCapitalData() {
        try {
            const [invoices, patients, appointments] = await Promise.all([
                APP.api.get("/invoices"),
                APP.api.get("/patients"),
                APP.api.get("/appointments")
            ]);

            patientsList = patients;
            appointmentsData = appointments || [];

            // Group invoices by patient (Existing Logic)
            const patientData = {};
            const idMap = {}; // Maps custom patientId to Mongo _id

            patients.forEach(p => {
                const mongoId = p._id;
                const customId = p.patientId;
                
                patientData[mongoId] = {
                    name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
                    treatments: 0,
                    billed: 0,
                    discount: 0,
                    paid: 0,
                    usedCredit: 0,
                    extra: 0
                };

                if (customId) {
                    idMap[customId] = mongoId;
                }
            });

            invoices.forEach(inv => {
                let pId = inv.patientId;
                
                if (pId && idMap[pId]) {
                    pId = idMap[pId];
                }

                if (pId && patientData[pId]) {
                    patientData[pId].treatments += inv.services?.length || 1;
                    patientData[pId].billed += inv.total || inv.totalAmount || 0;
                    patientData[pId].discount += inv.discount || 0;
                    patientData[pId].paid += inv.paid || 0;
                    patientData[pId].usedCredit += inv.usedCredit || 0;
                    patientData[pId].extra += inv.credit || 0;
                }
            });

            patientsFinancials = Object.values(patientData).filter(p => p.billed > 0);

            updateSummary();
            renderTable();
            
            // Appointment Capital Logic
            renderAppointmentCapital();
        } catch (err) {
            console.error("Failed to load capital data:", err);
        }
    }

    const tableBody = document.querySelector("#capitalTable tbody");
    const searchInput = document.getElementById("searchInput");

    // Summary Calc
    function updateSummary() {
        const totalPaid = patientsFinancials.reduce((acc, p) => acc + p.paid, 0);
        const totalBilled = patientsFinancials.reduce((acc, p) => acc + (p.billed - p.discount), 0);
        const totalUsed = patientsFinancials.reduce((acc, p) => acc + p.usedCredit, 0);
        const totalExtra = patientsFinancials.reduce((acc, p) => acc + (p.extra - p.usedCredit), 0);
        const totalPending = totalBilled - (totalPaid + totalUsed);

        const valCollected = document.getElementById("valCollected");
        const valPending = document.getElementById("valPending");
        const valExtra = document.getElementById("valExtra");

        if (valCollected) valCollected.textContent = totalPaid.toLocaleString();
        if (valPending) valPending.textContent = Math.max(0, totalPending).toLocaleString();
        if (valExtra) valExtra.textContent = Math.max(0, totalExtra).toLocaleString();
    }

    // Render Table
    function renderTable() {
        if (!tableBody) return;
        const filter = searchInput?.value.toLowerCase() || '';
        tableBody.innerHTML = "";

        const filtered = patientsFinancials.filter(p => p.name.toLowerCase().includes(filter));

        filtered.forEach(p => {
            const netPayable = p.billed - p.discount;
            const outstanding = netPayable - (p.paid + p.usedCredit);
            const currentExtra = p.extra - p.usedCredit;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.name}</td>
                <td>${p.treatments}</td>
                <td>${p.billed.toLocaleString()}</td>
                <td>${p.discount.toLocaleString()}</td>
                <td>${netPayable.toLocaleString()}</td>
                <td>${p.paid.toLocaleString()}</td>
                <td>${p.usedCredit.toLocaleString()}</td>
                <td>${Math.max(0, outstanding).toLocaleString()}</td>
                <td>${Math.max(0, currentExtra).toLocaleString()}</td>
            `;
            tableBody.appendChild(tr);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">No data found</td></tr>';
        }
    }

    // Appointment Capital Logic
    function renderAppointmentCapital() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Helper to get start of week
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
            today: { count: 0, amount: 0 },
            weekly: { count: 0, amount: 0 },
            monthly: { count: 0, amount: 0 }
        };

        const apptTableBody = document.querySelector("#appointmentCapitalTable tbody");
        if (!apptTableBody) return;

        // Process all appointments
        const validVisitRecords = appointmentsData.map(appt => {
            const apptDate = new Date(appt.date);
            const isToday = appt.date === todayStr;
            const isThisWeek = apptDate >= startOfWeek;
            const isThisMonth = apptDate >= startOfMonth;

            const amountPaid = parseFloat(appt.invoice?.paid) || 0;

            if (isToday) {
                stats.today.count++;
                stats.today.amount += amountPaid;
            }
            if (isThisWeek) {
                stats.weekly.count++;
                stats.weekly.amount += amountPaid;
            }
            if (isThisMonth) {
                stats.monthly.count++;
                stats.monthly.amount += amountPaid;
            }

            return {
                ...appt,
                amountPaid,
                patientName: appt.patientName || (appt.patientId?.firstName ? `${appt.patientId.firstName} ${appt.patientId.lastName}` : (patientsList.find(p => p.patientId === appt.patientId)?.firstName ? `${patientsList.find(p => p.patientId === appt.patientId).firstName} ${patientsList.find(p => p.patientId === appt.patientId).lastName}` : 'Unknown'))
            };
        }).filter(a => a.amountPaid > 0);

        // Update Summary Cards
        document.getElementById("valAptToday").textContent = stats.today.count;
        document.getElementById("valAptTodayAmount").textContent = `Rs ${stats.today.amount.toLocaleString()} from ${stats.today.count} visits`;
        
        document.getElementById("valAptWeekly").textContent = stats.weekly.count;
        document.getElementById("valAptWeeklyAmount").textContent = `Rs ${stats.weekly.amount.toLocaleString()} from ${stats.weekly.count} visits`;
        
        document.getElementById("valAptMonthly").textContent = stats.monthly.count;
        document.getElementById("valAptMonthlyAmount").textContent = `Rs ${stats.monthly.amount.toLocaleString()} from ${stats.monthly.count} visits`;

        // Render Visit Table
        window.renderApptTable = (filter = "") => {
            apptTableBody.innerHTML = "";
            const filtered = validVisitRecords.filter(a => 
                a.patientName.toLowerCase().includes(filter.toLowerCase()) || 
                (a.dentist || '').toLowerCase().includes(filter.toLowerCase())
            );

            filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(a => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${a.date}</td>
                    <td>${a.patientId?.patientId || a.patientId}</td>
                    <td>${a.patientName}</td>
                    <td>${a.dentist || 'N/A'}</td>
                    <td>${a.type || 'N/A'}</td>
                    <td style="font-weight: 600; color: #059669;">Rs ${a.amountPaid.toLocaleString()}</td>
                `;
                apptTableBody.appendChild(tr);
            });

            if (filtered.length === 0) {
                apptTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No visit records with payments found</td></tr>';
            }
        };

        window.renderApptTable();
    }

    // Init
    loadCapitalData();

    // Search Listeners
    if (searchInput) {
        searchInput.addEventListener("input", renderTable);
    }
    
    const apptSearchInput = document.getElementById("apptSearchInput");
    if (apptSearchInput) {
        apptSearchInput.addEventListener("input", (e) => {
            if (window.renderApptTable) window.renderApptTable(e.target.value);
        });
    }
});