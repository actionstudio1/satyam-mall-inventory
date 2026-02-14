import React from 'react';
import { InventoryItem, Transaction, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Package, ArrowUpRight, TrendingUp, Boxes, Coffee } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  transactions: Transaction[];
}

const Dashboard: React.FC<Props> = ({ inventory, transactions }) => {
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(i => i.quantity <= i.minLevel).length;
  const recentIssues = transactions.filter(t => t.type === TransactionType.ISSUE).slice(0, 5);
  const hkItems = inventory.filter(i => i.category === 'Housekeeping').length;
  const pantryItems = inventory.filter(i => i.category === 'Pantry').length;

  const categoryData = Object.values(inventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { name: item.category, value: 0 };
    acc[item.category].value += 1;
    return acc;
  }, {} as Record<string, {name: string, value: number}>));

  const COLORS = ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b'];

  const stats = [
    { label: 'Total Items', value: totalItems, icon: Package, bg: 'bg-primary-50', text: 'text-primary-600', iconBg: 'bg-primary-100' },
    { label: 'Low Stock', value: lowStockItems, icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
    { label: 'Housekeeping', value: hkItems, icon: Boxes, bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
    { label: 'Pantry', value: pantryItems, icon: Coffee, bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                  <h3 className={`text-2xl font-bold mt-1 ${stat.text}`}>{stat.value}</h3>
                </div>
                <div className={`${stat.iconBg} p-2.5 rounded-lg`}>
                  <Icon className={stat.text} size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-600" />
            <h3 className="font-semibold text-gray-900">Inventory by Category</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight size={18} className="text-amber-600" />
            <h3 className="font-semibold text-gray-900">Recent Stock Issued</h3>
          </div>
          <div className="space-y-2">
            {recentIssues.length > 0 ? (
              recentIssues.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{t.itemName}</p>
                      <p className="text-xs text-gray-500">{t.location} - {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">-{t.quantity}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 text-sm">No recent transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {lowStockItems > 0 && (
        <div className="card p-5 border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
              <p className="text-gray-500 text-sm">{lowStockItems} items need restocking</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventory.filter(i => i.quantity <= i.minLevel).slice(0, 6).map((item, idx) => (
              <div key={idx} className="bg-red-50 rounded-lg p-3 border border-red-100">
                <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-600">Stock: {item.quantity} {item.unit}</span>
                  <span className="text-xs text-red-600 font-medium">Min: {item.minLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
