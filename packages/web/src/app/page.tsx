'use client';

import { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AccountInfo { equity: number; cash: number; buyingPower: number }
interface Position { symbol: string; qty: number; avgEntryPrice: number; currentPrice: number; unrealizedPnl: number; unrealizedPnlPercent: number; side: string }
interface Trade { id: string; symbol: string; side: string; qty: number; price: number; timestamp: string; pnl?: number }
interface Signal { symbol: string; signal: string; price: number; timestamp: string; reason: string }
interface BacktestResult { symbol: string; totalReturnPct: number; sharpeRatio: number; maxDrawdown: number; winRate: number; totalTrades: number; startDate: string; endDate: string }
interface BotStatus { connected: boolean; mode: string; killSwitch: boolean; lastSignals: Signal[] }
interface StrategyConfig { symbols: string[]; shortWindow: number; longWindow: number; backtestDays: number }

const BOT = '/bot';

export default function Dashboard() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [config, setConfig] = useState<StrategyConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<StrategyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'backtest' | 'settings'>('overview');

  const fetchAll = useCallback(async () => {
    try {
      const [st, acct, pos, tr, sig, cfg] = await Promise.all([
        fetch(`${BOT}/status`).then(r => r.json()),
        fetch(`${BOT}/account`).then(r => r.json()),
        fetch(`${BOT}/positions`).then(r => r.json()),
        fetch(`${BOT}/trades?limit=20`).then(r => r.json()),
        fetch(`${BOT}/signals`).then(r => r.json()),
        fetch(`${BOT}/config`).then(r => r.json()),
      ]);
      setStatus(st);
      setAccount(acct);
      setPositions(Array.isArray(pos) ? pos : []);
      setTrades(Array.isArray(tr) ? tr : []);
      setSignals(Array.isArray(sig) ? sig : []);
      setConfig(cfg);
      setDraftConfig(prev => prev ?? cfg);
      setError(null);
    } catch {
      setError('Cannot reach trading bot — ensure it is running on port 3001');
    } finally {
      setLoading(false);
    }
  }, []);

  const runBacktests = useCallback(async () => {
    setBacktestLoading(true);
    setBacktests([]);
    try {
      const results = await fetch(`${BOT}/backtest`).then(r => r.json());
      setBacktests(Array.isArray(results) ? results : []);
    } catch {}
    setBacktestLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'backtest') runBacktests();
  }, [activeTab]);

  const saveConfig = async () => {
    if (!draftConfig) return;
    setConfigSaving(true);
    try {
      const payload = {
        ...draftConfig,
        symbols: typeof draftConfig.symbols === 'string'
          ? (draftConfig.symbols as unknown as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : draftConfig.symbols,
      };
      const updated: StrategyConfig = await fetch(`${BOT}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json());
      setConfig(updated);
      setDraftConfig(updated);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
      await fetchAll();
    } catch {}
    setConfigSaving(false);
  };

  const applyAndBacktest = async () => {
    await saveConfig();
    setActiveTab('backtest');
  };

  const activateKillSwitch = async () => {
    if (!confirm('Activate kill switch? This will cancel all orders and close all positions.')) return;
    await fetch(`${BOT}/trading/kill`, { method: 'POST' });
    fetchAll();
  };

  const resumeTrading = async () => {
    await fetch(`${BOT}/trading/resume`, { method: 'POST' });
    fetchAll();
  };

  const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const pnlChartData = trades.slice().reverse().reduce<{ date: string; cumulative: number }[]>((acc, t, i) => {
    const prev = acc[i - 1]?.cumulative ?? 0;
    return [...acc, { date: new Date(t.timestamp).toLocaleDateString(), cumulative: prev + (t.pnl ?? 0) }];
  }, []);

  const symbolsDisplayValue = draftConfig
    ? (Array.isArray(draftConfig.symbols) ? draftConfig.symbols.join(', ') : draftConfig.symbols as unknown as string)
    : '';

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--muted)' }}>Connecting to trading bot...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>Trading Bot</h1>
          {status && (
            <>
              <span className={`status-badge ${status.connected ? 'connected' : 'stopped'}`}>
                <span className={`dot ${status.connected ? 'dot-green' : 'dot-red'}`} />
                {status.connected ? 'Connected' : 'Demo Mode'}
              </span>
              <span className={`status-badge ${status.mode}`}>{status.mode.toUpperCase()}</span>
              {status.killSwitch && <span className="status-badge stopped">KILL SWITCH ACTIVE</span>}
            </>
          )}
        </div>
        <div className="controls">
          <button className="btn-ghost" onClick={fetchAll}>Refresh</button>
          {status?.killSwitch
            ? <button className="btn-success" onClick={resumeTrading}>Resume Trading</button>
            : <button className="btn-danger" onClick={activateKillSwitch}>Kill Switch</button>
          }
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['overview', 'backtest', 'settings'] as const).map(tab => (
          <button key={tab} className={activeTab === tab ? 'btn-primary' : 'btn-ghost'} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-title">Portfolio Equity</div>
              <div className="metric">${account?.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}</div>
            </div>
            <div className="card">
              <div className="card-title">Cash Available</div>
              <div className="metric">${account?.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}</div>
            </div>
            <div className="card">
              <div className="card-title">Unrealized P&L</div>
              <div className={`metric ${totalUnrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </div>
              <div className="metric-sub">{positions.length} open position{positions.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="card">
              <div className="card-title">Buying Power</div>
              <div className="metric">${account?.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}</div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="section-title">Open Positions</div>
              {positions.length === 0 ? <p className="empty">No open positions</p> : (
                <table>
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Entry</th><th>Current</th><th>P&L</th></tr></thead>
                  <tbody>
                    {positions.map(p => (
                      <tr key={p.symbol}>
                        <td><strong>{p.symbol}</strong></td>
                        <td>{p.qty}</td>
                        <td>${p.avgEntryPrice.toFixed(2)}</td>
                        <td>${p.currentPrice.toFixed(2)}</td>
                        <td className={p.unrealizedPnl >= 0 ? 'positive' : 'negative'}>
                          {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
                          <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--muted)' }}>({p.unrealizedPnlPercent.toFixed(1)}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <div className="section-title">Latest Signals</div>
              {signals.length === 0 ? <p className="empty">No signals yet</p> : (
                <table>
                  <thead><tr><th>Symbol</th><th>Signal</th><th>Price</th><th>Reason</th></tr></thead>
                  <tbody>
                    {signals.map(s => (
                      <tr key={s.symbol}>
                        <td><strong>{s.symbol}</strong></td>
                        <td><span className={`badge badge-${s.signal.toLowerCase()}`}>{s.signal}</span></td>
                        <td>${s.price.toFixed(2)}</td>
                        <td style={{ color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {pnlChartData.length > 1 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-title">Cumulative P&L</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pnlChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cumulative P&L']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="cumulative" stroke="var(--blue)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <div className="section-title">Recent Trades</div>
            {trades.length === 0 ? <p className="empty">No trades yet</p> : (
              <table>
                <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>P&L</th><th>Time</th></tr></thead>
                <tbody>
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.symbol}</strong></td>
                      <td><span className={`badge badge-${t.side}`}>{t.side.toUpperCase()}</span></td>
                      <td>{t.qty}</td>
                      <td>${t.price.toFixed(2)}</td>
                      <td>{t.pnl !== undefined ? <span className={t.pnl >= 0 ? 'positive' : 'negative'}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</span> : '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{new Date(t.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── BACKTEST ─────────────────────────────────────────── */}
      {activeTab === 'backtest' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {config && `SMA${config.shortWindow}/${config.longWindow} · ${config.backtestDays} days · ${config.symbols.length} symbols`}
            </div>
            <button className="btn-primary" onClick={runBacktests} disabled={backtestLoading}>
              {backtestLoading ? 'Running…' : 'Re-run Backtest'}
            </button>
          </div>
          {backtestLoading ? (
            <div className="card"><p className="empty">Running backtests across {config?.symbols.length} symbols — this may take a moment…</p></div>
          ) : backtests.length === 0 ? (
            <div className="card"><p className="empty">No results yet</p></div>
          ) : (
            <div className="grid grid-3">
              {backtests.map(b => (
                <div className="card" key={b.symbol}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{b.symbol}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(b.startDate).getFullYear()} – {new Date(b.endDate).getFullYear()}
                    </span>
                  </div>
                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Return</div>
                      <div className={`metric ${b.totalReturnPct >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: 22 }}>
                        {b.totalReturnPct >= 0 ? '+' : ''}{b.totalReturnPct.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sharpe Ratio</div>
                      <div className={`metric ${b.sharpeRatio >= 1 ? 'positive' : b.sharpeRatio >= 0 ? 'neutral' : 'negative'}`} style={{ fontSize: 22 }}>
                        {b.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Max Drawdown</div>
                      <div className="metric negative" style={{ fontSize: 22 }}>-{b.maxDrawdown.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Win Rate</div>
                      <div className={`metric ${b.winRate >= 50 ? 'positive' : 'neutral'}`} style={{ fontSize: 22 }}>
                        {b.winRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>{b.totalTrades} trades</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SETTINGS ─────────────────────────────────────────── */}
      {activeTab === 'settings' && draftConfig && (
        <div style={{ maxWidth: 600 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 20 }}>Strategy Parameters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <label style={labelStyle}>Symbols (comma-separated)</label>
                <input
                  type="text"
                  value={symbolsDisplayValue}
                  onChange={e => setDraftConfig({ ...draftConfig, symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="AAPL, MSFT, GOOGL, ..."
                  style={inputStyle}
                />
                <div style={hintStyle}>
                  Currently tracking {Array.isArray(draftConfig.symbols) ? draftConfig.symbols.length : 0} symbol{draftConfig.symbols?.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 16 }}>
                <div>
                  <label style={labelStyle}>Short MA Window (days)</label>
                  <input
                    type="number" min={2} max={draftConfig.longWindow - 1}
                    value={draftConfig.shortWindow}
                    onChange={e => setDraftConfig({ ...draftConfig, shortWindow: parseInt(e.target.value) || draftConfig.shortWindow })}
                    style={inputStyle}
                  />
                  <div style={hintStyle}>Faster line — e.g. 20 = 20-day SMA</div>
                </div>
                <div>
                  <label style={labelStyle}>Long MA Window (days)</label>
                  <input
                    type="number" min={draftConfig.shortWindow + 1}
                    value={draftConfig.longWindow}
                    onChange={e => setDraftConfig({ ...draftConfig, longWindow: parseInt(e.target.value) || draftConfig.longWindow })}
                    style={inputStyle}
                  />
                  <div style={hintStyle}>Slower line — e.g. 50 = 50-day SMA</div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Backtest History (days)</label>
                <input
                  type="number" min={100} max={3000}
                  value={draftConfig.backtestDays}
                  onChange={e => setDraftConfig({ ...draftConfig, backtestDays: parseInt(e.target.value) || draftConfig.backtestDays })}
                  style={inputStyle}
                />
                <div style={hintStyle}>
                  {draftConfig.backtestDays} days ≈ {(draftConfig.backtestDays / 252).toFixed(1)} years of price history
                </div>
              </div>

              <div style={{ background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--blue)', lineHeight: 1.7 }}>
                <strong>Note on "SPDR":</strong> SPDR is a brand name, not a ticker symbol. Use a specific ETF ticker:<br />
                <strong>XLE</strong> (Energy) · <strong>XAR</strong> (Aerospace/Defense) · <strong>SPY</strong> (S&P 500) · <strong>XLF</strong> (Financials)
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={saveConfig} disabled={configSaving} style={{ flex: 1 }}>
                  {configSaving ? 'Saving…' : configSaved ? 'Saved!' : 'Save Changes'}
                </button>
                <button className="btn-success" onClick={applyAndBacktest} disabled={configSaving} style={{ flex: 1 }}>
                  Save &amp; Run Backtest
                </button>
                <button className="btn-ghost" onClick={() => setDraftConfig(config)}>Reset</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Active Config</div>
            <table>
              <tbody>
                {[
                  ['Symbols', config?.symbols.join(', ')],
                  ['Short MA', `SMA${config?.shortWindow}`],
                  ['Long MA', `SMA${config?.longWindow}`],
                  ['Backtest History', `${config?.backtestDays} days (~${((config?.backtestDays ?? 0) / 252).toFixed(1)} yrs)`],
                ].map(([label, value]) => (
                  <tr key={label as string}>
                    <td style={{ color: 'var(--muted)', width: 160 }}>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>Trading Bot v1.0 · MA Crossover Strategy · Auto-refreshes every 30s</span>
        <span>{config && `SMA${config.shortWindow}/${config.longWindow} · ${config.symbols.length} symbols`}</span>
      </footer>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13,
};

const hintStyle: React.CSSProperties = {
  marginTop: 6, fontSize: 11, color: 'var(--muted)',
};
