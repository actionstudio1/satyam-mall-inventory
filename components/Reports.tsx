import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, FloorLocation } from '../types';
import { Download, FileText, Filter, Calendar, ArrowUpRight, ArrowDownLeft, ExternalLink, MapPin, BarChart3, Building2, User, Package, TrendingUp, TrendingDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
  currentUser?: { name: string; email: string; role: string } | null;
}

const Reports: React.FC<Props> = ({ transactions, currentUser }) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeView, setActiveView] = useState<'transactions' | 'floorwise'>('transactions');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'All' || t.type === filterType;
      const matchesLocation = filterLocation === 'All' || t.location === filterLocation;
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && new Date(t.date) >= new Date(startDate);
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        matchesDate = matchesDate && new Date(t.date) < nextDay;
      }
      return matchesType && matchesLocation && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, filterLocation, startDate, endDate]);

  // Summary Stats
  const stats = useMemo(() => {
    const issued = filteredTransactions.filter(t => t.type === TransactionType.ISSUE);
    const received = filteredTransactions.filter(t => t.type === TransactionType.RECEIVE);
    const uniqueItems = new Set(filteredTransactions.map(t => t.itemName)).size;
    const uniqueLocations = new Set(filteredTransactions.map(t => t.location)).size;
    return {
      totalIssued: issued.length,
      totalReceived: received.length,
      issuedQty: issued.reduce((sum, t) => sum + t.quantity, 0),
      receivedQty: received.reduce((sum, t) => sum + t.quantity, 0),
      uniqueItems,
      uniqueLocations
    };
  }, [filteredTransactions]);

  // Floor-wise Summary
  const floorSummary = useMemo(() => {
    const floorMap: Record<string, {
      location: string;
      issued: number;
      received: number;
      issuedQty: number;
      receivedQty: number;
      items: Record<string, { issued: number; received: number; unit: string; persons: Set<string> }>;
      lastActivity: string;
    }> = {};

    filteredTransactions.forEach(t => {
      const loc = t.location;
      if (!floorMap[loc]) {
        floorMap[loc] = {
          location: loc,
          issued: 0,
          received: 0,
          issuedQty: 0,
          receivedQty: 0,
          items: {},
          lastActivity: t.date
        };
      }

      if (t.type === TransactionType.ISSUE) {
        floorMap[loc].issued++;
        floorMap[loc].issuedQty += t.quantity;
      } else {
        floorMap[loc].received++;
        floorMap[loc].receivedQty += t.quantity;
      }

      if (!floorMap[loc].items[t.itemName]) {
        floorMap[loc].items[t.itemName] = { issued: 0, received: 0, unit: t.unit || 'pcs', persons: new Set() };
      }
      if (t.type === TransactionType.ISSUE) {
        floorMap[loc].items[t.itemName].issued += t.quantity;
      } else {
        floorMap[loc].items[t.itemName].received += t.quantity;
      }
      floorMap[loc].items[t.itemName].persons.add(t.personName);

      if (new Date(t.date) > new Date(floorMap[loc].lastActivity)) {
        floorMap[loc].lastActivity = t.date;
      }
    });

    return Object.values(floorMap).sort((a, b) => b.issued + b.received - (a.issued + a.received));
  }, [filteredTransactions]);

  // Get unique locations from transactions
  const allLocations = useMemo(() => {
    const locs = new Set(transactions.map(t => t.location));
    return Array.from(locs).sort();
  }, [transactions]);

  const userName = currentUser?.name || 'Admin';

  const downloadCSV = () => {
    const headers = ["Date", "Type", "Item Name", "Quantity", "Unit", "Location", "Person", "Notes", "File URL"];
    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        `"${t.itemName}"`,
        t.quantity,
        t.unit || '',
        t.location,
        `"${t.personName}"`,
        t.notes ? `"${t.notes}"` : "",
        t.fileUrl || ""
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Satyam Mall", 14, 18);
    doc.setFontSize(11);
    doc.text("Inventory Management Report", 14, 26);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  By: ${userName}`, 14, 34);

    // Filter info
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const filterText = `Filter: ${filterType}${filterLocation !== 'All' ? ' | Location: ' + filterLocation : ''}${startDate ? ' | From: ' + startDate : ''}${endDate ? ' | To: ' + endDate : ''}`;
    doc.text(filterText, pageWidth - 14, 34, { align: 'right' });

    // Summary Stats Box
    let y = 48;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 24, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Records: ${filteredTransactions.length}`, 20, y + 9);
    doc.text(`Issued: ${stats.totalIssued} (${stats.issuedQty} units)`, 80, y + 9);
    doc.text(`Received: ${stats.totalReceived} (${stats.receivedQty} units)`, 145, y + 9);
    doc.text(`Items: ${stats.uniqueItems}  |  Locations: ${stats.uniqueLocations}`, 20, y + 18);

    y = y + 30;

    // Transaction Table
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("Transaction Details", 14, y);
    y += 5;

    autoTable(doc, {
      head: [["Date", "Type", "Item", "Qty", "Unit", "Location", "Person", "Notes"]],
      body: filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        t.type,
        t.itemName,
        t.quantity.toString(),
        t.unit || '',
        t.location,
        t.personName,
        t.notes || ''
      ]),
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 16 },
        2: { cellWidth: 30 },
        3: { cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 26 },
        6: { cellWidth: 26 },
        7: { cellWidth: 'auto' }
      }
    });

    // Floor-wise Summary on new page
    if (floorSummary.length > 0) {
      doc.addPage();

      // Header on new page
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("Floor-wise / Location Summary", 14, 20);

      y = 40;

      floorSummary.forEach((floor) => {
        // Check if we need a new page
        const itemCount = Object.keys(floor.items).length;
        const neededHeight = 30 + (itemCount * 8);
        if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }

        // Location header
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(floor.location, 20, y + 9);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Issued: ${floor.issued} txn (${floor.issuedQty} units)  |  Received: ${floor.received} txn (${floor.receivedQty} units)  |  Last: ${new Date(floor.lastActivity).toLocaleDateString('en-IN')}`, pageWidth - 20, y + 9, { align: 'right' });

        y += 18;

        // Items table for this location
        const itemRows = Object.entries(floor.items).map(([name, data]) => [
          name,
          data.issued > 0 ? `${data.issued} ${data.unit}` : '-',
          data.received > 0 ? `${data.received} ${data.unit}` : '-',
          Array.from(data.persons).join(', ')
        ]);

        autoTable(doc, {
          head: [["Item", "Issued", "Received", "Persons Involved"]],
          body: itemRows,
          startY: y,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [100, 116, 139], fontSize: 7, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 },
            3: { cellWidth: 'auto' }
          },
          margin: { left: 14, right: 14 }
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Satyam Mall Inventory System  |  Report by: ${userName}  |  Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`satyam_mall_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Detailed Floor PDF
  const downloadFloorPDF = (floorData: typeof floorSummary[0]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(floorData.location, 14, 16);
    doc.setFontSize(10);
    doc.text("Detailed Location Report", 14, 24);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  By: ${userName}`, 14, 31);

    // Stats
    let y = 44;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 18, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Issued: ${floorData.issued} transactions (${floorData.issuedQty} units)`, 20, y + 8);
    doc.text(`Total Received: ${floorData.received} transactions (${floorData.receivedQty} units)`, 20, y + 14);
    doc.text(`Last Activity: ${new Date(floorData.lastActivity).toLocaleDateString('en-IN')}`, pageWidth - 20, y + 8, { align: 'right' });

    y += 26;

    // Item-wise breakdown
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Item-wise Breakdown", 14, y);
    y += 5;

    const itemRows = Object.entries(floorData.items).map(([name, data]) => [
      name,
      data.issued > 0 ? `${data.issued} ${data.unit}` : '-',
      data.received > 0 ? `${data.received} ${data.unit}` : '-',
      data.unit,
      Array.from(data.persons).join(', ')
    ]);

    autoTable(doc, {
      head: [["Item Name", "Total Issued", "Total Received", "Unit", "Persons"]],
      body: itemRows,
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // All transactions for this location
    const locationTransactions = filteredTransactions.filter(t => t.location === floorData.location);

    if (y + 20 > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("All Transactions", 14, y);
    y += 5;

    autoTable(doc, {
      head: [["Date", "Type", "Item", "Qty", "Person", "Notes"]],
      body: locationTransactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        t.type,
        t.itemName,
        `${t.quantity} ${t.unit || ''}`,
        t.personName,
        t.notes || '-'
      ]),
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [100, 116, 139], fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Satyam Mall  |  ${floorData.location} Report  |  By: ${userName}  |  Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`${floorData.location.replace(/\s+/g, '_')}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><BarChart3 size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Records</p>
              <p className="text-xl font-bold text-gray-900">{filteredTransactions.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg"><TrendingUp size={18} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Issued</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalIssued} <span className="text-xs text-gray-400 font-normal">({stats.issuedQty} units)</span></p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg"><TrendingDown size={18} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Received</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalReceived} <span className="text-xs text-gray-400 font-normal">({stats.receivedQty} units)</span></p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg"><Package size={18} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Items / Locations</p>
              <p className="text-xl font-bold text-gray-900">{stats.uniqueItems} <span className="text-xs text-gray-400 font-normal">/ {stats.uniqueLocations}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setActiveView('transactions')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'transactions' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <FileText size={14} className="inline mr-1.5" />Transactions
                </button>
                <button onClick={() => setActiveView('floorwise')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'floorwise' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Building2 size={14} className="inline mr-1.5" />Floor-wise
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
                <FileText size={14} /> CSV
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
                <Download size={14} /> Full PDF
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <select className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary-500 focus:outline-none" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value={TransactionType.ISSUE}>Issue</option>
                  <option value={TransactionType.RECEIVE}>Receive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <select className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary-500 focus:outline-none" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                  <option value="All">All Locations</option>
                  {allLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary-500 focus:outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-primary-500 focus:outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterType('All'); setFilterLocation('All'); setStartDate(''); setEndDate(''); }} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white">Reset</button>
            </div>
          </div>
        </div>

        {/* Transactions View */}
        {activeView === 'transactions' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-left font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                    <th className="px-4 py-3 text-left font-semibold">Person</th>
                    <th className="px-4 py-3 text-left font-semibold">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.type === TransactionType.RECEIVE ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.type === TransactionType.RECEIVE ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.itemName}</td>
                      <td className="px-4 py-3"><span className="font-semibold">{t.quantity}</span> <span className="text-gray-400 text-xs">{t.unit}</span></td>
                      <td className="px-4 py-3 text-gray-600">{t.location}</td>
                      <td className="px-4 py-3 text-gray-600">{t.personName}</td>
                      <td className="px-4 py-3">
                        {t.fileUrl ? (
                          <a href={t.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium">
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1"><User size={12} /> Report by: {userName}</span>
              <span className="text-xs text-gray-500">{filteredTransactions.length} records</span>
            </div>
          </>
        )}

        {/* Floor-wise View */}
        {activeView === 'floorwise' && (
          <div className="p-4 space-y-4">
            {floorSummary.length > 0 ? floorSummary.map((floor) => (
              <div key={floor.location} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Floor Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Building2 size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{floor.location}</h3>
                      <p className="text-xs text-gray-500">Last activity: {new Date(floor.lastActivity).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                      <ArrowUpRight size={12} /> {floor.issued} issued ({floor.issuedQty} units)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                      <ArrowDownLeft size={12} /> {floor.received} received ({floor.receivedQty} units)
                    </span>
                    <button onClick={() => downloadFloorPDF(floor)} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
                      <Download size={12} /> PDF
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Issued</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Received</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Persons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(floor.items).map(([name, data]) => (
                        <tr key={name} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-2.5">
                            {data.issued > 0 ? (
                              <span className="text-amber-600 font-semibold">{data.issued} {data.unit}</span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {data.received > 0 ? (
                              <span className="text-green-600 font-semibold">{data.received} {data.unit}</span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{Array.from(data.persons).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No location data found</p>
                <p className="text-sm mt-1">Adjust filters to see results</p>
              </div>
            )}

            <div className="text-right">
              <span className="text-xs text-gray-400 flex items-center justify-end gap-1"><User size={12} /> Report by: {userName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
