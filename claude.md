# Trading Bot Project

## Overview
Algorithmic trading bot supporting stock markets.

## Tech Stack
- Language: TypeScript (Node.js)
- Frontend: Nextjs
- Backend: Nestjs
- Package manager: pnpm workspaces (monorepo)
- SDK: alpaca-trade-api (pnpm package)
- Config: dotenv
- Testing: Jest


## Instructions for Claude Code
On first run in this project, read the task list below and create Claude Code tasks (via TaskCreate) for each unchecked item.

## After Making Code Changes
After every code change, Claude must:
1. Run `pnpm run build` and check for errors
   - If build fails: read the full error output, diagnose the root cause, fix the code, and re-run build — repeat until the build passes cleanly
2. Run `pnpm test` and check for failures
   - If tests fail: read the full test output, diagnose the failing assertion or error, fix the code, and re-run tests — repeat until all tests pass
3. Start the dev server if not already running: `pnpm run dev`
   - If the dev server fails to start or crashes: read the error output, diagnose and fix the code, then restart — repeat until the server starts and stays running
4. Open the monitoring portal in the browser to verify the UI loads correctly
5. Exercise the changed functionality manually (golden path + relevant edge cases)
6. Check the browser console and terminal output for errors or warnings
   - If runtime errors appear: fix them, rebuild, re-run tests, and restart the dev server before proceeding
7. Report what was tested and whether it passed before considering the task complete

Do not mark a task done based solely on build/test output — the portal must be opened and verified visually.
Do not give up on build, test, or runtime errors — keep fixing and restarting until everything works.

## Tasks

### Phase 1: Setup & Data
- [ ] Choose exchange/broker and MCP server (e.g. Alpaca, Binance)
- [ ] Connect MCP server and verify market data feed
- [ ] Set up project structure (src/, tests/, config/)
- [ ] Configure environment variables (API keys, secrets)
- [ ] Implement historical data fetcher for backtesting

### Phase 2: Strategy
- [ ] Define trading strategy (e.g. moving average crossover, RSI, ML-based)
- [ ] Implement signal generator
- [ ] Backtest strategy on historical data
- [ ] Evaluate backtest results (Sharpe ratio, drawdown, win rate)

### Phase 3: Execution
- [ ] Implement order manager (market, limit, stop-loss orders)
- [ ] Add position sizing / risk management rules
- [ ] Implement paper trading mode
- [ ] Add live trading mode with kill switch

### Phase 4: Monitoring
- [ ] Set up logging (trades, errors, PnL)
- [ ] Build simple dashboard or report (daily PnL, open positions)
- [ ] Add alerts (Telegram / email) for key events

## Commit
1. For every feature created, perform commits and open a MR for review