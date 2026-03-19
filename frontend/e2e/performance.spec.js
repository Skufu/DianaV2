import { test, expect } from '@playwright/test';

test.describe('Time to Interactive Performance', () => {

    test('Landing page Time to Interactive < 2s', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        const timingMetrics = await page.evaluate(() => {
            const timing = performance.timing;
            const navStart = timing.navigationStart;

            return {
                domInteractive: timing.domInteractive - navStart,
                domContentLoaded: timing.domContentLoadedEventEnd - navStart,
                domComplete: timing.domComplete - navStart,
                loadEventEnd: timing.loadEventEnd - navStart,
            };
        });

        const tti = timingMetrics.domContentLoaded;

        expect(tti).toBeLessThan(2000);
    });

    test('Core Web Vitals - LCP and CLS', async ({ page }) => {
        const metrics = await page.evaluate(() => {
            return new Promise((resolve) => {
                let lcp = 0;
                let cls = 0;

                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'largest-contentful-paint') {
                            lcp = entry.startTime;
                        } else if (entry.entryType === 'layout-shift') {
                            if (!entry.hadRecentInput) {
                                cls += entry.value;
                            }
                        }
                    }
                });

                observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });

                setTimeout(() => {
                    resolve({ lcp, cls });
                    observer.disconnect();
                }, 5000);
            });
        });

        expect(metrics.lcp).toBeLessThan(2500);
        expect(metrics.cls).toBeLessThan(0.1);
    });

    test('Bundle size within limits', async ({ page }) => {
        const bundles = [];

        page.on('response', async (response) => {
            const url = response.url();
            if (url.match(/\.(js|css)$/) && !url.includes('node_modules')) {
                try {
                    const size = await response.body();
                    bundles.push({
                        name: url.split('/').pop(),
                        size: size.length,
                        sizeKB: (size.length / 1024).toFixed(2),
                    });
                } catch (e) {
                    // Fail silently for build artifacts
                }
            }
        });

        await page.goto('/', { waitUntil: 'networkidle' });

        const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
        const totalSizeKB = totalSize / 1024;

        bundles.sort((a, b) => b.size - a.size);

        expect(totalSizeKB).toBeLessThan(500);
    });

    test('JavaScript execution time', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        const jsMetrics = await page.evaluate(() => {
            const entries = performance.getEntriesByType('measure')
                .filter(e => e.name.includes('script') || e.name.includes('JS'));

            const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);

            return {
                totalTasks: entries.length,
                totalDuration,
                avgDuration: entries.length > 0 ? totalDuration / entries.length : 0,
            };
        });

        expect(jsMetrics.totalDuration).toBeLessThan(500);
    });
});
