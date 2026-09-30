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

function getStudentFromReq(req) {
  const token = getCookie(req, "student_session");
  if (!token) return null;
  try {
    const student = db.prepare(`
      SELECT s.id, s.name, s.email, s.phone, s.matrix_no, s.created_at
      FROM student_sessions sess
      JOIN students s ON s.id = sess.student_id
      WHERE sess.token = ?
    `).get(token);
    return student || null;
  } catch (_) {
    return null;
  }
}

function studentAuthMiddleware(req, res, next) {
  const student = getStudentFromReq(req);
  if (!student) {
    return res.status(401).json({ error: "Sesi pelajar tidak sah atau telah tamat. Sila log masuk semula." });
  }
  req.student = student;
  next();
}

// --- Database setup -------------------------------------------------------
const DB_PATH = process.env.DB_PATH || join(__dirname, "data.db");
fs.mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
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
    student_id   INTEGER,
    reporter_phone TEXT,
    reporter_email TEXT,
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

  CREATE TABLE IF NOT EXISTS students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone         TEXT,
    matrix_no     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS student_sessions (
    token      TEXT PRIMARY KEY,
    student_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
`);

// Safe migrations for existing databases
try {
  db.exec("ALTER TABLE reports ADD COLUMN student_id INTEGER REFERENCES students(id)");
} catch (_) {}
try {
  db.exec("ALTER TABLE reports ADD COLUMN reporter_phone TEXT");
} catch (_) {}
try {
  db.exec("ALTER TABLE reports ADD COLUMN reporter_email TEXT");
} catch (_) {}

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
    { key: "appName", value: "CAMPUSFIX.ORG" },
    { key: "appLogo", value: "/images/logo.png" },
    { key: "backgroundType", value: "image" }, // default, css, image
    { key: "backgroundCss", value: "linear-gradient(135deg, #0f1419 0%, #1a2029 100%)" },
    { key: "backgroundImage", value: "/images/bg-campus.png" },
    { key: "languages", value: JSON.stringify(["ms", "en"]) },
    { key: "aboutTitle", value: "Tentang Campusfix.org" },
    { key: "aboutContent", value: "Sistem aduan kerosakan kolej bertujuan memudahkan pelajar melapor kerosakan kemudahan dengan cepat. Setiap aduan disalurkan secara terus kepada unit penyelenggaraan berkenaan untuk tindakan segera." }
  ];
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  for (const s of defaultSettings) {
    stmt.run(s.key, s.value);
  }
  console.log("[SEED] Tetapan lalai dicipta.");
} else {
  // Update existing database settings if they were on old defaults
  const appNameRow = db.prepare("SELECT value FROM settings WHERE key='appName'").get();
  if (appNameRow && appNameRow.value === "RosakAlert") {
    db.prepare("UPDATE settings SET value='CAMPUSFIX.ORG' WHERE key='appName'").run();
    db.prepare("UPDATE settings SET value='/images/logo.png' WHERE key='appLogo'").run();
    db.prepare("UPDATE settings SET value='image' WHERE key='backgroundType'").run();
    db.prepare("UPDATE settings SET value='/images/bg-campus.png' WHERE key='backgroundImage'").run();
    db.prepare("UPDATE settings SET value='Tentang Campusfix.org' WHERE key='aboutTitle'").run();
  }
  const checkStmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  checkStmt.run("aboutTitle", "Tentang Campusfix.org");
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
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html") || filePath.endsWith(".css") || filePath.endsWith(".js")) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }
  }
}));
app.use("/uploads", express.static(UPLOAD_DIR));

const genRef = () =>
  "RK-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" +
  randomUUID().slice(0, 4).toUpperCase();

// Create a report (student/guest submits photo + location)
app.post("/api/reports", upload.single("photo"), (req, res) => {
  const { reporter, building, floor, room, category, description, phone, email } = req.body;
  if (!building || !building.trim()) {
    return res.status(400).json({ error: "Bangunan/lokasi wajib diisi" });
  }

  // Check if student is logged in
  const student = getStudentFromReq(req);
  const studentId = student ? student.id : null;
  const reporterName = reporter?.trim() || (student ? `${student.name} (${student.email})` : null);
  const reporterPhone = phone?.trim() || (student ? student.phone : null);
  const reporterEmail = email?.trim() || (student ? student.email : null);

  const ref = genRef();
  const info = db
    .prepare(
      `INSERT INTO reports (ref, reporter, building, floor, room, category, description, photo, student_id, reporter_phone, reporter_email)
       VALUES (@ref, @reporter, @building, @floor, @room, @category, @description, @photo, @student_id, @reporter_phone, @reporter_email)`
    )
    .run({
      ref,
      reporter: reporterName,
      building: building.trim(),
      floor: floor?.trim() || null,
      room: room?.trim() || null,
      category: category?.trim() || null,
      description: description?.trim() || null,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      student_id: studentId,
      reporter_phone: reporterPhone,
      reporter_email: reporterEmail
    });
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

// Quick tracking by reference code (public)
app.get("/api/reports/track/:ref", (req, res) => {
  try {
    const rawRef = (req.params.ref || "").trim().toUpperCase();
    if (!rawRef) return res.status(400).json({ error: "No. rujukan diperlukan." });

    const row = db.prepare(`
      SELECT ref, building, floor, room, category, description, photo, status, created_at, updated_at
      FROM reports
      WHERE UPPER(ref) = ?
    `).get(rawRef);

    if (!row) {
      return res.status(404).json({ error: "Laporan dengan nombor rujukan ini tidak dijumpai." });
    }
    res.json({ success: true, report: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// --- Student Account & Auth APIs -------------------------------------------
app.post("/api/student/register", (req, res) => {
  const { name, email, password, phone, matrix_no } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Sila masukkan nama penuh pelajar." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Sila masukkan alamat e-mel yang sah." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Kata laluan mestilah sekurang-kurangnya 6 aksara." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone?.trim() || null;
  const cleanMatrix = matrix_no?.trim() || null;

  try {
    const existing = db.prepare("SELECT id FROM students WHERE email = ?").get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "Alamat e-mel ini telah didaftarkan. Sila log masuk." });
    }

    const passwordHash = hashPassword(password);
    const info = db.prepare(`
      INSERT INTO students (name, email, password_hash, phone, matrix_no)
      VALUES (?, ?, ?, ?, ?)
    `).run(cleanName, cleanEmail, passwordHash, cleanPhone, cleanMatrix);
    const studentId = info.lastInsertRowid;

    // Link any previous reports submitted with this email/name
    try {
      db.prepare(`
        UPDATE reports 
        SET student_id = ? 
        WHERE student_id IS NULL AND (reporter LIKE ? OR reporter LIKE ?)
      `).run(studentId, `%${cleanEmail}%`, `%${cleanName}%`);
    } catch (_) {}

    // Create session token
    const token = randomUUID();
    db.prepare("INSERT INTO student_sessions (token, student_id) VALUES (?, ?)").run(token, studentId);

    res.setHeader(
      "Set-Cookie",
      `student_session=${token}; Path=/; HttpOnly; SameSite=Lax; MaxAge=${30 * 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );

    res.status(201).json({
      success: true,
      student: {
        id: studentId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        matrix_no: cleanMatrix
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/student/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Sila masukkan e-mel dan kata laluan." });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const student = db.prepare("SELECT * FROM students WHERE email = ?").get(cleanEmail);
    if (!student || !verifyPassword(password, student.password_hash)) {
      return res.status(401).json({ error: "E-mel atau kata laluan tidak sah." });
    }

    // Create session token
    const token = randomUUID();
    db.prepare("INSERT INTO student_sessions (token, student_id) VALUES (?, ?)").run(token, student.id);

    res.setHeader(
      "Set-Cookie",
      `student_session=${token}; Path=/; HttpOnly; SameSite=Lax; MaxAge=${30 * 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        matrix_no: student.matrix_no
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/student/me", (req, res) => {
  const student = getStudentFromReq(req);
  if (student) {
    res.json({ authenticated: true, student });
  } else {
    res.json({ authenticated: false });
  }
});

app.post("/api/student/logout", (req, res) => {
  const token = getCookie(req, "student_session");
  if (token) {
    try {
      db.prepare("DELETE FROM student_sessions WHERE token = ?").run(token);
    } catch (_) {}
  }
  res.setHeader(
    "Set-Cookie",
    "student_session=; Path=/; HttpOnly; SameSite=Lax; MaxAge=0"
  );
  res.json({ success: true });
});

app.get("/api/student/reports", studentAuthMiddleware, (req, res) => {
  try {
    const student = req.student;
    const reports = db.prepare(`
      SELECT * FROM reports 
      WHERE student_id = ? OR (reporter LIKE ? AND ? != '')
      ORDER BY id DESC
    `).all(student.id, `%${student.email}%`, student.email);

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email
      },
      reports
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  if (status && STATUSES.includes(status)) { clauses.push("r.status = @status"); params.status = status; }
  if (building) { clauses.push("r.building = @building"); params.building = building; }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const rows = db.prepare(`
    SELECT r.*, s.name as student_name, s.email as student_email, s.phone as student_phone, s.matrix_no as student_matrix
    FROM reports r
    LEFT JOIN students s ON s.id = r.student_id
    ${where}
    ORDER BY r.created_at DESC
  `).all(params);
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

// Delete a report (Admin only)
app.delete("/api/reports/:id", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM reports WHERE id=?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Laporan tidak dijumpai" });

  // Delete image file if exists
  if (row.photo) {
    const filename = row.photo.replace("/uploads/", "");
    const filepath = join(UPLOAD_DIR, filename);
    fs.unlink(filepath, (err) => {
      if (err) console.error("Ralat memadam fail gambar:", err);
    });
  }

  db.prepare("DELETE FROM reports WHERE id=?").run(req.params.id);
  res.json({ success: true, message: "Laporan berjaya dipadam" });
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

// --- Database Viewer (DB Client Web) APIs ----------------------------------
app.get("/api/db/overview", authMiddleware, (_req, res) => {
  try {
    const versionRow = db.prepare("SELECT sqlite_version() as v").get();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();

    const tableStats = tables.map((t) => {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
      const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
      return {
        name: t.name,
        rowCount: countRow ? countRow.count : 0,
        columnCount: cols.length,
        columns: cols.map((c) => ({
          cid: c.cid,
          name: c.name,
          type: c.type || "ANY",
          notnull: Boolean(c.notnull),
          dflt_value: c.dflt_value,
          pk: Boolean(c.pk)
        }))
      };
    });

    let fileSize = 0;
    try {
      const stats = fs.statSync(DB_PATH);
      fileSize = stats.size;
    } catch (_) {}

    const journalRow = db.prepare("PRAGMA journal_mode").get();

    res.json({
      success: true,
      version: versionRow ? versionRow.v : "Unknown",
      dbPath: DB_PATH,
      fileSize,
      journalMode: journalRow ? journalRow.journal_mode : "UNKNOWN",
      tables: tableStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/db/table/:name", authMiddleware, (req, res) => {
  try {
    const tableName = req.params.name;
    const validTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName);
    if (!validTable) {
      return res.status(404).json({ error: `Jadual '${tableName}' tidak dijumpai` });
    }

    const schema = db.prepare(`PRAGMA table_info("${validTable.name}")`).all();
    const indexes = db.prepare(`PRAGMA index_list("${validTable.name}")`).all();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const availableColumns = schema.map((c) => c.name);
    let sortCol = req.query.sort;
    if (!sortCol || !availableColumns.includes(sortCol)) {
      sortCol = availableColumns.includes("id") ? "id" : availableColumns[0] || null;
    }

    const sortOrder = String(req.query.order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const search = (req.query.search || "").trim();
    let whereClause = "";
    const params = [];

    if (search) {
      const textCols = schema.filter((c) => {
        const type = (c.type || "").toUpperCase();
        return (
          type.includes("CHAR") ||
          type.includes("TEXT") ||
          type.includes("CLOB") ||
          type === "" ||
          type.includes("ANY")
        );
      });
      const searchableCols = textCols.length > 0 ? textCols : schema;
      const conditions = searchableCols.map((c) => `CAST("${c.name}" AS TEXT) LIKE ?`);
      whereClause = `WHERE (${conditions.join(" OR ")})`;
      searchableCols.forEach(() => params.push(`%${search}%`));
    }

    const countQuery = `SELECT COUNT(*) as count FROM "${validTable.name}" ${whereClause}`;
    const totalRows = db.prepare(countQuery).get(...params).count;

    const orderClause = sortCol ? `ORDER BY "${sortCol}" ${sortOrder}` : "";
    const dataQuery = `SELECT * FROM "${validTable.name}" ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const rows = db.prepare(dataQuery).all(...params, limit, offset);

    res.json({
      success: true,
      table: validTable.name,
      schema,
      indexes,
      totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit) || 1,
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db/query", authMiddleware, (req, res) => {
  const { sql } = req.body || {};
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    return res.status(400).json({ error: "Sila masukkan arahan SQL yang sah." });
  }

  const query = sql.trim();
  const startTime = performance.now();

  try {
    const isReader = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(query);

    if (isReader) {
      const stmt = db.prepare(query);
      const rows = stmt.all();
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      const columns =
        rows.length > 0
          ? Object.keys(rows[0])
          : typeof stmt.columns === "function"
          ? stmt.columns().map((c) => c.name)
          : [];

      return res.json({
        success: true,
        type: "select",
        columns,
        rows,
        rowCount: rows.length,
        durationMs
      });
    } else {
      let changes = 0;
      let lastInsertRowid = null;

      try {
        const info = db.prepare(query).run();
        changes = info.changes;
        lastInsertRowid = info.lastInsertRowid;
      } catch (runErr) {
        db.exec(query);
      }

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return res.json({
        success: true,
        type: "mutation",
        changes,
        lastInsertRowid,
        durationMs
      });
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

app.get("/api/db/export/:table", authMiddleware, (req, res) => {
  try {
    const tableName = req.params.table;
    const validTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName);

    if (!validTable) {
      return res.status(404).json({ error: `Jadual '${tableName}' tidak dijumpai` });
    }

    const rows = db.prepare(`SELECT * FROM "${validTable.name}"`).all();
    const format = (req.query.format || "json").toLowerCase();

    if (format === "csv") {
      if (rows.length === 0) {
        const schema = db.prepare(`PRAGMA table_info("${validTable.name}")`).all();
        const headers = schema.map((s) => s.name).join(",");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${validTable.name}.csv"`);
        return res.send(headers + "\n");
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

      for (const row of rows) {
        const line = headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(",");
        csvLines.push(line);
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${validTable.name}.csv"`);
      return res.send(csvLines.join("\n"));
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${validTable.name}.json"`);
    res.send(JSON.stringify(rows, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multer / general error handler
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Ralat tidak dijangka" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RosakAlert berjalan di http://localhost:${PORT}`));
