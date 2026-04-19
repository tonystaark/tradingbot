'use client';

import { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AccountInfo { equity: number; cash: number; buyingPower: number }
interface Position { symbol: string; qty: number; avgEntryPrice: number; currentPrice: number; unrealizedPnl: number; unrealizedPnlPercent: number; side: string }
interface Trade { id: string; symbol: string; side: string; qty: number; price: number; timestamp: string; pnl?: number }
interface Signal { symbol: string; signal: string; price: number; timestamp: string; reason: string }
interface BacktestResult { symbol: string; totalReturnPct: number; sharpeRatio: number; maxDrawdown: number; winRate: number; totalTrades: number }
interface BotStatus { connected: boolean; mode: string; killSwitch: boolean; lastSignals: Signal[] }

const BOT = '/bot';

export default function Dashboard() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'backtest'>('overview');

  const fetchAll = useCallback(async () => {
    try {
      const [st, acct, pos, tr, sig] = await Promise.all([
        fetch(`${BOT}/status`).then(r => r.json()),
        fetch(`${BOT}/account`).then(r => r.json()),
        fetch(`${BOT}/positions`).then(r => r.json()),
        fetch(`${BOT}/trades?limit=20`).then(r => r.json()),
        fetch(`${BOT}/signals`).then(r => r.json()),
      ]);
      setStatus(st);
      setAccount(acct);
      setPositions(Array.isArray(pos) ? pos : []);
      setTrades(Array.isArray(tr) ? tr : []);
      setSignals(Array.isArray(sig) ? sig : []);
      setError(null);
    } catch (e) {
      setError('Cannot reach trading bot — ensure it is running on port 3001');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBacktests = useCallback(async () => {
    try {
      const results = await fetch(`${BOT}/backtest`).then(r => r.json());
      setBacktests(Array.isArray(results) ? results : []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'backtest' && backtests.length === 0) fetchBacktests();
  }, [activeTab, backtests.length, fetchBacktests]);

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

  const pnlChartData = trades
    .slice()
    .reverse()
    .reduce<{ date: string; cumulative: number }[]>((acc, t, i) => {
      const prev = acc[i - 1]?.cumulative ?? 0;
      return [...acc, { date: new Date(t.timestamp).toLocaleDateString(), cumulative: prev + (t.pnl ?? 0) }];
    }, []);

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
              <span className={`status-badge ${status.mode}`}>
                {status.mode.toUpperCase()}
              </span>
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
        <button className={activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'backtest' ? 'btn-primary' : 'btn-ghost'} onClick={() => setActiveTab('backtest')}>Backtest</button>
      </div>

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
              {positions.length === 0 ? (
                <p className="empty">No open positions</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Qty</th>
                      <th>Avg Entry</th>
                      <th>Current</th>
                      <th>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(p => (
                      <tr key={p.symbol}>
                        <td><strong>{p.symbol}</strong></td>
                        <td>{p.qty}</td>
                        <td>${p.avgEntryPrice.toFixed(2)}</td>
                        <td>${p.currentPrice.toFixed(2)}</td>
                        <td className={p.unrealizedPnl >= 0 ? 'positive' : 'negative'}>
                          {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
                          <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--muted)' }}>
                            ({p.unrealizedPnlPercent.toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <div className="section-title">Latest Signals</div>
              {signals.length === 0 ? (
                <p className="empty">No signals yet</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Signal</th>
                      <th>Price</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
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
            {trades.length === 0 ? (
              <p className="empty">No trades yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>P&L</th>
                    <th>Time</th>
                  </tr>
                </thead>
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

      {activeTab === 'backtest' && (
        <div>
          {backtests.length === 0 ? (
            <div className="card">
              <p className="empty">Running backtests... (this may take a moment)</p>
            </div>
          ) : (
            <>
              <div className="grid grid-3" style={{ marginBottom: 20 }}>
                {backtests.map(b => (
                  <div className="card" key={b.symbol}>
                    <div className="card-title">{b.symbol}</div>
                    <div className="grid grid-2" style={{ gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Return</div>
                        <div className={`metric ${b.totalReturnPct >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: 20 }}>
                          {b.totalReturnPct >= 0 ? '+' : ''}{b.totalReturnPct.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sharpe Ratio</div>
                        <div className="metric" style={{ fontSize: 20 }}>{b.sharpeRatio.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Max Drawdown</div>
                        <div className="metric negative" style={{ fontSize: 20 }}>-{b.maxDrawdown.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Win Rate</div>
                        <div className="metric neutral" style={{ fontSize: 20 }}>{b.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>
                      {b.totalTrades} trades
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <footer style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>Trading Bot v1.0 — MA Crossover Strategy (50/200 SMA)</span>
        <span>Auto-refreshes every 30s</span>
      </footer>
    </div>
  );
}
