
/* ==========================================
   EXPENZA — Expense Tracker
   Features:
   - Add and delete transactions
   - Income, expenses and balance calculations
   - Monthly budget tracker
   - Category-wise expense chart
   - Search and filters
   - CSV export
   - Local Storage persistence
========================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "expenza.transactions.v1";
  const BUDGET_KEY = "expenza.monthlyBudget.v1";
  const DEFAULT_BUDGET = 2000;
  const CURRENCY = "USD";

  const CATEGORIES = {
    expense: [
      ["Food & Dining", "🍜", "#8cf0b2"],
      ["Shopping", "🛍️", "#9c9bff"],
      ["Transport", "🚗", "#ffc477"],
      ["Bills & Utilities", "💡", "#78c8ff"],
      ["Entertainment", "🎬", "#ff9fc8"],
      ["Health", "💊", "#ff8b8b"],
      ["Education", "📚", "#d5a5ff"],
      ["Travel", "✈️", "#6fe0dc"],
      ["Other", "✦", "#a8b5ab"]
    ],

    income: [
      ["Salary", "💼", "#8cf0b2"],
      ["Freelance", "💻", "#78c8ff"],
      ["Investment", "📈", "#c5a1ff"],
      ["Gift", "🎁", "#ff9fc8"],
      ["Other", "✦", "#a8b5ab"]
    ]
  };

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    [...document.querySelectorAll(selector)];

  const el = {
    balance: $("#totalBalance"),
    income: $("#totalIncome"),
    expenses: $("#totalExpenses"),
    savings: $("#savingsRate"),
    savingsCaption: $("#savingsCaption"),

    today: $("#todayLabel"),
    year: $("#yearLabel"),

    modal: $("#transactionModal"),
    open: $("#openTransactionModal"),
    close: $("#closeTransactionModal"),
    cancel: $("#cancelTransaction"),
    form: $("#transactionForm"),
    modalTitle: $("#modalTitle"),

    name: $("#transactionName"),
    amount: $("#transactionAmount"),
    category: $("#transactionCategory"),
    date: $("#transactionDate"),

    rows: $("#transactionRows"),
    empty: $("#emptyState"),
    count: $("#transactionCount"),

    search: $("#searchTransactions"),
    typeFilter: $("#typeFilter"),
    categoryFilter: $("#categoryFilter"),

    chartPeriod: $("#chartPeriod"),
    chartEmpty: $("#chartEmpty"),
    legend: $("#categoryLegend"),

    budgetSpent: $("#budgetSpent"),
    budgetLabel: $("#budgetLimitLabel"),
    editBudget: $("#editBudgetBtn"),
    progress: $("#budgetProgress"),
    percent: $("#budgetPercent"),
    remaining: $("#budgetRemaining"),

    export: $("#exportCsvBtn"),
    clear: $("#clearAllBtn"),
    emptyAdd: $("#emptyAddBtn"),
    toast: $("#toast")
  };

  // Date in local timezone
  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function makeId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `tx-${Date.now()}-${Math.random()
      .toString(16).slice(2)}`;
  }

  // Load saved transactions safely
  function loadTransactions() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(saved)) return [];

      return saved
        .filter((t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.name === "string" &&
          Number.isFinite(Number(t.amount)) &&
          Number(t.amount) > 0 &&
          ["income", "expense"].includes(t.type) &&
          typeof t.category === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(t.date)
        )
        .map((t) => ({
          ...t,
          amount: Number(t.amount),
          createdAt: Number(t.createdAt) || 0
        }));
    } catch (error) {
      console.warn("Unable to load transactions:", error);
      return [];
    }
  }

  let transactions = loadTransactions();
  let monthlyBudget = loadBudget();
  let spendingChart = null;
  let toastTimer = null;

  function saveTransactions() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
      );

      return true;
    } catch (error) {
      console.error("Could not save transactions:", error);
      showToast("Unable to save data. Check browser storage.");
      return false;
    }
  }

  function loadBudget() {
    try {
      const saved = Number(
        localStorage.getItem(BUDGET_KEY)
      );

      return Number.isFinite(saved) && saved > 0
        ? saved
        : DEFAULT_BUDGET;
    } catch {
      return DEFAULT_BUDGET;
    }
  }

  function saveBudget() {
    try {
      localStorage.setItem(
        BUDGET_KEY,
        String(monthlyBudget)
      );
    } catch (error) {
      console.warn("Could not save budget:", error);
    }
  }

  // Currency formatting
  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function isThisMonth(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  function getCategory(categoryName) {
    for (const group of Object.values(CATEGORIES)) {
      const found = group.find(
        (category) => category[0] === categoryName
      );

      if (found) {
        return {
          name: found[0],
          icon: found[1],
          color: found[2]
        };
      }
    }

    return {
      name: categoryName || "Other",
      icon: "✦",
      color: "#a8b5ab"
    };
  }

  // Notification message
  function showToast(message) {
    if (!el.toast) return;

    el.toast.textContent = message;
    el.toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 2800);
  }

  // Transaction modal
  function selectedType() {
    return (
      $('input[name="transactionType"]:checked')?.value ||
      "expense"
    );
  }

  function renderCategoryOptions() {
    const type = selectedType();
    const previousValue = el.category.value;

    el.category.innerHTML = CATEGORIES[type]
      .map((category) => `
        <option value="${escapeHTML(category[0])}">
          ${category[1]} ${escapeHTML(category[0])}
        </option>
      `)
      .join("");

    if (
      CATEGORIES[type].some(
        (category) => category[0] === previousValue
      )
    ) {
      el.category.value = previousValue;
    }
  }

  function openModal() {
    el.form.reset();
    el.date.value = localDate();
    el.modalTitle.textContent = "Add transaction";

    renderCategoryOptions();

    el.modal.classList.add("open");
    el.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => el.name.focus(), 50);
  }

  function closeModal() {
    el.modal.classList.remove("open");
    el.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Category filter
  function renderCategoryFilter() {
    const currentValue = el.categoryFilter.value;

    const categories = [
      ...new Set(
        transactions.map((transaction) => transaction.category)
      )
    ].sort((a, b) => a.localeCompare(b));

    el.categoryFilter.innerHTML =
      '<option value="all">All categories</option>' +
      categories.map((category) => `
        <option value="${escapeHTML(category)}">
          ${escapeHTML(category)}
        </option>
      `).join("");

    el.categoryFilter.value =
      categories.includes(currentValue)
        ? currentValue
        : "all";
  }

  // Calculate income and expenses
  function calculateTotals(list = transactions) {
    return list.reduce((totals, transaction) => {
      if (transaction.type === "income") {
        totals.income += transaction.amount;
      } else {
        totals.expenses += transaction.amount;
      }

      return totals;
    }, {
      income: 0,
      expenses: 0
    });
  }

  function renderSummary() {
    const totals = calculateTotals();
    const balance = totals.income - totals.expenses;

    const savingsRate = totals.income > 0
      ? Math.round((balance / totals.income) * 100)
      : 0;

    el.balance.textContent = money(balance);
    el.income.textContent = money(totals.income);
    el.expenses.textContent = money(totals.expenses);

    el.savings.textContent = `${savingsRate}%`;

    el.savingsCaption.textContent =
      totals.income > 0
        ? savingsRate >= 0
          ? "Of your income retained"
          : "Spending above income"
        : "Add income to calculate savings";

    el.balance.style.color =
      balance < 0 ? "var(--red)" : "";

    el.savings.style.color =
      savingsRate < 0 ? "var(--red)" : "";
  }

  // Search, category and type filtering
  function getFilteredTransactions() {
    const query = el.search.value.trim().toLowerCase();
    const type = el.typeFilter.value;
    const category = el.categoryFilter.value;

    return [...transactions]
      .filter((transaction) => {
        const matchesSearch =
          !query ||
          transaction.name.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query);

        const matchesType =
          type === "all" || transaction.type === type;

        const matchesCategory =
          category === "all" ||
          transaction.category === category;

        return (
          matchesSearch &&
          matchesType &&
          matchesCategory
        );
      })
      .sort((a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt - a.createdAt
      );
  }

  // Render transaction table
  function renderTransactions() {
    const list = getFilteredTransactions();

    el.rows.innerHTML = list.map((transaction) => {
      const category = getCategory(transaction.category);

      const isIncome = transaction.type === "income";
      const sign = isIncome ? "+" : "−";
      const label = isIncome ? "Income" : "Expense";

      return `
        <tr>
          <td>
            <div class="transaction-name">
              <span class="transaction-icon">
                ${category.icon}
              </span>
              <span>${escapeHTML(transaction.name)}</span>
            </div>
          </td>

          <td>${escapeHTML(transaction.category)}</td>

          <td>${formatDate(transaction.date)}</td>

          <td>
            <span class="type-pill type-${transaction.type}">
              ${label}
            </span>
          </td>

          <td class="align-right amount ${transaction.type}">
            ${sign}${money(transaction.amount)}
          </td>

          <td class="align-right">
            <button
              class="delete-btn"
              type="button"
              data-delete-id="${escapeHTML(transaction.id)}"
              aria-label="Delete ${escapeHTML(transaction.name)}"
              title="Delete transaction"
            >×</button>
          </td>
        </tr>
      `;
    }).join("");

    const isEmpty = list.length === 0;

    el.empty.style.display = isEmpty ? "block" : "none";
    el.rows.closest("table").style.display =
      isEmpty ? "none" : "table";

    if (transactions.length === 0) {
      el.empty.querySelector("b").textContent =
        "No transactions yet";

      el.empty.querySelector("p").textContent =
        "Add your first income or expense to get started.";

      el.emptyAdd.style.display = "inline-block";
    } else if (isEmpty) {
      el.empty.querySelector("b").textContent =
        "No matching transactions";

      el.empty.querySelector("p").textContent =
        "Try another search or change your filters.";

      el.emptyAdd.style.display = "none";
    }

    el.count.textContent =
      `${list.length} of ${transactions.length} transaction` +
      `${transactions.length === 1 ? "" : "s"}`;
  }

  // Category chart using Chart.js
  function renderChart() {
    const period = el.chartPeriod.value;
    const categoryTotals = {};

    transactions
      .filter((transaction) =>
        transaction.type === "expense" &&
        (period === "all" || isThisMonth(transaction.date))
      )
      .forEach((transaction) => {
        const category = transaction.category;

        categoryTotals[category] =
          (categoryTotals[category] || 0) +
          transaction.amount;
      });

    const entries = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1]);

    el.chartEmpty.style.display =
      entries.length ? "none" : "flex";

    el.chartEmpty.textContent =
      "Add an expense to see your breakdown.";

    el.legend.innerHTML = entries.map(([name, amount]) => {
      const category = getCategory(name);

      return `
        <span class="legend-item">
          <span
            class="legend-dot"
            style="background:${category.color}"
          ></span>
          ${escapeHTML(name)}
          <b>${money(amount)}</b>
        </span>
      `;
    }).join("");

    if (typeof window.Chart !== "function") {
      el.chartEmpty.textContent =
        "Chart library couldn't load. Check your internet connection.";

      el.chartEmpty.style.display = "flex";
      return;
    }

    if (spendingChart) {
      spendingChart.destroy();
    }

    spendingChart = new Chart($("#spendingChart"), {
      type: "doughnut",

      data: {
        labels: entries.map(([name]) => name),

        datasets: [{
          data: entries.map(([, amount]) => amount),

          backgroundColor: entries.map(
            ([name]) => getCategory(name).color
          ),

          borderColor: "#171e19",
          borderWidth: 4,
          hoverOffset: 5
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            backgroundColor: "#202b23",
            titleColor: "#edf4ee",
            bodyColor: "#b7c5ba",

            callbacks: {
              label(context) {
                return ` ${money(context.raw)}`;
              }
            }
          }
        }
      }
    });
  }

  // Monthly budget calculations
  function renderBudget() {
    const spent = transactions
      .filter((transaction) =>
        transaction.type === "expense" &&
        isThisMonth(transaction.date)
      )
      .reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );

    const percentage = (spent / monthlyBudget) * 100;
    const remaining = monthlyBudget - spent;

    el.budgetSpent.textContent = money(spent);
    el.budgetLabel.textContent = money(monthlyBudget);

    el.progress.style.width =
      `${Math.min(percentage, 100)}%`;

    el.progress.classList.toggle(
      "over",
      percentage > 100
    );

    el.percent.textContent =
      `${Math.round(percentage)}% used`;

    el.remaining.textContent =
      remaining >= 0
        ? `${money(remaining)} left`
        : `${money(Math.abs(remaining))} over budget`;

    const note = el.budgetSpent
      .closest(".panel")
      .querySelector(".budget-note");

    if (percentage > 100) {
      note.style.color = "var(--red)";
      note.querySelector("b").textContent = "!";
      note.querySelector("p").textContent =
        "You've passed your monthly budget. Review your spending.";
    } else if (percentage >= 80) {
      note.style.color = "#f1d58a";
      note.querySelector("b").textContent = "◈";
      note.querySelector("p").textContent =
        "You're close to your budget limit. Spend mindfully.";
    } else {
      note.style.color = "var(--green)";
      note.querySelector("b").textContent = "✦";
      note.querySelector("p").textContent =
        "You're on your way to a healthier money habit. Keep it up!";
    }
  }

  function renderAll() {
    renderSummary();
    renderCategoryFilter();
    renderTransactions();
    renderChart();
    renderBudget();
  }

  // Add transaction
  function addTransaction(event) {
    event.preventDefault();

    const name = el.name.value.trim();
    const amount = Number(el.amount.value);
    const type = selectedType();
    const category = el.category.value;
    const date = el.date.value;

    if (!name) {
      showToast("Please enter a transaction name.");
      el.name.focus();
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter an amount greater than zero.");
      el.amount.focus();
      return;
    }

    if (
      !date ||
      Number.isNaN(new Date(`${date}T12:00:00`).getTime())
    ) {
      showToast("Please choose a valid date.");
      el.date.focus();
      return;
    }

    transactions.push({
      id: makeId(),
      name,
      amount: Math.round(
        (amount + Number.EPSILON) * 100
      ) / 100,
      type,
      category,
      date,
      createdAt: Date.now()
    });

    saveTransactions();
    closeModal();

    el.search.value = "";
    el.typeFilter.value = "all";
    el.categoryFilter.value = "all";

    renderAll();

    showToast(
      `${type === "income" ? "Income" : "Expense"} added successfully.`
    );
  }

  // Delete a single transaction
  function deleteTransaction(id) {
    const transaction = transactions.find(
      (item) => item.id === id
    );

    if (!transaction) return;

    const confirmed = window.confirm(
      `Delete "${transaction.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    transactions = transactions.filter(
      (item) => item.id !== id
    );

    saveTransactions();
    renderAll();
    showToast("Transaction deleted.");
  }

  // Change monthly budget
  function editBudget() {
    const answer = window.prompt(
      "Enter your monthly budget limit:",
      String(monthlyBudget)
    );

    if (answer === null) return;

    const value = Number(answer);

    if (!Number.isFinite(value) || value <= 0) {
      showToast("Enter a budget greater than zero.");
      return;
    }

    monthlyBudget = Math.round(
      (value + Number.EPSILON) * 100
    ) / 100;

    saveBudget();
    renderBudget();
    showToast("Monthly budget updated.");
  }

  // Export transactions to CSV
  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    if (!transactions.length) {
      showToast("There are no transactions to export yet.");
      return;
    }

    const headers = [
      "Name",
      "Type",
      "Category",
      "Date",
      "Amount",
      "Currency"
    ];

    const rows = transactions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((transaction) => [
        transaction.name,
        transaction.type,
        transaction.category,
        transaction.date,
        transaction.amount.toFixed(2),
        CURRENCY
      ].map(csvCell).join(","));

    const csv = [
      headers.map(csvCell).join(","),
      ...rows
    ].join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `expenza-transactions-${localDate()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  }

  // Clear all transactions
  function clearAllTransactions() {
    if (!transactions.length) {
      showToast("There are no transactions to clear.");
      return;
    }

    const confirmed = window.confirm(
      "Delete ALL transactions? This cannot be undone."
    );

    if (!confirmed) return;

    transactions = [];
    saveTransactions();
    renderAll();
    showToast("All transactions cleared.");
  }

  // Initialize the dashboard
  function init() {
    el.today.textContent =
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      }).format(new Date());

    el.year.textContent = new Date().getFullYear();
    el.date.value = localDate();

    renderCategoryOptions();
    renderAll();

    el.open.addEventListener("click", openModal);
    el.emptyAdd.addEventListener("click", openModal);

    el.close.addEventListener("click", closeModal);
    el.cancel.addEventListener("click", closeModal);

    el.modal.addEventListener("click", (event) => {
      if (event.target === el.modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        el.modal.classList.contains("open")
      ) {
        closeModal();
      }
    });

    $$('input[name="transactionType"]').forEach((radio) => {
      radio.addEventListener("change", renderCategoryOptions);
    });

    el.form.addEventListener("submit", addTransaction);

    el.rows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-id]");

      if (button) {
        deleteTransaction(button.dataset.deleteId);
      }
    });

    el.search.addEventListener("input", renderTransactions);
    el.typeFilter.addEventListener("change", renderTransactions);
    el.categoryFilter.addEventListener("change", renderTransactions);

    el.chartPeriod.addEventListener("change", renderChart);
    el.editBudget.addEventListener("click", editBudget);
    el.export.addEventListener("click", exportCSV);
    el.clear.addEventListener("click", clearAllTransactions);
  }

  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );
})();
