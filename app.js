const STORAGE_KEY = "restaurant-cash-register-v1";
const appConfig = window.APP_CONFIG || {};

const defaultProducts = [
  { id: crypto.randomUUID(), name: "Hamburger Menu", price: 300 },
  { id: crypto.randomUUID(), name: "Hamburger", price: 250 },
  { id: crypto.randomUUID(), name: "Tavukburger Menu", price: 250 },
  { id: crypto.randomUUID(), name: "Tavukburger", price: 200 },
  { id: crypto.randomUUID(), name: "Karisik Tost", price: 110 },
  { id: crypto.randomUUID(), name: "Kasarli Tost", price: 100 },
  { id: crypto.randomUUID(), name: "Patso", price: 100 },
  { id: crypto.randomUUID(), name: "Sosisli Patso", price: 110 },
  { id: crypto.randomUUID(), name: "Doner", price: 100 },
  { id: crypto.randomUUID(), name: "Makarna", price: 200 },
  { id: crypto.randomUUID(), name: "Icecekler", price: 60 },
  { id: crypto.randomUUID(), name: "Ayran", price: 20 },
];

let state = createDefaultState();

const selectedDateInput = document.querySelector("#selectedDate");
const productList = document.querySelector("#productList");
const productForm = document.querySelector("#productForm");
const productNameInput = document.querySelector("#productName");
const productPriceInput = document.querySelector("#productPrice");
const expenseForm = document.querySelector("#expenseForm");
const expenseTitleInput = document.querySelector("#expenseTitle");
const expenseAmountInput = document.querySelector("#expenseAmount");
const transactionTableBody = document.querySelector("#transactionTableBody");
const salesBreakdown = document.querySelector("#salesBreakdown");
const totalRevenue = document.querySelector("#totalRevenue");
const totalPos = document.querySelector("#totalPos");
const totalCash = document.querySelector("#totalCash");
const totalExpense = document.querySelector("#totalExpense");
const netAmount = document.querySelector("#netAmount");
const recordCount = document.querySelector("#recordCount");
const paymentDialog = document.querySelector("#paymentDialog");
const dialogProductInfo = document.querySelector("#dialogProductInfo");
const openProductFormButton = document.querySelector("#openProductFormButton");
const resetDayButton = document.querySelector("#resetDayButton");

let pendingProductId = null;

initialize();

async function initialize() {
  selectedDateInput.value = todayKey();
  bindEvents();
  setUiDisabled(true);

  try {
    state = await loadState();
  } catch (error) {
    console.error("Veriler yuklenemedi, lokal yedek aciliyor.", error);
    state = createDefaultState();
  }

  setUiDisabled(false);
  render();
}

function bindEvents() {
  selectedDateInput.addEventListener("change", render);

  openProductFormButton.addEventListener("click", () => {
    productForm.classList.toggle("hidden");
    if (!productForm.classList.contains("hidden")) {
      productNameInput.focus();
    }
  });

  productForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = productNameInput.value.trim();
    const price = Number(productPriceInput.value);

    if (!name || Number.isNaN(price) || price <= 0) {
      return;
    }

    state.products.unshift({
      id: crypto.randomUUID(),
      name,
      price,
    });

    void persist();
    productForm.reset();
    productForm.classList.add("hidden");
    renderProducts();
  });

  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = expenseTitleInput.value.trim();
    const amount = Number(expenseAmountInput.value);

    if (!title || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const currentDate = getSelectedDate();

    ensureDay(currentDate).transactions.unshift({
      id: crypto.randomUUID(),
      type: "expense",
      title,
      amount,
      paymentType: "-",
      createdAt: new Date().toISOString(),
    });

    void persist();
    expenseForm.reset();
    render();
  });

  paymentDialog.addEventListener("close", () => {
    const paymentType = paymentDialog.returnValue;
    if (!pendingProductId || !["cash", "pos"].includes(paymentType)) {
      pendingProductId = null;
      return;
    }

    addSale(pendingProductId, paymentType);
    pendingProductId = null;
  });

  resetDayButton.addEventListener("click", () => {
    const currentDate = getSelectedDate();
    const shouldDelete = window.confirm(
      `${currentDate} tarihindeki tum hareketleri silmek istiyor musun?`
    );

    if (!shouldDelete) {
      return;
    }

    state.days[currentDate] = { transactions: [] };
    void persist();
    render();
  });
}

function render() {
  renderProducts();
  renderTransactions();
  renderSummary();
  renderBreakdown();
}

function renderProducts() {
  productList.innerHTML = "";

  state.products.forEach((product) => {
    const item = document.createElement("article");
    item.className = "product-item";

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.innerHTML = `
      <strong>${escapeHtml(product.name)}</strong>
      <span>${formatCurrency(product.price)}</span>
    `;

    const button = document.createElement("button");
    button.className = "plus-button";
    button.type = "button";
    button.textContent = "+";
    button.setAttribute("aria-label", `${product.name} satisini ekle`);
    button.addEventListener("click", () => openPaymentDialog(product));

    item.append(meta, button);
    productList.append(item);
  });
}

function renderTransactions() {
  const currentDay = getCurrentDay();
  transactionTableBody.innerHTML = "";

  const transactions = [...currentDay.transactions].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  recordCount.textContent = `${transactions.length} hareket`;

  if (transactions.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="5">Bu gun icin henuz kayit yok.</td>
    `;
    transactionTableBody.append(emptyRow);
    return;
  }

  transactions.forEach((transaction) => {
    const row = document.createElement("tr");
    const isSale = transaction.type === "sale";
    const paymentLabel =
      transaction.paymentType === "cash"
        ? "Nakit"
        : transaction.paymentType === "pos"
          ? "POS"
          : "-";

    row.innerHTML = `
      <td>${formatTime(transaction.createdAt)}</td>
      <td><span class="badge ${isSale ? "sale" : "expense"}">${isSale ? "Satis" : "Gider"}</span></td>
      <td>${escapeHtml(transaction.title)}</td>
      <td><span class="badge payment">${paymentLabel}</span></td>
      <td>${formatCurrency(transaction.amount)}</td>
    `;

    transactionTableBody.append(row);
  });
}

function renderSummary() {
  const currentDay = getCurrentDay();
  const sales = currentDay.transactions.filter((item) => item.type === "sale");
  const expenses = currentDay.transactions.filter((item) => item.type === "expense");

  const revenue = sales.reduce((sum, item) => sum + item.amount, 0);
  const cash = sales
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const pos = sales
    .filter((item) => item.paymentType === "pos")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = expenses.reduce((sum, item) => sum + item.amount, 0);

  totalRevenue.textContent = formatCurrency(revenue);
  totalCash.textContent = formatCurrency(cash);
  totalPos.textContent = formatCurrency(pos);
  totalExpense.textContent = formatCurrency(expense);
  netAmount.textContent = formatCurrency(revenue - expense);
}

function renderBreakdown() {
  const sales = getCurrentDay().transactions.filter((item) => item.type === "sale");
  salesBreakdown.innerHTML = "";

  if (sales.length === 0) {
    salesBreakdown.innerHTML = "<p class=\"helper-text\">Henuz satis yok.</p>";
    return;
  }

  const grouped = sales.reduce((accumulator, item) => {
    if (!accumulator[item.productId]) {
      accumulator[item.productId] = {
        title: item.title,
        count: 0,
        total: 0,
      };
    }

    accumulator[item.productId].count += 1;
    accumulator[item.productId].total += item.amount;
    return accumulator;
  }, {});

  Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .forEach((item) => {
      const row = document.createElement("article");
      row.className = "breakdown-item";
      row.innerHTML = `
        <div class="breakdown-meta">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${item.count} adet satildi</span>
        </div>
        <strong>${formatCurrency(item.total)}</strong>
      `;
      salesBreakdown.append(row);
    });
}

function openPaymentDialog(product) {
  pendingProductId = product.id;
  dialogProductInfo.textContent = `${product.name} - ${formatCurrency(product.price)}`;
  paymentDialog.showModal();
}

function addSale(productId, paymentType) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  ensureDay(getSelectedDate()).transactions.unshift({
    id: crypto.randomUUID(),
    type: "sale",
    title: product.name,
    productId: product.id,
    amount: Number(product.price),
    paymentType,
    createdAt: new Date().toISOString(),
  });

  void persist();
  render();
}

function getSelectedDate() {
  return selectedDateInput.value || todayKey();
}

function getCurrentDay() {
  return ensureDay(getSelectedDate());
}

function ensureDay(dayKey) {
  if (!state.days[dayKey]) {
    state.days[dayKey] = { transactions: [] };
  }

  return state.days[dayKey];
}

async function loadState() {
  if (isRemoteStorageEnabled()) {
    return loadRemoteState();
  }

  return loadLocalState();
}

async function persist() {
  if (isRemoteStorageEnabled()) {
    await persistRemoteState();
    return;
  }

  persistLocalState();
}

function loadLocalState() {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return createDefaultState();
  }

  try {
    const parsed = JSON.parse(storedValue);
    return normalizeState(parsed);
  } catch (error) {
    console.error("Veri okunamadi, varsayilan veri kullaniliyor.", error);
    return createDefaultState();
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadRemoteState() {
  const response = await fetch(
    `${appConfig.supabaseUrl}/rest/v1/${appConfig.supabaseTable}?app_id=eq.${encodeURIComponent(appConfig.appId)}&select=data`,
    {
      method: "GET",
      headers: createSupabaseHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Remote veri alinamadi: ${response.status}`);
  }

  const rows = await response.json();
  const remoteRow = rows[0];

  if (!remoteRow) {
    const initialState = createDefaultState();
    state = initialState;
    await createRemoteState(initialState);
    return initialState;
  }

  return normalizeState(remoteRow.data);
}

async function createRemoteState(initialState) {
  const response = await fetch(`${appConfig.supabaseUrl}/rest/v1/${appConfig.supabaseTable}`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([
      {
        app_id: appConfig.appId,
        data: initialState,
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Remote veri olusturulamadi: ${response.status}`);
  }
}

async function persistRemoteState() {
  const response = await fetch(
    `${appConfig.supabaseUrl}/rest/v1/${appConfig.supabaseTable}?app_id=eq.${encodeURIComponent(appConfig.appId)}`,
    {
      method: "PATCH",
      headers: {
        ...createSupabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        data: state,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Remote veri kaydedilemedi: ${response.status}`);
  }
}

function createSupabaseHeaders() {
  return {
    apikey: appConfig.supabaseAnonKey,
    Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
  };
}

function isRemoteStorageEnabled() {
  return (
    appConfig.storageMode === "supabase" &&
    typeof appConfig.supabaseUrl === "string" &&
    appConfig.supabaseUrl.length > 0 &&
    typeof appConfig.supabaseAnonKey === "string" &&
    appConfig.supabaseAnonKey.length > 0
  );
}

function createDefaultState() {
  return {
    products: defaultProducts.map((product) => ({ ...product })),
    days: {},
  };
}

function normalizeState(input) {
  return {
    products:
      Array.isArray(input?.products) && input.products.length > 0
        ? input.products
        : defaultProducts.map((product) => ({ ...product })),
    days: input?.days || {},
  };
}

function setUiDisabled(isDisabled) {
  const interactiveElements = document.querySelectorAll("button, input");
  interactiveElements.forEach((element) => {
    element.disabled = isDisabled;
  });
}

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(isoDate) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
