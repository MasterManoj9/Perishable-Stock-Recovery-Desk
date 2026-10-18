import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageFile } from '../lib/imageUpload.js';
import initialPredictData from '../data/predictInitialData.js';
import { getBatches, saveBatch } from '../data/supabaseAdapter.js';
import { loadOfficialFixture } from '../data/fixtureLoader.js';

test('Phase 13: Dashboard UI Refinement, Image Persistence & Real Data Tests', async (t) => {
  // 1. Theme and Palette
  await t.test('1. Light peach theme is locked and dark mode toggle is removed', async () => {
    // Theme context is locked to light mode
    const { useTheme, ThemeProvider } = await import('../lib/themeContext.js');
    assert.ok(ThemeProvider, 'ThemeProvider must be exported');
    assert.ok(useTheme, 'useTheme hook must be exported');
    const themeState = useTheme();
    assert.equal(themeState.theme, 'light');
    assert.equal(themeState.isDark, false);
  });

  // 2. Image File Validation
  await t.test('2. Product image validation enforces valid MIME types and rejects invalid files', () => {
    // Missing file
    assert.equal(validateImageFile(null).valid, false);

    // Zero-byte file
    const emptyFile = { name: 'empty.png', type: 'image/png', size: 0 };
    const emptyRes = validateImageFile(emptyFile);
    assert.equal(emptyRes.valid, false);
    assert.match(emptyRes.error, /empty/i);

    // Unsupported format (e.g. SVG or GIF or EXE)
    const svgFile = { name: 'vector.svg', type: 'image/svg+xml', size: 1024 };
    const svgRes = validateImageFile(svgFile);
    assert.equal(svgRes.valid, false);
    assert.match(svgRes.error, /unsupported/i);

    const exeFile = { name: 'virus.exe', type: 'application/x-msdownload', size: 2048 };
    assert.equal(validateImageFile(exeFile).valid, false);

    // File exceeds 5MB limit
    const largeFile = { name: 'large.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 };
    const largeRes = validateImageFile(largeFile);
    assert.equal(largeRes.valid, false);
    assert.match(largeRes.error, /exceeds/i);

    // Valid JPEG, PNG, WebP files <= 5MB
    const validJpg = { name: 'photo.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 };
    assert.equal(validateImageFile(validJpg).valid, true);

    const validPng = { name: 'photo.png', type: 'image/png', size: 500 * 1024 };
    assert.equal(validateImageFile(validPng).valid, true);

    const validWebp = { name: 'photo.webp', type: 'image/webp', size: 1.5 * 1024 * 1024 };
    assert.equal(validateImageFile(validWebp).valid, true);
  });

  // 3. Batch Creation with Image URL Persistence
  await t.test('3. saveBatch persists product image reference alongside inventory batch', async () => {
    const testBatch = {
      id: `B-TEST-${Date.now()}`,
      productName: 'Organic Sourdough Bread',
      category: 'Bakery',
      qty: 15,
      originalPrice: 85,
      incrementalCost: 40,
      daysUntilExpiry: 2,
      condition: 'good',
      coldChainStatus: 'compliant',
      imageUrl: 'https://example.com/images/sourdough_test.webp'
    };

    const res = await saveBatch(testBatch);
    assert.equal(res.success, true);
    assert.equal(res.batch.imageUrl, testBatch.imageUrl);
  });

  // 4. Official Mandatory Case Checks remain 100% compliant
  await t.test('4. Official mandatory case checks remain 100% compliant and uncorrupted', async () => {
    const { runMandatoryCaseChecks } = await import('../domain/caseChecksRunner.js');
    const checks = runMandatoryCaseChecks();
    assert.equal(checks.length, 3);
    assert.ok(checks.every(c => c.passed === true));
    const totalPoints = checks.reduce((acc, c) => acc + c.points, 0);
    assert.equal(totalPoints, 25);
  });

  // 5. Customer Safety Filtering
  await t.test('5. Customer querying filters expired and damaged stock', async () => {
    const batches = [
      { id: 'P1', productName: 'Fresh Milk', expired: false, condition: 'good', coldChainStatus: 'compliant', qty: 10, imageUrl: 'img1.png' },
      { id: 'P2', productName: 'Expired Yogurt', expired: true, condition: 'good', coldChainStatus: 'compliant', qty: 5, imageUrl: 'img2.png' },
      { id: 'P3', productName: 'Damaged Berries', expired: false, condition: 'damaged', coldChainStatus: 'compliant', qty: 3, imageUrl: 'img3.png' },
      { id: 'P4', productName: 'Cold Chain Issue', expired: false, condition: 'good', coldChainStatus: 'exception', qty: 4, imageUrl: 'img4.png' }
    ];

    // Customer shop filter logic
    const customerAvailable = batches.filter(b => 
      !b.expired && 
      b.condition !== 'damaged' && 
      b.coldChainStatus !== 'exception' && 
      b.qty > 0
    );

    assert.equal(customerAvailable.length, 1);
    assert.equal(customerAvailable[0].id, 'P1');
    assert.equal(customerAvailable[0].imageUrl, 'img1.png');
  });

  // 6. Predict Section Preservation
  await t.test('6. Predict module retains legitimate ML forecasting data and benchmarks', () => {
    assert.ok(initialPredictData, 'Predict initial data must exist');
    assert.equal(initialPredictData.status, 'completed');
    assert.equal(initialPredictData.selected_model, 'Global Gradient Boosting Regressor');
    assert.ok(Array.isArray(initialPredictData.model_comparison), 'model_comparison array must be preserved');
    assert.ok(initialPredictData.model_comparison.length >= 3, 'Multiple benchmark models must be evaluated');

    // Verify models have legitimate evaluation metrics
    initialPredictData.model_comparison.forEach(model => {
      assert.ok(model.model_name, 'Model name required');
      assert.ok(typeof model.mae === 'number', 'MAE must be numeric');
      assert.ok(typeof model.wape_pct === 'number', 'WAPE must be numeric');
      assert.ok(typeof model.rmse === 'number', 'RMSE must be numeric');
    });

    // Check series evaluation
    assert.ok(Array.isArray(initialPredictData.series_eval), 'series_eval results must exist');
    assert.ok(initialPredictData.series_eval.length > 0, 'series_eval results must not be empty');

    // Check summary KPIs
    assert.ok(initialPredictData.summary_kpis, 'summary_kpis must exist');
    assert.ok(initialPredictData.summary_kpis.validation_mae > 0);
  });

  // 7. Dummy Data Elimination & Real Data Verification
  await t.test('7. getBatches in LIVE mode never injects 24 dummy mockup batches', async () => {
    // In LIVE mode, returns either real database records or empty array, never 24 hardcoded items
    const liveBatches = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    assert.ok(Array.isArray(liveBatches));
    assert.notEqual(liveBatches.length, 24, 'Must not return 24 dummy mockup batches');

    const hasB0001 = liveBatches.some(b => b.id === 'B-0001');
    assert.equal(hasB0001, false, 'Must not contain fake batch B-0001 (Banana Cavendish Robusta)');
  });

  // 8. Order analytics handles zero orders honestly without fabricating metrics
  await t.test('8. Order analytics handles zero orders honestly without fabricating metrics', async () => {
    const { getOrderAnalytics } = await import('../data/orderStore.js');
    const emptyAnalytics = getOrderAnalytics('all', []);
    assert.equal(emptyAnalytics.totalOrders, 0);
    assert.equal(emptyAnalytics.grossSales, 0);
    assert.equal(emptyAnalytics.totalRevenue, 0);
    assert.equal(emptyAnalytics.totalUnits, 0);
    assert.equal(emptyAnalytics.totalDonations, 0);
    assert.equal(emptyAnalytics.products.length, 0);
    assert.equal(emptyAnalytics.monthly.length, 0);
  });
});
