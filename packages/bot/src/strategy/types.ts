export interface Bar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface SignalResult {
  symbol: string;
  signal: Signal;
  price: number;
  timestamp: string;
  reason: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  timestamp: string;
  pnl?: number;
}

export interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  side: 'long' | 'short';
}

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
}

export interface BacktestResult {
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  pnl?: number;
  pnlPct?: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
  cumulative: number;
}
