import React, { useMemo, useState } from 'react';
import {
  ComplaintRecord,
  ActivityRecord,
  FiscalYear,
  MenuId,
} from '../types/nvc';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  NEPALI_MONTHS,
  COMPLAINT_SOURCE_LABELS,
  COMPLAINT_STATUS_LABELS,
  DISTRICT_NE_MAP,
  getShakhaName,
  toNepaliDigits,
} from '../data/nvcStructure';
import { NepalChoroplethMap } from './NepalChoroplethMap';
import {
  SwitchableCategoricalChart,
  SwitchableMonthlyChart,
  ChartDatum,
  MonthlyChartDatum,
} from './SwitchableChartCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBuilding,
  faBuildingColumns,
  faBullhorn,
  faCalendarCheck,
  faCalendarDay,
  faCalendarDays,
  faCalendarMinus,
  faCalendarWeek,
  faCheckCircle,
  faCircleCheck,
  faCircleExclamation,
  faClipboardCheck,
  faEnvelope,
  faFileCircleExclamation,
  faFolderOpen,
  faGlobe,
  faHammer,
  faHeadset,
  faHourglassHalf,
  faListCheck,
  faMagnifyingGlass,
  faPhone,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import {
  Eye,
  X,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Building2,
  HardHat,
  SearchCheck,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { ComplaintDossierModal } from './ComplaintDossierModal';

interface DashboardOverviewProps {
  complaints: ComplaintRecord[];
  activities: ActivityRecord[];
  selectedFiscalYear: FiscalYear;
  showExtraTechStats: boolean;
  searchQuery: string;
  onNavigateMenu: (menu: MenuId) => void;
  userRoleName?: string;
  userFullName?: string;
}

interface StatItem {
  key: string;
  label: string;
  value: number;
  subNote?: string;
  highlight?: 'navy' | 'crimson' | 'teal' | 'default';
}

const STAT_ICONS: Record<string, { icon: IconDefinition; colorClass: string }> = {
  total: { icon: faFolderOpen, colorClass: 'bg-blue-50 text-blue-700 border border-blue-200/60' },
  prev_fy: { icon: faCalendarDays, colorClass: 'bg-violet-50 text-violet-700 border border-violet-200/60' },
  curr_fy: { icon: faCalendarCheck, colorClass: 'bg-sky-50 text-sky-700 border border-sky-200/60' },
  chalu: { icon: faHourglassHalf, colorClass: 'bg-amber-50 text-amber-700 border border-amber-200/60' },
  farchhaut: { icon: faCircleCheck, colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' },
  kam_baki: { icon: faListCheck, colorClass: 'bg-rose-50 text-rose-700 border border-rose-200/60' },
  prev_month: { icon: faCalendarMinus, colorClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60' },
  this_month: { icon: faCalendarDay, colorClass: 'bg-teal-50 text-teal-700 border border-teal-200/60' },
  hello_sarkar: { icon: faHeadset, colorClass: 'bg-orange-50 text-orange-700 border border-orange-200/60' },
  hotline: { icon: faPhone, colorClass: 'bg-red-50 text-red-700 border border-red-200/60' },
  online: { icon: faGlobe, colorClass: 'bg-green-50 text-green-700 border border-green-200/60' },
  kendra_darta: { icon: faBuilding, colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' },
  patrachar_baki: { icon: faEnvelope, colorClass: 'bg-pink-50 text-pink-700 border border-pink-200/60' },
  total_mon: { icon: faBuildingColumns, colorClass: 'bg-teal-50 text-teal-700 border border-teal-200/60' },
  total_noncomp: { icon: faTriangleExclamation, colorClass: 'bg-rose-50 text-rose-700 border border-rose-200/60' },
  total_dir: { icon: faBullhorn, colorClass: 'bg-amber-50 text-amber-700 border border-amber-200/60' },
  month_mon: { icon: faCalendarWeek, colorClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60' },
  month_noncomp: { icon: faCircleExclamation, colorClass: 'bg-red-50 text-red-700 border border-red-200/60' },
  month_dir: { icon: faBullhorn, colorClass: 'bg-purple-50 text-purple-700 border border-purple-200/60' },
  chhanbin: { icon: faMagnifyingGlass, colorClass: 'bg-blue-50 text-blue-700 border border-blue-200/60' },
  tech_audit: { icon: faClipboardCheck, colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' },
  proj_mon: { icon: faHammer, colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' },
  extra_total_proj: { icon: faBuilding, colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' },
  extra_month_proj: { icon: faCalendarDay, colorClass: 'bg-teal-50 text-teal-700 border border-teal-200/60' },
  extra_total_tech: { icon: faFileCircleExclamation, colorClass: 'bg-violet-50 text-violet-700 border border-violet-200/60' },
  extra_month_tech: { icon: faCheckCircle, colorClass: 'bg-sky-50 text-sky-700 border border-sky-200/60' },
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  complaints,
  activities,
  selectedFiscalYear,
  showExtraTechStats,
  searchQuery,
  onNavigateMenu,
  userRoleName,
  userFullName,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedComplaintModal, setSelectedComplaintModal] =
    useState<ComplaintRecord | null>(null);

  const prevFiscalYear: FiscalYear =
    selectedFiscalYear === '2083/84'
      ? '2082/83'
      : selectedFiscalYear === '2082/83'
        ? '2081/82'
        : '2081/82';

  // Filter complaints by district + search for interactive analytics & recent table
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (selectedDistrict && c.districtEn !== selectedDistrict) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const distNe = DISTRICT_NE_MAP[c.districtEn] || '';
        return (
          c.title.toLowerCase().includes(q) ||
          c.dartaNo.toLowerCase().includes(q) ||
          c.ministry.toLowerCase().includes(q) ||
          c.complainant.toLowerCase().includes(q) ||
          distNe.includes(q) ||
          c.districtEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, selectedDistrict, searchQuery]);

  // District counts across RBAC-accessible complaints in selected FY (or all if user searches)
  const districtCounts = useMemo(() => {
    const map: Record<string, number> = {};
    complaints
      .filter((c) => c.fiscalYear === selectedFiscalYear)
      .forEach((c) => {
        map[c.districtEn] = (map[c.districtEn] || 0) + 1;
      });
    return map;
  }, [complaints, selectedFiscalYear]);

  // Compute all 22 core stat cards + 4 conditional Technical stat cards
  const {
    complaintStats,
    monitoringAndOpsStats,
    extraTechStats,
    ministryData,
    natureData,
    statusData,
    monthlyData,
    recentTenComplaints,
    currentFyCount,
    farchhautCount,
    chaluCount,
    settlementPercentage,
    totalOfficeMonCount,
    totalTechAuditCount,
  } = useMemo(() => {
    const fyComplaints = filteredComplaints.filter(
      (c) => c.fiscalYear === selectedFiscalYear
    );
    const prevFyComplaints = filteredComplaints.filter(
      (c) => c.fiscalYear === prevFiscalYear
    );

    const totalAll = filteredComplaints.length;
    const prevFyCount = prevFyComplaints.length;
    const currFyCount = fyComplaints.length;

    const chaluCnt = fyComplaints.filter(
      (c) => c.status === 'chalu' || c.status === 'chhanbin_ma'
    ).length;
    const farchhautCnt = fyComplaints.filter(
      (c) => c.status === 'farchhaut'
    ).length;
    const kamBakiCount = fyComplaints.filter(
      (c) => c.status !== 'farchhaut'
    ).length;

    const settlementPct = currFyCount > 0 ? Math.round((farchhautCnt / currFyCount) * 100) : 0;

    const upToPrevMonthCount = fyComplaints.filter(
      (c) => c.monthIndex < CURRENT_NEPALI_MONTH_INDEX
    ).length;
    const thisMonthCount = fyComplaints.filter(
      (c) => c.monthIndex === CURRENT_NEPALI_MONTH_INDEX
    ).length;

    const helloSarkarCount = fyComplaints.filter(
      (c) => c.source === 'hello_sarkar'
    ).length;
    const hotlineCount = fyComplaints.filter(
      (c) => c.source === 'hotline'
    ).length;
    const onlineCount = fyComplaints.filter((c) => c.source === 'online').length;
    const kendraDartaCount = fyComplaints.filter(
      (c) => c.source === 'kendra_darta'
    ).length;
    const patracharBakiCount = fyComplaints.filter(
      (c) => c.status === 'patrachar_baki'
    ).length;

    // Activities in selected FY
    const fyActivities = activities.filter((a) => {
      if (a.fiscalYear !== selectedFiscalYear) return false;
      if (selectedDistrict && a.districtEn !== selectedDistrict) return false;
      return true;
    });

    const officeMonAll = fyActivities.filter(
      (a) =>
        a.activityType === 'karyalaya_anugaman' ||
        a.activityType === 'badapatra_anugaman'
    );
    const officeMonThisMonth = officeMonAll.filter(
      (a) => a.monthIndex === CURRENT_NEPALI_MONTH_INDEX
    );

    const totalNonCompliance = officeMonAll.reduce(
      (sum, a) => sum + (a.nonComplianceCount || 0),
      0
    );
    const totalDirectives = officeMonAll.reduce(
      (sum, a) => sum + (a.directiveCount || 0),
      0
    );
    const monthNonCompliance = officeMonThisMonth.reduce(
      (sum, a) => sum + (a.nonComplianceCount || 0),
      0
    );
    const monthDirectives = officeMonThisMonth.reduce(
      (sum, a) => sum + (a.directiveCount || 0),
      0
    );

    const investigationCount = fyActivities.filter(
      (a) => a.activityType === 'chhanbin_anveshan'
    ).length;
    const techAuditAll = fyActivities.filter(
      (a) => a.activityType === 'prabidhik_parikshan'
    );
    const techAuditThisMonth = techAuditAll.filter(
      (a) => a.monthIndex === CURRENT_NEPALI_MONTH_INDEX
    );
    const projectMonAll = fyActivities.filter(
      (a) => a.activityType === 'aayojana_anugaman'
    );
    const projectMonThisMonth = projectMonAll.filter(
      (a) => a.monthIndex === CURRENT_NEPALI_MONTH_INDEX
    );

    // 13 Complaint Stat Cards
    const cStats: StatItem[] = [
      { key: 'total', label: 'कूल उजुरी (ऐतिहासिक)', value: totalAll, highlight: 'navy' },
      { key: 'prev_fy', label: 'गत आ.व.को जिम्मेवारी', value: prevFyCount },
      { key: 'curr_fy', label: 'चालु आ.व.मा दर्ता', value: currFyCount, highlight: 'navy' },
      { key: 'chalu', label: 'चालु उजुरीहरु', value: chaluCnt },
      { key: 'farchhaut', label: 'फर्छ्यौट भएका', value: farchhautCnt, highlight: 'teal' },
      { key: 'kam_baki', label: 'काम बाँकी उजुरी', value: kamBakiCount, highlight: 'crimson' },
      { key: 'prev_month', label: 'गत महिनासम्मको', value: upToPrevMonthCount },
      { key: 'this_month', label: 'यस महिनाको दर्ता', value: thisMonthCount },
      { key: 'hello_sarkar', label: 'हेलो सरकारबाट', value: helloSarkarCount },
      { key: 'hotline', label: 'हटलाइन (१०६०)', value: hotlineCount },
      { key: 'online', label: 'अनलाइन पोर्टल', value: onlineCount },
      { key: 'kendra_darta', label: 'केन्द्रमा दर्ता', value: kendraDartaCount },
      { key: 'patrachar_baki', label: 'पत्राचार बाँकी', value: patracharBakiCount, highlight: 'crimson' },
    ];

    // 9 Monitoring & Core Activity Stat Cards
    const mStats: StatItem[] = [
      { key: 'total_mon', label: 'कूल कार्यालय अनुगमन', value: officeMonAll.length, highlight: 'navy' },
      { key: 'total_noncomp', label: 'कूल अपरिपालना संख्या', value: totalNonCompliance, highlight: 'crimson' },
      { key: 'total_dir', label: 'कूल निर्देशन संख्या', value: totalDirectives },
      { key: 'month_mon', label: 'यस महिनाको अनुगमन', value: officeMonThisMonth.length },
      { key: 'month_noncomp', label: 'यस महिनाको अपरिपालना', value: monthNonCompliance },
      { key: 'month_dir', label: 'यस महिनाको निर्देशन', value: monthDirectives },
      { key: 'chhanbin', label: 'छानविन तथा अन्वेषण', value: investigationCount },
      { key: 'tech_audit', label: 'प्राविधिक परीक्षण', value: techAuditAll.length },
      { key: 'proj_mon', label: 'आयोजना अनुगमन', value: projectMonAll.length },
    ];

    // 4 Extra Stat Cards for Technical Audit & Monitoring Division / Branches
    const tStats: StatItem[] = [
      {
        key: 'extra_total_proj',
        label: 'कूल आयोजना अनुगमन',
        value: activities.filter((a) => a.activityType === 'aayojana_anugaman').length,
        highlight: 'navy',
      },
      {
        key: 'extra_month_proj',
        label: 'यस महिनाको आयोजना अनुगमन',
        value: projectMonThisMonth.length,
        highlight: 'teal',
      },
      {
        key: 'extra_total_tech',
        label: 'कूल प्राविधिक परीक्षण',
        value: activities.filter((a) => a.activityType === 'prabidhik_parikshan').length,
        highlight: 'navy',
      },
      {
        key: 'extra_month_tech',
        label: 'यस महिनाको प्राविधिक परीक्षण',
        value: techAuditThisMonth.length,
        highlight: 'teal',
      },
    ];

    // Charts Data
    const minMap: Record<string, number> = {};
    const natMap: Record<string, number> = {};
    const stMap: Record<string, number> = {};

    fyComplaints.forEach((c) => {
      const shortMin = c.ministry.replace(' मन्त्रालय', '');
      minMap[shortMin] = (minMap[shortMin] || 0) + 1;
      natMap[c.nature] = (natMap[c.nature] || 0) + 1;
      const stLbl = COMPLAINT_STATUS_LABELS[c.status] || c.status;
      stMap[stLbl] = (stMap[stLbl] || 0) + 1;
    });

    const toChartArray = (obj: Record<string, number>): ChartDatum[] =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const mChart: MonthlyChartDatum[] = NEPALI_MONTHS.map((mName, idx) => {
      const mNum = idx + 1;
      const monthItems = fyComplaints.filter((c) => c.monthIndex === mNum);
      return {
        month: mName,
        darta: monthItems.length,
        farchhaut: monthItems.filter((c) => c.status === 'farchhaut').length,
      };
    });

    const recent10 = [...filteredComplaints]
      .sort((a, b) => b.nepaliDate.localeCompare(a.nepaliDate))
      .slice(0, 10);

    return {
      complaintStats: cStats,
      monitoringAndOpsStats: mStats,
      extraTechStats: tStats,
      ministryData: toChartArray(minMap),
      natureData: toChartArray(natMap),
      statusData: toChartArray(stMap),
      monthlyData: mChart,
      recentTenComplaints: recent10,
      currentFyCount: currFyCount,
      farchhautCount: farchhautCnt,
      chaluCount: chaluCnt,
      settlementPercentage: settlementPct,
      totalOfficeMonCount: officeMonAll.length,
      totalTechAuditCount: techAuditAll.length,
    };
  }, [filteredComplaints, activities, selectedFiscalYear, prevFiscalYear, selectedDistrict]);

  const renderStatTile = (item: StatItem) => {
    const iconConfig = STAT_ICONS[item.key] || {
      icon: faFolderOpen,
      colorClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };

    const valueColor =
      item.highlight === 'crimson'
        ? 'text-red-700'
        : item.highlight === 'teal'
          ? 'text-emerald-700'
          : item.highlight === 'navy'
            ? 'text-blue-950'
            : 'text-slate-800';

    return (
      <div
        key={item.key}
        className="glass-panel stat-tile-glow rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative group cursor-default"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 leading-snug line-clamp-2">
            {item.label}
          </span>
          <span
            className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${iconConfig.colorClass}`}
          >
            <FontAwesomeIcon icon={iconConfig.icon} aria-hidden="true" className="text-xs sm:text-sm" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <div className={`text-2xl sm:text-2xl.5 font-bold font-mono-num tracking-tight ${valueColor}`}>
            {toNepaliDigits(item.value)}
          </div>
          {item.highlight === 'teal' && (
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              सम्पन्न
            </span>
          )}
          {item.highlight === 'crimson' && item.value > 0 && (
            <span className="inline-flex items-center text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200/60">
              ध्यानाकर्षण
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Hero Glass Card (Single-Pane Executive Command Centre) */}
      <section className="glass-panel-elevated rounded-2xl p-5 sm:p-6 border border-slate-200/90 relative overflow-hidden shadow-sm">
        {/* Subtle Decorative Gradient Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-blue-400/10 via-red-400/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-900 text-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                ड्यासबोर्ड
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/70">
                आर्थिक वर्ष: <strong className="text-slate-800">{toNepaliDigits(selectedFiscalYear)}</strong>
              </span>
              {selectedDistrict && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                  <Filter className="w-3 h-3" />
                  जिल्ला: {DISTRICT_NE_MAP[selectedDistrict] || selectedDistrict}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-blue-950">
              राष्ट्रिय सतर्कता केन्द्र — एकीकृत सुशासन तथा अनुगमन प्रणाली
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              भ्रष्टाचार निवारण ऐन, २०५९ बमोजिम सरकारी निकायहरूको नियमित तथा छड्के अनुगमन, उजुरी छानविन, नागरिक बडापत्र परिपालना र सार्वजनिक पूर्वाधार आयोजनाहरूको प्राविधिक परीक्षण।
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
            <button
              type="button"
              onClick={() => onNavigateMenu('new_complaint')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              उजुरी दर्ता
            </button>
            <button
              type="button"
              onClick={() => onNavigateMenu('office_monitoring')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-950 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              कार्यालय अनुगमन
            </button>
            <button
              type="button"
              onClick={() => onNavigateMenu('technical_audit')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-950 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <HardHat className="w-3.5 h-3.5 text-indigo-700" />
              प्राविधिक परीक्षण
            </button>
          </div>
        </div>

        {/* Executive High-Impact 4-Metrics Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">चालु आ.व. कुल उजुरी</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-num text-blue-950 mt-0.5">
              {toNepaliDigits(currentFyCount)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">समग्र स्रोतबाट प्राप्त</span>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">उजुरी फर्छ्यौट दर</span>
              <span className="text-[11px] font-bold text-emerald-700 font-mono-num">
                {toNepaliDigits(settlementPercentage)}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-num text-emerald-700 mt-0.5">
              {toNepaliDigits(farchhautCount)}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, settlementPercentage))}%` }}
              />
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">छड्के कार्यालय अनुगमन</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-num text-blue-900 mt-0.5">
              {toNepaliDigits(totalOfficeMonCount)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">हाजिरी, पोशाक तथा बडापत्र</span>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">प्राविधिक परीक्षण ( पूर्वाधार )</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-num text-indigo-950 mt-0.5">
              {toNepaliDigits(totalTechAuditCount)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">सडक, पुल, भवन र आयोजना</span>
          </div>
        </div>
      </section>

      {/* 2. Conditional Technical Division / Branch Extra Stat Cards */}
      {showExtraTechStats && (
        <section aria-label="प्राविधिक विशेष सूचकहरू" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-xs sm:text-sm font-bold text-blue-950">
                प्राविधिक परीक्षण तथा आयोजना अनुगमन विशेष सूचकहरू
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
              प्राविधिक परीक्षण तथा अनुगमन महाशाखा / शाखा
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {extraTechStats.map(renderStatTile)}
          </div>
        </section>
      )}

      {/* 3. Complaint Management Stat Cards (13 cards) */}
      <section aria-label="उजुरी व्यवस्थापन मुख्य सूचकहरू" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <h2 className="text-sm font-bold text-slate-900">
              उजुरी दर्ता, स्रोत तथा फर्छ्यौट विवरण
            </h2>
          </div>
          {selectedDistrict && (
            <button
              type="button"
              onClick={() => setSelectedDistrict(null)}
              className="text-xs text-red-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              जिल्ला फिल्टर हटाउनुहोस् ({DISTRICT_NE_MAP[selectedDistrict] || selectedDistrict})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {complaintStats.map(renderStatTile)}
        </div>
      </section>

      {/* 4. Office Monitoring, Investigation, Technical Audit & Project Monitoring Stat Cards (9 cards) */}
      <section aria-label="अनुगमन तथा परीक्षण सूचकहरू" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">
              कार्यालय अनुगमन, अपरिपालना, निर्देशन तथा परीक्षण विवरण
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            चालु महिना: {NEPALI_MONTHS[CURRENT_NEPALI_MONTH_INDEX - 1]} २०८३
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {monitoringAndOpsStats.map(renderStatTile)}
        </div>
      </section>

      {/* 5. Nepal 77-District GeoJSON Choropleth Map */}
      <section aria-label="७७ जिल्ला उजुरी नक्सा">
        <NepalChoroplethMap
          districtCounts={districtCounts}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </section>

      {/* 6. Switchable Donut/Pie/Bar Charts (Ministry, Nature, Status) */}
      <section aria-label="मन्त्रालय, प्रकृति र स्थिति अनुसार उजुरी विश्लेषण">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SwitchableCategoricalChart
            title="मन्त्रालय / निकाय अनुसार उजुरी"
            subtitle="सम्बद्ध मन्त्रालयगत उजुरी अनुपात"
            data={ministryData}
            defaultMode="donut"
          />
          <SwitchableCategoricalChart
            title="उजुरीको प्रकृति अनुसार विवरण"
            subtitle="विषयगत वर्गीकरणका आधारमा उजुरीहरू"
            data={natureData}
            defaultMode="donut"
          />
          <SwitchableCategoricalChart
            title="उजुरीको स्थिति अनुसार विवरण"
            subtitle="कार्यान्वयन तथा फर्छ्यौट अवस्था"
            data={statusData}
            defaultMode="donut"
          />
        </div>
      </section>

      {/* 7. Monthly Complaint Registration & Settlement Switchable Bar Chart */}
      <section aria-label="मासिक उजुरी दर्ता र फर्छ्यौट चार्ट">
        <SwitchableMonthlyChart
          data={monthlyData}
          fiscalYearLabel={`आ.व. ${toNepaliDigits(selectedFiscalYear)}`}
        />
      </section>

      {/* 8. Recent 10 Complaints Table (Enhanced Government Data Table) */}
      <section
        aria-label="पछिल्ला १० उजुरीहरुको सूची"
        className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
              <h3 className="text-base font-bold text-slate-900">
                पछिल्ला १० उजुरीहरुको सूची (Recent Complaints)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              हालै दर्ता तथा अद्यावधिक भएका उजुरीहरूको विस्तृत तालिका
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateMenu('complaints_all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            सबै उजुरी हेर्नुहोस्
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50/70 uppercase tracking-wider">
                <th className="py-2.5 px-3 whitespace-nowrap">क्र.सं.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">दर्ता नं.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">दर्ता मिति</th>
                <th className="py-2.5 px-3 min-w-[200px]">उजुरीको विषय</th>
                <th className="py-2.5 px-3 min-w-[150px]">मन्त्रालय / निकाय</th>
                <th className="py-2.5 px-3 whitespace-nowrap">माध्यम · जिल्ला</th>
                <th className="py-2.5 px-3 min-w-[140px]">जिम्मेवार शाखा</th>
                <th className="py-2.5 px-3 whitespace-nowrap">स्थिति</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">विवरण</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentTenComplaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    कुनै उजुरी अभिलेख फेला परेन।
                  </td>
                </tr>
              ) : (
                recentTenComplaints.map((c, index) => {
                  const isFarchhaut = c.status === 'farchhaut';
                  const isPending = c.status === 'patrachar_baki' || c.status === 'kam_baki';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono-num text-slate-500">
                        {toNepaliDigits(index + 1)}
                      </td>
                      <td className="py-3 px-3 font-mono-num font-bold text-blue-950 whitespace-nowrap">
                        {c.dartaNo}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-slate-600 whitespace-nowrap">
                        {c.nepaliDate}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-xs" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {c.nature}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 truncate max-w-[190px]" title={c.ministry}>
                        {c.ministry}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <span className="font-medium">{COMPLAINT_SOURCE_LABELS[c.source]}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span className="text-slate-500">{DISTRICT_NE_MAP[c.districtEn] || c.districtEn}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[170px]" title={getShakhaName(c.shakhaId)}>
                        {getShakhaName(c.shakhaId)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${isFarchhaut
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isPending
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                        >
                          {COMPLAINT_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedComplaintModal(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-900 font-medium hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          हेर्नुहोस्
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Official Complaint E-Dossier Modal (डिजिटल मिसिल) */}
      <ComplaintDossierModal
        complaint={selectedComplaintModal}
        onClose={() => setSelectedComplaintModal(null)}
        onEdit={() => {
          setSelectedComplaintModal(null);
          onNavigateMenu('complaints_all');
        }}
      />
    </div>
  );
};
