-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 003: Seed Data (Stores, Products, and Official Fixture Batches B1 & B2)
-- ============================================================================

-- 1. Insert Default Demo Store
INSERT INTO public.stores (id, code, name, address, city, state, postal_code, min_contribution_floor_paise)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'HYD-BH-01',
    'Fynd Fresh — Banjara Hills',
    'Road No. 12, Banjara Hills',
    'Hyderabad',
    'Telangana',
    '500034',
    500 -- ₹5.00
) ON CONFLICT (code) DO NOTHING;

-- 2. Insert Products Catalog
INSERT INTO public.products (id, sku, name, category, image_emoji, base_price_paise, default_incremental_cost_paise, max_markdown_percent, is_perishable, shelf_life_hours)
VALUES
    -- Official Fixture Products
    ('b0000000-0000-0000-0000-000000000001', 'OGY-200', 'Organic Greek Yogurt 200g', 'Dairy', '🥣', 6000, 2500, 50, true, 48),
    ('b0000000-0000-0000-0000-000000000002', 'CAM-500', 'Cold-Pressed Almond Milk 500ml', 'Beverages', '🥛', 9000, 4000, 50, true, 24),
    -- Extended Demo Catalog Products
    ('b0000000-0000-0000-0000-000000000003', 'ASD-400', 'Artisan Sourdough Loaf', 'Bakery', '🍞', 12000, 4500, 50, true, 36),
    ('b0000000-0000-0000-0000-000000000004', 'STR-250', 'Fresh Mahabaleshwar Strawberries 250g', 'Produce', '🍓', 15000, 6000, 60, true, 24),
    ('b0000000-0000-0000-0000-000000000005', 'PAN-200', 'Farm Malai Paneer 200g', 'Dairy', '🧀', 11000, 5000, 40, true, 48),
    ('b0000000-0000-0000-0000-000000000006', 'CBR-300', 'Nitro Cold Brew Coffee 300ml', 'Beverages', '☕', 14000, 5500, 50, true, 72),
    ('b0000000-0000-0000-0000-000000000007', 'AVO-002', 'Hass Avocado (Pack of 2)', 'Produce', '🥑', 18000, 8000, 50, true, 48),
    ('b0000000-0000-0000-0000-000000000008', 'CRO-002', 'Butter Croissant (Pack of 2)', 'Bakery', '🥐', 13000, 4800, 50, true, 24)
ON CONFLICT (sku) DO NOTHING;

-- 3. Insert Inventory Batches (Including Mandatory C30 Test Fixtures B1 & B2)
INSERT INTO public.inventory_batches (
    id, batch_code, store_id, product_id, initial_quantity, available_quantity, allocated_quantity,
    original_price_paise, incremental_cost_paise, current_selling_price_paise, max_allowed_markdown_percent,
    expiry_at, condition, cold_chain_status, notes
)
VALUES
    -- Mandatory Fixture B1 (Sellable & Eligible: 10 units, ₹60 original, ₹25 cost)
    (
        'c0000000-0000-0000-0000-000000000001',
        'B1',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        10, 10, 0,
        6000, 2500, 6000, 50,
        now() + interval '18 hours',
        'good', 'compliant',
        'C30 Official Fixture Batch 1: Compliant, near-expiry afternoon markdown candidate.'
    ),
    -- Mandatory Fixture B2 (Expired & Blocked: 8 units, ₹90 original, ₹40 cost)
    (
        'c0000000-0000-0000-0000-000000000002',
        'B2',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        8, 8, 0,
        9000, 4000, 9000, 50,
        now() - interval '4 hours', -- Expired!
        'good', 'compliant',
        'C30 Official Fixture Batch 2: Expired batch. Hard-blocked by safety gate.'
    ),
    -- Batch B3 (Damaged: Hard-blocked by safety gate)
    (
        'c0000000-0000-0000-0000-000000000003',
        'B3',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        6, 6, 0,
        12000, 4500, 12000, 50,
        now() + interval '12 hours',
        'damaged', 'compliant',
        'Crushed packaging during unloading. Blocked from customer sale.'
    ),
    -- Batch B4 (Cold-chain Exception: Blocked from sale until resolved)
    (
        'c0000000-0000-0000-0000-000000000004',
        'B4',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000005',
        12, 12, 0,
        11000, 5000, 11000, 40,
        now() + interval '24 hours',
        'good', 'exception',
        'Chiller temperature spike flagged by sensor. Under safety quarantine.'
    ),
    -- Active Live Store Batches
    (
        'c0000000-0000-0000-0000-000000000005',
        'B5',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000004',
        15, 15, 0,
        15000, 6000, 9000, 50,
        now() + interval '8 hours',
        'good', 'compliant',
        'Fresh strawberries, peak ripeness markdown.'
    ),
    (
        'c0000000-0000-0000-0000-000000000006',
        'B6',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000006',
        20, 20, 0,
        14000, 5500, 9500, 50,
        now() + interval '30 hours',
        'good', 'compliant',
        'Nitro cold brew morning batch surplus.'
    ),
    (
        'c0000000-0000-0000-0000-000000000007',
        'B7',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000007',
        14, 14, 0,
        18000, 8000, 12000, 50,
        now() + interval '16 hours',
        'good', 'compliant',
        'Ready to eat Hass avocado twin-pack.'
    ),
    (
        'c0000000-0000-0000-0000-000000000008',
        'B8',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000008',
        10, 10, 0,
        13000, 4800, 8000, 50,
        now() + interval '6 hours',
        'good', 'compliant',
        'Morning artisan bakery bake surplus.'
    )
ON CONFLICT (store_id, batch_code) DO NOTHING;
