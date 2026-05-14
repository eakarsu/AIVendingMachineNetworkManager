import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

// Local-only matcher: pair telemetry sales with cashless settlement events by machine + minute window.
function matchTransactions(sales, settlements, windowMinutes = 5) {
  const used = new Set();
  return sales.map(sale => {
    const t0 = new Date(sale.sold_at).getTime();
    const candidate = settlements.find((s, idx) => {
      if (used.has(idx)) return false;
      if (String(s.machine_id) !== String(sale.machine_id)) return false;
      const dt = Math.abs(new Date(s.timestamp).getTime() - t0);
      return dt <= windowMinutes * 60 * 1000 && Math.abs((+s.amount) - (+sale.amount)) < 0.5;
    });
    if (candidate) {
      used.add(settlements.indexOf(candidate));
      return { sale, settlement: candidate, status: 'matched' };
    }
    return { sale, settlement: null, status: 'unmatched_sale' };
  }).concat(
    settlements.filter((_, idx) => !used.has(idx)).map(s => ({ sale: null, settlement: s, status: 'unmatched_payment' }))
  );
}

const seedSettlements = JSON.stringify([
  { machine_id: 1, amount: 2.50, timestamp: new Date(Date.now() - 60000).toISOString(), provider: 'Nayax', txn_id: 'NX-1001' },
  { machine_id: 2, amount: 3.25, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), provider: 'USAT', txn_id: 'US-2002' },
], null, 2);

export default function CashlessRecon() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlementsJson, setSettlementsJson] = useState(seedSettlements);
  const [matches, setMatches] = useState([]);
  const [parseErr, setParseErr] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    api.getAll('sales').then(data => {
      const list = Array.isArray(data) ? data : (data.data || []);
      setSales(list.slice(0, 50));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const reconcile = () => {
    setParseErr(null);
    try {
      const settlements = JSON.parse(settlementsJson);
      setMatches(matchTransactions(sales, settlements));
    } catch (e) {
      setParseErr(e.message);
    }
  };

  const stats = useMemo(() => ({
    matched: matches.filter(m => m.status === 'matched').length,
    unmatchedSales: matches.filter(m => m.status === 'unmatched_sale').length,
    unmatchedPayments: matches.filter(m => m.status === 'unmatched_payment').length,
  }), [matches]);

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null); setAiResult(null);
    try { setAiResult(await api.cashlessReconcile({ matches, totals: stats })); }
    catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cashless Payment Reconciliation</h1>
          <p className="text-gray-500 text-sm mt-1">Match Nayax / USAT settlement events to vended sales · AI flags chargeback / skim patterns</p>
        </div>
        <button onClick={runAI} disabled={!matches.length}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          🤖 AI Risk Scan
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="text-xs text-emerald-300 uppercase">Matched</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{stats.matched}</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="text-xs text-yellow-300 uppercase">Unmatched Sales</div>
          <div className="text-3xl font-bold text-yellow-400 mt-1">{stats.unmatchedSales}</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="text-xs text-red-300 uppercase">Unmatched Payments</div>
          <div className="text-3xl font-bold text-red-400 mt-1">{stats.unmatchedPayments}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Recent Sales (Telemetry)</h3>
          {loading ? <div className="text-gray-500">Loading…</div> : (
            <div className="text-xs text-gray-400 max-h-64 overflow-y-auto">
              {sales.slice(0, 10).map(s => (
                <div key={s.id} className="flex justify-between py-1 border-b border-gray-700/30">
                  <span>M{s.machine_id} · {s.product_name || 'P' + s.product_id}</span>
                  <span className="text-emerald-400 font-mono">${(+s.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Cashless Settlements (paste from gateway)</h3>
          <textarea rows={8} value={settlementsJson} onChange={e => setSettlementsJson(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white font-mono text-xs" />
          <button onClick={reconcile}
            className="mt-3 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
            Reconcile
          </button>
          {parseErr && <div className="mt-2 text-xs text-red-400">{parseErr}</div>}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h3 className="text-white font-semibold">Reconciliation Result</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-dark-900/50">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Sale Amount</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3">Provider</th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, 50).map((m, i) => (
                <tr key={i} className="border-t border-gray-700/30">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      m.status === 'matched' ? 'bg-emerald-500/20 text-emerald-400' :
                      m.status === 'unmatched_sale' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{m.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-white">M{m.sale?.machine_id || m.settlement?.machine_id}</td>
                  <td className="px-4 py-3 text-emerald-400 font-mono">{m.sale ? `$${(+m.sale.amount).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-blue-400 font-mono">{m.settlement ? `$${(+m.settlement.amount).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{m.settlement?.provider || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAI && <AIOutput data={aiResult} loading={aiLoading} error={aiError} title="Cashless Risk Patterns" />}
    </div>
  );
}
