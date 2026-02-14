import React, { useState } from 'react';
import { InventoryItem, Category } from '../types';
import { Search, Filter, AlertTriangle, X, ArrowUpDown, Download, Package, Edit2, Check, Loader2 } from 'lucide-react';
import { updateInventoryQuantity } from '../services/sheetService';

interface Props {
  inventory: InventoryItem[];
  onRefresh: () => void;
}

const InventoryTable: React.FC<Props> = ({ inventory, onRefresh }) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredData = inventory.filter(item => {
    const matchesCategory = filter === 'All' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name);
    if (sortOrder === 'desc') return b.name.localeCompare(a.name);
    return 0;
  });

  const handleExport = () => {
    const headers = ["ID", "Item Name", "Category", "Quantity", "Unit", "Min Level", "Status"];
    const csvContent = [
      headers.join(","),
      ...sortedData.map(item => {
        const status = item.quantity <= item.minLevel ? "Low Stock" : "In Stock";
        return [item.id, `"${item.name}"`, item.category, item.quantity, item.unit, item.minLevel, status].join(",");
      })
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveQuantity = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    const success = await updateInventoryQuantity(selectedItem.name, Number(editQty));
    setIsSaving(false);
    if (success) {
      setSelectedItem(prev => prev ? { ...prev, quantity: Number(editQty) } : null);
      setIsEditing(false);
      onRefresh();
    } else {
      alert("Failed to update quantity.");
    }
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-primary-600" />
              Inventory <span className="text-gray-400 font-normal text-sm">({sortedData.length})</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="Search..." className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:border-primary-500 focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select className="pl-9 pr-6 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:border-primary-500 focus:outline-none" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="All">All</option>
                  {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ArrowUpDown size={16} className="text-gray-500" />
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.length > 0 ? sortedData.map((item) => {
                const isLow = item.quantity <= item.minLevel;
                return (
                  <tr key={item.id} onClick={() => { setSelectedItem(item); setEditQty(item.quantity.toString()); setIsEditing(false); }} className={`cursor-pointer ${isLow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">#{item.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.category === Category.HOUSEKEEPING ? 'bg-blue-100 text-blue-700' : item.category === Category.PANTRY ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{item.quantity}</span>
                      <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertTriangle size={12} /> Low
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs font-medium">In Stock</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary-600 px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white">{selectedItem.name}</h3>
                <p className="text-primary-200 text-xs">#{selectedItem.id}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded hover:bg-white/10 text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-lg ${selectedItem.quantity <= selectedItem.minLevel ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-20 p-2 border rounded text-lg font-bold" autoFocus />
                    <span className="text-gray-500">{selectedItem.unit}</span>
                    <button onClick={handleSaveQuantity} disabled={isSaving} className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200">
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditQty(selectedItem.quantity.toString()); }} className="p-2 bg-red-100 text-red-500 rounded hover:bg-red-200"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{selectedItem.quantity}</span>
                    <span className="text-gray-500">{selectedItem.unit}</span>
                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Edit2 size={14} /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Category</p>
                  <p className="font-medium text-gray-900">{selectedItem.category}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Min Level</p>
                  <p className="font-medium text-gray-900">{selectedItem.minLevel} {selectedItem.unit}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;
