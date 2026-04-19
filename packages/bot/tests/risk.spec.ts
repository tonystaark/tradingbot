import { RiskService } from '../src/risk/risk.service';

function mockConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    'risk.riskPerTrade': 0.02,
    'risk.maxPositions': 5,
    'risk.dailyLossLimit': 0.05,
  };
  return { get: (key: string) => overrides[key] ?? defaults[key] } as any;
}

function mockAlpaca(equity = 100000) {
  return { getAccount: async () => ({ equity, cash: equity, buyingPower: equity }) } as any;
}

describe('RiskService', () => {
  let risk: RiskService;

  beforeEach(() => {
    risk = new RiskService(mockConfig(), mockAlpaca(100000), { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any);
  });

  it('computes position size based on equity and risk', async () => {
    const qty = await risk.computePositionSize(100, 0.02);
    // equity=100000, risk=0.02 => riskAmount=2000, stopLoss=100*0.02=2 => qty=1000
    expect(qty).toBe(1000);
  });

  it('returns at least 1 share', async () => {
    const qty = await risk.computePositionSize(1000000, 0.001);
    expect(qty).toBeGreaterThanOrEqual(1);
  });

  it('computes correct stop-loss price for buy', () => {
    const stop = risk.computeStopLossPrice(100, 'buy', 0.02);
    expect(stop).toBeCloseTo(98, 5);
  });

  it('computes correct stop-loss price for sell', () => {
    const stop = risk.computeStopLossPrice(100, 'sell', 0.02);
    expect(stop).toBeCloseTo(102, 5);
  });

  it('rejects position when max positions reached', async () => {
    risk = new RiskService(mockConfig({ 'risk.maxPositions': 2 }), mockAlpaca(), { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any);
    const canOpen = await risk.canOpenPosition(2);
    expect(canOpen).toBe(false);
  });

  it('allows position when under max positions', async () => {
    const canOpen = await risk.canOpenPosition(3);
    expect(canOpen).toBe(true);
  });
});
