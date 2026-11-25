
const API = "/api";

// DISPLAY WEBSITE SECTIONS
function showSection(page) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.add("d-none");
    });

    const selected = document.getElementById(page);

    if (selected) {
        selected.classList.remove("d-none");
    }

    if (page === "dashboard") loadDashboard();
    if (page === "courses") loadCourses();
    if (page === "attendance") loadAttendance();
    if (page === "assignments") loadAssignments();
    if (page === "results") loadResults();
    if (page === "profile") loadProfile();
}

// NAVIGATION
document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showSection(link.dataset.page);
    });
});

// API REQUEST FUNCTION
async function apiRequest(url, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin"
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(API + url, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
    }

    return result;
}

// LOGIN
document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const message = document.getElementById("loginMessage");

    try {
        const result = await apiRequest("/login", "POST", {
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
        });

        message.textContent = result.message;

        showDashboard(result.user);

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});

// REGISTRATION
document.getElementById("registerForm").addEventListener("submit", async event => {
    event.preventDefault();

    const message = document.getElementById("registerMessage");

    try {
        const result = await apiRequest("/register", "POST", {
            name: document.getElementById("regName").value,
            email: document.getElementById("regEmail").value,
            phone: document.getElementById("regPhone").value,
            password: document.getElementById("regPassword").value
        });

        message.textContent = result.message;
        message.style.color = "green";

        document.getElementById("registerForm").reset();

        setTimeout(() => showSection("login"), 1200);

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});

// SHOW DASHBOARD
function showDashboard(user) {
    document.getElementById("publicNav").classList.add("d-none");
    document.getElementById("welcomeName").textContent = user.name;

    document.getElementById("adminLink").classList.toggle(
        "d-none", user.role !== "admin"
    );

    showSection("dashboard");
}

// DASHBOARD DATA
async function loadDashboard() {
    try {
        const data = await apiRequest("/dashboard");

        document.getElementById("courseCount").textContent = data.courses;
        document.getElementById("assignmentCount").textContent = data.assignments;
        document.getElementById("attendancePercent").textContent =
            data.attendance + "%";

    } catch (error) {
        console.error(error.message);
    }
}

// COURSES
async function loadCourses() {
    try {
        const result = await apiRequest("/courses");
        const list = document.getElementById("courseList");

        list.innerHTML = "";

        result.data.forEach(course => {
            list.innerHTML += `
                <div class="col-md-4">
                    <div class="dashboard-card">
                        <h5>${escapeHTML(course.title)}</h5>
                        <p>${escapeHTML(course.description)}</p>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        alert(error.message);
    }
}

// ATTENDANCE
async function loadAttendance() {
    try {
        const result = await apiRequest("/attendance");
        const list = document.getElementById("attendanceList");

        list.innerHTML = "";

        result.data.forEach(item => {
            const percent = item.total_classes
                ? ((item.present / item.total_classes) * 100).toFixed(1)
                : 0;

            list.innerHTML += `
                <tr>
                    <td>${escapeHTML(item.subject)}</td>
                    <td>${item.total_classes}</td>
                    <td>${item.present}</td>
                    <td>${percent}%</td>
                </tr>
            `;
        });

    } catch (error) {
        alert(error.message);
    }
}

// ASSIGNMENTS
async function loadAssignments() {
    try {
        const result = await apiRequest("/assignments");
        const list = document.getElementById("assignmentList");

        list.innerHTML = "";

        result.data.forEach(item => {
            list.innerHTML += `
                <tr>
                    <td>${escapeHTML(item.title)}</td>
                    <td>${escapeHTML(item.subject)}</td>
                    <td>${escapeHTML(String(item.due_date).slice(0, 10))}</td>
                </tr>
            `;
        });

    } catch (error) {
        alert(error.message);
    }
}

// RESULTS
async function loadResults() {
    try {
        const result = await apiRequest("/results");
        const list = document.getElementById("resultList");

        list.innerHTML = "";

        result.data.forEach(item => {
            list.innerHTML += `
                <tr>
                    <td>${escapeHTML(item.subject)}</td>
                    <td>${item.marks}</td>
                    <td>${escapeHTML(item.grade)}</td>
                </tr>
            `;
        });

    } catch (error) {
        alert(error.message);
    }
}

// PROFILE
async function loadProfile() {
    try {
        const result = await apiRequest("/me");
        const user = result.user;

        document.getElementById("profileName").textContent = user.name;
        document.getElementById("profileEmail").textContent = user.email;
        document.getElementById("profilePhone").textContent = user.phone;
        document.getElementById("profileRole").textContent = user.role;

    } catch (error) {
        alert(error.message);
    }
}

// ADD COURSE - ADMIN
document.getElementById("courseForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const result = await apiRequest("/courses", "POST", {
            title: document.getElementById("courseTitle").value,
            description: document.getElementById("courseDescription").value
        });

        document.getElementById("adminMessage").textContent = result.message;
        document.getElementById("adminMessage").style.color = "green";

        event.target.reset();

    } catch (error) {
        alert(error.message);
    }
});

// ADD ASSIGNMENT - ADMIN
document.getElementById("assignmentForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const result = await apiRequest("/assignments", "POST", {
            title: document.getElementById("assignmentTitle").value,
            subject: document.getElementById("assignmentSubject").value,
            due_date: document.getElementById("assignmentDate").value
        });

        document.getElementById("adminMessage").textContent = result.message;
        document.getElementById("adminMessage").style.color = "green";

        event.target.reset();

    } catch (error) {
        alert(error.message);
    }
});

// LOGOUT
document.getElementById("logoutButton").addEventListener("click", async event => {
    event.preventDefault();

    try {
        await apiRequest("/logout", "POST");

        document.getElementById("publicNav").classList.remove("d-none");
        document.getElementById("adminLink").classList.add("d-none");

        showSection("home");

    } catch (error) {
        alert(error.message);
    }
});

// SAFE HTML OUTPUT
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// CHECK EXISTING LOGIN SESSION
async function checkLogin() {
    try {
        const result = await apiRequest("/me");
        showDashboard(result.user);
    } catch {
        showSection("home");
    }
}

checkLogin();
