import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/AppShell.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { InventoryPage } from '../features/inventory/InventoryPage.jsx';
import { SimulatorPage } from '../features/simulator/SimulatorPage.jsx';
import { DecisionsPage } from '../features/decisions/DecisionsPage.jsx';
import { ReportsPage } from '../features/reports/ReportsPage.jsx';
import { ManagerNotificationsPage } from '../features/notifications/ManagerNotificationsPage.jsx';
import { ManagerFeedbackPage } from '../features/feedback/ManagerFeedbackPage.jsx';
import { BusinessInsightsPage } from '../features/insights/BusinessInsightsPage.jsx';
import { PredictPage } from '../features/predict/PredictPage.jsx';

// Customer Flow
import { CustomerShell } from '../features/customer/CustomerShell.jsx';
import { ShopPage } from '../features/customer/ShopPage.jsx';
import { CartPage } from '../features/customer/CartPage.jsx';
import { OrdersPage } from '../features/customer/OrdersPage.jsx';
import { CustomerNotificationsPage } from '../features/customer/CustomerNotificationsPage.jsx';
import { CustomerFeedbackPage } from '../features/customer/CustomerFeedbackPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';

// Providers and Contexts
import { ThemeProvider } from '../lib/themeContext.js';
import { AuthProvider, useAuth } from '../lib/auth.js';
import { NotificationProvider, useNotifications } from '../lib/notificationContext.js';
import { CartProvider } from '../lib/cartContext.js';

// Components & Domain
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { getBatches, fetchDecisions, recordDecision, deleteBatch, saveBatch, updateBatch } from '../data/supabaseAdapter.js';
import { BatchDetails } from '../features/inventory/BatchDetails.jsx';
import { AddBatchModal } from '../features/inventory/AddBatchModal.jsx';
import { DeleteProductModal } from '../features/inventory/DeleteProductModal.jsx';

function AppContent() {
  const { user, profile, loading: authLoading, isAuthenticated, isManager, isCustomer, isAdmin, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation state within each dashboard
  const [customerPage, setCustomerPage] = useState('shop');
  const [currentPage, setCurrentPage] = useState('dashboard');

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [simulatorBatchId, setSimulatorBatchId] = useState(null);
  const [datasetMode, setDatasetMode] = useState('LIVE'); // 'LIVE' (real Supabase inventory) | 'OFFICIAL' (C30 case checks)
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Load stored decisions on mount
  useEffect(() => {
    let active = true;
    fetchDecisions().then(data => {
      if (active) setDecisions(data || getStoredDecisions());
    }).catch(() => {
      if (active) setDecisions(getStoredDecisions());
    });
    return () => { active = false; };
  }, []);

  const loadData = useCallback(async (mode = datasetMode) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedBatches = await getBatches({ isManager: Boolean(isManager || isAdmin), datasetMode: mode });
      setBatches(fetchedBatches || []);
    } catch (err) {
      console.warn('getBatches failed:', err);
      setError(err?.message || 'Error loading inventory from database');
    } finally {
      setLoading(false);
    }
  }, [datasetMode, isManager, isAdmin]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(datasetMode);
    }
  }, [datasetMode, isAuthenticated, loadData]);

  const handleToggleDataset = () => {
    const nextMode = datasetMode === 'LIVE' ? 'OFFICIAL' : 'LIVE';
    setDatasetMode(nextMode);
  };

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
  };

  const handleOpenSimulator = (batch) => {
    setSelectedBatchId(null);
    setSimulatorBatchId(batch?.id || null);
    setCurrentPage('simulator');
  };

  const handleRecordDecision = async (record) => {
    await recordDecision(record);
    const updated = saveDecision(record);
    setDecisions(updated);
  };

  const handleClearDecisions = () => {
    clearStoredDecisions();
    setDecisions([]);
  };

  const handleAddBatch = async (newBatch) => {
    const res = await saveBatch(newBatch);
    if (!res?.success) {
      throw new Error(res?.error || 'Failed to persist product to database');
    }
    const saved = res.batch || newBatch;
    setBatches(prev => {
      const filtered = prev.filter(b => b.id !== saved.id && (!saved.dbId || b.dbId !== saved.dbId));
      return [saved, ...filtered];
    });
    // Immediately reload authoritative data in background to ensure 100% sync
    loadData(datasetMode);
    return saved;
  };

  const handleUpdateBatch = async (updatedBatch) => {
    const res = await updateBatch(updatedBatch);
    if (!res?.success) {
      throw new Error(res?.error || 'Failed to update product in database');
    }
    const saved = res.batch || updatedBatch;
    const matchId = updatedBatch._origId || updatedBatch.id || saved.id;
    setBatches(prev => prev.map(b => (b.id === matchId || b.id === saved.id || (saved.dbId && b.dbId === saved.dbId)) ? { ...b, ...saved } : b));
    await loadData(datasetMode);
    return saved;
  };

  const handleDeleteBatch = async (targetBatch) => {
    if (!targetBatch) return;
    const res = await deleteBatch(targetBatch);
    if (!res?.success) {
      throw new Error(res?.error || 'Failed to delete product from database');
    }
    setBatches(prev => prev.filter(b => b.id !== targetBatch.id && (!targetBatch.dbId || b.dbId !== targetBatch.dbId)));
    if (selectedBatchId === targetBatch.id || (targetBatch.dbId && selectedBatchId === targetBatch.dbId)) {
      setSelectedBatchId(null);
    }
  };

  const activeBatch = batches.find(b => b.id === selectedBatchId) || null;

  // ─── 1. AUTH LOADING STATE ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <LoadingState message="Verifying authentication session..." />
      </div>
    );
  }

  // ─── 2. UNAUTHENTICATED: LOGIN MUST APPEAR FIRST ─────────────────────
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // ─── 3. CUSTOMER DASHBOARD (CUSTOMER RECOVERY SHOP) ──────────────────
  if (isCustomer) {
    return (
      <CustomerShell
        currentPage={customerPage}
        onNavigate={(page) => {
          setCustomerPage(page);
          if (page === 'shop' || page === 'cart') {
            loadData(datasetMode);
          }
        }}
      >
        {customerPage === 'shop' && (
          <ShopPage batches={batches} onRefresh={() => loadData(datasetMode)} />
        )}

        {customerPage === 'cart' && (
          <CartPage onNavigate={setCustomerPage} batches={batches} />
        )}

        {customerPage === 'orders' && (
          <OrdersPage />
        )}

        {customerPage === 'notifications' && (
          <CustomerNotificationsPage />
        )}

        {(customerPage === 'feedback' || customerPage === 'support') && (
          <CustomerFeedbackPage />
        )}
      </CustomerShell>
    );
  }

  // ─── 4. MANAGER DASHBOARD (PERISHABLE STOCK RECOVERY DESK) ───────────
  if (isManager || isAdmin) {
    return (
      <AppShell
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        batchCount={batches.length}
        decisionCount={decisions.length}
        datasetMode={datasetMode}
        onToggleDataset={handleToggleDataset}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q && currentPage !== 'inventory') {
            setCurrentPage('inventory');
          }
        }}
        unreadNotificationsCount={unreadCount}
        onSignOut={signOut}
      >
        {loading && <LoadingState message="Loading perishable inventory records..." />}

        {error && !loading && (
          <ErrorMessage
            title="Data Loading Error"
            message={error}
            onRetry={() => loadData(datasetMode)}
          />
        )}

        {!loading && !error && (
          <>
            {currentPage === 'dashboard' && (
              <DashboardPage
                batches={batches}
                onSelectBatch={(id) => {
                  handleSelectBatch(id);
                  setCurrentPage('inventory');
                }}
                onNavigateToInventory={() => setCurrentPage('inventory')}
                onOpenAddBatch={() => setIsAddBatchOpen(true)}
              />
            )}

            {currentPage === 'inventory' && (
              <InventoryPage
                batches={batches}
                selectedBatchId={selectedBatchId}
                onSelectBatch={setSelectedBatchId}
                globalSearchQuery={searchQuery}
                onOpenSimulator={handleOpenSimulator}
                onOpenAddBatch={() => setIsAddBatchOpen(true)}
                onUpdateBatch={handleUpdateBatch}
                onDeleteBatch={handleDeleteBatch}
              />
            )}

            {currentPage === 'simulator' && (
              <SimulatorPage
                batches={batches}
                initialBatchId={simulatorBatchId}
                onRecordDecision={handleRecordDecision}
                onNavigateToDecisions={() => setCurrentPage('decisions')}
                onNavigateToInventory={() => setCurrentPage('inventory')}
              />
            )}

            {currentPage === 'decisions' && (
              <DecisionsPage
                decisions={decisions}
                liveBatches={batches}
                onClearDecisions={handleClearDecisions}
                onNavigateToSimulator={() => setCurrentPage('simulator')}
                onNavigateToInventory={(batchId) => {
                  if (batchId) setSelectedBatchId(batchId);
                  setCurrentPage('inventory');
                }}
              />
            )}

            {currentPage === 'reports' && (
              <ReportsPage
                batches={batches}
                decisions={decisions}
              />
            )}

            {currentPage === 'predict' && (
              <PredictPage />
            )}

            {currentPage === 'insights' && (
              <BusinessInsightsPage
                batches={batches}
              />
            )}

            {currentPage === 'notifications' && (
              <ManagerNotificationsPage onNavigate={setCurrentPage} />
            )}

            {currentPage === 'feedback' && (
              <ManagerFeedbackPage />
            )}

            {/* Global Details Modal if selected on Dashboard */}
            {currentPage === 'dashboard' && activeBatch && (
              <div
                onClick={(e) => { if (e.target === e.currentTarget) setSelectedBatchId(null); }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
              >
                <div className="w-full max-w-3xl">
                  <BatchDetails
                    batch={activeBatch}
                    onClose={() => setSelectedBatchId(null)}
                    onViewInInventory={() => {
                      setSelectedBatchId(null);
                      setCurrentPage('inventory');
                    }}
                    onAction={handleOpenSimulator}
                    onDelete={(b) => {
                      setSelectedBatchId(null);
                      setBatchToDelete(b);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Add Product / Batch Modal */}
            <AddBatchModal
              isOpen={isAddBatchOpen}
              onClose={() => setIsAddBatchOpen(false)}
              onAddBatch={handleAddBatch}
            />

            {/* Delete Product Confirmation Modal */}
            <DeleteProductModal
              isOpen={Boolean(batchToDelete)}
              batch={batchToDelete}
              onClose={() => setBatchToDelete(null)}
              onConfirm={handleDeleteBatch}
            />
          </>
        )}
      </AppShell>
    );
  }

  // ─── 5. UNAUTHORIZED / UNASSIGNED ROLE ACCESS DENIED SCREEN ──────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-2xl border border-rose-500/30">
          🔒
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Denied: Unassigned Role</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Your account <span className="font-mono text-emerald-400">{user?.email}</span> is authenticated, but does not have an authorized role assigned in <code className="font-mono text-slate-300">public.profiles</code>.
        </p>
        <p className="text-xs text-slate-500">
          Contact a system administrator to assign either the <span className="text-slate-300 font-semibold">manager</span> or <span className="text-slate-300 font-semibold">customer</span> role.
        </p>
        <div className="pt-2">
          <button
            onClick={signOut}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
          >
            Sign Out & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider userId="manager-001">
          <CartProvider>
            <AppContent />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
