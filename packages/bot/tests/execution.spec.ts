import { ExecutionService } from '../src/execution/execution.service';
import { SignalResult } from '../src/strategy/types';

function mockAlpaca() {
  return {
    getPositions: jest.fn().mockResolvedValue([]),
    placeOrder: jest.fn().mockResolvedValue('order-123'),
  } as any;
}

function mockRisk() {
  return {
    canOpenPosition: jest.fn().mockResolvedValue(true),
    computePositionSize: jest.fn().mockResolvedValue(10),
    computeStopLossPrice: jest.fn().mockReturnValue(95),
  } as any;
}

function mockAlert() {
  return { tradeExecuted: jest.fn().mockResolvedValue(undefined) } as any;
}

function mockLogger() {
  return { log: jest.fn(), error: jest.fn(), warn: jest.fn() } as any;
}

describe('ExecutionService', () => {
  let svc: ExecutionService;
  let alpaca: ReturnType<typeof mockAlpaca>;
  let risk: ReturnType<typeof mockRisk>;
  let alert: ReturnType<typeof mockAlert>;

  beforeEach(() => {
    alpaca = mockAlpaca();
    risk = mockRisk();
    alert = mockAlert();
    svc = new ExecutionService(alpaca, risk, alert, mockLogger());
  });

  it('places buy order on BUY signal with no existing position', async () => {
    const signal: SignalResult = { symbol: 'AAPL', signal: 'BUY', price: 150, timestamp: new Date().toISOString(), reason: 'golden cross' };
    await svc.executeSignal(signal);
    expect(alpaca.placeOrder).toHaveBeenCalled();
    const orderCall = alpaca.placeOrder.mock.calls[0][0];
    expect(orderCall.side).toBe('buy');
    expect(orderCall.symbol).toBe('AAPL');
  });

  it('does not place order on HOLD signal', async () => {
    const signal: SignalResult = { symbol: 'AAPL', signal: 'HOLD', price: 150, timestamp: new Date().toISOString(), reason: 'no crossover' };
    await svc.executeSignal(signal);
    expect(alpaca.placeOrder).not.toHaveBeenCalled();
  });

  it('places sell order when position exists on SELL signal', async () => {
    alpaca.getPositions.mockResolvedValue([{ symbol: 'AAPL', qty: 10, avgEntryPrice: 140, currentPrice: 150, unrealizedPnl: 100, unrealizedPnlPercent: 7, side: 'long' }]);
    const signal: SignalResult = { symbol: 'AAPL', signal: 'SELL', price: 150, timestamp: new Date().toISOString(), reason: 'death cross' };
    await svc.executeSignal(signal);
    const orderCall = alpaca.placeOrder.mock.calls[0][0];
    expect(orderCall.side).toBe('sell');
  });

  it('does not buy when risk check fails', async () => {
    risk.canOpenPosition.mockResolvedValue(false);
    const signal: SignalResult = { symbol: 'AAPL', signal: 'BUY', price: 150, timestamp: new Date().toISOString(), reason: 'golden cross' };
    await svc.executeSignal(signal);
    expect(alpaca.placeOrder).not.toHaveBeenCalled();
  });
});
