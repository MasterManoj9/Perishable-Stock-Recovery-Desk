/**
 * ShopPage.jsx — Customer Product Catalogue & Shopping Experience
 * 
 * Displays markdown deals from the shared inventory, allows filtering,
 * sorting, and adding items to cart. Only shows eligible, non-expired products.
 */

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ShoppingCart, Clock, Tag, TrendingDown, Star, Filter, ChevronDown, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '../../lib/cartContext.js';

export function ShopPage({ batches = [] }) {
  const { addItem, items: cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('discount');
  const [priceRange, setPriceRange] = useState('all');
  const [addedFeedback, setAddedFeedback] = useState({});

  // Filter only eligible, non-expired products for customers
  const availableProducts = useMemo(() => {
    return batches.filter(b => 
      !b.expired && 
      b.eligibility?.eligible !== false && 
      b.condition !== 'damaged' &&
      b.coldChainStatus !== 'exception' &&
      b.qty > 0
    );
  }, [batches]);

  // Extract categories
  const categories = useMemo(() => {
    const cats = [...new Set(availableProducts.map(b => b.category))].sort();
    return ['all', ...cats];
  }, [availableProducts]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let results = [...availableProducts];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(b =>
        b.productName?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== 'all') {
      results = results.filter(b => b.category === selectedCategory);
    }

    // Price range
    if (priceRange !== 'all') {
      const discountedPrice = (b) => {
        const maxMd = b.allowedMarkdownPercent || 0;
        return b.originalPrice * (1 - maxMd / 100);
      };
      switch (priceRange) {
        case 'under50':
          results = results.filter(b => discountedPrice(b) < 50);
          break;
        case '50to100':
          results = results.filter(b => discountedPrice(b) >= 50 && discountedPrice(b) <= 100);
          break;
        case '100to200':
          results = results.filter(b => discountedPrice(b) >= 100 && discountedPrice(b) <= 200);
          break;
        case 'over200':
          results = results.filter(b => discountedPrice(b) > 200);
          break;
      }
    }

    // Sorting
    switch (sortBy) {
      case 'discount':
        results.sort((a, b) => (b.allowedMarkdownPercent || 0) - (a.allowedMarkdownPercent || 0));
        break;
      case 'price_low':
        results.sort((a, b) => a.originalPrice - b.originalPrice);
        break;
      case 'price_high':
        results.sort((a, b) => b.originalPrice - a.originalPrice);
        break;
      case 'expiry':
        results.sort((a, b) => new Date(a.expiryAt) - new Date(b.expiryAt));
        break;
      case 'name':
        results.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        break;
    }

    return results;
  }, [availableProducts, searchQuery, selectedCategory, sortBy, priceRange]);

  const handleAddToCart = (product) => {
    const discountedPrice = Math.round(product.originalPrice * (1 - (product.allowedMarkdownPercent || 0) / 100) * 100) / 100;
    const cartProduct = {
      ...product,
      discountedPrice,
      base_price: product.originalPrice
    };
    const result = addItem(cartProduct);
    if (result.success) {
      setAddedFeedback(prev => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedFeedback(prev => ({ ...prev, [product.id]: false })), 1500);
    }
  };

  const getExpiryBadge = (batch) => {
    if (!batch.expiryAt) return null;
    const hours = (new Date(batch.expiryAt) - new Date()) / (1000 * 60 * 60);
    if (hours < 6) return { text: 'Expires soon!', color: 'bg-red-100 text-red-700 border-red-200' };
    if (hours < 24) return { text: 'Expires today', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (hours < 72) return { text: `${Math.ceil(hours / 24)}d left`, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { text: batch.expiryDisplay || 'Fresh', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const isInCart = (productId) => cartItems.some(i => i.productId === productId);

  return (
    <div>
      {/* Hero Section */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#D97757] to-[#E7A78A] p-6 sm:p-8 text-white shadow-xs">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Fresh Deals, Less Waste 🌱</h1>
          <p className="text-[#FFF1E8] text-sm sm:text-base mb-6">
            Shop quality products approaching their best-by date at great discounts. Every purchase helps reduce food waste.
          </p>
          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="w-5 h-5 text-[#76675F] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-[#302722] text-sm placeholder:text-[#76675F] focus:outline-hidden focus:ring-2 focus:ring-white/60 shadow-xs border border-[#EEDDD2]"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#D97757] text-white shadow-xs'
                  : 'bg-white text-[#76675F] hover:bg-[#FFF8F3] hover:text-[#302722] border border-[#EEDDD2]'
              }`}
            >
              {cat === 'all' ? '🏷️ All' : cat}
            </button>
          ))}
        </div>

        {/* Sort & Price Controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white border border-[#EEDDD2] rounded-xl text-xs text-[#302722] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20"
          >
            <option value="discount">Best Discount</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
            <option value="expiry">Expiring Soon</option>
            <option value="name">Name A-Z</option>
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="px-3 py-2 bg-white border border-[#EEDDD2] rounded-xl text-xs text-[#302722] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20"
          >
            <option value="all">All Prices</option>
            <option value="under50">Under ₹50</option>
            <option value="50to100">₹50 - ₹100</option>
            <option value="100to200">₹100 - ₹200</option>
            <option value="over200">Over ₹200</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-[#76675F] mb-4">
        Showing <span className="font-semibold text-[#302722]">{filteredProducts.length}</span> products
        {searchQuery && <span> for "{searchQuery}"</span>}
      </p>

      {/* Product Grid / Empty State */}
      {availableProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#EEDDD2] p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF8F3] border border-[#EEDDD2] flex items-center justify-center mx-auto mb-4 text-3xl">
            🌱
          </div>
          <h3 className="text-lg font-bold text-[#302722] mb-1">No products available yet</h3>
          <p className="text-xs text-[#76675F] max-w-sm mx-auto">
            New products will appear here when your store adds them.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EEDDD2] p-8 shadow-xs">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-base font-bold text-[#302722] mb-1">No products match your filters</h3>
          <p className="text-xs text-[#76675F] mb-4">Try clearing your search query or choosing another category.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange('all'); }}
            className="px-4 py-2 bg-[#302722] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map(product => {
            const discountedPrice = Math.round(product.originalPrice * (1 - (product.allowedMarkdownPercent || 0) / 100) * 100) / 100;
            const savings = Math.round((product.originalPrice - discountedPrice) * 100) / 100;
            const expiryBadge = getExpiryBadge(product);
            const inCart = isInCart(product.id);
            const justAdded = addedFeedback[product.id];

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-[#EEDDD2] overflow-hidden hover:shadow-md hover:border-[#D97757]/50 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  {/* Product Image Area with Stable Display & Neutral Fallback */}
                  <div className="relative bg-[#FFF8F3] h-44 border-b border-[#EEDDD2] flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl select-none" role="img" aria-label={product.productName}>
                        {product.image || '📦'}
                      </span>
                    )}

                    {/* Restrained Discount Badge */}
                    {product.allowedMarkdownPercent > 0 && (
                      <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#D97757] text-white text-[11px] font-bold rounded-full shadow-xs">
                        -{product.allowedMarkdownPercent}%
                      </div>
                    )}

                    {/* Expiry Badge */}
                    {expiryBadge && (
                      <div className={`absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-xs ${expiryBadge.color}`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {expiryBadge.text}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-1">
                      <span className="text-[10px] font-semibold text-[#76675F] uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#302722] mb-2 line-clamp-2 leading-snug">
                      {product.productName}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-black text-emerald-700">₹{discountedPrice}</span>
                      {savings > 0 && (
                        <span className="text-xs text-[#76675F] line-through">₹{product.originalPrice}</span>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-[11px] text-emerald-700 font-semibold mb-2">
                        Save ₹{savings} ({product.allowedMarkdownPercent}% off)
                      </p>
                    )}

                    {/* Stock Info */}
                    <div className="flex items-center justify-between mb-3 text-[11px]">
                      <span className="text-[#76675F] font-medium">
                        {product.qty} available
                      </span>
                      {product.qty <= 5 ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Low Stock: {product.qty} left
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Cart Button Container */}
                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={justAdded}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      justAdded
                        ? 'bg-emerald-100 text-emerald-800'
                        : inCart
                        ? 'bg-[#FFF8F3] text-[#302722] hover:bg-[#FFE8DC] border border-[#EEDDD2]'
                        : 'bg-[#302722] hover:bg-black text-white shadow-xs'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" /> Added to Cart!
                      </>
                    ) : inCart ? (
                      <>
                        <Plus className="w-4 h-4 text-emerald-600" /> Add Another
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" /> Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
