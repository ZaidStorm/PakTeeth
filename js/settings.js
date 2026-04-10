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

    if (document.getElementById("citiesTableBody")) {
        loadCitiesList();
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

/* =====================================================
   LOCATION (CITY) MANAGEMENT
==================================================== */
let allCities = [];

async function loadCitiesList() {
    const tableBody = document.getElementById("citiesTableBody");
    const countInfo = document.getElementById("cityCountInfo");
    if (!tableBody) return;

    tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Loading cities...</td></tr>";

    try {
        const res = await fetch("http://localhost:3000/cities");
        if (!res.ok) throw new Error("Failed to load cities");
        allCities = await res.json();
        renderCitiesTable(allCities);
    } catch (err) {
        console.error("Error loading cities:", err);
        tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:red;'>Error loading cities.</td></tr>";
    }
}

function renderCitiesTable(cities) {
    const tableBody = document.getElementById("citiesTableBody");
    const countInfo = document.getElementById("cityCountInfo");
    if (!tableBody) return;

    if (cities.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No cities found.</td></tr>";
        countInfo.textContent = "Showing 0 cities";
        return;
    }

    tableBody.innerHTML = cities.map(city => `
        <tr id="city_row_${city._id}">
            <td><input type="text" id="city_name_${city._id}" class="form-control-plain" value="${city.name}" onchange="updateCityInline('${city._id}')" style="background:transparent; border:none; width:100%; padding:4px;"></td>
            <td><input type="text" id="city_prov_${city._id}" class="form-control-plain" value="${city.province || ''}" onchange="updateCityInline('${city._id}')" style="background:transparent; border:none; width:100%; padding:4px; opacity:0.8;"></td>
            <td style="text-align: right;">
                <button class="btn btn-danger btn-sm" onclick="deleteCity('${city._id}')" title="Delete City" style="padding: 4px 8px; font-size: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>
    `).join("");

    countInfo.textContent = `Showing ${cities.length} cities`;
}

window.addNewCity = async function () {
    const nameEl = document.getElementById("newCityName");
    const provEl = document.getElementById("newCityProvince");
    const name = nameEl.value.trim();
    const province = provEl.value.trim();

    if (!name) {
        alert("Please enter a city name.");
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/cities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, province })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to add city");
        }

        nameEl.value = "";
        provEl.value = "";
        await loadCitiesList();
        // Notify other components to refresh datalists
        if (window.CityManager) window.CityManager.refresh();
        document.dispatchEvent(new CustomEvent('cityCollectionUpdated'));
    } catch (err) {
        console.error("Error adding city:", err);
        alert(err.message);
    }
};

window.updateCityInline = async function (id) {
    const name = document.getElementById(`city_name_${id}`).value.trim();
    const province = document.getElementById(`city_prov_${id}`).value.trim();

    if (!name) {
        alert("City name cannot be empty.");
        loadCitiesList(); // Revert
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/cities/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, province })
        });
        if (!res.ok) throw new Error("Failed to update city");

        console.log(`City ${id} updated.`);
        if (window.CityManager) window.CityManager.refresh();
        document.dispatchEvent(new CustomEvent('cityCollectionUpdated'));
    } catch (err) {
        console.error("Error updating city:", err);
        alert("Failed to update city.");
        loadCitiesList(); // Revert
    }
};

window.deleteCity = async function (id) {
    if (!confirm("Are you sure you want to delete this city? This will not affect existing patient records but will remove it from dynamic suggestions.")) return;

    try {
        const res = await fetch(`http://localhost:3000/cities/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete city");

        await loadCitiesList();
        if (window.CityManager) window.CityManager.refresh();
        document.dispatchEvent(new CustomEvent('cityCollectionUpdated'));
    } catch (err) {
        console.error("Error deleting city:", err);
        alert("Failed to delete city.");
    }
};

window.filterCitiesTable = function () {
    const query = document.getElementById("cityListSearch").value.toLowerCase();
    if (!query) {
        renderCitiesTable(allCities);
        return;
    }
    const filtered = allCities.filter(c =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.province && c.province.toLowerCase().includes(query))
    );
    renderCitiesTable(filtered);
};
