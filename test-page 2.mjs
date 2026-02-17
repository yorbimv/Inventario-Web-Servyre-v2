import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', err => errors.push(err.message));
    
    try {
        await page.goto('http://localhost:5175/', { timeout: 30000 });
        await page.waitForTimeout(3000);
        
        console.log('Page loaded successfully!');
        console.log('Title:', await page.title());
        
        if (errors.length > 0) {
            console.log('\nConsole errors:');
            errors.forEach(e => console.log(' -', e));
        } else {
            console.log('\nNo console errors!');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    await browser.close();
}

test();
