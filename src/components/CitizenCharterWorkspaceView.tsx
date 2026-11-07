import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Accessibility,
  CalendarDays,
  ClipboardCheck,
  Eye,
  Filter,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  DISTRICT_NE_MAP,
  getLocalLevelsForDistrict,
  getProvinceForDistrict,
  MAHASHAKHAS,
  NEPALI_MONTHS,
  PROVINCES_DATA,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  ActivityRecord,
  CitizenCharterDetails,
  FiscalYear,
} from '../types/nvc';
import { CitizenCharterDossierModal } from './CitizenCharterDossierModal';
import { NepaliDatePicker } from './NepaliDatePicker';

const EMPTY_DETAILS: CitizenCharterDetails = {
  date: '',
  province: '',
  localLevel: '',
  fullAddress: '',
  officeName: '',
  auditor: '',
  auditorPost: '',
  checks: {},
  facilities: {},
  mainServices: '',
  irregularities: '',
  recommendations: '',
  staffing: {
    sanctioned: 0,
    working: 0,
    vacant: 0,
    equalizationPending: 0,
    excess: 0,
  },
  auditorRemarks: '',
};

const CHECKS: Array<{ key: string; label: string; options: string[] }> = [
  { key: 'charter', label: 'नागरिक बडापत्र (डिजिटल/अडियो)', options: ['स्पष्ट बुझिने', 'स्पष्ट नबुझिने', 'पढ्न झन्झटिलो', 'नभएको'] },
  { key: 'serviceProcess', label: 'सेवा प्रक्रिया, कागजात, लागत र समय', options: ['स्पष्ट उल्लेख भएको', 'उल्लेख नभएको', 'आंशिक', 'नभएको'] },
  { key: 'branchStructure', label: 'शाखागत व्यवस्था, कोठा नं. र नामावली', options: ['उल्लेख भएको', 'उल्लेख नभएको', 'आंशिक', 'नभएको'] },
  { key: 'compensation', label: 'नागरिक बडापत्रमा क्षतिपूर्ति व्यवस्था', options: ['भएको', 'नभएको'] },
  { key: 'intermediary', label: 'मध्यस्थकर्ताको प्रवेश', options: ['देखियो', 'देखिएन'] },
  { key: 'website', label: 'नागरिक बडापत्र वेबसाइटमा upload र update', options: ['भएको', 'नभएको'] },
  { key: 'disclosure', label: 'सूचनाको हक (Automatic Disclosure) ३/३ महिनामा', options: ['गरेको', 'नगरेको'] },
  { key: 'selfService', label: 'सेवाग्राहीले स्वतः जानकारी पाउने माध्यम', options: ['भएको', 'नभएको'] },
  { key: 'attendance', label: 'हाजिरीको अवस्था', options: ['ई-हाजिरी', 'रजिस्टर', 'दुवै'] },
  { key: 'staffAtDesk', label: 'कर्मचारीहरू तोकिएको कार्यकक्षमा रहेको', options: ['भेटियो', 'भेटिएन', 'आंशिक'] },
  { key: 'informationBoard', label: 'सूचना पाटी', options: ['भएको', 'नभएको'] },
  { key: 'cleanliness', label: 'कार्यालयको सरसफाइको अवस्था', options: ['राम्रो', 'नराम्रो', 'ठीकै'] },
];

const FACILITIES = [
  'सेवाग्राही सहायता कक्ष (Help Desk)',
  'अपाङ्गमैत्री कार्यस्थल',
  'प्रतीक्षालय',
  'शौचालय (महिला/पुरुष)',
  'खानेपानीको उचित व्यवस्था',
  'स्तनपान कक्ष/स्थान',
  'धूम्रपान निषेध संकेत',
  'चमेनागृह',
  'उजुरी पेटिका',
  'वेबसाइट, सामाजिक सञ्जाल',
];

const FACILITY_OPTIONS = ['छ', 'छैन', 'सामान्य'];
const MONTHS = NEPALI_MONTHS.map((name, index) => ({
  value: String(index + 1).padStart(2, '0'),
  name,
}));

const inputClassName =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

type CharterFilters = {
  province: string;
  district: string;
  localLevel: string;
  office: string;
  fromDate: string;
  toDate: string;
  auditor: string;
  problem: string;
};

const EMPTY_FILTERS: CharterFilters = {
  province: '',
  district: '',
  localLevel: '',
  office: '',
  fromDate: '',
  toDate: '',
  auditor: '',
  problem: '',
};

interface CitizenCharterWorkspaceViewProps {
  activities: ActivityRecord[];
  currentUid: string;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  onActivitySaved: (record: ActivityRecord) => void;
  onActivityDeleted: (id: string) => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, required }) => (
  <label className="block text-xs font-semibold text-slate-700">
    {label}
    {required && <span className="ml-1 text-red-600">*</span>}
    <div className="mt-1.5">{children}</div>
  </label>
);

const FormSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <h4 className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-950">
      {icon}
      {title}
    </h4>
    <div className="space-y-4 p-4">{children}</div>
  </section>
);

const englishDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));

const normalizeDetails = (activity: ActivityRecord): CitizenCharterDetails => ({
  ...EMPTY_DETAILS,
  ...activity.citizenCharterDetails,
  checks: { ...activity.citizenCharterDetails?.checks },
  facilities: { ...activity.citizenCharterDetails?.facilities },
  staffing: {
    ...EMPTY_DETAILS.staffing,
    ...activity.citizenCharterDetails?.staffing,
  },
});

const formatDate = (date: string) =>
  date ? toNepaliDigits(date) : '-';

const wordCount = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

const limitWords = (value: string, limit: number) => {
  const words = value.trim().split(/\s+/);
  return words.length > limit ? words.slice(0, limit).join(' ') : value;
};

const statusSummary = (details: CitizenCharterDetails) =>
  details.irregularities.trim() ? 'कैफियत छ' : 'अनुगमन सम्पन्न';

export const CitizenCharterWorkspaceView: React.FC<
  CitizenCharterWorkspaceViewProps
> = ({
  activities,
  currentUid,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  onActivitySaved,
  onActivityDeleted,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [viewActivity, setViewActivity] = useState<ActivityRecord | null>(null);
  const [details, setDetails] = useState<CitizenCharterDetails>(EMPTY_DETAILS);
  const [filters, setFilters] = useState<CharterFilters>(EMPTY_FILTERS);
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const charterActivities = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.activityType === 'badapatra_anugaman' &&
          activity.fiscalYear === selectedFiscalYear
      ),
    [activities, selectedFiscalYear]
  );

  const districts = filters.province
    ? PROVINCES_DATA.find((province) => province.nameNe === filters.province)?.districtsEn ?? []
    : PROVINCES_DATA.flatMap((province) => province.districtsEn);

  const shownActivities = useMemo(() => {
    const query = tableSearch.trim().toLocaleLowerCase();
    return charterActivities.filter((activity) => {
      const record = normalizeDetails(activity);
      const date = englishDigits(record.date);
      if (filters.province && record.province !== filters.province) return false;
      if (filters.district && activity.districtEn !== filters.district) return false;
      if (filters.localLevel && record.localLevel !== filters.localLevel) return false;
      if (
        filters.office &&
        !record.officeName.toLocaleLowerCase().includes(filters.office.toLocaleLowerCase())
      )
        return false;
      if (filters.fromDate && date < englishDigits(filters.fromDate)) return false;
      if (filters.toDate && date > englishDigits(filters.toDate)) return false;
      if (
        filters.auditor &&
        !record.auditor.toLocaleLowerCase().includes(filters.auditor.toLocaleLowerCase())
      )
        return false;
      if (
        filters.problem &&
        !record.irregularities.toLocaleLowerCase().includes(filters.problem.toLocaleLowerCase())
      )
        return false;
      if (
        query &&
        ![
          record.date,
          record.province,
          DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn,
          record.localLevel,
          record.officeName || activity.entityName,
          record.auditor,
          record.irregularities || activity.title,
          ...Object.values(record.checks),
          ...Object.values(record.facilities),
        ].some((value) => value.toLocaleLowerCase().includes(query))
      )
        return false;
      return true;
    });
  }, [charterActivities, filters, tableSearch]);

  const cards = [
    {
      label: 'कुल अनुगमन',
      value: charterActivities.length,
      icon: ClipboardCheck,
      accent: 'border-blue-200 bg-blue-50/70 text-blue-900',
      glow: 'hover:border-blue-400',
    },
    {
      label: 'यस महिनाको अनुगमन',
      value: charterActivities.filter(
        (activity) => activity.monthIndex === CURRENT_NEPALI_MONTH_INDEX
      ).length,
      icon: CalendarDays,
      accent: 'border-cyan-200 bg-cyan-50/70 text-cyan-900',
      glow: 'hover:border-cyan-400',
    },
    {
      label: 'समस्या/अनियमितता',
      value: charterActivities.filter(
        (activity) => normalizeDetails(activity).irregularities.trim()
      ).length,
      icon: Filter,
      accent: 'border-red-200 bg-red-50/70 text-red-900',
      glow: 'hover:border-red-400',
    },
    {
      label: 'सुधारका सुझाव',
      value: charterActivities.filter(
        (activity) => normalizeDetails(activity).recommendations.trim()
      ).length,
      icon: Accessibility,
      accent: 'border-amber-200 bg-amber-50/70 text-amber-900',
      glow: 'hover:border-amber-400',
    },
    {
      label: 'अनुगमन भएका जिल्ला',
      value: new Set(charterActivities.map((activity) => activity.districtEn)).size,
      icon: MapPin,
      accent: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
      glow: 'hover:border-indigo-400',
    },
  ];

  const openNewForm = () => {
    setEditingActivity(null);
    setSelectedDistrict('');
    setDetails(EMPTY_DETAILS);
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };

  const openEditForm = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setSelectedDistrict(activity.districtEn);
    setDetails(normalizeDetails(activity));
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };

  const updateDetails = <K extends keyof CitizenCharterDetails>(
    key: K,
    value: CitizenCharterDetails[K]
  ) => setDetails((current) => ({ ...current, [key]: value }));

  const updateDatePart = (part: 'year' | 'month' | 'day', value: string) => {
    const [year = '', month = '', day = ''] = englishDigits(details.date).split('-');
    const next = { year, month, day, [part]: value };
    const date = [next.year, next.month, next.day].some(Boolean)
      ? `${next.year}-${next.month}-${next.day}`
      : '';
    updateDetails('date', date);
  };

  const saveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    const recordId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    const districtEn = selectedDistrict;
    const mahashakhaId =
      MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ?? 'maha_admin';
    const shakhaId =
      SHAKHAS.find(
        (item) =>
          item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
      )?.id ??
      SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
      'shakha_admin_plan';
    const savedDetails: CitizenCharterDetails = {
      ...details,
      date: englishDigits(details.date),
      checks: { ...details.checks },
      facilities: { ...details.facilities },
      staffing: { ...details.staffing },
    };
    const monthIndex = Number(savedDetails.date.split('-')[1]) || CURRENT_NEPALI_MONTH_INDEX;
    const concernOptions = new Set([
      'स्पष्ट नबुझिने',
      'पढ्न झन्झटिलो',
      'नभएको',
      'उल्लेख नभएको',
      'आंशिक',
      'देखियो',
      'नगरेको',
      'भेटिएन',
      'नराम्रो',
      'छैन',
    ]);
    const concernCount =
      Object.values(savedDetails.checks).filter((value) => concernOptions.has(value)).length +
      Object.values(savedDetails.facilities).filter((value) => value === 'छैन').length;
    const savedRecord: ActivityRecord = {
      ...(editingActivity ?? {}),
      id: recordId,
      refNo: editingActivity?.refNo ?? recordId,
      activityType: 'badapatra_anugaman',
      title: `${savedDetails.officeName.trim()} नागरिक बडापत्र अनुगमन`,
      entityName: savedDetails.officeName.trim(),
      districtEn,
      fiscalYear: editingActivity?.fiscalYear ?? selectedFiscalYear,
      monthIndex,
      nepaliDate: savedDetails.date,
      nonComplianceCount:
        concernCount || (savedDetails.irregularities.trim() ? 1 : 0),
      directiveCount: savedDetails.recommendations.trim() ? 1 : 0,
      status: 'sampanna',
      mahashakhaId,
      shakhaId,
      createdByUid: editingActivity?.createdByUid ?? currentUid,
      citizenCharterDetails: savedDetails,
      createdAt: editingActivity?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { data, error } = editingActivity
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
      if (!data) throw new Error('नागरिक बडापत्र विवरण सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(
        editingActivity
          ? 'नागरिक बडापत्र अनुगमन अद्यावधिक गरियो।'
          : 'नयाँ नागरिक बडापत्र अनुगमन सुरक्षित गरियो।'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save citizen charter monitoring record:', error);
      setErrorMessage(`अनुगमन विवरण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (activity: ActivityRecord) => {
    if (!window.confirm(`${normalizeDetails(activity).officeName || activity.entityName} को अनुगमन मेटाउने?`))
      return;
    setDeletingId(activity.id);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('यो अनुगमन मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);
      setNotice('नागरिक बडापत्र अनुगमन मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete citizen charter monitoring record:', error);
      setNotice(`अनुगमन मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const setCheck = (key: string, value: string) =>
    setDetails((current) => ({
      ...current,
      checks: { ...current.checks, [key]: value },
    }));

  const setFacility = (label: string, value: string) =>
    setDetails((current) => ({
      ...current,
      facilities: { ...current.facilities, [label]: value },
    }));

  const setStaffing = (
    key: keyof CitizenCharterDetails['staffing'],
    value: string
  ) =>
    setDetails((current) => ({
      ...current,
      staffing: {
        ...current.staffing,
        [key]: Math.max(0, Number(value) || 0),
      },
    }));

  const districtOptions = details.province
    ? PROVINCES_DATA.find((province) => province.nameNe === details.province)?.districtsEn ?? []
    : PROVINCES_DATA.flatMap((province) => province.districtsEn);
  const dateParts = englishDigits(details.date).split('-');

  return (
    <div className="space-y-4">
      <header className="glass-panel rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
              <Landmark className="h-6 w-6 text-blue-200" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  नागरिक बडापत्र तथा सेवा प्रवाह अनुगमन महाशाखा
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  आ.व. {toNepaliDigits(selectedFiscalYear)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                सार्वजनिक निकायहरूको १२-बुँदे बडापत्र परिपालना, १०-बुँदे सेवाग्राही भौतिक सुविधा तथा दरबन्दी अनुगमन
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B49] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            नयाँ बडापत्र अनुगमन
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, accent, glow }) => (
          <article
            key={label}
            className={`stat-tile-glow min-w-0 rounded-xl border p-3.5 bg-white/80 backdrop-blur-xs transition-all shadow-2xs ${accent} ${glow}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 truncate text-xl font-black text-slate-900">
              {toNepaliDigits(value)}
            </p>
          </article>
        ))}
      </div>

      {notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-950">
          {notice}
        </div>
      )}

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
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="प्रदेश">
              <select
                value={filters.province}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    province: event.target.value,
                    district: '',
                    localLevel: '',
                  }))
                }
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
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    district: event.target.value,
                    localLevel: '',
                  }))
                }
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
                onChange={(event) =>
                  setFilters((current) => ({ ...current, localLevel: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="">सबै</option>
                {filters.district &&
                  getLocalLevelsForDistrict(filters.district).map((level) => (
                    <option key={level}>{level}</option>
                  ))}
              </select>
            </Field>
            <Field label="कार्यालय">
              <input
                value={filters.office}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, office: event.target.value }))
                }
                placeholder="कार्यालयको नाम"
                className={inputClassName}
              />
            </Field>
            <Field label="मिति (देखि)">
              <NepaliDatePicker
                value={filters.fromDate}
                onChange={(date) =>
                  setFilters((current) => ({ ...current, fromDate: date }))
                }
              />
            </Field>
            <Field label="मिति (सम्म)">
              <NepaliDatePicker
                value={filters.toDate}
                onChange={(date) =>
                  setFilters((current) => ({ ...current, toDate: date }))
                }
              />
            </Field>
            <Field label="अनुगमनकर्ता">
              <input
                value={filters.auditor}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, auditor: event.target.value }))
                }
                placeholder="नाम"
                className={inputClassName}
              />
            </Field>
            <Field label="समस्या">
              <input
                value={filters.problem}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, problem: event.target.value }))
                }
                placeholder="समस्या खोज्नुहोस्"
                className={inputClassName}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                रिसेट
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">नागरिक बडापत्र अनुगमन विवरण</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {toNepaliDigits(shownActivities.length)} / {toNepaliDigits(charterActivities.length)} अभिलेख
            </p>
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="खोज्नुहोस्..."
              aria-label="नागरिक बडापत्र अनुगमन खोज्नुहोस्"
              className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-3 text-xs focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <th className="px-3 py-3">मिति</th>
                <th className="px-3 py-3">प्रदेश</th>
                <th className="px-3 py-3">जिल्ला</th>
                <th className="px-3 py-3">स्थानीय तह</th>
                <th className="px-3 py-3">कार्यालय</th>
                <th className="px-3 py-3">अनुगमनकर्ता</th>
                <th className="px-3 py-3">समस्या</th>
                <th className="px-3 py-3">स्थिति</th>
                <th className="px-3 py-3">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {shownActivities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                    {charterActivities.length === 0
                      ? 'हाल कुनै नागरिक बडापत्र अनुगमन अभिलेख उपलब्ध छैन।'
                      : 'फिल्टर वा खोजीसँग मिल्ने अभिलेख भेटिएन।'}
                  </td>
                </tr>
              ) : (
                shownActivities.map((activity) => {
                  const record = normalizeDetails(activity);
                  return (
                    <tr key={activity.id} className="align-middle text-slate-700 hover:bg-blue-50/40 transition-colors">
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{formatDate(record.date || activity.nepaliDate)}</td>
                      <td className="px-3 py-3">{record.province || getProvinceForDistrict(activity.districtEn) || '-'}</td>
                      <td className="px-3 py-3 font-medium">{DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn}</td>
                      <td className="px-3 py-3">{record.localLevel || '-'}</td>
                      <td className="max-w-52 px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setViewActivity(activity)}
                          className="font-bold text-slate-900 text-left hover:text-blue-800 hover:underline block leading-snug"
                        >
                          {record.officeName || activity.entityName || '-'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{record.auditor || '-'}</td>
                      <td className="max-w-56 px-3 py-3">
                        <span className="line-clamp-2 text-slate-800 font-normal">
                          {record.irregularities || 'उल्लेख छैन'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          {statusSummary(record)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewActivity(activity)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] transition-colors border border-blue-200 shadow-2xs"
                          >
                            <Eye className="h-3 w-3 text-blue-700" />
                            मिसिल हेर्नुहोस्
                          </button>
                          <button
                            type="button"
                            title="सम्पादन गर्नुहोस्"
                            aria-label="सम्पादन गर्नुहोस्"
                            onClick={() => openEditForm(activity)}
                            className="rounded-lg p-1 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="मेटाउनुहोस्"
                            aria-label="मेटाउनुहोस्"
                            disabled={deletingId === activity.id}
                            onClick={() => void deleteRecord(activity)}
                            className="rounded-lg p-1 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="citizen-charter-form-title"
              className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-blue-900" />
                  <div>
                    <h3 id="citizen-charter-form-title" className="text-sm font-bold text-slate-900">
                      {editingActivity ? 'नागरिक बडापत्र अनुगमन सम्पादन' : 'नागरिक बडापत्र अनुगमन फाराम'}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">तारा (*) लगाइएका विवरण अनिवार्य छन्।</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="बन्द गर्नुहोस्"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <form onSubmit={saveRecord} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                  <FormSection title="अनुगमन विवरण" icon={<Landmark className="h-4 w-4" />}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="प्रदेश" required>
                        <select
                          required
                          value={details.province}
                          onChange={(event) => {
                            updateDetails('province', event.target.value)
                            setSelectedDistrict('');
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
                      <Field label="जिल्ला" required>
                        <select
                          required
                          value={selectedDistrict}
                          onChange={(event) => setSelectedDistrict(event.target.value)}
                          className={inputClassName}
                        >
                          <option value="">जिल्ला छान्नुहोस्</option>
                          {districtOptions.map((district) => (
                            <option key={district} value={district}>
                              {DISTRICT_NE_MAP[district] || district}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="स्थानीय तह" required>
                        <select
                          required
                          value={details.localLevel}
                          onChange={(event) =>
                            updateDetails('localLevel', event.target.value)
                          }
                          className={inputClassName}
                        >
                          <option value="">स्थानीय तह छान्नुहोस्</option>
                          {(selectedDistrict
                            ? getLocalLevelsForDistrict(selectedDistrict)
                            : []
                          ).map((level) => (
                            <option key={level}>{level}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="पूरा ठेगाना">
                      <input
                        value={details.fullAddress}
                        onChange={(event) =>
                          updateDetails('fullAddress', event.target.value)
                        }
                        placeholder="ठेगाना टाइप गर्नुहोस् वा स्थानको विवरण लेख्नुहोस्"
                        className={inputClassName}
                      />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="कार्यालयको नाम" required>
                        <input
                          required
                          maxLength={200}
                          value={details.officeName}
                          onChange={(event) =>
                            updateDetails('officeName', event.target.value)
                          }
                          placeholder="कार्यालयको नाम"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="अनुगमन मिति" required>
                        <NepaliDatePicker
                          required
                          value={details.date}
                          onChange={(date) =>
                            setDetails((current) => ({ ...current, date }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="अनुगमनकर्ताको नाम" required>
                        <input
                          required
                          value={details.auditor}
                          onChange={(event) => updateDetails('auditor', event.target.value)}
                          placeholder="अनुगमनकर्ताको नाम"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="अनुगमनकर्ताको पद" required>
                        <input
                          required
                          value={details.auditorPost}
                          onChange={(event) => updateDetails('auditorPost', event.target.value)}
                          placeholder="अनुगमनकर्ताको पद"
                          className={inputClassName}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  <FormSection title="नागरिक बडापत्र तथा सेवा प्रवाहको अवस्था" icon={<ClipboardCheck className="h-4 w-4" />}>
                    <div className="divide-y divide-slate-100">
                      {CHECKS.map((item, index) => (
                        <fieldset key={item.key} className="grid gap-3 py-3 md:grid-cols-[minmax(220px,1fr)_2fr] md:items-center">
                          <legend className="sr-only">{item.label}</legend>
                          <span className="text-xs font-medium text-slate-700">
                            {toNepaliDigits(index + 1)}. {item.label}
                          </span>
                          <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {item.options.map((option) => (
                              <label key={option} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
                                <input
                                  type="radio"
                                  name={`check-${item.key}`}
                                  value={option}
                                  checked={details.checks[item.key] === option}
                                  onChange={() => setCheck(item.key, option)}
                                  className="accent-blue-800"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </FormSection>

                  <FormSection title="सेवाग्राही सुविधाका व्यवस्थाहरू" icon={<Accessibility className="h-4 w-4" />}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-left text-slate-700">
                            <th className="border border-slate-200 px-3 py-2">सुविधा</th>
                            {FACILITY_OPTIONS.map((option) => (
                              <th key={option} className="border border-slate-200 px-3 py-2 text-center">{option}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {FACILITIES.map((facility) => (
                            <tr key={facility}>
                              <td className="border border-slate-200 px-3 py-2 text-slate-700">{facility}</td>
                              {FACILITY_OPTIONS.map((option) => (
                                <td key={option} className="border border-slate-200 px-3 py-2 text-center">
                                  <input
                                    type="radio"
                                    name={`facility-${facility}`}
                                    value={option}
                                    checked={details.facilities[facility] === option}
                                    onChange={() => setFacility(facility, option)}
                                    aria-label={`${facility}: ${option}`}
                                    className="accent-blue-800"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </FormSection>

                  <FormSection title="अन्य विवरणात्मक जानकारी" icon={<Pencil className="h-4 w-4" />}>
                    <Field label="मुख्य सेवाहरू">
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={details.mainServices}
                        onChange={(event) => updateDetails('mainServices', limitWords(event.target.value, 100))}
                        placeholder="मुख्य सेवाहरू लेख्नुहोस्..."
                        className={inputClassName}
                      />
                      <span className="mt-1 block text-right text-[10px] text-slate-500">
                        {toNepaliDigits(wordCount(details.mainServices))} / १०० शब्द
                      </span>
                    </Field>
                    <Field label="मूलभूत समस्या/अनियमितता">
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={details.irregularities}
                        onChange={(event) => updateDetails('irregularities', limitWords(event.target.value, 100))}
                        placeholder="समस्या वा अनियमितता उल्लेख गर्नुहोस्..."
                        className={inputClassName}
                      />
                      <span className="mt-1 block text-right text-[10px] text-slate-500">
                        {toNepaliDigits(wordCount(details.irregularities))} / १०० शब्द
                      </span>
                    </Field>
                    <Field label="सुधारका उपायहरू">
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={details.recommendations}
                        onChange={(event) => updateDetails('recommendations', limitWords(event.target.value, 100))}
                        placeholder="सुधारका उपायहरू लेख्नुहोस्..."
                        className={inputClassName}
                      />
                      <span className="mt-1 block text-right text-[10px] text-slate-500">
                        {toNepaliDigits(wordCount(details.recommendations))} / १०० शब्द
                      </span>
                    </Field>
                  </FormSection>

                  <FormSection title="दरबन्दीको अवस्था तथा अनुगमनकर्ताको टिप्पणी" icon={<Accessibility className="h-4 w-4" />}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {([
                        ['sanctioned', 'कुल दरबन्दी'],
                        ['working', 'कार्यरत संख्या'],
                        ['vacant', 'रिक्त'],
                        ['equalizationPending', 'समान लिन बाँकी'],
                        ['excess', 'पदमुक्त बढी'],
                      ] as const).map(([key, label]) => (
                        <Field key={key} label={label}>
                          <input
                            type="number"
                            min="0"
                            value={details.staffing[key]}
                            onChange={(event) => setStaffing(key, event.target.value)}
                            className={inputClassName}
                          />
                        </Field>
                      ))}
                    </div>
                    <Field label="अनुगमनकर्ताको टिप्पणी">
                      <textarea
                        rows={3}
                        maxLength={1500}
                        value={details.auditorRemarks}
                        onChange={(event) => updateDetails('auditorRemarks', limitWords(event.target.value, 150))}
                        placeholder="अनुगमनकर्ताको टिप्पणी..."
                        className={inputClassName}
                      />
                      <span className="mt-1 block text-right text-[10px] text-slate-500">
                        {toNepaliDigits(wordCount(details.auditorRemarks))} / १५० शब्द
                      </span>
                    </Field>
                    {errorMessage && (
                      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                        {errorMessage}
                      </p>
                    )}
                  </FormSection>
                </div>
                <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setFormOpen(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-blue-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
                  >
                    {saving ? 'सुरक्षित हुँदैछ...' : 'अनुगमन फाराम सुरक्षित गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {viewActivity && (
        <CitizenCharterDossierModal
          activity={viewActivity}
          onClose={() => setViewActivity(null)}
          onEdit={(act) => {
            setViewActivity(null);
            openEditForm(act);
          }}
        />
      )}
    </div>
  );
};
