// VERCEL_UPDATE: This is the i18n version with useTranslations
'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePermissions } from '@/hooks/usePermissions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from '@/styles/pages/reports.module.css';

type Props = {
  params: Promise<{ locale: string }>;
};

// ==================== تعريف الأنواع ====================

interface SalesSummaryData {
  totalInvoices: number;
  totalQuantity: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

interface SalesReportResponse {
  summary: SalesSummaryData;
  byProduct: Array<{ _id: string; totalQuantity: number; totalAmount: number }>;
  byStatus: Array<{ _id: string; count: number; totalAmount: number }>;
}

interface ProductionSummaryData {
  totalProduction: number;
  totalRawMaterialsCost: number;
  totalEnergyCost: number;
  totalLaborCost: number;
  totalMaintenanceCost: number;
  totalOtherCosts: number;
  totalCost: number;
  avgCostPerTon: number;
}

interface ProductionReportResponse {
  summary: ProductionSummaryData;
  monthlyData: Array<{ _id: string; totalProduction: number; totalCost: number; avgCostPerTon: number }>;
}

interface PayrollSummaryData {
  totalEmployees: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNetSalary: number;
}

interface PayrollReportResponse {
  summary: PayrollSummaryData;
  byDepartment: Array<{ _id: string; totalEmployees: number; totalNetSalary: number }>;
}

interface TaxSummaryItem {
  _id: string;
  totalDeclarations: number;
  totalTaxableBase: number;
  totalTaxAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

interface TaxReportResponse {
  summary: TaxSummaryItem[];
  monthlyData: Array<{ _id: string; totalAmount: number; totalPaid: number }>;
}

interface AISection {
  title: string;
  icon: string;
  score: number;
  status: string;
  analysis: string;
  highlights: string[];
  issues: string[];
  recommendations: string[];
}

interface AIReportData {
  overallScore: number;
  overallStatus: string;
  executiveSummary: string;
  sections: AISection[];
  topPriorities: string[];
  forecast: string;
}

type TabType = 'ai' | 'sales' | 'production' | 'payroll' | 'taxes';

// ==================== دوال مساعدة للتصدير ====================

type ExportDataRow = (string | number)[];

const exportToCSV = (data: ExportDataRow[], headers: string[], filename: string): void => {
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
    csvRows.push(row.join(','));
  }
  const csvContent = csvRows.join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToPDF = async (title: string, headers: string[], data: ExportDataRow[], filename: string): Promise<void> => {
  const element = document.createElement('div');
  element.style.direction = 'rtl';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.padding = '20px';
  element.style.backgroundColor = 'white';
  element.style.width = '800px';
  
  const titleEl = document.createElement('h1');
  titleEl.textContent = title;
  titleEl.style.textAlign = 'center';
  titleEl.style.color = '#2C3E50';
  titleEl.style.marginBottom = '10px';
  titleEl.style.fontSize = '24px';
  element.appendChild(titleEl);
  
  const dateEl = document.createElement('p');
  dateEl.textContent = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-DZ')}`;
  dateEl.style.textAlign = 'center';
  dateEl.style.color = '#666';
  dateEl.style.marginBottom = '20px';
  dateEl.style.fontSize = '12px';
  element.appendChild(dateEl);
  
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.direction = 'rtl';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.backgroundColor = '#1ABC9C';
  for (const header of headers) {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.padding = '10px';
    th.style.border = '1px solid #ddd';
    th.style.color = 'white';
    th.style.textAlign = 'center';
    th.style.fontWeight = 'bold';
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  for (let i = 0; i < data.length; i++) {
    const row = document.createElement('tr');
    row.style.backgroundColor = i % 2 === 0 ? '#f9f9f9' : 'white';
    for (const cell of data[i]) {
      const td = document.createElement('td');
      td.textContent = cell.toString();
      td.style.padding = '8px';
      td.style.border = '1px solid #ddd';
      td.style.textAlign = 'center';
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  element.appendChild(table);
  
  document.body.appendChild(element);
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('حدث خطأ في إنشاء ملف PDF');
  } finally {
    document.body.removeChild(element);
  }
};

// ==================== مكونات التقارير المحاسبية ====================

function SalesReport({ startDate, endDate, t, tCommon }: { startDate: string; endDate: string; t: (key: string) => string; tCommon: (key: string) => string }) {
  const [data, setData] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSalesReport = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/reports/sales?type=summary&startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error('Error fetching sales report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesReport();
  }, [startDate, endDate]);

  const handleExportCSV = (): void => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalInvoices'), data.summary.totalInvoices],
      [t('totalQuantity'), data.summary.totalQuantity],
      [t('totalAmount'), data.summary.totalAmount],
      [t('totalPaid'), data.summary.totalPaid],
      [t('totalRemaining'), data.summary.totalRemaining],
    ];
    exportToCSV(rows, headers, 'sales_report');
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalInvoices'), data.summary.totalInvoices],
      [t('totalQuantity'), data.summary.totalQuantity],
      [t('totalAmount'), data.summary.totalAmount],
      [t('totalPaid'), data.summary.totalPaid],
      [t('totalRemaining'), data.summary.totalRemaining],
    ];
    await exportToPDF(t('title'), headers, rows, 'sales_report');
  };

  const handlePrint = (): void => {
    window.print();
  };

  if (loading) return <div className={styles.loadingSmall}>{tCommon('loading')}</div>;
  if (!data) return <div className={styles.emptySmall}>{tCommon('noData')}</div>;

  const summary = data.summary;

  return (
    <div className={styles.reportContainer}>
      <div className={styles.reportHeaderButtons}>
        <button onClick={handlePrint} className={styles.printBtn}>🖨️ {tCommon('print')}</button>
        <button onClick={handleExportCSV} className={styles.exportBtnCSV}>📥 CSV</button>
        <button onClick={handleExportPDF} className={styles.exportBtnPDF}>📄 PDF</button>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalInvoices')}</div>
          <div className={styles.statValue}>{summary.totalInvoices || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalQuantity')}</div>
          <div className={styles.statValue}>{(summary.totalQuantity || 0).toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalAmount')}</div>
          <div className={styles.statValue}>{(summary.totalAmount || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalPaid')}</div>
          <div className={styles.statValueGreen}>{(summary.totalPaid || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalRemaining')}</div>
          <div className={styles.statValueRed}>{(summary.totalRemaining || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
      </div>
    </div>
  );
}

function ProductionReport({ startDate, endDate, t, tCommon }: { startDate: string; endDate: string; t: (key: string) => string; tCommon: (key: string) => string }) {
  const [data, setData] = useState<ProductionReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProductionReport = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/reports/production?type=summary&startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error('Error fetching production report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductionReport();
  }, [startDate, endDate]);

  const handleExportCSV = (): void => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalProduction'), data.summary.totalProduction],
      [t('rawMaterialsCosts'), data.summary.totalRawMaterialsCost],
      [t('energyCosts'), data.summary.totalEnergyCost],
      [t('laborCosts'), data.summary.totalLaborCost],
      [t('maintenanceCosts'), data.summary.totalMaintenanceCost],
      [t('totalCost'), data.summary.totalCost],
      [t('costPerTon'), data.summary.avgCostPerTon],
    ];
    exportToCSV(rows, headers, 'production_report');
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalProduction'), data.summary.totalProduction],
      [t('rawMaterialsCosts'), data.summary.totalRawMaterialsCost],
      [t('energyCosts'), data.summary.totalEnergyCost],
      [t('laborCosts'), data.summary.totalLaborCost],
      [t('maintenanceCosts'), data.summary.totalMaintenanceCost],
      [t('totalCost'), data.summary.totalCost],
      [t('costPerTon'), data.summary.avgCostPerTon],
    ];
    await exportToPDF(t('title'), headers, rows, 'production_report');
  };

  const handlePrint = (): void => {
    window.print();
  };

  if (loading) return <div className={styles.loadingSmall}>{tCommon('loading')}</div>;
  if (!data) return <div className={styles.emptySmall}>{tCommon('noData')}</div>;

  const summary = data.summary;

  return (
    <div className={styles.reportContainer}>
      <div className={styles.reportHeaderButtons}>
        <button onClick={handlePrint} className={styles.printBtn}>🖨️ {tCommon('print')}</button>
        <button onClick={handleExportCSV} className={styles.exportBtnCSV}>📥 CSV</button>
        <button onClick={handleExportPDF} className={styles.exportBtnPDF}>📄 PDF</button>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalProduction')}</div>
          <div className={styles.statValue}>{(summary.totalProduction || 0).toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('rawMaterialsCosts')}</div>
          <div className={styles.statValue}>{(summary.totalRawMaterialsCost || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('energyCosts')}</div>
          <div className={styles.statValue}>{(summary.totalEnergyCost || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('laborCosts')}</div>
          <div className={styles.statValue}>{(summary.totalLaborCost || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('maintenanceCosts')}</div>
          <div className={styles.statValue}>{(summary.totalMaintenanceCost || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalCost')}</div>
          <div className={styles.statValue}>{(summary.totalCost || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('costPerTon')}</div>
          <div className={styles.statValueBlue}>{(summary.avgCostPerTon || 0).toLocaleString()} {tCommon('currency')}/{tCommon('ton')}</div>
        </div>
      </div>
    </div>
  );
}

function PayrollReport({ startDate, endDate, t, tCommon }: { startDate: string; endDate: string; t: (key: string) => string; tCommon: (key: string) => string }) {
  const [data, setData] = useState<PayrollReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPayrollReport = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/reports/payroll?type=summary&startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error('Error fetching payroll report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrollReport();
  }, [startDate, endDate]);

  const handleExportCSV = (): void => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalEmployees'), data.summary.totalEmployees],
      [t('totalBaseSalary'), data.summary.totalBaseSalary],
      [t('totalAllowances'), data.summary.totalAllowances],
      [t('totalBonuses'), data.summary.totalBonuses],
      [t('totalDeductions'), data.summary.totalDeductions],
      [t('netSalary'), data.summary.totalNetSalary],
    ];
    exportToCSV(rows, headers, 'payroll_report');
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!data) return;
    const headers: string[] = [tCommon('statement'), tCommon('value')];
    const rows: ExportDataRow[] = [
      [t('totalEmployees'), data.summary.totalEmployees],
      [t('totalBaseSalary'), data.summary.totalBaseSalary],
      [t('totalAllowances'), data.summary.totalAllowances],
      [t('totalBonuses'), data.summary.totalBonuses],
      [t('totalDeductions'), data.summary.totalDeductions],
      [t('netSalary'), data.summary.totalNetSalary],
    ];
    await exportToPDF(t('title'), headers, rows, 'payroll_report');
  };

  const handlePrint = (): void => {
    window.print();
  };

  if (loading) return <div className={styles.loadingSmall}>{tCommon('loading')}</div>;
  if (!data) return <div className={styles.emptySmall}>{tCommon('noData')}</div>;

  const summary = data.summary;

  return (
    <div className={styles.reportContainer}>
      <div className={styles.reportHeaderButtons}>
        <button onClick={handlePrint} className={styles.printBtn}>🖨️ {tCommon('print')}</button>
        <button onClick={handleExportCSV} className={styles.exportBtnCSV}>📥 CSV</button>
        <button onClick={handleExportPDF} className={styles.exportBtnPDF}>📄 PDF</button>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalEmployees')}</div>
          <div className={styles.statValue}>{summary.totalEmployees || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalBaseSalary')}</div>
          <div className={styles.statValue}>{(summary.totalBaseSalary || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalAllowances')}</div>
          <div className={styles.statValue}>{(summary.totalAllowances || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalBonuses')}</div>
          <div className={styles.statValue}>{(summary.totalBonuses || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('totalDeductions')}</div>
          <div className={styles.statValueRed}>{(summary.totalDeductions || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('netSalary')}</div>
          <div className={styles.statValueGreen}>{(summary.totalNetSalary || 0).toLocaleString()} {tCommon('currency')}</div>
        </div>
      </div>
    </div>
  );
}

function TaxReport({ startDate, endDate, t, tCommon }: { startDate: string; endDate: string; t: (key: string) => string; tCommon: (key: string) => string }) {
  const [data, setData] = useState<TaxReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTaxReport = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/reports/taxes?type=summary&startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error('Error fetching tax report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTaxReport();
  }, [startDate, endDate]);

  const handleExportCSV = (): void => {
    if (!data) return;
    const headers: string[] = [t('taxType'), t('taxAmount'), t('totalPaid'), t('totalRemaining')];
    const rows: ExportDataRow[] = data.summary.map(item => [
      item._id,
      item.totalTaxAmount,
      item.totalPaid,
      item.totalRemaining,
    ]);
    exportToCSV(rows, headers, 'tax_report');
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!data) return;
    const headers: string[] = [t('taxType'), t('taxAmount'), t('totalPaid'), t('totalRemaining')];
    const rows: ExportDataRow[] = data.summary.map(item => [
      item._id,
      item.totalTaxAmount,
      item.totalPaid,
      item.totalRemaining,
    ]);
    await exportToPDF(t('title'), headers, rows, 'tax_report');
  };

  const handlePrint = (): void => {
    window.print();
  };

  if (loading) return <div className={styles.loadingSmall}>{tCommon('loading')}</div>;
  if (!data) return <div className={styles.emptySmall}>{tCommon('noData')}</div>;

  const summary = data.summary;

  return (
    <div className={styles.reportContainer}>
      <div className={styles.reportHeaderButtons}>
        <button onClick={handlePrint} className={styles.printBtn}>🖨️ {tCommon('print')}</button>
        <button onClick={handleExportCSV} className={styles.exportBtnCSV}>📥 CSV</button>
        <button onClick={handleExportPDF} className={styles.exportBtnPDF}>📄 PDF</button>
      </div>
      <div className={styles.statsGrid}>
        {summary.map((item, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statLabel}>{item._id}</div>
            <div className={styles.statValue}>{(item.totalTaxAmount || 0).toLocaleString()} {tCommon('currency')}</div>
            <div className={styles.statSmall}>{t('totalPaid')}: {(item.totalPaid || 0).toLocaleString()} {tCommon('currency')}</div>
            <div className={styles.statSmallRed}>{t('totalRemaining')}: {(item.totalRemaining || 0).toLocaleString()} {tCommon('currency')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== الصفحة الرئيسية ====================

const statusClass = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case t('excellent'): return styles.statusExcellent;
    case t('good'):      return styles.statusGood;
    case t('average'):   return styles.statusAverage;
    case t('poor'):      return styles.statusPoor;
    default:             return styles.statusDefault;
  }
};

const scoreClass = (score: number): string => {
  if (score >= 80) return styles.scoreExcellent;
  if (score >= 60) return styles.scoreGood;
  if (score >= 40) return styles.scoreAverage;
  return styles.scorePoor;
};

export default function ReportsPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations('Reports');
  const tCommon = useTranslations('Common');
  const { can } = usePermissions();
  
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [aiData, setAiData] = useState<AIReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ✅ تمرير اللغة إلى API
  const fetchAIReport = async (lang: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/report-analysis?locale=${lang}`);
      const json = await res.json();
      if (json.success) {
        setAiData(json.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching AI report', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ إعادة جلب التقرير عند تغيير اللغة
  useEffect(() => {
    fetchAIReport(locale);
  }, [locale]);

  // ✅ التبويبات مع صلاحياتها
  const allTabs: { id: TabType; label: string; icon: string; permission: string }[] = [
    { id: 'ai', label: t('aiTab'), icon: '🤖', permission: 'reports.ai' },
    { id: 'sales', label: t('salesTab'), icon: '💰', permission: 'accounting.sales.view' },
    { id: 'production', label: t('productionTab'), icon: '🏭', permission: 'accounting.production.view' },
    { id: 'payroll', label: t('payrollTab'), icon: '👥', permission: 'accounting.payroll.view' },
    { id: 'taxes', label: t('taxesTab'), icon: '📑', permission: 'accounting.taxes.view' },
  ];

  const tabs = allTabs.filter(tab => can(tab.permission));

  // تعيين التبويب النشط الأول
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id as TabType);
    }
  }, [tabs, activeTab]);

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerRight}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>📊</span>
              <h1 className={styles.title}>{t('title')}</h1>
            </div>
            <p className={styles.subtitle}>{t('subtitle')}</p>
            {lastUpdated && activeTab === 'ai' && (
              <p className={styles.lastUpdated}>{t('lastUpdated')} {lastUpdated.toLocaleTimeString(locale === 'ar' ? 'ar-DZ' : 'en-US')}</p>
            )}
          </div>
          <div className={styles.headerButtons}>
            {activeTab === 'ai' && (
              <button onClick={() => fetchAIReport(locale)} disabled={loading} className={styles.refreshButton}>
                {loading ? `⏳ ${t('analyzing')}` : `🔄 ${t('refresh')}`}
              </button>
            )}
          </div>
        </div>

        {activeTab !== 'ai' && (
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('fromDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.filterInput} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('toDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.filterInput} />
            </div>
          </div>
        )}

        {tabs.length > 0 ? (
          <>
            <div className={styles.tabsContainer}>
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}>
                  <span className={styles.tabIcon}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'ai' && (
                <>
                  {loading && (
                    <div className={styles.loadingCard}>
                      <div className={styles.loadingIcon}>🤖</div>
                      <p className={styles.loadingTitle}>{t('analyzing')}</p>
                      <p className={styles.loadingSubtitle}>{t('aiDescription')}</p>
                    </div>
                  )}
                  {!loading && aiData && (
                    <>
                      <div className={styles.overallCard}>
                        <div className={styles.scoreCircleWrapper}>
                          <div className={`${styles.scoreCircle} ${scoreClass(aiData.overallScore)}`}>
                            <span className={styles.scoreNumber}>{aiData.overallScore}</span>
                            <span className={styles.scoreMax}>/ 100</span>
                          </div>
                          <span className={`${styles.badge} ${statusClass(aiData.overallStatus, t)}`}>{aiData.overallStatus}</span>
                        </div>
                        <div className={styles.summaryBlock}>
                          <h2 className={styles.summaryTitle}>{t('executiveSummary')}</h2>
                          <p className={styles.summaryText}>{aiData.executiveSummary}</p>
                        </div>
                      </div>
                      {aiData.topPriorities.length > 0 && (
                        <div className={styles.prioritiesCard}>
                          <h3 className={styles.prioritiesTitle}>🚨 {t('topPriorities')}</h3>
                          <div className={styles.prioritiesList}>
                            {aiData.topPriorities.map((p, i) => (
                              <div key={i} className={styles.priorityItem}>
                                <span className={styles.priorityNumber}>{i + 1}</span>
                                <span className={styles.priorityText}>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className={styles.sectionsGrid}>
                        {aiData.sections.map((section, i) => (
                          <div key={i} className={`${styles.sectionCard}`}>
                            <div className={styles.sectionHeader}>
                              <div className={styles.sectionTitleRow}>
                                <span className={styles.sectionIcon}>{section.icon}</span>
                                <h3 className={styles.sectionTitle}>{section.title}</h3>
                              </div>
                              <div className={styles.sectionScore}>
                                <span className={`${styles.sectionScoreNum} ${scoreClass(section.score)}`}>{section.score}%</span>
                                <span className={`${styles.badge} ${statusClass(section.status, t)}`}>{section.status}</span>
                              </div>
                            </div>
                            <div className={styles.scoreBar}>
                              <div className={`${styles.scoreBarFill} ${scoreClass(section.score)}`} style={{ width: `${section.score}%` }} />
                            </div>
                            <p className={styles.sectionAnalysis}>{section.analysis}</p>
                            <div className={styles.sectionDetails}>
                              {section.highlights.length > 0 && (
                                <div>
                                  <p className={styles.detailLabelSuccess}>✅ {t('highlights')}</p>
                                  {section.highlights.map((h, j) => <p key={j} className={styles.detailItem}>• {h}</p>)}
                                </div>
                              )}
                              {section.issues.length > 0 && (
                                <div>
                                  <p className={styles.detailLabelDanger}>⚠️ {t('issues')}</p>
                                  {section.issues.map((issue, j) => <p key={j} className={styles.detailItem}>• {issue}</p>)}
                                </div>
                              )}
                            </div>
                            {section.recommendations.length > 0 && (
                              <div className={styles.recommendations}>
                                <p className={styles.detailLabelWarning}>🔧 {t('recommendations')}</p>
                                {section.recommendations.map((r, j) => <p key={j} className={styles.detailItem}>• {r}</p>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {aiData.forecast && (
                        <div className={styles.forecastCard}>
                          <h3 className={styles.forecastTitle}>🔮 {t('forecast')}</h3>
                          <p className={styles.forecastText}>{aiData.forecast}</p>
                        </div>
                      )}
                    </>
                  )}
                  {!loading && !aiData && (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📊</div>
                      <p className={styles.emptyText}>{t('clickToAnalyze')}</p>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'sales' && <SalesReport startDate={startDate} endDate={endDate} t={t} tCommon={tCommon} />}
              {activeTab === 'production' && <ProductionReport startDate={startDate} endDate={endDate} t={t} tCommon={tCommon} />}
              {activeTab === 'payroll' && <PayrollReport startDate={startDate} endDate={endDate} t={t} tCommon={tCommon} />}
              {activeTab === 'taxes' && <TaxReport startDate={startDate} endDate={endDate} t={t} tCommon={tCommon} />}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔒</div>
            <p className={styles.emptyText}>لا توجد صلاحيات لعرض التقارير</p>
          </div>
        )}
      </div>
    </div>
  );
}