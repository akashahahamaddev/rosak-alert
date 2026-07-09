import express from "express";
import multer from "multer";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { randomUUID } from "crypto";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
`);

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

// List reports, optional ?status= & ?building= filter
app.get("/api/reports", (req, res) => {
  const { status, building } = req.query;
  const clauses = [];
  const params = {};
  if (status && STATUSES.includes(status)) { clauses.push("status = @status"); params.status = status; }
  if (building) { clauses.push("building = @building"); params.building = building; }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const rows = db.prepare(`SELECT * FROM reports ${where} ORDER BY created_at DESC`).all(params);
  res.json(rows);
});

// Summary stats grouped by building + status (the "automatic management by area")
app.get("/api/stats", (_req, res) => {
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

// Update status (admin)
app.patch("/api/reports/:id", (req, res) => {
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

// Multer / general error handler
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Ralat tidak dijangka" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RosakAlert berjalan di http://localhost:${PORT}`));
