import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../components/AppShell.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { InventoryPage } from '../features/inventory/InventoryPage.jsx';
import { SimulatorPage } from '../features/simulator/SimulatorPage.jsx';
import { DecisionsPage } from '../features/decisions/DecisionsPage.jsx';
import { ReportsPage } from '../features/reports/ReportsPage.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { loadOfficialFixture, loadStoreCatalogBatches } from '../data/fixtureLoader.js';
import { getStoredDecisions, saveDecision, clearStoredDecisions } from '../data/decisionStore.js';
import { BatchDetails } from '../features/inventory/BatchDetails.jsx';
import { AddBatchModal } from '../features/inventory/AddBatchModal.jsx';

export function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [simulatorBatchId, setSimulatorBatchId] = useState(null);
  const [datasetMode, setDatasetMode] = useState('DEMO'); // 'DEMO' (24 batches) | 'OFFICIAL' (2 batches)
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [decisions, setDecisions] = useState([]);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

  // Load stored decisions on mount
  useEffect(() => {
    setDecisions(getStoredDecisions());
  }, []);

  const loadData = useCallback(async (mode = datasetMode) => {
    setLoading(true);
    setError(null);

    if (mode === 'DEMO') {
      const demoResult = loadStoreCatalogBatches();
      setBatches(demoResult.batches);
      setMetadata(demoResult.metadata);
      setLoading(false);
    } else {
      const officialResult = await loadOfficialFixture();
      if (officialResult.success) {
        setBatches(officialResult.batches);
        setMetadata(officialResult.metadata);
      } else {
        setError(officialResult.error);
      }
      setLoading(false);
    }
  }, [datasetMode]);

  useEffect(() => {
    loadData(datasetMode);
  }, [datasetMode, loadData]);

  const handleToggleDataset = () => {
    const nextMode = datasetMode === 'DEMO' ? 'OFFICIAL' : 'DEMO';
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

  const handleRecordDecision = (record) => {
    const updated = saveDecision(record);
    setDecisions(updated);
  };

  const handleClearDecisions = () => {
    clearStoredDecisions();
    setDecisions([]);
  };

  const handleAddBatch = (newBatch) => {
    setBatches(prev => [newBatch, ...prev]);
  };

  const activeBatch = batches.find(b => b.id === selectedBatchId) || null;

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
              onSelectBatch={handleSelectBatch}
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
              onClearDecisions={handleClearDecisions}
              onNavigateToSimulator={() => setCurrentPage('simulator')}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsPage
              batches={batches}
              decisions={decisions}
            />
          )}

          {/* Global Details Modal if selected on Dashboard */}
          {currentPage === 'dashboard' && activeBatch && (
            <div
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedBatchId(null); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
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
        </>
      )}
    </AppShell>
  );
}

export default App;
