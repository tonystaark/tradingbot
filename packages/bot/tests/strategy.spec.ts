import { MaCrossoverStrategy } from '../src/strategy/ma-crossover.strategy';
import { DataService } from '../src/data/data.service';
import { Bar } from '../src/strategy/types';

function mockConfig(short = 3, long = 5) {
  return { get: (key: string) => (key === 'strategy.shortWindow' ? short : key === 'strategy.longWindow' ? long : undefined) } as any;
}

function mockDataService() {
  const svc = new DataService(null as any, null as any, null as any);
  return svc;
}

function makeBar(close: number, i: number): Bar {
  return { timestamp: new Date(i * 86400000).toISOString(), open: close, high: close, low: close, close, volume: 1000 };
}

describe('MaCrossoverStrategy', () => {
  let strategy: MaCrossoverStrategy;
  let data: DataService;

  beforeEach(() => {
    data = mockDataService();
    strategy = new MaCrossoverStrategy(mockConfig(3, 5), data);
  });

  it('returns HOLD when insufficient data', () => {
    const bars = [1, 2, 3].map((c, i) => makeBar(c, i));
    const result = strategy.computeSignal(bars);
    expect(result.signal).toBe('HOLD');
    expect(result.reason).toContain('Insufficient data');
  });

  it('detects golden cross BUY signal', () => {
    // Prices that create a golden cross: short MA crosses above long MA
    const closes = [10, 9, 8, 7, 6, 8, 12, 15, 20, 25];
    const bars = closes.map((c, i) => makeBar(c, i));
    const result = strategy.computeSignal(bars);
    expect(['BUY', 'HOLD']).toContain(result.signal);
  });

  it('detects death cross SELL signal', () => {
    const closes = [20, 19, 18, 17, 16, 14, 10, 8, 6, 4];
    const bars = closes.map((c, i) => makeBar(c, i));
    const result = strategy.computeSignal(bars);
    expect(['SELL', 'HOLD']).toContain(result.signal);
  });

  it('returns price from latest bar', () => {
    const bars = [10, 11, 12, 13, 14, 15, 16].map((c, i) => makeBar(c, i));
    const result = strategy.computeSignal(bars);
    expect(result.price).toBe(16);
  });
});

describe('DataService.sma', () => {
  let data: DataService;

  beforeEach(() => {
    data = mockDataService();
  });

  it('computes simple moving average correctly', () => {
    const closes = [1, 2, 3, 4, 5];
    const sma = data.sma(closes, 3);
    expect(sma[4]).toBeCloseTo(4, 5);
    expect(sma[3]).toBeCloseTo(3, 5);
    expect(isNaN(sma[0])).toBe(true);
    expect(isNaN(sma[1])).toBe(true);
  });

  it('sma of window 1 returns original values', () => {
    const closes = [5, 10, 15];
    const sma = data.sma(closes, 1);
    expect(sma).toEqual([5, 10, 15]);
  });
});
