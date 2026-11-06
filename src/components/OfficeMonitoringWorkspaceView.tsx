import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Clock3,
  Eye,
  Filter,
  Gavel,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shirt,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  DISTRICT_NE_MAP,
  FISCAL_YEARS,
  getLocalLevelsForDistrict,
  getProvinceForDistrict,
  MAHASHAKHAS,
  PROVINCES_DATA,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  ActivityRecord,
  FiscalYear,
  OfficeMonitoringDetails,
  OfficeMonitoringStaff,
} from '../types/nvc';

const EMPTY_STAFF: OfficeMonitoringStaff = {
  type: 'अनुपस्थिति',
  name: '',
  designation: '',
  signalNo: '',
  remarks: '',
};

const EMPTY_DETAILS: OfficeMonitoringDetails = {
  date: '',
  province: '',
  localLevel: '',
  officeName: '',
  officePhone: '',
  monitoringTime: '',
  observer: '',
  observerPost: '',
  totalEmployees: 0,
  presentEmployees: 0,
  absentEmployees: 0,
  responsibleOfficer: '',
  responsibleOfficerPost: '',
  staff: [],
  remarks: '',
  timeViolationCount: 0,
  dressViolationCount: 0,
  recommendationCount: 0,
};

const inputClassName =
  'w-full rounded-md border border-slate-300 bg-[#faf8f3] px-2.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';
const staffGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    '48px minmax(120px, 1fr) minmax(150px, 1.2fr) minmax(100px, 0.8fr) minmax(90px, 0.7fr) minmax(140px, 1.1fr) 112px',
  alignItems: 'center',
  columnGap: '4px',
};

type OfficeFilters = {
  fromDate: string;
  toDate: string;
  province: string;
  district: string;
  localLevel: string;
  officeName: string;
  violationType: string;
  employeeName: string;
};

const EMPTY_FILTERS: OfficeFilters = {
  fromDate: '',
  toDate: '',
  province: '',
  district: '',
  localLevel: '',
  officeName: '',
  violationType: '',
  employeeName: '',
};

interface OfficeMonitoringWorkspaceViewProps {
  activities: ActivityRecord[];
  currentUid: string;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  searchQuery: string;
  onActivitySaved: (record: ActivityRecord) => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <label className="block text-[11px] font-semibold text-slate-600">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const detailFor = (activity: ActivityRecord): OfficeMonitoringDetails => ({
  ...EMPTY_DETAILS,
  ...activity.officeMonitoringDetails,
  province:
    activity.officeMonitoringDetails?.province ||
    getProvinceForDistrict(activity.districtEn),
  officeName:
    activity.officeMonitoringDetails?.officeName || activity.entityName || '',
  timeViolationCount:
    activity.officeMonitoringDetails?.timeViolationCount ??
    activity.nonComplianceCount ??
    0,
  recommendationCount:
    activity.officeMonitoringDetails?.recommendationCount ??
    activity.directiveCount ??
    0,
});

const formatDate = (date: string) => {
  if (!date) return '-';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? toNepaliDigits(date) : date;
};

const numberField = (value: string) => Math.max(0, Number(value) || 0);

export const OfficeMonitoringWorkspaceView: React.FC<
  OfficeMonitoringWorkspaceViewProps
> = ({
  activities,
  currentUid,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  searchQuery,
  onActivitySaved,
}) => {
  const [filters, setFilters] = useState<OfficeFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OfficeFilters>(EMPTY_FILTERS);
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [modalActivity, setModalActivity] = useState<ActivityRecord | null>(null);
  const [modalDistrict, setModalDistrict] = useState('');
  const [viewActivity, setViewActivity] = useState<ActivityRecord | null>(null);
  const [details, setDetails] = useState<OfficeMonitoringDetails>(EMPTY_DETAILS);
  const [staffRow, setStaffRow] = useState<OfficeMonitoringStaff>(EMPTY_STAFF);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState(searchQuery);

  const allOfficeActivities = useMemo(
    () =>
      activities.filter((activity) => activity.activityType === 'karyalaya_anugaman'),
    [activities]
  );
  const fiscalYearActivities = useMemo(
    () =>
      allOfficeActivities.filter(
        (activity) => activity.fiscalYear === selectedFiscalYear
      ),
    [allOfficeActivities, selectedFiscalYear]
  );
  const shownActivities = useMemo(() => {
    const query = tableSearch.trim().toLocaleLowerCase();
    return fiscalYearActivities.filter((activity) => {
      const info = detailFor(activity);
      const date = info.date || activity.nepaliDate;
      if (appliedFilters.fromDate && date < appliedFilters.fromDate) return false;
      if (appliedFilters.toDate && date > appliedFilters.toDate) return false;
      if (appliedFilters.province && info.province !== appliedFilters.province) return false;
      if (appliedFilters.district && activity.districtEn !== appliedFilters.district)
        return false;
      if (appliedFilters.localLevel && info.localLevel !== appliedFilters.localLevel)
        return false;
      if (
        appliedFilters.officeName &&
        !info.officeName.toLocaleLowerCase().includes(appliedFilters.officeName.toLocaleLowerCase())
      )
        return false;
      if (appliedFilters.violationType === 'समय पालना' && info.timeViolationCount < 1)
        return false;
      if (appliedFilters.violationType === 'पोशाक पालना' && info.dressViolationCount < 1)
        return false;
      if (
        appliedFilters.employeeName &&
        !info.staff.some((staff) =>
          staff.name.toLocaleLowerCase().includes(appliedFilters.employeeName.toLocaleLowerCase())
        )
      )
        return false;
      if (
        query &&
        ![
          info.officeName,
          info.observer,
          info.province,
          info.localLevel,
          DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn,
          ...info.staff.map((staff) => staff.name),
        ].some((value) => value.toLocaleLowerCase().includes(query))
      )
        return false;
      return true;
    });
  }, [fiscalYearActivities, appliedFilters, tableSearch]);

  const cards = [
    {
      label: 'कूल अनुगमन',
      count: fiscalYearActivities.length,
      icon: ListChecks,
    },
    {
      label: 'यस महिनाको अनुगमन',
      count: fiscalYearActivities.filter(
        (activity) => activity.monthIndex === CURRENT_NEPALI_MONTH_INDEX
      ).length,
      icon: CalendarDays,
    },
    {
      label: 'समय पालना नगर्ने',
      count: fiscalYearActivities.reduce(
        (sum, activity) => sum + detailFor(activity).timeViolationCount,
        0
      ),
      icon: Clock3,
    },
    {
      label: 'पोशाक पालना नगर्ने',
      count: fiscalYearActivities.reduce(
        (sum, activity) => sum + detailFor(activity).dressViolationCount,
        0
      ),
      icon: Shirt,
    },
    {
      label: 'कारबाही सिफारिस',
      count: fiscalYearActivities.reduce(
        (sum, activity) => sum + detailFor(activity).recommendationCount,
        0
      ),
      icon: Gavel,
    },
  ];

  const districts = filters.province
    ? PROVINCES_DATA.find((province) => province.nameNe === filters.province)?.districtsEn ?? []
    : PROVINCES_DATA.flatMap((province) => province.districtsEn);
  const modalDistricts = details.province
    ? PROVINCES_DATA.find((province) => province.nameNe === details.province)?.districtsEn ?? []
    : PROVINCES_DATA.flatMap((province) => province.districtsEn);
  const openNewModal = () => {
    setModalActivity(null);
    setModalDistrict('');
    setDetails({ ...EMPTY_DETAILS, staff: [] });
    setStaffRow({ ...EMPTY_STAFF });
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };

  const openEditModal = (activity: ActivityRecord) => {
    setModalActivity(activity);
    setModalDistrict(activity.districtEn);
    setDetails(detailFor(activity));
    setStaffRow({ ...EMPTY_STAFF });
    setErrorMessage(null);
    setFormOpen(true);
  };

  const updateDetails = <K extends keyof OfficeMonitoringDetails>(
    key: K,
    value: OfficeMonitoringDetails[K]
  ) => setDetails((current) => ({ ...current, [key]: value }));

  const updateFilters = <K extends keyof OfficeFilters>(
    key: K,
    value: OfficeFilters[K]
  ) => setFilters((current) => ({ ...current, [key]: value }));

  const saveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    const recordId = modalActivity?.id ?? `act_${crypto.randomUUID()}`;
    const districtEn = modalDistrict;
    const mahashakhaId =
      MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ??
      'maha_admin';
    const shakhaId =
      SHAKHAS.find(
        (item) =>
          item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
      )?.id ??
      SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
      'shakha_admin_plan';
    const savedDetails: OfficeMonitoringDetails = {
      ...details,
      staff: details.staff.map((staff) => ({ ...staff })),
    };
    const savedRecord: ActivityRecord = {
      ...(modalActivity ?? {}),
      id: recordId,
      refNo: recordId,
      activityType: 'karyalaya_anugaman',
      title: `${DISTRICT_NE_MAP[districtEn] || districtEn} कार्यालय अनुगमन`,
      entityName: savedDetails.officeName.trim(),
      districtEn,
      fiscalYear: modalActivity?.fiscalYear ?? selectedFiscalYear,
      monthIndex:
        Number(savedDetails.date.split('-')[1]) || CURRENT_NEPALI_MONTH_INDEX,
      nepaliDate: savedDetails.date,
      nonComplianceCount:
        savedDetails.timeViolationCount + savedDetails.dressViolationCount,
      directiveCount: savedDetails.recommendationCount,
      status: 'sampanna',
      mahashakhaId,
      shakhaId,
      createdByUid: modalActivity?.createdByUid ?? currentUid,
      officeMonitoringDetails: savedDetails,
      createdAt: modalActivity?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { data, error } = modalActivity
        ? await supabase
            .from('activities')
            .update(savedRecord)
            .eq('id', recordId)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('activities')
            .insert(savedRecord)
            .select('id')
            .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('अनुगमन विवरण सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(modalActivity ? 'अनुगमन विवरण अद्यावधिक गरियो।' : 'नयाँ कार्यालय अनुगमन दर्ता गरियो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save office monitoring record:', error);
      setErrorMessage(`अनुगमन विवरण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const labelClass = 'block text-[11px] font-semibold text-slate-600';
  const regionLabel = (district: string) =>
    `${getProvinceForDistrict(district)} · ${DISTRICT_NE_MAP[district] || district}`;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">कार्यालय अनुगमन</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                कार्यालयको समय, पोशाक तथा कर्मचारी उपस्थितिको अनुगमन अभिलेख
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            <Plus className="h-3.5 w-3.5" />
            नयाँ कार्यालय अनुगमन
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, count, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-[84px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-900">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-bold leading-6 text-slate-900">
                {toNepaliDigits(count)}
              </div>
              <div className="mt-1 text-[11px] font-medium leading-4 text-slate-600">
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setFilterExpanded((expanded) => !expanded)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-slate-800"
          aria-expanded={filterExpanded}
        >
          <Filter className="h-4 w-4 text-slate-600" />
          फिल्टरहरू
          <span className="ml-auto">{filterExpanded ? '⌃' : '⌄'}</span>
        </button>
        {filterExpanded && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="मिति (देखि)">
              <input
                type="text"
                placeholder="साल-महिना-गते"
                value={filters.fromDate}
                onChange={(event) => updateFilters('fromDate', event.target.value)}
                className={inputClassName}
              />
            </Field>
            <Field label="मिति (सम्म)">
              <input
                type="text"
                placeholder="साल-महिना-गते"
                value={filters.toDate}
                onChange={(event) => updateFilters('toDate', event.target.value)}
                className={inputClassName}
              />
            </Field>
            <Field label="प्रदेश">
              <select
                value={filters.province}
                onChange={(event) => {
                  updateFilters('province', event.target.value);
                  updateFilters('district', '');
                  updateFilters('localLevel', '');
                }}
                className={inputClassName}
              >
                <option value="">सबै</option>
                {PROVINCES_DATA.map((province) => (
                  <option key={province.id}>{province.nameNe}</option>
                ))}
              </select>
            </Field>
            <Field label="जिल्ला">
              <select
                value={filters.district}
                onChange={(event) => {
                  updateFilters('district', event.target.value);
                  updateFilters('localLevel', '');
                }}
                className={inputClassName}
              >
                <option value="">सबै</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {DISTRICT_NE_MAP[district] || district}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="स्थानीय तह">
              <select
                value={filters.localLevel}
                onChange={(event) => updateFilters('localLevel', event.target.value)}
                className={inputClassName}
              >
                <option value="">सबै</option>
                {filters.district &&
                  getLocalLevelsForDistrict(filters.district).map((localLevel) => (
                    <option key={localLevel}>{localLevel}</option>
                  ))}
              </select>
            </Field>
            <Field label="कार्यालय">
              <input
                value={filters.officeName}
                onChange={(event) => updateFilters('officeName', event.target.value)}
                placeholder="कार्यालयको नाम"
                className={inputClassName}
              />
            </Field>
            <Field label="अपरिपालना प्रकार">
              <select
                value={filters.violationType}
                onChange={(event) => updateFilters('violationType', event.target.value)}
                className={inputClassName}
              >
                <option value="">सबै</option>
                <option>समय पालना</option>
                <option>पोशाक पालना</option>
              </select>
            </Field>
            <Field label="कर्मचारीको नाम">
              <input
                value={filters.employeeName}
                onChange={(event) => updateFilters('employeeName', event.target.value)}
                placeholder="कर्मचारीको नाम"
                className={inputClassName}
              />
            </Field>
            <div className="col-span-full flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAppliedFilters(filters)}
                className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Search className="h-3.5 w-3.5" />
                खोज्नुहोस्
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setAppliedFilters(EMPTY_FILTERS);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                रिसेट
              </button>
              <button
                type="button"
                onClick={() => setAppliedFilters({ ...filters })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                रिफ्रेस
              </button>
            </div>
          </div>
        )}
      </section>

      {notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-950">
          {notice}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">कार्यालय अनुगमन अभिलेख</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {toNepaliDigits(shownActivities.length)} /{' '}
              {toNepaliDigits(fiscalYearActivities.length)} अभिलेख
            </p>
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="अभिलेख खोज्नुहोस्..."
              aria-label="कार्यालय अनुगमन अभिलेख खोज्नुहोस्"
              className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <th className="px-2.5 py-2">मिति</th>
              <th className="px-2.5 py-2">प्रदेश</th>
              <th className="px-2.5 py-2">जिल्ला</th>
              <th className="px-2.5 py-2">स्थानीय तह</th>
              <th className="px-2.5 py-2">कार्यालयको नाम</th>
              <th className="px-2.5 py-2 text-center">अपरिपालना संख्या</th>
              <th className="px-2.5 py-2 text-center">समय अपरिपालना</th>
              <th className="px-2.5 py-2 text-center">पोशाक अपरिपालना</th>
              <th className="px-2.5 py-2">अनुगमनकर्ता</th>
              <th className="px-2.5 py-2">कार्य</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {shownActivities.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                  {fiscalYearActivities.length === 0
                    ? 'हाल कुनै कार्यालय अनुगमन अभिलेख उपलब्ध छैन।'
                    : 'फिल्टर वा खोजीसँग मिल्ने अभिलेख भेटिएन।'}
                </td>
              </tr>
            ) : (
              shownActivities.map((activity) => {
                const info = detailFor(activity);
                return (
                  <tr key={activity.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-2.5 py-3">
                      {formatDate(info.date || activity.nepaliDate)}
                    </td>
                    <td className="px-2.5 py-3">{info.province || '-'}</td>
                    <td className="px-2.5 py-3">
                      {DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn}
                    </td>
                    <td className="px-2.5 py-3">{info.localLevel || '-'}</td>
                    <td className="px-2.5 py-3">{info.officeName || activity.entityName}</td>
                    <td className="px-2.5 py-3 text-center">
                      {toNepaliDigits(info.timeViolationCount + info.dressViolationCount)}
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      {toNepaliDigits(info.timeViolationCount)}
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      {toNepaliDigits(info.dressViolationCount)}
                    </td>
                    <td className="px-2.5 py-3">{info.observer || '-'}</td>
                    <td className="px-2.5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="विवरण हेर्नुहोस्"
                          aria-label="विवरण हेर्नुहोस्"
                          onClick={() => setViewActivity(activity)}
                          className="text-slate-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="सम्पादन गर्नुहोस्"
                          aria-label="सम्पादन गर्नुहोस्"
                          onClick={() => openEditModal(activity)}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <span className="text-sm">✎</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </section>

      {formOpen &&
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3"
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-monitoring-form-title"
            className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg shadow-xl"
            style={{
              backgroundColor: '#fffdf8',
              width: 'min(100%, 1024px)',
              maxHeight: '96vh',
              position: 'relative',
              zIndex: 10001,
            }}
          >
            <div className="flex items-center justify-between bg-slate-800 px-5 py-3 text-white">
              <h3 id="office-monitoring-form-title" className="text-sm font-bold">
                समय/पोशाक अनुगमन
              </h3>
              <button
                type="button"
                aria-label="बन्द गर्नुहोस्"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveRecord} className="flex min-h-0 flex-1 flex-col">
              <div className="grid grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="मिति">
                  <input
                    required
                    value={details.date}
                    onChange={(event) => updateDetails('date', event.target.value)}
                    placeholder="साल-महिना-गते"
                    className={inputClassName}
                  />
                </Field>
                <Field label="प्रदेश">
                  <select
                    required
                    value={details.province}
                    onChange={(event) => {
                      updateDetails('province', event.target.value);
                      updateDetails('localLevel', '');
                    }}
                    className={inputClassName}
                  >
                    <option value="">प्रदेश छान्नुहोस्</option>
                    {PROVINCES_DATA.map((province) => (
                      <option key={province.id}>{province.nameNe}</option>
                    ))}
                  </select>
                </Field>
                <Field label="जिल्ला">
                  <select
                    required
                    value={modalDistrict}
                    onChange={(event) => {
                      setModalDistrict(event.target.value);
                    }}
                    className={inputClassName}
                  >
                    <option value="">जिल्ला छान्नुहोस्</option>
                    {modalDistricts.map((district) => (
                      <option key={district} value={district}>
                        {DISTRICT_NE_MAP[district] || district}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="स्थानीय तह">
                  <select
                    required
                    value={details.localLevel}
                    onChange={(event) => updateDetails('localLevel', event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">स्थानीय तह छान्नुहोस्</option>
                    {modalDistrict &&
                      getLocalLevelsForDistrict(modalDistrict).map((localLevel) => (
                        <option key={localLevel}>{localLevel}</option>
                      ))}
                  </select>
                </Field>
                <Field label="कार्यालयको नाम">
                  <input
                    required
                    maxLength={200}
                    value={details.officeName}
                    onChange={(event) => updateDetails('officeName', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="कार्यालय फोन">
                  <input
                    maxLength={40}
                    value={details.officePhone}
                    onChange={(event) => updateDetails('officePhone', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="अनुगमन समय">
                  <input
                    type="time"
                    value={details.monitoringTime}
                    onChange={(event) => updateDetails('monitoringTime', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="अनुगमनकर्ता">
                  <input
                    required
                    value={details.observer}
                    onChange={(event) => updateDetails('observer', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="अनुगमनकर्ता पद">
                  <input
                    value={details.observerPost}
                    onChange={(event) => updateDetails('observerPost', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="कुल कर्मचारी">
                  <input
                    type="number"
                    min="0"
                    value={details.totalEmployees}
                    onChange={(event) =>
                      updateDetails('totalEmployees', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="कार्यरत कर्मचारी">
                  <input
                    type="number"
                    min="0"
                    value={details.presentEmployees}
                    onChange={(event) =>
                      updateDetails('presentEmployees', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="रिक्त कर्मचारी">
                  <input
                    type="number"
                    min="0"
                    value={details.absentEmployees}
                    onChange={(event) =>
                      updateDetails('absentEmployees', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="जिम्मेवार अधिकारी">
                  <input
                    value={details.responsibleOfficer}
                    onChange={(event) =>
                      updateDetails('responsibleOfficer', event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="अधिकारी पद">
                  <input
                    value={details.responsibleOfficerPost}
                    onChange={(event) =>
                      updateDetails('responsibleOfficerPost', event.target.value)
                    }
                    className={inputClassName}
                  />
                </Field>
                <div className="lg:col-span-3">
                  <div className="pt-1">
                    <h4 className="mb-3 text-sm font-bold text-slate-700">
                      कर्मचारी विवरण
                    </h4>
                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white p-3">
                      <div className="min-w-[900px] space-y-1 text-left text-[11px]">
                        <div style={staffGridStyle} className="text-slate-600">
                          <span className="font-semibold">क्र.सं</span>
                          <span className="font-semibold">अपरिपालना प्रकार</span>
                          <span className="font-semibold">कर्मचारीको नाम</span>
                          <span className="font-semibold">पद</span>
                          <span className="font-semibold">संकेत नं</span>
                          <span className="font-semibold">कैफियत</span>
                          <span />
                        </div>
                        {details.staff.map((staff, index) => (
                          <div
                            key={`${staff.name}-${index}`}
                            style={staffGridStyle}
                            className="rounded-md bg-slate-50 p-1"
                          >
                            <span className="text-slate-600">{toNepaliDigits(index + 1)}</span>
                            <span className="text-slate-700">{staff.type}</span>
                            <span className="text-slate-700">{staff.name}</span>
                            <span className="text-slate-700">{staff.designation || '-'}</span>
                            <span className="text-slate-700">{staff.signalNo || '-'}</span>
                            <span className="text-slate-700">{staff.remarks || 'नो कैफियत'}</span>
                            <button
                              type="button"
                              aria-label={`${staff.name} हटाउनुहोस्`}
                              onClick={() =>
                                setDetails((current) => ({
                                  ...current,
                                  staff: current.staff.filter((_, itemIndex) => itemIndex !== index),
                                  timeViolationCount: Math.max(
                                    0,
                                    current.timeViolationCount -
                                      (staff.type === 'अनुपस्थिति' ||
                                      staff.type === 'समय पालना नगरेको'
                                        ? 1
                                        : 0)
                                  ),
                                  dressViolationCount: Math.max(
                                    0,
                                    current.dressViolationCount -
                                      (staff.type === 'पोशाक पालना नगरेको' ? 1 : 0)
                                  ),
                                }))
                              }
                              className="justify-self-start text-red-600 hover:text-red-800"
                            >
                              हटाउनुहोस्
                            </button>
                          </div>
                        ))}
                        <div style={staffGridStyle}>
                          <span className="text-slate-600">
                            {toNepaliDigits(details.staff.length + 1)}
                          </span>
                          <select
                            value={staffRow.type}
                            onChange={(event) =>
                              setStaffRow((current) => ({ ...current, type: event.target.value }))
                            }
                            className={inputClassName}
                          >
                            <option>अनुपस्थिति</option>
                            <option>समय पालना नगरेको</option>
                            <option>पोशाक पालना नगरेको</option>
                            <option>कार्यकक्षमा नभेटिएको</option>
                          </select>
                          <input
                            value={staffRow.name}
                            onChange={(event) =>
                              setStaffRow((current) => ({ ...current, name: event.target.value }))
                            }
                            className={inputClassName}
                          />
                          <input
                            value={staffRow.designation}
                            onChange={(event) =>
                              setStaffRow((current) => ({
                                ...current,
                                designation: event.target.value,
                              }))
                            }
                            className={inputClassName}
                          />
                          <input
                            value={staffRow.signalNo}
                            onChange={(event) =>
                              setStaffRow((current) => ({
                                ...current,
                                signalNo: event.target.value,
                              }))
                            }
                            className={inputClassName}
                          />
                          <input
                            value={staffRow.remarks}
                            onChange={(event) =>
                              setStaffRow((current) => ({
                                ...current,
                                remarks: event.target.value,
                              }))
                            }
                            className={inputClassName}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!staffRow.name.trim()) return;
                              const isTimeViolation =
                                staffRow.type === 'अनुपस्थिति' ||
                                staffRow.type === 'समय पालना नगरेको';
                              setDetails((current) => ({
                                ...current,
                                staff: [...current.staff, { ...staffRow, name: staffRow.name.trim() }],
                                timeViolationCount:
                                  current.timeViolationCount + (isTimeViolation ? 1 : 0),
                                dressViolationCount:
                                  current.dressViolationCount +
                                  (staffRow.type === 'पोशाक पालना नगरेको' ? 1 : 0),
                              }));
                              setStaffRow({ ...EMPTY_STAFF });
                            }}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md bg-blue-700 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            थप्नुहोस्
                          </button>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
                <Field label="समय पालना नगर्ने संख्या">
                  <input
                    type="number"
                    min="0"
                    value={details.timeViolationCount}
                    onChange={(event) =>
                      updateDetails('timeViolationCount', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="पोशाक पालना नगर्ने संख्या">
                  <input
                    type="number"
                    min="0"
                    value={details.dressViolationCount}
                    onChange={(event) =>
                      updateDetails('dressViolationCount', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="कारबाही सिफारिस संख्या">
                  <input
                    type="number"
                    min="0"
                    value={details.recommendationCount}
                    onChange={(event) =>
                      updateDetails('recommendationCount', numberField(event.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <div className="lg:col-span-3">
                  <Field label="कैफियत">
                    <textarea
                      rows={2}
                      value={details.remarks}
                      onChange={(event) => updateDetails('remarks', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                </div>
                {errorMessage && (
                  <p role="alert" className="lg:col-span-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                    {errorMessage}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-700 hover:bg-slate-200"
                >
                  बन्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-monitoring-detail-title"
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-[#fffdf8] shadow-xl"
          >
            {(() => {
              const info = detailFor(viewActivity);
              const rows: Array<[string, string | number]> = [
                ['मिति', formatDate(info.date || viewActivity.nepaliDate)],
                ['प्रदेश', info.province],
                ['जिल्ला', DISTRICT_NE_MAP[viewActivity.districtEn] || viewActivity.districtEn],
                ['स्थानीय तह', info.localLevel],
                ['कार्यालयको नाम', info.officeName],
                ['कार्यालय फोन', info.officePhone],
                ['अनुगमन समय', info.monitoringTime],
                ['अनुगमनकर्ता', info.observer],
                ['अनुगमनकर्ता पद', info.observerPost],
                ['कुल कर्मचारी', info.totalEmployees],
                ['कार्यरत कर्मचारी', info.presentEmployees],
                ['रिक्त कर्मचारी', info.absentEmployees],
                ['जिम्मेवार अधिकारी', info.responsibleOfficer],
                ['अधिकारी पद', info.responsibleOfficerPost],
              ];
              return (
                <>
                  <div className="flex items-center justify-between bg-slate-800 px-5 py-3 text-white">
                    <h3 id="office-monitoring-detail-title" className="text-sm font-bold">
                      अनुगमन विवरण
                    </h3>
                    <button
                      type="button"
                      aria-label="बन्द गर्नुहोस्"
                      onClick={() => setViewActivity(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rows.map(([label, value]) => (
                        <div key={label} className="text-xs">
                          <div className="font-semibold text-slate-600">{label}</div>
                          <div className="mt-1 rounded-md border border-slate-200 bg-[#f5f2eb] px-3 py-2 text-slate-700">
                            {value || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-[#e7e0d1] pt-4">
                      <h4 className="mb-3 text-sm font-bold text-slate-700">
                        कर्मचारी विवरण
                      </h4>
                      {info.staff.length === 0 ? (
                        <p className="text-xs text-slate-500">कर्मचारी विवरण छैन।</p>
                      ) : (
                        <div className="space-y-2">
                          {info.staff.map((staff, index) => (
                            <div
                              key={`${staff.name}-${index}`}
                              className="grid grid-cols-2 gap-3 rounded-md border border-[#e7e0d1] bg-[#faf8f3] p-3 text-xs md:grid-cols-5"
                            >
                              <span><b>प्रकार</b><br />{staff.type}</span>
                              <span><b>कर्मचारीको नाम</b><br />{staff.name}</span>
                              <span><b>पद</b><br />{staff.designation || '-'}</span>
                              <span><b>संकेत नं.</b><br />{staff.signalNo || '-'}</span>
                              <span><b>कैफियत</b><br />{staff.remarks || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-xs text-slate-700">
                      <b>कैफियत:</b> {info.remarks || '-'}
                    </p>
                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setViewActivity(null)}
                        className="rounded-md bg-[#eee9df] px-4 py-2 text-xs text-slate-700"
                      >
                        बन्द गर्नुहोस्
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
