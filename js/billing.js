// ====== billing.js — Connected to MongoDB via REST API ======

// In-memory state (loaded from API on page load)
let invoices = [];
let patients = [];
let doctors = [];
let currentPatientId = null;

// Get patient ID from URL
function getPatientId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}



// ====== Load Patients into Dropdown ======
async function loadPatients() {
    try {
        const patientId = getPatientId();

        if (patientId) {
            // Load specific patient data
            const res = await fetch(`http://localhost:3000/patients/${patientId}`);
            const patient = await res.json();
            patients = [patient];
            currentPatientId = patientId;
        } else {
            // Load all patients for dropdown (admin view)
            const res = await fetch("http://localhost:3000/patients");
            patients = await res.json();
        }

        const select = document.getElementById("inv_patient");
        if (!select) return;
        select.innerHTML = '<option value="">Select Patient...</option>';
        patients.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.patientId || p._id;
            opt.textContent = `${p.firstName} ${p.lastName} (${p.patientId || p._id})`;
            select.appendChild(opt);
        });

        if (patientId) {
            select.value = patientId;
            select.disabled = true;
            select.dispatchEvent(new Event('change'));
        } else {
            select.disabled = false;
        }
    } catch (err) {
        console.error("Failed to load patients:", err);
    }
}

// ====== Load Doctors into Dropdown ======
async function loadDoctors() {
    try {
        const res = await fetch("http://localhost:3000/staff");
        const staff = await res.json();
        // Filter only doctors
        doctors = staff.filter(s => s.role && s.role.toLowerCase().includes("doctor"));

        const select = document.getElementById("inv_doctor");
        if (!select) return;
        select.innerHTML = '<option value="">Select Doctor...</option>';
        doctors.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.staffId || d._id;
            opt.textContent = d.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to load doctors:", err);
    }
}

// ====== Load Invoices from API ======
async function loadInvoices() {
    try {
        const patientId = getPatientId();
        let res;

        if (patientId) {
            // Load invoices for specific patient
            res = await fetch(`http://localhost:3000/invoices/patient/${patientId}`);
        } else {
            // Load all invoices (admin view)
            res = await fetch("http://localhost:3000/invoices");
        }

        invoices = await res.json();
        renderInvoices();
        updateFinancialOverview();
    } catch (err) {
        console.error("Failed to load invoices:", err);
    }
}

// ====== Open Invoice Modal ======
function openNewInvoiceModal() {
    document.getElementById("invoiceForm").reset();
    document.getElementById("inv_balance_label").textContent = "0";
    document.getElementById("inv_available_credit").value = "0";
    document.getElementById("inv_credit").value = "0";
    loadPatients();
    loadDoctors();
    
    // Set default date to today
    const dateInput = document.getElementById("inv_date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    Modal.open("newInvoiceModal");
}

// ====== Calculate Balance ======
function calcBalance() {
    const amount = parseFloat(document.getElementById("inv_amount").value) || 0;
    const discount = parseFloat(document.getElementById("inv_discount").value) || 0;
    const paid = parseFloat(document.getElementById("inv_paid").value) || 0;
    const availableCredit = parseFloat(document.getElementById("inv_available_credit").value) || 0;

    // Total owed after discounts and applied credit
    const subtotal = amount - discount - availableCredit;

    // Balance to pay (or new overpay credit)
    const rawBalance = subtotal - paid;
    const balance = Math.max(0, rawBalance);

    document.getElementById("inv_balance_label").textContent = balance.toFixed(2);

    let generatedCredit = 0;
    if (paid > subtotal) {
        generatedCredit = paid - subtotal;
        document.getElementById("inv_credit").value = generatedCredit.toFixed(2);
        document.getElementById("inv_balance_label").textContent = "0.00 (Generated Credit: " + generatedCredit.toFixed(2) + ")";

        // UI Feedback for overpayment
        if (typeof showToast === "function") {
            // Optional: debounce or only show once
        }
    } else {
        document.getElementById("inv_credit").value = "0";
    }

    // Dynamic Status Update
    const status = (balance <= 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

    return { paid, credit: parseFloat(generatedCredit.toFixed(2)), balance: parseFloat(balance.toFixed(2)), status };
}

// ====== Patient Selection Change Event ======
// This calculates the total credit available for a patient when they are selected.
document.addEventListener("DOMContentLoaded", () => {
    const patientSelect = document.getElementById("inv_patient");
    if (patientSelect) {
        patientSelect.addEventListener("change", (e) => {
            const patientId = e.target.value; // Define patientId from event
            if (!patientId) {
                const availableEl = document.getElementById("inv_available_credit");
                if (availableEl) availableEl.value = "0";
                calcBalance();
                return;
            }

            let totalCred = 0;
            let totalUsed = 0;

            invoices.forEach(inv => {
                if (inv.patientId === patientId) {
                    totalCred += (parseFloat(inv.credit) || 0);
                    totalUsed += (parseFloat(inv.usedCredit) || 0);
                }
            });

            const available = Math.max(0, totalCred - totalUsed);
            const availableEl = document.getElementById("inv_available_credit");
            if (availableEl) {
                availableEl.value = available.toFixed(2);
                // Trigger calculation to update balance with newly applied credit
                calcBalance();
            }
        });
    }
});

// ====== Save Invoice ======
async function saveInvoice() {
    const { paid, credit, balance, status } = calcBalance(); // Capture status
    const patientValue = document.getElementById("inv_patient").value;
    const patientObj = patients.find(p => (p.patientId || p._id) === patientValue);

    const doctorValue = document.getElementById("inv_doctor").value;
    const doctorObj = doctors.find(d => (d.staffId || d._id) === doctorValue);

    const availableCredit = parseFloat(document.getElementById("inv_available_credit").value) || 0;

    const invoice = {
        date: document.getElementById("inv_date").value,
        patientId: patientValue,
        patientName: patientObj ? `${patientObj.firstName} ${patientObj.lastName}` : patientValue,
        doctorId: doctorValue,
        doctorName: doctorObj ? doctorObj.name : doctorValue,
        services: document.getElementById("inv_services").value.split(",").map(s => s.trim()),
        totalAmount: parseFloat(document.getElementById("inv_amount").value) || 0,
        discount: parseFloat(document.getElementById("inv_discount").value) || 0,
        paid,
        credit,
        usedCredit: availableCredit,
        balance,
        status
    };

    if (!invoice.date || !invoice.patientId) {
        Toast.error("Please fill in all required fields (Patient and Date).");
        return;
    }

    // Attempt to clear out the used availableCredit if it was consumed. Since credits are sum of past invoices, this logic assumes we just record the invoice correctly.
    // In a fuller implementation, we'd deduct the master Patient DB record. For now, tracking generated invoice Credit is sufficient map.

    try {
        const res = await fetch("http://localhost:3000/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoice)
        });
        if (!res.ok) throw new Error("Server error");
        await loadInvoices();
        Modal.close("newInvoiceModal");
    } catch (err) {
        console.error("Failed to save invoice:", err);
        Toast.error("Failed to save invoice. Please try again.");
    }
}

// ====== Render Invoices Table ======
function renderInvoices(data) {
    const list = data || invoices;
    const tbody = document.querySelector("#invoiceTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    list.forEach(inv => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${inv.date || ""}</td>
            <td>${inv.invoiceNumber || inv._id || ""}</td>
            <td>${inv.patientName || inv.patientId || ""}</td>
            <td>${inv.doctorName || "N/A"}</td>
            <td>${(inv.totalAmount || 0).toFixed(2)}</td>
            <td>${(inv.discount || 0).toFixed(2)}</td>
            <td>${(inv.paid || 0).toFixed(2)}</td>
            <td>${(inv.balance || 0).toFixed(2)}</td>
            <td>${(inv.credit || 0).toFixed(2)}</td>
            <td><span class="badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}">${inv.status || "Pending"}</span></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    ${inv.status !== 'Paid' ? `<button class="btn btn-sm btn-success" onclick="openPaymentModal('${inv._id}')">Pay</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteInvoice('${inv._id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ====== Delete Invoice ======
async function deleteInvoice(id) {
    const ok = await Confirm.show("Are you sure you want to delete this invoice?");
    if (!ok) return;
    try {
        const res = await fetch(`http://localhost:3000/invoices/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete invoice");
        await loadInvoices();
    } catch (err) {
        console.error("Delete failed:", err);
        Toast.error("Failed to delete invoice.");
    }
}

// ====== Filter Invoices ======
function filterInvoices() {
    const type = document.getElementById("searchTypeInvoice").value;
    const keyword = (document.getElementById("searchInvoice").value || "").toLowerCase();
    const statusFilter = document.getElementById("filterStatus").value;

    let filtered = invoices.filter(inv => {
        const id = (inv.invoiceNumber || inv._id || "").toLowerCase();
        const name = (inv.patientName || "").toLowerCase();
        const date = (inv.date || "").toLowerCase();
        let match = true;

        if (type === "id" && !id.includes(keyword)) match = false;
        if (type === "name" && !name.includes(keyword)) match = false;
        if (type === "date" && !date.includes(keyword)) match = false;
        if (type === "all" && !(id.includes(keyword) || name.includes(keyword) || date.includes(keyword))) match = false;
        if (statusFilter && (inv.status || "").toLowerCase() !== statusFilter.toLowerCase()) match = false;

        return match;
    });

    renderInvoices(filtered);
}

// ====== Financial Overview ======
function updateFinancialOverview() {
    const totalRev = invoices.reduce((acc, i) => acc + (parseFloat(i.paid) || 0), 0);
    const totalOut = invoices.reduce((acc, i) => acc + (parseFloat(i.balance) || 0), 0);
    const totalCred = invoices.reduce((acc, i) => acc + ((parseFloat(i.credit) || 0) - (parseFloat(i.usedCredit) || 0)), 0);

    const revEl = document.getElementById("totalRev");
    const outEl = document.getElementById("totalOut");
    const credEl = document.getElementById("totalCredit");

    if (revEl) revEl.textContent = `Rs ${totalRev.toFixed(2)}`;
    if (outEl) outEl.textContent = `Rs ${totalOut.toFixed(2)}`;
    if (credEl) credEl.textContent = `Rs ${totalCred.toFixed(2)}`;
}

// ====== Payment Modal ======
function openPaymentModal(invId) {
    const invoice = invoices.find(i => i._id === invId);
    if (!invoice) { Toast.error("Invoice not found"); return; }
    document.getElementById("pay_inv_id").value = invId;
    document.getElementById("pay_inv_balance").textContent = (invoice.balance || 0).toFixed(2);
    document.getElementById("pay_amount").value = (invoice.balance || 0).toFixed(2);
    Modal.open("recordPaymentModal");
}

// ====== Process Payment ======
async function processPayment() {
    const invId = document.getElementById("pay_inv_id").value;
    const payAmount = parseFloat(document.getElementById("pay_amount").value) || 0;
    const invoice = invoices.find(i => i._id === invId);
    if (!invoice) { Toast.error("Invoice not found"); return; }

    let newPaid = parseFloat(invoice.paid) || 0;
    let newBalance = parseFloat(invoice.balance) || 0;
    let newCredit = parseFloat(invoice.credit) || 0;

    if (payAmount > newBalance) {
        newCredit += payAmount - newBalance;
        newPaid += newBalance;
        newBalance = 0;
    } else {
        newPaid += payAmount;
        newBalance -= payAmount;
    }

    const newStatus = newBalance === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";

    try {
        const res = await fetch(`http://localhost:3000/invoices/${invId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paid: newPaid, balance: newBalance, credit: newCredit, status: newStatus })
        });
        if (!res.ok) throw new Error("Server error");
        await loadInvoices();
        Modal.close("recordPaymentModal");
    } catch (err) {
        console.error("Failed to record payment:", err);
        Toast.error("Failed to record payment. Please try again.");
    }
}

// ====== Export CSV ======
function exportBilling() {
    if (invoices.length === 0) { Toast.warning("No invoices to export"); return; }
    const headers = ["Date", "Invoice #", "Patient", "Total Amount", "Discount", "Paid", "Due Balance", "Credit", "Status"];
    const csvRows = [headers.join(",")];
    invoices.forEach(inv => {
        const row = [
            inv.date || "",
            inv.invoiceNumber || inv._id || "",
            inv.patientName || "",
            (inv.totalAmount || 0).toFixed(2),
            (inv.discount || 0).toFixed(2),
            (inv.paid || 0).toFixed(2),
            (inv.balance || 0).toFixed(2),
            (inv.credit || 0).toFixed(2),
            inv.status || ""
        ];
        csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ====== Initialize ======
document.addEventListener("DOMContentLoaded", () => {
    loadInvoices();
    loadPatients();
    loadDoctors();

    // Event listener for New Invoice Button
    const newInvoiceBtn = document.getElementById("newInvoiceBtn");
    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener("click", () => {
            window.openNewInvoiceModal();
        });
    }

    // Close modals on backdrop click
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) Modal.close(overlay.id);
        });
    });
});