const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "952518";
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "lists.json");

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readLists() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const lists = JSON.parse(raw);
    return Array.isArray(lists) ? lists : [];
  } catch {
    return [];
  }
}

async function writeLists(lists) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(lists, null, 2), "utf8");
}

function publicList(item, options = {}) {
  const lines = item.content.split(/\r?\n/).filter(Boolean);
  const list = {
    id: item.id,
    appName: item.appName,
    date: item.date,
    preview: lines.slice(0, 3).join("\n"),
    lineCount: lines.length,
    createdAt: item.createdAt
  };

  if (options.includeContent) {
    list.content = item.content;
  }

  return list;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return "";
  }

  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return "";

  const iso = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return toIsoDate(iso[1], iso[2], iso[3]);

  const dayFirst = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (!dayFirst) return "";

  const rawYear = dayFirst[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return toIsoDate(year, dayFirst[2], dayFirst[1]);
}

function extractDateFromContent(content) {
  const text = typeof content === "string" ? content : "";
  const patterns = [
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = normalizeDate(match[0]);
      if (date) return date;
    }
  }

  return "";
}

function splitSheetLine(line) {
  return line
    .split(/\t|,|\||;|\s{2,}/)
    .map((cell) => normalizeText(cell))
    .filter(Boolean);
}

function cleanAppName(value) {
  return normalizeText(value)
    .replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, "")
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, "")
    .replace(/^(app|application|platform|app name|name)\s*[:=-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAppNameFromContent(content) {
  const text = typeof content === "string" ? content : "";
  const labeled = text.match(/(?:^|\n)\s*(?:app|application|platform)\s*(?:name)?\s*[:=-]\s*([^\r\n|,;\t]+)/i);
  if (labeled) {
    const appName = cleanAppName(labeled[1]);
    if (appName) return appName;
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headers = splitSheetLine(lines[index]).map((cell) => cell.toLowerCase());
    const appIndex = headers.findIndex((cell) => ["app", "app name", "application", "platform"].includes(cell));
    if (appIndex === -1) continue;

    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const row = splitSheetLine(lines[rowIndex]);
      const appName = cleanAppName(row[appIndex] || "");
      if (appName) return appName;
    }
  }

  for (const line of lines.slice(0, 8)) {
    if (normalizeDate(line)) continue;
    const appName = cleanAppName(line);
    const lower = appName.toLowerCase();
    const isGeneric = ["date", "name", "list", "sr no", "s no", "number"].includes(lower);
    if (appName && appName.length <= 50 && !isGeneric) return appName;
  }

  return "";
}

function compareListDates(a, b) {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function boundedNumber(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

app.get("/api/lists", async (req, res) => {
  const lists = await readLists();
  const appName = normalizeText(req.query.appName).toLowerCase();
  const fromDate = normalizeDate(req.query.fromDate);
  const toDate = normalizeDate(req.query.toDate);
  const page = boundedNumber(req.query.page, 1, 1, 100000);
  const pageSize = boundedNumber(req.query.pageSize, 15, 10, 50);

  const results = lists
    .filter((item) => {
      const matchesName = !appName || item.appName.toLowerCase().includes(appName);
      const afterFrom = !fromDate || item.date >= fromDate;
      const beforeTo = !toDate || item.date <= toDate;
      return matchesName && afterFrom && beforeTo;
    })
    .sort(compareListDates);

  const total = results.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageResults = results.slice(start, start + pageSize).map((item) => publicList(item));

  res.json({
    lists: pageResults,
    meta: {
      total,
      page: safePage,
      pageSize,
      pageCount
    }
  });
});

app.get("/api/lists/all-text", async (_req, res) => {
  const lists = await readLists();
  const text = lists
    .sort(compareListDates)
    .map((item) => `${item.appName} | ${item.date}\n${item.content}`)
    .join("\n\n---\n\n");

  res.type("text/plain").send(text);
});

app.get("/api/stats", async (_req, res) => {
  const lists = await readLists();
  const appNames = new Set(lists.map((item) => item.appName.toLowerCase()));
  const latestDate = lists.reduce((latest, item) => item.date > latest ? item.date : latest, "");

  res.json({
    totalLists: lists.length,
    totalApps: appNames.size,
    latestDate
  });
});

app.get("/api/lists/:id", async (req, res) => {
  const lists = await readLists();
  const item = lists.find((list) => list.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: "List not found." });
  }

  res.json({ list: publicList(item, { includeContent: true }) });
});

app.post("/api/admin/login", (req, res) => {
  const pin = normalizeText(req.body.pin);
  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ error: "Invalid admin PIN." });
  }

  res.json({ ok: true });
});

app.post("/api/lists", async (req, res) => {
  const pin = normalizeText(req.body.pin);
  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ error: "Invalid admin PIN." });
  }

  const content = typeof req.body.content === "string" ? req.body.content : "";
  const appName = normalizeText(req.body.appName) || extractAppNameFromContent(content);
  const date = normalizeDate(req.body.date) || extractDateFromContent(content);

  if (!appName || !date || !content.trim()) {
    return res.status(400).json({ error: "Paste a list containing both app name and date. Example lines: App: WhatsApp and Date: 21-05-2026." });
  }

  const lists = await readLists();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    appName,
    date,
    content,
    createdAt: new Date().toISOString()
  };

  lists.push(item);
  await writeLists(lists);
  res.status(201).json({ list: publicList(item, { includeContent: true }) });
});

app.delete("/api/lists/:id", async (req, res) => {
  const pin = normalizeText(req.body.pin);
  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ error: "Invalid admin PIN." });
  }

  const lists = await readLists();
  const nextLists = lists.filter((item) => item.id !== req.params.id);
  if (nextLists.length === lists.length) {
    return res.status(404).json({ error: "List not found." });
  }

  await writeLists(nextLists);
  res.json({ ok: true });
});

app.get("/api/network", (_req, res) => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${PORT}`);

  res.json({ port: PORT, addresses });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RW List Finder Web running at http://localhost:${PORT}`);
});
