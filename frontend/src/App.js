import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_URL = "https://andyituhermawan-padi.hf.space"; // ganti jika backend di host lain

const COLORS = {
  primary: "#1a3c5e",
  accent: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
};

const RISK_COLORS = {
  Rendah: "#10b981",
  Sedang: "#f59e0b",
  Tinggi: "#ef4444",
  "Sangat Tinggi": "#7f1d1d",
};

// Static portfolio data (page 3 is analytics, not per-submission)
const scoreDistribution = [
  { range: "300–399", count: 4, label: "Sangat Tinggi" },
  { range: "400–499", count: 8, label: "Tinggi" },
  { range: "500–549", count: 11, label: "Tinggi" },
  { range: "550–599", count: 18, label: "Sedang" },
  { range: "600–649", count: 22, label: "Sedang" },
  { range: "650–699", count: 19, label: "Rendah" },
  { range: "700–749", count: 11, label: "Rendah" },
  { range: "750–850", count: 7, label: "Rendah" },
];
const riskDistribution = [
  { name: "Rendah", value: 37, color: "#10b981" },
  { name: "Sedang", value: 40, color: "#f59e0b" },
  { name: "Tinggi", value: 19, color: "#ef4444" },
  { name: "Sangat Tinggi", value: 4, color: "#7f1d1d" },
];
const scoreTrend = [
  { bulan: "Okt '25", avgSkor: 541, avgProb: 28.4 },
  { bulan: "Nov '25", avgSkor: 558, avgProb: 26.1 },
  { bulan: "Des '25", avgSkor: 567, avgProb: 24.8 },
  { bulan: "Jan '26", avgSkor: 579, avgProb: 23.2 },
  { bulan: "Feb '26", avgSkor: 591, avgProb: 21.7 },
  { bulan: "Mar '26", avgSkor: 603, avgProb: 20.1 },
];
const topUMKM = [
  { id: "U-0021", nama: "Dapur Ibu Sari", skor: 724, risiko: "Rendah", prob: "12.4%" },
  { id: "U-0068", nama: "Kue Tradisional Bundo", skor: 689, risiko: "Rendah", prob: "15.8%" },
  { id: "U-0034", nama: "Warung Pak Hendra", skor: 612, risiko: "Sedang", prob: "22.3%" },
  { id: "U-0057", nama: "RM Padang Minang", skor: 481, risiko: "Tinggi", prob: "41.6%" },
  { id: "U-0091", nama: "Katering Bu Dewi", skor: 398, risiko: "Sangat Tinggi", prob: "58.2%" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const scoreColor = (s) => s >= 670 ? COLORS.success : s >= 550 ? COLORS.warning : COLORS.danger;
const riskColor = (r) => RISK_COLORS[r] || COLORS.muted;

// Convert raw probability (0–1) to credit score (300–850)
const probToScore = (prob) => Math.round(850 - prob * 550);

// Risk label from probability
const probToRisk = (prob) => {
  if (prob < 0.2) return "Rendah";
  if (prob < 0.4) return "Sedang";
  if (prob < 0.6) return "Tinggi";
  return "Sangat Tinggi";
};

// Recommended credit limit based on pendapatan & prob
const calcPlafon = (pendapatan, prob) => {
  const base = pendapatan * 3;
  const multiplier = prob < 0.2 ? 1.5 : prob < 0.4 ? 1.0 : 0.5;
  return Math.round((base * multiplier) / 1_000_000) * 1_000_000;
};

const formatRupiah = (n) =>
  "Rp " + n.toLocaleString("id-ID");

// SHAP feature name mapping (backend key → label)
const FEATURE_LABELS = {
  qris_avg_transaksi_per_hari: "Avg transaksi QRIS/hari",
  qris_avg_pendapatan_bulan: "Pendapatan bulanan QRIS",
  qris_tren_6bulan_pct: "Tren pertumbuhan QRIS 6 bln",
  qris_volatilitas_pct: "Volatilitas arus kas",
  jumlah_pinjaman_aktif: "Jumlah pinjaman aktif",
  memiliki_nib: "Status NIB aktif",
  ojol_bulan_aktif: "Bulan aktif ojol",
  memiliki_npwp: "Kepemilikan NPWP",
  aktif_marketplace: "Aktif di marketplace",
  slik_kolektibilitas: "Kolektibilitas SLIK",
  memiliki_kendaraan_roda4: "Memiliki kendaraan R4",
  marketplace_order_per_bulan: "Order marketplace/bulan",
  avg_tagihan_listrik_bulan: "Tagihan listrik rata-rata",
  memiliki_kendaraan_roda2: "Memiliki kendaraan R2",
  saldo_rata_rata_bulan: "Saldo rata-rata bulanan",
  memiliki_pirt: "Sertifikat PIRT",
  pernah_kredit_macet: "Riwayat kredit macet",
  aktif_ojol: "Aktif ojol",
  ojol_avg_order_per_hari: "Avg order ojol/hari",
  marketplace_lama_bergabung_bulan: "Lama bergabung marketplace",
  marketplace_rating: "Rating toko marketplace",
  konsistensi_bayar_listrik: "Konsistensi bayar listrik",
  lama_usaha_tahun: "Lama usaha (tahun)",
  jumlah_rekening_bank: "Jumlah rekening bank",
  sertifikasi_halal: "Sertifikasi halal",
  ojol_rating: "Rating ojol",
  konsistensi_bayar_air: "Konsistensi bayar air",
  kota: "Kota",
  kategori_usaha: "Kategori usaha",
  status_kepemilikan_rumah: "Status kepemilikan rumah",
};

const labelFeature = (key) => FEATURE_LABELS[key] || key;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const pct = ((score - 300) / 550) * 100;
  const angle = -135 + (pct / 100) * 270;
  const r = 70, cx = 90, cy = 90;
  const toRad = (d) => (d * Math.PI) / 180;
  const arcX = cx + r * Math.cos(toRad(angle - 90));
  const arcY = cy + r * Math.sin(toRad(angle - 90));
  return (
    <svg width="180" height="130" viewBox="0 0 180 130">
      <path d={`M ${cx - r * Math.cos(toRad(45))} ${cy + r * Math.sin(toRad(45))} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(toRad(45))} ${cy + r * Math.sin(toRad(45))}`}
        fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${cx - r * Math.cos(toRad(45))} ${cy + r * Math.sin(toRad(45))} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${arcX} ${arcY}`}
        fill="none" stroke={scoreColor(score)} strokeWidth="14" strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="700" fill={scoreColor(score)}>{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill={COLORS.muted}>dari 850</text>
      <text x={28} y={115} textAnchor="middle" fontSize="9" fill={COLORS.muted}>300</text>
      <text x={152} y={115} textAnchor="middle" fontSize="9" fill={COLORS.muted}>850</text>
    </svg>
  );
}

function Sidebar({ active, setActive }) {
  const items = [
    { id: "onboarding", label: "Onboarding UMKM", icon: "🏪" },
    { id: "result", label: "Hasil Skor", icon: "📊" },
    { id: "portfolio", label: "Portofolio & Analitik", icon: "📈" },
  ];
  return (
    <div style={{ width: 220, background: COLORS.primary, minHeight: "100vh", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>PADI</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Penilaian Alternatif Data Inklusif</div>
      </div>
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => setActive(it.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "11px 20px", border: "none", cursor: "pointer", textAlign: "left",
            fontSize: 13, fontWeight: active === it.id ? 600 : 400,
            background: active === it.id ? "rgba(14,165,233,0.18)" : "transparent",
            color: active === it.id ? "#38bdf8" : "rgba(255,255,255,0.65)",
            borderLeft: active === it.id ? "3px solid #38bdf8" : "3px solid transparent",
          }}>
            <span>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        v2.0.0 · DIGDAYA X Hackathon 2026
      </div>
    </div>
  );
}

function Header({ title, subtitle }) {
  const now = new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ padding: "24px 32px 20px", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>{title}</div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.muted, background: COLORS.bg, padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" }}>
        {now} WIB
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: "20px 24px", ...style }}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</div>;
}

function FieldInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 7, fontSize: 13, color: COLORS.text, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 7, fontSize: 13, color: COLORS.text, background: "#f8fafc", outline: "none" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

function FieldToggle({ label, desc, value, onChange }) {
  return (
    <div onClick={() => onChange(value === 1 ? 0 : 1)} style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
      borderRadius: 8, border: `1px solid ${value ? COLORS.accent : COLORS.border}`,
      background: value ? "#eff6ff" : "#f8fafc", cursor: "pointer",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 4, border: `2px solid ${value ? COLORS.accent : COLORS.border}`,
        background: value ? COLORS.accent : "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, marginTop: 1,
      }}>
        {!!value && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  );
}

// ─── DEFAULT FORM STATE ───────────────────────────────────────────────────────
const defaultForm = {
  // Identitas
  nama_usaha: "Dapur Ibu Sari",
  nama_pemilik: "Sari Dewi Kusuma",
  kota: "Jakarta",
  kategori_usaha: "Minuman",
  status_kepemilikan_rumah: "milik_sendiri",
  lama_usaha_tahun: 3,

  // QRIS
  transaksi: 42,           // qris_avg_transaksi_per_hari
  pendapatan: 18500000,    // qris_avg_pendapatan_bulan
  growth: 12.5,            // qris_tren_6bulan_pct
  volatilitas: 8.2,        // qris_volatilitas_pct

  // Legalitas
  nib: "Aktif",            // memiliki_nib → 1
  memiliki_npwp: 1,
  memiliki_pirt: 1,
  sertifikasi_halal: 0,

  // Keuangan
  jumlah_pinjaman_aktif: 1,
  saldo_rata_rata_bulan: 4500000,
  pernah_kredit_macet: 0,
  slik_kolektibilitas: 1,  // 1=lancar, 2=DPK, dst.
  jumlah_rekening_bank: 2,

  // Aset
  memiliki_kendaraan_roda2: 1,
  memiliki_kendaraan_roda4: 0,

  // Ojol
  aktif_ojol: 1,
  ojol_bulan_aktif: 18,
  ojol_avg_order_per_hari: 8,
  ojol_rating: 4.7,

  // Marketplace
  aktif_marketplace: 1,
  marketplace_order_per_bulan: 35,
  marketplace_lama_bergabung_bulan: 24,
  marketplace_rating: 4.8,

  // Utilitas
  avg_tagihan_listrik_bulan: 450000,
  konsistensi_bayar_listrik: 11,  // bulan dari 12
  konsistensi_bayar_air: 10,
};

// ─── SCREEN 1: ONBOARDING ─────────────────────────────────────────────────────
function ScreenOnboarding({ form, setForm, onSubmit, loading, error }) {
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Onboarding UMKM" subtitle="Isi data UMKM untuk penilaian kredit berbasis data alternatif" />

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
        {["Identitas Usaha", "Legalitas & Keuangan", "Data Digital", "Proses Scoring"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                background: i < 3 ? COLORS.accent : COLORS.bg,
                color: i < 3 ? "#fff" : COLORS.muted,
                border: `2px solid ${i < 3 ? COLORS.accent : COLORS.border}`,
              }}>{i + 1}</div>
              <span style={{ fontSize: 10, color: i < 3 ? COLORS.accent : COLORS.muted, fontWeight: i < 3 ? 600 : 400, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: 2, background: i < 2 ? COLORS.accent : COLORS.border, margin: "0 4px", marginBottom: 18 }} />}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ── Identitas Usaha ── */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>🏪 Identitas Usaha</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldInput label="Nama Usaha" value={form.nama_usaha} onChange={set("nama_usaha")} placeholder="cth. Dapur Ibu Sari" />
            <FieldInput label="Nama Pemilik" value={form.nama_pemilik} onChange={set("nama_pemilik")} placeholder="Nama lengkap pemilik" />
            <FieldSelect label="Kota" value={form.kota} onChange={set("kota")}
              options={["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Yogyakarta", "Palembang"]} />
            
            <FieldSelect label="Kategori Usaha" value={form.kategori_usaha} onChange={set("kategori_usaha")}
              options={["Katering", "Kue & roti", "Makanan ringan", "Minuman", "Olahan daging", "Sambal & bumbu"]} />

            <FieldSelect label="Status Kepemilikan Rumah" value={form.status_kepemilikan_rumah} onChange={set("status_kepemilikan_rumah")}
              options={[
                { value: "kontrak", label: "Kontrak" },
                { value: "kos", label: "Kos" },
                { value: "milik_keluarga", label: "Milik Keluarga" },
                { value: "milik_sendiri", label: "Milik Sendiri" },
              ]} />


            <FieldInput label="Lama Usaha (tahun)" value={form.lama_usaha_tahun} onChange={set("lama_usaha_tahun")} type="number" placeholder="3" />
          </div>
        </Card>

        {/* ── Legalitas ── */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>📄 Legalitas & Keuangan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FieldSelect label="Status NIB (OSS)" value={form.nib} onChange={set("nib")}
              options={["Aktif", "Tidak Aktif", "Belum Punya"]} />
            <FieldInput label="Jumlah Pinjaman Aktif" value={form.jumlah_pinjaman_aktif} onChange={set("jumlah_pinjaman_aktif")} type="number" placeholder="1" />
            <FieldInput label="Saldo Rata-rata Bulanan (Rp)" value={form.saldo_rata_rata_bulan} onChange={set("saldo_rata_rata_bulan")} type="number" placeholder="4500000" />
            <FieldSelect label="Kolektibilitas SLIK" value={form.slik_kolektibilitas} onChange={(v) => set("slik_kolektibilitas")(parseInt(v))}
              options={[
                { value: 1, label: "1 — Lancar" },
                { value: 2, label: "2 — Dalam Perhatian Khusus" },
                { value: 3, label: "3 — Kurang Lancar" },
                { value: 4, label: "4 — Diragukan" },
                { value: 5, label: "5 — Macet" },
              ]} />
            <FieldInput label="Jumlah Rekening Bank" value={form.jumlah_rekening_bank} onChange={set("jumlah_rekening_bank")} type="number" placeholder="2" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldToggle label="Punya NPWP" value={form.memiliki_npwp} onChange={set("memiliki_npwp")} />
              <FieldToggle label="Punya PIRT" value={form.memiliki_pirt} onChange={set("memiliki_pirt")} />
              <FieldToggle label="Sertifikat Halal" value={form.sertifikasi_halal} onChange={set("sertifikasi_halal")} />
              <FieldToggle label="Pernah Kredit Macet" value={form.pernah_kredit_macet} onChange={set("pernah_kredit_macet")} />
              <FieldToggle label="Kendaraan Roda 2" value={form.memiliki_kendaraan_roda2} onChange={set("memiliki_kendaraan_roda2")} />
              <FieldToggle label="Kendaraan Roda 4" value={form.memiliki_kendaraan_roda4} onChange={set("memiliki_kendaraan_roda4")} />
            </div>
          </div>
        </Card>

        {/* ── Data QRIS ── */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>💳 Data Transaksi QRIS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldInput label="Rata-rata Transaksi per Hari" value={form.transaksi} onChange={set("transaksi")} type="number" placeholder="42" />
            <FieldInput label="Rata-rata Pendapatan per Bulan (Rp)" value={form.pendapatan} onChange={set("pendapatan")} type="number" placeholder="18500000" />
            <FieldInput label="Tren Pertumbuhan 6 Bulan (%)" value={form.growth} onChange={set("growth")} type="number" placeholder="12.5" />
            <FieldInput label="Volatilitas Arus Kas (%)" value={form.volatilitas} onChange={set("volatilitas")} type="number" placeholder="8.2" />
          </div>
        </Card>

        {/* ── Data Digital (Ojol + Marketplace + Utilitas) ── */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>📱 Data Digital & Utilitas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, marginTop: 2 }}>GoFood / Ojol</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldToggle label="Aktif di Ojol" value={form.aktif_ojol} onChange={set("aktif_ojol")} />
              <FieldInput label="Bulan Aktif Ojol" value={form.ojol_bulan_aktif} onChange={set("ojol_bulan_aktif")} type="number" placeholder="18" />
              <FieldInput label="Avg Order Ojol/Hari" value={form.ojol_avg_order_per_hari} onChange={set("ojol_avg_order_per_hari")} type="number" placeholder="8" />
              <FieldInput label="Rating Ojol" value={form.ojol_rating} onChange={set("ojol_rating")} type="number" placeholder="4.7" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, marginTop: 4 }}>Marketplace (Tokopedia/Shopee)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldToggle label="Aktif di Marketplace" value={form.aktif_marketplace} onChange={set("aktif_marketplace")} />
              <FieldInput label="Order Marketplace/Bulan" value={form.marketplace_order_per_bulan} onChange={set("marketplace_order_per_bulan")} type="number" placeholder="35" />
              <FieldInput label="Lama Bergabung (bulan)" value={form.marketplace_lama_bergabung_bulan} onChange={set("marketplace_lama_bergabung_bulan")} type="number" placeholder="24" />
              <FieldInput label="Rating Marketplace" value={form.marketplace_rating} onChange={set("marketplace_rating")} type="number" placeholder="4.8" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, marginTop: 4 }}>Utilitas (PLN / PDAM)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldInput label="Tagihan Listrik/Bulan (Rp)" value={form.avg_tagihan_listrik_bulan} onChange={set("avg_tagihan_listrik_bulan")} type="number" placeholder="450000" />
              <FieldInput label="Konsistensi Bayar Listrik (0–12)" value={form.konsistensi_bayar_listrik} onChange={set("konsistensi_bayar_listrik")} type="number" placeholder="11" />
              <FieldInput label="Konsistensi Bayar Air (0–12)" value={form.konsistensi_bayar_air} onChange={set("konsistensi_bayar_air")} type="number" placeholder="10" />
            </div>
          </div>
        </Card>

        {/* ── Submit ── */}
        <Card style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>🔐 Konfirmasi & Proses Scoring</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
            Data akan diproses oleh model ML berbasis data alternatif (QRIS, ojol, marketplace, SLIK). Sesuai UU PDP No. 27/2022.
          </div>
          {error && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: 8, borderLeft: `3px solid ${COLORS.danger}`, fontSize: 12, color: "#991b1b", marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}
          <button
            onClick={onSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              background: loading ? COLORS.muted : COLORS.primary,
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}>
            {loading ? "⏳ Memproses data ke backend..." : "Simpan & Mulai Proses Penilaian →"}
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─── SCREEN 2: HASIL SKOR ─────────────────────────────────────────────────────
function ScreenResult({ form, result }) {
  if (!result) {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Belum ada hasil scoring</div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>Isi form Onboarding UMKM dan klik "Simpan & Mulai Proses Penilaian" terlebih dahulu.</div>
      </div>
    );
  }

  const { probability, shap_values, shap_error } = result;
  const score = probToScore(probability);
  const risk = probToRisk(probability);
  const probPct = (probability * 100).toFixed(1);
  const plafon = calcPlafon(form.pendapatan, probability);
  const tenor = probability < 0.2 ? "36 bulan" : probability < 0.4 ? "24 bulan" : "12 bulan";
  const bunga = probability < 0.2 ? "9–12% / tahun" : probability < 0.4 ? "12–15% / tahun" : "15–18% / tahun";
  const statusLayak = probability < 0.5 ? "✓ Layak Diproses" : "✗ Perlu Kajian Lebih Lanjut";
  const statusColor = probability < 0.5 ? COLORS.success : COLORS.danger;
  const riskBg = probability < 0.2 ? "#d1fae5" : probability < 0.4 ? "#fef3c7" : probability < 0.6 ? "#fee2e2" : "#fca5a5";
  const riskTextColor = probability < 0.2 ? "#065f46" : probability < 0.4 ? "#92400e" : probability < 0.6 ? "#991b1b" : "#7f1d1d";

  // Normalize SHAP values for display
  const shapForChart = shap_values.map(s => ({
    feature: labelFeature(s.feature),
    value: parseFloat(s.value.toFixed(4)),
  }));

  const maxAbs = Math.max(...shapForChart.map(s => Math.abs(s.value)), 0.01);

  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header
        title="Hasil Penilaian Kredit"
        subtitle={`${form.nama_usaha} · ${form.nama_pemilik} · Diproses otomatis`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>
        {/* Gauge */}
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px" }}>
          <ScoreGauge score={score} />
          <div style={{ marginTop: 12, padding: "5px 18px", borderRadius: 20, background: riskBg, color: riskTextColor, fontSize: 13, fontWeight: 700 }}>
            RISIKO {risk.toUpperCase()}
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: COLORS.muted, textAlign: "center" }}>
            Probabilitas gagal bayar<br />
            <span style={{ fontSize: 22, fontWeight: 700, color: probability < 0.4 ? COLORS.success : COLORS.danger }}>{probPct}%</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: COLORS.muted, textAlign: "center", padding: "8px 12px", background: COLORS.bg, borderRadius: 6, lineHeight: 1.5 }}>
            Model: Random Forest / XGBoost pipeline<br />
            Fitur: {shap_values.length > 0 ? "SHAP aktif" : "Feature importance"}
          </div>
        </Card>

        {/* Rekomendasi */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Rekomendasi Pembiayaan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { label: "Plafon Direkomendasikan", value: formatRupiah(plafon), color: COLORS.success },
              { label: "Tenor Maksimal", value: tenor, color: COLORS.accent },
              { label: "Estimasi Bunga", value: bunga, color: COLORS.text },
              { label: "Status Keputusan", value: statusLayak, color: statusColor },
            ].map(item => (
              <div key={item.label} style={{ background: COLORS.bg, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Summary data */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Pendapatan/Bulan", value: formatRupiah(form.pendapatan) },
              { label: "Transaksi/Hari", value: `${form.transaksi}x` },
              { label: "Tren 6 Bulan", value: `+${form.growth}%` },
              { label: "Kolektibilitas SLIK", value: `Kol. ${form.slik_kolektibilitas}` },
              { label: "Lama Usaha", value: `${form.lama_usaha_tahun} thn` },
              { label: "NIB", value: form.nib },
            ].map(d => (
              <div key={d.label} style={{ background: "#f8fafc", borderRadius: 6, padding: "10px 12px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 10, color: COLORS.muted }}>{d.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{d.value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px 14px", background: "#eff6ff", borderRadius: 8, borderLeft: `3px solid ${COLORS.accent}`, fontSize: 12, color: "#1e40af" }}>
            <strong>Catatan sistem:</strong> Skor dihitung otomatis dari data alternatif (QRIS, ojol, marketplace, SLIK, utilitas).
            {shap_error && <span style={{ color: "#b45309" }}> ⚠️ {shap_error}</span>}
          </div>
        </Card>
      </div>

      {/* SHAP Chart */}
      <Card>
        <SectionTitle sub="Fitur positif mendorong skor naik (hijau); negatif menekan skor (merah). Dapat diaudit sesuai POJK 29/2024.">
          Explainability — Kontribusi Fitur {shap_values.length > 0 ? "(SHAP Values)" : "(Feature Importance — Fallback)"}
        </SectionTitle>
        {shapForChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={shapForChart} layout="vertical" margin={{ left: 220, right: 70, top: 4, bottom: 4 }}>
              <XAxis type="number"
                domain={[-maxAbs * 1.2, maxAbs * 1.2]}
                tickFormatter={v => v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3)}
                fontSize={11} />
              <YAxis type="category" dataKey="feature" width={215} fontSize={11} tick={{ fill: COLORS.text }} />
              <Tooltip formatter={(v) => [v > 0 ? `+${v.toFixed(4)}` : v.toFixed(4), "SHAP value"]} />
              <ReferenceLine x={0} stroke={COLORS.border} />
              <Bar dataKey="value" shape={(props) => {
                const { x, y, width, height, value } = props;
                return <rect x={value < 0 ? x + width : x} y={y} width={Math.abs(width)} height={height} fill={value >= 0 ? COLORS.success : COLORS.danger} rx={3} />;
              }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
            Data SHAP tidak tersedia dari backend.
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── SCREEN 3: PORTFOLIO ──────────────────────────────────────────────────────
function CustomBar(props) {
  const { x, y, width, height, payload } = props;
  const color = payload.label === "Rendah" ? COLORS.success :
    payload.label === "Sedang" ? COLORS.warning :
      payload.label === "Tinggi" ? COLORS.danger : "#7f1d1d";
  return <rect x={x} y={y} width={width} height={height} fill={color} rx={3} opacity={0.85} />;
}

function ScoreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: COLORS.text }}>{d.range}</div>
      <div style={{ color: COLORS.muted }}>{d.count} UMKM</div>
      <div style={{ color: riskColor(d.label), fontWeight: 600 }}>Risiko {d.label}</div>
    </div>
  );
}

function ScreenPortfolio() {
  return (
    <div style={{ padding: "0 32px 48px" }}>
      <Header title="Portofolio & Analitik" subtitle="Distribusi dan tren seluruh UMKM yang telah dinilai · Total 100 UMKM terdaftar" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total UMKM Dinilai", value: "100", color: COLORS.primary, sub: "Sejak Okt 2025" },
          { label: "Risiko Rendah", value: "37%", color: COLORS.success, sub: "37 UMKM" },
          { label: "Risiko Sedang", value: "40%", color: COLORS.warning, sub: "40 UMKM" },
          { label: "Risiko Tinggi / Sangat Tinggi", value: "23%", color: COLORS.danger, sub: "23 UMKM" },
          { label: "Rata-rata Skor Portofolio", value: "603", color: COLORS.accent, sub: "Prob. gagal bayar 20.1%" },
        ].map(s => (
          <Card key={s.label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6, lineHeight: 1.4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>
        <Card>
          <SectionTitle sub="Sebaran skor seluruh UMKM terdaftar. Warna menunjukkan kategori risiko per rentang skor.">
            Distribusi Skor Kelayakan Kredit
          </SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
              <XAxis dataKey="range" fontSize={11} tick={{ fill: COLORS.muted }} />
              <YAxis fontSize={11} tick={{ fill: COLORS.muted }} label={{ value: "Jumlah UMKM", angle: -90, position: "insideLeft", fontSize: 10, fill: COLORS.muted, dy: 40 }} />
              <Tooltip content={<ScoreTooltip />} />
              <Bar dataKey="count" shape={<CustomBar />} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {[["Rendah (≥650)", COLORS.success], ["Sedang (550–649)", COLORS.warning], ["Tinggi (400–549)", COLORS.danger], ["Sangat Tinggi (<400)", "#7f1d1d"]].map(([lbl, color]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: COLORS.muted }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                {lbl}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Proporsi UMKM per kategori risiko dari total 100 UMKM.">Distribusi Kategori Risiko</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} UMKM (${v}%)`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {riskDistribution.map(r => (
              <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                  <span style={{ color: COLORS.text }}>{r.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: r.color }}>{r.value} UMKM</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <SectionTitle sub="Rata-rata skor portofolio per bulan.">Tren Rata-rata Skor Portofolio</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={scoreTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="bulan" fontSize={10} tick={{ fill: COLORS.muted }} />
              <YAxis domain={[500, 650]} fontSize={10} tick={{ fill: COLORS.muted }} />
              <Tooltip formatter={(v) => [v, "Rata-rata skor"]} />
              <ReferenceLine y={550} stroke={COLORS.warning} strokeDasharray="4 4" label={{ value: "Batas Sedang", fontSize: 9, fill: COLORS.warning, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="avgSkor" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.accent }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle sub="Rata-rata probabilitas gagal bayar per bulan.">Tren Rata-rata Probabilitas Gagal Bayar</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={scoreTrend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="bulan" fontSize={10} tick={{ fill: COLORS.muted }} />
              <YAxis domain={[15, 35]} fontSize={10} tick={{ fill: COLORS.muted }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Prob. gagal bayar"]} />
              <ReferenceLine y={25} stroke={COLORS.warning} strokeDasharray="4 4" label={{ value: "Target 25%", fontSize: 9, fill: COLORS.warning, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="avgProb" stroke={COLORS.danger} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.danger }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle sub="Daftar UMKM terdaftar diurutkan berdasarkan skor tertinggi.">Daftar UMKM Terdaftar</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: COLORS.bg }}>
              {["ID", "Nama Usaha", "Skor", "Prob. Gagal Bayar", "Kategori Risiko", "Status"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: COLORS.muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topUMKM.map(row => (
              <tr key={row.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "10px 12px", color: COLORS.muted, fontSize: 11 }}>{row.id}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: COLORS.text }}>{row.nama}</td>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: scoreColor(row.skor) }}>{row.skor}</td>
                <td style={{ padding: "10px 12px", color: COLORS.text }}>{row.prob}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: `${riskColor(row.risiko)}22`, color: riskColor(row.risiko) }}>
                    {row.risiko}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: "#d1fae5", color: COLORS.success }}>Scored</span>
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
              <td colSpan={6} style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: COLORS.muted }}>
                + 95 UMKM lainnya · Menampilkan 5 dari 100
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}


// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Map form fields ke payload sesuai build_df di main.py
      const payload = {
        transaksi: form.transaksi,
        pendapatan: form.pendapatan,
        growth: form.growth,
        volatilitas: form.volatilitas,
        pinjaman: form.jumlah_pinjaman_aktif,
        nib: form.nib,
        ojol_bulan_aktif: form.ojol_bulan_aktif,
        memiliki_npwp: form.memiliki_npwp,
        aktif_marketplace: form.aktif_marketplace,
        slik_kolektibilitas: form.slik_kolektibilitas,
        memiliki_kendaraan_roda4: form.memiliki_kendaraan_roda4,
        marketplace_order_per_bulan: form.marketplace_order_per_bulan,
        avg_tagihan_listrik_bulan: form.avg_tagihan_listrik_bulan,
        memiliki_kendaraan_roda2: form.memiliki_kendaraan_roda2,
        saldo_rata_rata_bulan: form.saldo_rata_rata_bulan,
        memiliki_pirt: form.memiliki_pirt,
        pernah_kredit_macet: form.pernah_kredit_macet,
        aktif_ojol: form.aktif_ojol,
        ojol_avg_order_per_hari: form.ojol_avg_order_per_hari,
        marketplace_lama_bergabung_bulan: form.marketplace_lama_bergabung_bulan,
        marketplace_rating: form.marketplace_rating,
        konsistensi_bayar_listrik: form.konsistensi_bayar_listrik,
        lama_usaha_tahun: form.lama_usaha_tahun,
        jumlah_rekening_bank: form.jumlah_rekening_bank,
        sertifikasi_halal: form.sertifikasi_halal,
        ojol_rating: form.ojol_rating,
        konsistensi_bayar_air: form.konsistensi_bayar_air,
        kota: form.kota,
        kategori_usaha: form.kategori_usaha,
        status_kepemilikan_rumah: form.status_kepemilikan_rumah,
      };

      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backend error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      setResult(data);
      setScreen("result");
    } catch (e) {
      setError(`Gagal terhubung ke backend: ${e.message}. Pastikan server FastAPI berjalan di ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", fontFamily: "'Segoe UI', system-ui, sans-serif", background: COLORS.bg, minHeight: "100vh" }}>
      <Sidebar active={screen} setActive={setScreen} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {screen === "onboarding" && (
          <ScreenOnboarding
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )}
        {screen === "result" && <ScreenResult form={form} result={result} />}
        {screen === "portfolio" && <ScreenPortfolio />}
      </div>
    </div>
  );
}
