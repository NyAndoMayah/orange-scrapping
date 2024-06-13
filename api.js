import express from 'express';
import dayjs from 'dayjs';
import cors from 'cors';
import getDailyReports from './getDailyReports.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/transactions', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const formattedDate = dayjs(date).format('YYYYMMDD');

    console.log(`Fetching transactions for date: ${formattedDate}`);

    const response = await getDailyReports(formattedDate);
    
    res.json({
      transactionDate: date,
      timestamp: new Date().toISOString(),
      transactions: response,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
