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
import { Eye, X } from 'lucide-react';

interface DashboardOverviewProps {
  complaints: ComplaintRecord[];
  activities: ActivityRecord[];
  selectedFiscalYear: FiscalYear;
  showExtraTechStats: boolean;
  searchQuery: string;
  onNavigateMenu: (menu: MenuId) => void;
}

interface StatItem {
  key: string;
  label: string;
  value: number;
  subNote?: string;
  highlight?: 'navy' | 'crimson' | 'teal' | 'default';
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  complaints,
  activities,
  selectedFiscalYear,
  showExtraTechStats,
  searchQuery,
  onNavigateMenu,
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
  } = useMemo(() => {
    const fyComplaints = filteredComplaints.filter(
      (c) => c.fiscalYear === selectedFiscalYear
    );
    const prevFyComplaints = filteredComplaints.filter(
      (c) => c.fiscalYear === prevFiscalYear
    );

    const totalAll = filteredComplaints.length;
    const prevFyCount = prevFyComplaints.length;
    const currentFyCount = fyComplaints.length;

    const chaluCount = fyComplaints.filter(
      (c) => c.status === 'chalu' || c.status === 'chhanbin_ma'
    ).length;
    const farchhautCount = fyComplaints.filter(
      (c) => c.status === 'farchhaut'
    ).length;
    const kamBakiCount = fyComplaints.filter(
      (c) => c.status !== 'farchhaut'
    ).length;

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

    // 13 Complaint Stat Cards (exact Nepali labels from specification h)
    const cStats: StatItem[] = [
      { key: 'total', label: 'कूल उजुरी', value: totalAll, highlight: 'navy' },
      { key: 'prev_fy', label: 'गत आ.व.को', value: prevFyCount },
      { key: 'curr_fy', label: 'चालु आ.व.को', value: currentFyCount, highlight: 'navy' },
      { key: 'chalu', label: 'चालु उजुरीहरु', value: chaluCount },
      { key: 'farchhaut', label: 'फर्छ्यौट भएका', value: farchhautCount, highlight: 'teal' },
      { key: 'kam_baki', label: 'काम बाँकी', value: kamBakiCount, highlight: 'crimson' },
      { key: 'prev_month', label: 'गत महिनासम्मको', value: upToPrevMonthCount },
      { key: 'this_month', label: 'यस महिनाको', value: thisMonthCount },
      { key: 'hello_sarkar', label: 'हेलो सरकार', value: helloSarkarCount },
      { key: 'hotline', label: 'हटलाइन', value: hotlineCount },
      { key: 'online', label: 'अनलाइन', value: onlineCount },
      { key: 'kendra_darta', label: 'केन्द्रमा दर्ता भएका', value: kendraDartaCount },
      { key: 'patrachar_baki', label: 'पत्राचार बाँकी', value: patracharBakiCount, highlight: 'crimson' },
    ];

    // 9 Monitoring & Core Activity Stat Cards (exact Nepali labels from specification h)
    const mStats: StatItem[] = [
      { key: 'total_mon', label: 'कूल कार्यालय अनुगमन', value: officeMonAll.length, highlight: 'navy' },
      { key: 'total_noncomp', label: 'कूल अपरिपालना संख्या', value: totalNonCompliance, highlight: 'crimson' },
      { key: 'total_dir', label: 'कूल निर्देशन संख्या', value: totalDirectives },
      { key: 'month_mon', label: 'यस महिनाको अनुगमन', value: officeMonThisMonth.length },
      { key: 'month_noncomp', label: 'यस महिनाको अपरिपालना संख्या', value: monthNonCompliance },
      { key: 'month_dir', label: 'यस महिनाको निर्देशन संख्या', value: monthDirectives },
      { key: 'chhanbin', label: 'छानविन अन्वेषण', value: investigationCount },
      { key: 'tech_audit', label: 'प्राविधिक परीक्षण', value: techAuditAll.length },
      { key: 'proj_mon', label: 'आयोजना अनुगमन', value: projectMonAll.length },
    ];

    // 4 Extra Stat Cards for Technical Audit & Monitoring Division / Branches (Requirement i)
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
    };
  }, [filteredComplaints, activities, selectedFiscalYear, prevFiscalYear, selectedDistrict]);

  const renderStatTile = (item: StatItem) => {
    const valueColor =
      item.highlight === 'crimson'
        ? 'text-red-800'
        : item.highlight === 'teal'
        ? 'text-teal-800'
        : item.highlight === 'navy'
        ? 'text-blue-950'
        : 'text-slate-900';

    return (
      <div
        key={item.key}
        className="bg-white border border-slate-200 rounded-lg px-4 py-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between"
      >
        <span className="text-xs font-medium text-slate-600 leading-snug">
          {item.label}
        </span>
        <div className={`mt-2 text-2xl font-bold font-mono-num tracking-tight ${valueColor}`}>
          {toNepaliDigits(item.value)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Requirement i: Conditional Technical Division / Branch Extra Stat Cards */}
      {showExtraTechStats && (
        <section aria-label="प्राविधिक विशेष सूचकहरू">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-blue-950">
              प्राविधिक परीक्षण तथा आयोजना अनुगमन विशेष सूचकहरू
            </h2>
            <span className="text-xs text-slate-500">
              प्राविधिक परीक्षण तथा अनुगमन महाशाखा / शाखा विशेष
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {extraTechStats.map(renderStatTile)}
          </div>
        </section>
      )}

      {/* Requirement h: Part 1 — Complaint Management Stat Cards (13 cards) */}
      <section aria-label="उजुरी व्यवस्थापन मुख्य सूचकहरू">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <h2 className="text-sm font-semibold text-slate-800">
            ०१. उजुरी दर्ता, स्रोत तथा फर्छ्यौट विवरण
          </h2>
          {selectedDistrict && (
            <span className="text-xs text-red-800 font-medium">
              जिल्ला फिल्टर सक्रिय: {DISTRICT_NE_MAP[selectedDistrict] || selectedDistrict}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {complaintStats.map(renderStatTile)}
        </div>
      </section>

      {/* Requirement h: Part 2 — Office Monitoring, Investigation, Technical Audit & Project Monitoring Stat Cards (9 cards) */}
      <section aria-label="अनुगमन तथा परीक्षण सूचकहरू">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-800">
            ०२. कार्यालय अनुगमन, अपरिपालना, निर्देशन तथा परीक्षण विवरण
          </h2>
          <span className="text-xs text-slate-500">
            चालु महिना: {NEPALI_MONTHS[CURRENT_NEPALI_MONTH_INDEX - 1]} २०८३
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {monitoringAndOpsStats.map(renderStatTile)}
        </div>
      </section>

      {/* Requirement h: Nepal 77-District GeoJSON Choropleth Map */}
      <section aria-label="७७ जिल्ला उजुरी नक्सा">
        <NepalChoroplethMap
          districtCounts={districtCounts}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </section>

      {/* Requirement h: 3 Switchable Donut Charts (Ministry, Nature, Status) */}
      <section aria-label="मन्त्रालय, प्रकृति र स्थिति अनुसार उजुरी विश्लेषण">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SwitchableCategoricalChart
            title="मन्त्रालय / निकाय अनुसार उजुरी"
            subtitle="सम्बद्ध तालुका मन्त्रालयगत उजुरी अनुपात"
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

      {/* Requirement h: Monthly Complaint Registration & Settlement Switchable Bar Chart */}
      <section aria-label="मासिक उजुरी दर्ता र फर्छ्यौट चार्ट">
        <SwitchableMonthlyChart
          data={monthlyData}
          fiscalYearLabel={`आ.व. ${toNepaliDigits(selectedFiscalYear)}`}
        />
      </section>

      {/* Requirement h: Recent 10 Complaints Table */}
      <section
        aria-label="पछिल्ला १० उजुरीहरुको सूची"
        className="bg-white border border-slate-200 rounded-lg p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              पछिल्ला १० उजुरीहरुको सूची (Recent Complaints)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              हालै दर्ता तथा अद्यावधिक भएका उजुरीहरूको विस्तृत तालिका
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateMenu('complaints_all')}
            className="px-3 py-1.5 text-xs font-medium text-blue-950 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            सबै उजुरी हेर्नुहोस्
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/70">
                <th className="py-2.5 px-3 whitespace-nowrap">क्र.सं.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">दर्ता नं.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">दर्ता मिति</th>
                <th className="py-2.5 px-3">उजुरीको विषय</th>
                <th className="py-2.5 px-3">मन्त्रालय / निकाय</th>
                <th className="py-2.5 px-3 whitespace-nowrap">माध्यम · जिल्ला</th>
                <th className="py-2.5 px-3">जिम्मेवार शाखा</th>
                <th className="py-2.5 px-3 whitespace-nowrap">स्थिति</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">विवरण</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentTenComplaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    कुनै उजुरी अभिलेख फेला परेन।
                  </td>
                </tr>
              ) : (
                recentTenComplaints.map((c, index) => {
                  const statusColor =
                    c.status === 'farchhaut'
                      ? 'text-teal-800 font-semibold'
                      : c.status === 'patrachar_baki' || c.status === 'kam_baki'
                      ? 'text-red-800 font-semibold'
                      : 'text-blue-900 font-medium';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono-num text-slate-500">
                        {toNepaliDigits(index + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {c.dartaNo}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-slate-600 whitespace-nowrap">
                        {c.nepaliDate}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {c.nature}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-[190px] truncate" title={c.ministry}>
                        {c.ministry}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <span>{COMPLAINT_SOURCE_LABELS[c.source]}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{DISTRICT_NE_MAP[c.districtEn] || c.districtEn}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[170px] truncate" title={getShakhaName(c.shakhaId)}>
                        {getShakhaName(c.shakhaId)}
                      </td>
                      <td className={`py-2.5 px-3 whitespace-nowrap ${statusColor}`}>
                        {COMPLAINT_STATUS_LABELS[c.status]}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedComplaintModal(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-blue-950 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Complaint Detail Modal */}
      {selectedComplaintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono-num text-blue-900 font-semibold">
                  दर्ता नं: {selectedComplaintModal.dartaNo} · मिति: {selectedComplaintModal.nepaliDate}
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {selectedComplaintModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaintModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-slate-500">उजुरीकर्ता / निवेदक</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedComplaintModal.complainant}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-slate-500">उजुरीको माध्यम र जिल्ला</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {COMPLAINT_SOURCE_LABELS[selectedComplaintModal.source]} ·{' '}
                  {DISTRICT_NE_MAP[selectedComplaintModal.districtEn] ||
                    selectedComplaintModal.districtEn}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-slate-500">सम्बद्ध मन्त्रालय / निकाय</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedComplaintModal.ministry}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-slate-500">उजुरीको प्रकृति</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedComplaintModal.nature}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100 sm:col-span-2">
                <div className="text-slate-500">जिम्मेवार शाखा र हालको स्थिति</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {getShakhaName(selectedComplaintModal.shakhaId)} ·{' '}
                  <span className="text-blue-900">
                    {COMPLAINT_STATUS_LABELS[selectedComplaintModal.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedComplaintModal(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-md cursor-pointer"
              >
                बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
