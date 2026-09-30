import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/mac/.gemini/antigravity-ide/brain/63ef43c0-4020-4842-95f0-5de64cbc7e68/screenshots";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log("Launching Headless Chrome for Authentic Screenshots...");
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--window-size=1280,820",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check"
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const newTabRes = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
    const tabData = await newTabRes.json();
    const ws = new WebSocket(tabData.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");

    async function capture(filename) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      console.log(`Saved screenshot: ${filename}`);
      return filePath;
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      return res.result?.value;
    }

    // Query existing report ref from DB
    const existingRepRes = await fetch("http://localhost:3000/api/reports");
    // Get first report from DB directly via sqlite
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("data.db");
    let repRow = db.prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 1").get();
    if (!repRow) {
      db.prepare("INSERT INTO reports (ref, reporter, building, floor, room, category, description, status, reporter_phone, reporter_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run("RK-20260930-B821", "Ahmad Syazwan", "Melati", "Aras 2", "Bilik 204", "Elektrik", "Lampu siling berkelip.", "dalam_proses", "01151342587", "syazwan@siswa.edu.my");
      repRow = db.prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 1").get();
    }
    const realRef = repRow.ref;
    console.log("Using report Ref for screenshots:", realRef);

    // Get admin cookie
    const adminLoginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    const adminCookie = adminLoginRes.headers.get("set-cookie")?.split(";")[0];

    await send("Network.enable");
    if (adminCookie) {
      const [cookieName, cookieVal] = adminCookie.split("=");
      await send("Network.setCookie", { name: cookieName, value: cookieVal, domain: "localhost", path: "/" });
    }

    // --- 1. Form Laporan (Home) with Step 2 filled ---
    console.log("1. Screenshot: Form Laporan with WhatsApp & Email...");
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await new Promise((r) => setTimeout(r, 1200));
    await evaluate(`
      const fileInput = document.querySelector('input[type="file"]');
      fetch('/images/carousel1.png').then(r => r.blob()).then(blob => {
        const file = new File([blob], "kerosakan.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => {
          const inputs = document.querySelectorAll('input');
          for (const inp of inputs) {
            if (inp.placeholder && inp.placeholder.includes('012')) { inp.value = '01151342587'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
            if (inp.placeholder && inp.placeholder.includes('pengadu@')) { inp.value = 'syazwan@siswa.edu.my'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
            if (inp.placeholder && inp.placeholder.includes('Blok')) { inp.value = 'Blok Melati'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
            if (inp.placeholder && inp.placeholder.includes('Aras')) { inp.value = 'Aras 2'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
            if (inp.placeholder && inp.placeholder.includes('Bilik')) { inp.value = 'Bilik 204'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          }
          const sel = document.querySelector('select');
          if (sel) { sel.value = 'Elektrik'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
          const ta = document.querySelector('textarea');
          if (ta) { ta.value = 'Lampu siling berkelip dan soket palam longgar.'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        }, 300);
      });
    `);
    await new Promise((r) => setTimeout(r, 800));
    await capture("01_borang_laporan_whatsapp.png");

    // --- 2. Success Card with WhatsApp Receipt & Copy Button ---
    console.log("2. Screenshot: Success Card with WhatsApp receipt...");
    await evaluate(`
      const form = document.querySelector('form');
      if (form) {
        // Mock successful submission in Vue proxy or submit
        const submitBtn = document.querySelector('form button.btn');
        if (submitBtn) submitBtn.click();
      }
    `);
    await new Promise((r) => setTimeout(r, 1200));
    await capture("02_slip_whatsapp_kejayaan.png");

    // --- 3. Portal Pelajar (Semak Rujukan Tab with Live Progress Stepper) ---
    console.log("3. Screenshot: Portal Pelajar - Semak Rujukan Tab...");
    await send("Page.navigate", { url: `http://localhost:3000/pelajar.html?ref=${encodeURIComponent(realRef)}` });
    await new Promise((r) => setTimeout(r, 1500));
    await capture("03_portal_pelajar_semak_rujukan.png");

    // --- 4. Portal Pelajar (Daftar Akaun Tab) ---
    console.log("4. Screenshot: Portal Pelajar - Daftar Tab...");
    await evaluate(`
      const tabs = document.querySelectorAll('.auth-tab-btn');
      if (tabs[1]) tabs[1].click();
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("04_portal_pelajar_daftar.png");

    // --- 5. Portal Pelajar (Dashboard Pelajar Logged In) ---
    console.log("5. Screenshot: Portal Pelajar - Student Dashboard...");
    const testEmail = "syazwan." + Date.now() + "@siswa.edu.my";
    await evaluate(`
      const inputs = document.querySelectorAll('form input');
      inputs[0].value = 'Ahmad Syazwan bin Rosli'; inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1].value = '${testEmail}'; inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[2].value = 'AI210045'; inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[3].value = '01151342587'; inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[4].value = 'rahsia123'; inputs[4].dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('form button.btn').click();
    `);
    await new Promise((r) => setTimeout(r, 1500));
    await capture("05_dashboard_akaun_pelajar.png");

    // --- 6. Admin Panel - Laporan with Student Info & WhatsApp Pengadu ---
    console.log("6. Screenshot: Admin Panel Laporan & WhatsApp Pengadu...");
    await send("Page.navigate", { url: "http://localhost:3000/admin.html" });
    await new Promise((r) => setTimeout(r, 1500));
    await evaluate(`
      window.scrollTo(0, 420);
      const shareBtn = document.querySelector('.btn-share-toggle');
      if (shareBtn) shareBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 600));
    await capture("06_admin_maklumkan_pengadu_whatsapp.png");

    // --- 7. Admin Panel - DB Viewer Tab (Table Browser) ---
    console.log("7. Screenshot: Admin DB Viewer Table Browser...");
    await evaluate(`
      window.scrollTo(0, 0);
      const dbTabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes('DB Viewer'));
      if (dbTabBtn) dbTabBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 1500));
    await capture("07_admin_db_viewer_table_browser.png");

    // --- 8. Admin Panel - DB Viewer Tab (SQL Console) ---
    console.log("8. Screenshot: Admin DB Viewer SQL Console...");
    await evaluate(`
      const sqlModeBtn = Array.from(document.querySelectorAll('.db-mode-btn')).find(b => b.textContent.includes('Konsol SQL'));
      if (sqlModeBtn) sqlModeBtn.click();
      const ta = document.querySelector('.db-sql-textarea');
      if (ta) {
        ta.value = "SELECT id, ref, building, status, reporter, reporter_phone FROM reports ORDER BY id DESC LIMIT 5;";
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const runBtn = Array.from(document.querySelectorAll('.db-sql-btns button')).find(b => b.textContent.includes('Jalankan') || b.classList.contains('primary'));
      if (runBtn) runBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 1200));
    await capture("08_admin_db_viewer_sql_console.png");

    console.log("ALL REAL SCREENSHOTS CAPTURED PERFECTLY!");
    ws.close();
  } catch (err) {
    console.error("Error during screenshot capture:", err);
  } finally {
    chrome.kill();
  }
}

run();
