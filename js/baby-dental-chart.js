// ====== baby-dental-chart.js ======
// Baby Teeth Dental Chart + Treatment Flow

// ─── State ────────────────────────────────────────────────────────────────
let babySelectedTeeth = [];
let babySelectedSurface = '';
let babySelectedTreatment = null;
let babyAllTreatments = [];
let babyCurrentTab = 'fav'; // default to 'fav' as requested by user
let babyPendingProcedure = null;

// Baby teeth layout: quadrant → teeth numbers (FDI primary)
const BABY_LAYOUT = {
    q1: [55, 54, 53, 52, 51], // Upper right
    q2: [61, 62, 63, 64, 65], // Upper left
    q4: [85, 84, 83, 82, 81], // Lower right
    q3: [71, 72, 73, 74, 75]  // Lower left
};

// Tooth condition colors
const BABY_CONDITION_COLORS = {
    'Healthy': { bg: '#e8f5e9', border: '#4caf50' },
    'Cavity': { bg: '#ffebee', border: '#f44336' },
    'Filling': { bg: '#e3f2fd', border: '#2196f3' },
    'Extraction': { bg: '#f3e5f5', border: '#9c27b0' },
    'Missing': { bg: '#fafafa', border: '#bdbdbd' }
};

// FDI Primary molars
const BABY_MOLARS = [55, 54, 65, 64, 85, 84, 75, 74];

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    generateBabyChart();
    await loadBabyTreatments();
    switchBabyTreatmentTab(babyCurrentTab); // Ensure buttons and filter match the default 'fav' state

    // Full mouth checkbox
    document.getElementById('fullMouthCheck')?.addEventListener('change', (e) => {
        if (e.target.checked) selectAllBabyTeeth();
        else clearBabySelection();
    });

    // Surface buttons
    document.querySelectorAll('.baby-surface-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = btn.dataset.s;
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                babySelectedSurface = babySelectedSurface.replace(s, '');
            } else {
                btn.classList.add('active');
                babySelectedSurface += s;
            }
        });
    });

    // Global functions
    window.babyOnTreatmentClick = babyOnTreatmentClick;
    window.babyCalcPayable = babyCalcPayable;
    window.babyProceedToDoctor = babyProceedToDoctor;
    window.babyConfirmSaveProcedure = babyConfirmSaveProcedure;
    window.switchBabyTreatmentTab = switchBabyTreatmentTab;
    window.toggleBabyFav = toggleBabyFav;

    const switchBtn = document.querySelector('.dc-chart-topbar button');
    if (switchBtn) {
        switchBtn.onclick = () => {
            window.location.href = `dental-chart.html?id=${currentPatientId}&manual=true`;
        };
    }
});

// ─── Generate Baby Teeth Chart ──────────────────────────────────────────────
function generateBabyChart() {
    Object.entries(BABY_LAYOUT).forEach(([quad, teeth]) => {
        const container = document.getElementById(quad);
        if (!container) return;
        container.innerHTML = '';
        teeth.forEach(num => container.appendChild(createBabyToothEl(num, quad)));
    });
}

function createBabyToothEl(num, quadrant) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tooth-wrapper';

    const tooth = document.createElement('div');
    tooth.className = 'tooth-btn';
    tooth.id = `baby-tooth-${num}`;
    tooth.dataset.tooth = num;

    const isUpper = quadrant === 'q1' || quadrant === 'q2';
    const pos = parseInt(String(num)[1]); // 1-5 inside quadrant

    // Image mapping 1-5 for primary dentition, using adult equivalents
    const toothMap = {
        1: '11 – Central Incisor.png',
        2: '12 – Lateral Incisor.png',
        3: '13 – Canine (Cuspid).png',
        4: '16 – First Molar.png', // Map adult 1st molar to baby 1st molar
        5: '17 – Second Molar.png' // Map adult 2nd molar to baby 2nd molar
    };

    const toothSrc = `../../assets/images/teeth/${toothMap[pos]}`;

    // Transform logic based on user's instruction that base images are for Upper Left (q2)
    let transformCss = '';
    if (quadrant === 'q2') {
        transformCss = ''; // Base is Upper Left
    } else if (quadrant === 'q1') {
        transformCss = 'scaleX(-1)'; // Mirror for Upper Right
    } else if (quadrant === 'q3') {
        transformCss = 'scaleY(-1)'; // Mirror vertically for Lower Left
    } else if (quadrant === 'q4') {
        transformCss = 'scale(-1, -1)'; // Mirror horizontally & vertically for Lower Right
    }

    const toothContent = `
        <img src="${toothSrc}" class="real-tooth-img" style="transform: ${transformCss}; width: 100%; height: 100%; object-fit: contain; display: block; position: absolute;" />
        
        <!-- Implant Screw (Hidden by default, shown via CSS) -->
        <svg viewBox="0 0 100 120" class="implant-screw-svg" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index: 2;">
            <path class="implant-screw" d="M35,60 L35,15 C35,5 65,5 65,15 L65,60 Z M30,15 L70,15 M30,25 L70,25 M30,35 L70,35 M30,45 L70,45 M30,55 L70,55" stroke="#909497" stroke-width="3" fill="#bdc3c7" />
        </svg>
    `;

    // Removed .lower string interpolation as transformCss handles orientation fully
    tooth.innerHTML = `<div class="tooth-icon" style="position: relative; width: 100%; height: 100%;">${toothContent}</div>`;
    tooth.addEventListener('click', () => babyOnToothClick(String(num)));

    const label = document.createElement('div');
    label.className = 'tooth-num-label';
    label.textContent = num;

    // Upper: label below crown; Lower: label above crown
    if (quadrant === 'q1' || quadrant === 'q2') {
        wrapper.appendChild(tooth);
        wrapper.appendChild(label);
    } else {
        wrapper.appendChild(label);
        wrapper.appendChild(tooth);
    }

    return wrapper;
}

// ─── Tooth Selection ───────────────────────────────────────────────────────
function babyOnToothClick(num) {
    const fullMouth = document.getElementById('babyFullMouthCheck')?.checked;
    if (fullMouth) return;

    if (babySelectedTeeth.includes(num)) {
        babySelectedTeeth = babySelectedTeeth.filter(t => t !== num);
        document.getElementById(`baby-tooth-${num}`)?.classList.remove('selected');
    } else {
        babySelectedTeeth.push(num);
        document.getElementById(`baby-tooth-${num}`)?.classList.add('selected');
    }

    updateBabyToothLabel();

    const surfSel = document.getElementById('babySurfaceSelector');
    if (surfSel) surfSel.style.display = babySelectedTeeth.length > 0 ? 'flex' : 'none';
}

function selectAllBabyTeeth() {
    babySelectedTeeth = [];
    Object.values(BABY_LAYOUT).flat().forEach(n => {
        babySelectedTeeth.push(String(n));
        document.getElementById(`baby-tooth-${n}`)?.classList.add('selected');
    });
    updateBabyToothLabel();
    document.getElementById('babySurfaceSelector').style.display = 'flex';
}

function clearBabySelection() {
    babySelectedTeeth.forEach(n => document.getElementById(`baby-tooth-${n}`)?.classList.remove('selected'));
    babySelectedTeeth = [];
    babySelectedSurface = '';
    document.querySelectorAll('.baby-surface-btn').forEach(b => b.classList.remove('active'));
    updateBabyToothLabel();
    const surfSel = document.getElementById('babySurfaceSelector');
    if (surfSel) surfSel.style.display = 'none';
}

function updateBabyToothLabel() {
    const label = document.getElementById('babySelectedToothLabel');
    if (!label) return;
    if (babySelectedTeeth.length === 0) {
        label.textContent = 'No tooth selected';
        label.style.color = '#999';
    } else {
        const fullMouth = document.getElementById('fullMouthCheck')?.checked;
        label.textContent = fullMouth ? 'Full Mouth' : `Tooth: ${babySelectedTeeth.join(', ')}`;
        label.style.color = '#2766ba';
    }
}

// ─── Load Treatments ───────────────────────────────────────────────────────
async function loadBabyTreatments() {
    // Load favorites from localStorage
    const savedFavs = JSON.parse(localStorage.getItem('babyTreatmentFavs')) || [];

    // Hardcoded primary dentition treatments requested by user
    babyAllTreatments = [
        { _id: 'b1', icon: '🦷', code: 'B101', name: 'Filling - Composite', defaultFee: 5000 },
        { _id: 'b2', icon: '🩶', code: 'B102', name: 'Filling - Amalgam', defaultFee: 4000 },
        { _id: 'b3', icon: '❌', code: 'B110', name: 'Extraction - Simple', defaultFee: 5000 },
        { _id: 'b4', icon: '✂️', code: 'B115', name: 'Extraction - Surgical', defaultFee: 120 },
        { _id: 'b5', icon: '✨', code: 'B120', name: 'Cleaning & Polishing', defaultFee: 30 },
        { _id: 'b6', icon: '🩹', code: 'B130', name: 'Pulpotomy', defaultFee: 150 },
        { _id: 'b7', icon: '🧪', code: 'B135', name: 'Pulpectomy', defaultFee: 200 },
        { _id: 'b8', icon: '🛡️', code: 'B140', name: 'Fluoride / Sealant', defaultFee: 25 },
        { _id: 'b9', icon: '🦷🖌️', code: 'B150', name: 'Space Maintainer', defaultFee: 180 },
        { _id: 'b10', icon: '😁', code: 'B160', name: 'Minor Orthodontic Appliance', defaultFee: 300 }
    ].map(t => ({
        ...t,
        isFavorite: savedFavs.includes(t._id)
    }));

    renderBabyTreatmentGrid();
}

function renderBabyTreatmentGrid() {
    const grid = document.getElementById('babyTreatmentGrid');
    if (!grid) return;

    let list = babyCurrentTab === 'fav'
        ? babyAllTreatments.filter(t => t.isFavorite)
        : babyAllTreatments;

    if (list.length === 0) {
        grid.innerHTML = `<div class="treatment-loading">${babyCurrentTab === 'fav' ? 'No favourites. Switch to All tab.' : 'No treatments found.'}</div>`;
        return;
    }

    grid.innerHTML = list.map(t => `
        <div class="treatment-card ${babySelectedTreatment?._id === t._id ? 'active' : ''}"
             onclick="babyOnTreatmentClick('${t._id}')"
             title="${t.code} — ${t.name}">
            <div class="tc-icon">${t.icon || '🦷'}</div>
            <div class="tc-code">${t.code}</div>
            <div class="tc-name">${t.name}</div>
            <button class="tc-fav-btn ${t.isFavorite ? 'faved' : ''}"
                    onclick="toggleBabyFav(event,'${t._id}')">★</button>
        </div>
    `).join('');
}

function switchBabyTreatmentTab(tab) {
    babyCurrentTab = tab;
    // We select the buttons by looking at their onclick handler to avoid needing IDs
    const btns = document.querySelectorAll('.treatment-tab-btn');
    if (btns.length >= 2) {
        btns[0].classList.toggle('active', tab === 'fav');
        btns[1].classList.toggle('active', tab === 'all');
    }
    renderBabyTreatmentGrid();
}

function toggleBabyFav(e, id) {
    e.stopPropagation();
    const t = babyAllTreatments.find(x => x._id === id);
    if (!t) return;

    t.isFavorite = !t.isFavorite;

    // Save to localStorage
    let savedFavs = JSON.parse(localStorage.getItem('babyTreatmentFavs')) || [];
    if (t.isFavorite && !savedFavs.includes(id)) {
        savedFavs.push(id);
    } else if (!t.isFavorite) {
        savedFavs = savedFavs.filter(favId => favId !== id);
    }
    localStorage.setItem('babyTreatmentFavs', JSON.stringify(savedFavs));

    renderBabyTreatmentGrid();
}

// ─── Treatment Click → Fee Modal ───────────────────────────────────────────
function babyOnTreatmentClick(id) {
    babySelectedTreatment = babyAllTreatments.find(t => t._id === id);
    if (!babySelectedTreatment) return;

    renderBabyTreatmentGrid();

    const isFullMouth = document.getElementById('fullMouthCheck')?.checked;
    const toothStr = isFullMouth ? 'Full Mouth' : babySelectedTeeth.join(', ');

    document.getElementById('babyFeeModalInfo').innerHTML = `
        <div>
            <span>🦷 ${toothStr || '—'}</span>
            <span>${babySelectedTreatment.code} — ${babySelectedTreatment.name}</span>
        </div>
    `;

    document.getElementById('babyFeeDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('babyFeeFee').value = babySelectedTreatment.defaultFee || 0;
    document.getElementById('babyFeeDiscount').value = 0;
    document.getElementById('babyFeeSurface').value = babySelectedSurface;
    babyCalcPayable();

    Modal.open('babyFeeModal');
}

function babyCalcPayable() {
    const fee = parseFloat(document.getElementById('babyFeeFee')?.value) || 0;
    const disc = parseFloat(document.getElementById('babyFeeDiscount')?.value) || 0;
    const payable = Math.max(0, fee - disc);
    const el = document.getElementById('babyFeePayable');
    if (el) el.value = payable.toFixed(2);
}

// ─── Fee → Doctor → Save Procedure ─────────────────────────────────────────
async function babyProceedToDoctor() {
    const fee = parseFloat(document.getElementById('babyFeeFee')?.value) || 0;
    const discount = parseFloat(document.getElementById('babyFeeDiscount')?.value) || 0;
    const payable = Math.max(0, fee - discount);
    const isFullMouth = document.getElementById('fullMouthCheck')?.checked;

    if (!babySelectedTreatment) return;

    babyPendingProcedure = {
        patientId: currentPatientId,
        chartType: 'child',
        procedureDate: document.getElementById('babyFeeDate').value,
        toothNumber: isFullMouth ? 'Full Mouth' : babySelectedTeeth.join(', '),
        surface: document.getElementById('babyFeeSurface').value,
        isFullMouth: !!isFullMouth,
        diagnosis: document.getElementById('babyFeeDiagnosis')?.value || '',
        treatmentCode: babySelectedTreatment.code,
        treatmentName: `${babySelectedTreatment.code} ${babySelectedTreatment.name}`,
        steps: document.getElementById('babyFeeSteps')?.value || 'NA',
        fee,
        discount,
        payable,
        clinicalNotes: document.getElementById('babyFeeClinicalNotes')?.value || '',
        status: 'Completed'
    };

    Modal.close('babyFeeModal');
    await loadDoctorsIntoSelect('babyDoctorSelect');
    Modal.open('babyDoctorModal');
}

async function babyConfirmSaveProcedure() {
    const doctor = document.getElementById('babyDoctorSelect').value;
    if (!doctor) {
        Toast.error('Please select a doctor.');
        return;
    }
    if (!babyPendingProcedure) return;

    babyPendingProcedure.doctor = doctor;

    try {
        if (!currentPatientId) {
            Toast.error('No patient ID. Cannot save procedure.');
            return;
        }

        const result = await APP.api.post('/procedures', babyPendingProcedure);

        // Add to local array and re-render
        babyAllProcedures.unshift(result.procedure || babyPendingProcedure);
        renderBabyProceduresTable();

        Modal.close('babyDoctorModal');

        // Reset selection
        clearBabySelection();
        const fmc = document.getElementById('fullMouthCheck');
        if (fmc) fmc.checked = false;
        babySelectedTreatment = null;
        babyPendingProcedure = null;
        renderBabyTreatmentGrid();

        Toast.success('Procedure saved successfully!');
    } catch (err) {
        console.error('Failed to save procedure:', err);
        Toast.error('Failed to save procedure.');
    }
}

// Initialize variables
let currentPatientId = null;
let babyAllProcedures = [];

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');
    const isManual = params.get('manual') === 'true';

    if (currentPatientId && !isManual) {
        try {
            const patient = await APP.api.get(`/patients/${currentPatientId}`);
            if (patient && patient.age !== null && patient.age !== undefined && patient.age > 12) {
                window.location.replace(`dental-chart.html?id=${currentPatientId}`);
                return;
            }
        } catch (err) {
            console.error("Age check failed:", err);
        }
    }

    if (currentPatientId) {
        loadBabyPatientProfile(currentPatientId);
    } else {
        console.warn('No Patient ID provided!');
    }
});

async function loadBabyPatientProfile(id) {
    try {
        const patient = await APP.api.get(`/patients/${id}`);
        // Populate standard profile hero
        document.getElementById('heroName').textContent = `${patient.firstName} ${patient.lastName}`;
        document.getElementById('heroId').textContent = `Patient ID: ${patient.patientId}`;

        // Initialize Baby procedures
        await loadBabyPatientProcedures();
    } catch (err) {
        console.error('Failed to load patient:', err);
    }
}

// ─── Load Procedures ───────────────────────────────────────────────────────
async function loadBabyPatientProcedures() {
    try {
        babyAllProcedures = await APP.api.get(`/procedures/patient/${currentPatientId}`);
        renderBabyProceduresTable();
    } catch (err) {
        console.error('Failed to load procedures:', err);
    }
}

// ─── Render Procedures Table ───────────────────────────────────────────────
function renderBabyProceduresTable() {
    const tbody = document.getElementById('proceduresBody');
    if (!tbody) return;

    if (babyAllProcedures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state">No procedures recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = babyAllProcedures.map((p, i) => {
        const toothSurface = [p.toothNumber, p.surface].filter(Boolean).join('-');
        const statusCls = p.status === 'Completed' ? 'badge-completed' : p.status === 'Pending' ? 'badge-pending' : 'badge-cancelled';
        const rowCls = p.status === 'Pending' ? 'row-pending' : '';

        return `
        <tr class="${rowCls}" data-id="${p._id}">
            <td>
                <button class="delete-btn" onclick="deleteBabyProcedure('${p._id}')" title="Delete">🗑</button>
            </td>
            <td>${formatDate(p.procedureDate)}</td>
            <td class="teeth-cell">${toothSurface || '—'}</td>
            <td class="editable-cell" contenteditable="true"
                onblur="updateBabyProcedureField('${p._id}', 'diagnosis', this.textContent)">${p.diagnosis || ''}</td>
            <td>${p.treatmentName || '—'}</td>
            <td>${p.steps || 'NA'}</td>
            <td class="num-cell">${(p.fee || 0).toFixed(2)}</td>
            <td class="num-cell">${(p.discount || 0).toFixed(2)}</td>
            <td class="num-cell payable-cell">${(p.payable || 0).toFixed(2)}</td>
            <td class="notes-cell">${p.clinicalNotes || ''}</td>
            <td>${p.doctor || '—'}</td>
            <td><span class="status-badge ${statusCls}">${p.status || 'Completed'}</span></td>
        </tr>
        `;
    }).join('');

    // Billing totals
    const feeList = babyAllProcedures.map(p => p.fee || 0);
    const discList = babyAllProcedures.map(p => p.discount || 0);
    const payList = babyAllProcedures.map(p => p.payable || 0);
    renderBillingTotals(feeList, discList, payList);

    // Update visual chart
    renderBabyTeethConditions();
}

// ─── Render Visual Teeth Conditions ────────────────────────────────────────
function renderBabyTeethConditions() {
    // Clear old conditions
    const possibleClasses = ['cavity', 'filling', 'extraction', 'root-canal', 'crown', 'implant', 'sealant'];
    document.querySelectorAll('.tooth-btn').forEach(el => {
        el.classList.remove(...possibleClasses);
    });

    const reversed = [...babyAllProcedures].reverse();

    reversed.forEach(p => {
        if (!p.toothNumber || p.toothNumber === 'OO' || p.toothNumber === 'Full Mouth') return;
        const teeth = p.toothNumber.split(',').map(t => t.trim());
        const diagInfo = (p.diagnosis + ' ' + p.treatmentName).toLowerCase();

        let conditionCls = '';
        if (diagInfo.includes('implant')) conditionCls = 'implant';
        else if (diagInfo.includes('extract')) conditionCls = 'extraction';
        else if (diagInfo.includes('crown')) conditionCls = 'crown';
        else if (diagInfo.includes('root canal') || diagInfo.includes('rct') || diagInfo.includes('pulpectomy') || diagInfo.includes('pulpotomy')) conditionCls = 'root-canal';
        else if (diagInfo.includes('filling') || diagInfo.includes('composite') || diagInfo.includes('amalgam')) conditionCls = 'filling';
        else if (diagInfo.includes('caries') || diagInfo.includes('cavity')) conditionCls = 'cavity';
        else if (diagInfo.includes('sealant') || diagInfo.includes('fluoride')) conditionCls = 'sealant';

        if (conditionCls) {
            teeth.forEach(t => {
                const toothEl = document.getElementById(`baby-tooth-${t}`);
                if (toothEl) {
                    if (['extraction', 'implant', 'crown'].includes(conditionCls)) {
                        toothEl.classList.remove(...possibleClasses);
                    }
                    toothEl.classList.add(conditionCls);
                }
            });
        }
    });
}

function renderBillingTotals(fees, discounts, payables) {
    const sum = arr => arr.reduce((a, b) => a + b, 0);
    const tf = document.getElementById('totalFee');
    const td = document.getElementById('totalDiscount');
    const tp = document.getElementById('totalPayable');
    if (tf) tf.textContent = sum(fees).toFixed(2);
    if (td) td.textContent = sum(discounts).toFixed(2);
    if (tp) tp.textContent = sum(payables).toFixed(2);
}

// ─── Delete Procedure ──────────────────────────────────────────────────────
async function deleteBabyProcedure(id) {
    const ok = await Confirm.show('Delete this procedure?');
    if (!ok) return;
    try {
        await APP.api.delete(`/procedures/${id}`);
        babyAllProcedures = babyAllProcedures.filter(p => p._id !== id);
        renderBabyProceduresTable();
        Toast.success('Procedure deleted.');
    } catch (err) {
        console.error('Failed to delete procedure:', err);
        Toast.error('Failed to delete procedure.');
    }
}

// ─── Inline Edit Diagnosis ─────────────────────────────────────────────────
async function updateBabyProcedureField(id, field, value) {
    try {
        await APP.api.put(`/procedures/${id}`, { [field]: value.trim() });
        const proc = babyAllProcedures.find(p => p._id === id);
        if (proc) proc[field] = value.trim();
    } catch (err) {
        console.error(`Failed to update ${field}:`, err);
    }
}

// ─── Save Changes ──────────────────────────────────────────────────────────
window.savePendingChanges = async function () {
    await loadBabyPatientProcedures();
    Toast.success('Procedures refreshed.');
};

window.toggleHistoryView = function () {
    loadBabyPatientProcedures();
};

window.openProgressNote = function () {
    Toast.info('Progress Note — coming soon.');
};

// ─── Utility ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
}

// ─── Load Doctors into Select ──────────────────────────────────────────────
async function loadDoctorsIntoSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Doctor...</option>';
    try {
        const staff = await APP.api.get('/staff');
        staff.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load staff:', err);
    }
}