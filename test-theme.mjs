import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
        console.log('Console:', msg.type(), msg.text());
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', err => {
        console.log('Page error:', err.message);
        errors.push(err.message);
    });
    
    try {
        await page.goto('http://localhost:5175/', { timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Check initial theme
        const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        console.log('Initial theme:', initialTheme);
        
        // Find and click theme toggle
        const themeBtn = await page.$('#themeToggle');
        console.log('Theme button found:', !!themeBtn);
        
        if (themeBtn) {
            await themeBtn.click();
            await page.waitForTimeout(500);
            
            const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            console.log('After click theme:', newTheme);
        } else {
            console.log('Button not found!');
        }
        
        // Check button HTML
        const btnHtml = await page.$eval('#themeToggle', el => el.outerHTML);
        console.log('Button HTML:', btnHtml);
        
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    await browser.close();
}

test();
