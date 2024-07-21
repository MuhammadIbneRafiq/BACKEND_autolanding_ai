import 'dotenv/config'
import puppeteer from 'puppeteer-core';

async function scraper() {
    try {
        // setup
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://${process.env.BRIGHT_DATA_AUTH}@brd.superproxy.io:22225`,
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const url = 'url = "https://x.com/search?q=hiring%20ui%2Fux%20designers&src=typed_query&f=top'

        await page.goto(url, {
            waitUntil: "networkidle0",
        });
        // await new Promise((resolve) => setTimeout(resolve, 1000));

        // trying out everything: puppeteer on a separate browser which takes ss and click on element, 
        // bypassing login creds, fetch API node fetch and making it re-usable 
        const html = await page.content();
        console.log(html);

        const response = html;

        //resp passed onto llm, or firecrawler or other to beautify this html and stuff
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

scraper();
