"use strict";

/*
 * AMS REWARDS
 * نسخه نمایشی با HTML / CSS / JavaScript
 *
 * توجه:
 * localStorage پایگاه داده امن نیست.
 * ورود ادمین در این نسخه صرفاً نمایشی است.
 * دریافت خودکار پیام تلگرام در این نسخه فعال نیست.
 */

const KEYS = {
    users: "ams_rewards_users_v1",
    tasks: "ams_rewards_tasks_v1",
    history: "ams_rewards_history_v1",
    password: "ams_rewards_demo_password_v1"
};

const DEFAULT_PASSWORD = "1234";

let users = [];
let tasks = [];
let history = [];
let isAdmin = false;
let toastTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function number(value) {
    return new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
}

function coins(value) {
    return number(value) + " سکه";
}

function newId(prefix) {
    if (crypto.randomUUID) {
        return prefix + "_" + crypto.randomUUID();
    }

    return prefix + "_" + Date.now() + "_" +
        Math.random().toString(36).slice(2);
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

function initials(name) {
    return String(name).trim().split(/\s+/)
        .slice(0, 2)
        .map(word => word[0] || "")
        .join("") || "?";
}

/* ======================================================
   ذخیره‌سازی
   ====================================================== */

function readArray(key, validator) {
    try {
        const raw = localStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        const data = JSON.parse(raw);

        if (!Array.isArray(data) || !data.every(validator)) {
            throw new Error("Invalid stored data");
        }

        return data;
    } catch (error) {
        console.error("Storage read error:", key, error);
        return null;
    }
}

function validUser(user) {
    return user &&
        typeof user.id === "string" &&
        typeof user.externalId === "string" &&
        typeof user.name === "string" &&
        typeof user.handle === "string" &&
        Number.isSafeInteger(user.coins) &&
        user.coins >= 0 &&
        user.coins <= 1000000000000000;
}

function validTask(task) {
    return task &&
        typeof task.id === "string" &&
        typeof task.name === "string" &&
        typeof task.description === "string" &&
        Number.isSafeInteger(task.reward) &&
        task.reward >= 1 &&
        task.reward <= 1000000000 &&
        typeof task.active === "boolean";
}

function validHistory(entry) {
    return entry &&
        typeof entry.id === "string" &&
        typeof entry.userId === "string" &&
        typeof entry.taskId === "string" &&
        typeof entry.taskName === "string" &&
        Number.isSafeInteger(entry.coins) &&
        entry.coins >= 1 &&
        typeof entry.reference === "string" &&
        typeof entry.note === "string" &&
        typeof entry.date === "string";
}

function persistAll(nextUsers, nextTasks, nextHistory) {
    /*
     * localStorage تراکنش واقعی ندارد.
     * نسخه قبلی حفظ می‌شود تا اگر ذخیره شکست خورد،
     * بتوانیم تا حد ممکن اطلاعات را برگردانیم.
     */
    const previous = {};

    for (const key of [KEYS.users, KEYS.tasks, KEYS.history]) {
        previous[key] = localStorage.getItem(key);
    }

    try {
        localStorage.setItem(KEYS.users, JSON.stringify(nextUsers));
        localStorage.setItem(KEYS.tasks, JSON.stringify(nextTasks));
        localStorage.setItem(KEYS.history, JSON.stringify(nextHistory));

        users = nextUsers;
        tasks = nextTasks;
        history = nextHistory;

        return true;
    } catch (error) {
        console.error("Storage write error:", error);

        for (const key of Object.keys(previous)) {
            try {
                if (previous[key] === null) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, previous[key]);
                }
            } catch (restoreError) {
                console.error("Restore error:", restoreError);
            }
        }

        showToast("ذخیره اطلاعات ناموفق بود. فضای مرورگر را بررسی کن.");
        return false;
    }
}

function saveSimple(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        showToast("ذخیره‌سازی انجام نشد.");
        return false;
    }
}

function getPassword() {
    try {
        return localStorage.getItem(KEYS.password) || DEFAULT_PASSWORD;
    } catch {
        return DEFAULT_PASSWORD;
    }
}

/* ======================================================
   داده‌های اولیه نمایشی
   ====================================================== */

function initializeData() {
    let storedUsers = readArray(KEYS.users, validUser);
    let storedTasks = readArray(KEYS.tasks, validTask);
    let storedHistory = readArray(KEYS.history, validHistory);

    if (storedUsers === null) {
        storedUsers = [
            {
                id: "user_1001",
                externalId: "AMS-1001",
                name: "علی رضایی",
                handle: "@ali_demo",
                coins: 1500
            },
            {
                id: "user_1002",
                externalId: "AMS-1002",
                name: "سارا محمدی",
                handle: "@sara_demo",
                coins: 850
            },
            {
                id: "user_1003",
                externalId: "AMS-1003",
                name: "محمد کریمی",
                handle: "@mohammad_demo",
                coins: 400
            }
        ];
    }

    if (storedTasks === null) {
        storedTasks = [
            {
                id: "task_1001",
                name: "عضویت در کانال",
                description: "عضویت در کانال رسمی و ارسال گزارش تلگرام",
                reward: 100,
                active: true
            },
            {
                id: "task_1002",
                name: "معرفی پلتفرم",
                description: "معرفی پلتفرم به دوستان و ارائه گزارش",
                reward: 250,
                active: true
            },
            {
                id: "task_1003",
                name: "آزمایش یک قابلیت",
                description: "آزمایش قابلیت تعیین‌شده و ارسال نتیجه",
                reward: 500,
                active: true
            }
        ];
    }

    if (storedHistory === null) {
        storedHistory = [];
    }

    users = storedUsers;
    tasks = storedTasks;
    history = storedHistory;

    /*
     * اگر ذخیره اولیه هنوز انجام نشده باشد،
     * داده‌های نمونه را در مرورگر ثبت می‌کنیم.
     */
    if (localStorage.getItem(KEYS.users) === null) {
        saveSimple(KEYS.users, users);
    }

    if (localStorage.getItem(KEYS.tasks) === null) {
        saveSimple(KEYS.tasks, tasks);
    }

    if (localStorage.getItem(KEYS.history) === null) {
        saveSimple(KEYS.history, history);
    }
}

/* ======================================================
   پنجره‌ها
   ====================================================== */

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const input = modal.querySelector("input, select");

    if (input) {
        setTimeout(() => input.focus(), 40);
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.add("hidden");

    if (!$$(".backdrop").some(el => !el.classList.contains("hidden"))) {
        document.body.style.overflow = "";
    }
}

$$("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

$$(".backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) {
            closeModal(backdrop.id);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    const open = $$(".backdrop").filter(
        modal => !modal.classList.contains("hidden")
    );

    if (open.length) {
        closeModal(open[open.length - 1].id);
    }
});

/* ======================================================
   ورود ادمین
   ====================================================== */

function openAdmin() {
    if (isAdmin) {
        openModal("adminModal");
    } else {
        $("#loginError").textContent = "";
        $("#loginPassword").value = "";
        openModal("loginModal");
    }
}

$("#openAdmin").addEventListener("click", openAdmin);
$("#adminAvatar").addEventListener("click", openAdmin);

$("#loginForm").addEventListener("submit", event => {
    event.preventDefault();

    if ($("#loginPassword").value !== getPassword()) {
        $("#loginError").textContent = "رمز عبور صحیح نیست.";
        return;
    }

    isAdmin = true;

    closeModal("loginModal");
    updateAdminControls();
    openModal("adminModal");

    showToast("ورود به پنل نمایشی انجام شد.");
});

function requireAdmin() {
    if (isAdmin) return true;

    showToast("برای انجام این عملیات وارد پنل مدیریت شو.");
    openAdmin();

    return false;
}

function logout() {
    isAdmin = false;

    closeModal("adminModal");
    updateAdminControls();

    showToast("از پنل مدیریت خارج شدی.");
}

$("#adminLogout").addEventListener("click", logout);

function updateAdminControls() {
    $$(".admin-only").forEach(button => {
        button.disabled = !isAdmin;
    });

    $("#adminAvatar").textContent = isAdmin ? "AD" : "؟";
}

/* ======================================================
   مسیریابی صفحات
   ====================================================== */

const PAGE_INFO = {
    dashboard: ["داشبورد پاداش‌ها", "مدیریت کاربران، وظایف و سکه‌های AMS"],
    users: ["مدیریت کاربران", "مشاهده کاربران و موجودی سکه"],
    tasks: ["مدیریت وظایف", "تعریف وظایف و تعیین پاداش"],
    history: ["تاریخچه پاداش‌ها", "سوابق تأیید وظایف و اختصاص سکه"]
};

function navigate(page) {
    if (!PAGE_INFO[page]) return;

    $$(".page").forEach(section => section.classList.add("hidden"));

    document.getElementById(page + "Page").classList.remove("hidden");

    $$(".nav").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    $("#pageTitle").textContent = PAGE_INFO[page][0];
    $("#pageSubtitle").textContent = PAGE_INFO[page][1];

    if (page === "users") renderUsers();
    if (page === "tasks") renderTasks();
    if (page === "history") renderHistory();
}

$$(".nav").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.page));
});

$$("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
});

/* ======================================================
   محاسبات داشبورد
   ====================================================== */

function totalCoins() {
    return users.reduce((sum, user) => sum + user.coins, 0);
}

function userTaskCount(userId) {
    return history.filter(entry => entry.userId === userId).length;
}

function renderDashboard() {
    $("#totalCoins").textContent = number(totalCoins());
    $("#userCount").textContent = number(users.length);
    $("#completedCount").textContent = number(history.length);

    const top = [...users].sort((a, b) => b.coins - a.coins)[0];

    $("#topUser").textContent = top ? top.name : "—";
    $("#topUserCoins").textContent = top
        ? coins(top.coins)
        : "کاربری ثبت نشده است";

    renderChart();
    renderRecentHistory();
}

function renderChart() {
    const chart = $("#coinChart");

    if (!users.length) {
        chart.innerHTML = '<div class="empty">هنوز کاربری ثبت نشده است.</div>';
        return;
    }

    const list = [...users]
        .sort((a, b) => b.coins - a.coins)
        .slice(0, 8);

    const max = Math.max(...list.map(user => user.coins), 1);

    chart.innerHTML = list.map(user => {
        const height = Math.max(3, user.coins / max * 100);

        return `
            <div class="chart-column">
                <span class="chart-value">${number(user.coins)}</span>
                <div class="bar-area">
                    <div class="chart-bar" style="height:${height}%"></div>
                </div>
                <span class="chart-name" title="${escapeHTML(user.name)}">
                    ${escapeHTML(user.name)}
                </span>
            </div>
        `;
    }).join("");
}

/* ======================================================
   نمایش کاربران
   ====================================================== */

function userCell(user) {
    return `
        <div class="user-cell">
            <div class="user-avatar">${escapeHTML(initials(user.name))}</div>
            <div>
                <strong>${escapeHTML(user.name)}</strong>
                <small>${escapeHTML(user.externalId)}</small>
            </div>
        </div>
    `;
}

function renderUsers() {
    const search = $("#userSearch").value.trim().toLocaleLowerCase("fa");

    const filtered = users.filter(user => {
        const searchable = [
            user.name,
            user.externalId,
            user.handle
        ].join(" ").toLocaleLowerCase("fa");

        return searchable.includes(search);
    });

    if (!filtered.length) {
        $("#usersTable").innerHTML =
            '<tr><td colspan="6">کاربری پیدا نشد.</td></tr>';
        return;
    }

    $("#usersTable").innerHTML = filtered.map(user => `
        <tr>
            <td>${userCell(user)}</td>
            <td>${escapeHTML(user.externalId)}</td>
            <td>${escapeHTML(user.handle || "—")}</td>
            <td class="coin">${number(user.coins)} 🪙</td>
            <td>${number(userTaskCount(user.id))}</td>
            <td>
                <div class="row-actions">
                    <button class="small-button"
                        data-action="edit-user"
                        data-id="${escapeHTML(user.id)}"
                        ${isAdmin ? "" : "disabled"}>ویرایش</button>

                    <button class="small-button delete"
                        data-action="delete-user"
                        data-id="${escapeHTML(user.id)}"
                        ${isAdmin ? "" : "disabled"}>حذف</button>
                </div>
            </td>
        </tr>
    `).join("");
}

$("#userSearch").addEventListener("input", renderUsers);

/* ======================================================
   افزودن و ویرایش کاربران
   ====================================================== */

function openUserForm(user = null) {
    if (!requireAdmin()) return;

    $("#userForm").reset();
    $("#userError").textContent = "";
    $("#editUserId").value = user ? user.id : "";

    $("#userModalTitle").textContent = user
        ? "ویرایش کاربر"
        : "افزودن کاربر";

    $("#userName").value = user ? user.name : "";
    $("#userHandle").value = user ? user.handle : "";
    $("#userExternalId").value = user ? user.externalId : "";

    closeModal("adminModal");
    openModal("userModal");
}

$("#addUserButton").addEventListener("click", () => openUserForm());
$("#quickUser").addEventListener("click", () => openUserForm());
$("#adminUser").addEventListener("click", () => openUserForm());

$("#userForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const id = $("#editUserId").value;
    const name = $("#userName").value.trim();
    const handle = $("#userHandle").value.trim();
    const externalId = $("#userExternalId").value.trim();

    if (!name || !externalId) {
        $("#userError").textContent = "نام و شناسه کاربر الزامی هستند.";
        return;
    }

    const duplicate = users.some(user =>
        user.externalId.toLowerCase() === externalId.toLowerCase() &&
        user.id !== id
    );

    if (duplicate) {
        $("#userError").textContent = "این شناسه قبلاً ثبت شده است.";
        return;
    }

    let next;

    if (id) {
        const index = users.findIndex(user => user.id === id);

        if (index < 0) {
            $("#userError").textContent = "کاربر پیدا نشد.";
            return;
        }

        next = users.map(user => user.id === id
            ? { ...user, name, handle, externalId }
            : user
        );
    } else {
        next = [...users, {
            id: newId("user"),
            externalId,
            name,
            handle,
            coins: 0
        }];
    }

    if (!persistAll(next, tasks, history)) return;

    closeModal("userModal");
    refreshAll();

    showToast(id ? "اطلاعات کاربر ویرایش شد." : "کاربر جدید ثبت شد.");
});

$("#usersTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !requireAdmin()) return;

    const user = users.find(item => item.id === button.dataset.id);
    if (!user) return;

    if (button.dataset.action === "edit-user") {
        openUserForm(user);
        return;
    }

    if (button.dataset.action === "delete-user") {
        if (history.some(entry => entry.userId === user.id)) {
            showToast("کاربری که سابقه پاداش دارد حذف نمی‌شود؛ سوابق باید حفظ شوند.");
            return;
        }

        if (!confirm(`کاربر «${user.name}» حذف شود؟`)) return;

        if (!persistAll(
            users.filter(item => item.id !== user.id),
            tasks,
            history
        )) return;

        refreshAll();
        showToast("کاربر حذف شد.");
    }
});

/* ======================================================
   نمایش و مدیریت وظایف
   ====================================================== */

function renderTasks() {
    if (!tasks.length) {
        $("#tasksTable").innerHTML =
            '<tr><td colspan="5">هنوز وظیفه‌ای تعریف نشده است.</td></tr>';
        return;
    }

    $("#tasksTable").innerHTML = tasks.map(task => `
        <tr>
            <td>${escapeHTML(task.name)}</td>
            <td>${escapeHTML(task.description || "—")}</td>
            <td class="coin">${number(task.reward)} 🪙</td>
            <td>
                <span class="status ${task.active ? "active" : "inactive"}">
                    ${task.active ? "فعال" : "غیرفعال"}
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="small-button"
                        data-action="edit-task"
                        data-id="${escapeHTML(task.id)}"
                        ${isAdmin ? "" : "disabled"}>ویرایش</button>

                    <button class="small-button delete"
                        data-action="delete-task"
                        data-id="${escapeHTML(task.id)}"
                        ${isAdmin ? "" : "disabled"}>حذف</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function openTaskForm(task = null) {
    if (!requireAdmin()) return;

    $("#taskForm").reset();
    $("#taskError").textContent = "";
    $("#editTaskId").value = task ? task.id : "";

    $("#taskModalTitle").textContent = task
        ? "ویرایش وظیفه"
        : "افزودن وظیفه";

    $("#taskName").value = task ? task.name : "";
    $("#taskDescription").value = task ? task.description : "";
    $("#taskReward").value = task ? task.reward : 100;
    $("#taskActive").value = task ? String(task.active) : "true";

    closeModal("adminModal");
    openModal("taskModal");
}

$("#addTaskButton").addEventListener("click", () => openTaskForm());
$("#quickTask").addEventListener("click", () => openTaskForm());
$("#adminTask").addEventListener("click", () => openTaskForm());

$("#tasksTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !requireAdmin()) return;

    const task = tasks.find(item => item.id === button.dataset.id);
    if (!task) return;

    if (button.dataset.action === "edit-task") {
        openTaskForm(task);
        return;
    }

    if (button.dataset.action === "delete-task") {
        if (history.some(entry => entry.taskId === task.id)) {
            showToast("این وظیفه سابقه پاداش دارد؛ آن را غیرفعال کن.");
            return;
        }

        if (!confirm(`وظیفه «${task.name}» حذف شود؟`)) return;

        if (!persistAll(
            users,
            tasks.filter(item => item.id !== task.id),
            history
        )) return;

        refreshAll();
        showToast("وظیفه حذف شد.");
    }
});

$("#taskForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const id = $("#editTaskId").value;
    const name = $("#taskName").value.trim();
    const description = $("#taskDescription").value.trim();
    const reward = Number($("#taskReward").value);
    const active = $("#taskActive").value === "true";

    if (!name) {
        $("#taskError").textContent = "نام وظیفه را وارد کن.";
        return;
    }

    if (!Number.isSafeInteger(reward) || reward < 1 || reward > 1000000000) {
        $("#taskError").textContent = "پاداش باید عدد صحیح مثبت باشد.";
        return;
    }

    const duplicate = tasks.some(task =>
        task.name.toLocaleLowerCase("fa") === name.toLocaleLowerCase("fa") &&
        task.id !== id
    );

    if (duplicate) {
        $("#taskError").textContent = "وظیفه‌ای با این نام وجود دارد.";
        return;
    }

    let next;

    if (id) {
        if (!tasks.some(task => task.id === id)) {
            $("#taskError").textContent = "وظیفه پیدا نشد.";
            return;
        }

        next = tasks.map(task => task.id === id
            ? { ...task, name, description, reward, active }
            : task
        );
    } else {
        next = [...tasks, {
            id: newId("task"),
            name,
            description,
            reward,
            active
        }];
    }

    if (!persistAll(users, next, history)) return;

    closeModal("taskModal");
    refreshAll();

    showToast(id ? "وظیفه ویرایش شد." : "وظیفه جدید ثبت شد.");
});

/* ======================================================
   فرم تأیید وظیفه و اختصاص سکه
   ====================================================== */

function openCompletionForm() {
    if (!requireAdmin()) return;

    if (!users.length) {
        showToast("ابتدا یک کاربر ثبت کن.");
        openUserForm();
        return;
    }

    const activeTasks = tasks.filter(task => task.active);

    if (!activeTasks.length) {
        showToast("ابتدا یک وظیفه فعال ایجاد کن.");
        openTaskForm();
        return;
    }

    $("#completionForm").reset();
    $("#completionError").textContent = "";

    $("#completionUser").innerHTML = users.map(user => `
        <option value="${escapeHTML(user.id)}">
            ${escapeHTML(user.name)} — ${escapeHTML(user.externalId)}
        </option>
    `).join("");

    $("#completionTask").innerHTML = activeTasks.map(task => `
        <option value="${escapeHTML(task.id)}">
            ${escapeHTML(task.name)} — ${number(task.reward)} سکه
        </option>
    `).join("");

    $("#completionCoins").value = activeTasks[0].reward;

    closeModal("adminModal");
    openModal("completionModal");

    updateCompletionForm();
}

function alreadyCompleted(userId, taskId) {
    return history.some(entry =>
        entry.userId === userId &&
        entry.taskId === taskId
    );
}

function updateCompletionForm() {
    const userId = $("#completionUser").value;
    const taskId = $("#completionTask").value;

    const task = tasks.find(item =>
        item.id === taskId && item.active
    );

    if (!task) {
        $("#completionCoins").value = "";
        return;
    }

    $("#completionCoins").value = task.reward;

    if (alreadyCompleted(userId, taskId)) {
        $("#completionError").textContent =
            "این کاربر قبلاً برای این وظیفه پاداش دریافت کرده است.";
    } else {
        $("#completionError").textContent = "";
    }
}

$("#completionUser").addEventListener("change", updateCompletionForm);
$("#completionTask").addEventListener("change", updateCompletionForm);

$("#quickComplete").addEventListener("click", openCompletionForm);
$("#adminComplete").addEventListener("click", openCompletionForm);

$("#completionForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!requireAdmin()) return;

    const userId = $("#completionUser").value;
    const taskId = $("#completionTask").value;
    const reward = Number($("#completionCoins").value);
    const reference = $("#telegramReference").value.trim();
    const note = $("#completionNote").value.trim();

    const user = users.find(item => item.id === userId);
    const task = tasks.find(item => item.id === taskId && item.active);

    if (!user || !task) {
        $("#completionError").textContent =
            "کاربر یا وظیفه معتبر نیست.";
        return;
    }

    if (!reference) {
        $("#completionError").textContent =
            "لینک یا توضیح گزارش تلگرام را وارد کن.";
        return;
    }

    if (!Number.isSafeInteger(reward) ||
        reward < 1 ||
        reward > 1000000000) {
        $("#completionError").textContent =
            "مقدار سکه باید عدد صحیح مثبت باشد.";
        return;
    }

    /*
     * جلوگیری از ثبت مجدد یک وظیفه برای یک کاربر.
     * بررسی دوباره در لحظه ثبت انجام می‌شود.
     */
    if (alreadyCompleted(userId, taskId)) {
        $("#completionError").textContent =
            "این وظیفه قبلاً برای این کاربر ثبت شده است.";
        return;
    }

    if (user.coins + reward > Number.MAX_SAFE_INTEGER) {
        $("#completionError").textContent =
            "موجودی کاربر از محدوده مجاز فراتر می‌رود.";
        return;
    }

    /*
     * فقط پس از بررسی گزارش توسط ادمین، پاداش ثبت می‌شود.
     * مقدار پاداش ثبت‌شده در تاریخچه ثابت می‌ماند؛
     * حتی اگر مقدار پاداش وظیفه در آینده تغییر کند.
     */
    const entry = {
        id: newId("reward"),
        userId: user.id,
        taskId: task.id,
        taskName: task.name,
        coins: reward,
        reference,
        note,
        date: new Date().toISOString()
    };

    const nextUsers = users.map(item =>
        item.id === userId
            ? { ...item, coins: item.coins + reward }
            : item
    );

    const nextHistory = [...history, entry];

    if (!persistAll(nextUsers, tasks, nextHistory)) return;

    closeModal("completionModal");
    refreshAll();

    showToast(
        `${number(reward)} سکه به ${user.name} اضافه شد.`
    );
});

/* ======================================================
   تاریخچه پاداش‌ها
   ====================================================== */

function findUser(userId) {
    return users.find(user => user.id === userId);
}

function renderHistory() {
    const search = $("#historySearch").value
        .trim()
        .toLocaleLowerCase("fa");

    const sorted = [...history].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    const filtered = sorted.filter(entry => {
        const user = findUser(entry.userId);

        const searchable = [
            user ? user.name : "کاربر حذف‌شده",
            user ? user.externalId : "",
            entry.taskName,
            entry.reference,
            entry.note
        ].join(" ").toLocaleLowerCase("fa");

        return searchable.includes(search);
    });

    if (!filtered.length) {
        $("#historyTable").innerHTML =
            '<tr><td colspan="6">سابقه‌ای برای نمایش وجود ندارد.</td></tr>';
        return;
    }

    $("#historyTable").innerHTML = filtered.map(entry => {
        const user = findUser(entry.userId);

        return `
            <tr>
                <td>
                    ${escapeHTML(user ? user.name : "کاربر حذف‌شده")}
                </td>
                <td>${escapeHTML(entry.taskName)}</td>
                <td class="coin">+${number(entry.coins)} 🪙</td>
                <td title="${escapeHTML(entry.reference)}">
                    ${escapeHTML(
                        entry.reference.length > 35
                            ? entry.reference.slice(0, 35) + "…"
                            : entry.reference
                    )}
                </td>
                <td>${escapeHTML(formatDate(entry.date))}</td>
                <td>
                    <button class="small-button"
                        data-action="view-reward"
                        data-id="${escapeHTML(entry.id)}">
                        جزئیات
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

$("#historySearch").addEventListener("input", renderHistory);

$("#historyTable").addEventListener("click", event => {
    const button = event.target.closest('[data-action="view-reward"]');
    if (!button) return;

    const entry = history.find(item => item.id === button.dataset.id);
    if (!entry) return;

    const user = findUser(entry.userId);

    alert(
        "جزئیات پاداش\n\n" +
        "کاربر: " + (user ? user.name : "کاربر حذف‌شده") + "\n" +
        "شناسه: " + (user ? user.externalId : "نامشخص") + "\n" +
        "وظیفه: " + entry.taskName + "\n" +
        "سکه: " + entry.coins + "\n" +
        "گزارش تلگرام: " + entry.reference + "\n" +
        "یادداشت ادمین: " + (entry.note || "—") + "\n" +
        "تاریخ: " + formatDate(entry.date)
    );
});

function renderRecentHistory() {
    const recent = [...history]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (!recent.length) {
        $("#recentHistory").innerHTML =
            '<tr><td colspan="4">هنوز پاداشی ثبت نشده است.</td></tr>';
        return;
    }

    $("#recentHistory").innerHTML = recent.map(entry => {
        const user = findUser(entry.userId);

        return `
            <tr>
                <td>${escapeHTML(user ? user.name : "کاربر حذف‌شده")}</td>
                <td>${escapeHTML(entry.taskName)}</td>
                <td class="coin">+${number(entry.coins)} 🪙</td>
                <td>${escapeHTML(formatDate(entry.date))}</td>
            </tr>
        `;
    }).join("");
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "نامشخص";
    }

    return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

/* ======================================================
   خروجی CSV تاریخچه
   ====================================================== */

function exportCSV() {
    if (!requireAdmin()) return;

    const header = [
        "شناسه پاداش",
        "شناسه کاربر",
        "نام کاربر",
        "وظیفه",
        "سکه",
        "گزارش تلگرام",
        "یادداشت ادمین",
        "تاریخ"
    ];

    const rows = history.map(entry => {
        const user = findUser(entry.userId);

        return [
            entry.id,
            user ? user.externalId : entry.userId,
            user ? user.name : "کاربر حذف‌شده",
            entry.taskName,
            entry.coins,
            entry.reference,
            entry.note,
            formatDate(entry.date)
        ];
    });

    const quote = value =>
        '"' + String(value ?? "").replace(/"/g, '""') + '"';

    const csv = "\uFEFF" + [header, ...rows]
        .map(row => row.map(quote).join(","))
        .join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ams-rewards-history.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("گزارش تاریخچه دانلود شد.");
}

$("#exportButton").addEventListener("click", exportCSV);

/* ======================================================
   به‌روزرسانی کل سایت
   ====================================================== */

function refreshAll() {
    renderDashboard();
    renderUsers();
    renderTasks();
    renderHistory();
    updateAdminControls();
}

function renderDate() {
    $("#todayDate").textContent = new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(new Date());
}

/* ======================================================
   شروع برنامه
   ====================================================== */

function initializeApp() {
    initializeData();
    renderDate();
    refreshAll();
    navigate("dashboard");

    console.info("AMS Rewards initialized.");
}

initializeApp();
