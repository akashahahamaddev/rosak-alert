import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';

const ROOT_DIR = process.cwd();
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');
const OUTPUT_PDF_REPO = path.join(ROOT_DIR, 'DOKUMENTASI_PENGGUNA_DAN_KEMASKINI.pdf');
const ARTIFACT_DIR = '/Users/mac/.gemini/antigravity-ide/brain/63ef43c0-4020-4842-95f0-5de64cbc7e68';
const OUTPUT_PDF_ARTIFACT = path.join(ARTIFACT_DIR, 'DOKUMENTASI_PENGGUNA_DAN_KEMASKINI.pdf');

// Helper to convert image to base64 data URI
function getBase64Image(filename) {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const ext = path.extname(filename).slice(1);
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

const img1 = getBase64Image('01_borang_laporan_whatsapp.png');
const img2 = getBase64Image('02_slip_whatsapp_kejayaan.png');
const img3 = getBase64Image('03_portal_pelajar_semak_rujukan.png');
const img4 = getBase64Image('04_portal_pelajar_daftar.png');
const img5 = getBase64Image('05_dashboard_akaun_pelajar.png');
const img6 = getBase64Image('06_admin_maklumkan_pengadu_whatsapp.png');
const img7 = getBase64Image('07_admin_db_viewer_table_browser.png');
const img8 = getBase64Image('08_admin_db_viewer_sql_console.png');

const htmlContent = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <title>Dokumentasi Penambahbaikan & Manual Pengguna CampusFix (RosakAlert)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.55;
      font-size: 13px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Cover / Header Banner */
    .header-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%);
      color: #ffffff;
      padding: 28px 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    }

    .header-badge-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-primary { background: #38bdf8; color: #0f172a; }
    .badge-success { background: #22c55e; color: #0f172a; }
    .badge-outline { border: 1px solid rgba(255,255,255,0.4); color: #f8fafc; }

    .header-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .header-subtitle {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
    }

    .meta-item .meta-label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .meta-item .meta-val {
      font-size: 12px;
      font-weight: 700;
      color: #f1f5f9;
      word-break: break-all;
    }

    /* Headings */
    h2 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 22px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      margin: 16px 0 6px 0;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 10px;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    strong {
      color: #0f172a;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 11px;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Callouts */
    .callout {
      padding: 10px 14px;
      border-radius: 8px;
      margin: 10px 0;
      font-size: 11.5px;
      border-left: 4px solid;
    }

    .callout-info {
      background: #f0f9ff;
      border-color: #0284c7;
      color: #0369a1;
    }

    .callout-success {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #15803d;
    }

    .callout-warning {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #b45309;
    }

    /* Screenshot Container */
    .screenshot-figure {
      margin: 12px 0 16px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: center;
    }

    .screenshot-img {
      max-width: 100%;
      height: auto;
      max-height: 380px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      display: block;
      margin: 0 auto;
    }

    .screenshot-caption {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 6px;
      font-weight: 600;
      font-style: italic;
    }

    /* Code & Pre */
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }

    kbd {
      font-family: inherit;
      font-size: 10px;
      background: #e2e8f0;
      border: 1px solid #94a3b8;
      border-radius: 3px;
      padding: 1px 4px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.2);
    }

    /* Page Breaks */
    .page-break {
      page-break-before: always;
      break-before: always;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- Cover Header -->
  <div class="header-card">
    <div class="header-badge-row">
      <span class="badge badge-primary">CampusFix</span>
      <span class="badge badge-success">v2.4.0 Production</span>
      <span class="badge badge-outline">Manual Rasmi</span>
    </div>
    <h1 class="header-title">Dokumentasi Penambahbaikan & Manual Pengguna</h1>
    <div class="header-subtitle">Panduan Operasi Penuh untuk Pelajar, Pengadu & Pentadbir (Admin) Fasiliti Kampus</div>
    
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Tarikh Kemaskini</div>
        <div class="meta-val">30 September 2026</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Status CI/CD</div>
        <div class="meta-val">Deploy Terkini (Healthy)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Titik Mula CI/CD</div>
        <div class="meta-val">Run #36669559621</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">URL Pengeluaran</div>
        <div class="meta-val">campusfix.org</div>
      </div>
    </div>
  </div>

  <!-- Pengenalan -->
  <p><strong>CampusFix (RosakAlert)</strong> merupakan sistem pengurusan aduan kerosakan fasiliti kampus bersepadu yang pantas, responsif, dan mesra peranti mudah alih. Manual ini mendokumentasikan ciri-ciri terkini yang ditambah baik bermula dari integrasi DB Viewer dalam Panel Admin sehingga sokongan notifikasi WhatsApp dan Portal Pelajar serba lengkap.</p>

  <!-- Bahagian 1: Changelog -->
  <h2>📋 Bahagian 1: Ringkasan Log Perubahan (Changelog)</h2>
  <p>Berikut adalah rekod terperinci penambahbaikan sistem yang telah diintegrasikan dan disahkan dalam persekitaran pengeluaran:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">ID Komit</th>
        <th style="width: 28%;">Ciri Utama</th>
        <th style="width: 22%;">Komponen Terlibat</th>
        <th>Impak & Nilai Tambah</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>f930832</code></td>
        <td><strong>Web SQLite DB Viewer & Konsol SQL</strong></td>
        <td><code>server.js</code>, <code>admin.html</code></td>
        <td>Membolehkan pentadbir memeriksa status SQLite, melayari baris data, membuat carian pantas, menyembunyi/membuka hash kata laluan, mengeksport CSV/JSON, serta menjalankan pertanyaan SQL kustom terus dari pelayar.</td>
      </tr>
      <tr>
        <td><code>9142b40</code></td>
        <td><strong>Pembaikan Paparan CSS & Cachebuster</strong></td>
        <td><code>admin.html</code>, <code>server.js</code></td>
        <td>Menyuntik gaya terbenam (<em>embedded styles</em>) dan mekanisme <em>cache-busting</em> untuk memintas sekatan cache proksi Cloudflare agar reka bentuk sentiasa dipaparkan secara konsisten.</td>
      </tr>
      <tr>
        <td><code>b1d70c0</code></td>
        <td><strong>Portal Akaun Pelajar & Penjejak Status</strong></td>
        <td><code>pelajar.html</code>, <code>server.js</code></td>
        <td>Menyediakan portal khas (<code>/pelajar.html</code>) lengkap dengan pengesahan sesi SQLite (<code>student_sessions</code>), papan pemuka aduan peribadi, dan penjejak kemajuan 3 peringkat (<em>3-step live stepper</em>).</td>
      </tr>
      <tr>
        <td><code>1a30363</code></td>
        <td><strong>Slip WhatsApp, Mod Guest & Update Pengadu</strong></td>
        <td><code>index.html</code>, <code>pelajar.html</code>, <code>admin.html</code>, <code>server.js</code></td>
        <td>Sokongan pengadu tanpa daftar (<em>guest</em>) dengan medan nombor WhatsApp dan e-mel, butang jana draf slip WhatsApp peribadi, simpanan sejarah peranti (<em>local storage</em>), dan fungsi 1-klik WhatsApp dari pentadbir terus kepada pengadu.</td>
      </tr>
    </tbody>
  </table>

  <!-- Bahagian 2: Pelajar -->
  <div class="page-break"></div>
  <h2>📱 Bahagian 2: Manual Pengguna untuk Pengadu & Pelajar</h2>
  <p>Sistem ini direka agar sangat mudah digunakan oleh warga kampus, sama ada memilih untuk membuat aduan segera tanpa mendaftar akaun (<strong>Mod Guest</strong>) atau mendaftar untuk penyimpanan rekod jangka panjang (<strong>Mod Akaun Pelajar</strong>).</p>

  <div class="avoid-break">
    <h3>Langkah 1: Menghantar Aduan Kerosakan (Mod Pantas / Guest)</h3>
    <ol>
      <li>Layari laman utama <code>https://campusfix.org</code>.</li>
      <li>Pilih <strong>Blok / Bangunan</strong>, <strong>Tingkat</strong>, dan nyatakan <strong>Lokasi Terperinci</strong>.</li>
      <li>Pilih <strong>Kategori Kerosakan</strong> (Elektrik, Paip, Perabot, Struktur, dll.) serta tahap kecemasan.</li>
      <li>Tuliskan perincian kerosakan dan muat naik foto bukti.</li>
      <li>Isikan <strong>Nama Pengadu</strong>, serta <strong>Nombor WhatsApp</strong> dan <strong>E-mel</strong>.</li>
      <li>Klik butang <strong>"Hantar Aduan Sekarang"</strong>.</li>
    </ol>

    <div class="callout callout-info">
      <strong>Nota Penting:</strong> Nombor WhatsApp pengadu akan membolehkan sistem menyediakan pautan slip rasmi dan memudahkan pihak fasiliti menghantar notifikasi kemas kini apabila pembaikan dimulakan.
    </div>

    <div class="screenshot-figure">
      <img src="${img1}" class="screenshot-img" alt="Borang Laporan Kerosakan">
      <div class="screenshot-caption">Rajah 1: Borang Laporan Kerosakan berserta medan sokongan nombor WhatsApp dan E-mel.</div>
    </div>
  </div>

  <div class="page-break"></div>
  <div class="avoid-break">
    <h3>Langkah 2: Skrin Kejayaan, Slip WhatsApp & Rekod Tempatan</h3>
    <p>Selepas aduan dihantar, sistem akan menjana <strong>Nombor Rujukan Aduan</strong> yang unik (contoh: <code>RK-20260922-6BA7</code>).</p>
    <ul>
      <li><strong>Salin Nombor Rujukan:</strong> Klik butang salin untuk menyimpan rujukan aduan.</li>
      <li><strong>Hantar Slip ke WhatsApp Saya:</strong> Klik butang hijau berikon WhatsApp. Sistem akan membuka WhatsApp anda dengan teks slip aduan yang telah diformatkan secara rasmi berserta pautan semakan status langsung.</li>
      <li><strong>Rekod Peranti Tempatan (Recent on this device):</strong> Nombor rujukan disimpan secara automatik dalam memori pelayar telefon anda, membolehkan anda menyemak semula status tanpa mendaftar akaun.</li>
    </ul>

    <div class="screenshot-figure">
      <img src="${img2}" class="screenshot-img" alt="Skrin Kejayaan dan Slip WhatsApp">
      <div class="screenshot-caption">Rajah 2: Skrin kejayaan memaparkan butang WhatsApp slip dan senarai rujukan peranti tempatan.</div>
    </div>
  </div>

  <div class="avoid-break">
    <h3>Langkah 3: Semakan Status Aduan Pantas (Tanpa Mendaftar)</h3>
    <ol>
      <li>Buka menu navigasi dan klik <strong>"Pelajar"</strong> atau terus ke <code>https://campusfix.org/pelajar.html</code>.</li>
      <li>Pilih tab <strong>"Semak Rujukan"</strong>, masukkan nombor rujukan aduan anda dan klik <strong>"Semak Status"</strong>.</li>
      <li>Sistem memaparkan status masa-nyata melalui <strong>Penunjuk Kemajuan 3 Peringkat</strong>:
        <ul style="margin-top: 4px;">
          <li><strong>Peringkat 1: Aduan Diterima</strong> — Laporan telah direkodkan ke dalam sistem fasiliti.</li>
          <li><strong>Peringkat 2: Sedang Dibaiki</strong> — Pasukan juruteknik sedang menjalankan kerja di lokasi.</li>
          <li><strong>Peringkat 3: Selesai</strong> — Pembaikan telah siap dan disahkan oleh pihak pengurusan.</li>
        </ul>
      </li>
    </ol>

    <div class="screenshot-figure">
      <img src="${img3}" class="screenshot-img" alt="Semakan Status Rujukan">
      <div class="screenshot-caption">Rajah 3: Tab Semak Rujukan dengan penunjuk kemajuan 3 peringkat (Status Stepper).</div>
    </div>
  </div>

  <div class="page-break"></div>
  <div class="avoid-break">
    <h3>Langkah 4: Pendaftaran Akaun Pelajar Rasmi (Pilihan)</h3>
    <p>Bagi pelajar yang ingin semua aduan dihubungkan secara kekal ke profil peribadi tanpa bergantung kepada simpanan peranti:</p>
    <ol>
      <li>Pada laman <code>/pelajar.html</code>, klik tab <strong>"Daftar Akaun"</strong>.</li>
      <li>Masukkan Nama Penuh, E-mel Kampus/Peribadi, Nombor Telefon, dan Kata Laluan.</li>
      <li>Klik <strong>"Daftar Akaun Pelajar"</strong>. Anda akan dilog masuk serta-merta.</li>
    </ol>

    <div class="screenshot-figure">
      <img src="${img4}" class="screenshot-img" alt="Pendaftaran Akaun Pelajar">
      <div class="screenshot-caption">Rajah 4: Antara muka pendaftaran akaun pelajar rasmi.</div>
    </div>
  </div>

  <div class="avoid-break">
    <h3>Langkah 5: Papan Pemuka Pelajar (Student Dashboard)</h3>
    <p>Selepas log masuk, anda akan melihat ringkasan status aduan peribadi:</p>
    <ul>
      <li><strong>Statistik Keseluruhan:</strong> Jumlah aduan, aduan baru, sedang dibaiki, dan selesai.</li>
      <li><strong>Carian Pantas:</strong> Menapis aduan mengikut bangunan atau nombor rujukan.</li>
      <li><strong>Kad Aduan Interaktif:</strong> Memaparkan gambar bukti, status berkod warna, dan butang salin rujukan.</li>
    </ul>

    <div class="screenshot-figure">
      <img src="${img5}" class="screenshot-img" alt="Papan Pemuka Pelajar">
      <div class="screenshot-caption">Rajah 5: Papan pemuka akaun pelajar dengan kad statistik dan senarai aduan.</div>
    </div>
  </div>

  <!-- Bahagian 3: Pentadbir -->
  <div class="page-break"></div>
  <h2>🛠️ Bahagian 3: Manual Pengguna untuk Pentadbir (Admin)</h2>
  <p>Panel pentadbir kini dilengkapi ciri komunikasi pintar dan klien pangkalan data berasaskan web yang berkuasa.</p>

  <div class="avoid-break">
    <h3>Langkah 1 & 2: Pengurusan Aduan & Notifikasi "Maklumkan Pengadu"</h3>
    <ol>
      <li>Buka <code>https://campusfix.org/admin.html</code> dan masukkan kata laluan keselamatan admin.</li>
      <li>Pada senarai aduan, perhatikan <strong>Lencana Pelajar (Biru)</strong> atau <strong>Lencana Pengadu Guest (Kelabu)</strong>.</li>
      <li>Tukar status aduan kepada <code>sedang dibaiki</code> atau <code>selesai</code> mengikut kemajuan kerja sebenar.</li>
      <li>Untuk memaklumkan pengadu, klik butang <strong>"Maklumkan Pengadu"</strong> (ikon fon telinga).</li>
      <li>Sistem menyediakan teks rasmi secara automatik mengikut status aduan. Klik <strong>"Buka WhatsApp"</strong> untuk terus menghantar mesej ke nombor telefon pengadu.</li>
    </ol>

    <div class="screenshot-figure">
      <img src="${img6}" class="screenshot-img" alt="Panel Admin WhatsApp Pengadu">
      <div class="screenshot-caption">Rajah 6: Panel pentadbir dengan fungsi 1-klik WhatsApp Maklumkan Pengadu.</div>
    </div>
  </div>

  <div class="page-break"></div>
  <div class="avoid-break">
    <h3>Langkah 3: Menggunakan DB Viewer (Pelayar Pangkalan Data SQLite)</h3>
    <p>Ciri <strong>DB Viewer</strong> membolehkan pentadbir mengurus pangkalan data SQLite terus dari pelayar web:</p>
    <ul>
      <li><strong>Metrik Kesihatan DB:</strong> Memaparkan saiz fail disk, versi SQLite (cth: <code>v3.45.1</code>), mod jurnal (<code>WAL</code>), dan jumlah jadual.</li>
      <li><strong>Pelayar Jadual:</strong> Navigasi pantas jadual (<code>reports</code>, <code>students</code>, <code>student_sessions</code>, <code>settings</code>).</li>
      <li><strong>Carian & Penomboran:</strong> Carian baris data secara dinamik serta had paparan 25, 50, atau 100 baris.</li>
      <li><strong>Perlindungan Kata Laluan:</strong> Nilai <code>password_hash</code> disembunyikan secara automatik dengan butang intip (<em>reveal toggle</em>).</li>
      <li><strong>Eksport Data:</strong> Eksport rekod jadual ke format <strong>CSV</strong> atau <strong>JSON</strong> dengan satu klik.</li>
    </ul>

    <div class="screenshot-figure">
      <img src="${img7}" class="screenshot-img" alt="DB Viewer Table Browser">
      <div class="screenshot-caption">Rajah 7: Pelayar Jadual DB Viewer dengan carian pantas, penyembunyian hash, dan skema.</div>
    </div>
  </div>

  <div class="avoid-break">
    <h3>Langkah 4: Menggunakan Konsol Pertanyaan SQL Interaktif</h3>
    <p>Bagi analisis data terperinci atau pelarasan skema pangkalan data:</p>
    <ol>
      <li>Pada tab DB Viewer, klik sub-butang <strong>"Konsol SQL"</strong>.</li>
      <li>Gunakan <strong>Templat Pantas (SQL Presets)</strong> seperti <em>15 Aduan Terkini</em>, <em>Statistik Bangunan</em>, atau <em>Semakan Integriti DB</em>.</li>
      <li>Taip sebarang kueri kustom dan tekan <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (atau <kbd>Cmd</kbd> + <kbd>Enter</kbd> pada Mac) atau klik butang <strong>"Jalankan SQL"</strong>.</li>
      <li>Keputusan kueri dipaparkan dalam bentuk jadual dinamik berserta kiraan baris dan masa pelaksanaan (ms).</li>
    </ol>

    <div class="screenshot-figure">
      <img src="${img8}" class="screenshot-img" alt="DB Viewer SQL Console">
      <div class="screenshot-caption">Rajah 8: Konsol Pertanyaan SQL Interaktif berserta templat pantas dan hasil kueri.</div>
    </div>
  </div>

  <!-- Bahagian 4: Teknikal -->
  <div class="page-break"></div>
  <h2>🔒 Bahagian 4: Spesifikasi Teknikal & Keselamatan Sistem</h2>
  
  <p>Ringkasan teknikal bagi rujukan pasukan pembangun dan operasi (DevOps):</p>

  <div class="avoid-break">
    <h3>1. Skema Pangkalan Data (SQLite)</h3>
    <ul>
      <li>Kolum baharu jadual <code>reports</code>:
        <ul>
          <li><code>student_id INTEGER NULL</code>: Menghubungkan aduan kepada akaun pelajar jika dilog masuk.</li>
          <li><code>reporter_phone TEXT NULL</code>: Nombor telefon pengadu untuk tujuan slip dan notifikasi WhatsApp.</li>
          <li><code>reporter_email TEXT NULL</code>: Alamat e-mel pengadu.</li>
        </ul>
      </li>
      <li>Jadual baharu <code>students</code>: Menyimpan maklumat pelajar berdaftar (ID, nama, emel, no tel, kata laluan di-hash).</li>
      <li>Jadual baharu <code>student_sessions</code>: Token sesi pengesahan berasaskan kuki <code>HttpOnly</code> dengan tempoh hayat 30 hari.</li>
    </ul>

    <h3>2. Senarai Endpoint API Utama</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Laluan API</th>
          <th style="width: 15%;">Kaedah</th>
          <th>Fungsi Utama</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>/api/student/register</code></td>
          <td><code>POST</code></td>
          <td>Pendaftaran akaun pelajar baharu.</td>
        </tr>
        <tr>
          <td><code>/api/student/login</code></td>
          <td><code>POST</code></td>
          <td>Pengesahan log masuk dan penetapan kuki sesi.</td>
        </tr>
        <tr>
          <td><code>/api/student/me</code></td>
          <td><code>GET</code></td>
          <td>Mengambil profil pelajar semasa dan senarai aduan miliknya.</td>
        </tr>
        <tr>
          <td><code>/api/reports/track/:ref</code></td>
          <td><code>GET</code></td>
          <td>Penjejakan status aduan awam tanpa mengira status log masuk.</td>
        </tr>
        <tr>
          <td><code>/api/db/overview</code></td>
          <td><code>GET</code></td>
          <td>Metrik integriti pangkalan data (saiz disk, versi SQLite, jadual).</td>
        </tr>
        <tr>
          <td><code>/api/db/table/:name</code></td>
          <td><code>GET</code></td>
          <td>Melayari baris data jadual berserta penapisan dan penomboran halaman.</td>
        </tr>
        <tr>
          <td><code>/api/db/query</code></td>
          <td><code>POST</code></td>
          <td>Melaksanakan pertanyaan SQL tersuai (dilindungi akses pentadbir).</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-success" style="margin-top: 14px;">
      <strong>Integriti Storan:</strong> Pangkalan data disimpan di <code>data.db</code> dengan mod <strong>WAL (Write-Ahead Logging)</strong> untuk memastikan integriti transaksi tinggi semasa operasi tulis dan baca serentak.
    </div>
  </div>

</body>
</html>
`;

async function generatePdf() {
  const tempHtmlPath = path.join(ROOT_DIR, 'scripts', 'temp_print.html');
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
  console.log('Saved styled HTML template to:', tempHtmlPath);

  console.log('Launching Headless Chrome for PDF generation...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless',
      '--remote-debugging-port=9333',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  );

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch('http://localhost:9333/json');
      const data = await res.json();
      if (data && data[0] && data[0].webSocketDebuggerUrl) {
        wsUrl = data[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chrome.kill();
    throw new Error('Failed to connect to Headless Chrome over CDP');
  }

  console.log('Connected to Chrome CDP:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result, msg.error);
      callbacks.delete(msg.id);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, (res, err) => {
        if (err) reject(err);
        else resolve(res);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  try {
    await send('Page.enable');
    const fileUrl = `file://${tempHtmlPath}`;
    console.log('Navigating to:', fileUrl);
    await send('Page.navigate', { url: fileUrl });
    await new Promise((r) => setTimeout(r, 2000));

    console.log('Generating PDF via Page.printToPDF...');
    const printResult = await send('Page.printToPDF', {
      printBackground: true,
      paperWidth: 8.27, // A4 inches
      paperHeight: 11.69,
      marginTop: 0.45,
      marginBottom: 0.45,
      marginLeft: 0.45,
      marginRight: 0.45,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 8px; color: #94a3b8; width: 100%; text-align: right; padding: 0 14mm; font-family: -apple-system, sans-serif;">
          CampusFix (RosakAlert) &bull; Dokumentasi &amp; Manual Pengguna v2.4.0
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 8px; color: #94a3b8; width: 100%; text-align: center; padding: 0 14mm; font-family: -apple-system, sans-serif;">
          Muka Surat <span class="pageNumber"></span> daripada <span class="totalPages"></span>
        </div>
      `,
      preferCSSPageSize: true
    });

    const pdfBuffer = Buffer.from(printResult.data, 'base64');
    fs.writeFileSync(OUTPUT_PDF_REPO, pdfBuffer);
    console.log(`Saved PDF to Repo: ${OUTPUT_PDF_REPO} (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.writeFileSync(OUTPUT_PDF_ARTIFACT, pdfBuffer);
      console.log(`Saved PDF to Artifacts: ${OUTPUT_PDF_ARTIFACT}`);
    }

    // Clean up temp HTML
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }

    console.log('PDF GENERATED SUCCESSFULLY!');
    ws.close();
  } catch (err) {
    console.error('Error generating PDF:', err);
  } finally {
    chrome.kill();
  }
}

generatePdf();
