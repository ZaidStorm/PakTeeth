// =======================
// Doctor & Staff Management Script
// =======================

let staffData = [];
let staffGridContainer = null;

// =======================
// Load staff data from API
// =======================
async function loadStaff() {
    try {
        const res = await fetch("http://localhost:3000/staff");
        staffData = await res.json();
        renderStaffTable();
    } catch (err) {
        console.error("Failed to load staff:", err);
        Toast.error("Failed to load staff data. Please check your server.");
    }
}

// =======================
// Render staff table
// =======================
function formatTo12Hour(time) {
    if (!time) return "";
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}

function renderStaffTable() {
    if (!staffGridContainer) return;
    staffGridContainer.innerHTML = "";

    // Sort staff to keep Developers at the very bottom
    const sortedStaff = [...staffData].sort((a, b) => {
        const isADev = a.role === "Developer" || a.role === "Software Developer";
        const isBDev = b.role === "Developer" || b.role === "Software Developer";
        if (isADev && !isBDev) return 1;
        if (!isADev && isBDev) return -1;
        return 0;
    });

    sortedStaff.forEach(staff => {
        const isDeveloper = staff.role === "Developer" || staff.role === "Software Developer";
        
        const roleDisplay = isDeveloper
            ? `<span class="role-badge role-nominated">${staff.role}</span>`
            : staff.role;

        const card = document.createElement("div");
        card.className = "patient-grid-item card staff-card";
        if (isDeveloper) card.classList.add("row-nominated");

        const actionButtons = isDeveloper
            ? `<span class="badge" style="color:#888; font-style:italic;">Protected</span>`
            : `<button class="btn btn-sm btn-primary" onclick="editStaff('${staff._id}')">Edit</button>
               <button class="btn btn-sm btn-danger" onclick="deleteStaff('${staff._id}')">Delete</button>`;

        let vhDisplay = "";
        if (staff.role === "Doctor" && staff.visitingHours) {
            const st = staff.visitingHours.startTime || "09:00";
            const et = staff.visitingHours.endTime || "20:00";
            vhDisplay = `<div class="meta-row"><span class="meta-label">Hours:</span> ${formatTo12Hour(st)} - ${formatTo12Hour(et)}</div>`;
        }

        let feeDisplay = "";
        if (staff.role === "Doctor") {
            const fee = staff.appointmentFees || 0;
            feeDisplay = `<div class="meta-row"><span class="meta-label">Fees:</span> <span style="color:var(--primary); font-weight:700;">${fee} PKR</span></div>`;
        }

        card.innerHTML = `
            <div class="patient-info">
                <strong>${staff.name}</strong>
                <div class="patient-meta">
                    <div class="meta-row"><span class="meta-label">Role:</span> ${roleDisplay}</div>
                    <div class="meta-row"><span class="meta-label">Staff ID:</span> ${staff.staffId}</div>
                    ${feeDisplay}
                    <div class="meta-row"><span class="meta-label">Phone:</span> ${staff.phone}</div>
                    ${vhDisplay}
                    <div class="meta-row"><span class="meta-label">Note:</span> ${staff.spec || "-"}</div>
                </div>
            </div>
            <div class="patient-actions" style="margin-top: 15px;">
                ${actionButtons}
            </div>
        `;
        staffGridContainer.appendChild(card);
    });

    filterStaff();
}

// =======================
// Save staff (add/update)
// =======================
async function saveStaff() {
    const id = document.getElementById("staff_id").value || null;
    const name = document.getElementById("staff_name").value.trim();
    const role = document.getElementById("staff_role").value;
    const phone = document.getElementById("staff_phone").value.trim();
    const email = document.getElementById("staff_email").value.trim();
    const spec = document.getElementById("staff_spec").value.trim();
    const appointmentFees = parseFloat(document.getElementById("staff_fees").value) || 0;

    if (!name || !role || !phone) {
        Toast.error("Please fill all required fields.");
        return;
    }

    try {
        if (id) {
            await fetch(`http://localhost:3000/staff/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, role, phone, email, spec, appointmentFees })
            });
        } else {
            // Add new staff
            await fetch("http://localhost:3000/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, role, phone, email, spec, appointmentFees })
            });
        }

        loadStaff(); // Reload table
        Modal.close("staffModal"); // Close modal
    } catch (err) {
        console.error("Failed to save staff:", err);
        Toast.error("Failed to save staff. Check your server.");
    }
}

// =======================
// Edit staff
// =======================
function editStaff(id) {
    const staff = staffData.find(s => s._id === id);
    if (!staff) return;

    document.getElementById("staff_id").value = staff._id;
    document.getElementById("staffModalTitle").textContent = `Edit Staff Member - ${staff.staffId}`;
    document.getElementById("staff_name").value = staff.name;
    document.getElementById("staff_role").value = staff.role;
    document.getElementById("staff_phone").value = staff.phone;
    document.getElementById("staff_email").value = staff.email || "";
    document.getElementById("staff_spec").value = staff.spec || "";
    document.getElementById("staff_fees").value = staff.appointmentFees || 0;

    Modal.open("staffModal");
}

// =======================
// Delete staff
// =======================
async function deleteStaff(id) {
    const ok = await Confirm.show("Are you sure you want to delete this staff member?");
    if (!ok) return;
    try {
        await fetch(`http://localhost:3000/staff/${id}`, { method: "DELETE" });
        loadStaff();
    } catch (err) {
        console.error("Failed to delete staff:", err);
        Toast.error("Failed to delete staff.");
    }
}

// =======================
// Filter staff table
// =======================
function filterStaff() {
    if (!staffGridContainer) return;
    
    const searchType = document.getElementById("searchTypeStaff").value;
    const searchValue = document.getElementById("searchStaff").value.toLowerCase();
    const roleFilter = document.getElementById("filterRole").value;

    Array.from(staffGridContainer.children).forEach(card => {
        if (card.classList.contains('no-results')) return;

        // Extract text content from the card to filter
        const name = card.querySelector('strong')?.textContent.toLowerCase() || "";
        const metaText = card.querySelector('.patient-meta')?.textContent || "";
        
        // Find role from meta
        const roleRow = Array.from(card.querySelectorAll('.meta-row')).find(row => row.textContent.includes('Role:'));
        const staffRole = roleRow ? roleRow.textContent.replace('Role:', '').trim() : "";
        
        // Find ID from meta
        const idRow = Array.from(card.querySelectorAll('.meta-row')).find(row => row.textContent.includes('Staff ID:'));
        const staffId = idRow ? idRow.textContent.replace('Staff ID:', '').trim() : "";

        let visible = true;

        if (roleFilter && staffRole !== roleFilter) visible = false;

        if (visible && searchValue) {
            if (searchType === "all") {
                visible = name.includes(searchValue) || staffId.includes(searchValue) || staffRole.toLowerCase().includes(searchValue);
            } else if (searchType === "name") {
                visible = name.includes(searchValue);
            } else if (searchType === "id") {
                visible = staffId.includes(searchValue);
            }
        }
        card.style.display = visible ? "" : "none";
    });
    
    // Show "No Results" if all cards are hidden
    const visibleCards = Array.from(staffGridContainer.children).filter(c => c.style.display !== "none" && !c.classList.contains('no-results'));
    const existingMsg = staffGridContainer.querySelector('.no-results');
    
    if (visibleCards.length === 0) {
        if (!existingMsg) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.style.width = '100%';
            msg.style.textAlign = 'center';
            msg.style.padding = '20px';
            msg.textContent = 'No matching staff found';
            staffGridContainer.appendChild(msg);
        }
    } else {
        if (existingMsg) existingMsg.remove();
    }
}

// =======================
// Export staff CSV
// =======================
function exportStaff() {
    if (!staffData.length) {
        Toast.warning("No staff data to export!");
        return;
    }
    const csvRows = [["Staff ID", "Name", "Role", "Phone", "Email", "Specialization/Notes"]];
    staffData.forEach(s => {
        csvRows.push([s.staffId, s.name, s.role, s.phone, s.email, s.spec]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "staff_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =======================
// Refresh staff table
// =======================
function refreshStaff() {
    loadStaff();
}

// =======================
// Open staff modal
// =======================
function openStaffModal() {
    document.getElementById("staffForm").reset();
    document.getElementById("staff_id").value = "";
    document.getElementById("staff_fees").value = "0";
    document.getElementById("staffModalTitle").textContent = "Add Staff Member";
    Modal.open("staffModal");
}

// =======================
// Modal object is already defined in core.js
// =======================

// =======================
// DOMContentLoaded
// =======================
document.addEventListener("DOMContentLoaded", () => {
    staffGridContainer = document.getElementById("staffGridContainer");

    // Modal close buttons
    document.querySelectorAll(".modal-close, .modal-close-btn").forEach(btn => {
        btn.addEventListener("click", () => Modal.close("staffModal"));
    });

    window.saveStaff = saveStaff;
    window.editStaff = editStaff;
    window.deleteStaff = deleteStaff;
    window.filterStaff = filterStaff;
    window.exportStaff = exportStaff;
    window.openStaffModal = openStaffModal;
    window.refreshStaff = refreshStaff;
    window.Modal = Modal;

    loadStaff();
});