import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import IssueReceiveForm from './components/IssueReceiveForm';
import InventoryTable from './components/InventoryTable';
import Reports from './components/Reports';
import Login from './components/Login';
import { InventoryItem, Transaction, TransactionType } from './types';
import { fetchInventory, fetchTransactions, getCachedInventory, getCachedTransactions } from './services/sheetService';
import { Loader2 } from 'lucide-react';

interface UserSession {
  email: string;
  name: string;
  role: string;
  loginTime: string;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(getCachedInventory());
  const [transactions, setTransactions] = useState<Transaction[]>(getCachedTransactions());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('satyam_mall_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as UserSession;
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('satyam_mall_user');
      }
    }
  }, []);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const [invData, transData] = await Promise.all([fetchInventory(), fetchTransactions()]);
    setInventory(invData);
    setTransactions(transData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && inventory.length === 0) loadData(true);
    else if (isAuthenticated) loadData(false);
  }, [isAuthenticated, inventory.length, loadData]);

  const handleLogin = (user: { email: string; name: string; role: string }) => {
    setCurrentUser({
      email: user.email,
      name: user.name,
      role: user.role,
      loginTime: new Date().toISOString()
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('satyam_mall_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="text-primary-600 animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard inventory={inventory} transactions={transactions} />;
      case 'issue':
        return <IssueReceiveForm type={TransactionType.ISSUE} inventory={inventory} onSuccess={loadData} />;
      case 'receive':
        return <IssueReceiveForm type={TransactionType.RECEIVE} inventory={inventory} onSuccess={loadData} />;
      case 'inventory':
        return <InventoryTable inventory={inventory} onRefresh={loadData} />;
      case 'reports':
        return <Reports transactions={transactions} currentUser={currentUser} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
        {renderContent()}
      </main>
      <footer className="bg-white py-3 text-center text-xs text-gray-400 border-t border-gray-200">
        Satyam Mall Inventory System
      </footer>
    </div>
  );
};

export default App;
