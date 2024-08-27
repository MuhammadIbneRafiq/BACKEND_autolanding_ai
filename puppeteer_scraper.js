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


// // Initialize Pinecone client
// const pinecone = await PineconeClient({
//   apiKey: process.env.PINECONE_API_KEY,
//   environment: process.env.PINECONE_ENVIRONMENT,
// });

// // Initialize HuggingFace Embeddings
// const hf = new HfInference({ model: 'sentence-transformers/all-MiniLM-L6-v2' });

// // Function to load HTML file into Pinecone
// async function loadHTMLIntoPinecone(filePath) {
//   const htmlContent = await fs.promises.readFile(filePath, 'utf-8');
//   const documents = textSplitter.splitText(htmlContent);

//   const vectors = await Promise.all(documents.map(async (doc) => {
//     const embedding = await hf.embedText(doc);
//     return { id: doc.id, values: embedding, metadata: { text: doc } };
//   }));

//   await pinecone.indexes(process.env.PINECONE_INDEX_NAME).upsert(vectors);
//   console.log('HTML content loaded into Pinecone.');
// }

// // Function to retrieve information from Pinecone
// async function retrieveFromPinecone(query) {
//   const queryEmbedding = await embeddings.embedText(query);
//   const results = await pinecone.indexes(process.env.PINECONE_INDEX_NAME).query({
//     vector: queryEmbedding,
//     topK: 5,
//   });

//   const relevantDocs = results.matches.map((match) => match.metadata.text);
//   return relevantDocs;
// }

// // Function to fetch URL contents
// async function fetchUrlContent(context) {
//   const urls = context.map((doc) => doc.metadata.url);
//   const ids = urls.map((url) => url.split('=').pop());
//   const contents = await Promise.all(ids.map(async (id) => {
//     const content = await fetchWikipediaPage(id);
//     return content.slice(0, 32000);
//   }));
//   return contents;
// }

// // RAG prompt template
// const systemPrompt = `
// You are an AI assistant specializing in freelance recruitment and job posting analysis. Your task is to help users find relevant job postings, particularly for UI/UX designers, freelance projects, and opportunities with agencies or small companies. When providing information about job postings, focus on the following details:

// 1. Profile link of the person or company posting (if available)
// 2. Brief description of the job post
// 3. Link to the full job post
// 4. Name of the person or company posting (if available)
// 5. Payment amount or rate (if specified)

// Always prioritize active hiring posts and avoid confusing them with general hiring-related discussions. Provide concise, accurate information and be ready to answer follow-up questions about the job market, freelancing trends, and specific job opportunities.

// When asked to find job postings, aim to provide at least 3 relevant results at a time, formatted in a clear and easy-to-read manner. If the user asks for more results, provide the next set of 3 job postings that haven't been mentioned before.

// Remember to maintain context throughout the conversation and refer back to previously discussed information when relevant.
// `;

// async function generateResponse(query, docs, chatHistory) {
//   const messages = [
//     { role: 'system', content: systemPrompt },
//     { role: 'user', content: query },
//     ...chatHistory.map((message) => ({ role: message.role, content: message.content })),
//     { role: 'system', content: `Context:\n${docs.join('\n---\n')}` },
//   ];

//   const response = await groqClient.completions.create({
//     messages,
//   });

//   return response.choices[0].message.content;
// }

// // Function to handle user query
// async function handleQuery(query) {
//   const relevantDocs = await retrieveFromPinecone(query);
//   const result = await generateResponse(query, relevantDocs, []);
//   console.log('AI:', result);
// }

// export {
//   loadHTMLIntoPinecone,
//   handleQuery,
// };

// const filePath = './ui_ux_designer_expanded.html';
// await loadHTMLIntoPinecone(filePath);

// // Handle a user query
// const userQuery = 'Find UI/UX design freelance jobs';
// const res = await handleQuery(userQuery);
// console.log('this is res', res)
