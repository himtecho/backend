// prisma/seed.ts
// Data files expected in prisma/data/:
//   - pihps.csv        (commodity,unit,date,price)
//   - osm-markets.json (Overpass API output)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/config/prisma";

type MarketType = "TRADITIONAL" | "CHEAP_MARKET" | "STORE" | "SUPERMARKET";

const DATA_DIR = path.resolve("prisma/data");

// Final commodities (names must match pihps.csv exactly).
// Order matters: id 1 = Cabai Merah Keriting (matches API contract example).
const COMMODITIES = [
  "Cabai Merah Keriting",
  "Beras Kualitas Medium I",
  "Daging Ayam Ras Segar",
  "Daging Sapi Kualitas 1",
  "Telur Ayam Ras Segar",
  "Bawang Merah Ukuran Sedang",
  "Bawang Putih Ukuran Sedang",
  "Cabai Rawit Merah",
  "Minyak Goreng Curah",
  "Gula Pasir Lokal",
];

// ---------- helpers ----------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// deterministic pseudo-random in [0,1) so re-seeding gives the same data
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function parseOpenHours(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s === "24/7") return "00:00-23:59";
  const m = s.match(/^(?:Mo-Su\s+)?(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function jakartaDate(offsetDays: number): string {
  const base = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // yyyy-mm-dd
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ---------- PIHPS ----------

interface PihpsRow {
  commodity: string;
  unit: string;
  date: string;
  price: number;
}

function loadPihps(): PihpsRow[] {
  const file = path.join(DATA_DIR, "pihps.csv");
  const lines = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: PihpsRow[] = [];
  for (const line of lines.slice(1)) {
    const [commodity, unit, date, price] = line.split(",").map((s) => s.trim());
    const p = Number(price);
    if (!commodity || !unit || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(p)) continue;
    rows.push({ commodity, unit, date, price: p });
  }
  return rows;
}

// ---------- OSM markets ----------

interface OsmElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface MarketInput {
  name: string;
  type: MarketType;
  address: string | null;
  latitude: number;
  longitude: number;
  openHours: string | null;
}

// Not real traditional markets (clothes, books, mosque bazaar, etc.)
const EXCLUDE_MARKET =
  /car boot|business centre|buku|ulekan|bazaar|jabbar|cimol|trade center|makanan/i;
// OSM has salons / shops wrongly tagged shop=supermarket; only accept known grocery names
const SUPERMARKET_OK =
  /yogya|griya|borma|super indo|\bhero\b|aeon|papaya|happy harvest|premier|supermarket|toserba|lotter|nanakam|alfa midi|yomart/i;
const JUNK = /salon|beauty|spa\b|hair|teknik/i;

function loadMarkets(): MarketInput[] {
  const file = path.join(DATA_DIR, "osm-markets.json");
  const elements: OsmElement[] = JSON.parse(fs.readFileSync(file, "utf8")).elements;

  const candidates: MarketInput[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    const name = t.name?.trim();
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    let type: MarketType | null = null;
    if (t.amenity === "marketplace" && !EXCLUDE_MARKET.test(name)) type = "TRADITIONAL";
    else if (t.shop === "supermarket" && SUPERMARKET_OK.test(name) && !JUNK.test(name))
      type = "SUPERMARKET";
    if (!type) continue;

    const label = t.branch && !name.includes(t.branch) ? `${name} ${t.branch}` : name;
    candidates.push({
      name: label,
      type,
      address: t["addr:full"] ?? t["addr:street"] ?? null,
      latitude: lat,
      longitude: lon,
      openHours: parseOpenHours(t.opening_hours),
    });
  }

  // prefer entries that have opening hours, then dedupe
  candidates.sort((a, b) => Number(!!b.openHours) - Number(!!a.openHours));
  const kept: MarketInput[] = [];
  for (const c of candidates) {
    const n = c.name.toLowerCase();
    const dup = kept.some((k) => {
      if (k.type !== c.type) return false;
      const d = haversineKm(k.latitude, k.longitude, c.latitude, c.longitude);
      if (c.type === "TRADITIONAL") return k.name.toLowerCase() === n || d < 0.15;
      return k.name.toLowerCase() === n && d < 0.03;
    });
    if (!dup) kept.push(c);
  }

  // Sample cheap-market spots (approximate coordinates, labelled as sample)
  kept.push(
    {
      name: "[Contoh] Lokasi Pasar Murah Balai Kota",
      type: "CHEAP_MARKET",
      address: "Jl. Wastukencana, Bandung",
      latitude: -6.9218,
      longitude: 107.607,
      openHours: "08:00-14:00",
    },
    {
      name: "[Contoh] Lokasi Pasar Murah Lapangan Gasibu",
      type: "CHEAP_MARKET",
      address: "Jl. Diponegoro, Bandung",
      latitude: -6.9007,
      longitude: 107.6187,
      openHours: "08:00-14:00",
    },
  );
  return kept;
}

// ---------- main ----------

async function main() {
  const pihps = loadPihps().filter((r) => COMMODITIES.includes(r.commodity));
  if (pihps.length === 0) throw new Error("No PIHPS rows matched. Check prisma/data/pihps.csv");

  // 1. wipe old data and restart ids at 1 (this also deletes citizen reports)
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MarketEvent","Price","Market","Commodity" RESTART IDENTITY CASCADE',
  );

  // 2. commodities
  const unitByName = new Map(pihps.map((r) => [r.commodity, r.unit]));
  await prisma.commodity.createMany({
    data: COMMODITIES.map((name) => ({ name, unit: unitByName.get(name) ?? "kg" })),
  });
  const commodities = await prisma.commodity.findMany({ orderBy: { id: "asc" } });
  const commodityId = new Map(commodities.map((c) => [c.name, c.id]));

  // 3. markets
  const marketInputs = loadMarkets();
  await prisma.market.createMany({ data: marketInputs });
  const markets = await prisma.market.findMany({ orderBy: { id: "asc" } });

  // 4. PIHPS prices (city-level, marketId = null)
  await prisma.price.createMany({
    data: pihps.map((r) => ({
      price: r.price,
      date: new Date(`${r.date}T00:00:00Z`),
      source: "PIHPS" as const,
      commodityId: commodityId.get(r.commodity)!,
      marketId: null,
    })),
  });

  // 5. SEED prices per market = latest PIHPS price x type factor (shown as "Estimasi")
  const latest = new Map<string, PihpsRow>();
  for (const r of pihps) {
    const cur = latest.get(r.commodity);
    if (!cur || r.date > cur.date) latest.set(r.commodity, r);
  }
  const factor: Record<MarketType, [number, number]> = {
    TRADITIONAL: [0.97, 1.03],
    CHEAP_MARKET: [0.9, 0.95],
    STORE: [1.05, 1.1],
    SUPERMARKET: [1.03, 1.1],
  };
  const seedPrices = markets.flatMap((m) =>
    COMMODITIES.map((name, ci) => {
      const ref = latest.get(name)!;
      const [lo, hi] = factor[m.type];
      const f = lo + rand(m.id * 100 + ci) * (hi - lo);
      return {
        price: Math.round((ref.price * f) / 100) * 100,
        date: new Date(`${ref.date}T00:00:00Z`),
        source: "SEED" as const,
        commodityId: commodityId.get(name)!,
        marketId: m.id,
      };
    }),
  );
  await prisma.price.createMany({ data: seedPrices });

  // 6. sample events (all labelled [Contoh])
  const plan = [
    { offset: 0, find: "Balai Kota", title: "[Contoh] Pasar Murah Sembako Balai Kota" },
    { offset: 1, find: "Gasibu", title: "[Contoh] Pasar Murah Akhir Pekan Gasibu" },
    { offset: 3, find: "Cihapit", title: "[Contoh] Operasi Pasar Beras dan Minyak" },
    { offset: 6, find: "Kiaracondong", title: "[Contoh] Pasar Murah Kiaracondong" },
    { offset: 12, find: "Cicaheum", title: "[Contoh] Bazar Sembako Murah Cicaheum" },
  ];
  const events = plan.flatMap((p) => {
    const market = markets.find((m) => m.name.includes(p.find));
    if (!market) return [];
    const day = jakartaDate(p.offset);
    return [
      {
        title: p.title,
        organizer: "Penyelenggara contoh",
        description: "Data contoh untuk demo aplikasi.",
        startAt: new Date(`${day}T08:00:00+07:00`),
        endAt: new Date(`${day}T14:00:00+07:00`),
        marketId: market.id,
      },
    ];
  });
  await prisma.marketEvent.createMany({ data: events });

  console.log("commodities:", await prisma.commodity.count());
  console.log("markets    :", await prisma.market.count());
  console.log("prices     :", await prisma.price.count(), `(PIHPS ${pihps.length}, SEED ${seedPrices.length})`);
  console.log("events     :", await prisma.marketEvent.count());
}

main()
  .then(() => console.log("seed selesai"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());