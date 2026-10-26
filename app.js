"use strict";

/*
 * AMS DEMO VERSION
 *
 * این نسخه فقط نمایشی است.
 * اطلاعات حساب‌ها داخل کد عمومی قرار دارند.
 * برای کاربران واقعی از این روش احراز هویت استفاده نکن.
 */

const USERS = [
    {
        username: "employee1",
        password: "ams123",
        name: "علی رضایی",
        employeeId: "AMS-001",
        stats: {
            sales: 125,
            hours: 168,
            score: 92
        }
    },
    {
        username: "employee2",
        password: "ams456",
        name: "سارا احمدی",
        employeeId: "AMS-002",
        stats: {
            sales: 98,
            hours: 154,
            score: 86
        }
    },
    {
        username: "employee3",
        password: "ams789",
        name: "محمد کریمی",
        employeeId: "AMS-003",
        stats: {
            sales: 143,
            hours: 176,
            score: 96
        }
    }
];

const getElement = (id) => document.getElementById(id);

const loginScreen = getElement("loginScreen");
const dashboardScreen = getElement("dashboardScreen");
const loginForm = getElement("loginForm");
const usernameInput = getElement("username");
const passwordInput = getElement("password");
const loginError = getElement("loginError");
const loginButton = getElement("loginButton");

let currentUser = null;

function formatNumber(value) {
    return new Intl.NumberFormat("fa-IR").format(value);
}

function calculateGlobalStats() {
    const totalSales = USERS.reduce(
        (sum, user) => sum + user.stats.sales,
        0
    );

    const totalHours = USERS.reduce(
        (sum, user) => sum + user.stats.hours,
        0
    );

    const averageScore = Math.round(
        USERS.reduce(
            (sum, user) => sum + user.stats.score,
            0
        ) / USERS.length
    );

    return {
        employees: USERS.length,
        sales: totalSales,
        hours: totalHours,
        averageScore
    };
}

function setLoginError(message) {
    loginError.textContent = message;
}

function openDashboard(user) {
    currentUser = user;

    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");

    getElement("employeeName").textContent = user.name;
    getElement("employeeId").textContent = user.employeeId;

    getElement("lastUpdated").textContent =
        "آخرین نمایش: " +
        new Intl.DateTimeFormat("fa-IR", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date());

    renderPersonalStats(user);
    renderGlobalStats();
    renderEmployeeTable();

    window.scrollTo(0, 0);
}

function logout() {
    currentUser = null;

    dashboardScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    loginForm.reset();
    setLoginError("");

    window.scrollTo(0, 0);
    usernameInput.focus();
}

function renderPersonalStats(user) {
    const stats = user.stats;

    const cards = [
        {
            label: "تعداد فروش",
            value: formatNumber(stats.sales),
            description: "مجموع فروش ثبت‌شده",
            icon: "↗",
            color: "blue"
        },
        {
            label: "ساعت کاری",
            value: formatNumber(stats.hours),
            description: "مجموع ساعات کاری",
            icon: "◷",
            color: "green"
        },
        {
            label: "امتیاز عملکرد",
            value: formatNumber(stats.score) + "٪",
            description: "شاخص ارزیابی نمایشی",
            icon: "◇",
            color: "orange"
        }
    ];

    getElement("personalStats").replaceChildren();

    for (const card of cards) {
        const article = document.createElement("article");
        article.className = `personal-card ${card.color}`;

        const top = document.createElement("div");
        top.className = "card-top";

        const label = document.createElement("span");
        label.className = "card-label";
        label.textContent = card.label;

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.textContent = card.icon;

        const value = document.createElement("div");
        value.className = "card-value";
        value.textContent = card.value;

        const description = document.createElement("div");
        description.className = "card-description";
        description.textContent = card.description;

        top.append(label, icon);
        article.append(top, value, description);

        getElement("personalStats").appendChild(article);
    }
}

function renderGlobalStats() {
    const stats = calculateGlobalStats();

    const cards = [
        {
            label: "تعداد کل کارمندان",
            value: formatNumber(stats.employees),
            unit: "نفر"
        },
        {
            label: "مجموع فروش",
            value: formatNumber(stats.sales),
            unit: "فروش ثبت‌شده"
        },
        {
            label: "مجموع ساعت کاری",
            value: formatNumber(stats.hours),
            unit: "ساعت"
        },
        {
            label: "میانگین عملکرد",
            value: formatNumber(stats.averageScore) + "٪",
            unit: "میانگین امتیاز تیم"
        }
    ];

    getElement("globalStats").replaceChildren();

    for (const card of cards) {
        const article = document.createElement("article");
        article.className = "global-card";

        const label = document.createElement("div");
        label.className = "global-label";
        label.textContent = card.label;

        const value = document.createElement("div");
        value.className = "global-value";
        value.textContent = card.value;

        const unit = document.createElement("div");
        unit.className = "global-unit";
        unit.textContent = card.unit;

        article.append(label, value, unit);
        getElement("globalStats").appendChild(article);
    }
}

function renderEmployeeTable() {
    const tbody = getElement("employeesTable");
    tbody.replaceChildren();

    const sortedUsers = [...USERS].sort(
        (a, b) => b.stats.score - a.stats.score
    );

    for (const user of sortedUsers) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        const employeeCell = document.createElement("div");
        employeeCell.className = "employee-cell";

        const avatar = document.createElement("div");
        avatar.className = "employee-avatar";
        avatar.textContent = user.name.charAt(0);

        const nameWrapper = document.createElement("div");

        const name = document.createElement("div");
        name.className = "employee-name";
        name.textContent = user.name;

        const role = document.createElement("div");
        role.className = "employee-role";
        role.textContent = "کارمند مجموعه";

        nameWrapper.append(name, role);
        employeeCell.append(avatar, nameWrapper);
        nameCell.appendChild(employeeCell);

        const idCell = document.createElement("td");
        idCell.textContent = user.employeeId;

        const salesCell = document.createElement("td");
        salesCell.textContent = formatNumber(user.stats.sales);

        const hoursCell = document.createElement("td");
        hoursCell.textContent = formatNumber(user.stats.hours);

        const scoreCell = document.createElement("td");
        const score = document.createElement("span");
        score.className = "score-cell";
        score.textContent = formatNumber(user.stats.score) + "٪";
        scoreCell.appendChild(score);

        row.append(
            nameCell,
            idCell,
            salesCell,
            hoursCell,
            scoreCell
        );

        tbody.appendChild(row);
    }
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    setLoginError("");

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!username || !password) {
        setLoginError("لطفاً نام کاربری و رمز عبور را وارد کن.");
        return;
    }

    const user = USERS.find((account) =>
        account.username === username &&
        account.password === password
    );

    if (!user) {
        setLoginError(
            "نام کاربری یا رمز عبور اشتباه است. اطلاعات حساب نمایشی را بررسی کن."
        );

        passwordInput.value = "";
        passwordInput.focus();
        return;
    }

    openDashboard(user);
});

getElement("togglePassword").addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";

    passwordInput.type = showPassword ? "text" : "password";

    getElement("togglePassword").setAttribute(
        "aria-label",
        showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"
    );
});

getElement("logoutButton").addEventListener("click", logout);

document.querySelectorAll(".demo-account").forEach((button) => {
    button.addEventListener("click", () => {
        usernameInput.value = button.dataset.user;
        passwordInput.value = button.dataset.pass;

        setLoginError("");

        loginForm.requestSubmit();
    });
});

usernameInput.addEventListener("input", () => {
    setLoginError("");
});

passwordInput.addEventListener("input", () => {
    setLoginError("");
});

/* شروع برنامه */
loginScreen.classList.remove("hidden");
dashboardScreen.classList.add("hidden");
