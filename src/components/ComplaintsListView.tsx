import React, { useMemo, useState } from 'react';
import { supabase, OperationType, handleSupabaseError } from '../supabase';
import {
  ComplaintRecord,
  ComplaintSource,
  RoleLevel,
} from '../types/nvc';
import {
  NEPALI_YEARS,
  NEPALI_MONTHS,
  SHAKHAS,
  MINISTRIES_LIST,
  COMPLAINT_STATUS_LABELS,
  getShakhaName,
  toNepaliDigits,
  fromNepaliDigits,
  DISTRICT_NE_MAP,
} from '../data/nvcStructure';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Save,
  FileSpreadsheet,
  FileDown,
  PlusCircle,
  MessageSquarePlus,
  Eye,
  SquarePen,
  Trash2,
  Check,
} from 'lucide-react';

interface ComplaintsListViewProps {
  titleLabel: string;
  complaints: ComplaintRecord[];
  sourceFilter?: ComplaintSource | null;
  globalSearchQuery: string;
  effectiveRole: RoleLevel;
  onAddNewComplaint: () => void;
  onEditComplaint: (cmp: ComplaintRecord) => void;
}

type SearchScope = 'all' | 'dartaNo' | 'complainant' | 'respondent' | 'title';

export const ComplaintsListView: React.FC<ComplaintsListViewProps> = ({
  titleLabel,
  complaints,
  sourceFilter = null,
  globalSearchQuery,
  effectiveRole,
  onAddNewComplaint,
  onEditComplaint,
}) => {
  const [filterExpanded, setFilterExpanded] = useState(true);

  // Column 1: मितिको दायरा (RANGE)
  const [fromYear, setFromYear] = useState('');
  const [fromMonth, setFromMonth] = useState('');
  const [fromDay, setFromDay] = useState('');
  const [toYear, setToYear] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [toDay, setToDay] = useState('');

  // Column 2: विवरण
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [shakhaFilter, setShakhaFilter] = useState<string>('all');
  const [ministryFilter, setMinistryFilter] = useState<string>('all');

  // Column 3: खोजी र क्रम
  const [sortField, setSortField] = useState<'nepaliDate' | 'dartaNo'>('nepaliDate');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [localSearch, setLocalSearch] = useState('');

  // Pagination & Selection
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals & Feedback
  const [viewingComplaint, setViewingComplaint] = useState<ComplaintRecord | null>(null);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [bulkRemarksText, setBulkRemarksText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const normalizeDateComparable = (nepDate: string): string => {
    const ascii = fromNepaliDigits(nepDate || '');
    const parts = ascii.split('-');
    if (parts.length !== 3) return ascii;
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  };

  const filteredAndSorted = useMemo(() => {
    const fromBound =
      fromYear
        ? `${fromNepaliDigits(fromYear)}-${String(fromMonth || '01').padStart(2, '0')}-${String(fromDay || '01').padStart(2, '0')}`
        : '';
    const toBound =
      toYear
        ? `${fromNepaliDigits(toYear)}-${String(toMonth || '12').padStart(2, '0')}-${String(toDay || '32').padStart(2, '0')}`
        : '';

    const combinedQuery = (localSearch.trim() || globalSearchQuery.trim()).toLowerCase();

    const list = complaints.filter((c) => {
      if (sourceFilter && c.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (shakhaFilter !== 'all' && c.shakhaId !== shakhaFilter) return false;
      if (ministryFilter !== 'all' && c.ministry !== ministryFilter) return false;

      if (decisionFilter === 'has_decision') {
        if (!c.committeeDecision || c.committeeDecision === '-') return false;
      } else if (decisionFilter === 'no_decision') {
        if (c.committeeDecision && c.committeeDecision !== '-') return false;
      } else if (decisionFilter === 'finalized') {
        if (!c.finalDecision || c.finalDecision === '-') return false;
      }

      if (fromBound || toBound) {
        const cmpDate = normalizeDateComparable(c.nepaliDate);
        if (fromBound && cmpDate < fromBound) return false;
        if (toBound && cmpDate > toBound) return false;
      }

      if (combinedQuery) {
        const respondentStr = (c.respondent || '').toLowerCase();
        const decisionStr = (c.committeeDecision || '').toLowerCase();
        if (searchScope === 'dartaNo') {
          return c.dartaNo.toLowerCase().includes(combinedQuery);
        }
        if (searchScope === 'complainant') {
          return c.complainant.toLowerCase().includes(combinedQuery);
        }
        if (searchScope === 'respondent') {
          return respondentStr.includes(combinedQuery);
        }
        if (searchScope === 'title') {
          return c.title.toLowerCase().includes(combinedQuery);
        }
        return (
          c.dartaNo.toLowerCase().includes(combinedQuery) ||
          c.title.toLowerCase().includes(combinedQuery) ||
          c.complainant.toLowerCase().includes(combinedQuery) ||
          respondentStr.includes(combinedQuery) ||
          c.ministry.toLowerCase().includes(combinedQuery) ||
          decisionStr.includes(combinedQuery)
        );
      }

      return true;
    });

    list.sort((a, b) => {
      const valA =
        sortField === 'nepaliDate'
          ? normalizeDateComparable(a.nepaliDate)
          : fromNepaliDigits(a.dartaNo);
      const valB =
        sortField === 'nepaliDate'
          ? normalizeDateComparable(b.nepaliDate)
          : fromNepaliDigits(b.dartaNo);
      return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    return list;
  }, [
    complaints,
    sourceFilter,
    statusFilter,
    decisionFilter,
    shakhaFilter,
    ministryFilter,
    fromYear,
    fromMonth,
    fromDay,
    toYear,
    toMonth,
    toDay,
    localSearch,
    globalSearchQuery,
    searchScope,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredAndSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleResetFilters = () => {
    setFromYear('');
    setFromMonth('');
    setFromDay('');
    setToYear('');
    setToMonth('');
    setToDay('');
    setStatusFilter('all');
    setDecisionFilter('all');
    setShakhaFilter('all');
    setMinistryFilter('all');
    setSortField('nepaliDate');
    setSortOrder('desc');
    setSearchScope('all');
    setLocalSearch('');
    setCurrentPage(1);
  };

  const handleSaveFilterPreset = () => {
    localStorage.setItem(
      'nvc_saved_complaint_filter',
      JSON.stringify({ statusFilter, decisionFilter, shakhaFilter, ministryFilter, sortField, sortOrder })
    );
    setBannerNotice('हालको फिल्टर सेटिङ्ग सुरक्षित गरियो।');
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    const allSelectedOnPage =
      paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        paginatedRows.forEach((r) => next.delete(r.id));
      } else {
        paginatedRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleExportExcelCsv = () => {
    const rowsToExport =
      selectedIds.size > 0
        ? filteredAndSorted.filter((c) => selectedIds.has(c.id))
        : filteredAndSorted;

    const headers = [
      'दर्ता नं',
      'मिति',
      'प्राथमिकता',
      'उजुरकर्ता',
      'विपक्षी',
      'मन्त्रालय/निकाय',
      'उजुरीको विवरण',
      'समितिको निर्णय',
      'अन्तिम निर्णयको प्रकार',
      'अन्तिम निर्णय',
      'कार्यान्वयनको जानकारी प्राप्त मिति',
      'कैफियत',
      'शाखा',
      'स्थिति',
    ];

    const csvLines = [
      headers.join(','),
      ...rowsToExport.map((c) =>
        [
          c.dartaNo,
          c.nepaliDate,
          c.priority || 'मध्यम',
          c.complainant,
          c.respondent || '-',
          c.ministry || '-',
          c.title,
          c.committeeDecision || '-',
          c.finalDecisionType || '-',
          c.finalDecision || '-',
          c.implementationInfoDate || '-',
          c.remarks || '-',
          getShakhaName(c.shakhaId),
          COMPLAINT_STATUS_LABELS[c.status],
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NVC_Complaints_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleBulkSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRemarksText.trim() || selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from('complaints').update({
          remarks: bulkRemarksText.trim().slice(0, 500),
          updatedAt: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
      }
      setRemarksModalOpen(false);
      setBulkRemarksText('');
      setBannerNotice(`${toNepaliDigits(ids.length)} उजुरीमा कैफियत अद्यावधिक गरियो।`);
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, 'complaints');
    }
  };

  const handleDeleteRow = async (cmp: ComplaintRecord) => {
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', cmp.id);
      if (error) throw error;
      setConfirmDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(cmp.id);
        return next;
      });
      setBannerNotice(`दर्ता नं. ${cmp.dartaNo} प्रणालीबाट हटाइयो।`);
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, `complaints/${cmp.id}`);
    }
  };

  return (
    <div className="space-y-4">
      {bannerNotice && (
        <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-950">
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-blue-700 hover:text-blue-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* १. फिल्टरहरू Card matching complaint.pdf */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Filter className="w-4 h-4 text-slate-700" />
            <span>फिल्टरहरू</span>
          </div>
          <button
            type="button"
            onClick={() => setFilterExpanded((p) => !p)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors cursor-pointer"
            aria-label="फिल्टर खोल्नुहोस् वा बन्द गर्नुहोस्"
          >
            {filterExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {filterExpanded && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: मितिको दायरा (RANGE) */}
              <div className="space-y-2.5 lg:pr-4 lg:border-r lg:border-slate-100">
                <div className="font-bold text-slate-700">मितिको दायरा (RANGE)</div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">साल</option>
                    {NEPALI_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">महिना</option>
                    {NEPALI_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={fromDay}
                    onChange={(e) => setFromDay(e.target.value)}
                    className="w-18 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">गते</option>
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {toNepaliDigits(d)}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 shrink-0">देखि</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">साल</option>
                    {NEPALI_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">महिना</option>
                    {NEPALI_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={toDay}
                    onChange={(e) => setToDay(e.target.value)}
                    className="w-18 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                  >
                    <option value="">गते</option>
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {toNepaliDigits(d)}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 shrink-0">सम्म</span>
                </div>
              </div>

              {/* Column 2: विवरण */}
              <div className="space-y-2.5 lg:pr-4 lg:border-r lg:border-slate-100">
                <div className="font-bold text-slate-700">विवरण</div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="all">स्थिति (सबै)</option>
                  {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>

                <select
                  value={decisionFilter}
                  onChange={(e) => {
                    setDecisionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="all">केन्द्रको निर्णय (सबै)</option>
                  <option value="has_decision">समितिको निर्णय भइसकेको</option>
                  <option value="no_decision">निर्णय बाँकी</option>
                  <option value="finalized">अन्तिम निर्णय भइसकेको</option>
                </select>

                <select
                  value={shakhaFilter}
                  onChange={(e) => {
                    setShakhaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="all">शाखा (सबै)</option>
                  {SHAKHAS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameNe}
                    </option>
                  ))}
                </select>

                <select
                  value={ministryFilter}
                  onChange={(e) => {
                    setMinistryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="all">मन्त्रालय/निकाय (सबै)</option>
                  {MINISTRIES_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column 3: खोजी र क्रम */}
              <div className="space-y-2.5">
                <div className="font-bold text-slate-700">खोजी र क्रम</div>

                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as 'nepaliDate' | 'dartaNo')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="nepaliDate">दर्ता मिति</option>
                  <option value="dartaNo">दर्ता नं</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800"
                >
                  <option value="desc">नयाँ -&gt; पुरानो</option>
                  <option value="asc">पुरानो -&gt; नयाँ</option>
                </select>

                <div className="flex items-center gap-1.5">
                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    className="w-28 px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-800 shrink-0"
                  >
                    <option value="all">सबै</option>
                    <option value="dartaNo">दर्ता नं</option>
                    <option value="complainant">उजुरकर्ता</option>
                    <option value="respondent">विपक्षी</option>
                    <option value="title">विवरण</option>
                  </select>
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => {
                      setLocalSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="खोज्नुहोस्..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
                  />
                </div>
              </div>
            </div>

            {/* Filter Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>खोज्नुहोस्</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>रिसेट</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveFilterPreset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 font-medium rounded-md transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>फिल्टर सेभ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportExcelCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium rounded-md transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* २. उजुरी सूची Table Card matching complaint.pdf */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            {titleLabel} ({filteredAndSorted.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Export ( {selectedIds.size} )</span>
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 font-medium"
            >
              <option value={10}>१० प्रति पेज</option>
              <option value={25}>२५ प्रति पेज</option>
              <option value={50}>५० प्रति पेज</option>
              <option value={100}>१०० प्रति पेज</option>
            </select>

            <button
              type="button"
              onClick={() => {
                if (selectedIds.size === 0) {
                  onAddNewComplaint();
                } else {
                  setBannerNotice(
                    `${toNepaliDigits(selectedIds.size)} उजुरीहरू छानविन क्युमा थपियो।`
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>क्यु थप्नुहोस्</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedIds.size === 0) {
                  setBannerNotice('कैफियत थप्न कृपया कम्तीमा एउटा उजुरी छान्नुहोस्।');
                } else {
                  setRemarksModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 rounded-md font-medium transition-colors cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>कैफियत</span>
            </button>
          </div>
        </div>

        {/* Exact 13-Column Table matching complaint.pdf */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-800">
                <th className="py-3 px-3 w-9">
                  <input
                    type="checkbox"
                    checked={
                      paginatedRows.length > 0 &&
                      paginatedRows.every((r) => selectedIds.has(r.id))
                    }
                    onChange={toggleSelectAllPage}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2.5 w-32">दर्ता नं</th>
                <th className="py-3 px-2.5 w-28">मिति</th>
                <th className="py-3 px-2.5 w-32">उजुरकर्ता</th>
                <th className="py-3 px-2.5 w-36">विपक्षी</th>
                <th className="py-3 px-2.5 w-36">मन्त्रालय/निकाय</th>
                <th className="py-3 px-3 w-72">उजुरीको विवरण</th>
                <th className="py-3 px-3 w-56">समितिको निर्णय</th>
                <th className="py-3 px-2.5 w-28">अन्तिम निर्णय</th>
                <th className="py-3 px-2.5 w-24">कैफियत</th>
                <th className="py-3 px-2.5 w-36">शाखा</th>
                <th className="py-3 px-2.5 w-24">स्थिति</th>
                <th className="py-3 px-3 w-24 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs align-top">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    छनौट गरिएको फिल्टरमा कुनै उजुरी भेटिएन।
                  </td>
                </tr>
              ) : (
                paginatedRows.map((c) => {
                  const priorityColor =
                    c.priority === 'उच्च'
                      ? 'text-red-700 font-semibold'
                      : c.priority === 'सामान्य'
                      ? 'text-slate-500'
                      : 'text-amber-600 font-medium';

                  const statusTextColor =
                    c.status === 'farchhaut'
                      ? 'text-emerald-700 font-semibold'
                      : c.status === 'chhanbin_ma' || c.status === 'chalu'
                      ? 'text-blue-800 font-semibold'
                      : 'text-amber-600 font-semibold';

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        selectedIds.has(c.id) ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelectRow(c.id)}
                          className="rounded border-slate-300 cursor-pointer mt-0.5"
                        />
                      </td>

                      {/* दर्ता नं */}
                      <td className="py-3.5 px-2.5 font-bold text-slate-900 break-words">
                        {c.dartaNo}
                      </td>

                      {/* मिति + प्राथमिकता */}
                      <td className="py-3.5 px-2.5 whitespace-nowrap">
                        <div className="text-slate-800 font-mono-num">{c.nepaliDate}</div>
                        {c.priority && (
                          <div className={`text-[11px] mt-0.5 ${priorityColor}`}>
                            {c.priority}
                          </div>
                        )}
                      </td>

                      {/* उजुरकर्ता */}
                      <td className="py-3.5 px-2.5 text-slate-800 break-words">
                        {c.complainant || 'बेनामी'}
                      </td>

                      {/* विपक्षी */}
                      <td className="py-3.5 px-2.5 text-slate-800 break-words">
                        {c.respondent || '-'}
                      </td>

                      {/* मन्त्रालय/निकाय */}
                      <td className="py-3.5 px-2.5 text-slate-700 break-words">
                        {c.ministry || '-'}
                      </td>

                      {/* उजुरीको विवरण */}
                      <td className="py-3.5 px-3 text-slate-800 leading-relaxed">
                        {c.title}
                      </td>

                      {/* समितिको निर्णय */}
                      <td className="py-3.5 px-3 text-slate-800 leading-relaxed">
                        {c.committeeDecision || '-'}
                      </td>

                      {/* अन्तिम निर्णय */}
                      <td className="py-3.5 px-2.5 text-slate-700">
                        <div>
                          {c.finalDecisionType && c.finalDecisionType !== '-'
                            ? c.finalDecisionType
                            : c.finalDecision || '-'}
                        </div>
                        {c.finalDecisionType &&
                          c.finalDecisionType !== '-' &&
                          c.finalDecision &&
                          c.finalDecision !== '-' &&
                          c.finalDecision !== c.finalDecisionType && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {c.finalDecision}
                            </div>
                          )}
                        {c.implementationInfoDate && c.implementationInfoDate !== '-' && (
                          <div className="text-[10px] text-emerald-700 font-mono-num mt-0.5">
                            कार्यान्वयन: {c.implementationInfoDate}
                          </div>
                        )}
                      </td>

                      {/* कैफियत */}
                      <td className="py-3.5 px-2.5 text-slate-700">
                        {c.remarks || '-'}
                      </td>

                      {/* शाखा */}
                      <td className="py-3.5 px-2.5 text-slate-800 leading-snug">
                        {getShakhaName(c.shakhaId)}
                      </td>

                      {/* स्थिति */}
                      <td className={`py-3.5 px-2.5 whitespace-nowrap ${statusTextColor}`}>
                        {COMPLAINT_STATUS_LABELS[c.status]}
                      </td>

                      {/* कार्य: View, Edit, Delete */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingComplaint(c)}
                            className="p-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded cursor-pointer"
                            title="विवरण हेर्नुहोस्"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditComplaint(c)}
                            className="p-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded cursor-pointer"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>

                          {(effectiveRole === 'admin' || c.status !== 'farchhaut') && (
                            <>
                              {confirmDeleteId === c.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(c)}
                                    className="p-1 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                    title="पक्का हटाउनुहोस्"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                                    title="रद्द"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(c.id)}
                                  className="p-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                  title="हटाउनुहोस्"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              पेज {toNepaliDigits(safePage)} / {toNepaliDigits(totalPages)} (जम्मा{' '}
              {toNepaliDigits(filteredAndSorted.length)} उजुरी)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                अघिल्लो
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                अर्को
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Complaint Detail Modal */}
      {viewingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 shadow-xl text-xs space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="text-blue-900 font-bold font-mono-num">
                  दर्ता नं: {viewingComplaint.dartaNo} · मिति: {viewingComplaint.nepaliDate} · स्थिति:{' '}
                  {COMPLAINT_STATUS_LABELS[viewingComplaint.status]}
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  उजुरीको विस्तृत विवरण
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingComplaint(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">उजुरकर्ता:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {viewingComplaint.complainant || 'बेनामी'}
                </div>
                {viewingComplaint.complainantContact &&
                  viewingComplaint.complainantContact !== '-' && (
                    <div className="text-[11px] text-slate-600 mt-0.5 font-mono-num">
                      {viewingComplaint.complainantContact}
                    </div>
                  )}
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">विपक्षी:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {viewingComplaint.respondent || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">मन्त्रालय/निकाय:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {viewingComplaint.ministry || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">स्थान (जिल्ला / स्थानीय तह):</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {DISTRICT_NE_MAP[viewingComplaint.districtEn] || viewingComplaint.districtEn}
                  {viewingComplaint.localLevel && viewingComplaint.localLevel !== '-'
                    ? ` · ${viewingComplaint.localLevel}`
                    : ''}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">जिम्मेवार शाखा:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {getShakhaName(viewingComplaint.shakhaId)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500">छानविन अधिकृत / पत्राचार चलानी:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {viewingComplaint.investigationOfficer &&
                  viewingComplaint.investigationOfficer !== '-'
                    ? viewingComplaint.investigationOfficer
                    : '-'}
                  {viewingComplaint.patracharChalaniNo &&
                  viewingComplaint.patracharChalaniNo !== '-'
                    ? ` · ${viewingComplaint.patracharChalaniNo}`
                    : ''}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-100">
              <div className="text-slate-500 font-semibold mb-1">उजुरीको विवरण:</div>
              <p className="text-slate-900 leading-relaxed">{viewingComplaint.title}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded border border-slate-100">
                <div className="text-slate-500 font-semibold mb-1">समितिको निर्णय:</div>
                <p className="text-slate-900 leading-relaxed">
                  {viewingComplaint.committeeDecision || '-'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded border border-slate-100 space-y-1.5">
                <div className="text-slate-500 font-semibold">
                  केन्द्रको अन्तिम निर्णय
                  {viewingComplaint.finalDecisionDate &&
                  viewingComplaint.finalDecisionDate !== '-'
                    ? ` (${viewingComplaint.finalDecisionDate})`
                    : ''}
                  :
                </div>
                {viewingComplaint.finalDecisionType &&
                  viewingComplaint.finalDecisionType !== '-' && (
                    <div className="text-blue-900 font-semibold">
                      प्रकार: {viewingComplaint.finalDecisionType}
                    </div>
                  )}
                <p className="text-slate-900 leading-relaxed">
                  {viewingComplaint.finalDecision || '-'}
                </p>
                {viewingComplaint.implementationInfoDate &&
                  viewingComplaint.implementationInfoDate !== '-' && (
                    <div className="text-[11px] text-emerald-800 font-semibold pt-1 border-t border-slate-200/70 font-mono-num">
                      कार्यान्वयनको जानकारी प्राप्त मिति: {viewingComplaint.implementationInfoDate}
                    </div>
                  )}
              </div>
            </div>

            {((viewingComplaint.progressNote && viewingComplaint.progressNote !== '-') ||
              (viewingComplaint.remarks && viewingComplaint.remarks !== '-')) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-500 font-semibold mb-1">
                    कारबाही प्रगति / राय प्रतिक्रिया:
                  </div>
                  <p className="text-slate-900 leading-relaxed">
                    {viewingComplaint.progressNote || '-'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-500 font-semibold mb-1">कैफियत:</div>
                  <p className="text-slate-900 leading-relaxed">
                    {viewingComplaint.remarks || '-'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const cmp = viewingComplaint;
                  setViewingComplaint(null);
                  onEditComplaint(cmp);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md cursor-pointer"
              >
                सम्पादन गर्नुहोस्
              </button>
              <button
                type="button"
                onClick={() => setViewingComplaint(null)}
                className="px-4 py-2 bg-blue-950 text-white font-semibold rounded-md cursor-pointer"
              >
                बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Remarks Modal */}
      {remarksModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBulkSaveRemarks}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl text-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                कैफियत थप्नुहोस् ({toNepaliDigits(selectedIds.size)} चयनित)
              </h4>
              <button
                type="button"
                onClick={() => setRemarksModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              required
              rows={3}
              value={bulkRemarksText}
              onChange={(e) => setBulkRemarksText(e.target.value)}
              placeholder="कैफियत विवरण लेख्नुहोस्..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-800"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemarksModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-md text-slate-700 cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-950 text-white font-semibold rounded-md cursor-pointer"
              >
                सुरक्षित गर्नुहोस्
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
