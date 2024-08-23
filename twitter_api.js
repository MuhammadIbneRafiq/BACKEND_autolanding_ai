import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';

// check cached pages, to load less
// load less stuff like not videos and images, and put them in the gpt.
// async function scraper() {
//     let browser;
//     try {
//         browser = await puppeteer.connect({
//             browserWSEndpoint: `wss://brd-customer-hl_91449c0e-zone-scraping_browser1:ntzra84ak02s@brd.superproxy.io:9222`,
//         });

//         const page = await browser.newPage();
//         const url = 'https://www.linkedin.com/search/results/all/?keywords=hiring%20ui%2Fux%20designer&origin=TYPEAHEAD_HISTORY&searchId=78fd4d6f-cf15-47fe-ae2d-de24f73e544e&sid=2_.&spellCorrectionEnabled=true';
//         const li = process.env.li;

//         await page.setCookie({
//             name: 'li_at',
//             value: li,
//             domain: '.www.linkedin.com',
//             path: '/',
//             expires: 999999,
//             httpOnly: false,
//             secure: false
//         });

//         await page.setViewport({ width: 1920, height: 1080 });

//         // Navigate to LinkedIn login page
//         await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000000 }); // Set navigation timeout to 5000 seconds

//         // Take a screenshot of the cookied page
//         await page.screenshot({ path: 'final-screenshot.png' });

//         await browser.close();
//     } catch (error) {
//         console.log('Error occurred:', error);
//         if (browser) await browser.close();
//     }
// }

// scraper();

async function scraper1() {
    let browser;
    try {
        const url = 'https://www.linkedin.com/search/results/content/?keywords=hiring%20ui%2Fux%20designer&origin=CLUSTER_EXPANSION&searchId=3c89427b-7d9b-40a2-81a8-fa0cb4b890ae&sid=Bfh';
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

        // Navigate to LinkedIn page with a 60-second timeout
        await Promise.race([
            page.goto(url, { waitUntil: 'networkidle2' }),
            new Promise(resolve => setTimeout(resolve, 600000)) // 60 seconds timeout
        ]);

        // Scroll the page for the remaining time
        const startTime = Date.now();
        while (Date.now() - startTime < 600000) {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await page.waitForTimeout(1000); // Wait for 1 second between scrolls
        }

        // Take a screenshot of the final page state
        await page.screenshot({ path: 'final-screenshot.png' });

        // Get HTML content
        const html = await page.evaluate(() => document.body.innerHTML);

        await browser.close();
        fs.writeFileSync('ui_ux_designer_expanded.html', html, 'utf-8');

        // console.log('Scraping completed after 1 minute.');
        return html;
    } catch (error) {
        // console.log('Error occurred:', error);
        if (browser) await browser.close();
        return null;
    }
}

scraper1();