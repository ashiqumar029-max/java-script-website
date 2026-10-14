const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = "flowtask.tasks.v1";

const todayISO = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const makeId = () => (window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
const formatDate = value => {
  if (!value) return "No due date";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month:"short", day:"numeric", year: new Date().getFullYear() !== Number(value.slice(0,4)) ? "numeric" : undefined });
};

const seedTasks = [
  { id: makeId(), title:"Finalize portfolio homepage", description:"Polish the hero section and review mobile spacing.", priority:"High", due:todayISO(), category:"Portfolio", completed:false, createdAt:Date.now()-500000 },
  { id: makeId(), title:"Plan this week's content", description:"Outline three short-form video ideas.", priority:"Medium", due:"", category:"Content", completed:false, createdAt:Date.now()-350000 },
  { id: makeId(), title:"Review project feedback", description:"Collect notes and list the next improvements.", priority:"Low", due:"", category:"Work", completed:true, createdAt:Date.now()-200000 }
];

let tasks = loadTasks();
let currentView = "all";
let editingId = null;
let toastTimer;

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : seedTasks;
  } catch { return seedTasks; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function isOverdue(task) { return !task.completed && task.due && task.due < todayISO(); }
function isToday(task) { return task.due === todayISO(); }

function getVisibleTasks() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const priority = $("#priorityFilter").value;
  let list = tasks.filter(task => {
    const matchesView = currentView === "all" ||
      (currentView === "today" && isToday(task) && !task.completed) ||
      (currentView === "upcoming" && task.due && task.due > todayISO() && !task.completed) ||
      (currentView === "completed" && task.completed);
    const matchesQuery = !query || [task.title, task.description, task.category].join(" ").toLowerCase().includes(query);
    return matchesView && matchesQuery && (priority === "all" || task.priority === priority);
  });
  const sort = $("#sortSelect").value;
  list.sort((a,b) => {
    if (sort === "priority") {
      const ranks = { High:0, Medium:1, Low:2 };
      return ranks[a.priority] - ranks[b.priority] || (a.due || "9999").localeCompare(b.due || "9999");
    }
    if (sort === "created") return b.createdAt - a.createdAt;
    return (a.due || "9999").localeCompare(b.due || "9999") || b.createdAt - a.createdAt;
  });
  return list;
}

function render() {
  const visible = getVisibleTasks();
  const completed = tasks.filter(task => task.completed).length;
  const active = tasks.length - completed;
  const overdue = tasks.filter(isOverdue).length;
  $("#totalStat").textContent = tasks.length;
  $("#activeStat").textContent = active;
  $("#completedStat").textContent = completed;
  $("#overdueStat").textContent = overdue;
  $("#allCount").textContent = tasks.length;
  $("#todayCount").textContent = tasks.filter(task => isToday(task) && !task.completed).length;
  $("#weeklyProgress").style.width = `${tasks.length ? Math.round(completed / tasks.length * 100) : 0}%`;
  $("#progressText").textContent = `${completed} of ${tasks.length} tasks completed`;

  $("#taskList").innerHTML = visible.map(task => {
    const dueClass = isOverdue(task) ? "overdue" : isToday(task) && !task.completed ? "today" : "";
    const dueText = isOverdue(task) ? `Overdue · ${formatDate(task.due)}` : isToday(task) ? "Today" : formatDate(task.due);
    return `<article class="task-row ${task.completed ? "is-complete" : ""}" data-id="${escapeHTML(task.id)}">
      <div class="task-main"><input class="task-check" type="checkbox" aria-label="Mark task complete" ${task.completed ? "checked" : ""} data-action="toggle"><div><div class="task-name">${escapeHTML(task.title)}</div>${task.description ? `<div class="task-description">${escapeHTML(task.description)}</div>` : ""}${task.category ? `<span class="task-category">${escapeHTML(task.category)}</span>` : ""}</div></div>
      <span class="priority-pill priority-${task.priority.toLowerCase()}">${task.priority}</span>
      <span class="due-date ${dueClass}">${escapeHTML(dueText)}</span>
      <span class="status-pill ${task.completed ? "done" : ""}">${task.completed ? "Completed" : "In progress"}</span>
      <button class="row-menu" data-action="menu" aria-label="Task actions" title="Edit or delete">···</button>
    </article>`;
  }).join("");

  $("#emptyState").style.display = visible.length ? "none" : "block";
  $("#taskList").style.display = visible.length ? "block" : "none";
  $("#showingText").textContent = `Showing ${visible.length} of ${tasks.length} tasks`;
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === currentView));
  const names = { all:"All tasks", today:"Today", upcoming:"Upcoming", completed:"Completed" };
  $("#crumbTitle").textContent = names[currentView];
  $("#listHeading").textContent = currentView === "all" ? "Your tasks" : names[currentView];
  $("#pageTitle").innerHTML = currentView === "today" ? "Own your <em>day.</em>" : currentView === "completed" ? "Look what you’ve <em>done.</em>" : currentView === "upcoming" ? "What’s <em>next?</em>" : "Get things <em>flowing.</em>";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function openModal(task = null) {
  editingId = task?.id || null;
  $("#taskForm").reset();
  $("#modalTitle").textContent = editingId ? "Edit task" : "Create a task";
  $("#saveTaskBtn").textContent = editingId ? "Save changes" : "Create task";
  if (task) {
    $("#taskTitle").value = task.title;
    $("#taskDescription").value = task.description || "";
    $("#taskPriority").value = task.priority;
    $("#taskDue").value = task.due || "";
    $("#taskCategory").value = task.category || "";
  } else {
    $("#taskPriority").value = "Medium";
    $("#taskDue").value = todayISO();
  }
  $("#taskModal").classList.add("open");
  $("#taskModal").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#taskTitle").focus(), 50);
}
function closeModal() {
  $("#taskModal").classList.remove("open");
  $("#taskModal").setAttribute("aria-hidden", "true");
  editingId = null;
}
function handleSubmit(event) {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  const details = {
    title, description: $("#taskDescription").value.trim(),
    priority: $("#taskPriority").value, due: $("#taskDue").value,
    category: $("#taskCategory").value.trim()
  };
  if (editingId) {
    tasks = tasks.map(task => task.id === editingId ? { ...task, ...details } : task);
    showToast("Task updated successfully");
  } else {
    tasks.unshift({ id:makeId(), ...details, completed:false, createdAt:Date.now() });
    showToast("New task added — keep the flow going!");
  }
  saveTasks(); closeModal(); render();
}
function handleTaskAction(event) {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const row = control.closest("[data-id]");
  const task = tasks.find(item => item.id === row?.dataset.id);
  if (!task) return;
  if (control.dataset.action === "toggle") {
    task.completed = control.checked;
    saveTasks(); render();
    showToast(task.completed ? "Task completed. Nice work!" : "Task moved back to in progress");
  } else if (control.dataset.action === "menu") {
    const choice = prompt(`Task: ${task.title}\nType E to edit or D to delete:`, "E");
    if (choice?.toLowerCase() === "e") openModal(task);
    if (choice?.toLowerCase() === "d" && confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks(); render(); showToast("Task deleted");
    }
  }
}

$("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
$("#openTaskBtn").addEventListener("click", () => openModal());
$("#emptyAddBtn").addEventListener("click", () => openModal());
$("#closeModalBtn").addEventListener("click", closeModal);
$("#cancelModalBtn").addEventListener("click", closeModal);
$("#taskForm").addEventListener("submit", handleSubmit);
$("#taskList").addEventListener("click", handleTaskAction);
$("#taskList").addEventListener("change", event => {
  if (event.target.matches('[data-action="toggle"]')) handleTaskAction(event);
});
$("#taskModal").addEventListener("click", event => { if (event.target === $("#taskModal")) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
$$(".nav-item").forEach(button => button.addEventListener("click", () => { currentView = button.dataset.view; render(); }));
$("#searchInput").addEventListener("input", render);
$("#priorityFilter").addEventListener("change", render);
$("#sortSelect").addEventListener("change", render);
$("#clearCompletedBtn").addEventListener("click", () => {
  const count = tasks.filter(task => task.completed).length;
  if (!count) return showToast("No completed tasks to clear");
  if (confirm(`Clear ${count} completed task${count === 1 ? "" : "s"}?`)) {
    tasks = tasks.filter(task => !task.completed);
    saveTasks(); render(); showToast("Completed tasks cleared");
  }
});
$("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  const light = document.body.classList.contains("light-mode");
  $("#themeBtn").textContent = light ? "☾" : "☼";
  localStorage.setItem("flowtask.theme", light ? "light" : "dark");
});
if (localStorage.getItem("flowtask.theme") === "light") {
  document.body.classList.add("light-mode");
  $("#themeBtn").textContent = "☾";
}
render();