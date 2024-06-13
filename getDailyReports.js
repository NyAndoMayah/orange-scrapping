import dotenv from 'dotenv';
import xlsx from 'xlsx';
import fetch from 'node-fetch';
import {launch} from 'puppeteer';

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

async function checkDailyReports(page) {
  console.log('Checking for the "Daily/" link');
  await page.waitForSelector('a[href="./_Daily/"]');
  console.log('"Daily/" link found');
  await page.click('a[href="./_Daily/"]');
}

async function downloadDailyReports(selectorDate) {
  const downloadSelector = `a[href="./Daily-ChannelUserTransactionReport-0328965189-${selectorDate}.xls"]`;

  // Use Puppeteer to get the download link
  const browser = await launch({
    headless: false
  });
  const page = await browser.newPage();
  
  await login(page);
  await checkDailyReports(page);

  const cookies = await page.cookies();
  const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');


  console.log('Waiting for the download link');
  await page.waitForSelector(downloadSelector, { timeout: 60000 });

  const downloadLink = await page.$eval(downloadSelector, link => link.href);
  await browser.close();

  console.log('Fetching the file from the download link', downloadLink);

  const response = await fetch(downloadLink, {headers: {
    'Cookie' : cookieString
  }});

  const buffer = await response.arrayBuffer();
  
  const workbook = xlsx.read(buffer, { type: 'array' });
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  return jsonData;
}

async function getDailyReports(selectorDate) {
  try {
    const jsonData = await downloadDailyReports(selectorDate);
    console.log('XLS file converted to JSON successfully.');
    return jsonData;
  } catch (error) {
    console.error('Error:', error);
  }
}

export default getDailyReports;
