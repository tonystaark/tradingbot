export default () => ({
  port: parseInt(process.env.BOT_PORT ?? '3001', 10),
  tradingMode: (process.env.TRADING_MODE ?? 'paper') as 'paper' | 'live',
  alpaca: {
    keyId: process.env.ALPACA_API_KEY ?? '',
    secretKey: process.env.ALPACA_SECRET_KEY ?? '',
    paper: (process.env.TRADING_MODE ?? 'paper') === 'paper',
  },
  symbols: (process.env.SYMBOLS ?? 'AAPL,MSFT,GOOGL').split(',').map(s => s.trim()),
  strategy: {
    shortWindow: parseInt(process.env.MA_SHORT_WINDOW ?? '20', 10),
    longWindow: parseInt(process.env.MA_LONG_WINDOW ?? '50', 10),
    backtestDays: parseInt(process.env.BACKTEST_DAYS ?? '1500', 10),
  },
  risk: {
    riskPerTrade: parseFloat(process.env.RISK_PER_TRADE ?? '0.02'),
    maxPositions: parseInt(process.env.MAX_POSITIONS ?? '5', 10),
    dailyLossLimit: parseFloat(process.env.DAILY_LOSS_LIMIT ?? '0.05'),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
});
