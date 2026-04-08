// ====== dental-chart.js ======
// Full FDI Dental Chart + Treatment Flow

// ─── State ────────────────────────────────────────────────────────────────
let currentPatientId = null;
let selectedTeeth = [];          // array of tooth numbers (strings)
let selectedSurface = '';
let selectedTreatment = null;    // { _id, code, name, defaultFee, icon }
let allTreatments = [];
let allProcedures = [];
let currentTab = 'fav';          // 'fav' | 'all'
let pendingProcedure = null;     // procedure being built before doctor confirm

// FDI Tooth layout: quadrant → tooth numbers in display order (right→center for Q1/Q4)
const FDI_LAYOUT = {
    q1: [18, 17, 16, 15, 14, 13, 12, 11],  // upper right → midline
    q2: [21, 22, 23, 24, 25, 26, 27, 28],  // upper left  midline →
    q4: [48, 47, 46, 45, 44, 43, 42, 41],  // lower right → midline
    q3: [31, 32, 33, 34, 35, 36, 37, 38]   // lower left  midline →
};

// Tooth condition colors (for visual chart coloring)
const CONDITION_COLORS = {
    'Healthy': { bg: '#e8f5e9', border: '#4caf50' },
    'Cavity': { bg: '#ffebee', border: '#f44336' },
    'Filling': { bg: '#e3f2fd', border: '#2196f3' },
    'Extraction': { bg: '#f3e5f5', border: '#9c27b0' },
    'Root Canal': { bg: '#fff3e0', border: '#ff9800' },
    'Crown': { bg: '#eceff1', border: '#607d8b' },
    'Implant': { bg: '#fffde7', border: '#fbc02d' },
    'Missing': { bg: '#fafafa', border: '#bdbdbd' }
};

// Teeth that typically have cusps/wider shape
const MOLAR_TEETH = [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48];

// ─── Init ──────────────────────────────────────────────────────────────────
function getPatientId() {
    return new URLSearchParams(window.location.search).get('id');
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentPatientId = urlParams.get('id');
    const isManual = urlParams.get('manual') === 'true';

    if (currentPatientId && !isManual) {
        try {
            const patient = await APP.api.get(`/patients/${currentPatientId}`);
            if (patient && patient.age !== null && patient.age !== undefined && patient.age < 12) {
                window.location.replace(`baby-dental-chart.html?id=${currentPatientId}`);
                return;
            }
        } catch (err) {
            console.error("Age check failed:", err);
        }
    }

    generateFDIChart();
    await loadTreatments();
    if (currentPatientId) {
        await loadPatientProcedures();
    }

    const switchBtn = document.querySelector('.dc-chart-topbar button');
    if (switchBtn) {
        switchBtn.onclick = () => {
            window.location.href = `baby-dental-chart.html?id=${currentPatientId}&manual=true`;
        };
    }

    // Full mouth checkbox
    document.getElementById('fullMouthCheck').addEventListener('change', (e) => {
        if (e.target.checked) {
            selectAllTeeth();
        } else {
            clearToothSelection();
        }
    });

    // Surface buttons
    document.querySelectorAll('.surface-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = btn.dataset.s;
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                selectedSurface = selectedSurface.replace(s, '');
            } else {
                btn.classList.add('active');
                selectedSurface += s;
            }
        });
    });

    // Make global
    window.switchTreatmentTab = switchTreatmentTab;
    window.calcPayable = calcPayable;
    window.proceedToDoctor = proceedToDoctor;
    window.confirmSaveProcedure = confirmSaveProcedure;
    window.deleteProcedure = deleteProcedure;
    window.savePendingChanges = savePendingChanges;
    window.openProgressNote = openProgressNote;
    window.toggleHistoryView = toggleHistoryView;
});

// ─── FDI Chart Generation ──────────────────────────────────────────────────
function generateFDIChart() {
    Object.entries(FDI_LAYOUT).forEach(([quadrant, teeth]) => {
        const container = document.getElementById(quadrant);
        if (!container) return;
        container.innerHTML = '';
        teeth.forEach(num => {
            container.appendChild(createToothEl(num, quadrant));
        });
    });
}

function createToothEl(num, quadrant) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tooth-wrapper';

    const tooth = document.createElement('div');
    tooth.className = 'tooth-btn';
    tooth.id = `tooth-${num}`;
    tooth.dataset.tooth = num;

    const isUpper = quadrant === 'q1' || quadrant === 'q2';
    const pos = parseInt(String(num)[1]); // 1-8 inside quadrant

    // Image mapping 1-8
    const toothMap = {
        1: '11 – Central Incisor.png',
        2: '12 – Lateral Incisor.png',
        3: '13 – Canine (Cuspid).png',
        4: '14 – First Premolar.png',
        5: '15 – Second Premolar.png',
        6: '16 – First Molar.png',
        7: '17 – Second Molar.png',
        8: '18 – Third Molar (Wisdom Tooth).png'
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

    // No need for 'lower' or 'molar' rotation since the transformCss handles exact orientation of the user images!
    tooth.innerHTML = `<div class="tooth-icon" style="position: relative; width: 100%; height: 100%;">${toothContent}</div>`;
    tooth.addEventListener('click', () => onToothClick(String(num)));

    const label = document.createElement('div');
    label.className = 'tooth-num-label';
    label.textContent = num;

    // Upper: label below crown; Lower: label above crown
    if (isUpper) {
        wrapper.appendChild(tooth);
        wrapper.appendChild(label);
    } else {
        wrapper.appendChild(label);
        wrapper.appendChild(tooth);
    }

    return wrapper;
}

// ─── Tooth Selection ───────────────────────────────────────────────────────
function onToothClick(num) {
    const fullMouth = document.getElementById('fullMouthCheck').checked;
    if (fullMouth) return; // managed by checkbox

    if (selectedTeeth.includes(num)) {
        // Deselect
        selectedTeeth = selectedTeeth.filter(t => t !== num);
        document.getElementById(`tooth-${num}`)?.classList.remove('selected');
    } else {
        selectedTeeth.push(num);
        document.getElementById(`tooth-${num}`)?.classList.add('selected');
    }

    updateToothLabel();

    // Show/hide surface selector
    const surfSel = document.getElementById('surfaceSelector');
    if (surfSel) {
        surfSel.style.display = selectedTeeth.length > 0 ? 'flex' : 'none';
    }
}

function selectAllTeeth() {
    selectedTeeth = [];
    Object.values(FDI_LAYOUT).flat().forEach(n => {
        const id = `tooth-${n}`;
        selectedTeeth.push(String(n));
        document.getElementById(id)?.classList.add('selected');
    });
    updateToothLabel();
    const surfSel = document.getElementById('surfaceSelector');
    if (surfSel) surfSel.style.display = 'flex';
}

function clearToothSelection() {
    selectedTeeth.forEach(n => {
        document.getElementById(`tooth-${n}`)?.classList.remove('selected');
    });
    selectedTeeth = [];
    selectedSurface = '';
    document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('active'));
    updateToothLabel();
    const surfSel = document.getElementById('surfaceSelector');
    if (surfSel) surfSel.style.display = 'none';
}

function updateToothLabel() {
    const label = document.getElementById('selectedToothLabel');
    if (!label) return;
    if (selectedTeeth.length === 0) {
        label.textContent = 'No tooth selected';
        label.style.color = '#999';
    } else {
        const fullMouth = document.getElementById('fullMouthCheck')?.checked;
        label.textContent = fullMouth ? 'Full Mouth' : `Tooth: ${selectedTeeth.join(', ')}`;
        label.style.color = '#2766ba';
    }
}

// ─── Load Treatments ───────────────────────────────────────────────────────
async function loadTreatments() {
    try {
        // Auto-seed if empty
        await APP.api.get('/treatments/seed').catch(() => { });
        allTreatments = await APP.api.get('/treatments');
        renderTreatmentGrid();
    } catch (err) {
        console.error('Failed to load treatments:', err);
        document.getElementById('treatmentGrid').innerHTML = '<div class="treatment-loading">Failed to load treatments.</div>';
    }
}

function renderTreatmentGrid() {
    const grid = document.getElementById('treatmentGrid');
    if (!grid) return;

    let list = currentTab === 'fav'
        ? allTreatments.filter(t => t.isFavorite)
        : allTreatments;

    if (list.length === 0) {
        grid.innerHTML = `<div class="treatment-loading">${currentTab === 'fav' ? 'No favourites. Switch to All tab.' : 'No treatments found.'}</div>`;
        return;
    }

    grid.innerHTML = list.map(t => `
        <div class="treatment-card ${selectedTreatment?._id === t._id ? 'active' : ''}"
             onclick="onTreatmentClick('${t._id}')"
             title="${t.code} — ${t.name}">
            <div class="tc-icon">${t.icon || '🦷'}</div>
            <div class="tc-code">${t.code}</div>
            <div class="tc-name">${t.name}</div>
            <button class="tc-fav-btn ${t.isFavorite ? 'faved' : ''}"
                    onclick="toggleFav(event,'${t._id}')">★</button>
        </div>
    `).join('');
}

function switchTreatmentTab(tab) {
    currentTab = tab;
    document.getElementById('tabFav').classList.toggle('active', tab === 'fav');
    document.getElementById('tabAll').classList.toggle('active', tab === 'all');
    renderTreatmentGrid();
}

async function toggleFav(e, id) {
    e.stopPropagation();
    const t = allTreatments.find(x => x._id === id);
    if (!t) return;
    try {
        await APP.api.put(`/treatments/${id}`, { isFavorite: !t.isFavorite });
        t.isFavorite = !t.isFavorite;
        renderTreatmentGrid();
    } catch (err) {
        console.error('Failed to toggle favourite:', err);
    }
}

// ─── Treatment Click → Fee Modal ───────────────────────────────────────────
function onTreatmentClick(id) {
    selectedTreatment = allTreatments.find(t => t._id === id);
    if (!selectedTreatment) return;
    renderTreatmentGrid(); // re-render to show active state

    // Build the tooth string
    const isFullMouth = document.getElementById('fullMouthCheck')?.checked;
    const toothStr = isFullMouth
        ? 'OO'
        : selectedTeeth.length > 0
            ? selectedTeeth.join(', ')
            : '';

    // Populate fee modal info bar
    document.getElementById('feeModalInfo').innerHTML = `
        <div class="fee-info-bar">
            <span class="fee-info-chip">🦷 ${toothStr || '—'}</span>
            <span class="fee-info-chip treatment-chip">${selectedTreatment.code} — ${selectedTreatment.name}</span>
        </div>
    `;

    // Pre-fill fields
    document.getElementById('feeDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('feeFee').value = selectedTreatment.defaultFee || 0;
    document.getElementById('feeDiscount').value = 0;
    document.getElementById('feeSurface').value = selectedSurface;
    document.getElementById('feeSteps').value = 'NA';
    document.getElementById('feeDiagnosis').value = '';
    document.getElementById('feeClinicalNotes').value =
        'TYPE OF ANESTHESIA: \nAMOUNT OF ANESTHESIA: \nPROGNOSIS: \nPOSTOP INTRUCTIONS AND FOLLOW UP INSTRUCTIONS GIVEN';
    calcPayable();

    Modal.open('feeModal');
}

function calcPayable() {
    const fee = parseFloat(document.getElementById('feeFee')?.value) || 0;
    const disc = parseFloat(document.getElementById('feeDiscount')?.value) || 0;
    const payable = Math.max(0, fee - disc);
    const el = document.getElementById('feePayable');
    if (el) el.value = payable.toFixed(2);
}

// ─── Fee Modal → Doctor Modal ──────────────────────────────────────────────
async function proceedToDoctor() {
    const fee = parseFloat(document.getElementById('feeFee').value) || 0;
    const discount = parseFloat(document.getElementById('feeDiscount').value) || 0;
    const payable = Math.max(0, fee - discount);
    const isFullMouth = document.getElementById('fullMouthCheck')?.checked;

    if (!selectedTreatment) {
        Toast.error('No treatment selected.');
        return;
    }

    // Build pending procedure (will be enriched with doctor)
    pendingProcedure = {
        patientId: currentPatientId,
        chartType: 'adult',
        procedureDate: document.getElementById('feeDate').value,
        toothNumber: isFullMouth ? 'OO' : selectedTeeth.join(', '),
        surface: document.getElementById('feeSurface').value,
        isFullMouth: !!isFullMouth,
        diagnosis: document.getElementById('feeDiagnosis').value,
        treatmentCode: selectedTreatment.code,
        treatmentName: `${selectedTreatment.code} ${selectedTreatment.name}`,
        steps: document.getElementById('feeSteps').value || 'NA',
        fee,
        discount,
        payable,
        clinicalNotes: document.getElementById('feeClinicalNotes').value,
        status: 'Completed'
    };

    Modal.close('feeModal');

    // Load doctors into doctor select
    await loadDoctorsIntoSelect();
    Modal.open('doctorModal');
}

async function loadDoctorsIntoSelect() {
    const select = document.getElementById('doctorSelect');
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

// ─── Doctor Modal → Save Procedure ────────────────────────────────────────
async function confirmSaveProcedure() {
    const doctor = document.getElementById('doctorSelect').value;
    if (!doctor) {
        Toast.error('Please select a doctor.');
        return;
    }
    if (!pendingProcedure) return;

    pendingProcedure.doctor = doctor;

    try {
        if (!currentPatientId) {
            Toast.error('No patient ID. Cannot save procedure.');
            return;
        }

        const result = await APP.api.post('/procedures', pendingProcedure);

        // Add to local array and re-render
        allProcedures.unshift(result.procedure || pendingProcedure);
        renderProceduresTable();

        Modal.close('doctorModal');

        // Reset selection
        clearToothSelection();
        document.getElementById('fullMouthCheck').checked = false;
        selectedTreatment = null;
        pendingProcedure = null;
        renderTreatmentGrid();

        Toast.success('Procedure saved successfully!');
    } catch (err) {
        console.error('Failed to save procedure:', err);
        Toast.error('Failed to save procedure. Please try again.');
    }
}

// ─── Load Procedures ───────────────────────────────────────────────────────
async function loadPatientProcedures() {
    try {
        allProcedures = await APP.api.get(`/procedures/patient/${currentPatientId}`);
        renderProceduresTable();
    } catch (err) {
        console.error('Failed to load procedures:', err);
    }
}

// ─── Render Procedures Table ───────────────────────────────────────────────
function renderProceduresTable() {
    const tbody = document.getElementById('proceduresBody');
    if (!tbody) return;

    if (allProcedures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state">No procedures recorded yet.</td></tr>`;
        renderBillingTotals([], [], []);
        return;
    }

    tbody.innerHTML = allProcedures.map((p, i) => {
        const toothSurface = [p.toothNumber, p.surface].filter(Boolean).join('-');
        const statusCls = p.status === 'Completed' ? 'badge-completed' : p.status === 'Pending' ? 'badge-pending' : 'badge-cancelled';
        const rowCls = p.status === 'Pending' ? 'row-pending' : '';

        return `
        <tr class="${rowCls}" data-id="${p._id}">
            <td>
                <button class="delete-btn" onclick="deleteProcedure('${p._id}')" title="Delete">🗑</button>
            </td>
            <td>${formatDate(p.procedureDate)}</td>
            <td class="teeth-cell">${toothSurface || '—'}</td>
            <td class="editable-cell" contenteditable="true"
                onblur="updateProcedureField('${p._id}', 'diagnosis', this.textContent)">${p.diagnosis || ''}</td>
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
    const feeList = allProcedures.map(p => p.fee || 0);
    const discList = allProcedures.map(p => p.discount || 0);
    const payList = allProcedures.map(p => p.payable || 0);
    renderBillingTotals(feeList, discList, payList);

    // Update visual chart
    renderTeethConditions();
}

// ─── Render Visual Teeth Conditions ────────────────────────────────────────
function renderTeethConditions() {
    // Clear old conditions
    const possibleClasses = ['cavity', 'filling', 'extraction', 'root-canal', 'crown', 'implant', 'sealant'];
    document.querySelectorAll('.tooth-btn').forEach(el => {
        el.classList.remove(...possibleClasses);
    });

    // We process from oldest to newest if array is newest-first, so newest overrides. 
    // Assuming allProcedures is newest first (based on unshift in save), we should reverse it for visual stacking, 
    // or just apply them and let CSS handle. We will just apply all.
    const reversed = [...allProcedures].reverse();

    reversed.forEach(p => {
        if (!p.toothNumber || p.toothNumber === 'OO') return;
        const teeth = p.toothNumber.split(',').map(t => t.trim());
        const diagInfo = (p.diagnosis + ' ' + p.treatmentName).toLowerCase();

        let conditionCls = '';
        if (diagInfo.includes('implant')) conditionCls = 'implant';
        else if (diagInfo.includes('extract')) conditionCls = 'extraction';
        else if (diagInfo.includes('crown')) conditionCls = 'crown';
        else if (diagInfo.includes('root canal') || diagInfo.includes('rct')) conditionCls = 'root-canal';
        else if (diagInfo.includes('filling') || diagInfo.includes('composite') || diagInfo.includes('amalgam')) conditionCls = 'filling';
        else if (diagInfo.includes('caries') || diagInfo.includes('cavity')) conditionCls = 'cavity';
        else if (diagInfo.includes('sealant')) conditionCls = 'sealant';

        if (conditionCls) {
            teeth.forEach(t => {
                const toothEl = document.getElementById(`tooth-${t}`);
                if (toothEl) {
                    // Extraction/Implant/Crown usually clears previous visual states
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
async function deleteProcedure(id) {
    const ok = await Confirm.show('Delete this procedure?');
    if (!ok) return;
    try {
        await APP.api.delete(`/procedures/${id}`);
        allProcedures = allProcedures.filter(p => p._id !== id);
        renderProceduresTable();
        Toast.success('Procedure deleted.');
    } catch (err) {
        console.error('Failed to delete procedure:', err);
        Toast.error('Failed to delete procedure.');
    }
}

// ─── Inline Edit Diagnosis ─────────────────────────────────────────────────
async function updateProcedureField(id, field, value) {
    try {
        await APP.api.put(`/procedures/${id}`, { [field]: value.trim() });
        const proc = allProcedures.find(p => p._id === id);
        if (proc) proc[field] = value.trim();
    } catch (err) {
        console.error(`Failed to update ${field}:`, err);
    }
}

// ─── Save Changes ──────────────────────────────────────────────────────────
async function savePendingChanges() {
    await loadPatientProcedures();
    Toast.success('Procedures refreshed.');
}

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

function openProgressNote() {
    Toast.info('Progress Note — coming soon.');
}

function toggleHistoryView() {
    loadPatientProcedures();
}