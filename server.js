import express from "express";
import multer from "multer";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --- Cryptography & Session helper functions -------------------------------
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  const derivedKey = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return timingSafeEqual(derivedKey, keyBuffer);
}

const sessions = new Set();

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const parts = cookies.split(";");
  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return null;
}

function authMiddleware(req, res, next) {
  const sessionId = getCookie(req, "session_id");
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: "Sesi tidak sah atau telah tamat" });
  }
  next();
}

// --- Database setup -------------------------------------------------------
const db = new Database(join(__dirname, "data.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ref          TEXT NOT NULL UNIQUE,
    reporter     TEXT,
    building     TEXT NOT NULL,
    floor        TEXT,
    room         TEXT,
    category     TEXT,
    description  TEXT,
    photo        TEXT,
    status       TEXT NOT NULL DEFAULT 'baru',
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key           TEXT PRIMARY KEY,
    value         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipients (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL
  );
`);

// Seed default admin if table is empty
const adminExists = db.prepare("SELECT COUNT(*) as count FROM admins").get();
if (adminExists.count === 0) {
  const defaultUser = process.env.ADMIN_USER || "admin";
  const defaultPass = process.env.ADMIN_PASS || "admin123";
  const defaultHash = hashPassword(defaultPass);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(defaultUser, defaultHash);
  console.log(`[SEED] Pengguna pentadbir lalai dicipta: ${defaultUser} / ${defaultPass}`);
}

// Seed default settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get();
if (settingsCount.count === 0) {
  const defaultSettings = [
    { key: "appName", value: "RosakAlert" },
    { key: "appLogo", value: "" },
    { key: "backgroundType", value: "default" }, // default, css, image
    { key: "backgroundCss", value: "linear-gradient(135deg, #0f1419 0%, #1a2029 100%)" },
    { key: "backgroundImage", value: "" },
    { key: "languages", value: JSON.stringify(["ms", "en"]) }, // allow both ms and en by default
    { key: "aboutTitle", value: "Tentang RosakAlert" },
    { key: "aboutContent", value: "Sistem aduan kerosakan kolej bertujuan memudahkan pelajar melapor kerosakan kemudahan dengan cepat. Setiap aduan disalurkan secara terus kepada unit penyelenggaraan berkenaan untuk tindakan segera." }
  ];
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  for (const s of defaultSettings) {
    stmt.run(s.key, s.value);
  }
  console.log("[SEED] Tetapan lalai dicipta.");
} else {
  // Ensure new keys exist if DB was already seeded
  const checkStmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  checkStmt.run("aboutTitle", "Tentang RosakAlert");
  checkStmt.run("aboutContent", "Sistem aduan kerosakan kolej bertujuan memudahkan pelajar melapor kerosakan kemudahan dengan cepat. Setiap aduan disalurkan secara terus kepada unit penyelenggaraan berkenaan untuk tindakan segera.");
}

const STATUSES = ["baru", "dalam_proses", "selesai"];


// --- File uploads ---------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeExt = extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Hanya fail imej dibenarkan"));
  },
});

// --- App ------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

const genRef = () =>
  "RK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" +
  randomUUID().slice(0, 4).toUpperCase();

// Create a report (student submits photo + location)
app.post("/api/reports", upload.single("photo"), (req, res) => {
  const { reporter, building, floor, room, category, description } = req.body;
  if (!building || !building.trim()) {
    return res.status(400).json({ error: "Bangunan/lokasi wajib diisi" });
  }
  const ref = genRef();
  const info = db
    .prepare(
      `INSERT INTO reports (ref, reporter, building, floor, room, category, description, photo)
       VALUES (@ref, @reporter, @building, @floor, @room, @category, @description, @photo)`
    )
    .run({
      ref,
      reporter: reporter?.trim() || null,
      building: building.trim(),
      floor: floor?.trim() || null,
      room: room?.trim() || null,
      category: category?.trim() || null,
      description: description?.trim() || null,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

// --- Auth APIs -------------------------------------------------------------
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Sila isi nama pengguna dan kata laluan" });
  }
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: "Nama pengguna atau kata laluan salah" });
  }

  const sessionId = randomUUID();
  sessions.add(sessionId);

  res.setHeader(
    "Set-Cookie",
    `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; MaxAge=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  res.json({ success: true, username: admin.username });
});

app.get("/api/auth/status", (req, res) => {
  const sessionId = getCookie(req, "session_id");
  if (sessionId && sessions.has(sessionId)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const sessionId = getCookie(req, "session_id");
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.setHeader(
    "Set-Cookie",
    "session_id=; Path=/; HttpOnly; SameSite=Strict; MaxAge=0"
  );
  res.json({ success: true });
});

// --- Settings APIs ---------------------------------------------------------
app.get("/api/settings", (_req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const settings = {};
  for (const row of rows) {
    if (row.key === "languages") {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = ["ms"];
      }
    } else {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

const uploadSettings = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "backgroundImage", maxCount: 1 }
]);

app.post("/api/settings", authMiddleware, uploadSettings, (req, res) => {
  const { appName, backgroundType, backgroundCss, languages, aboutTitle, aboutContent } = req.body;
  const stmt = db.prepare("UPDATE settings SET value = ? WHERE key = ?");

  if (appName !== undefined) stmt.run(appName.trim(), "appName");
  if (backgroundType !== undefined) stmt.run(backgroundType, "backgroundType");
  if (backgroundCss !== undefined) stmt.run(backgroundCss, "backgroundCss");
  if (aboutTitle !== undefined) stmt.run(aboutTitle.trim(), "aboutTitle");
  if (aboutContent !== undefined) stmt.run(aboutContent.trim(), "aboutContent");
  if (languages !== undefined) {
    try {
      const parsedLangs = JSON.parse(languages);
      if (Array.isArray(parsedLangs) && parsedLangs.length > 0) {
        stmt.run(JSON.stringify(parsedLangs), "languages");
      }
    } catch (e) {
      // ignore
    }
  }

  // Handle uploaded files
  if (req.files) {
    if (req.files.logo && req.files.logo[0]) {
      const logoUrl = `/uploads/${req.files.logo[0].filename}`;
      stmt.run(logoUrl, "appLogo");
    }
    if (req.files.backgroundImage && req.files.backgroundImage[0]) {
      const bgUrl = `/uploads/${req.files.backgroundImage[0].filename}`;
      stmt.run(bgUrl, "backgroundImage");
    }
  }

  // Clear logo or bg image if requested
  const { clearLogo, clearBgImage } = req.body;
  if (clearLogo === "true" || clearLogo === true) {
    stmt.run("", "appLogo");
  }
  if (clearBgImage === "true" || clearBgImage === true) {
    stmt.run("", "backgroundImage");
  }

  // Fetch updated settings
  const rows = db.prepare("SELECT * FROM settings").all();
  const settings = {};
  for (const row of rows) {
    if (row.key === "languages") {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = ["ms"];
      }
    } else {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

// List reports, optional ?status= & ?building= filter (Admin only)
app.get("/api/reports", authMiddleware, (req, res) => {
  const { status, building } = req.query;
  const clauses = [];
  const params = {};
  if (status && STATUSES.includes(status)) { clauses.push("status = @status"); params.status = status; }
  if (building) { clauses.push("building = @building"); params.building = building; }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const rows = db.prepare(`SELECT * FROM reports ${where} ORDER BY created_at DESC`).all(params);
  res.json(rows);
});

// Summary stats grouped by building + status (Admin only)
app.get("/api/stats", authMiddleware, (_req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) n FROM reports GROUP BY status").all();
  const byBuilding = db
    .prepare(
      `SELECT building,
              COUNT(*) total,
              SUM(status='baru') baru,
              SUM(status='dalam_proses') dalam_proses,
              SUM(status='selesai') selesai
       FROM reports GROUP BY building ORDER BY total DESC`
    )
    .all();
  res.json({ byStatus, byBuilding, total: db.prepare("SELECT COUNT(*) n FROM reports").get().n });
});

// Update status (Admin only)
app.patch("/api/reports/:id", authMiddleware, (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Status tidak sah" });
  }
  const info = db
    .prepare("UPDATE reports SET status=?, updated_at=datetime('now','localtime') WHERE id=?")
    .run(status, req.params.id);
  if (!info.changes) return res.status(404).json({ error: "Laporan tidak dijumpai" });
  res.json(db.prepare("SELECT * FROM reports WHERE id=?").get(req.params.id));
});

// --- Recipients APIs (Admin only) ---
app.get("/api/recipients", authMiddleware, (req, res) => {
  try {
    const list = db.prepare("SELECT * FROM recipients ORDER BY name ASC").all();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/recipients", authMiddleware, (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Semua medan (Nama, E-mel, Telefon) wajib diisi" });
  }
  try {
    const info = db.prepare("INSERT INTO recipients (name, email, phone) VALUES (?, ?, ?)").run(name, email, phone);
    res.json({ id: info.lastInsertRowId, name, email, phone });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/recipients/:id", authMiddleware, (req, res) => {
  try {
    const info = db.prepare("DELETE FROM recipients WHERE id = ?").run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: "Penerima tidak dijumpai" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Multer / general error handler
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Ralat tidak dijangka" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RosakAlert berjalan di http://localhost:${PORT}`));
