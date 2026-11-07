import React, { useMemo, useState } from 'react';
import { ComplaintRecord, ActivityRecord, FiscalYear } from '../types/nvc';
import {
  NEPALI_YEARS,
  NEPALI_MONTHS,
  SHAKHAS,
  MAHASHAKHAS,
  COMPLAINT_STATUS_LABELS,
  getShakhaName,
  getMahashakhaName,
  toNepaliDigits,
  fromNepaliDigits,
  DISTRICT_NE_MAP,
} from '../data/nvcStructure';
import {
  CalendarDays,
  Building2,
  PieChart,
  FileSpreadsheet,
  FileText,
  Bot,
  Printer,
  Download,
  Loader2,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FileCheck,
  Building,
  Wrench,
  FlaskConical,
  Users,
  Compass,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface ReportsGeneratorViewProps {
  complaints: ComplaintRecord[];
  activities: ActivityRecord[];
  selectedFiscalYear: FiscalYear;
}

type ReportCardMode = 'executive' | 'monthly' | 'branch' | 'summary' | 'ai' | 'custom';
type PeriodType = 'annual' | 'q1' | 'q2' | 'q3' | 'q4';

export const ReportsGeneratorView: React.FC<ReportsGeneratorViewProps> = ({
  complaints,
  activities,
  selectedFiscalYear,
}) => {
  const [activeReport, setActiveReport] = useState<ReportCardMode>('executive');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('annual');
  const [reportFiscalYear, setReportFiscalYear] = useState<FiscalYear>(selectedFiscalYear);

  // Custom Report Filters
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

  // Quarter to months mapping
  // Nepali months: 4 (साउन), 5 (भदौ), 6 (असोज) = Q1
  // 7 (कात्तिक), 8 (मङ्सिर), 9 (पुस) = Q2
  // 10 (माघ), 11 (फागुन), 12 (चैत) = Q3
  // 1 (वैशाख), 2 (जेठ), 3 (असार) = Q4
  const periodMonths = useMemo(() => {
    switch (selectedPeriod) {
      case 'q1':
        return [4, 5, 6];
      case 'q2':
        return [7, 8, 9];
      case 'q3':
        return [10, 11, 12];
      case 'q4':
        return [1, 2, 3];
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }, [selectedPeriod]);

  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case 'q1':
        return 'प्रथम त्रैमासिक (साउन - असोज)';
      case 'q2':
        return 'दोस्रो त्रैमासिक (कात्तिक - पुस)';
      case 'q3':
        return 'तेस्रो त्रैमासिक (माघ - चैत)';
      case 'q4':
        return 'चौथो त्रैमासिक (वैशाख - असार)';
      default:
        return 'वार्षिक समग्र (साउन - असार)';
    }
  }, [selectedPeriod]);

  // Filter complaints based on fiscal year & selected period
  const periodComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (c.fiscalYear !== reportFiscalYear) return false;
      if (selectedPeriod === 'annual') return true;
      return periodMonths.includes(c.monthIndex);
    });
  }, [complaints, reportFiscalYear, selectedPeriod, periodMonths]);

  // Filter activities based on fiscal year & selected period
  const periodActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.fiscalYear !== reportFiscalYear) return false;
      if (selectedPeriod === 'annual') return true;
      return periodMonths.includes(a.monthIndex);
    });
  }, [activities, reportFiscalYear, selectedPeriod, periodMonths]);

  // Monthly Breakdown
  const monthlyBreakdown = useMemo(() => {
    return NEPALI_MONTHS.map((mName, idx) => {
      const mIdx = idx + 1;
      const items = complaints.filter(
        (c) => c.fiscalYear === reportFiscalYear && c.monthIndex === mIdx
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
  }, [complaints, reportFiscalYear]);

  // Branch Breakdown
  const branchBreakdown = useMemo(() => {
    return SHAKHAS.map((s) => {
      const items = periodComplaints.filter((c) => c.shakhaId === s.id);
      const settled = items.filter((c) => c.status === 'farchhaut').length;
      const underInvestigation = items.filter(
        (c) => c.status === 'chhanbin_ma' || c.status === 'chalu'
      ).length;
      const rate = items.length > 0 ? Math.round((settled / items.length) * 100) : 0;
      return {
        id: s.id,
        nameNe: s.nameNe,
        total: items.length,
        settled,
        underInvestigation,
        pending: items.length - settled,
        rate,
      };
    });
  }, [periodComplaints]);

  // Operational Sector Records for Executive Report
  const techAuditRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'prabidhik_parikshan'),
    [periodActivities]
  );

  const totalFinancialRecovery = useMemo(
    () =>
      techAuditRecords.reduce(
        (sum, a) => sum + (a.technicalAuditDetails?.financialRecoveryAmount || 0),
        0
      ),
    [techAuditRecords]
  );

  const projectRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'aayojana_anugaman'),
    [periodActivities]
  );

  const officeRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'karyalaya_anugaman'),
    [periodActivities]
  );

  const totalLateStaff = useMemo(
    () =>
      officeRecords.reduce(
        (sum, a) =>
          sum +
          (a.officeMonitoringDetails?.timeViolationCount ??
            a.officeMonitoringDetails?.lateStaffCount ??
            0),
        0
      ),
    [officeRecords]
  );

  const totalDressViolations = useMemo(
    () =>
      officeRecords.reduce(
        (sum, a) =>
          sum +
          (a.officeMonitoringDetails?.dressViolationCount ??
            a.officeMonitoringDetails?.dressViolatorsCount ??
            0),
        0
      ),
    [officeRecords]
  );

  const charterRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'badapatra_anugaman'),
    [periodActivities]
  );

  const surveyRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'service_survey'),
    [periodActivities]
  );

  const labRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'namuna_parikshan'),
    [periodActivities]
  );

  const labPassedCount = useMemo(
    () =>
      labRecords.filter(
        (a) =>
          a.labTestDetails?.result === 'pass' ||
          a.labTestDetails?.complianceVerdict === 'PASS'
      ).length,
    [labRecords]
  );

  const promoRecords = useMemo(
    () => periodActivities.filter((a) => a.activityType === 'prabardhanatmak'),
    [periodActivities]
  );

  const promoParticipantsCount = useMemo(
    () =>
      promoRecords.reduce(
        (sum, a) => sum + (a.promotionalProgramDetails?.participantCount || 0),
        0
      ),
    [promoRecords]
  );

  // Complaints KPIs
  const totalPeriodComplaints = periodComplaints.length;
  const settledPeriodComplaints = periodComplaints.filter((c) => c.status === 'farchhaut').length;
  const underInvestigationComplaints = periodComplaints.filter(
    (c) => c.status === 'chhanbin_ma' || c.status === 'chalu'
  ).length;
  const ciaaReferrals = periodComplaints.filter(
    (c) =>
      c.finalDecisionType?.includes('अख्तियार') ||
      c.committeeDecision?.includes('अख्तियार') ||
      c.investigationOutcome === 'ciaa_forwarded' ||
      c.title?.includes('अख्तियार')
  ).length;
  const settlementRate =
    totalPeriodComplaints > 0
      ? Math.round((settledPeriodComplaints / totalPeriodComplaints) * 100)
      : 0;

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

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return 'रु. ०.००';
    return `रु. ${toNepaliDigits(val.toLocaleString('en-IN'))}/-`;
  };

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

  const handleExcelExportExecutive = () => {
    const lines: string[] = [
      'राष्ट्रिय सतर्कता केन्द्र - कार्यकारी आवधिक प्रगति प्रतिवेदन',
      `आर्थिक वर्ष: ${reportFiscalYear}, अवधि: ${periodLabel}`,
      `प्रतिवेदन उत्पादन मिति: ${new Date().toLocaleDateString()}`,
      '',
      '१. उजुरी व्यवस्थापन तथा छानविन कार्यसम्पादन',
      'सूचक,संख्या / दर',
      `कूल दर्ता उजुरी,${totalPeriodComplaints}`,
      `फर्छ्यौट भएका उजुरी,${settledPeriodComplaints}`,
      `छानविन तथा अनुसन्धानमा रहेका,${underInvestigationComplaints}`,
      `अख्तियार (CIAA) लेखी पठाइएका,${ciaaReferrals}`,
      `फर्छ्यौट दर (%),${settlementRate}%`,
      '',
      '२. प्राविधिक परीक्षण तथा असुलउपर विवरण',
      'आयोजनाको नाम,सम्बन्धित निकाय,परीक्षण मिति,कैफियत,असुलउपर सिफारिस रकम (रु.)',
      ...techAuditRecords.map((t) =>
        [
          t.title,
          t.entityName,
          t.nepaliDate,
          t.reportSummary || '-',
          t.technicalAuditDetails?.financialRecoveryAmount || 0,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
      '',
      '३. कार्यालय अनुगमन तथा सुशासन विवरण',
      'कार्यालयको नाम,जिल्ला,अनुगमन मिति,समयपालन उल्लङ्घन (ढिलो),पोशाक उल्लङ्घन,निर्देशन संख्या',
      ...officeRecords.map((o) =>
        [
          o.title,
          DISTRICT_NE_MAP[o.districtEn] || o.districtEn,
          o.nepaliDate,
          o.officeMonitoringDetails?.timeViolationCount ?? o.officeMonitoringDetails?.lateStaffCount ?? 0,
          o.officeMonitoringDetails?.dressViolationCount ?? o.officeMonitoringDetails?.dressViolatorsCount ?? 0,
          o.directiveCount,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
      '',
      '४. निर्माण सामग्री गुणस्तर परीक्षण (LIMS)',
      'नमुनाको नाम,परीक्षणको किसिम,परीक्षण मिति,नतिजा',
      ...labRecords.map((l) =>
        [
          l.title,
          l.labTestDetails?.specifiedStandard ?? l.labTestDetails?.testStandard ?? '-',
          l.nepaliDate,
          l.labTestDetails?.result?.toUpperCase() ?? l.labTestDetails?.complianceVerdict ?? '-',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
      '',
      '५. भ्रष्टाचार विरुद्ध प्रवर्द्धनात्मक कार्यक्रमहरू',
      'कार्यक्रमको नाम,स्थान / जिल्ला,मिति,सहभागी संख्या,स्थिति',
      ...promoRecords.map((p) =>
        [
          p.title,
          p.promotionalProgramDetails?.location || '-',
          p.nepaliDate,
          p.promotionalProgramDetails?.participantCount || 0,
          p.promotionalProgramDetails?.status || '-',
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
    a.download = `NVC_Executive_Progress_Report_${reportFiscalYear.replace('/', '-')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAiReport = async () => {
    setActiveReport('ai');
    setAiLoading(true);
    setAiError(null);

    try {
      const minMap: Record<string, number> = {};
      periodComplaints.forEach((c) => {
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
          fiscalYear: reportFiscalYear,
          period: periodLabel,
          statsSummary: {
            totalComplaints: totalPeriodComplaints,
            settledComplaints: settledPeriodComplaints,
            pendingComplaints: totalPeriodComplaints - settledPeriodComplaints,
            totalActivities: periodActivities.length,
            financialRecoveryAmount: totalFinancialRecovery,
            totalOfficesMonitored: officeRecords.length,
            totalLateStaff,
            totalLabTests: labRecords.length,
          },
          shakhaBreakdown: branchBreakdown
            .filter((b) => b.total > 0)
            .map((b) => ({ shakha: b.nameNe, total: b.total, settled: b.settled })),
          topMinistries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI प्रतिवेदन विश्लेषण तयार गर्न सकिएन।');
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
      {/* Top Report Navigator Hub */}
      <div className="glass-panel p-6 rounded-2xl shadow-xs space-y-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
                <PieChart className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                प्रतिवेदन तथा कार्यसम्पादन विश्लेषण केन्द्र
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              राष्ट्रिय सतर्कता केन्द्रको आवधिक प्रगति, उजुरी फर्छ्यौट तथा बहु-निकाय अनुगमन विश्लेषण
            </p>
          </div>

          {/* Quick Period & Year Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-medium">आ.व.:</span>
              <select
                value={reportFiscalYear}
                onChange={(e) => setReportFiscalYear(e.target.value as FiscalYear)}
                aria-label="आर्थिक वर्ष छनोट गर्नुहोस्"
                className="bg-transparent font-bold text-blue-950 focus:outline-none cursor-pointer"
              >
                <option value="2081/82">२०८१/८२</option>
                <option value="2082/83">२०८२/८३</option>
                <option value="2083/84">२०८३/८४</option>
                <option value="2084/85">२०८४/८५</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-medium">अवधि:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
                aria-label="प्रतिवेदन अवधि छनोट गर्नुहोस्"
                className="bg-transparent font-bold text-blue-950 focus:outline-none cursor-pointer"
              >
                <option value="annual">वार्षिक समग्र</option>
                <option value="q1">प्रथम त्रैमासिक (साउन-असोज)</option>
                <option value="q2">दोस्रो त्रैमासिक (कात्तिक-पुस)</option>
                <option value="q3">तेस्रो त्रैमासिक (माघ-चैत)</option>
                <option value="q4">चौथो त्रैमासिक (वैशाख-असार)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action / Report Mode Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. कार्यकारी आवधिक प्रतिवेदन (Flagship) */}
          <button
            type="button"
            onClick={() => setActiveReport('executive')}
            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden ${
              activeReport === 'executive'
                ? 'border-blue-800 bg-gradient-to-b from-blue-900 to-blue-950 text-white shadow-md'
                : 'border-slate-200 bg-white/70 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeReport === 'executive' ? 'bg-white/20 text-emerald-300' : 'bg-blue-50 text-blue-800'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">कार्यकारी आवधिक प्रतिवेदन</div>
            <div className={`text-[10px] ${activeReport === 'executive' ? 'text-blue-200' : 'text-slate-500'}`}>
              त्रैमासिक / वार्षिक मिसिल
            </div>
          </button>

          {/* 2. मासिक उजुरी रिपोर्ट */}
          <button
            type="button"
            onClick={() => setActiveReport('monthly')}
            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeReport === 'monthly'
                ? 'border-blue-800 bg-blue-50/70 text-blue-950 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">मासिक रिपोर्ट</div>
            <div className="text-[10px] text-slate-500">उजुरी फर्छ्यौट दर</div>
          </button>

          {/* 3. शाखागत रिपोर्ट */}
          <button
            type="button"
            onClick={() => setActiveReport('branch')}
            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeReport === 'branch'
                ? 'border-blue-800 bg-blue-50/70 text-blue-950 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">शाखागत रिपोर्ट</div>
            <div className="text-[10px] text-slate-500">शाखा कार्यसम्पादन</div>
          </button>

          {/* 4. समग्र सारांश */}
          <button
            type="button"
            onClick={() => setActiveReport('summary')}
            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeReport === 'summary'
                ? 'border-blue-800 bg-blue-50/70 text-blue-950 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">समग्र सारांश</div>
            <div className="text-[10px] text-slate-500">मुख्य सूचकहरू</div>
          </button>

          {/* 5. AI स्वत: विश्लेषण */}
          <button
            type="button"
            onClick={handleGenerateAiReport}
            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeReport === 'ai'
                ? 'border-blue-800 bg-blue-50/70 text-blue-950 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">AI विश्लेषण</div>
            <div className="text-[10px] text-slate-500">स्वत: निष्कर्ष</div>
          </button>

          {/* 6. Excel एक्सपोर्ट */}
          <button
            type="button"
            onClick={handleExcelExportAll}
            className="p-4 rounded-xl border border-slate-200 bg-white/70 hover:border-emerald-400 hover:bg-emerald-50/40 text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-slate-800"
          >
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold leading-tight">Excel एक्सपोर्ट</div>
            <div className="text-[10px] text-slate-500">सम्पूर्ण उजुरी डाटा</div>
          </button>
        </div>

        {/* Customized Date Filter Section */}
        <div className="pt-4 border-t border-slate-200/60">
          <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>मिति तथा अवस्था अनुसार कस्टमाइज्ड खोज</span>
            {customFilteredComplaints.length > 0 && activeReport === 'custom' && (
              <span className="text-blue-900 font-normal">
                भेटिएका उजुरी: <strong>{toNepaliDigits(customFilteredComplaints.length)}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end text-xs">
            {/* सुरु मिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1">सुरु मिति</label>
              <div className="grid grid-cols-3 gap-1">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">साल</option>
                  {NEPALI_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">महिना</option>
                  {NEPALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">गते</option>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{toNepaliDigits(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* अन्त्य मिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1">अन्त्य मिति</label>
              <div className="grid grid-cols-3 gap-1">
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">साल</option>
                  {NEPALI_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">महिना</option>
                  {NEPALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={endDay}
                  onChange={(e) => setEndDay(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="">गते</option>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{toNepaliDigits(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* स्थिति */}
            <div className="lg:col-span-3">
              <label className="block text-slate-600 font-medium mb-1">स्थिति</label>
              <select
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800"
              >
                <option value="all">सबै स्थितिहरू</option>
                {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <div className="lg:col-span-3">
              <button
                type="button"
                onClick={() => setActiveReport('custom')}
                className="w-full py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                फिल्टर प्रतिवेदन देखाउनुहोस्
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Display Surface */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-xs space-y-6">
        {/* Output Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/60 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-900">
              <FileCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              {activeReport === 'executive' && `कार्यकारी आवधिक प्रगति प्रतिवेदन (आ.व. ${toNepaliDigits(reportFiscalYear)} - ${periodLabel})`}
              {activeReport === 'monthly' && `मासिक उजुरी विवरण प्रतिवेदन (आ.व. ${toNepaliDigits(reportFiscalYear)})`}
              {activeReport === 'branch' && 'शाखा अनुसारको कार्यसम्पादन तथा प्रगति विवरण'}
              {activeReport === 'summary' && 'समग्र उजुरी तथा बहु-क्षेत्रीय अनुगमन सारांश'}
              {activeReport === 'ai' && 'AI स्वत: विश्लेषणात्मक प्रतिवेदन'}
              {activeReport === 'custom' && `कस्टमाइज्ड उजुरी विवरण (${toNepaliDigits(customFilteredComplaints.length)} रेकर्ड)`}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिन्ट / PDF डाउनलोड</span>
            </button>
            {activeReport === 'executive' ? (
              <button
                type="button"
                onClick={handleExcelExportExecutive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>कार्यकारी Excel एक्सपोर्ट</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExcelExportAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV डाउनलोड</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. EXECUTIVE PERIODIC PROGRESS REPORT (FLAGSHIP) */}
        {activeReport === 'executive' && (
          <div className="space-y-8 print:p-0 print:m-0">
            {/* Government Sovereign Header */}
            <div className="border-b-2 border-red-700 pb-5 text-center relative">
              <div className="flex items-center justify-between">
                <img
                  src="/coa.png"
                  alt="नेपालको निशाना छाप"
                  className="w-20 h-20 object-contain drop-shadow-sm"
                />
                <div className="flex-1 px-4 text-center">
                  <div className="text-sm font-semibold text-red-700 tracking-wide">नेपाल सरकार</div>
                  <div className="text-sm font-semibold text-slate-800">
                    प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय
                  </div>
                  <div className="text-xl font-bold text-blue-950 mt-0.5">
                    राष्ट्रिय सतर्कता केन्द्र
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    नीति, योजना तथा अनुगमन महाशाखा
                  </div>
                  <div className="text-xs text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</div>
                </div>
                <div className="w-20 text-right text-[11px] text-slate-500 space-y-0.5">
                  <div>गोप्य / आधिकारिक</div>
                  <div className="font-mono-num font-semibold text-slate-700">
                    NVC-EX-{toNepaliDigits(reportFiscalYear.split('/')[0])}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>
                  <span>पत्र संख्या: </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {toNepaliDigits(reportFiscalYear)} (का.प्र.)
                  </span>
                </div>
                <div className="inline-block bg-blue-950 text-white font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider">
                  कार्यकारी आवधिक कार्यसम्पादन तथा प्रगति प्रतिवेदन — {periodLabel}
                </div>
                <div>
                  <span>प्रतिवेदन मिति: </span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {toNepaliDigits(new Date().toLocaleDateString())}
                  </span>
                </div>
              </div>
            </div>

            {/* Executive KPI Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tile 1: उजुरी फर्छ्यौट */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>उजुरी फर्छ्यौट दर</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 font-mono-num mt-1">
                  {toNepaliDigits(settlementRate)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  दर्ता: {toNepaliDigits(totalPeriodComplaints)} | फर्छ्यौट: {toNepaliDigits(settledPeriodComplaints)}
                </div>
              </div>

              {/* Tile 2: अख्तियार सिफारिस */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>CIAA लेखी पठाइएका</span>
                  <Scale className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-700 font-mono-num mt-1">
                  {toNepaliDigits(ciaaReferrals)} मुद्दा
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  छानविनमा: {toNepaliDigits(underInvestigationComplaints)}
                </div>
              </div>

              {/* Tile 3: प्राविधिक परीक्षण & असुलउपर */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>असुलउपर सिफारिस रकम</span>
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-lg font-bold text-blue-950 font-mono-num mt-1 truncate">
                  {formatCurrency(totalFinancialRecovery)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  परीक्षित आयोजना: {toNepaliDigits(techAuditRecords.length)}
                </div>
              </div>

              {/* Tile 4: कार्यालय अनुगमन & अनुशासन */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>कार्यालय अनुगमन</span>
                  <Building className="w-4 h-4 text-blue-700" />
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono-num mt-1">
                  {toNepaliDigits(officeRecords.length)} निकाय
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  हाजिरी उल्लङ्घन: {toNepaliDigits(totalLateStaff)} जना
                </div>
              </div>

              {/* Tile 5: बडापत्र अनुगमन */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>नागरिक बडापत्र अनुगमन</span>
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900 font-mono-num mt-1">
                  {toNepaliDigits(charterRecords.length)} कार्यालय
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  सेवाग्राही सर्वेक्षण: {toNepaliDigits(surveyRecords.length)}
                </div>
              </div>

              {/* Tile 6: विकास आयोजना अनुगमन */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>विकास आयोजना अनुगमन</span>
                  <Compass className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900 font-mono-num mt-1">
                  {toNepaliDigits(projectRecords.length)} आयोजना
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  स्थलगत अनुगमन सम्पन्न
                </div>
              </div>

              {/* Tile 7: ल्याब सामग्री परीक्षण */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>प्रयोगशाला (LIMS) परीक्षण</span>
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-teal-900 font-mono-num mt-1">
                  {toNepaliDigits(labRecords.length)} नमुना
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  उत्तीर्ण: {toNepaliDigits(labPassedCount)} | दर:{' '}
                  {labRecords.length > 0 ? toNepaliDigits(Math.round((labPassedCount / labRecords.length) * 100)) : '०'}%
                </div>
              </div>

              {/* Tile 8: प्रवर्द्धनात्मक सचेतना */}
              <div className="glass-panel stat-tile-glow p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>सचेतना कार्यक्रम</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-indigo-900 font-mono-num mt-1">
                  {toNepaliDigits(promoRecords.length)} कार्यक्रम
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  सहभागी: {toNepaliDigits(promoParticipantsCount)} जना
                </div>
              </div>
            </div>

            {/* Sector 1: महाशाखा तथा शाखागत उजुरी विवरण तालिका */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <FileCheck className="w-4 h-4 text-blue-700" />
                <span>१. महाशाखा तथा शाखागत उजुरी दर्ता, छानविन तथा फर्छ्यौट तालिका</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">शाखाको नाम</th>
                      <th className="py-2.5 px-3 text-right">दर्ता उजुरी</th>
                      <th className="py-2.5 px-3 text-right">छानविनमा</th>
                      <th className="py-2.5 px-3 text-right">फर्छ्यौट</th>
                      <th className="py-2.5 px-3 text-right">बाँकी</th>
                      <th className="py-2.5 px-3 text-right">प्रगति दर (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branchBreakdown.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-semibold text-slate-900">{b.nameNe}</td>
                        <td className="py-2 px-3 text-right font-mono-num">{toNepaliDigits(b.total)}</td>
                        <td className="py-2 px-3 text-right font-mono-num text-blue-700">{toNepaliDigits(b.underInvestigation)}</td>
                        <td className="py-2 px-3 text-right font-mono-num text-emerald-700 font-semibold">{toNepaliDigits(b.settled)}</td>
                        <td className="py-2 px-3 text-right font-mono-num text-amber-700">{toNepaliDigits(b.pending)}</td>
                        <td className="py-2 px-3 text-right font-mono-num font-bold text-blue-900">{toNepaliDigits(b.rate)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td className="py-2.5 px-3">कूल जम्मा</td>
                      <td className="py-2.5 px-3 text-right font-mono-num">{toNepaliDigits(totalPeriodComplaints)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-blue-800">{toNepaliDigits(underInvestigationComplaints)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-emerald-800">{toNepaliDigits(settledPeriodComplaints)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-amber-800">{toNepaliDigits(totalPeriodComplaints - settledPeriodComplaints)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-blue-950">{toNepaliDigits(settlementRate)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Sector 2: प्राविधिक परीक्षण विवरण तालिका */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <Wrench className="w-4 h-4 text-blue-700" />
                <span>२. प्राविधिक परीक्षण सम्पन्न प्रमुख आयोजना तथा असुलउपर सिफारिस</span>
              </h4>

              {techAuditRecords.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  यस अवधिमा कुनै प्राविधिक परीक्षण प्रतिवेदन अभिलेखीकरण भएको छैन।
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">आयोजनाको नाम</th>
                        <th className="py-2.5 px-3">सम्बन्धित निकाय</th>
                        <th className="py-2.5 px-3">परीक्षण मिति</th>
                        <th className="py-2.5 px-3">गुणस्तर अवस्था</th>
                        <th className="py-2.5 px-3 text-right">असुलउपर सिफारिस रकम</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {techAuditRecords.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-900">{t.title}</td>
                          <td className="py-2 px-3 text-slate-600">{t.entityName}</td>
                          <td className="py-2 px-3 font-mono-num">{toNepaliDigits(t.nepaliDate)}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800">
                              {t.technicalAuditDetails?.qualityRating || 'सन्तोषजनक'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num font-bold text-red-700">
                            {formatCurrency(t.technicalAuditDetails?.financialRecoveryAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right">कूल असुलउपर सिफारिस रकम:</td>
                        <td className="py-2.5 px-3 text-right font-mono-num text-red-800">
                          {formatCurrency(totalFinancialRecovery)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Sector 3: कार्यालय अनुगमन तथा कर्मचारी अनुशासन तालिका */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <Building className="w-4 h-4 text-blue-700" />
                <span>३. सार्वजनिक निकाय छड्के अनुगमन तथा आचारसंहिता परिपालना</span>
              </h4>

              {officeRecords.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  यस अवधिमा कार्यालय अनुगमन सम्बन्धी कुनै अभिलेख फेला परेन।
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">कार्यालयको नाम</th>
                        <th className="py-2.5 px-3">जिल्ला</th>
                        <th className="py-2.5 px-3">मिति</th>
                        <th className="py-2.5 px-3 text-right">समयपालन उल्लङ्घन</th>
                        <th className="py-2.5 px-3 text-right">पोशाक उल्लङ्घन</th>
                        <th className="py-2.5 px-3 text-right">जारी निर्देशन</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {officeRecords.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-900">{o.title}</td>
                          <td className="py-2 px-3 text-slate-600">{DISTRICT_NE_MAP[o.districtEn] || o.districtEn}</td>
                          <td className="py-2 px-3 font-mono-num">{toNepaliDigits(o.nepaliDate)}</td>
                          <td className="py-2 px-3 text-right font-mono-num text-amber-700 font-semibold">
                            {toNepaliDigits(o.officeMonitoringDetails?.timeViolationCount ?? o.officeMonitoringDetails?.lateStaffCount ?? 0)} जना
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num text-purple-700 font-semibold">
                            {toNepaliDigits(o.officeMonitoringDetails?.dressViolationCount ?? o.officeMonitoringDetails?.dressViolatorsCount ?? 0)} जना
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num text-blue-900 font-bold">
                            {toNepaliDigits(o.directiveCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Strategic Recommendations & Policy Directives */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>४. केन्द्रको नीतिगत विश्लेषण तथा सुधारात्मक सिफारिसहरू</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed text-slate-700">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-900">सार्वजनिक खरिद तथा आयोजना:</div>
                  <p className="text-[11px] text-slate-600">
                    ठेक्का सम्झौताको म्याद थप तथा भेरियसन प्रक्रियामा सार्वजनिक खरिद ऐनको कडाइका साथ पालना गराउन र प्रयोगशाला परीक्षणको गुणस्तर मापदण्ड अनुसार मात्र भुक्तानी दिन सिफारिस गरिएको छ।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-900">कर्मचारी अनुशासन तथा सेवा प्रवाह:</div>
                  <p className="text-[11px] text-slate-600">
                    सार्वजनिक सेवा प्रवाह गर्ने कार्यालयहरूमा विद्युतीय हाजिरी, अनिवार्य निर्धारित पोशाक र नागरिक बडापत्रको स्पष्ट दृश्यता कायम राख्न सम्बन्धित मन्त्रालयहरूलाई निर्देशन जारी गरिएको छ।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-900">भ्रष्टाचार रोकथाम तथा प्रवर्द्धन:</div>
                  <p className="text-[11px] text-slate-600">
                    स्थानीय तह तथा जनसम्पर्क बढी हुने निकायहरूमा नागरिक सचेतना अभिवृद्धि गर्न र उजुरी सम्बोधन प्रणालीलाई पूर्ण रूपमा डिजिटल ट्र्याकिङमा आबद्ध गर्न जोड दिइएको छ।
                  </p>
                </div>
              </div>
            </div>

            {/* 4-Tier Official Signature Block */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs text-slate-700 mt-6">
              <div className="space-y-1">
                <div className="h-14 border-b border-dashed border-slate-400" />
                <div className="font-bold text-slate-900">तयार गर्ने</div>
                <div className="text-[11px] text-slate-500">योजना तथा अनुगमन शाखा अधिकृत</div>
                <div className="text-[10px] text-slate-400">मिति: ........................</div>
              </div>
              <div className="space-y-1">
                <div className="h-14 border-b border-dashed border-slate-400" />
                <div className="font-bold text-slate-900">पेश गर्ने</div>
                <div className="text-[11px] text-slate-500">शाखा प्रमुख / उपसचिव</div>
                <div className="text-[10px] text-slate-400">मिति: ........................</div>
              </div>
              <div className="space-y-1">
                <div className="h-14 border-b border-dashed border-slate-400" />
                <div className="font-bold text-slate-900">जाँच तथा सिफारिस</div>
                <div className="text-[11px] text-slate-500">महाशाखा प्रमुख (सहसचिव)</div>
                <div className="text-[10px] text-slate-400">मिति: ........................</div>
              </div>
              <div className="space-y-1">
                <div className="h-14 border-b border-dashed border-slate-400" />
                <div className="font-bold text-slate-900">स्वीकृत गर्ने</div>
                <div className="text-[11px] text-slate-500">सचिव / प्रमुख प्राविधिक अधिकृत</div>
                <div className="text-[10px] text-slate-400">मिति: ........................</div>
              </div>
            </div>

            {/* Print Footer Watermark */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <div>भ्रष्टाचार निवारण ऐन, २०५९ बमोजिम नेपाल सरकारसमक्ष पेश गरिने आधिकारिक अभिलेख।</div>
              <div>राष्ट्रिय सतर्कता केन्द्र, सिंहदरबार | पृष्ठ १ / १</div>
            </div>
          </div>
        )}

        {/* 2. MONTHLY REPORT */}
        {activeReport === 'monthly' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    <td className="py-2.5 px-3 text-right font-mono-num">{toNepaliDigits(m.total)}</td>
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

        {/* 3. BRANCH REPORT */}
        {activeReport === 'branch' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    <td className="py-2.5 px-3 text-right font-mono-num">{toNepaliDigits(b.total)}</td>
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

        {/* 4. SUMMARY REPORT */}
        {activeReport === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="glass-panel stat-tile-glow p-4 rounded-xl">
              <div className="text-slate-500">कूल दर्ता उजुरी</div>
              <div className="text-2xl font-bold text-blue-950 font-mono-num mt-1">
                {toNepaliDigits(complaints.length)}
              </div>
            </div>
            <div className="glass-panel stat-tile-glow p-4 rounded-xl">
              <div className="text-slate-500">फर्छ्यौट सम्पन्न</div>
              <div className="text-2xl font-bold text-emerald-700 font-mono-num mt-1">
                {toNepaliDigits(complaints.filter((c) => c.status === 'farchhaut').length)}
              </div>
            </div>
            <div className="glass-panel stat-tile-glow p-4 rounded-xl">
              <div className="text-slate-500">छानविनमा / काम बाँकी</div>
              <div className="text-2xl font-bold text-amber-700 font-mono-num mt-1">
                {toNepaliDigits(complaints.filter((c) => c.status !== 'farchhaut').length)}
              </div>
            </div>
            <div className="glass-panel stat-tile-glow p-4 rounded-xl">
              <div className="text-slate-500">कूल अनुगमन र परीक्षण कार्यहरू</div>
              <div className="text-2xl font-bold text-slate-900 font-mono-num mt-1">
                {toNepaliDigits(activities.length)}
              </div>
            </div>
          </div>
        )}

        {/* 5. AI REPORT */}
        {activeReport === 'ai' && (
          <div className="text-xs leading-relaxed">
            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-600">
                <Loader2 className="w-7 h-7 animate-spin text-blue-900" />
                <span className="font-medium">उजुरी तथा अनुगमन तथ्याङ्कको विस्तृत विश्लेषण तयार हुँदैछ...</span>
              </div>
            ) : aiError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {aiError}
              </div>
            ) : (
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl whitespace-pre-wrap text-slate-800 leading-7">
                {aiResult || 'विश्लेषण सुरु गर्न माथिको "AI रिपोर्ट" बटन क्लिक गर्नुहोस्।'}
              </div>
            )}
          </div>
        )}

        {/* 6. CUSTOM FILTERED REPORT */}
        {activeReport === 'custom' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
    </div>
  );
};