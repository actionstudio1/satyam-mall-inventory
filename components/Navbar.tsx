import React from 'react';
import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Box, FileText, LogOut, User } from 'lucide-react';

interface UserSession {
  email: string;
  name: string;
  role: string;
  loginTime: string;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserSession | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'issue', label: 'Issue Stock', icon: ArrowUpFromLine },
    { id: 'receive', label: 'Receive Stock', icon: ArrowDownToLine },
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Box className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-gray-900">Satyam Mall</span>
              <span className="text-xs text-gray-500 block leading-tight">Inventory System</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item flex items-center gap-2 ${activeTab === item.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-7 h-7 bg-primary-100 rounded-md flex items-center justify-center">
                <User size={14} className="text-primary-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-800 leading-tight">{currentUser?.name || currentUser?.email}</p>
                <p className="text-xs text-gray-500 leading-tight">{currentUser?.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item flex-shrink-0 flex items-center gap-1.5 text-xs ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
