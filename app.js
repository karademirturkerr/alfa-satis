const STORAGE_KEY = "restaurant-cash-register-v1";
const appConfig = window.APP_CONFIG || {};
const DEFAULT_WHATSAPP_PHONE = "90 533 824 55 95";
const DEFAULT_WHATSAPP_PHONE_NORMALIZED = "905338245595";

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
const expensePaymentTypeInput = document.querySelector("#expensePaymentType");
const transactionTableBody = document.querySelector("#transactionTableBody");
const salesBreakdown = document.querySelector("#salesBreakdown");
const totalRevenue = document.querySelector("#totalRevenue");
const totalBank = document.querySelector("#totalBank");
const totalCash = document.querySelector("#totalCash");
const totalExpense = document.querySelector("#totalExpense");
const netAmount = document.querySelector("#netAmount");
const recordCount = document.querySelector("#recordCount");
const paymentDialog = document.querySelector("#paymentDialog");
const dialogProductInfo = document.querySelector("#dialogProductInfo");
const openProductFormButton = document.querySelector("#openProductFormButton");
const exportExcelButton = document.querySelector("#exportExcelButton");
const exportRangeButton = document.querySelector("#exportRangeButton");
const editDialog = document.querySelector("#editDialog");
const editTransactionForm = document.querySelector("#editTransactionForm");
const editTransactionId = document.querySelector("#editTransactionId");
const editProductField = document.querySelector("#editProductField");
const editProductSelect = document.querySelector("#editProductSelect");
const editTitleInput = document.querySelector("#editTitleInput");
const editAmountInput = document.querySelector("#editAmountInput");
const editPaymentField = document.querySelector("#editPaymentField");
const editPaymentType = document.querySelector("#editPaymentType");
const closeEditDialogButton = document.querySelector("#closeEditDialogButton");
const exportRangeDialog = document.querySelector("#exportRangeDialog");
const exportRangeForm = document.querySelector("#exportRangeForm");
const rangeStartDate = document.querySelector("#rangeStartDate");
const rangeEndDate = document.querySelector("#rangeEndDate");
const closeRangeDialogButton = document.querySelector("#closeRangeDialogButton");
const heroChips = document.querySelectorAll(".hero-chip[data-target]");
const whatsAppSettingsForm = document.querySelector("#whatsAppSettingsForm");
const whatsAppPhone = document.querySelector("#whatsAppPhone");
const whatsAppTime = document.querySelector("#whatsAppTime");
const whatsAppReportType = document.querySelector("#whatsAppReportType");
const whatsAppEnabled = document.querySelector("#whatsAppEnabled");
const whatsAppStatus = document.querySelector("#whatsAppStatus");
const sendTestWhatsAppButton = document.querySelector("#sendTestWhatsAppButton");
const openWhatsAppShareButton = document.querySelector("#openWhatsAppShareButton");

let reportSettings = createDefaultReportSettings();

let pendingProductId = null;

initialize();

async function initialize() {
  selectedDateInput.value = todayKey();
  bindEvents();
  setUiDisabled(true);

  try {
    state = await loadState();
    reportSettings = await loadReportSettings();
  } catch (error) {
    console.error("Veriler yuklenemedi, lokal yedek aciliyor.", error);
    state = createDefaultState();
    reportSettings = createDefaultReportSettings();
  }

  setUiDisabled(false);
  renderReportSettings();
  render();
}

function bindEvents() {
  selectedDateInput.addEventListener("change", render);

  heroChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      focusSection(chip.dataset.target);
    });
  });

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
      paymentType: expensePaymentTypeInput.value,
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

  exportExcelButton.addEventListener("click", () => {
    exportCurrentDayReport();
  });

  exportRangeButton.addEventListener("click", () => {
    const selectedDate = getSelectedDate();
    rangeStartDate.value = selectedDate;
    rangeEndDate.value = selectedDate;
    exportRangeDialog.showModal();
  });

  editTransactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const currentDay = getCurrentDay();
    const transaction = currentDay.transactions.find((item) => item.id === editTransactionId.value);
    if (!transaction) {
      return;
    }

    if (transaction.type === "sale") {
      transaction.productId = editProductSelect.value || transaction.productId;
      transaction.title = editTitleInput.value.trim();
      transaction.amount = Number(editAmountInput.value);
      transaction.paymentType = editPaymentType.value;
    } else {
      transaction.title = editTitleInput.value.trim();
      transaction.amount = Number(editAmountInput.value);
      transaction.paymentType = editPaymentType.value;
    }

    if (!transaction.title || Number.isNaN(transaction.amount) || transaction.amount <= 0) {
      return;
    }

    void persist();
    editDialog.close();
    render();
  });

  editProductSelect.addEventListener("change", () => {
    const selectedProduct = state.products.find((item) => item.id === editProductSelect.value);
    if (!selectedProduct) {
      return;
    }

    editTitleInput.value = selectedProduct.name;
    editAmountInput.value = String(selectedProduct.price);
  });

  closeEditDialogButton.addEventListener("click", () => {
    editDialog.close();
  });

  exportRangeForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!rangeStartDate.value || !rangeEndDate.value) {
      return;
    }

    if (rangeStartDate.value > rangeEndDate.value) {
      window.alert("Baslangic tarihi bitis tarihinden sonra olamaz.");
      return;
    }

    exportDateRangeReport(rangeStartDate.value, rangeEndDate.value);
    exportRangeDialog.close();
  });

  closeRangeDialogButton.addEventListener("click", () => {
    exportRangeDialog.close();
  });

  whatsAppSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nextSettings = {
      phone_number: DEFAULT_WHATSAPP_PHONE_NORMALIZED,
      send_time: whatsAppTime.value,
      is_enabled: whatsAppEnabled.checked,
      report_type: whatsAppReportType.value,
    };

    if (!nextSettings.phone_number || !nextSettings.send_time) {
      setWhatsAppStatus("Telefon ve saat zorunlu.", true);
      return;
    }

    try {
      setWhatsAppStatus("Ayarlar kaydediliyor...");
      reportSettings = await saveReportSettings(nextSettings);
      renderReportSettings();
      setWhatsAppStatus("WhatsApp rapor ayarlari kaydedildi.");
    } catch (error) {
      console.error(error);
      setWhatsAppStatus("Ayarlar kaydedilemedi.", true);
    }
  });

  sendTestWhatsAppButton.addEventListener("click", async () => {
    const phoneNumber = DEFAULT_WHATSAPP_PHONE_NORMALIZED;
    if (!phoneNumber) {
      setWhatsAppStatus("Test icin once telefon numarasi gir.", true);
      return;
    }

    if (!isRemoteStorageEnabled()) {
      setWhatsAppStatus("Test mesaji icin Supabase modu gerekli.", true);
      return;
    }

    try {
      setWhatsAppStatus("Test mesaji gonderiliyor...");
      await invokeWhatsAppFunction({
        mode: "test",
        phone_number: phoneNumber,
        report_type: whatsAppReportType.value,
        report_date: getSelectedDate(),
      });
      setWhatsAppStatus("Test mesaji gonderim istegi basariyla iletildi.");
    } catch (error) {
      console.error(error);
      setWhatsAppStatus("Test mesaji gonderilemedi.", true);
    }
  });

  openWhatsAppShareButton.addEventListener("click", () => {
    const phoneNumber = DEFAULT_WHATSAPP_PHONE_NORMALIZED;
    if (!phoneNumber) {
      setWhatsAppStatus("Paylasim icin once telefon numarasi gir.", true);
      return;
    }

    const currentDay = getCurrentDay();
    const reportText = buildWhatsAppShareMessage({
      reportDate: getSelectedDate(),
      transactions: currentDay.transactions,
      reportType: whatsAppReportType.value,
    });

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(reportText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWhatsAppStatus("WhatsApp mesaji yeni sekmede hazirlandi.");
  });
}

function render() {
  renderProducts();
  renderTransactions();
  renderSummary();
  renderBreakdown();
}

function renderReportSettings() {
  whatsAppPhone.value = DEFAULT_WHATSAPP_PHONE;
  whatsAppTime.value = reportSettings.send_time || "22:00";
  whatsAppReportType.value = reportSettings.report_type || "daily_summary";
  whatsAppEnabled.checked = Boolean(reportSettings.is_enabled);
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
      <td colspan="6">Bu gun icin henuz kayit yok.</td>
    `;
    transactionTableBody.append(emptyRow);
    return;
  }

  transactions.forEach((transaction) => {
    const row = document.createElement("tr");
    const isSale = transaction.type === "sale";
    const paymentLabel = getPaymentLabel(transaction.paymentType);

    row.innerHTML = `
      <td>${formatTime(transaction.createdAt)}</td>
      <td><span class="badge ${isSale ? "sale" : "expense"}">${isSale ? "Satis" : "Gider"}</span></td>
      <td>${escapeHtml(transaction.title)}</td>
      <td><span class="badge payment">${paymentLabel}</span></td>
      <td>${formatCurrency(transaction.amount)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-button edit" type="button" data-action="edit" data-id="${transaction.id}">Duzenle</button>
          <button class="table-action-button delete" type="button" data-action="delete" data-id="${transaction.id}">Sil</button>
        </div>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener("click", () => {
      openEditDialog(transaction.id);
    });

    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      deleteTransaction(transaction.id);
    });

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
  const bank = sales
    .filter((item) => item.paymentType === "pos")
    .reduce((sum, item) => sum + item.amount, 0);
  const cashExpenses = expenses
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankExpenses = expenses
    .filter((item) => item.paymentType === "bank")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = expenses.reduce((sum, item) => sum + item.amount, 0);

  totalRevenue.textContent = formatCurrency(revenue);
  totalCash.textContent = formatCurrency(cash - cashExpenses);
  totalBank.textContent = formatCurrency(bank - bankExpenses);
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

function openEditDialog(transactionId) {
  const transaction = getCurrentDay().transactions.find((item) => item.id === transactionId);
  if (!transaction) {
    return;
  }

  editTransactionId.value = transaction.id;
  editTitleInput.value = transaction.title;
  editAmountInput.value = String(transaction.amount);

  if (transaction.type === "sale") {
    editProductField.classList.remove("hidden");
    editPaymentField.classList.remove("hidden");
    editPaymentType.value = transaction.paymentType;
    renderEditProductOptions(transaction.productId);
  } else {
    editProductField.classList.add("hidden");
    editPaymentField.classList.remove("hidden");
    editPaymentType.value = transaction.paymentType === "bank" ? "bank" : "cash";
    editProductSelect.innerHTML = "";
  }

  editDialog.showModal();
}

function renderEditProductOptions(selectedProductId) {
  editProductSelect.innerHTML = "";

  state.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} - ${formatCurrency(product.price)}`;
    option.selected = product.id === selectedProductId;
    editProductSelect.append(option);
  });
}

function deleteTransaction(transactionId) {
  const shouldDelete = window.confirm("Silmek istedigine emin misin?");
  if (!shouldDelete) {
    return;
  }

  const currentDay = getCurrentDay();
  currentDay.transactions = currentDay.transactions.filter((item) => item.id !== transactionId);
  void persist();
  render();
}

function exportCurrentDayReport() {
  const selectedDate = getSelectedDate();
  const currentDay = getCurrentDay();
  const lines = buildReportLines(`${selectedDate} Gunluk Rapor`, currentDay.transactions);
  downloadCsv(`kasa-raporu-${selectedDate}.csv`, lines);
}

function exportDateRangeReport(startDate, endDate) {
  const dayKeys = Object.keys(state.days)
    .filter((dayKey) => dayKey >= startDate && dayKey <= endDate)
    .sort();

  const rangeTransactions = dayKeys.flatMap((dayKey) =>
    (state.days[dayKey]?.transactions || []).map((transaction) => ({
      ...transaction,
      reportDate: dayKey,
    }))
  );

  const lines = buildReportLines(`${startDate} - ${endDate} Tarih Araligi`, rangeTransactions, true);
  downloadCsv(`kasa-raporu-${startDate}-${endDate}.csv`, lines);
}

function buildReportLines(title, transactions, includeDateColumn = false) {
  const sales = transactions.filter((item) => item.type === "sale");
  const expenses = transactions.filter((item) => item.type === "expense");

  const revenue = sales.reduce((sum, item) => sum + item.amount, 0);
  const cash = sales
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bank = sales
    .filter((item) => item.paymentType === "pos")
    .reduce((sum, item) => sum + item.amount, 0);
  const cashExpenses = expenses
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankExpenses = expenses
    .filter((item) => item.paymentType === "bank")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const net = revenue - expenseTotal;

  const groupedSales = sales.reduce((accumulator, item) => {
    if (!accumulator[item.title]) {
      accumulator[item.title] = { count: 0, total: 0 };
    }

    accumulator[item.title].count += 1;
    accumulator[item.title].total += item.amount;
    return accumulator;
  }, {});

  const transactionHeader = includeDateColumn
    ? ["Tarih", "Saat", "Tur", "Aciklama", "Odeme", "Tutar"]
    : ["Saat", "Tur", "Aciklama", "Odeme", "Tutar"];

  const transactionRows = [...transactions]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((item) => {
      const baseRow = [
        formatTime(item.createdAt),
        item.type === "sale" ? "Satis" : "Gider",
        item.title,
        getPaymentLabel(item.paymentType),
        toExcelNumber(item.amount),
      ];

      return includeDateColumn ? [item.reportDate || "", ...baseRow] : baseRow;
    });

  return [
    ["Rapor", title],
    [],
    ["Ozet"],
    ["Total Ciro", toExcelNumber(revenue)],
    ["Banka Kasasi", toExcelNumber(bank - bankExpenses)],
    ["Nakit Kasa", toExcelNumber(cash - cashExpenses)],
    ["Gider", toExcelNumber(expenseTotal)],
    ["Net Kasa", toExcelNumber(net)],
    [],
    ["Satilan Urunler"],
    ["Urun", "Adet", "Toplam"],
    ...Object.entries(groupedSales)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([productTitle, data]) => [productTitle, data.count, toExcelNumber(data.total)]),
    [],
    ["Kasa Hareketleri"],
    transactionHeader,
    ...transactionRows,
  ];
}

function downloadCsv(fileName, lines) {
  const csvContent = "\uFEFF" + lines.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");
  const escapedValue = stringValue.replaceAll("\"", "\"\"");
  return `"${escapedValue}"`;
}

function toExcelNumber(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function getPaymentLabel(paymentType) {
  if (paymentType === "cash") {
    return "Nakit";
  }

  if (paymentType === "pos") {
    return "POS";
  }

  if (paymentType === "bank") {
    return "Banka Kasasi";
  }

  return "-";
}

function focusSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) {
    return;
  }

  document.querySelectorAll(".report-section").forEach((section) => {
    section.classList.remove("is-highlighted");
  });

  targetSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  targetSection.classList.add("is-highlighted");

  window.setTimeout(() => {
    targetSection.classList.remove("is-highlighted");
  }, 1300);
}

function createDefaultReportSettings() {
  return {
    phone_number: DEFAULT_WHATSAPP_PHONE_NORMALIZED,
    send_time: "22:00",
    is_enabled: false,
    report_type: "daily_summary",
  };
}

function buildWhatsAppShareMessage({ reportDate, transactions, reportType }) {
  const sales = transactions.filter((item) => item.type === "sale");
  const expenses = transactions.filter((item) => item.type === "expense");

  const totalRevenue = sales.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const cashSales = sales
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankSales = sales
    .filter((item) => item.paymentType === "pos")
    .reduce((sum, item) => sum + item.amount, 0);
  const cashExpenses = expenses
    .filter((item) => item.paymentType === "cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankExpenses = expenses
    .filter((item) => item.paymentType === "bank")
    .reduce((sum, item) => sum + item.amount, 0);

  const lines = [
    `Gun Sonu Raporu - ${reportDate}`,
    "",
    `Total Ciro: ${formatCurrency(totalRevenue)}`,
    `Nakit Kasa: ${formatCurrency(cashSales - cashExpenses)}`,
    `Banka Kasasi: ${formatCurrency(bankSales - bankExpenses)}`,
    `Toplam Gider: ${formatCurrency(totalExpense)}`,
    `Net Kasa: ${formatCurrency(totalRevenue - totalExpense)}`,
  ];

  if (reportType === "daily_with_top_products") {
    const topProducts = Object.values(
      sales.reduce((accumulator, item) => {
        if (!accumulator[item.title]) {
          accumulator[item.title] = { title: item.title, count: 0 };
        }

        accumulator[item.title].count += 1;
        return accumulator;
      }, {})
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    lines.push("", "En Cok Satanlar:");

    if (topProducts.length === 0) {
      lines.push("- Satis yok");
    } else {
      topProducts.forEach((item) => {
        lines.push(`- ${item.title}: ${item.count} adet`);
      });
    }
  }

  return lines.join("\n");
}

async function loadReportSettings() {
  if (!isRemoteStorageEnabled()) {
    return createDefaultReportSettings();
  }

  const response = await fetch(
    `${appConfig.supabaseUrl}/rest/v1/${appConfig.reportSettingsTable}?app_id=eq.${encodeURIComponent(appConfig.appId)}&select=phone_number,send_time,is_enabled,report_type`,
    {
      method: "GET",
      headers: createSupabaseHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Rapor ayarlari alinamadi: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0]
    ? {
        phone_number: rows[0].phone_number || DEFAULT_WHATSAPP_PHONE_NORMALIZED,
        send_time: rows[0].send_time || "22:00",
        is_enabled: Boolean(rows[0].is_enabled),
        report_type: rows[0].report_type || "daily_summary",
      }
    : createDefaultReportSettings();
}

async function saveReportSettings(nextSettings) {
  if (!isRemoteStorageEnabled()) {
    reportSettings = nextSettings;
    return nextSettings;
  }

  const payload = {
    app_id: appConfig.appId,
    phone_number: nextSettings.phone_number,
    send_time: nextSettings.send_time,
    is_enabled: nextSettings.is_enabled,
    report_type: nextSettings.report_type,
  };

  const response = await fetch(
    `${appConfig.supabaseUrl}/rest/v1/${appConfig.reportSettingsTable}?app_id=eq.${encodeURIComponent(appConfig.appId)}`,
    {
      method: "PATCH",
      headers: {
        ...createSupabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (response.ok) {
    const rows = await response.json();
    if (rows[0]) {
      return mapReportSettingsRow(rows[0]);
    }
  }

  if (!response.ok && response.status !== 404 && response.status !== 406) {
    throw new Error(`Rapor ayarlari guncellenemedi: ${response.status}`);
  }

  const createResponse = await fetch(`${appConfig.supabaseUrl}/rest/v1/${appConfig.reportSettingsTable}`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify([payload]),
  });

  if (!createResponse.ok) {
    throw new Error(`Rapor ayarlari olusturulamadi: ${createResponse.status}`);
  }

  const createdRows = await createResponse.json();
  return createdRows[0] ? mapReportSettingsRow(createdRows[0]) : nextSettings;
}

function mapReportSettingsRow(row) {
  return {
    phone_number: row.phone_number || DEFAULT_WHATSAPP_PHONE_NORMALIZED,
    send_time: row.send_time || "22:00",
    is_enabled: Boolean(row.is_enabled),
    report_type: row.report_type || "daily_summary",
  };
}

async function invokeWhatsAppFunction(payload) {
  const response = await fetch(
    `${appConfig.supabaseUrl}/functions/v1/${appConfig.whatsAppFunctionName}`,
    {
      method: "POST",
      headers: {
        ...createSupabaseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appConfig.appId,
        ...payload,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WhatsApp fonksiyonu basarisiz: ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

function normalizePhoneNumber(value) {
  return value.replaceAll(/\s+/g, "").replaceAll("+", "");
}

function setWhatsAppStatus(message, isError = false) {
  whatsAppStatus.textContent = message;
  whatsAppStatus.style.color = isError ? "var(--danger)" : "";
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
