import { chromium, devices, firefox, webkit, type Browser, type BrowserContext, type BrowserContextOptions, type LaunchOptions } from '@playwright/test';

interface BrowserLaunchResult {
    browser: Browser;
    context: BrowserContext;
}

/** Creates Playwright browser and browser-context instances for browsers and emulated devices. */
class BrowserFactory {
    /**
     * Launches a browser and creates its browser context.
     *
     * @param browserName - Chrome, Edge, Firefox, Safari, or Chromium.
     * @param headless - String representation of whether the browser should run headless.
     * @param deviceName - Optional Playwright device to emulate.
     * @param options - Additional Playwright browser launch options.
     */
    async launchBrowser(browserName: string, headless = 'true', deviceName?: string, options: LaunchOptions = {}): Promise<BrowserLaunchResult> {
        const opts: LaunchOptions = {
            ...options,
            headless: headless.toLowerCase() === 'true',
        };

        if (!deviceName) {
            opts.args = [...(opts.args ?? []), '--window-size=1920,1080'];
        }

        const browser = await this.createBrowser(browserName, opts);
        const context = await this.createContext(browser, deviceName);

        return { browser, context };
    }

    /** Creates a browser using browser-specific launch options. */
    async createBrowser(browserName: string, browserOptions: LaunchOptions): Promise<Browser> {
        const opts = browserOptions;

        switch (browserName.toLowerCase()) {
            case 'chrome':
                opts.channel = 'chrome';
                return chromium.launch(opts);
            case 'firefox':
                opts.channel = 'firefox';
                return firefox.launch(opts);
            case 'edge':
                opts.channel = 'msedge';
                return chromium.launch(opts);
            case 'safari':
                opts.channel = 'webkit';
                return webkit.launch(opts);
            case 'chromium':
                return chromium.launch(opts);
            default:
                throw new Error(`${browserName} is not supported`);
        }
    }

    /**
     * Creates a browser context with optional device emulation.
     *
     * @param browser - Browser on which to create the context.
     * @param deviceName - Optional Playwright device name.
     * @param options - Additional browser-context options.
     */
    async createContext(browser: Browser, deviceName?: string | null, options: BrowserContextOptions = {}): Promise<BrowserContext> {
        let opts: BrowserContextOptions = { ...options };

        if (deviceName) {
            const device = devices[deviceName];
            if (!device) {
                throw new Error(`${deviceName} is not a valid device`);
            }
            opts = { ...opts, ...device };
        } else {
            opts.viewport = null;
        }

        return browser.newContext(opts);
    }
}

export const browserFactory = new BrowserFactory();
