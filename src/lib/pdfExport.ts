import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KhataPerson, KhataTransaction, Expense, LongTermLoan } from '../types';

export function formatINR(val: number): string {
  return 'Rs. ' + Math.round(val).toLocaleString('en-IN');
}

export function generateKhataPdf(options: {
  people: KhataPerson[];
  transactions: KhataTransaction[];
  personId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const targetPerson = options.personId
    ? options.people.find(p => p.id === options.personId)
    : null;

  // Filter transactions
  let txs = options.transactions;
  if (options.personId) {
    txs = txs.filter(t => t.personId === options.personId);
  }
  if (options.startDate) {
    txs = txs.filter(t => t.date >= options.startDate!);
  }
  if (options.endDate) {
    txs = txs.filter(t => t.date <= options.endDate!);
  }

  // Calculate totals
  let totalGiven = 0;
  let totalReceived = 0;
  let totalBorrowed = 0;

  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'Money Given' || t.type === 'Short-Term Loan Given') {
      totalGiven += amt;
    } else if (t.type === 'Money Received' || t.type === 'Loan Return') {
      totalReceived += amt;
    } else if (t.type === 'Short-Term Loan Borrowed') {
      totalBorrowed += amt;
    }
  }

  const netReceivable = Math.max(0, totalGiven - totalReceived);
  const netPayable = Math.max(0, totalBorrowed);

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SHUBHAM MONEY MANAGER', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    targetPerson
      ? `PERSON LEDGER REPORT — ${targetPerson.name.toUpperCase()}`
      : 'KHATA / SHORT-TERM TRANSACTIONS REPORT',
    14,
    22
  );
  doc.text(`User: Shubham Godage | Date: ${todayStr}`, 14, 28);

  // Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 26, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL SUMMARY', 20, 49);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Given: ${formatINR(totalGiven)}`, 20, 56);
  doc.text(`Total Received Back: ${formatINR(totalReceived)}`, 20, 62);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`Net Receivable: ${formatINR(netReceivable)}`, 110, 56);
  doc.setTextColor(239, 68, 68); // rose
  doc.text(`Net Payable: ${formatINR(netPayable)}`, 110, 62);

  // Transactions Table
  const tableRows = txs.map(t => [
    t.date,
    t.personName,
    t.type,
    t.paymentMethod,
    t.utrNumber || 'N/A (Cash)',
    formatINR(t.amount)
  ]);

  autoTable(doc, {
    startY: 74,
    head: [['Date', 'Person', 'Transaction Type', 'Method', 'UTR / Ref', 'Amount']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32 },
      2: { cellWidth: 40 },
      3: { cellWidth: 26 },
      4: { cellWidth: 34 },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer Note
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Financial Document — Shubham Godage | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  const fileName = targetPerson
    ? `Khata_${targetPerson.name.replace(/\s+/g, '_')}_${todayStr}.pdf`
    : `Khata_All_Transactions_${todayStr}.pdf`;
  doc.save(fileName);
}

export function generateExpensesPdf(options: {
  expenses: Expense[];
  categoryFilter?: string;
  startDate?: string;
  endDate?: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let list = options.expenses;
  if (options.categoryFilter && options.categoryFilter !== 'All') {
    list = list.filter(e => e.category === options.categoryFilter);
  }
  if (options.startDate) {
    list = list.filter(e => e.date >= options.startDate!);
  }
  if (options.endDate) {
    list = list.filter(e => e.date <= options.endDate!);
  }

  const totalExpense = list.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SHUBHAM MONEY MANAGER', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PERSONAL EXPENSES FINANCIAL REPORT', 14, 22);
  doc.text(`User: Shubham Godage | Date: ${todayStr}`, 14, 28);

  // Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 22, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPENSE SUMMARY', 20, 49);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Records: ${list.length}`, 20, 57);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(`Total Amount: ${formatINR(totalExpense)}`, 120, 57);

  // Table
  const rows = list.map(e => [
    e.date,
    e.category,
    e.paymentMethod,
    e.utrNumber || 'N/A (Cash)',
    e.notes || '-',
    formatINR(e.amount)
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Category', 'Method', 'UTR / Ref', 'Notes', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 26 },
      2: { cellWidth: 28 },
      3: { cellWidth: 32 },
      4: { cellWidth: 46 },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Financial Document — Shubham Godage | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  doc.save(`Personal_Expenses_Report_${todayStr}.pdf`);
}

export function generateLoansPdf(options: {
  loans: LongTermLoan[];
  statusFilter?: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let list = options.loans;
  if (options.statusFilter && options.statusFilter !== 'All') {
    list = list.filter(l => l.status === options.statusFilter);
  }

  let totalPrincipal = 0;
  let totalRepaid = 0;

  for (const l of list) {
    totalPrincipal += Number(l.originalAmount) || 0;
    const repSum = (l.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    totalRepaid += repSum;
  }
  const totalOutstanding = totalPrincipal - totalRepaid;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SHUBHAM MONEY MANAGER', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LONG-TERM LOANS & REPAYMENTS AUDIT REPORT', 14, 22);
  doc.text(`User: Shubham Godage | Date: ${todayStr}`, 14, 28);

  // Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 24, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LOAN PORTFOLIO SUMMARY', 20, 48);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Original Principal: ${formatINR(totalPrincipal)}`, 20, 55);
  doc.text(`Total Recovered / Repaid: ${formatINR(totalRepaid)}`, 20, 61);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6); // amber
  doc.text(`Active Outstanding: ${formatINR(totalOutstanding)}`, 110, 55);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Loans Tracked: ${list.length}`, 110, 61);

  // Table
  const rows = list.map(l => {
    const repaid = (l.repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const balance = l.originalAmount - repaid;
    return [
      l.personName,
      l.loanType,
      formatINR(l.originalAmount),
      formatINR(repaid),
      formatINR(balance),
      l.expectedReturnDate,
      l.status
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['Person', 'Type', 'Principal', 'Repaid', 'Remaining', 'Return By', 'Status']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24 },
      6: { cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Financial Document — Shubham Godage | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  doc.save(`Long_Term_Loans_Report_${todayStr}.pdf`);
}
