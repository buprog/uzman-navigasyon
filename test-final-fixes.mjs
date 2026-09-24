import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const mockTour = {
    id: 'test-tour-id',
    baslik: 'Kapadokya Turu',
    mevcutTahsilat: 15000,
    hedefTahsilat: 30000,
    durakSayisi: 3,
    gunler: [
      {
        gun: 1,
        duraklar: [
          { id: '1', sira: 1, ad: 'Nevşehir', enlem: 38.6244, boylam: 34.7239 },
          { id: '2', sira: 2, ad: 'Göreme', enlem: 38.6431, boylam: 34.8281 }
        ]
      }
    ]
  };

  const testSizes = [
    { name: '390x844', width: 390, height: 844 },
    { name: '360x740', width: 360, height: 740 },
    { name: '1280x800', width: 1280, height: 800 }
  ];

  const results = [];

  for (const size of testSizes) {
    console.log(`\n=== ${size.name} ===`);
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    
    await page.route('**/api/tours/test-tour-id', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTour) });
    });

    try {
      await page.goto('http://localhost:3000/planlayici/test-tour-id', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);

      const hasErrors = await page.evaluate(() => {
        const logs = window.__reactErrors || [];
        return logs.length > 0 ? logs : null;
      });

      if (hasErrors) {
        console.log(`❌ React errors: ${JSON.stringify(hasErrors)}`);
        results.push({ size: size.name, status: 'FAIL', reason: 'React errors' });
        await page.close();
        continue;
      }

      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const innerHeight = await page.evaluate(() => window.innerHeight);
      console.log(`scrollHeight: ${scrollHeight}, innerHeight: ${innerHeight}`);
      
      if (scrollHeight !== innerHeight) {
        console.log(`❌ Page scrolls (${scrollHeight - innerHeight}px extra)`);
        results.push({ size: size.name, status: 'FAIL', reason: `${scrollHeight - innerHeight}px scroll` });
        await page.close();
        continue;
      }

      if (size.width < 1024) {
        const attributionVisible = await page.locator('.maplibregl-ctrl-bottom-left').isVisible();
        console.log(`Attribution visible (collapsed): ${attributionVisible}`);

        const sheetHandle = page.locator('[data-testid="sheet-handle"]').first();
        if (await sheetHandle.isVisible()) {
          const box = await sheetHandle.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, 100, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(400);
          console.log('Sheet dragged to expanded');

          const attrExpandedVisible = await page.locator('.maplibregl-ctrl-bottom-left').isVisible();
          console.log(`Attribution visible at expanded: ${attrExpandedVisible}`);
          
          if (attrExpandedVisible) {
            console.log('❌ Attribution should be hidden at expanded');
            results.push({ size: size.name, status: 'FAIL', reason: 'Attribution visible at expanded' });
            await page.close();
            continue;
          }

          await sheetHandle.click();
          await page.waitForTimeout(400);
          console.log('Sheet cycled to half');

          const attrHalfVisible = await page.locator('.maplibregl-ctrl-bottom-left').isVisible();
          console.log(`Attribution visible at half: ${attrHalfVisible}`);
          
          if (!attrHalfVisible) {
            console.log('❌ Attribution should be visible at half');
            results.push({ size: size.name, status: 'FAIL', reason: 'Attribution hidden at half' });
            await page.close();
            continue;
          }
        }

        const mapCanvas = page.locator('.maplibregl-canvas').first();
        if (await mapCanvas.isVisible()) {
          const box = await mapCanvas.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(400);
          console.log('Map tapped → full-screen');

          const zoomControls = page.locator('.maplibregl-ctrl-top-right');
          if (await zoomControls.isVisible()) {
            const zoomBox = await zoomControls.boundingBox();
            console.log(`Zoom controls top: ${zoomBox.y}`);
            
            if (zoomBox.y < 70) {
              console.log(`❌ Zoom controls too high (${zoomBox.y}px, should be >=72px)`);
              results.push({ size: size.name, status: 'FAIL', reason: `Zoom at ${zoomBox.y}px` });
              await page.close();
              continue;
            }
          }

          const attrFullVisible = await page.locator('.maplibregl-ctrl-bottom-left').isVisible();
          console.log(`Attribution visible in full-screen: ${attrFullVisible}`);
          
          if (!attrFullVisible) {
            console.log('❌ Attribution should be visible in full-screen');
            results.push({ size: size.name, status: 'FAIL', reason: 'Attribution hidden in full-screen' });
            await page.close();
            continue;
          }
        }
      }

      console.log('✅ All checks passed');
      results.push({ size: size.name, status: 'PASS' });

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ size: size.name, status: 'FAIL', reason: err.message });
    }

    await page.close();
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.size}: ${r.status}${r.reason ? ' (' + r.reason + ')' : ''}`);
  });

  const allPassed = results.every(r => r.status === 'PASS');
  process.exit(allPassed ? 0 : 1);
})();
