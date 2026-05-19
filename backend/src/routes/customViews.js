const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  // pdfkit not installed yet — handler will return 503 with a clear message.
}

const router = express.Router();

// Deterministic pseudo-random for synthesized fallback coords/sales
function hash(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// NYC-ish bounding box for synthesized coords
const SYNTH_CENTER = { lat: 40.7300, lng: -73.9900 };
const SYNTH_RANGE = 0.18;

function deriveStatus(m) {
  const raw = (m.status || '').toLowerCase();
  if (raw === 'inactive' || raw === 'offline' || raw === 'maintenance') return 'offline';
  // Use machine id to deterministically mark some as low_stock
  if (hash(m.id + 7) < 0.18) return 'low_stock';
  return 'online';
}

// GET /api/custom-views/machine-locations
// Returns array of { id, name, location, status, lat, lng } with synthesized
// coords/status when DB values are missing.
router.get('/machine-locations', authenticateToken, async (req, res) => {
  try {
    let rows = [];
    try {
      const r = await pool.query(
        'SELECT id, name, location, status, lat, lng FROM machines ORDER BY id'
      );
      rows = r.rows || [];
    } catch (e) {
      // Schema missing — fully synthesize 18 sample machines
      rows = Array.from({ length: 18 }).map((_, i) => ({
        id: i + 1,
        name: `VM-${String(i + 1).padStart(3, '0')}`,
        location: `Synthetic Site ${i + 1}`,
        status: i % 7 === 0 ? 'maintenance' : 'active',
        lat: null,
        lng: null,
      }));
    }

    const out = rows.map((m) => {
      let lat = Number(m.lat);
      let lng = Number(m.lng);
      if (!isFinite(lat) || lat === 0 || !isFinite(lng) || lng === 0) {
        lat = SYNTH_CENTER.lat + (hash(m.id) - 0.5) * SYNTH_RANGE;
        lng = SYNTH_CENTER.lng + (hash(m.id + 1) - 0.5) * SYNTH_RANGE;
      }
      return {
        id: m.id,
        name: m.name,
        location: m.location,
        status: deriveStatus(m),
        lat,
        lng,
      };
    });

    res.json({ count: out.length, machines: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/custom-views/sales-by-machine
// Returns top 15 machines by revenue. Synthesizes when sales table missing.
router.get('/sales-by-machine', authenticateToken, async (req, res) => {
  try {
    let rows = [];
    let synthesized = false;
    try {
      const r = await pool.query(`
        SELECT m.id, m.name,
               COALESCE(SUM(s.amount), 0)::float AS revenue,
               COALESCE(SUM(s.quantity), 0)::int AS units
        FROM machines m
        LEFT JOIN sales s ON s.machine_id = m.id
        GROUP BY m.id, m.name
        ORDER BY revenue DESC
        LIMIT 15
      `);
      rows = r.rows || [];
      const total = rows.reduce((a, b) => a + Number(b.revenue || 0), 0);
      if (total === 0) {
        synthesized = true;
        rows = rows.map((m) => ({
          id: m.id,
          name: m.name,
          revenue: Math.round((500 + hash(m.id) * 4500) * 100) / 100,
          units: Math.round(100 + hash(m.id + 3) * 1200),
        }));
      }
    } catch (e) {
      synthesized = true;
      rows = Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        name: `VM-${String(i + 1).padStart(3, '0')}`,
        revenue: Math.round((500 + hash(i + 1) * 4500) * 100) / 100,
        units: Math.round(100 + hash(i + 2) * 1200),
      }));
    }

    rows.sort((a, b) => Number(b.revenue) - Number(a.revenue));
    rows = rows.slice(0, 15);

    res.json({
      synthesized,
      count: rows.length,
      machines: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Helpers: load machine inventory snapshot + revenue used by route/slip endpoints
// ----------------------------------------------------------------------------

async function loadMachineSnapshot() {
  let machines = [];
  try {
    const r = await pool.query(
      'SELECT id, name, location, status, lat, lng FROM machines ORDER BY id'
    );
    machines = r.rows || [];
  } catch (e) {
    machines = Array.from({ length: 18 }).map((_, i) => ({
      id: i + 1,
      name: `VM-${String(i + 1).padStart(3, '0')}`,
      location: `Synthetic Site ${i + 1}`,
      status: i % 7 === 0 ? 'maintenance' : 'active',
      lat: null,
      lng: null,
    }));
  }

  // Revenue lookup (best-effort)
  const revenueById = {};
  try {
    const r = await pool.query(`
      SELECT machine_id, COALESCE(SUM(amount), 0)::float AS revenue
      FROM sales
      GROUP BY machine_id
    `);
    (r.rows || []).forEach((row) => {
      revenueById[row.machine_id] = Number(row.revenue) || 0;
    });
  } catch (e) {
    // ignore — fall through to synthesized
  }

  return machines.map((m) => {
    let lat = Number(m.lat);
    let lng = Number(m.lng);
    if (!isFinite(lat) || lat === 0 || !isFinite(lng) || lng === 0) {
      lat = SYNTH_CENTER.lat + (hash(m.id) - 0.5) * SYNTH_RANGE;
      lng = SYNTH_CENTER.lng + (hash(m.id + 1) - 0.5) * SYNTH_RANGE;
    }
    const revenue =
      revenueById[m.id] != null && revenueById[m.id] > 0
        ? revenueById[m.id]
        : Math.round((500 + hash(m.id) * 4500) * 100) / 100;
    // Deterministic low-stock score 0..1 (higher = more depleted)
    const lowStockScore = hash(m.id + 11);
    // Deterministic synthetic restock items list per machine
    const itemCount = 3 + Math.floor(hash(m.id + 17) * 5); // 3..7
    return {
      id: m.id,
      name: m.name,
      location: m.location || `Site ${m.id}`,
      status: deriveStatus(m),
      lat,
      lng,
      revenue,
      lowStockScore,
      restockItemsCount: itemCount,
    };
  });
}

const SYNTH_PRODUCT_CATALOG = [
  { sku: 'BEV-COKE-12', name: 'Coke 12oz' },
  { sku: 'BEV-DIET-12', name: 'Diet Coke 12oz' },
  { sku: 'BEV-PEPSI-12', name: 'Pepsi 12oz' },
  { sku: 'BEV-SPRT-12', name: 'Sprite 12oz' },
  { sku: 'BEV-H2O-500', name: 'Bottled Water 500ml' },
  { sku: 'SNK-CHIPS-LAY', name: "Lay's Chips" },
  { sku: 'SNK-DORITOS', name: 'Doritos Nacho' },
  { sku: 'SNK-CHEETOS', name: 'Cheetos Crunchy' },
  { sku: 'CND-SNICK', name: 'Snickers Bar' },
  { sku: 'CND-MM-PB', name: 'M&M Peanut Butter' },
  { sku: 'CND-KITKAT', name: 'KitKat 4-finger' },
  { sku: 'GUM-FIVE', name: 'Five Gum Pack' },
];

function synthesizeRestockItems(machineId, count) {
  const items = [];
  const len = SYNTH_PRODUCT_CATALOG.length;
  for (let i = 0; i < count; i++) {
    const pickIdx = Math.floor(hash(machineId * 31 + i * 7) * len) % len;
    const p = SYNTH_PRODUCT_CATALOG[pickIdx];
    const qty = 6 + Math.floor(hash(machineId + i * 13) * 18); // 6..23
    items.push({ sku: p.sku, name: p.name, qty });
  }
  return items;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborOrder(start, candidates) {
  const remaining = candidates.slice();
  const ordered = [];
  let cur = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    next._legKm = Math.round(bestDist * 100) / 100;
    ordered.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  return ordered;
}

// Resolve a friendly "start location" string to a coordinate.
// Accepts: explicit { lat, lng }, machine id, "lat,lng" string, or named depot.
const NAMED_DEPOTS = {
  'midtown depot': { lat: 40.7549, lng: -73.984 },
  'queens depot': { lat: 40.7282, lng: -73.7949 },
  'brooklyn depot': { lat: 40.6782, lng: -73.9442 },
  'bronx depot': { lat: 40.8448, lng: -73.8648 },
  'jersey city depot': { lat: 40.7178, lng: -74.0431 },
};

function resolveStart(startLocation, machines) {
  if (startLocation && typeof startLocation === 'object' &&
      isFinite(Number(startLocation.lat)) && isFinite(Number(startLocation.lng))) {
    return { lat: Number(startLocation.lat), lng: Number(startLocation.lng) };
  }
  if (typeof startLocation === 'string' && startLocation.trim()) {
    const s = startLocation.trim().toLowerCase();
    if (NAMED_DEPOTS[s]) return NAMED_DEPOTS[s];
    const csv = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (csv) return { lat: Number(csv[1]), lng: Number(csv[2]) };
    // Try matching a machine name
    const m = machines.find((mm) => (mm.name || '').toLowerCase() === s);
    if (m) return { lat: m.lat, lng: m.lng };
  }
  if (typeof startLocation === 'number' || /^\d+$/.test(String(startLocation || ''))) {
    const id = Number(startLocation);
    const m = machines.find((mm) => mm.id === id);
    if (m) return { lat: m.lat, lng: m.lng };
  }
  // Default depot
  return NAMED_DEPOTS['midtown depot'];
}

// ----------------------------------------------------------------------------
// POST /api/custom-views/restock-route
// Body: { driver, start_location, max_stops, prioritize }
// prioritize ∈ { 'low-stock', 'high-revenue' } (default 'low-stock')
// Returns: { route: [{ stop, id, name, location, eta, eta_minutes,
//                      restock_items, distance_km }], total_minutes, ... }
// ----------------------------------------------------------------------------
router.post('/restock-route', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const driver = String(body.driver || 'Unassigned Driver').slice(0, 80);
    const maxStops = Math.max(1, Math.min(50, Number(body.max_stops) || 8));
    const prioritize = (body.prioritize === 'high-revenue') ? 'high-revenue' : 'low-stock';

    const machines = await loadMachineSnapshot();

    // Exclude offline machines from restock routes
    let candidates = machines.filter((m) => m.status !== 'offline');

    // Rank then select top N
    candidates.sort((a, b) => {
      if (prioritize === 'high-revenue') return b.revenue - a.revenue;
      return b.lowStockScore - a.lowStockScore; // higher score = more depleted
    });
    candidates = candidates.slice(0, maxStops);

    const start = resolveStart(body.start_location, machines);
    const ordered = nearestNeighborOrder(start, candidates);

    // Build ETA: assume 35 km/h average + 8 minutes service per stop
    const SPEED_KMH = 35;
    const SERVICE_MIN_PER_STOP = 8;
    const startTime = new Date();
    let cursorMin = 0;
    const route = ordered.map((m, idx) => {
      const travelMin = (m._legKm / SPEED_KMH) * 60;
      cursorMin += travelMin + SERVICE_MIN_PER_STOP;
      const etaDate = new Date(startTime.getTime() + cursorMin * 60000);
      const hh = String(etaDate.getHours()).padStart(2, '0');
      const mm = String(etaDate.getMinutes()).padStart(2, '0');
      return {
        stop: idx + 1,
        id: m.id,
        name: m.name,
        location: m.location,
        lat: m.lat,
        lng: m.lng,
        status: m.status,
        distance_km: m._legKm,
        eta: `${hh}:${mm}`,
        eta_minutes: Math.round(cursorMin),
        restock_items: m.restockItemsCount,
        revenue: m.revenue,
      };
    });

    res.json({
      route_id: `RT-${Date.now()}`,
      driver,
      prioritize,
      max_stops: maxStops,
      start_location: start,
      generated_at: startTime.toISOString(),
      total_stops: route.length,
      total_minutes: Math.round(cursorMin),
      total_distance_km: Math.round(
        route.reduce((a, r) => a + r.distance_km, 0) * 100
      ) / 100,
      route,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/custom-views/restock-slip
// Body: { machine_id, route_id?, driver? }
// Returns: application/pdf — a restock slip with machine#, location, items, qty, route#
// ----------------------------------------------------------------------------
router.post('/restock-slip', authenticateToken, async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(503).json({
        error: 'PDF generation unavailable — pdfkit is not installed on the server.',
      });
    }
    const body = req.body || {};
    const machineId = Number(body.machine_id);
    if (!Number.isFinite(machineId) || machineId <= 0) {
      return res.status(400).json({ error: 'machine_id is required' });
    }
    const routeId = String(body.route_id || `RT-${Date.now()}`);
    const driver = String(body.driver || 'Unassigned Driver').slice(0, 80);

    const machines = await loadMachineSnapshot();
    const machine = machines.find((m) => m.id === machineId);
    if (!machine) {
      return res.status(404).json({ error: `Machine ${machineId} not found` });
    }
    const items = synthesizeRestockItems(machine.id, machine.restockItemsCount);
    const totalQty = items.reduce((a, b) => a + b.qty, 0);

    const filename = `restock-slip-${machine.name || machine.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#111').text('Restock Slip', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#555')
      .text(`Generated: ${new Date().toISOString()}`)
      .text(`Route #: ${routeId}`)
      .text(`Driver: ${driver}`);

    doc.moveDown(1);
    doc.strokeColor('#888').lineWidth(0.5)
      .moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.6);

    // Machine block
    doc.fontSize(12).fillColor('#111').text('Machine', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor('#222')
      .text(`Machine #:  ${machine.name}  (id ${machine.id})`)
      .text(`Location:   ${machine.location}`)
      .text(`Status:     ${machine.status}`)
      .text(`Coords:     ${machine.lat.toFixed(4)}, ${machine.lng.toFixed(4)}`);

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor('#111').text('Restock Items', { underline: true });
    doc.moveDown(0.3);

    // Table header
    const xSku = 50, xName = 180, xQty = 480;
    const headerY = doc.y;
    doc.fontSize(10).fillColor('#000');
    doc.text('SKU', xSku, headerY);
    doc.text('Product', xName, headerY);
    doc.text('Qty', xQty, headerY, { width: 60, align: 'right' });
    doc.moveTo(50, headerY + 14).lineTo(560, headerY + 14).strokeColor('#aaa').stroke();
    doc.moveDown(0.6);

    items.forEach((it) => {
      const y = doc.y;
      doc.fontSize(10).fillColor('#111');
      doc.text(it.sku, xSku, y);
      doc.text(it.name, xName, y);
      doc.text(String(it.qty), xQty, y, { width: 60, align: 'right' });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#aaa').stroke();
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor('#111')
      .text(`Total units to load: ${totalQty}`, { align: 'right' });

    // Footer signature
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#444')
      .text('Driver signature: ____________________________', 50)
      .moveDown(0.4)
      .text('Time on site:     ____________________________', 50);

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      try { res.end(); } catch (e) { /* ignore */ }
    }
  }
});

module.exports = router;
