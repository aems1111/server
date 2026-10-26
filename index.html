"use strict";

/*
 * AMS DEMO
 *
 * این نسخه صرفاً نمایشی است.
 * اطلاعات حساب‌ها و آمار در کد عمومی قرار دارند؛
 * بنابراین از رمز عبور واقعی استفاده نکن.
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

const $ = (selector) => document.querySelector(selector);

const loginScreen = $("#loginScreen");
const dashboardScreen = $("#dashboardScreen");
const loginForm = $("#loginForm");
const loginError = $("#loginError");
const usernameInput = $("#username");
const passwordInput = $("#password");

let currentUser = null;

function formatNumber(value) {
    return new Intl.NumberFormat("fa-IR").format(value);
}

function getGlobalStats() {
    const totalSales = USERS.reduce(
        (sum, user) => sum + user.stats.sales,
        0
    );

    const totalHours = USERS.reduce(
        (sum, user) => sum + user.stats.hours,
        0
    );

    const averageScore = Math.round(
        USERS.reduce((sum, user) => sum + user.stats.score, 0) /
        USERS.length
    );

    return {
        employees: USERS.length,
        sales: totalSales,
        hours: totalHours,
        averageScore
    };
}

function showLogin() {
    currentUser = null;
    dashboardScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    loginForm.reset();
    loginError.textContent = "";
    usernameInput.focus();
}

function showDashboard(user) {
    currentUser = user;

    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");

    $("#employeeName").textContent = user.name;
    $("#employeeId").textContent = user.employeeId;
    $("#lastUpdated").textContent = new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date());

    renderPersonalStats(user);
    renderGlobalStats();
    renderEmployeesTable();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPersonalStats(user) {
    const stats = user.stats;

    const cards = [
        {
            label: "تعداد فروش",
            value: formatNumber(stats.sales),
            description: "مجموع فروش ثبت‌شده در اطلاعات نمایشی",
            icon: "↗",
            color: "blue"
        },
        {
            label: "ساعت کاری",
            value: formatNumber(stats.hours),
            description: "مجموع ساعات کاری ثبت‌شده",
            icon: "◷",
            color: "green"
        },
        {
            label: "امتیاز عملکرد",
            value: formatNumber(stats.score) + "٪",
            description: "شاخص نمایشی ارزیابی عملکرد",
            icon: "◇",
            color: "orange"
        }
    ];

    $("#personalStats").innerHTML = cards.map((card) => `
        <article class="stat-card ${card.color}">
            <div class="stat-top">
                <span class="stat-label">${card.label}</span>
                <span class="stat-icon">${card.icon}</span>
            </div>
            <div class="stat-value">${card.value}</div>
            <div class="stat-description">${card.description}</div>
        </article>
    `).join("");
}

function renderGlobalStats() {
    const stats = getGlobalStats();

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
            unit: "میانگین امتیاز"
        }
    ];

    $("#globalStats").innerHTML = cards.map((card) => `
        <article class="global-card">
            <div class="global-label">${card.label}</div>
            <div class="global-value">${card.value}</div>
            <div class="global-unit">${card.unit}</div>
        </article>
    `).join("");
}

function renderEmployeesTable() {
    const sortedUsers = [...USERS].sort(
        (a, b) => b.stats.score - a.stats.score
    );

    $("#employeesTable").innerHTML = sortedUsers.map((user) => `
        <tr>
            <td>
                <div class="employee-cell">
                    <div class="employee-avatar">${user.name.charAt(0)}</div>
                    <div>
                        <div class="employee-name">${user.name}</div>
                        <div class="employee-role">کارمند مجموعه</div>
                    </div>
                </div>
            </td>
            <td>${user.employeeId}</td>
            <td>${formatNumber(user.stats.sales)}</td>
            <td>${formatNumber(user.stats.hours)}</td>
            <td><span class="score-pill">${formatNumber(user.stats.score)}٪</span></td>
        </tr>
    `).join("");
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const user = USERS.find((candidate) =>
        candidate.username === username &&
        candidate.password === password
    );

    if (!user) {
        loginError.textContent = "نام کاربری یا رمز عبور صحیح نیست.";
        passwordInput.value = "";
        passwordInput.focus();
        return;
    }

    loginError.textContent = "";
    showDashboard(user);
});

$("#logoutButton").addEventListener("click", showLogin);

$("#togglePassword").addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    $("#togglePassword").setAttribute(
        "aria-label",
        isPassword ? "مخفی‌کردن رمز عبور" : "نمایش رمز عبور"
    );
});

usernameInput.addEventListener("input", () => {
    loginError.textContent = "";
});

passwordInput.addEventListener("input", () => {
    loginError.textContent = "";
});

showLogin();
