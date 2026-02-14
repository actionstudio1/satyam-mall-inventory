import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, InventoryItem, FloorLocation } from '../types';
import { submitTransaction, uploadFileToDrive } from '../services/sheetService';
import { CheckCircle, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft, Package, Upload, X, FileImage, Plus, Trash2, Search, ChevronDown } from 'lucide-react';

interface Props {
  type: TransactionType;
  inventory: InventoryItem[];
  onSuccess: () => void;
}

interface ItemEntry {
  id: number;
  itemName: string;
  quantity: string;
  unit: string;
}

interface SearchableDropdownProps {
  inventory: InventoryItem[];
  value: string;
  onChange: (value: string) => void;
  isIssue: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ inventory, value, onChange, isIssue }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const select = (name: string) => {
    onChange(name);
    setSearch('');
    setOpen(false);
  };

  // Same dropdown for both ISSUE and RECEIVE - with search
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="input-field text-sm w-full text-left flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Select Item'}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search items..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No items found</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${item.name === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                  onClick={() => select(item.name)}
                >
                  {item.name}
                  <span className="text-gray-400 ml-1 text-xs">({isIssue ? 'Available: ' : ''}{item.quantity} {item.unit})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form required validation */}
      <input type="text" required value={value} className="sr-only" tabIndex={-1} onChange={() => {}} />
    </div>
  );
};

let nextId = 1;

const IssueReceiveForm: React.FC<Props> = ({ type, inventory, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [items, setItems] = useState<ItemEntry[]>([{ id: nextId++, itemName: '', quantity: '', unit: '' }]);
  const [commonData, setCommonData] = useState({
    location: '',
    personName: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIssue = type === TransactionType.ISSUE;

  // Auto-fill unit when item is selected (for ISSUE)
  useEffect(() => {
    if (isIssue) {
      setItems(prev => prev.map(item => {
        if (item.itemName) {
          const inv = inventory.find(i => i.name === item.itemName);
          if (inv && item.unit !== inv.unit) {
            return { ...item, unit: inv.unit };
          }
        }
        return item;
      }));
    }
  }, [items.map(i => i.itemName).join(','), inventory, isIssue]);

  const updateItem = (id: number, field: keyof Omit<ItemEntry, 'id'>, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: nextId++, itemName: '', quantity: '', unit: '' }]);
  };

  const removeItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate all items
    for (const item of items) {
      if (!item.itemName || !item.quantity || !item.unit) {
        setMessage({ type: 'error', text: 'Please fill in all item fields.' });
        setLoading(false);
        return;
      }

      if (isIssue) {
        const selectedItem = inventory.find(i => i.name === item.itemName);
        if (!selectedItem) {
          setMessage({ type: 'error', text: `"${item.itemName}" is not a valid item.` });
          setLoading(false);
          return;
        }
        if (selectedItem.quantity < Number(item.quantity)) {
          setMessage({ type: 'error', text: `Insufficient stock for "${item.itemName}"! Only ${selectedItem.quantity} ${selectedItem.unit} available.` });
          setLoading(false);
          return;
        }
      }
    }

    // Upload file if present (for RECEIVE)
    let uploadedFileUrl = '';
    if (type === TransactionType.RECEIVE && selectedFile) {
      setUploadingFile(true);
      const fileResult = await uploadFileToDrive(selectedFile, items.map(i => i.itemName).join('_'));
      setUploadingFile(false);
      if (fileResult.success && fileResult.fileUrl) {
        uploadedFileUrl = fileResult.fileUrl;
      } else {
        setMessage({ type: 'error', text: fileResult.error || 'File upload failed. Transaction will continue without file.' });
      }
    }

    // Submit all items
    setProgress({ current: 0, total: items.length });
    let successCount = 0;
    let failedItems: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress({ current: i + 1, total: items.length });

      const success = await submitTransaction({
        type,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unit: item.unit,
        location: commonData.location,
        personName: commonData.personName,
        notes: commonData.notes,
        fileUrl: i === 0 ? uploadedFileUrl : '' // attach file to first item only
      });

      if (success) {
        successCount++;
      } else {
        failedItems.push(item.itemName);
      }
    }

    setProgress(null);

    if (failedItems.length === 0) {
      setMessage({ type: 'success', text: `All ${successCount} item(s) recorded successfully!` });
      setItems([{ id: nextId++, itemName: '', quantity: '', unit: '' }]);
      setCommonData({ location: '', personName: '', notes: '' });
      removeFile();
      onSuccess();
    } else if (successCount > 0) {
      setMessage({ type: 'error', text: `${successCount} item(s) saved, but failed: ${failedItems.join(', ')}` });
      // Keep only the failed items in the list
      setItems(prev => prev.filter(item => failedItems.includes(item.itemName)));
      onSuccess();
    } else {
      setMessage({ type: 'error', text: 'Failed to record transactions. Check connection.' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card overflow-hidden">
        <div className={`px-6 py-5 ${isIssue ? 'bg-amber-500' : 'bg-emerald-500'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-lg">
              {isIssue ? <ArrowUpRight size={22} className="text-white" /> : <ArrowDownLeft size={22} className="text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isIssue ? 'Issue Stock' : 'Receive Stock'}
              </h2>
              <p className="text-white/80 text-sm">
                {isIssue ? 'Distribute items to floors' : 'Add new stock to inventory'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Items List */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Items ({items.length})</label>

            {items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <SearchableDropdown
                  inventory={inventory}
                  value={item.itemName}
                  onChange={(val) => updateItem(item.id, 'itemName', val)}
                  isIssue={isIssue}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      placeholder="Quantity"
                      className="input-field text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Unit (pcs, kg)"
                      className={`input-field text-sm ${isIssue ? 'bg-gray-100' : ''}`}
                      value={item.unit}
                      readOnly={isIssue}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 py-2.5 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
            <select required className="input-field" value={commonData.location} onChange={(e) => setCommonData({...commonData, location: e.target.value})}>
              <option value="">Select</option>
              {Object.values(FloorLocation).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              {!isIssue && <option value="Vendor">Vendor</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{isIssue ? 'Receiver Name' : 'Supplier Name'}</label>
            <input type="text" required placeholder="Enter name" className="input-field" value={commonData.personName} onChange={(e) => setCommonData({...commonData, personName: e.target.value})} />
          </div>

          {!isIssue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Invoice/Photo (Optional)</label>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
              {!selectedFile ? (
                <div onClick={() => fileInputRef.current?.click()} className="file-upload flex flex-col items-center py-6">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Click to upload</p>
                  <p className="text-gray-400 text-xs">Invoice or photo</p>
                </div>
              ) : (
                <div className="file-upload has-file p-3">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center">
                        <FileImage size={20} className="text-green-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={removeFile} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <input type="text" placeholder="Additional notes..." className="input-field" value={commonData.notes} onChange={(e) => setCommonData({...commonData, notes: e.target.value})} />
          </div>

          {message && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                <Loader2 className="animate-spin" size={16} />
                Submitting item {progress.current} of {progress.total}...
              </div>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || uploadingFile} className={`w-full py-3 rounded-lg text-white font-semibold ${isIssue ? 'btn-warning' : 'btn-success'} disabled:opacity-50 flex justify-center items-center gap-2`}>
            {(loading || uploadingFile) && <Loader2 className="animate-spin" size={18} />}
            {uploadingFile ? 'Uploading...' : (loading ? 'Processing...' : (isIssue ? `Issue ${items.length} Item(s)` : `Receive ${items.length} Item(s)`))}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IssueReceiveForm;
