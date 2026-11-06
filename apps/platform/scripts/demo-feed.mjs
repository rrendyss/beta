// Demo feed — kirim rangkaian event terkurasi ke overlay via API ingest.
// Cocok untuk demo overlay tanpa connector: ada alur cerita (chat pembuka,
// gift kecil, follow & like, momen besar Galaxy/Universe dengan share,
// reaksi chat, penutup) — mencakup kelima tipe event live.
//
// Pemakaian:
//   node scripts/demo-feed.mjs <publicToken> [--url http://localhost:3000] [--fast]
//
// Token = token publik overlay (tombol "Copy URL Overlay" di editor, atau
// segmen akhir URL /overlay/<token>).

const args = process.argv.slice(2);
const token = args.find((a) => !a.startsWith("--"));
const urlIdx = args.indexOf("--url");
const BASE = (urlIdx >= 0 ? args[urlIdx + 1] : "http://localhost:3000").replace(/\/$/, "");
const PAUSE_MS = args.includes("--fast") ? 60 : 900;

if (!token) {
  console.error("Pemakaian: node scripts/demo-feed.mjs <publicToken> [--url URL] [--fast]");
  process.exit(1);
}

let n = 0;
const chat = (user, message) => ({ id: `demo-${++n}`, type: "chat", user, amount: 0, data: { message }, createdAt: new Date().toISOString() });
const follow = (user) => ({ id: `demo-${++n}`, type: "follow", user, amount: 0, createdAt: new Date().toISOString() });
const like = (user) => ({ id: `demo-${++n}`, type: "like", user, amount: 0, createdAt: new Date().toISOString() });
const share = (user) => ({ id: `demo-${++n}`, type: "share", user, amount: 0, createdAt: new Date().toISOString() });
const gift = (user, giftName, coins, count) => ({ id: `demo-${++n}`, type: "gift", user, amount: coins * count, data: { giftName, giftCount: count }, createdAt: new Date().toISOString() });

// ── Naskah demo ──────────────────────────────────────────────────────────────
const SCRIPT = [
  // Pembuka: keramaian chat
  chat("bunda_sari", "halo semuanya!"),
  chat("bayu.op", "gaskeun!"),
  chat("kucing_oreo", "wkwkwk"),
  chat("nadia_plays", "baru join, mau nanya"),
  chat("nadia_plays", "itu map apa bang?"),
  chat("bang_jago", "mainnya jago"),

  // Gelombang follow + like
  follow("nadia_plays"),
  follow("kucing_oreo"),
  follow("mel_central"),
  like("mel_central"),
  like("kucing_oreo"),
  like("nadia_plays"),

  // Gift kecil bertubi (Rose streak)
  gift("rani.gift", "Rose", 1, 5),
  gift("rani.gift", "Rose", 1, 24),
  gift("fikri.ogg", "Finger Heart", 5, 3),
  chat("vira.tiktok", "hujan gift bang"),

  // Gift menengah
  gift("dimas_afk", "Doughnut", 30, 2),
  gift("putri_ireng", "Hand Hearts", 100, 1),
  chat("zara_says", "support terus bang"),
  gift("hendra.gg", "Corgi", 299, 1),

  // Reaksi chat
  chat("joko.stream", "serii abis"),
  chat("mama_dewi", "semangat streamnya"),

  // MOMEN BESAR 1: Galaxy (+ share penonton)
  gift("bunda_sari", "Galaxy", 1000, 1),
  chat("reno_p", "wah galaxy nih"),
  chat("bayu.op", "ampun daun"),
  share("reno_p"),

  // MOMEN BESAR 2: Lion & Universe (klimaks)
  gift("sultan.live", "Lion", 29999, 1),
  chat("caca_chaca", "SULTAN MAMPIR"),
  gift("sultan.live", "TikTok Universe", 44999, 1),
  chat("ryandgz", "auto menang"),
  chat("nina.boo", "feed-nya keren banget"),
  share("sultan.live"),

  // Penutup
  follow("zara_says"),
  follow("hendra.gg"),
  like("kimo_22"),
  chat("kimo_22", "GG"),
  chat("bunda_sari", "sukses ya streamnya"),
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0;
let fail = 0;
for (const event of SCRIPT) {
  const res = await fetch(`${BASE}/api/ingest/${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: [event] }),
  });
  if (res.ok) {
    ok += 1;
    const detail = event.type === "gift" ? `${event.data.giftName} x${event.data.giftCount} (${event.amount} koin)` : event.type === "chat" ? `"${event.data.message}"` : "";
    console.log(`✓ ${event.user} → ${event.type} ${detail}`);
  } else {
    fail += 1;
    console.error(`✗ ${event.user} → ${event.type} (HTTP ${res.status})`);
  }
  if (PAUSE_MS > 0) await sleep(PAUSE_MS);
}

console.log(`\nSelesai: ${ok} terkirim, ${fail} gagal — overlay: ${BASE}/overlay/${token}`);
process.exitCode = fail > 0 ? 1 : 0;
