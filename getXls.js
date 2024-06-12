import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function downloadDailyReports(page) {
  const downloadPath = path.resolve(__dirname, 'downloads');

  console.log('Waiting for the download link');
  const downloadSelector = 'a[href^="./Daily-ChannelUserTransactionReport-"][href$=".xls"]';
  await page.waitForSelector(downloadSelector, { timeout: 60000 });

  const downloadLink = await page.$(downloadSelector);

  if (downloadLink) {
    await downloadLink.click();
    console.log('Clicked on the download link');

    let fileDownloaded = false;
    while (!fileDownloaded) {
      const files = fs.readdirSync(downloadPath);
      if (files.some(file => file.endsWith('.xls'))) {
        fileDownloaded = true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('The file has been downloaded successfully.');
  } else {
    console.log('The download link was not found.');
  }
}

async function convertXlsToJson() {
  const downloadPath = path.resolve(__dirname, 'downloads');

  let xlsFile;
  while (!xlsFile || !xlsFile.endsWith('.xls')) {
    const files = fs.readdirSync(downloadPath);
    xlsFile = files.find(file => file.endsWith('.xls'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const xlsFilePath = path.join(downloadPath, xlsFile);
  const workbook = xlsx.readFile(xlsFilePath);
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  const jsonFilePath = path.join(downloadPath, 'data.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

  console.log('XLS file converted to JSON successfully.');
}

async function getXls() {
  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  try {
    await login(page);
    await checkDailyReports(page);
    await downloadDailyReports(page);
    await convertXlsToJson();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

export { getXls };