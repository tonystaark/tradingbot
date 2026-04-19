import { BacktestService } from '../src/backtest/backtest.service';
import { DataService } from '../src/data/data.service';
import { MaCrossoverStrategy } from '../src/strategy/ma-crossover.strategy';
import { Bar } from '../src/strategy/types';

function makeBar(close: number, dayOffset: number): Bar {
  const d = new Date('2023-01-01');
  d.setDate(d.getDate() + dayOffset);
  return { timestamp: d.toISOString(), open: close, high: close + 1, low: close - 1, close, volume: 1000000 };
}

function generateBars(count: number): Bar[] {
  const bars: Bar[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * 2;
    bars.push(makeBar(Math.max(1, price), i));
  }
  return bars;
}

function mockRuntimeConfig(symbols = ['AAPL'], short = 10, long = 20, backtestDays = 1500) {
  return { get: () => ({ symbols, shortWindow: short, longWindow: long, backtestDays }) } as any;
}

describe('BacktestService', () => {
  let svc: BacktestService;

  beforeEach(() => {
    const runtimeConfig = mockRuntimeConfig();
    const data = new DataService(null as any, null as any, null as any);
    data.fetchHistorical = async () => generateBars(300);
    const strategy = new MaCrossoverStrategy(runtimeConfig, data);
    const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() } as any;
    svc = new BacktestService(runtimeConfig, data, strategy, logger);
  });

  it('returns a valid backtest result', async () => {
    const result = await svc.run('AAPL', 100, 100000);
    expect(result.symbol).toBe('AAPL');
    expect(result.initialCapital).toBe(100000);
    expect(typeof result.sharpeRatio).toBe('number');
    expect(typeof result.maxDrawdown).toBe('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
    expect(result.totalTrades).toBe(result.winningTrades + result.losingTrades);
  });

  it('counts winning and losing trades correctly', async () => {
    const result = await svc.run('AAPL', 100, 100000);
    const counted = result.trades.filter(t => t.pnl !== undefined).length;
    expect(counted).toBe(result.totalTrades);
  });
});
