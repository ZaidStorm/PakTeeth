// js/core.js - Core utilities shared across all modules

const API_BASE = "http://localhost:3000";

// ===== Global APP Object =====
const APP = {
    // Current user object
    currentUser: null,

    // Initialize current user from localStorage
    initCurrentUser: function () {
        this.currentUser = this.getCurrentUser();
    },

    // Simple auth check
    ensureAuth: function () {
        this.initCurrentUser();
        const token = localStorage.getItem("authToken");
        const currentUser = this.currentUser;

        const isLoginPage = window.location.pathname.endsWith("index.html") ||
            window.location.pathname === "/" ||
            window.location.pathname.endsWith("/");

        if ((!token || !currentUser) && !isLoginPage) {
            console.warn("Auth check failed. Redirecting to login...");
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = "/index.html";
        }
    },

    logout: function () {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('kpisUnlocked');
        window.location.href = "/index.html";
    },

    // Navigation lock functionality
    updateNavigationLocks: function () {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        const permissions = currentUser.permissions || [];

        // Get all navigation items
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (!href || href === '#') return;

            // Extract module name from href
            const moduleName = href.split('/').pop().replace('.html', '');

            // Check if user has permission for this module
            if (!permissions.includes(moduleName) && currentUser.email !== 'developer@pakteeth.com') {
                // Add lock icon and disable click
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.5';
                item.style.position = 'relative';

                // Add lock icon if not already present
                if (!item.querySelector('.lock-icon')) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'lock-icon';
                    lockIcon.innerHTML = '🔒';
                    lockIcon.style.cssText = 'position: absolute; top: 2px; right: 2px; font-size: 10px;';
                    item.appendChild(lockIcon);
                }
            } else {
                // Remove lock if permission exists
                item.style.pointerEvents = '';
                item.style.opacity = '';
                const lockIcon = item.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            }
        });
    },

    getCurrentUser: function () {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // API helper methods
    api: {
        async get(endpoint) {
            try {
                const res = await fetch(`${API_BASE}${endpoint}`);
                if (!res.ok) {
                    const errorBody = await res.json().catch(() => ({}));
                    throw new Error(errorBody.message || errorBody.error || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error(`API GET ${endpoint} failed:`, err);
                throw err;
            }
        },

        async post(endpoint, data) {
            try {
                const res = await fetch(`${API_BASE}${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                if (!res.ok) {
                    const errorBody = await res.json().catch(() => ({}));
                    throw new Error(errorBody.message || errorBody.error || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error(`API POST ${endpoint} failed:`, err);
                throw err;
            }
        },

        async put(endpoint, data) {
            try {
                const res = await fetch(`${API_BASE}${endpoint}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                if (!res.ok) {
                    const errorBody = await res.json().catch(() => ({}));
                    throw new Error(errorBody.message || errorBody.error || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error(`API PUT ${endpoint} failed:`, err);
                throw err;
            }
        },

        async delete(endpoint) {
            try {
                const res = await fetch(`${API_BASE}${endpoint}`, {
                    method: "DELETE"
                });
                if (!res.ok) {
                    const errorBody = await res.json().catch(() => ({}));
                    throw new Error(errorBody.message || errorBody.error || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                console.error(`API DELETE ${endpoint} failed:`, err);
                throw err;
            }
        }
    }
};

// ===== Global Modal Object =====
const Modal = {
    open: function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        } else {
            console.warn(`Modal with id '${modalId}' not found`);
        }
    },

    close: function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
        // Also reset forms if present
        const form = modal?.querySelector("form");
        if (form) form.reset();

        // Special handling for staff modal
        if (modalId === "staffModal") {
            const staffId = document.getElementById("staff_id");
            const modalTitle = document.getElementById("staffModalTitle");
            if (staffId) staffId.value = "";
            if (modalTitle) modalTitle.textContent = "Add Staff Member";
        }
    },

    // Close all modals
    closeAll: function () {
        document.querySelectorAll(".modal-overlay").forEach(m => {
            m.classList.remove('active');
        });
    }
};

// ===== Global Toast Object =====
const Toast = {
    show: function (message, type = 'info', duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;

        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                toast.style.background = '#28a745';
                break;
            case 'error':
                toast.style.background = '#dc3545';
                break;
            case 'warning':
                toast.style.background = '#ffc107';
                toast.style.color = '#212529';
                break;
            default:
                toast.style.background = '#17a2b8';
        }

        // Add to document
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success: function (message, duration) {
        this.show(message, 'success', duration);
    },

    error: function (message, duration) {
        this.show(message, 'error', duration);
    },

    warning: function (message, duration) {
        this.show(message, 'warning', duration);
    },

    info: function (message, duration) {
        this.show(message, 'info', duration);
    }
};

// ===== Global Confirm Dialog =====
const Confirm = {
    show: function (message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            // Remove existing confirm dialog if any
            const existing = document.querySelector('.confirm-overlay');
            if (existing) existing.remove();

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '99999'
            });

            // Create dialog box
            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                background: '#1e1e2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px 28px',
                maxWidth: '420px',
                width: '90%',
                color: '#e0e0e0',
                fontFamily: 'inherit',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            });

            // Title
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            Object.assign(titleEl.style, {
                margin: '0 0 12px 0',
                fontSize: '1.1rem',
                color: '#fff',
                fontWeight: '600'
            });

            // Message
            const msgEl = document.createElement('p');
            msgEl.textContent = message;
            Object.assign(msgEl.style, {
                margin: '0 0 20px 0',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                color: '#ccc'
            });

            // Buttons container
            const btnContainer = document.createElement('div');
            Object.assign(btnContainer.style, {
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
            });

            // Cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            Object.assign(cancelBtn.style, {
                padding: '8px 20px',
                border: '1px solid #555',
                borderRadius: '6px',
                background: 'transparent',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s'
            });
            cancelBtn.onmouseover = () => { cancelBtn.style.background = '#333'; };
            cancelBtn.onmouseout = () => { cancelBtn.style.background = 'transparent'; };

            // Confirm button
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm';
            Object.assign(confirmBtn.style, {
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: '#dc3545',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s'
            });
            confirmBtn.onmouseover = () => { confirmBtn.style.background = '#c82333'; };
            confirmBtn.onmouseout = () => { confirmBtn.style.background = '#dc3545'; };

            // Wire up events
            const cleanup = (result) => {
                overlay.remove();
                resolve(result);
            };

            cancelBtn.addEventListener('click', () => cleanup(false));
            confirmBtn.addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });

            // Assemble
            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(confirmBtn);
            dialog.appendChild(titleEl);
            dialog.appendChild(msgEl);
            dialog.appendChild(btnContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Focus confirm button for keyboard users
            confirmBtn.focus();
        });
    }
};

// ===== Date Utility Object =====
const DateUtil = {
    today: function () {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    format: function (date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }
};

// ===== Utility Functions =====
const Utils = {
    // Format date to YYYY-MM-DD
    formatDate: function (date) {
        if (!date) return "";
        const d = new Date(date);
        return d.toISOString().split("T")[0];
    },

    // Generate unique ID
    generateId: function (prefix = "ID") {
        return `${prefix}${Date.now()}`;
    },

    // Show loading spinner
    showLoading: function (elementId) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '<div class="loading">Loading...</div>';
    },

    // Format patient ID (pads number to 3 digits, e.g., P1 -> P001)
    formatPatientId: function (id) {
        if (!id) return "-";
        const strId = String(id).trim();
        const match = strId.match(/^P?(\d+)$/i);
        if (match) {
            return `P${match[1].padStart(3, '0')}`;
        }
        return strId;
    },

    // Show error message
    showError: function (elementId, message) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = `<div class="error">Error: ${message}</div>`;
    },

    // Export data to CSV
    exportToCSV: function (filename, headers, rows) {
        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

// ===== Initialize on DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
    // Initialize current user and navigation locks
    APP.initCurrentUser();
    APP.updateNavigationLocks();

    // Setup modal close buttons
    document.querySelectorAll(".modal-close, .modal-close-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const modal = e.target.closest(".modal-overlay");
            if (modal) modal.classList.remove('active');
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll(".modal-overlay").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Initialize dropdown functionality for all pages
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    dropdowns.forEach(dropdown => {
        // Attach to the dropdown container itself, not just the inner nav-item anchor
        dropdown.addEventListener('click', function (e) {
            // Only toggle if clicking the toggle button area (not a dropdown link)
            const clickedLink = e.target.closest('.nav-dropdown-content a');
            if (clickedLink) return; // let dropdown links navigate normally

            e.preventDefault();
            e.stopPropagation();

            // Close all other dropdowns
            dropdowns.forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('active');
                }
            });

            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });
});

// Make available globally
window.APP = APP;
window.Modal = Modal;
window.Toast = Toast;
window.Confirm = Confirm;
window.DateUtil = DateUtil;
window.Utils = Utils;
window.API_BASE = API_BASE;

// ===== Global Performance Fix for Low RAM Systems =====
(function disableHeavyBlurEffects() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Disable expensive backdrop filters globally */
        * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
    `;
    document.head.appendChild(style);
})();
