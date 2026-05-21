const sidebar = document.querySelector("#sidebar");
const menuButton = document.querySelector("#menuButton");
const themeButton = document.querySelector("#themeButton");
const shareAllButton = document.querySelector("#shareAllButton");
const copyAllButton = document.querySelector("#copyAllButton");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPinInput = document.querySelector("#adminPinInput");
const adminState = document.querySelector("#adminState");
const pinRow = document.querySelector("#pinRow");
const adminLogoutButton = document.querySelector("#adminLogoutButton");
const adminLockedPanel = document.querySelector("#adminLockedPanel");
const adminUploadPanel = document.querySelector("#adminUploadPanel");
const navItems = document.querySelectorAll(".nav-item");
const detailNavButton = document.querySelector("#detailNavButton");
const backButton = document.querySelector("#backButton");
const detailBackButton = document.querySelector("#detailBackButton");
const viewEyebrow = document.querySelector("#viewEyebrow");
const viewTitle = document.querySelector("#viewTitle");
const searchInput = document.querySelector("#searchInput");
const fromDateInput = document.querySelector("#fromDateInput");
const toDateInput = document.querySelector("#toDateInput");
const searchButton = document.querySelector("#searchButton");
const clearFiltersButton = document.querySelector("#clearFiltersButton");
const prevPageButton = document.querySelector("#prevPageButton");
const nextPageButton = document.querySelector("#nextPageButton");
const uploadForm = document.querySelector("#uploadForm");
const clearFormButton = document.querySelector("#clearFormButton");
const results = document.querySelector("#results");
const template = document.querySelector("#listTemplate");
const globalStatus = document.querySelector("#globalStatus");
const statusMessage = document.querySelector("#statusMessage");
const resultCount = document.querySelector("#resultCount");
const pageInfo = document.querySelector("#pageInfo");
const resultsTitle = document.querySelector("#resultsTitle");
const totalLists = document.querySelector("#totalLists");
const totalApps = document.querySelector("#totalApps");
const latestDate = document.querySelector("#latestDate");
const detailAppName = document.querySelector("#detailAppName");
const detailDate = document.querySelector("#detailDate");
const detailContent = document.querySelector("#detailContent");
const detailCopyButton = document.querySelector("#detailCopyButton");

const state = {
  view: "finderView",
  previousView: "finderView",
  page: 1,
  pageSize: 25,
  pageCount: 1,
  adminPin: sessionStorage.getItem("rw-admin-pin") || "",
  selectedList: null
};

const viewTitles = {
  finderView: ["Finder", "Search Lists"],
  adminView: ["Admin", "Upload List"],
  detailView: ["Selected List", "List Details"]
};

const savedTheme = localStorage.getItem("rw-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeButton.textContent = "Light theme";
}

function setStatus(message, type = "") {
  globalStatus.textContent = message;
  globalStatus.className = `global-status ${type}`.trim();
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
}

function isAdminUnlocked() {
  return state.adminPin === "952518";
}

function updateAdminUi() {
  const unlocked = isAdminUnlocked();
  adminState.textContent = unlocked ? "Admin unlocked" : "Admin locked";
  pinRow.hidden = unlocked;
  adminLogoutButton.hidden = !unlocked;
  adminLockedPanel.hidden = unlocked;
  adminUploadPanel.hidden = !unlocked;
}

function setView(viewId, rememberPrevious = true) {
  if (rememberPrevious && state.view !== viewId) {
    state.previousView = state.view;
  }
  state.view = viewId;

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  const [eyebrow, title] = viewTitles[viewId] || viewTitles.finderView;
  viewEyebrow.textContent = eyebrow;
  viewTitle.textContent = title;
  backButton.hidden = viewId === "finderView";
  sidebar.classList.remove("open");
}

function formatDate(date) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function exactCopyText(item) {
  return item.content;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

async function fetchAllText() {
  const response = await fetch("/api/lists/all-text");
  if (!response.ok) throw new Error("Could not load all lists.");
  return response.text();
}

async function loadStats() {
  const response = await fetch("/api/stats");
  const data = await response.json();
  if (!response.ok) return;

  totalLists.textContent = data.totalLists;
  totalApps.textContent = data.totalApps;
  latestDate.textContent = formatDate(data.latestDate);
}

function renderLists(lists, meta) {
  results.replaceChildren();
  state.page = meta.page;
  state.pageCount = meta.pageCount;

  resultCount.textContent = `${meta.total} found`;
  pageInfo.textContent = `Page ${meta.page} of ${meta.pageCount}`;
  prevPageButton.disabled = meta.page <= 1;
  nextPageButton.disabled = meta.page >= meta.pageCount;

  if (!lists.length) {
    setStatus("No list found. Try another app name or clear the date range.");
    return;
  }

  setStatus("Showing matching lists arranged date wise.", "success");
  lists.forEach((item) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".list-card");
    const openButton = node.querySelector(".list-open");
    const copyButton = node.querySelector(".copy-button");

    card.dataset.id = item.id;
    node.querySelector("strong").textContent = item.appName;
    node.querySelector(".list-date").textContent = formatDate(item.date);
    node.querySelector("small").textContent = `${item.lineCount} lines`;
    node.querySelector("pre").textContent = item.preview || item.content;

    openButton.addEventListener("click", () => openDetail(item));
    copyButton.addEventListener("click", async () => {
      await copyText(exactCopyText(item));
      setStatus("Copied exactly as pasted.", "success");
    });

    results.appendChild(node);
  });
}

async function loadLists(page = 1) {
  const params = new URLSearchParams();
  const appName = searchInput.value.trim();
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (appName) params.set("appName", appName);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  params.set("page", page);
  params.set("pageSize", state.pageSize);

  resultsTitle.textContent = appName || fromDate || toDate ? "Filtered Lists" : "All Lists";
  setStatus("Loading lists...");

  const response = await fetch(`/api/lists?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load lists.");
  }

  renderLists(data.lists, data.meta);
}

function openDetail(item) {
  state.selectedList = item;
  detailNavButton.disabled = false;
  detailAppName.textContent = item.appName;
  detailDate.textContent = formatDate(item.date);
  detailContent.textContent = item.content;
  setView("detailView");
}

function resetFilters() {
  searchInput.value = "";
  fromDateInput.value = "";
  toDateInput.value = "";
  loadLists(1).catch((error) => setStatus(error.message, "error"));
}

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = adminPinInput.value.trim();
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || "Admin login failed.", "error");
    return;
  }

  state.adminPin = pin;
  sessionStorage.setItem("rw-admin-pin", pin);
  adminPinInput.value = "";
  updateAdminUi();
  setStatus("Admin unlocked. Upload panel is ready.", "success");
  setView("adminView");
});

adminLogoutButton.addEventListener("click", () => {
  state.adminPin = "";
  sessionStorage.removeItem("rw-admin-pin");
  updateAdminUi();
  setStatus("Admin locked.", "success");
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.disabled) return;
    setView(item.dataset.view);
  });
});

backButton.addEventListener("click", () => {
  setView(state.previousView || "finderView", false);
});

detailBackButton.addEventListener("click", () => {
  setView("finderView", false);
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("rw-theme", isDark ? "dark" : "light");
  themeButton.textContent = isDark ? "Light theme" : "Dark theme";
});

searchButton.addEventListener("click", () => {
  loadLists(1).catch((error) => setStatus(error.message, "error"));
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadLists(1).catch((error) => setStatus(error.message, "error"));
  }
});

fromDateInput.addEventListener("change", () => {
  loadLists(1).catch((error) => setStatus(error.message, "error"));
});

toDateInput.addEventListener("change", () => {
  loadLists(1).catch((error) => setStatus(error.message, "error"));
});

clearFiltersButton.addEventListener("click", resetFilters);

prevPageButton.addEventListener("click", () => {
  if (state.page > 1) {
    loadLists(state.page - 1).catch((error) => setStatus(error.message, "error"));
  }
});

nextPageButton.addEventListener("click", () => {
  if (state.page < state.pageCount) {
    loadLists(state.page + 1).catch((error) => setStatus(error.message, "error"));
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Uploading list...");

  const payload = {
    pin: state.adminPin,
    content: document.querySelector("#listInput").value
  };

  const response = await fetch("/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || "Upload failed.", "error");
    return;
  }

  uploadForm.reset();
  setStatus("List uploaded successfully.", "success");
  await loadStats();
  await loadLists(1);
  setView("finderView");
});

clearFormButton.addEventListener("click", () => {
  uploadForm.reset();
});

detailCopyButton.addEventListener("click", async () => {
  if (!state.selectedList) return;
  await copyText(state.selectedList.content);
  setStatus("Copied exactly as pasted.", "success");
});

copyAllButton.addEventListener("click", async () => {
  try {
    const text = await fetchAllText();
    await copyText(text);
    setStatus("All lists copied.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

shareAllButton.addEventListener("click", async () => {
  try {
    const text = await fetchAllText();
    if (navigator.share) {
      await navigator.share({
        title: "RW List Finder Web Lists",
        text
      });
      setStatus("Share sheet opened.", "success");
      return;
    }
    await copyText(text);
    setStatus("Sharing is not available here, so all lists were copied.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

loadStats();
updateAdminUi();
loadLists().catch((error) => setStatus(error.message, "error"));
