const menuButton = document.querySelector("#menuButton");
const closeDrawerButton = document.querySelector("#closeDrawerButton");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const adminDrawer = document.querySelector("#adminDrawer");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerStatus = document.querySelector("#drawerStatus");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPinInput = document.querySelector("#adminPinInput");
const adminUploadPanel = document.querySelector("#adminUploadPanel");
const adminLogoutButton = document.querySelector("#adminLogoutButton");
const uploadForm = document.querySelector("#uploadForm");
const clearFormButton = document.querySelector("#clearFormButton");
const listInput = document.querySelector("#listInput");

const searchInput = document.querySelector("#searchInput");
const fromDateInput = document.querySelector("#fromDateInput");
const toDateInput = document.querySelector("#toDateInput");
const searchButton = document.querySelector("#searchButton");
const clearFiltersButton = document.querySelector("#clearFiltersButton");
const results = document.querySelector("#results");
const template = document.querySelector("#listTemplate");
const statusMessage = document.querySelector("#statusMessage");
const resultCount = document.querySelector("#resultCount");
const pageInfo = document.querySelector("#pageInfo");
const prevPageButton = document.querySelector("#prevPageButton");
const nextPageButton = document.querySelector("#nextPageButton");

const state = {
  page: 1,
  pageSize: 10,
  pageCount: 1,
  adminPin: sessionStorage.getItem("rw-admin-pin") || ""
};

function isAdminUnlocked() {
  return state.adminPin === "952518";
}

function formatDate(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
}

function setDrawerStatus(message, type = "") {
  drawerStatus.textContent = message;
  drawerStatus.className = `drawer-status ${type}`.trim();
}

function updateAdminUi() {
  const unlocked = isAdminUnlocked();
  drawerTitle.textContent = unlocked ? "Upload List" : "Unlock Upload";
  adminLoginForm.hidden = unlocked;
  adminUploadPanel.hidden = !unlocked;
  if (!unlocked) {
    setDrawerStatus("");
  }
}

function openDrawer() {
  updateAdminUi();
  drawerBackdrop.hidden = false;
  adminDrawer.classList.add("open");
  adminDrawer.setAttribute("aria-hidden", "false");
  if (!isAdminUnlocked()) {
    adminPinInput.focus();
  } else {
    listInput.focus();
  }
}

function closeDrawer() {
  drawerBackdrop.hidden = true;
  adminDrawer.classList.remove("open");
  adminDrawer.setAttribute("aria-hidden", "true");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

async function fetchListDetail(id) {
  const response = await fetch(`/api/lists/${encodeURIComponent(id)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not load this list.");
  }
  return data.list;
}

function renderLists(lists, meta) {
  results.replaceChildren();
  state.page = meta.page;
  state.pageCount = meta.pageCount;

  resultCount.textContent = `${meta.total} lists`;
  pageInfo.textContent = `Page ${meta.page} of ${meta.pageCount}`;
  prevPageButton.disabled = meta.page <= 1;
  nextPageButton.disabled = meta.page >= meta.pageCount;

  if (!lists.length) {
    setStatus("No list found.", "");
    return;
  }

  setStatus("");
  for (const item of lists) {
    const node = template.content.cloneNode(true);
    node.querySelector(".app-name").textContent = item.appName;
    node.querySelector(".list-date").textContent = formatDate(item.date);
    node.querySelector(".line-count").textContent = `${item.lineCount} lines`;
    node.querySelector(".preview").textContent = item.preview || "";
    node.querySelector(".copy-button").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const oldText = button.textContent;
      button.disabled = true;
      button.textContent = "Copying...";
      try {
        const detail = await fetchListDetail(item.id);
        await copyText(detail.content);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = oldText;
          button.disabled = false;
        }, 900);
      } catch (error) {
        button.textContent = oldText;
        button.disabled = false;
        setStatus(error.message, "error");
      }
    });
    results.appendChild(node);
  }
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

  setStatus("Loading...");
  const response = await fetch(`/api/lists?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not load lists.");
  }
  renderLists(data.lists, data.meta);
}

function resetFilters() {
  searchInput.value = "";
  fromDateInput.value = "";
  toDateInput.value = "";
  loadLists(1).catch((error) => setStatus(error.message, "error"));
}

menuButton.addEventListener("click", openDrawer);
closeDrawerButton.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

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
    setDrawerStatus(data.error || "Wrong PIN.", "error");
    return;
  }

  state.adminPin = pin;
  sessionStorage.setItem("rw-admin-pin", pin);
  adminPinInput.value = "";
  updateAdminUi();
  setDrawerStatus("Admin unlocked.", "success");
  listInput.focus();
});

adminLogoutButton.addEventListener("click", () => {
  state.adminPin = "";
  sessionStorage.removeItem("rw-admin-pin");
  updateAdminUi();
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = listInput.value;
  if (!content.trim()) {
    setDrawerStatus("Paste list first.", "error");
    return;
  }

  setDrawerStatus("Uploading...");
  const response = await fetch("/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: state.adminPin, content })
  });
  const data = await response.json();
  if (!response.ok) {
    setDrawerStatus(data.error || "Upload failed.", "error");
    return;
  }

  listInput.value = "";
  setDrawerStatus("Uploaded. Paste next list.", "success");
  await loadLists(1);
  listInput.focus();
});

clearFormButton.addEventListener("click", () => {
  listInput.value = "";
  listInput.focus();
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

updateAdminUi();
loadLists().catch((error) => setStatus(error.message, "error"));
