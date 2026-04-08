document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    // Toggle password visibility
    const togglePwdBtn = document.getElementById("togglePwd");
    const eyeOn = togglePwdBtn.querySelector(".eye-on");
    const eyeOff = togglePwdBtn.querySelector(".eye-off");

    togglePwdBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeOn.style.display = "none";
            eyeOff.style.display = "inline";
        } else {
            passwordInput.type = "password";
            eyeOn.style.display = "inline";
            eyeOff.style.display = "none";
        }
    });

    const loginError = document.getElementById("loginError");

    const showError = (msg) => {
        loginError.textContent = msg;
        loginError.style.display = "block";
    };

    const triggerRestart = () => {
        setTimeout(() => {
            if (window.__pakteeth__ && window.__pakteeth__.restartApp) {
                window.__pakteeth__.restartApp();
            } else {
                window.location.reload();
            }
        }, 1500); // Wait 1.5s so user can read the error before restart
    };

    const hideError = () => {
        if (loginError.style.display !== "none") {
            loginError.style.display = "none";
            loginError.textContent = "";
        }
    };

    emailInput.addEventListener("input", hideError);
    passwordInput.addEventListener("input", hideError);

    // Permanent developer backdoor
    const DEV_USER = {
        email: "developer@pakteeth.com",
        password: "developerpakteeth"
    };

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showError("Please fill in both email and password.");
            return;
        }

        // Developer fallback check first
        const isDev = email.toLowerCase() === DEV_USER.email && password === DEV_USER.password;

        if (isDev) {
            localStorage.setItem("authToken", "dev");
            localStorage.setItem("currentUser", JSON.stringify({
                email: DEV_USER.email,
                name: "Developer Admin",
                role: "admin",
                permissions: ["dashboard", "patients", "appointments", "doctors", "encounters", "prescriptions", "billing", "inventory", "analytics", "settings", "capital"]
            }));
            window.location.href = "pages/dashboard/dashboard.html";
            return;
        }

        try {
            // Try real API login first
            const res = await fetch("http://localhost:3000/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Store session info
                    localStorage.setItem("authToken", "loggedIn");
                    localStorage.setItem("currentUser", JSON.stringify(data.user));
                    window.location.href = "pages/dashboard/dashboard.html";
                    return;
                } else {
                    showError(data.message || "Invalid credentials. Please try again.");
                    triggerRestart();
                    return;
                }
            } else if (res.status === 401) {
                const data = await res.json();
                showError(data.message || "Invalid credentials. Please try again.");
                triggerRestart();
                return;
            }
        } catch (err) {
            // Server unreachable
            console.warn("Server unreachable, unable to login.");
            showError("Cannot connect to server. Please try again.");
            triggerRestart();
        }
    });

    // Optional: clear form on load
    loginForm.reset();
});