import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDeterministicPrediction } from './functions/analysis.ts';
import { LOTTERY_CONFIGS } from './constants.tsx';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
const db = new Database('lottery.db');
db.pragma('journal_mode = WAL');

// --- Database Setup ---
function setupDatabase() {
  // 1. Lottery Draws Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS lottery_draws (
      lottery_id TEXT NOT NULL,
      draw_number TEXT NOT NULL,
      open_time TEXT,
      numbers TEXT,
      special_number INTEGER,
      created_at INTEGER,
      PRIMARY KEY (lottery_id, draw_number)
    )
  `).run();

  // 2. Admin Predictions Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_predictions (
      lottery_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER
    )
  `).run();

  // 3. Prediction History Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS prediction_history (
      lottery_id TEXT NOT NULL,
      draw_number TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER,
      PRIMARY KEY (lottery_id, draw_number)
    )
  `).run();

  console.log('Database initialized successfully.');
}

setupDatabase();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Functions ---

// Sync Logic (adapted from webhook.ts)
async function syncLotteryData(lotteryId: string) {
  const lottery = LOTTERY_CONFIGS.find(l => l.id === lotteryId);
  if (!lottery) throw new Error(`Invalid lottery ID: ${lotteryId}`);

  // Map lottery ID to env var key (based on webhook.ts logic)
  let envKey = '';
  if (lotteryId === 'new_macau') envKey = 'API_URL_NEW_MACAU';
  else if (lotteryId === 'hk_jc') envKey = 'API_URL_HK_JC';
  else if (lotteryId === 'old_macau') envKey = 'API_URL_OLD_MACAU';

  const apiUrl = process.env[envKey];
  if (!apiUrl) {
      console.warn(`Missing API URL for ${lotteryId} (env: ${envKey})`);
      return 0; // Skip if not configured
  }

  console.log(`Syncing ${lotteryId} from ${apiUrl}...`);

  try {
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const rawData = await resp.json();
    let list: any[] = [];
    if (Array.isArray(rawData)) list = rawData;
    else if (rawData && typeof rawData === 'object') list = rawData.data || rawData.list || rawData.result?.data || rawData.rows || [];

    if (list.length === 0) {
        console.warn(`API returned empty list for ${lotteryId}`);
        return 0;
    }

    let count = 0;
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO lottery_draws (lottery_id, draw_number, open_time, numbers, special_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((draws) => {
      for (const draw of draws) stmt.run(draw.lotteryId, draw.drawNumber, draw.openTime, draw.numbers, draw.specialNumber, draw.createdAt);
    });

    const batch: any[] = [];
    const processedDraws = new Set<string>();

    for (const item of list) {
       const drawNumber = item.expect || item.issue || item.period || item.qishu || item.drawNumber || item.draw || item.number || item.id;
       const codeStr = item.opencode || item.code || item.openCode || item.numbers || item.haoMa || item.data || item.result;
       const openTime = item.opentime || item.time || item.openTime || item.dateline || new Date().toISOString();

       if (!drawNumber || !codeStr) continue;

       let nums: number[] = [];
       if (Array.isArray(codeStr)) {
         nums = codeStr.map(Number);
       } else if (typeof codeStr === 'string') {
         const cleanStr = codeStr.replace(/[+＋|｜]/g, ',').replace(/\s+/g, ',');
         nums = cleanStr.split(',').filter(s => s.trim() !== '').map(n => parseInt(n.trim()));
       }

       if (nums.length < 1) continue;

       const special = nums[nums.length - 1];
       const normalNums = nums.length >= 7 ? nums.slice(0, 6) : nums.slice(0, -1);
       const drawNumStr = String(drawNumber);

       if (processedDraws.has(drawNumStr)) continue;
       processedDraws.add(drawNumStr);

       batch.push({
           lotteryId: lottery.id,
           drawNumber: drawNumStr,
           openTime,
           numbers: JSON.stringify(normalNums),
           specialNumber: special,
           createdAt: Date.now()
       });
       count++;
    }

    if (batch.length > 0) {
      insertMany(batch);
    }
    console.log(`Synced ${count} records for ${lotteryId}`);
    return count;
  } catch (error) {
    console.error(`Sync failed for ${lotteryId}:`, error);
    throw error;
  }
}

// --- API Routes ---

// 1. Predict Endpoint
app.post('/api/predict', async (req, res) => {
  try {
    const { lotteryId } = req.body;
    if (!lotteryId) return res.status(400).json({ error: 'Missing lotteryId' });

    // Get History
    const historyRows = db.prepare(`
      SELECT * FROM lottery_draws
      WHERE lottery_id = ?
      ORDER BY draw_number DESC
      LIMIT 500
    `).all(lotteryId) as any[];

    const historyData = historyRows.map((row: any) => ({
      drawNumber: row.draw_number,
      date: row.open_time,
      numbers: JSON.parse(row.numbers),
      specialNumber: row.special_number,
      createdAt: row.created_at
    }));

    // Get Cached Prediction
    let prediction: any = null;
    let isStale = false;

    const predRow = db.prepare(`
      SELECT data, updated_at FROM admin_predictions WHERE lottery_id = ?
    `).get(lotteryId) as any;

    if (predRow && predRow.data) {
      prediction = JSON.parse(predRow.data);
      prediction.timestamp = predRow.updated_at;

      if (historyData.length > 0) {
        const lastDrawTime = historyData[0].createdAt || 0;
        if (prediction.timestamp < lastDrawTime) {
          isStale = true;
          prediction = null;
        }
      }
    }

    // Generate New Prediction if needed
    if ((!prediction || isStale) && historyData.length > 0) {
      const generated = generateDeterministicPrediction(historyData);
      const now = Date.now();
      prediction = {
        ...generated,
        timestamp: now
      };

      try {
        db.prepare(`
          INSERT OR REPLACE INTO admin_predictions (lottery_id, data, updated_at)
          VALUES (?, ?, ?)
        `).run(lotteryId, JSON.stringify(generated), now);
      } catch (e) {
        console.error("Failed to cache prediction", e);
      }
    }

    // Get Prediction History
    const predHistoryRows = db.prepare(`
      SELECT draw_number, data, created_at
      FROM prediction_history
      WHERE lottery_id = ?
      ORDER BY draw_number DESC
      LIMIT 30
    `).all(lotteryId) as any[];

    const predictionHistory: any[] = predHistoryRows.map((row: any) => ({
      drawNumber: row.draw_number,
      prediction: JSON.parse(row.data),
      timestamp: row.created_at
    }));

    // Backfill Prediction History (Real-time calculation for display)
    const BACKTEST_COUNT = 10;
    if (predictionHistory.length < BACKTEST_COUNT && historyData.length > BACKTEST_COUNT + 10) {
        const existingDraws = new Set(predictionHistory.map(p => p.drawNumber));

        for (let i = 0; i < BACKTEST_COUNT; i++) {
            const targetDraw = historyData[i];
            if (!targetDraw) continue;

            if (!existingDraws.has(targetDraw.drawNumber)) {
                const pastHistory = historyData.slice(i + 1);
                if (pastHistory.length > 10) {
                    const backtestPred = generateDeterministicPrediction(pastHistory, targetDraw.date);
                    predictionHistory.push({
                        drawNumber: targetDraw.drawNumber,
                        prediction: backtestPred,
                        timestamp: Date.now(),
                        isBacktest: true
                    });
                }
            }
        }
        predictionHistory.sort((a, b) => {
            return b.drawNumber.localeCompare(a.drawNumber, undefined, { numeric: true });
        });
    }

    res.json({
      history: historyData,
      prediction: prediction,
      predictionHistory: predictionHistory
    });

  } catch (error: any) {
    console.error("Prediction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Manual Sync Endpoint
app.post('/api/sync', async (req, res) => {
    try {
        const { lotteryId } = req.body;
        let results = [];

        if (lotteryId) {
            const count = await syncLotteryData(lotteryId);
            results.push({ lotteryId, count });
        } else {
            // Sync all
            for (const config of LOTTERY_CONFIGS) {
                try {
                    const count = await syncLotteryData(config.id);
                    results.push({ lotteryId: config.id, count });
                } catch (e: any) {
                    results.push({ lotteryId: config.id, error: e.message });
                }
            }
        }
        res.json({ success: true, results });
    } catch (error: any) {
        console.error("Sync Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const portNum = Number(PORT);
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${portNum}`);
  });
}

startServer();
