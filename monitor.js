const events = require('events');
events.defaultMaxListeners = 20;
const puppeteer = require('puppeteer-core');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('fs/promises');
const gradient = require('gradient-string');
async function monitor(link) {
  try {
    const config = JSON.parse(await fs.readFile('./config.json', 'utf8')); 
    const pass = process.env['pass'] // replit password securely stored in process.env
    const user = process.env['user'] // replit username stored in env
    const port = await promisify(freeport)();
    const proxyServer = new ProxyChain.Server({ port });

    proxyServer.listen(() => console.log(`Proxy server listening on port ${port}`));

    const { stdout: chromiumPath } = await promisify(exec)("which chromium");

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: chromiumPath.trim(),
      ignoreHTTPSErrors: true,
      args: [
        '--ignore-certificate-errors',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        `--proxy-server=127.0.0.1:${port}`
      ]
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    async function login() {
      try {
        await page.goto('https://replit.com/login', { waitUntil: 'networkidle2' });

        await page.type('input[name="username"]', user, { delay: 100 });
        await page.type('input[name="password"]', pass, { delay: 400 });
        await page.click('[data-cy="log-in-btn"]');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      } catch (error) {
        console.error('Login failed, retrying...', error);
        await page.waitForTimeout(5000);
        await login();
      }
    }

    await login();

    await page.goto(link, { waitUntil: 'networkidle2' });

    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await browser.close();
      proxyServer.close(() => console.log('Proxy server closed'));
      process.exit();
    });

    process.on('SIGTERM', async () => {
      console.log('Terminating...');
      await browser.close();
      proxyServer.close(() => console.log('Proxy server closed'));
      process.exit();
    });

    setTimeout(async () => {
      console.log('Resetting script...');
      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
        monitor(config.monitor.link); 
      });
    }, 1200000);

  } catch (error) {
    console.error('Error:', error);
  }
}

(async () => {
  const config = JSON.parse(await fs.readFile('./config.json', 'utf8'));
  monitor(config.monitor.link);
})();
setTimeout(() => {
  const displayLoading = (callback) => {
      const gradientString = gradient(['cyan', 'lime']).multiline(callback);
      console.log(gradientString);
  };
  displayLoading("Welcome to the monitor script!\nMonitoring by: Choru\n24/7 server Replit")
}, 3000)
