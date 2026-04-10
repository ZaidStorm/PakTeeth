/**
 * City Manager Utility
 * Handles dynamic city suggestions and UI integration for PakTeeth
 */

const CityManager = {
    cities: [],

    async init() {
        console.log("CityManager: Initializing...");
        await this.loadCities();
        this.injectDatalist();
        this.applyToInputs();

        // Listen for custom events if we need to refresh from other scripts
        document.addEventListener('cityCollectionUpdated', () => this.refresh());
    },

    async loadCities() {
        try {
            const response = await fetch("http://localhost:3000/cities");
            if (!response.ok) throw new Error("Failed to fetch cities");
            this.cities = await response.json();
            console.log(`CityManager: Loaded ${this.cities.length} cities.`);
        } catch (err) {
            console.error("CityManager Error:", err);
            // Fallback to minimal list if server is unreachable
            this.cities = [{ name: "Lahore" }, { name: "Karachi" }, { name: "Islamabad" }];
        }
    },

    injectDatalist() {
        let datalist = document.getElementById("pakistan-cities");
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = "pakistan-cities";
            document.body.appendChild(datalist);
        }

        datalist.innerHTML = this.cities
            .map(city => `<option value="${city.name}">`)
            .join("");
    },

    applyToInputs() {
        // Targeted IDs based on project structure
        const targetIds = ["p_city", "edit_city"];
        targetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.setAttribute("list", "pakistan-cities");
                if (!el.placeholder || el.placeholder.includes("Lahore")) {
                    el.placeholder = "Type city name...";
                }
            }
        });
    },

    // Refresh the list (useful after CRUD operations in Settings)
    async refresh() {
        await this.loadCities();
        this.injectDatalist();
        this.applyToInputs();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CityManager.init());
} else {
    CityManager.init();
}

// Global access
window.CityManager = CityManager;
