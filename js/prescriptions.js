// ====== prescriptions.js — Connected to MongoDB via REST API ======

// In-memory state (loaded from API on page load)
let prescriptions = [];
let patients = [];
let doctors = [];
let editingRx = null;
let currentPatientId = null;

// Get patient ID from URL
function getPatientId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}



// ====== Load Data from API ======
async function loadData() {
    try {
        const patientId = getPatientId();

        if (patientId) {
            // Load specific patient data
            const res = await fetch(`http://localhost:3000/patients/${patientId}`);
            const patient = await res.json();
            patients = [patient];
            currentPatientId = patientId;

            // Load prescriptions for this specific patient
            const rxRes = await fetch(`http://localhost:3000/prescriptions/patient/${patientId}`);
            prescriptions = await rxRes.json();
        } else {
            // Load all patients for dropdown (admin view)
            const pRes = await fetch("http://localhost:3000/patients");
            patients = await pRes.json();

            // Load all prescriptions (admin view)
            const rRes = await fetch("http://localhost:3000/prescriptions");
            prescriptions = await rRes.json();
        }

        // Load doctors for dropdown
        const dRes = await fetch("http://localhost:3000/staff");
        doctors = await dRes.json();

        populatePatientDropdown();
        populateDoctorDropdown();
        renderRxTable();
    } catch (err) {
        console.error("Failed to load prescription data:", err);
    }
}

// ====== Populate Dropdowns ======
function populatePatientDropdown() {
    const sel = document.getElementById("rx_patientId");
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Patient...</option>';
    patients.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.patientId || p._id;
        opt.textContent = `${p.firstName} ${p.lastName} (${Utils.formatPatientId(p.patientId || p._id)})`;
        sel.appendChild(opt);
    });
}

function populateDoctorDropdown() {
    const sel = document.getElementById("rx_doctor");
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Doctor...</option>';
    doctors.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.staffId || d._id;
        opt.textContent = d.name;
        sel.appendChild(opt);
    });
}

// ====== Render Prescriptions Table ======
function renderRxTable(data) {
    const list = data || prescriptions;
    const tbody = document.querySelector("#rxTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    list.forEach(rx => {
        const patientName = getPatientName(rx.patientId);
        const doctorName = getDoctorName(rx.staffId);
        const rxDate = (rx.date && rx.date.includes('T')) ? rx.date.split('T')[0] : (rx.date || "");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${rxDate}</td>
            <td>${rx.Rx_id || "Rx---"}</td>
            <td>${patientName}</td>
            <td>${doctorName}</td>
            <td>${rx.diagnosis || "-"}</td>
            <td><span class="badge badge-${rx.status === 'locked' ? 'success' : 'warning'}">${rx.status || "draft"}</span></td>
            <td>
                ${rx.status !== "locked" ? `<button class="btn btn-sm" onclick="editRx('${rx._id}')">Edit</button>` : ""}
                <button class="btn btn-sm" onclick="printRx('${rx._id}')">Print</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRx('${rx._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getPatientName(patientId) {
    const p = patients.find(p => (p.patientId || p._id) === patientId);
    return p ? `${p.firstName} ${p.lastName}` : (patientId || "-");
}

function getDoctorName(staffId) {
    const d = doctors.find(d => (d.staffId || d._id) === staffId);
    return d ? d.name : (staffId || "-");
}

// ====== Filter Prescriptions ======
window.filterRx = function () {
    const type = document.getElementById("searchTypeRx").value;
    const query = (document.getElementById("searchRx").value || "").toLowerCase();
    const filtered = prescriptions.filter(rx => {
        const name = getPatientName(rx.patientId).toLowerCase();
        const id = (rx.Rx_id || rx._id || "").toLowerCase();
        const date = (rx.date || "").toLowerCase();
        const diagnosis = (rx.diagnosis || "").toLowerCase();
        if (type === "all") return id.includes(query) || name.includes(query) || date.includes(query) || diagnosis.includes(query);
        if (type === "id") return id.includes(query);
        if (type === "name") return name.includes(query);
        if (type === "date") return date.includes(query);
        if (type === "diagnosis") return diagnosis.includes(query);
        return true;
    });
    renderRxTable(filtered);
};

window.openNewRxModal = function () {
    editingRx = null;
    const form = document.getElementById("rxInitForm");
    if (form) form.reset();
    addMedicineRow();
    
    // Set default date to today
    const dateInput = document.getElementById("rx_date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Auto-select patient if in patient profile
    const patientId = getPatientId();
    if (form && form.rx_patientId) {
        if (patientId) {
            form.rx_patientId.value = patientId;
            form.rx_patientId.disabled = true;
        } else {
            form.rx_patientId.disabled = false;
        }
    }

    Modal.open("prescriptionModal");
};

// ====== Add Medicine Row ======
window.addMedicineRow = function (med = {}) {
    const container = document.getElementById("medicinesContainer");
    if (!container) return;
    const row = document.createElement("div");
    row.classList.add("form-row", "medicine-row");
    row.innerHTML = `
        <div class="form-group">
            <input type="text" placeholder="Medicine Name" class="form-control med-name" value="${med.name || ""}" required>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Dosage" class="form-control med-dosage" value="${med.dosage || ""}" required>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Frequency" class="form-control med-frequency" value="${med.frequency || ""}" required>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Duration" class="form-control med-duration" value="${med.duration || ""}" required>
        </div>
        <div class="form-group" style="display:flex; gap:0.25rem;">
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteMedicineRow(this)">Remove</button>
        </div>
    `;
    container.appendChild(row);
};

window.deleteMedicineRow = function (btn) { btn.closest(".medicine-row").remove(); };

// ====== Save Prescription ======
window.saveRx = async function (status) {
    const form = document.getElementById("rxInitForm");
    const patientId = form.rx_patientId.value;
    const staffId = form.rx_doctor.value;
    const date = form.rx_date.value;
    const diagnosis = form.rx_diagnosis.value;
    const allergies = form.rx_allergies ? form.rx_allergies.value : "";
    const medications = Array.from(document.querySelectorAll(".medicine-row")).map(row => ({
        name: row.querySelector(".med-name").value,
        dosage: row.querySelector(".med-dosage").value,
        frequency: row.querySelector(".med-frequency").value,
        duration: row.querySelector(".med-duration").value
    }));

    if (!patientId || !staffId || !date || medications.length === 0) {
        Toast.error("Please fill all required fields and add at least one medicine.");
        return;
    }

    const rxData = { patientId, staffId, date, diagnosis, allergies, medications, status };

    try {
        if (editingRx) {
            await fetch(`http://localhost:3000/prescriptions/${editingRx._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rxData)
            });
        } else {
            await fetch("http://localhost:3000/prescriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rxData)
            });
        }
        await loadData();
        Modal.close("prescriptionModal");
        if (status === "locked") {
            const rx = prescriptions[prescriptions.length - 1];
            if (rx) printRx(rx._id);
        }
    } catch (err) {
        console.error("Failed to save prescription:", err);
        Toast.error("Failed to save prescription.");
    }
};

// ====== Edit Prescription ======
window.editRx = function (rxId) {
    const rx = prescriptions.find(r => r._id === rxId);
    if (!rx || rx.status === "locked") return;
    editingRx = rx;
    const form = document.getElementById("rxInitForm");
    form.rx_patientId.value = rx.patientId;
    form.rx_doctor.value = rx.staffId;
    form.rx_date.value = rx.date;
    form.rx_diagnosis.value = rx.diagnosis || "";
    if (form.rx_allergies) form.rx_allergies.value = rx.allergies || "";
    const container = document.getElementById("medicinesContainer");
    container.innerHTML = "";
    (rx.medications || []).forEach(m => addMedicineRow(m));
    Modal.open("prescriptionModal");
};

// ====== Delete Prescription ======
window.deleteRx = async function (rxId) {
    const ok = await Confirm.show("Delete this prescription?");
    if (!ok) return;
    try {
        await fetch(`http://localhost:3000/prescriptions/${rxId}`, { method: "DELETE" });
        await loadData();
    } catch (err) {
        console.error("Failed to delete prescription:", err);
        Toast.error("Failed to delete prescription.");
    }
};

// ====== Print Prescription ======
window.printRx = function (rxId) {
    const rx = prescriptions.find(r => r._id === rxId);
    if (!rx) return;
    const printDiv = document.getElementById("printTemplate");
    if (!printDiv) return;
    printDiv.querySelector("#printHeader").innerHTML = `
        <p><strong>Patient:</strong> ${getPatientName(rx.patientId)} (${Utils.formatPatientId(rx.patientId)})</p>
        <p><strong>Doctor:</strong> ${getDoctorName(rx.staffId)}</p>
        <p><strong>Date:</strong> ${rx.date}</p>
        <p><strong>Diagnosis:</strong> ${rx.diagnosis || "-"}</p>
    `;
    const medsDiv = printDiv.querySelector("#printMedicines");
    medsDiv.innerHTML = (rx.medications || []).map(m =>
        `<p>${m.name} — ${m.dosage}, ${m.frequency}, ${m.duration}</p>`
    ).join("");
    const win = window.open("", "_blank");
    win.document.write(printDiv.innerHTML);
    win.print();
    win.close();
};

// ====== Export CSV ======
window.exportRx = function () {
    if (prescriptions.length === 0) { Toast.warning("No prescriptions to export"); return; }
    const headers = ["Date", "Rx ID", "Patient", "Doctor", "Diagnosis", "Status", "Medicines"];
    const csvRows = [headers.join(",")];
    prescriptions.forEach(rx => {
        const meds = (rx.medications || []).map(m => `${m.name}(${m.dosage},${m.frequency},${m.duration})`).join("|");
        const row = [
            rx.date || "",
            rx.Rx_id || rx._id || "",
            getPatientName(rx.patientId),
            getDoctorName(rx.staffId),
            rx.diagnosis || "",
            rx.status || "draft",
            `"${meds}"`
        ];
        csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prescriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
};

// ====== Initialize (Encounter module is on the same page) ======
document.addEventListener("DOMContentLoaded", () => {
    loadData();

    // Event listener for New Prescription Button (as requested)
    const newRxBtn = document.getElementById("newPrescriptionBtn");
    if (newRxBtn) {
        newRxBtn.addEventListener("click", () => {
            // We can directly call the existing setup function
            window.openNewRxModal();
        });
    }

    // Close modals on backdrop click
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) Modal.close(overlay.id);
        });
    });
});