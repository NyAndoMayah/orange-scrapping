import express from 'express';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import {fileURLToPath} from 'url';
import { getXls } from './getXls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/transactions', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const formattedDate = dayjs(date).format('YYYYMMDD');

    console.log(`Fetching transactions for date: ${formattedDate}`);

    await getXls(formattedDate);

    const downloadPath = path.resolve(__dirname, 'downloads');
    const jsonFilePath = path.join(downloadPath, 'data.json');
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');

    const currentDate = new Date();
    res.json({
      timestamp: currentDate.toISOString(),
      transactions: JSON.parse(jsonData),
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
