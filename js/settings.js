/* =====================================================
   SLOT SETTINGS – settings.js
==================================================== */

// Define on window FIRST so onclick works even if auth redirects
window.saveSlotSettings = async function () {
    const startTime = document.getElementById("sys_startTime")?.value;
    const endTime = document.getElementById("sys_endTime")?.value;
    const slotInterval = parseInt(document.getElementById("sys_slotInterval")?.value);
    const msgEl = document.getElementById("slotSettingsMsg");

    if (!startTime || !endTime || !slotInterval || slotInterval < 1) {
        showSlotMsg(msgEl, "Please fill all fields with valid values.", "error");
        return;
    }
    if (startTime >= endTime) {
        showSlotMsg(msgEl, "Close time must be after open time.", "error");
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/system-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startTime, endTime, slotInterval })
        });
        if (!res.ok) throw new Error("Server error");
        showSlotMsg(msgEl, "✓ Settings saved successfully!", "success");
    } catch (err) {
        console.error("Failed to save slot settings:", err);
        showSlotMsg(msgEl, "Failed to save settings. Is the server running?", "error");
    }
};

window.saveCalendarSettings = async function () {
    const calendarStartTime = document.getElementById("sys_calendarStartTime")?.value;
    const calendarEndTime = document.getElementById("sys_calendarEndTime")?.value;
    const slotInterval = parseInt(document.getElementById("sys_calendarSlotInterval")?.value);
    const msgEl = document.getElementById("calendarSettingsMsg");

    if (!calendarStartTime || !calendarEndTime || isNaN(slotInterval)) {
        showSlotMsg(msgEl, "Please fill all fields with valid numbers.", "error");
        return;
    }

    const payload = { calendarStartTime, calendarEndTime, slotInterval };
    console.log("Saving Calendar Settings Payload:", payload);

    try {
        const res = await fetch("http://localhost:3000/calendar-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Server error");
        showSlotMsg(msgEl, "✓ Calendar display settings saved!", "success");
    } catch (err) {
        console.error("Failed to save calendar settings:", err);
        showSlotMsg(msgEl, "Failed to save settings. Is the server running?", "error");
    }
};

function showSlotMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    el.style.padding = "0.5rem 0.8rem";
    el.style.borderRadius = "6px";
    el.style.fontSize = "0.875rem";
    if (type === "success") {
        el.style.background = "#dcfce7";
        el.style.color = "#166534";
        el.style.border = "1px solid #bbf7d0";
    } else {
        el.style.background = "#fee2e2";
        el.style.color = "#991b1b";
        el.style.border = "1px solid #fecaca";
    }
    setTimeout(() => { el.style.display = "none"; }, 4000);
}

// Auth check + load saved values once DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
    if (window.APP && APP.ensureAuth) APP.ensureAuth();

    try {
        const resSettings = await fetch("http://localhost:3000/system-settings");
        if (resSettings.ok) {
            const data = await resSettings.json();
            const st = document.getElementById("sys_startTime");
            const et = document.getElementById("sys_endTime");
            const iv = document.getElementById("sys_slotInterval");
            if (st) st.value = data.startTime || "09:00";
            if (et) et.value = data.endTime || "20:00";
            if (iv) iv.value = data.slotInterval || 30;
        }

        const resCal = await fetch(`http://localhost:3000/calendar-settings?t=${Date.now()}`);
        if (resCal.ok) {
            const calData = await resCal.json();
            const cst = document.getElementById("sys_calendarStartTime");
            const cet = document.getElementById("sys_calendarEndTime");
            const civ = document.getElementById("sys_calendarSlotInterval");
            if (cst) cst.value = calData.calendarStartTime || "08:00";
            if (cet) cet.value = calData.calendarEndTime || "20:00";
            if (civ) civ.value = calData.slotInterval || 30;
        }

        // Quick Count for Staff Management
        const resUsers = await fetch("http://localhost:3000/users");
        if (resUsers.ok) {
            const users = await resUsers.json();
            const countEl = document.getElementById("admin_userCount");
            if (countEl) countEl.textContent = users.length;
        }
    } catch (err) {
        console.warn("Could not load settings data:", err.message);
    }

    if (document.getElementById("doctorHoursList")) {
        loadDoctorHours();
    }
});

/* =====================================================
   DOCTOR VISITING HOURS SETTINGS
==================================================== */

window.loadedDoctors = [];

async function loadDoctorHours() {
    const listEl = document.getElementById("doctorHoursList");
    if (!listEl) return;

    listEl.innerHTML = "<p>Loading doctors...</p>";

    try {
        const res = await fetch("http://localhost:3000/staff");
        if (!res.ok) throw new Error("Failed to load staff");
        const staff = await res.json();

        window.loadedDoctors = staff.filter(s => s.role === "Doctor");

        if (window.loadedDoctors.length === 0) {
            listEl.innerHTML = "<p>No doctors found in the system.</p>";
            return;
        }

        listEl.innerHTML = "";

        window.loadedDoctors.forEach(doc => {
            const card = document.createElement("div");
            card.className = "doctor-row-card";

            card.innerHTML = `
                <div class="doctor-name">
                    ${doc.name}
                </div>
                <div class="doctor-times-list">
                    <div class="time-input-group">
                        <label>Start</label>
                        <input type="time" id="doc_start_${doc._id}" class="form-control" value="${doc.visitingHours?.startTime || '09:00'}">
                    </div>
                    <div class="time-input-group">
                        <label>End</label>
                        <input type="time" id="doc_end_${doc._id}" class="form-control" value="${doc.visitingHours?.endTime || '20:00'}">
                    </div>
                </div>
                <div style="text-align: right;">
                    <button class="btn btn-primary btn-sm" onclick="saveDoctorHour('${doc._id}', '${doc.name}')" style="width: 120px;">
                        💾 Save Hour
                    </button>
                    <div id="msg_${doc._id}" style="display:none; font-size:0.75rem; margin-top:0.3rem;"></div>
                </div>
            `;
            listEl.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading doctors:", err);
        listEl.innerHTML = "<p>Error loading doctors.</p>";
    }
}

window.saveDoctorHour = async function (docId, docName) {
    const startEl = document.getElementById(`doc_start_${docId}`);
    const endEl = document.getElementById(`doc_end_${docId}`);
    const msgEl = document.getElementById(`msg_${docId}`);

    if (!startEl || !endEl) return;

    const startTime = startEl.value;
    const endTime = endEl.value;

    if (startTime >= endTime) {
        showSlotMsg(msgEl, "Close time must be after open time.", "error");
        return;
    }

    try {
        // Exclude _id to prevent Mongoose immutable field error
        const doc = window.loadedDoctors.find(d => d._id === docId);
        const { _id, ...rest } = doc;

        const payload = {
            ...rest,
            visitingHours: { startTime, endTime }
        };

        const updateRes = await fetch(`http://localhost:3000/staff/${docId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!updateRes.ok) throw new Error("Server error");

        showSlotMsg(msgEl, "✓ Saved!", "success");
    } catch (err) {
        console.error("Failed to update doctor:", err);
        showSlotMsg(msgEl, "Failed to save.", "error");
    }
};

