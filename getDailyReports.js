import dotenv from 'dotenv';
import xlsx from 'xlsx';
import fetch from 'node-fetch';
import { launch } from 'puppeteer';

dotenv.config();


async function login(page) {
  await page.goto('https://madagascar.orange-money.com/grweb/');

  if (!process.env.hasOwnProperty('ORANGE_USERNAME') || !process.env.hasOwnProperty('ORANGE_USER_PASSWORD')) {
    throw new Error('Error: ORANGE_USERNAME or ORANGE_USER_PASSWORD environment variables are not defined.');
  }

  await page.type('input[name="username"]', process.env.ORANGE_USERNAME);
  await page.type('input[name="password"]', process.env.ORANGE_USER_PASSWORD);

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);

  console.log('Logged in successfully.');
}

async function visitDailyReportsPage(page) {
  console.log('Checking for the "Daily/" link');
  await page.waitForSelector('a[href="./_Daily/"]');
  console.log('"Daily/" link found');
  await page.click('a[href="./_Daily/"]');
}

async function convertToJson(response) {
  const buffer = await response.arrayBuffer();

  const workbook = xlsx.read(buffer, { type: 'array' });
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  return jsonData;
}

async function downloadDailyReports(selectorDate) {
  const downloadSelector = `a[href="./Daily-ChannelUserTransactionReport-0328965189-${selectorDate}.xls"]`;

  const browser = await launch({
    headless: false
  });
  const page = await browser.newPage();

  await login(page);
  await visitDailyReportsPage(page);

  const cookies = await page.cookies();
  const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');


  console.log('Waiting for the download link');
  await page.waitForSelector(downloadSelector, { timeout: 60000 });

  const downloadLink = await page.$eval(downloadSelector, link => link.href);
  await browser.close();

  console.log('Fetching the file from the download link', downloadLink);

  const response = await fetch(downloadLink, {
    headers: {
      'Cookie': cookieString
    }
  });

  console.log('File downloaded successfully');

  return response;
}

async function getDailyReports(selectorDate) {
  try {
    const response = await downloadDailyReports(selectorDate);
    const jsonData = await convertToJson(response);

    const transactionData = [];


  // let i = 18 because the valid transaction must start there
    for (let i = 18; i < jsonData.length; i++) {
      const row = jsonData[i];

      const requiredAttributes = ['__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4', '__EMPTY_6', '__EMPTY_11', '__EMPTY_14'];

      if (requiredAttributes.every(attr => attr in row)) {
        const transaction = {
          number: row.__EMPTY,
          date: row.__EMPTY_1,
          time: row.__EMPTY_2,
          ref: row.__EMPTY_3,
          status: row.__EMPTY_6,
          client_number: row.__EMPTY_11,
          amount: parseFloat(row.__EMPTY_14)
        };
        transactionData.push(transaction);
      }
    }

    return transactionData;
  } catch (error) {
    console.error('Error:', error);
  }
}


export default getDailyReports;
