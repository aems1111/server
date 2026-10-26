"use strict";

/*
  AMS REWARDS — DEMO ONLY

  اطلاعات در localStorage مرورگر ذخیره می‌شوند.
  رمزها در این نسخه نمایشی به‌صورت متن ساده ذخیره می‌شوند.
  برای استفاده واقعی باید بک‌اند و احراز هویت امن اضافه شود.
*/

const STORAGE_KEY = "ams_rewards_demo_v2";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_KEY = "ams_rewards_demo_admin_password_v2";

let state = {
  users: [],
  tasks: [],
  history: []
};

let loginRole = "user";
let currentSession = null;
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function makeId(prefix = "id") {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save demo data:", error);
    showToast("ذخیره اطلاعات انجام نشد. فضای مرورگر را بررسی کن.", "error");
    return false;
  }
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return;

    const parsed = JSON.parse(stored);

    if (
      !parsed ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.history)
    ) {
      throw new Error("Invalid stored data");
    }

    state = {
      users: parsed.users,
      tasks: parsed.tasks,
      history: parsed.history
    };
  } catch (error) {
    console.error("Could not load demo data:", error);
    state = { users: [], tasks: [], history: [] };
    showToast("اطلاعات ذخیره‌شده قابل خواندن نبود.", "error");
  }
}

function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || "1234";
}

function showToast(message, type = "success") {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3200);
}

function setError(element, message = "") {
  if (!element) return;

  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("hidden");

  const firstInput = modal.querySelector(
    "input:not([type=hidden]), select, textarea"
  );

  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function getUser(userId) {
  return state.users.find((user) => user.id === userId);
}

function getTask(taskId) {
  return state.tasks.find((task) => task.id === taskId);
}

function getUserHistory(userId) {
  return state.history
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getUserBalance(userId) {
  return getUserHistory(userId).reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );
}

function getUserEarned(userId) {
  return getUserHistory(userId).reduce(
    (total, entry) => total + Math.max(0, Number(entry.amount || 0)),
    0
  );
}

function getUserCompletionCount(userId) {
  return getUserHistory(userId).filter(
    (entry) => entry.type === "reward"
  ).length;
}

function addHistory({
  userId,
  type,
  description,
  amount,
  reference = "",
  note = ""
}) {
  const user = getUser(userId);

  if (!user) {
    throw new Error("کاربر انتخاب‌شده پیدا نشد.");
  }

  const numericAmount = Number(amount);

  if (!Number.isSafeInteger(numericAmount) || numericAmount === 0) {
    throw new Error("مقدار سکه باید یک عدد صحیح و غیرصفر باشد.");
  }

  const currentBalance = getUserBalance(userId);

  if (currentBalance + numericAmount < 0) {
    throw new Error("موجودی کاربر برای این کسر سکه کافی نیست.");
  }

  state.history.push({
    id: makeId("history"),
    userId,
    usernameSnapshot: user.username,
    nameSnapshot: user.name,
    type,
    description,
    amount: numericAmount,
    reference,
    note,
    date: new Date().toISOString()
  });
}

/* -------------------- ورود و خروج -------------------- */

function showLogin() {
  currentSession = null;

  $("#loginView").classList.remove("hidden");
  $("#adminView").classList.add("hidden");
  $("#userView").classList.add("hidden");

  $("#loginForm").reset();
  setError($("#loginError"));
}

function showAdmin() {
  $("#loginView").classList.add("hidden");
  $("#userView").classList.add("hidden");
  $("#adminView").classList.remove("hidden");

  renderAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showUser(userId) {
  const user = getUser(userId);

  if (!user || !user.active) {
    showLogin();
    showToast("این حساب فعال نیست یا وجود ندارد.", "error");
    return;
  }

  currentSession = {
    role: "user",
    userId: user.id
  };

  $("#loginView").classList.add("hidden");
  $("#adminView").classList.add("hidden");
  $("#userView").classList.remove("hidden");

  renderUserDashboard(user.id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleLogin(event) {
  event.preventDefault();

  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value;

  setError($("#loginError"));

  if (!username || !password) {
    setError($("#loginError"), "نام کاربری و رمز عبور را وارد کن.");
    return;
  }

  if (loginRole === "admin") {
    if (
      username.toLowerCase() === ADMIN_USERNAME &&
      password === getAdminPassword()
    ) {
      currentSession = { role: "admin" };
      showAdmin();
      showToast("با موفقیت وارد پنل مدیریت شدی.");
      return;
    }

    setError($("#loginError"), "نام کاربری یا رمز ادمین اشتباه است.");
    return;
  }

  const user = state.users.find(
    (item) => item.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || user.password !== password) {
    setError($("#loginError"), "نام کاربری یا رمز عبور اشتباه است.");
    return;
  }

  if (!user.active) {
    setError($("#loginError"), "حساب تو غیرفعال شده است. با مدیر تماس بگیر.");
    return;
  }

  showUser(user.id);
  showToast("با موفقیت وارد حساب خودت شدی.");
}

function logout() {
  showLogin();
  showToast("از حساب خارج شدی.");
}

/* -------------------- پنل ادمین -------------------- */

function renderAdmin() {
  renderStats();
  renderUsers();
  renderTasks();
  renderRewardOptions();
  renderHistory();
}

function renderStats() {
  const totalCoins = state.users.reduce(
    (sum, user) => sum + getUserBalance(user.id),
    0
  );

  $("#statUsers").textContent = formatNumber(state.users.length);
  $("#statCoins").textContent = formatNumber(totalCoins);
  $("#statCompletions").textContent = formatNumber(
    state.history.filter((entry) => entry.type === "reward").length
  );
  $("#statTasks").textContent = formatNumber(
    state.tasks.filter((task) => task.active).length
  );
}

function renderUsers() {
  const query = $("#userSearch").value.trim().toLowerCase();

  const users = state.users.filter((user) => {
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  const table = $("#usersTable");

  table.innerHTML = users.map((user) => {
    const balance = getUserBalance(user.id);
    const status = user.active
      ? '<span class="status active">فعال</span>'
      : '<span class="status inactive">غیرفعال</span>';

    const escapedId = escapeHTML(user.id);

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="avatar">${escapeHTML(user.name.trim().charAt(0) || "؟")}</div>
            <div><strong>${escapeHTML(user.name)}</strong>
            <small>${escapeHTML(user.username)}</small></div>
          </div>
        </td>
        <td dir="ltr">${escapeHTML(user.username)}</td>
        <td><strong>${formatNumber(balance)}</strong> ◈</td>
        <td>${status}</td>
        <td>
          <div class="action-group">
            <button class="button secondary small-button"
                    data-action="edit-user" data-id="${escapedId}">ویرایش</button>
            <button class="button secondary small-button"
                    data-action="toggle-user" data-id="${escapedId}">
              ${user.active ? "غیرفعال" : "فعال‌سازی"}
            </button>
            <button class="button danger small-button"
                    data-action="delete-user" data-id="${escapedId}">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  $("#noUsers").classList.toggle("hidden", users.length > 0);
}

function renderTasks() {
  const table = $("#tasksTable");

  table.innerHTML = state.tasks.map((task) => {
    const status = task.active
      ? '<span class="status active">فعال</span>'
      : '<span class="status inactive">غیرفعال</span>';

    const escapedId = escapeHTML(task.id);

    return `
      <tr>
        <td>
          <strong>${escapeHTML(task.name)}</strong>
          <div class="muted small">${escapeHTML(task.description || "")}</div>
        </td>
        <td><strong>${formatNumber(task.reward)}</strong> ◈</td>
        <td>${status}</td>
        <td>
          <div class="action-group">
            <button class="button secondary small-button"
                    data-action="edit-task" data-id="${escapedId}">ویرایش</button>
            <button class="button secondary small-button"
                    data-action="toggle-task" data-id="${escapedId}">
              ${task.active ? "غیرفعال" : "فعال‌سازی"}
            </button>
            <button class="button danger small-button"
                    data-action="delete-task" data-id="${escapedId}">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  $("#noTasks").classList.toggle("hidden", state.tasks.length > 0);
}

function renderRewardOptions() {
  const userSelect = $("#rewardUser");
  const taskSelect = $("#rewardTask");

  const previousUser = userSelect.value;
  const previousTask = taskSelect.value;

  const activeUsers = state.users.filter((user) => user.active);
  const activeTasks = state.tasks.filter((task) => task.active);

  userSelect.innerHTML = activeUsers.map((user) => `
    <option value="${escapeHTML(user.id)}">
      ${escapeHTML(user.name)} (@${escapeHTML(user.username)})
    </option>
  `).join("");

  taskSelect.innerHTML = activeTasks.map((task) => `
    <option value="${escapeHTML(task.id)}" data-reward="${Number(task.reward)}">
      ${escapeHTML(task.name)} — ${formatNumber(task.reward)} سکه
    </option>
  `).join("");

  if (activeUsers.some((user) => user.id === previousUser)) {
    userSelect.value = previousUser;
  }

  if (activeTasks.some((task) => task.id === previousTask)) {
    taskSelect.value = previousTask;
  }

  userSelect.disabled = activeUsers.length === 0;
  taskSelect.disabled = activeTasks.length === 0;

  $("#rewardAmount").disabled = activeTasks.length === 0;
  $("#rewardReference").disabled = activeTasks.length === 0;
  $("#rewardNote").disabled = activeTasks.length === 0;

  const selectedTask = getTask(taskSelect.value);

  if (selectedTask) {
    $("#rewardAmount").value = selectedTask.reward;
  } else {
    $("#rewardAmount").value = "";
  }
}

function renderHistory() {
  const history = [...state.history].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  $("#historyTable").innerHTML = history.map((entry) => {
    const amount = Number(entry.amount);
    const amountClass = amount >= 0 ? "active" : "inactive";
    const amountText = `${amount > 0 ? "+" : ""}${formatNumber(amount)} ◈`;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(entry.nameSnapshot || "کاربر حذف‌شده")}</strong>
          <div class="muted small">${escapeHTML(entry.usernameSnapshot || "")}</div>
        </td>
        <td>
          ${escapeHTML(entry.description)}
          ${entry.note ? `<div class="muted small">${escapeHTML(entry.note)}</div>` : ""}
        </td>
        <td><span class="status ${amountClass}">${amountText}</span></td>
        <td>${formatDate(entry.date)}</td>
        <td>
          ${entry.reference
            ? `<span title="${escapeHTML(entry.reference)}">${escapeHTML(entry.reference.slice(0, 35))}</span>`
            : "—"}
        </td>
      </tr>
    `;
  }).join("");

  $("#noHistory").classList.toggle("hidden", history.length > 0);
}

/* -------------------- ساخت و ویرایش کاربر -------------------- */

function openNewUserModal() {
  $("#userForm").reset();
  $("#editUserId").value = "";
  $("#userModalTitle").textContent = "ساخت حساب جدید";
  $("#userPassword").required = true;
  $("#userPasswordHint").textContent = "برای حساب جدید رمز عبور الزامی است.";
  setError($("#userFormError"));
  openModal("userModal");
}

function openEditUserModal(userId) {
  const user = getUser(userId);

  if (!user) {
    showToast("کاربر پیدا نشد.", "error");
    return;
  }

  $("#userForm").reset();
  $("#editUserId").value = user.id;
  $("#userName").value = user.name;
  $("#userUsername").value = user.username;
  $("#userPassword").value = "";
  $("#userModalTitle").textContent = "ویرایش حساب کاربری";
  $("#userPassword").required = false;
  $("#userPasswordHint").textContent =
    "برای حفظ رمز فعلی، این فیلد را خالی بگذار.";
  setError($("#userFormError"));

  openModal("userModal");
}

function handleUserSave(event) {
  event.preventDefault();

  setError($("#userFormError"));

  const id = $("#editUserId").value;
  const name = $("#userName").value.trim();
  const username = $("#userUsername").value.trim();
  const password = $("#userPassword").value;
  const existingUser = id ? getUser(id) : null;

  if (!name || !username) {
    setError($("#userFormError"), "نام و نام کاربری الزامی هستند.");
    return;
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    setError(
      $("#userFormError"),
      "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، نقطه، خط تیره و زیرخط باشد."
    );
    return;
  }

  const duplicate = state.users.some(
    (user) =>
      user.username.toLowerCase() === username.toLowerCase() &&
      user.id !== id
  );

  if (duplicate) {
    setError($("#userFormError"), "این نام کاربری قبلاً استفاده شده است.");
    return;
  }

  if (!existingUser && password.length < 4) {
    setError($("#userFormError"), "رمز عبور باید حداقل ۴ کاراکتر باشد.");
    return;
  }

  if (existingUser && password && password.length < 4) {
    setError($("#userFormError"), "رمز جدید باید حداقل ۴ کاراکتر باشد.");
    return;
  }

  if (existingUser) {
    existingUser.name = name;
    existingUser.username = username;

    if (password) {
      existingUser.password = password;
    }

    showToast("اطلاعات حساب ویرایش شد.");
  } else {
    state.users.push({
      id: makeId("user"),
      name,
      username,
      password,
      active: true,
      createdAt: new Date().toISOString()
    });

    showToast("حساب جدید ساخته شد.");
  }

  if (!saveState()) return;

  closeModal("userModal");
  renderAdmin();
}

function toggleUser(userId) {
  const user = getUser(userId);
  if (!user) return;

  user.active = !user.active;

  if (!saveState()) return;

  renderAdmin();

  showToast(
    user.active ? "حساب کاربر فعال شد." : "حساب کاربر غیرفعال شد."
  );
}

function deleteUser(userId) {
  const user = getUser(userId);
  if (!user) return;

  const hasHistory = state.history.some((entry) => entry.userId === userId);

  if (hasHistory) {
    showToast(
      "این کاربر سابقه مالی دارد؛ برای حفظ سوابق، حساب را غیرفعال کن.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `آیا از حذف حساب «${user.name}» مطمئن هستی؟`
  );

  if (!confirmed) return;

  state.users = state.users.filter((item) => item.id !== userId);

  if (!saveState()) return;

  renderAdmin();
  showToast("حساب کاربر حذف شد.");
}

/* -------------------- ساخت و ویرایش وظیفه -------------------- */

function openNewTaskModal() {
  $("#taskForm").reset();
  $("#editTaskId").value = "";
  $("#taskActive").checked = true;
  $("#taskModalTitle").textContent = "ساخت وظیفه جدید";
  setError($("#taskFormError"));
  openModal("taskModal");
}

function openEditTaskModal(taskId) {
  const task = getTask(taskId);
  if (!task) return;

  $("#editTaskId").value = task.id;
  $("#taskName").value = task.name;
  $("#taskDescription").value = task.description || "";
  $("#taskRewardAmount").value = task.reward;
  $("#taskActive").checked = task.active;
  $("#taskModalTitle").textContent = "ویرایش وظیفه";
  setError($("#taskFormError"));

  openModal("taskModal");
}

function handleTaskSave(event) {
  event.preventDefault();

  setError($("#taskFormError"));

  const id = $("#editTaskId").value;
  const name = $("#taskName").value.trim();
  const description = $("#taskDescription").value.trim();
  const reward = Number($("#taskRewardAmount").value);
  const active = $("#taskActive").checked;
  const existingTask = id ? getTask(id) : null;

  if (!name) {
    setError($("#taskFormError"), "عنوان وظیفه را وارد کن.");
    return;
  }

  if (!Number.isSafeInteger(reward) || reward < 1) {
    setError($("#taskFormError"), "پاداش باید عدد صحیح مثبت باشد.");
    return;
  }

  if (existingTask) {
    existingTask.name = name;
    existingTask.description = description;
    existingTask.reward = reward;
    existingTask.active = active;

    showToast("وظیفه ویرایش شد.");
  } else {
    state.tasks.push({
      id: makeId("task"),
      name,
      description,
      reward,
      active,
      createdAt: new Date().toISOString()
    });

    showToast("وظیفه جدید ساخته شد.");
  }

  if (!saveState()) return;

  closeModal("taskModal");
  renderAdmin();
}

function toggleTask(taskId) {
  const task = getTask(taskId);
  if (!task) return;

  task.active = !task.active;

  if (!saveState()) return;

  renderAdmin();
  showToast(task.active ? "وظیفه فعال شد." : "وظیفه غیرفعال شد.");
}

function deleteTask(taskId) {
  const task = getTask(taskId);
  if (!task) return;

  const confirmed = window.confirm(
    `وظیفه «${task.name}» حذف شود؟ سوابق پاداش قبلی باقی می‌مانند.`
  );

  if (!confirmed) return;

  state.tasks = state.tasks.filter((item) => item.id !== taskId);

  if (!saveState()) return;

  renderAdmin();
  showToast("وظیفه حذف شد.");
}

/* -------------------- ثبت پاداش -------------------- */

function handleRewardSubmit(event) {
  event.preventDefault();

  setError($("#rewardError"));

  const userId = $("#rewardUser").value;
  const taskId = $("#rewardTask").value;
  const amount = Number($("#rewardAmount").value);
  const reference = $("#rewardReference").value.trim();
  const note = $("#rewardNote").value.trim();

  const user = getUser(userId);
  const task = getTask(taskId);

  if (!user || !user.active) {
    setError($("#rewardError"), "یک کاربر فعال انتخاب کن.");
    return;
  }

  if (!task || !task.active) {
    setError($("#rewardError"), "یک وظیفه فعال انتخاب کن.");
    return;
  }

  if (!Number.isSafeInteger(amount) || amount < 1) {
    setError($("#rewardError"), "مقدار پاداش باید عدد صحیح مثبت باشد.");
    return;
  }

  const confirmed = window.confirm(
    `به کاربر ${user.name} بابت «${task.name}» تعداد ${formatNumber(amount)} سکه اضافه شود؟`
  );

  if (!confirmed) return;

  try {
    addHistory({
      userId,
      type: "reward",
      description: `پاداش وظیفه: ${task.name}`,
      amount,
      reference,
      note
    });
  } catch (error) {
    setError($("#rewardError"), error.message);
    return;
  }

  if (!saveState()) return;

  $("#rewardReference").value = "";
  $("#rewardNote").value = "";

  renderAdmin();
  showToast(`${formatNumber(amount)} سکه به حساب ${user.name} اضافه شد.`);
}

/* -------------------- پنل کاربر -------------------- */

function renderUserDashboard(userId) {
  const user = getUser(userId);

  if (!user) {
    showLogin();
    return;
  }

  const history = getUserHistory(userId);

  $("#welcomeName").textContent = user.name;
  $("#userBalance").textContent = formatNumber(getUserBalance(userId));
  $("#userEarned").textContent = formatNumber(getUserEarned(userId));
  $("#userCompletions").textContent = formatNumber(
    getUserCompletionCount(userId)
  );

  renderUserTasks();
  renderUserHistory(history);
}

function renderUserTasks() {
  const activeTasks = state.tasks.filter((task) => task.active);

  $("#userTasks").innerHTML = activeTasks.map((task) => `
    <article class="task-card">
      <div class="task-symbol">◈</div>
      <h3>${escapeHTML(task.name)}</h3>
      <p>${escapeHTML(task.description || "برای این وظیفه توضیحی ثبت نشده است.")}</p>
      <div class="task-reward">+${formatNumber(task.reward)} ◈</div>
      <div class="muted">پاداش پس از تأیید مدیر ثبت می‌شود.</div>
    </article>
  `).join("");

  $("#noUserTasks").classList.toggle("hidden", activeTasks.length > 0);
}

function renderUserHistory(history) {
  $("#userHistory").innerHTML = history.map((entry) => {
    const amount = Number(entry.amount);
    const amountClass = amount >= 0 ? "active" : "inactive";
    const amountText = `${amount > 0 ? "+" : ""}${formatNumber(amount)} ◈`;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(entry.description)}</strong>
          ${entry.note ? `<div class="muted small">${escapeHTML(entry.note)}</div>` : ""}
        </td>
        <td><span class="status ${amountClass}">${amountText}</span></td>
        <td>${formatDate(entry.date)}</td>
      </tr>
    `;
  }).join("");

  $("#noUserHistory").classList.toggle("hidden", history.length > 0);
}

/* -------------------- خروجی CSV -------------------- */

function exportHistoryCSV() {
  const headers = [
    "نام کاربر",
    "نام کاربری",
    "نوع",
    "شرح",
    "مقدار سکه",
    "تاریخ",
    "مرجع",
    "یادداشت"
  ];

  const rows = state.history.map((entry) => [
    entry.nameSnapshot || "",
    entry.usernameSnapshot || "",
    entry.type || "",
    entry.description || "",
    entry.amount,
    entry.date,
    entry.reference || "",
    entry.note || ""
  ]);

  function csvCell(value) {
    let text = String(value ?? "");

    // جلوگیری از اجرای فرمول‌های ناخواسته در نرم‌افزارهای صفحه‌گسترده
    if (/^[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const csv = "\uFEFF" + [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `ams-rewards-history-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("فایل CSV آماده شد.");
}

/* -------------------- رویدادها -------------------- */

function bindEvents() {
  $("#loginForm").addEventListener("submit", handleLogin);

  $$(".login-tab").forEach((button) => {
    button.addEventListener("click", () => {
      loginRole = button.dataset.role;

      $$(".login-tab").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });

      $("#loginPassword").value = "";
      setError($("#loginError"));

      if (loginRole === "admin") {
        $("#loginUsername").value = ADMIN_USERNAME;
      } else {
        $("#loginUsername").value = "";
      }

      $("#loginUsername").focus();
    });
  });

  $("#adminLogout").addEventListener("click", logout);
  $("#userLogout").addEventListener("click", logout);

  $("#newUserBtn").addEventListener("click", openNewUserModal);
  $("#userForm").addEventListener("submit", handleUserSave);
  $("#userSearch").addEventListener("input", renderUsers);

  $("#newTaskBtn").addEventListener("click", openNewTaskModal);
  $("#taskForm").addEventListener("submit", handleTaskSave);

  $("#rewardForm").addEventListener("submit", handleRewardSubmit);

  $("#rewardTask").addEventListener("change", () => {
    const task = getTask($("#rewardTask").value);

    if (task) {
      $("#rewardAmount").value = task.reward;
    }
  });

  $("#exportButton").addEventListener("click", exportHistoryCSV);

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close]");

    if (closeButton) {
      closeModal(closeButton.dataset.close);
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) return;

    const { action, id } = actionButton.dataset;

    switch (action) {
      case "edit-user":
        openEditUserModal(id);
        break;

      case "toggle-user":
        toggleUser(id);
        break;

      case "delete-user":
        deleteUser(id);
        break;

      case "edit-task":
        openEditTaskModal(id);
        break;

      case "toggle-task":
        toggleTask(id);
        break;

      case "delete-task":
        deleteTask(id);
        break;
    }
  });

  $$(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        backdrop.classList.add("hidden");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $$(".modal-backdrop").forEach((modal) => {
        modal.classList.add("hidden");
      });
    }
  });

  /*
    در این نسخه نمایشی نشست ورود فقط در حافظه صفحه نگه داشته می‌شود.
    با بارگذاری مجدد صفحه، کاربر باید دوباره وارد شود.
  */
}

/* -------------------- شروع برنامه -------------------- */

function initializeApp() {
  loadState();
  bindEvents();
  showLogin();
}

document.addEventListener("DOMContentLoaded", initializeApp);
