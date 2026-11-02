import React, { useMemo, useState } from 'react';
import { ComplaintRecord, ActivityRecord, FiscalYear } from '../types/nvc';
import {
  NEPALI_YEARS,
  NEPALI_MONTHS,
  SHAKHAS,
  COMPLAINT_STATUS_LABELS,
  getShakhaName,
  toNepaliDigits,
  fromNepaliDigits,
} from '../data/nvcStructure';
import {
  CalendarDays,
  Building2,
  PieChart,
  FileSpreadsheet,
  Bot,
  Printer,
  Download,
  Loader2,
} from 'lucide-react';

interface ReportsGeneratorViewProps {
  complaints: ComplaintRecord[];
  activities: ActivityRecord[];
  selectedFiscalYear: FiscalYear;
}

type ReportCardMode = 'monthly' | 'branch' | 'summary' | 'ai' | 'custom' | null;

export const ReportsGeneratorView: React.FC<ReportsGeneratorViewProps> = ({
  complaints,
  activities,
  selectedFiscalYear,
}) => {
  const [activeReport, setActiveReport] = useState<ReportCardMode>(null);

  // Custom Report Filters matching report.pdf
  const [startYear, setStartYear] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startDay, setStartDay] = useState('');
  const [endYear, setEndYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endDay, setEndDay] = useState('');
  const [customStatus, setCustomStatus] = useState('all');

  // AI Report State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const normalizeDateComparable = (nepDate: string): string => {
    const ascii = fromNepaliDigits(nepDate || '');
    const parts = ascii.split('-');
    if (parts.length !== 3) return ascii;
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  };

  // Monthly Breakdown
  const monthlyBreakdown = useMemo(() => {
    return NEPALI_MONTHS.map((mName, idx) => {
      const mIdx = idx + 1;
      const items = complaints.filter(
        (c) => c.fiscalYear === selectedFiscalYear && c.monthIndex === mIdx
      );
      const settled = items.filter((c) => c.status === 'farchhaut').length;
      const pending = items.length - settled;
      return {
        month: mName,
        total: items.length,
        settled,
        pending,
      };
    });
  }, [complaints, selectedFiscalYear]);

  // Branch Breakdown
  const branchBreakdown = useMemo(() => {
    return SHAKHAS.map((s) => {
      const items = complaints.filter((c) => c.shakhaId === s.id);
      const settled = items.filter((c) => c.status === 'farchhaut').length;
      const rate = items.length > 0 ? Math.round((settled / items.length) * 100) : 0;
      return {
        id: s.id,
        nameNe: s.nameNe,
        total: items.length,
        settled,
        pending: items.length - settled,
        rate,
      };
    });
  }, [complaints]);

  // Custom Filtered Records
  const customFilteredComplaints = useMemo(() => {
    const fromBound = startYear
      ? `${fromNepaliDigits(startYear)}-${String(startMonth || '01').padStart(2, '0')}-${String(startDay || '01').padStart(2, '0')}`
      : '';
    const toBound = endYear
      ? `${fromNepaliDigits(endYear)}-${String(endMonth || '12').padStart(2, '0')}-${String(endDay || '32').padStart(2, '0')}`
      : '';

    return complaints.filter((c) => {
      if (customStatus !== 'all' && c.status !== customStatus) return false;
      if (fromBound || toBound) {
        const cmpDate = normalizeDateComparable(c.nepaliDate);
        if (fromBound && cmpDate < fromBound) return false;
        if (toBound && cmpDate > toBound) return false;
      }
      return true;
    });
  }, [complaints, startYear, startMonth, startDay, endYear, endMonth, endDay, customStatus]);

  const handleExcelExportAll = () => {
    const headers = [
      'दर्ता नं',
      'मिति',
      'उजुरकर्ता',
      'विपक्षी',
      'मन्त्रालय/निकाय',
      'उजुरीको विवरण',
      'समितिको निर्णय',
      'शाखा',
      'स्थिति',
    ];
    const lines = [
      headers.join(','),
      ...complaints.map((c) =>
        [
          c.dartaNo,
          c.nepaliDate,
          c.complainant,
          c.respondent || '-',
          c.ministry || '-',
          c.title,
          c.committeeDecision || '-',
          getShakhaName(c.shakhaId),
          COMPLAINT_STATUS_LABELS[c.status],
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NVC_All_Complaints_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAiReport = async () => {
    setActiveReport('ai');
    setAiLoading(true);
    setAiError(null);

    try {
      const total = complaints.length;
      const settled = complaints.filter((c) => c.status === 'farchhaut').length;
      const minMap: Record<string, number> = {};
      complaints.forEach((c) => {
        minMap[c.ministry] = (minMap[c.ministry] || 0) + 1;
      });
      const topMinistries = Object.entries(minMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ministry, count]) => ({ ministry, count }));

      const response = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYear: selectedFiscalYear,
          statsSummary: {
            totalComplaints: total,
            settledComplaints: settled,
            pendingComplaints: total - settled,
            totalActivities: activities.length,
          },
          shakhaBreakdown: branchBreakdown
            .filter((b) => b.total > 0)
            .map((b) => ({ shakha: b.nameNe, total: b.total, settled: b.settled })),
          topMinistries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI रिपोर्ट जेनरेट गर्न सकिएन।');
      }
      setAiResult(data.analysis);
    } catch (err: any) {
      setAiError(err?.message || 'सर्भरसँग जडान गर्दा त्रुटि भयो।');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Container Card matching report.pdf */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-7">
        {/* Section 1: रिपोर्ट जेनरेटर */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">रिपोर्ट जेनरेटर</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. मासिक रिपोर्ट */}
            <button
              type="button"
              onClick={() => setActiveReport('monthly')}
              className={`p-5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                activeReport === 'monthly'
                  ? 'border-blue-800 bg-blue-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <CalendarDays className="w-7 h-7 text-slate-800" />
              <div className="text-sm font-bold text-slate-900 mt-1">मासिक रिपोर्ट</div>
              <div className="text-xs text-slate-500">मासिक उजुरी विवरण</div>
            </button>

            {/* 2. शाखा रिपोर्ट */}
            <button
              type="button"
              onClick={() => setActiveReport('branch')}
              className={`p-5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                activeReport === 'branch'
                  ? 'border-blue-800 bg-blue-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <Building2 className="w-7 h-7 text-slate-800" />
              <div className="text-sm font-bold text-slate-900 mt-1">शाखा रिपोर्ट</div>
              <div className="text-xs text-slate-500">शाखा अनुसारको प्रदर्शन</div>
            </button>

            {/* 3. सारांश रिपोर्ट */}
            <button
              type="button"
              onClick={() => setActiveReport('summary')}
              className={`p-5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                activeReport === 'summary'
                  ? 'border-blue-800 bg-blue-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <PieChart className="w-7 h-7 text-slate-800" />
              <div className="text-sm font-bold text-slate-900 mt-1">सारांश रिपोर्ट</div>
              <div className="text-xs text-slate-500">समग्र विश्लेषण</div>
            </button>

            {/* 4. Excel एक्सपोर्ट */}
            <button
              type="button"
              onClick={handleExcelExportAll}
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-7 h-7 text-slate-800" />
              <div className="text-sm font-bold text-slate-900 mt-1">Excel एक्सपोर्ट</div>
              <div className="text-xs text-slate-500">सबै उजुरीहरू</div>
            </button>

            {/* 5. AI रिपोर्ट */}
            <button
              type="button"
              onClick={handleGenerateAiReport}
              className={`p-5 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                activeReport === 'ai'
                  ? 'border-blue-800 bg-blue-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <Bot className="w-7 h-7 text-slate-800" />
              <div className="text-sm font-bold text-slate-900 mt-1">AI रिपोर्ट</div>
              <div className="text-xs text-slate-500">स्वत: विश्लेषण</div>
            </button>
          </div>
        </div>

        {/* Section 2: कस्टमाइज्ड रिपोर्ट */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">कस्टमाइज्ड रिपोर्ट</h3>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end text-xs">
            {/* सुरु मिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1.5">सुरु मिति</label>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">साल</option>
                  {NEPALI_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">महिना</option>
                  {NEPALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">गते</option>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {toNepaliDigits(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* अन्त्य मिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1.5">अन्त्य मिति</label>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">साल</option>
                  {NEPALI_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">महिना</option>
                  {NEPALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={endDay}
                  onChange={(e) => setEndDay(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">गते</option>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {toNepaliDigits(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* स्थिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1.5">स्थिति</label>
              <select
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
              >
                <option value="all">सबै</option>
                {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            {/* रिपोर्ट जेनरेट गर्नुहोस् Button */}
            <div className="lg:col-span-3">
              <button
                type="button"
                onClick={() => setActiveReport('custom')}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-slate-100 hover:bg-blue-950 hover:text-white text-slate-700 font-semibold transition-colors shadow-xs cursor-pointer"
              >
                रिपोर्ट जेनरेट गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Report Output Workspace */}
      {activeReport && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              {activeReport === 'monthly' &&
                `मासिक उजुरी विवरण प्रतिवेदन (आ.व. ${toNepaliDigits(selectedFiscalYear)})`}
              {activeReport === 'branch' && 'शाखा अनुसारको कार्यसम्पादन प्रतिवेदन'}
              {activeReport === 'summary' && 'समग्र उजुरी तथा अनुगमन सारांश विश्लेषण'}
              {activeReport === 'ai' && 'AI स्वत: विश्लेषणात्मक प्रतिवेदन'}
              {activeReport === 'custom' &&
                `कस्टमाइज्ड उजुरी प्रतिवेदन (${toNepaliDigits(customFilteredComplaints.length)} रेकर्ड)`}
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिन्ट / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExcelExportAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV डाउनलोड</span>
              </button>
            </div>
          </div>

          {/* 1. Monthly Report Output */}
          {activeReport === 'monthly' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                    <th className="py-2.5 px-3">महिना</th>
                    <th className="py-2.5 px-3 text-right">दर्ता भएका उजुरी</th>
                    <th className="py-2.5 px-3 text-right">फर्छ्यौट भएका</th>
                    <th className="py-2.5 px-3 text-right">बाँकी उजुरी</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyBreakdown.map((m) => (
                    <tr key={m.month} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{m.month}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        {toNepaliDigits(m.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-emerald-700 font-semibold">
                        {toNepaliDigits(m.settled)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-amber-700">
                        {toNepaliDigits(m.pending)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Branch Report Output */}
          {activeReport === 'branch' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                    <th className="py-2.5 px-3">शाखाको नाम</th>
                    <th className="py-2.5 px-3 text-right">कूल उजुरी</th>
                    <th className="py-2.5 px-3 text-right">फर्छ्यौट</th>
                    <th className="py-2.5 px-3 text-right">बाँकी</th>
                    <th className="py-2.5 px-3 text-right">प्रगति (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchBreakdown.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{b.nameNe}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        {toNepaliDigits(b.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-emerald-700 font-semibold">
                        {toNepaliDigits(b.settled)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-amber-700">
                        {toNepaliDigits(b.pending)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-blue-900">
                        {toNepaliDigits(b.rate)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Summary Report Output */}
          {activeReport === 'summary' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">कूल दर्ता उजुरी</div>
                <div className="text-2xl font-bold text-blue-950 font-mono-num mt-1">
                  {toNepaliDigits(complaints.length)}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">फर्छ्यौट सम्पन्न</div>
                <div className="text-2xl font-bold text-emerald-700 font-mono-num mt-1">
                  {toNepaliDigits(complaints.filter((c) => c.status === 'farchhaut').length)}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">काम बाँकी / छानविनमा</div>
                <div className="text-2xl font-bold text-amber-700 font-mono-num mt-1">
                  {toNepaliDigits(complaints.filter((c) => c.status !== 'farchhaut').length)}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">कूल अनुगमन र परीक्षण कार्यहरू</div>
                <div className="text-2xl font-bold text-slate-900 font-mono-num mt-1">
                  {toNepaliDigits(activities.length)}
                </div>
              </div>
            </div>
          )}

          {/* 4. AI Report Output */}
          {activeReport === 'ai' && (
            <div className="text-xs leading-relaxed">
              {aiLoading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                  <span>उजुरी तथा अनुगमन तथ्याङ्कको स्वत: विश्लेषण तयार हुँदैछ...</span>
                </div>
              ) : aiError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {aiError}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap text-slate-800 leading-7">
                  {aiResult}
                </div>
              )}
            </div>
          )}

          {/* 5. Custom Filtered Report Output */}
          {activeReport === 'custom' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                    <th className="py-2.5 px-3">दर्ता नं</th>
                    <th className="py-2.5 px-3">मिति</th>
                    <th className="py-2.5 px-3">उजुरकर्ता</th>
                    <th className="py-2.5 px-3">विपक्षी</th>
                    <th className="py-2.5 px-3">उजुरीको विवरण</th>
                    <th className="py-2.5 px-3">शाखा</th>
                    <th className="py-2.5 px-3">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customFilteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        तोकिएको मिति र स्थितिमा कुनै उजुरी भेटिएन।
                      </td>
                    </tr>
                  ) : (
                    customFilteredComplaints.slice(0, 50).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{c.dartaNo}</td>
                        <td className="py-2.5 px-3 font-mono-num">{c.nepaliDate}</td>
                        <td className="py-2.5 px-3">{c.complainant}</td>
                        <td className="py-2.5 px-3">{c.respondent || '-'}</td>
                        <td className="py-2.5 px-3 max-w-md truncate">{c.title}</td>
                        <td className="py-2.5 px-3">{getShakhaName(c.shakhaId)}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {COMPLAINT_STATUS_LABELS[c.status]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
