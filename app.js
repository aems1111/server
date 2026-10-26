"use strict";

/* =========================================================
   EMPLOYEE MANAGEMENT SYSTEM
   HTML + CSS + JavaScript
   Demo storage: localStorage
   ========================================================= */

const STORAGE = {
    employees: "employee_dashboard_employees_v1",
    password: "employee_dashboard_demo_password_v1"
};

const DEFAULT_PASSWORD = "1234";

const SAMPLE_EMPLOYEES = [
    {
        id: "emp_1001",
        name: "علی رضایی",
        role: "برنامه‌نویس ارشد",
        income: 45000000,
        bonus: 5000000,
        status: "paid"
    },
    {
        id: "emp_1002",
        name: "سارا محمدی",
        role: "طراح رابط کاربری",
        income: 35000000,
        bonus: 3000000,
        status: "paid"
    },
    {
        id: "emp_1003",
        name: "محمد کریمی",
        role: "مدیر پروژه",
        income: 55000000,
        bonus: 7000000,
        status: "unpaid"
    },
    {
        id: "emp_1004",
        name: "نیما احمدی",
        role: "توسعه‌دهنده وب",
        income: 30000000,
        bonus: 2000000,
        status: "unpaid"
    },
    {
        id: "emp_1005",
        name: "نگار حسینی",
        role: "مدیر بازاریابی",
        income: 40000000,
        bonus: 4000000,
        status: "paid"
    }
];

let employees = [];
let isAdmin = false;
let toastTimer = null;

/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => Array.from(
    document.querySelectorAll(selector)
);

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function formatNumber(value) {
    return new Intl.NumberFormat("fa-IR").format(
        Number(value) || 0
    );
}

function formatMoney(value) {
    return formatNumber(value) + " تومان";
}

function employeeTotal(employee) {
    return employee.income + employee.bonus;
}

function initials(name) {
    const parts = String(name).trim().split(/\s+/);

    return parts
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join("") || "?";
}

function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "emp_" + window.crypto.randomUUID();
    }

    return "emp_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 10);
}

function showToast(message) {
    const toast = $("#toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/* =========================================================
   STORAGE
   ========================================================= */

function validEmployee(employee) {
    if (!employee || typeof employee !== "object") {
        return false;
    }

    if (
        typeof employee.id !== "string" ||
        typeof employee.name !== "string" ||
        typeof employee.role !== "string"
    ) {
        return false;
    }

    if (
        !Number.isSafeInteger(employee.income) ||
        !Number.isSafeInteger(employee.bonus) ||
        employee.income < 0 ||
        employee.bonus < 0 ||
        employee.income > 1000000000000 ||
        employee.bonus > 1000000000000
    ) {
        return false;
    }

    return employee.status === "paid" ||
           employee.status === "unpaid";
}

function loadEmployees() {
    try {
        const saved = localStorage.getItem(STORAGE.employees);

        if (saved === null) {
            employees = SAMPLE_EMPLOYEES.map(employee => ({
                ...employee
            }));

            saveEmployees();
            return;
        }

        const parsed = JSON.parse(saved);

        if (
            !Array.isArray(parsed) ||
            !parsed.every(validEmployee)
        ) {
            throw new Error("Invalid employee data");
        }

        employees = parsed;

    } catch (error) {
        console.error("Failed to load employees:", error);

        employees = SAMPLE_EMPLOYEES.map(employee => ({
            ...employee
        }));

        showToast(
            "اطلاعات ذخیره‌شده قابل خواندن نبود؛ داده‌های نمونه بارگذاری شدند."
        );
    }
}

function saveEmployees() {
    try {
        localStorage.setItem(
            STORAGE.employees,
            JSON.stringify(employees)
        );

        return true;

    } catch (error) {
        console.error("Failed to save employees:", error);

        showToast(
            "ذخیره‌سازی انجام نشد. فضای مرورگر را بررسی کنید."
        );

        return false;
    }
}

function getAdminPassword() {
    try {
        return localStorage.getItem(STORAGE.password) ||
            DEFAULT_PASSWORD;
    } catch (error) {
        return DEFAULT_PASSWORD;
    }
}

function saveAdminPassword(password) {
    try {
        localStorage.setItem(STORAGE.password, password);
        return true;
    } catch (error) {
        showToast("ذخیره رمز امکان‌پذیر نبود.");
        return false;
    }
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const input = modal.querySelector("input");

    if (input) {
        setTimeout(() => input.focus(), 50);
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("hidden");

    const anyOpen = $$(".modal-backdrop").some(
        element => !element.classList.contains("hidden")
    );

    if (!anyOpen) {
        document.body.style.overflow = "";
    }
}

function closeAllModals() {
    $$(".modal-backdrop").forEach(modal => {
        modal.classList.add("hidden");
    });

    document.body.style.overflow = "";
}

$$("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

$$(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) {
            closeModal(backdrop.id);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        const openModals = $$(".modal-backdrop").filter(
            modal => !modal.classList.contains("hidden")
        );

        if (openModals.length) {
            closeModal(openModals[openModals.length - 1].id);
        }
    }
});

/* =========================================================
   ADMIN AUTHENTICATION - DEMO ONLY
   ========================================================= */

function openAdminEntry() {
    if (isAdmin) {
        openModal("adminModal");
    } else {
        $("#loginError").textContent = "";
        $("#adminPassword").value = "";
        openModal("loginModal");
    }
}

$("#openAdmin").addEventListener("click", openAdminEntry);
$("#topAdmin").addEventListener("click", openAdminEntry);

$("#loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const password = $("#adminPassword").value;

    if (password !== getAdminPassword()) {
        $("#loginError").textContent =
            "رمز عبور اشتباه است. دوباره تلاش کنید.";

        return;
    }

    isAdmin = true;

    $("#loginError").textContent = "";

    closeModal("loginModal");
    updateAdminUI();
    openModal("adminModal");

    showToast("ورود نمایشی به پنل مدیریت انجام شد.");
});

function logoutAdmin() {
    isAdmin = false;

    closeModal("adminModal");

    updateAdminUI();

    showToast("از پنل مدیریت خارج شدید.");
}

$("#adminLogout").addEventListener("click", logoutAdmin);

function requireAdmin() {
    if (!isAdmin) {
        showToast("برای انجام این عملیات وارد پنل مدیریت شوید.");
        openAdminEntry();
        return false;
    }

    return true;
}

function updateAdminUI() {
    $$(".admin-required").forEach(button => {
        button.disabled = !isAdmin;
        button.title = isAdmin
            ? ""
            : "ابتدا وارد پنل مدیریت شوید";
    });

    $("#topAdmin").textContent = isAdmin ? "AD" : "؟";
}

/* =========================================================
   CHANGE DEMO PASSWORD
   ========================================================= */

$("#changePasswordBtn").addEventListener("click", () => {
    if (!requireAdmin()) return;

    $("#newPassword").value = "";
    $("#passwordError").textContent = "";

    openModal("passwordModal");
});

$("#passwordForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const password = $("#newPassword").value;

    if (password.length < 4) {
        $("#passwordError").textContent =
            "رمز باید حداقل ۴ نویسه داشته باشد.";

        return;
    }

    if (!saveAdminPassword(password)) return;

    closeModal("passwordModal");

    showToast("رمز نمایشی جدید ذخیره شد.");
});

/* =========================================================
   NAVIGATION
   ========================================================= */

const PAGE_INFO = {
    dashboard: {
        title: "داشبورد مدیریتی",
        subtitle: "گزارش عملکرد و درآمد کارمندان"
    },

    employees: {
        title: "مدیریت کارمندان",
        subtitle: "مشاهده و مدیریت اطلاعات کارمندان"
    },

    reports: {
        title: "گزارش درآمد",
        subtitle: "خلاصه مالی و گزارش پرداخت‌ها"
    }
};

function navigateTo(page) {
    if (!PAGE_INFO[page]) return;

    $$(".page-section").forEach(section => {
        section.classList.add("hidden");
    });

    const target = document.getElementById(page + "Page");

    if (target) {
        target.classList.remove("hidden");
    }

    $$(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    $("#pageTitle").textContent = PAGE_INFO[page].title;
    $("#pageSubtitle").textContent = PAGE_INFO[page].subtitle;

    if (page === "employees") {
        renderEmployeesTable();
    }

    if (page === "reports") {
        renderReports();
    }
}

$$(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.page);
    });
});

$("#goEmployees").addEventListener("click", () => {
    navigateTo("employees");
});

$("#viewAllEmployees").addEventListener("click", () => {
    navigateTo("employees");
});

/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

function calculateStats() {
    const count = employees.length;

    const baseIncome = employees.reduce(
        (sum, employee) => sum + employee.income,
        0
    );

    const totalBonus = employees.reduce(
        (sum, employee) => sum + employee.bonus,
        0
    );

    const total = baseIncome + totalBonus;

    const paidEmployees = employees.filter(
        employee => employee.status === "paid"
    );

    const unpaidEmployees = employees.filter(
        employee => employee.status === "unpaid"
    );

    const paidTotal = paidEmployees.reduce(
        (sum, employee) => sum + employeeTotal(employee),
        0
    );

    const remaining = total - paidTotal;

    const topEmployee = employees.reduce(
        (top, employee) => {
            if (!top || employeeTotal(employee) > employeeTotal(top)) {
                return employee;
            }

            return top;
        },
        null
    );

    return {
        count,
        baseIncome,
        totalBonus,
        total,
        average: count ? Math.round(baseIncome / count) : 0,
        paidEmployees,
        unpaidEmployees,
        paidTotal,
        remaining,
        topEmployee
    };
}

function renderDashboard() {
    const stats = calculateStats();

    $("#totalIncome").textContent = formatMoney(stats.baseIncome);
    $("#employeeCount").textContent = formatNumber(stats.count);
    $("#averageIncome").textContent = formatMoney(stats.average);

    $("#topEmployee").textContent = stats.topEmployee
        ? stats.topEmployee.name
        : "—";

    $("#topEmployeeIncome").textContent = stats.topEmployee
        ? formatMoney(employeeTotal(stats.topEmployee))
        : "هنوز اطلاعاتی ثبت نشده است";

    $("#paidTotal").textContent = formatMoney(stats.paidTotal);

    $("#paidCount").textContent = formatNumber(
        stats.paidEmployees.length
    );

    $("#unpaidCount").textContent = formatNumber(
        stats.unpaidEmployees.length
    );

    const paymentPercent = stats.total > 0
        ? Math.round((stats.paidTotal / stats.total) * 100)
        : 0;

    $("#paymentProgress").style.width = paymentPercent + "%";
    $("#paymentPercent").textContent = formatNumber(paymentPercent) + "٪";

    renderIncomeChart();
    renderRecentEmployees();
}

/* =========================================================
   INCOME CHART
   ========================================================= */

function renderIncomeChart() {
    const chart = $("#incomeChart");

    if (employees.length === 0) {
        chart.innerHTML =
            '<div class="empty-state">هنوز اطلاعاتی وجود ندارد.</div>';

        return;
    }

    const sorted = [...employees]
        .sort((a, b) => employeeTotal(b) - employeeTotal(a))
        .slice(0, 8);

    const maxIncome = Math.max(
        ...sorted.map(employeeTotal),
        1
    );

    chart.innerHTML = sorted.map(employee => {
        const percentage = Math.max(
            3,
            (employeeTotal(employee) / maxIncome) * 100
        );

        return `
            <div class="chart-column"
                 title="${escapeHTML(employee.name)}: ${formatMoney(employeeTotal(employee))}">

                <span class="chart-value">
                    ${formatNumber(employeeTotal(employee))}
                </span>

                <div class="chart-bar-wrap">
                    <div class="chart-bar"
                         style="height:${percentage}%"></div>
                </div>

                <span class="chart-name">
                    ${escapeHTML(employee.name)}
                </span>
            </div>
        `;
    }).join("");
}

/* =========================================================
   EMPLOYEE TABLES
   ========================================================= */

function employeeCell(employee) {
    return `
        <div class="employee-cell">
            <div class="employee-avatar">
                ${escapeHTML(initials(employee.name))}
            </div>

            <div>
                <strong>${escapeHTML(employee.name)}</strong>
                <small>${escapeHTML(employee.id)}</small>
            </div>
        </div>
    `;
}

function paymentStatus(employee) {
    if (employee.status === "paid") {
        return '<span class="status paid">پرداخت‌شده</span>';
    }

    return '<span class="status unpaid">در انتظار پرداخت</span>';
}

function renderRecentEmployees() {
    const tbody = $("#recentEmployees");

    const recent = [...employees]
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">هیچ کارمندی ثبت نشده است.</td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = recent.map(employee => `
        <tr>
            <td>${employeeCell(employee)}</td>
            <td>${escapeHTML(employee.role)}</td>
            <td>${formatMoney(employee.income)}</td>
            <td>${formatMoney(employee.bonus)}</td>
            <td>${paymentStatus(employee)}</td>
        </tr>
    `).join("");
}

function renderEmployeesTable() {
    const tbody = $("#allEmployees");

    const search = $("#employeeSearch").value
        .trim()
        .toLocaleLowerCase("fa");

    const filter = $("#statusFilter").value;

    const filtered = employees.filter(employee => {
        const searchable = (
            employee.name + " " + employee.role
        ).toLocaleLowerCase("fa");

        const matchesSearch = searchable.includes(search);

        const matchesStatus = filter === "all" ||
            employee.status === filter;

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">کارمندی با این مشخصات پیدا نشد.</td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filtered.map(employee => `
        <tr>
            <td>${employeeCell(employee)}</td>

            <td>${escapeHTML(employee.role)}</td>

            <td>${formatMoney(employee.income)}</td>

            <td>${formatMoney(employee.bonus)}</td>

            <td>${paymentStatus(employee)}</td>

            <td>
                <div class="action-buttons">

                    <button
                        class="small-button"
                        data-action="edit"
                        data-id="${escapeHTML(employee.id)}"
                        ${isAdmin ? "" : "disabled"}>
                        ویرایش
                    </button>

                    <button
                        class="small-button delete"
                        data-action="delete"
                        data-id="${escapeHTML(employee.id)}"
                        ${isAdmin ? "" : "disabled"}>
                        حذف
                    </button>

                </div>
            </td>
        </tr>
    `).join("");
}

$("#employeeSearch").addEventListener("input", renderEmployeesTable);
$("#statusFilter").addEventListener("change", renderEmployeesTable);

/* =========================================================
   EMPLOYEE CREATE / EDIT
   ========================================================= */

function openEmployeeForm(employee = null) {
    if (!requireAdmin()) return;

    $("#employeeForm").reset();

    $("#employeeError").textContent = "";

    $("#employeeId").value = employee ? employee.id : "";

    $("#employeeModalTitle").textContent = employee
        ? "ویرایش اطلاعات کارمند"
        : "افزودن کارمند جدید";

    $("#employeeName").value = employee ? employee.name : "";
    $("#employeeRole").value = employee ? employee.role : "";

    $("#employeeIncome").value = employee
        ? employee.income
        : "";

    $("#employeeBonus").value = employee
        ? employee.bonus
        : 0;

    $("#employeeStatus").value = employee
        ? employee.status
        : "unpaid";

    closeModal("adminModal");
    openModal("employeeModal");
}

$("#addEmployeeBtn").addEventListener("click", () => {
    openEmployeeForm();
});

$("#adminAddEmployee").addEventListener("click", () => {
    openEmployeeForm();
});

$("#adminManageEmployees").addEventListener("click", () => {
    closeModal("adminModal");
    navigateTo("employees");

    if (!isAdmin) {
        openAdminEntry();
    }
});

function readMoneyInput(selector) {
    const raw = $(selector).value.trim();

    if (raw === "") return null;

    const value = Number(raw);

    if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 1000000000000
    ) {
        return null;
    }

    return value;
}

$("#employeeForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const name = $("#employeeName").value.trim();
    const role = $("#employeeRole").value.trim();

    const income = readMoneyInput("#employeeIncome");
    const bonus = readMoneyInput("#employeeBonus");

    const status = $("#employeeStatus").value;
    const id = $("#employeeId").value;

    if (!name || !role) {
        $("#employeeError").textContent =
            "نام و سمت کارمند را وارد کنید.";

        return;
    }

    if (income === null || bonus === null) {
        $("#employeeError").textContent =
            "درآمد و پاداش باید عدد صحیح و غیرمنفی باشند.";

        return;
    }

    if (income + bonus > Number.MAX_SAFE_INTEGER) {
        $("#employeeError").textContent =
            "مجموع درآمد و پاداش بیش از حد مجاز است.";

        return;
    }

    const existingIndex = id
        ? employees.findIndex(employee => employee.id === id)
        : -1;

    const employee = {
        id: id || generateId(),
        name,
        role,
        income,
        bonus,
        status
    };

    let nextEmployees;

    if (existingIndex >= 0) {
        nextEmployees = [...employees];
        nextEmployees[existingIndex] = employee;
    } else {
        nextEmployees = [...employees, employee];
    }

    const previousEmployees = employees;

    employees = nextEmployees;

    if (!saveEmployees()) {
        employees = previousEmployees;
        return;
    }

    closeModal("employeeModal");

    refreshUI();

    showToast(
        existingIndex >= 0
            ? "اطلاعات کارمند به‌روزرسانی شد."
            : "کارمند جدید ثبت شد."
    );
});

/* =========================================================
   EMPLOYEE EDIT / DELETE ACTIONS
   ========================================================= */

$("#allEmployees").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    if (!requireAdmin()) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const employee = employees.find(item => item.id === id);

    if (!employee) {
        showToast("کارمند موردنظر پیدا نشد.");
        return;
    }

    if (action === "edit") {
        openEmployeeForm(employee);
        return;
    }

    if (action === "delete") {
        const confirmed = window.confirm(
            `آیا مطمئن هستید که می‌خواهید اطلاعات «${employee.name}» را حذف کنید؟`
        );

        if (!confirmed) return;

        const previousEmployees = employees;

        employees = employees.filter(item => item.id !== id);

        if (!saveEmployees()) {
            employees = previousEmployees;
            return;
        }

        refreshUI();

        showToast("اطلاعات کارمند حذف شد.");
    }
});

/* =========================================================
   REPORTS
   ========================================================= */

function renderReports() {
    const stats = calculateStats();

    $("#reportBase").textContent = formatMoney(stats.baseIncome);
    $("#reportBonus").textContent = formatMoney(stats.totalBonus);
    $("#reportTotal").textContent = formatMoney(stats.total);
    $("#reportRemaining").textContent = formatMoney(stats.remaining);

    const tbody = $("#reportEmployees");

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">اطلاعاتی برای گزارش وجود ندارد.</td>
            </tr>
        `;

        return;
    }

    const sorted = [...employees].sort(
        (a, b) => employeeTotal(b) - employeeTotal(a)
    );

    tbody.innerHTML = sorted.map(employee => `
        <tr>
            <td>${escapeHTML(employee.name)}</td>
            <td>${formatMoney(employee.income)}</td>
            <td>${formatMoney(employee.bonus)}</td>
            <td>${formatMoney(employeeTotal(employee))}</td>
            <td>${paymentStatus(employee)}</td>
        </tr>
    `).join("");
}

/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportCSV() {
    if (!requireAdmin()) return;

    const header = [
        "شناسه",
        "نام کارمند",
        "سمت",
        "درآمد ماهانه",
        "پاداش",
        "مجموع",
        "وضعیت پرداخت"
    ];

    const rows = employees.map(employee => [
        employee.id,
        employee.name,
        employee.role,
        employee.income,
        employee.bonus,
        employeeTotal(employee),
        employee.status === "paid"
            ? "پرداخت‌شده"
            : "در انتظار پرداخت"
    ]);

    function csvEscape(value) {
        const text = String(value ?? "");

        return '"' + text.replace(/"/g, '""') + '"';
    }

    const csv = "\uFEFF" + [header, ...rows]
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    link.download = "employee-income-report.csv";

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("فایل گزارش آماده شد.");
}

$("#exportCSV").addEventListener("click", exportCSV);
$("#adminExport").addEventListener("click", exportCSV);

/* =========================================================
   REFRESH ALL UI
   ========================================================= */

function refreshUI() {
    renderDashboard();
    renderEmployeesTable();
    renderReports();
}

/* =========================================================
   DATE
   ========================================================= */

function renderDate() {
    const now = new Date();

    $("#todayDate").textContent = new Intl.DateTimeFormat(
        "fa-IR",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(now);
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeApp() {
    loadEmployees();

    renderDate();

    updateAdminUI();

    refreshUI();

    navigateTo("dashboard");

    console.info(
        "Employee Management System initialized."
    );
}

initializeApp();
