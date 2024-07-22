
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import axios from 'axios';
import ExcelJS from 'exceljs';


// check cached pages, to load less
// load less stuff like not videos and images, and put them in the gpt.
async function scraper() {
    let browser;
    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://brd-customer-hl_91449c0e-zone-scraping_browser1:ntzra84ak02s@brd.superproxy.io:9222`,
        });

        const page = await browser.newPage();
        const url = 'https://www.linkedin.com/search/results/all/?keywords=hiring%20ui%2Fux%20designer&origin=TYPEAHEAD_HISTORY&searchId=78fd4d6f-cf15-47fe-ae2d-de24f73e544e&sid=2_.&spellCorrectionEnabled=true';
        const li = process.env.li;

        // console.log(li)
        await page.setCookie({
            name: 'li_at',
            value: li,
            domain: '.www.linkedin.com',
            path: '/',
            expires: 999999,
            httpOnly: false,
            secure: false
        })

        // const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to LinkedIn login page
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Take a screenshot of the cookied page
        await page.screenshot({ path: 'final-screenshot.png' });

        await browser.close();
    } catch (error) {
        console.log('Error occurred:', error);
        if (browser) await browser.close();
    }
}

// scraper();

// Scraper function to retrieve HTML content
async function scraper1() {
    let browser;
    try {
        const url = 'https://www.linkedin.com/search/results/all/?keywords=hiring%20ui%2Fux%20designer&origin=TYPEAHEAD_HISTORY&searchId=78fd4d6f-cf15-47fe-ae2d-de24f73e544e&sid=2_.&spellCorrectionEnabled=true';

        browser = await puppeteer.launch({ headless: false });

        const page = await browser.newPage();
        const li = process.env.li;

        // Convert the expires date to a Unix timestamp
        const expiresTimestamp = new Date('2025-01-12T14:23:30.605Z').getTime() / 1000;

        await page.setCookie({
            name: 'li_at',
            value: li,
            domain: '.linkedin.com',
            path: '/',
            expires: expiresTimestamp,
            httpOnly: true,
            secure: true
        });

        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to LinkedIn login page
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Take a screenshot of the cookied page
        await page.screenshot({ path: 'final-screenshot.png' });

        // Get HTML content
        const html = await page.evaluate(() => document.body.innerHTML);

        await browser.close();
        fs.writeFileSync('input.html', html, 'utf-8');

        return html;
    } catch (error) {
        console.log('Error occurred:', error);
        if (browser) await browser.close();
        return null;
    }
}

scraper1();