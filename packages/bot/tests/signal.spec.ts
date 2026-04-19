import { SignalService } from '../src/signal/signal.service';
import { MaCrossoverStrategy } from '../src/strategy/ma-crossover.strategy';
import { DataService } from '../src/data/data.service';
import { Bar } from '../src/strategy/types';

function makeBar(close: number, i: number): Bar {
  return { timestamp: new Date(Date.now() + i * 86400000).toISOString(), open: close, high: close, low: close, close, volume: 1000 };
}

function mockRuntimeConfig(symbols = ['AAPL'], short = 3, long = 5) {
  return { get: () => ({ symbols, shortWindow: short, longWindow: long, backtestDays: 1500 }) } as any;
}

describe('SignalService', () => {
  let svc: SignalService;

  beforeEach(() => {
    const runtimeConfig = mockRuntimeConfig();
    const data = new DataService(null as any, null as any, null as any);
    data.fetchForSymbols = async () => {
      const bars = [10, 11, 12, 13, 14, 15, 16].map((c, i) => makeBar(c, i));
      return new Map([['AAPL', bars]]);
    };
    const strategy = new MaCrossoverStrategy(runtimeConfig, data);
    const logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() } as any;
    svc = new SignalService(runtimeConfig, data, strategy, logger);
  });

  it('generates signals for configured symbols', async () => {
    const signals = await svc.generateSignals();
    expect(signals.length).toBe(1);
    expect(signals[0].symbol).toBe('AAPL');
    expect(['BUY', 'SELL', 'HOLD']).toContain(signals[0].signal);
  });

  it('signal includes a reason', async () => {
    const signals = await svc.generateSignals();
    expect(typeof signals[0].reason).toBe('string');
    expect(signals[0].reason.length).toBeGreaterThan(0);
  });
});
