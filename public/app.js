const menuButton = document.querySelector("#menuButton");
const menuPanel = document.querySelector("#menuPanel");
const themeButton = document.querySelector("#themeButton");
const shareAllButton = document.querySelector("#shareAllButton");
const copyAllButton = document.querySelector("#copyAllButton");
const searchInput = document.querySelector("#searchInput");
const fromDateInput = document.querySelector("#fromDateInput");
const toDateInput = document.querySelector("#toDateInput");
const searchButton = document.querySelector("#searchButton");
const uploadForm = document.querySelector("#uploadForm");
const clearFormButton = document.querySelector("#clearFormButton");
const results = document.querySelector("#results");
const template = document.querySelector("#listTemplate");
const statusMessage = document.querySelector("#statusMessage");
const resultCount = document.querySelector("#resultCount");
const resultsTitle = document.querySelector("#resultsTitle");

const savedTheme = localStorage.getItem("rw-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeButton.textContent = "Light theme";
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
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

function renderLists(lists) {
  results.replaceChildren();
  resultCount.textContent = `${lists.length} found`;

  if (!lists.length) {
    setStatus("No list found. Try another app name or clear the date range.");
    return;
  }

  setStatus("Showing matching lists arranged date wise.", "success");
  lists.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector("h3").textContent = item.appName;
    node.querySelector("p").textContent = item.date;
    node.querySelector("pre").textContent = item.content;
    node.querySelector(".copy-button").addEventListener("click", async () => {
      await copyText(exactCopyText(item));
      setStatus("Copied exactly as pasted.", "success");
    });
    results.appendChild(node);
  });
}

async function loadLists() {
  const params = new URLSearchParams();
  const appName = searchInput.value.trim();
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (appName) params.set("appName", appName);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);

  resultsTitle.textContent = appName || fromDate || toDate ? "Search Results" : "All Lists";
  setStatus("Loading lists...");

  const response = await fetch(`/api/lists?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load lists.");
  }

  renderLists(data.lists);
}

menuButton.addEventListener("click", () => {
  menuPanel.hidden = !menuPanel.hidden;
});

document.addEventListener("click", (event) => {
  if (!menuPanel.hidden && !menuPanel.contains(event.target) && !menuButton.contains(event.target)) {
    menuPanel.hidden = true;
  }
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("rw-theme", isDark ? "dark" : "light");
  themeButton.textContent = isDark ? "Light theme" : "Dark theme";
});

searchButton.addEventListener("click", () => {
  loadLists().catch((error) => setStatus(error.message, "error"));
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadLists().catch((error) => setStatus(error.message, "error"));
  }
});

fromDateInput.addEventListener("change", () => {
  loadLists().catch((error) => setStatus(error.message, "error"));
});

toDateInput.addEventListener("change", () => {
  loadLists().catch((error) => setStatus(error.message, "error"));
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Uploading list...");

  const payload = {
    pin: document.querySelector("#pinInput").value,
    appName: document.querySelector("#appNameInput").value,
    date: document.querySelector("#uploadDateInput").value,
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
  await loadLists();
});

clearFormButton.addEventListener("click", () => {
  uploadForm.reset();
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

loadLists().catch((error) => setStatus(error.message, "error"));
