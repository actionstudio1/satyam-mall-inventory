import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, InventoryItem, FloorLocation } from '../types';
import { submitTransaction, uploadFileToDrive } from '../services/sheetService';
import { CheckCircle, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft, Package, Upload, X, FileImage } from 'lucide-react';

interface Props {
  type: TransactionType;
  inventory: InventoryItem[];
  onSuccess: () => void;
}

const IssueReceiveForm: React.FC<Props> = ({ type, inventory, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    unit: '',
    location: '',
    personName: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.itemName) {
      const item = inventory.find(i => i.name === formData.itemName);
      if (item) setFormData(prev => ({ ...prev, unit: item.unit }));
    }
  }, [formData.itemName, inventory]);

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

    const selectedItem = inventory.find(i => i.name === formData.itemName);
    if (type === TransactionType.ISSUE) {
      if (!selectedItem) {
        setMessage({ type: 'error', text: 'Please select a valid item.' });
        setLoading(false);
        return;
      }
      if (selectedItem.quantity < Number(formData.quantity)) {
        setMessage({ type: 'error', text: `Insufficient stock! Only ${selectedItem.quantity} ${selectedItem.unit} available.` });
        setLoading(false);
        return;
      }
    }

    let uploadedFileUrl = '';
    if (type === TransactionType.RECEIVE && selectedFile) {
      setUploadingFile(true);
      const fileResult = await uploadFileToDrive(selectedFile, formData.itemName);
      setUploadingFile(false);
      if (fileResult.success && fileResult.fileUrl) {
        uploadedFileUrl = fileResult.fileUrl;
      } else {
        setMessage({ type: 'error', text: fileResult.error || 'File upload failed. Transaction will continue without file.' });
      }
    }

    const success = await submitTransaction({
      type,
      itemName: formData.itemName,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      location: formData.location,
      personName: formData.personName,
      notes: formData.notes,
      fileUrl: uploadedFileUrl
    });

    if (success) {
      setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
      setFormData({ itemName: '', quantity: '', unit: '', location: '', personName: '', notes: '' });
      removeFile();
      onSuccess();
    } else {
      setMessage({ type: 'error', text: 'Failed to record transaction. Check connection.' });
    }
    setLoading(false);
  };

  const isIssue = type === TransactionType.ISSUE;

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
            {isIssue ? (
              <select required className="input-field" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})}>
                <option value="">Select Item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name}>{item.name} (Available: {item.quantity} {item.unit})</option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <Package className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  list="item-suggestions"
                  placeholder="Enter Item Name"
                  className="input-field pl-10"
                  value={formData.itemName}
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                />
                <datalist id="item-suggestions">
                  {inventory.map(item => <option key={item.id} value={item.name} />)}
                </datalist>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input type="number" step="0.01" required min="0" placeholder="0" className="input-field" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
              <input type="text" required placeholder="pcs, kg" className={`input-field ${isIssue ? 'bg-gray-50' : ''}`} value={formData.unit} readOnly={isIssue} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <select required className="input-field" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}>
                <option value="">Select</option>
                {Object.values(FloorLocation).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                {!isIssue && <option value="Vendor">Vendor</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{isIssue ? 'Receiver Name' : 'Supplier Name'}</label>
            <input type="text" required placeholder="Enter name" className="input-field" value={formData.personName} onChange={(e) => setFormData({...formData, personName: e.target.value})} />
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
            <input type="text" placeholder="Additional notes..." className="input-field" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>

          {message && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <button type="submit" disabled={loading || uploadingFile} className={`w-full py-3 rounded-lg text-white font-semibold ${isIssue ? 'btn-warning' : 'btn-success'} disabled:opacity-50 flex justify-center items-center gap-2`}>
            {(loading || uploadingFile) && <Loader2 className="animate-spin" size={18} />}
            {uploadingFile ? 'Uploading...' : (loading ? 'Processing...' : (isIssue ? 'Issue Stock' : 'Receive Stock'))}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IssueReceiveForm;
