import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  MapPin,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ThumbsUp,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  DISTRICT_NE_MAP,
  getLocalLevelsForDistrict,
  MAHASHAKHAS,
  NEPALI_MONTHS,
  PROVINCES_DATA,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import { ActivityRecord, FiscalYear, ServiceSurveyDetails } from '../types/nvc';
import { NepalChoroplethMap } from './NepalChoroplethMap';
import { ServiceSurveyDossierModal } from './ServiceSurveyDossierModal';
import { NepaliDatePicker } from './NepaliDatePicker';

const EMPTY_DETAILS: ServiceSurveyDetails = {
  province: '',
  districtEn: '',
  localLevel: '',
  fullAddress: '',
  gender: '',
  previousOffices: ['', '', ''],
  serviceOffice: '',
  improvements: '',
  goodServiceOffices: '',
  weakServiceOffices: '',
  answers: {},
  dissatisfactionReasons: [],
  surveyDate: '',
};

const QUESTIONS: Array<{ key: string; label: string; options: string[] }> = [
  {
    key: 'charterInfo',
    label: 'नागरिक बडापत्रको बारेमा जानकारी छ?',
    options: ['छ', 'छैन'],
  },
  {
    key: 'serviceCostInfo',
    label: 'सेवाको लागि लाग्ने समय र दस्तुरको जानकारी छ?',
    options: ['छ', 'छैन'],
  },
  {
    key: 'serviceOnTime',
    label: 'तोकिएको समयमा काम भयो?',
    options: ['भयो', 'भएन'],
  },
  {
    key: 'outsideHelp',
    label: 'सेवा प्राप्त गर्न बाहिरी व्यक्तिको सहयोग लिनुपर्‍यो?',
    options: ['पर्‍यो', 'परेन'],
  },
  {
    key: 'extraMoney',
    label: 'अतिरिक्त रकम (घुस) दिनुपर्‍यो?',
    options: ['पर्‍यो', 'परेन'],
  },
  {
    key: 'serviceSatisfaction',
    label: 'समग्र सेवा तथा गुणस्तर',
    options: ['सन्तुष्ट', 'असन्तुष्ट'],
  },
  {
    key: 'rightToInfo',
    label: 'सूचनाको हक सम्बन्धमा जानकारी छ?',
    options: ['छ', 'छैन'],
  },
  {
    key: 'complaint',
    label: 'गुनासो वा उजुरी गर्नुभएको छ?',
    options: [
      'गरेको छु',
      'गरेको छैन',
      'तोकीए बमोजिम सेवा प्राप्त भएकाले गुनासो गर्नु परेको छैन',
      'गुनासो सुनुवाइ हुन्छ भन्ने विश्वास छैन',
    ],
  },
  {
    key: 'publicHearing',
    label: 'सार्वजनिक सुनुवाइमा सहभागी हुनुभएको छ?',
    options: ['छ', 'छैन', 'सार्वजनिक सुनुवाइ नै हुने गरेको छैन'],
  },
  {
    key: 'developmentInfo',
    label: 'तपाईंको टोल/गाउँ/नगरमा विकासको काम भएको/भइरहेको जानकारी छ?',
    options: ['छ', 'छैन'],
  },
  {
    key: 'developmentParticipation',
    label: 'विकास निर्माणका कार्यक्रममा सहभागी हुनुभएको छ?',
    options: ['भएको छु', 'भएको छैन', 'विकास निर्माणका कार्यक्रम नै भएका छैनन्'],
  },
  {
    key: 'constructionQuality',
    label: 'विकास निर्माणको कामको गुणस्तर कस्तो लाग्छ?',
    options: ['राम्रो', 'मध्यम', 'कमजोर'],
  },
  {
    key: 'projectBoard',
    label: 'आयोजनास्थलमा विवरणसहितको सूचना पाटी राखिएको छ?',
    options: ['छ', 'छैन', 'हेरिएको छैन, थाहा छैन'],
  },
  {
    key: 'planSatisfaction',
    label: 'सो योजना/विकास कार्यबाट सन्तुष्ट वा असन्तुष्ट?',
    options: ['सन्तुष्ट', 'असन्तुष्ट'],
  },
];

const DISSATISFACTION_REASONS = [
  'तोकिएको समयमा योजना सम्पन्न नभएकोले',
  'गुणस्तर कमजोर भएकोले',
  'मापदण्ड विपरीत भएकोले',
  'अन्य',
];
const EXTRA_MONEY_PATHS = ['सम्बन्धित कर्मचारीलाई', 'लेखापढी व्यवसायी मार्फत', 'अन्य मध्यस्थकर्ता मार्फत'];
const MONTHS = NEPALI_MONTHS.map((name, index) => ({
  value: String(index + 1).padStart(2, '0'),
  name,
}));
const COLORS = ['#15803d', '#f97316', '#0f766e', '#eab308', '#b91c1c', '#475569'];
const inputClassName =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

type SurveyFilters = {
  month: string;
  province: string;
  district: string;
  localLevel: string;
  gender: string;
  satisfaction: string;
  fromDate: string;
  toDate: string;
};

const EMPTY_FILTERS: SurveyFilters = {
  month: '',
  province: '',
  district: '',
  localLevel: '',
  gender: '',
  satisfaction: '',
  fromDate: '',
  toDate: '',
};

interface ServiceSurveyWorkspaceViewProps {
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

const englishDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));

const normalizeDetails = (activity: ActivityRecord): ServiceSurveyDetails => ({
  ...EMPTY_DETAILS,
  ...activity.serviceSurveyDetails,
  previousOffices: [
    ...(activity.serviceSurveyDetails?.previousOffices ?? []),
    '',
    '',
    '',
  ].slice(0, 3),
  answers: { ...activity.serviceSurveyDetails?.answers },
  dissatisfactionReasons: [
    ...(activity.serviceSurveyDetails?.dissatisfactionReasons ?? []),
  ],
});

const getDetails = (activity: ActivityRecord) => normalizeDetails(activity);
const surveyDate = (details: ServiceSurveyDetails, activity: ActivityRecord) =>
  details.surveyDate || activity.nepaliDate;

const getRate = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0;

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs ${className}`}>
    <h3 className="flex items-center gap-2 text-sm font-bold text-blue-950">
      <BarChart3 className="h-4 w-4 text-cyan-800" />
      {title}
    </h3>
    {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    {children}
  </section>
);

export const ServiceSurveyWorkspaceView: React.FC<
  ServiceSurveyWorkspaceViewProps
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
  const [viewActivity, setViewActivity] = useState<ActivityRecord | null>(null);
  const [details, setDetails] = useState<ServiceSurveyDetails>(EMPTY_DETAILS);
  const [filters, setFilters] = useState<SurveyFilters>(EMPTY_FILTERS);
  const [tableSearch, setTableSearch] = useState('');
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'satisfaction' | 'extraMoney' | 'quality'>(
    'satisfaction'
  );

  const surveys = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.activityType === 'service_survey' &&
          activity.fiscalYear === selectedFiscalYear
      ),
    [activities, selectedFiscalYear]
  );
  const districts = filters.province
    ? PROVINCES_DATA.find((province) => province.nameNe === filters.province)?.districtsEn ?? []
    : PROVINCES_DATA.flatMap((province) => province.districtsEn);

  const shownSurveys = useMemo(() => {
    const query = tableSearch.trim().toLocaleLowerCase();
    return surveys.filter((activity) => {
      const record = getDetails(activity);
      if (filters.province && record.province !== filters.province) return false;
      if (filters.district && record.districtEn !== filters.district) return false;
      if (filters.localLevel && record.localLevel !== filters.localLevel) return false;
      if (filters.gender && record.gender !== filters.gender) return false;
      if (
        filters.satisfaction &&
        record.answers.serviceSatisfaction !== filters.satisfaction
      )
        return false;
      if (
        filters.fromDate &&
        surveyDate(record, activity) < englishDigits(filters.fromDate)
      )
        return false;
      if (
        filters.toDate &&
        surveyDate(record, activity) > englishDigits(filters.toDate)
      )
        return false;
      if (filters.month && activity.monthIndex !== Number(filters.month)) return false;
      if (
        query &&
        ![
          record.province,
          DISTRICT_NE_MAP[record.districtEn] || record.districtEn,
          record.localLevel,
          record.gender,
          record.serviceOffice,
          ...record.previousOffices,
          record.improvements,
          record.goodServiceOffices,
          record.weakServiceOffices,
          ...Object.values(record.answers),
          ...record.dissatisfactionReasons,
        ].some((value) => value.toLocaleLowerCase().includes(query))
      )
        return false;
      return true;
    });
  }, [surveys, filters, tableSearch]);

  const overviewSurveys = surveys.filter((activity) => {
    if (filters.province && getDetails(activity).province !== filters.province) return false;
    if (filters.district && getDetails(activity).districtEn !== filters.district) return false;
    if (filters.localLevel && getDetails(activity).localLevel !== filters.localLevel)
      return false;
    if (filters.gender && getDetails(activity).gender !== filters.gender) return false;
    if (
      filters.satisfaction &&
      getDetails(activity).answers.serviceSatisfaction !== filters.satisfaction
    )
      return false;
    if (
      filters.fromDate &&
      surveyDate(getDetails(activity), activity) < englishDigits(filters.fromDate)
    )
      return false;
    if (
      filters.toDate &&
      surveyDate(getDetails(activity), activity) > englishDigits(filters.toDate)
    )
      return false;
    if (filters.month && activity.monthIndex !== Number(filters.month)) return false;
    return true;
  });

  const satisfiedCount = overviewSurveys.filter(
    (activity) => getDetails(activity).answers.serviceSatisfaction === 'सन्तुष्ट'
  ).length;
  const dissatisfiedCount = overviewSurveys.filter(
    (activity) => getDetails(activity).answers.serviceSatisfaction === 'असन्तुष्ट'
  ).length;
  const satisfiedRate = getRate(satisfiedCount, overviewSurveys.length);
  const extraMoneyCount = overviewSurveys.filter(
    (activity) => getDetails(activity).answers.extraMoney === 'पर्‍यो'
  ).length;
  const goodServiceOffices = useMemo(() => {
    const offices = new Map<string, number>();
    overviewSurveys.forEach((activity) => {
      const record = getDetails(activity);
      if (
        record.goodServiceOffices.trim() &&
        record.answers.serviceSatisfaction === 'सन्तुष्ट'
      )
        offices.set(
          record.goodServiceOffices.trim(),
          (offices.get(record.goodServiceOffices.trim()) ?? 0) + 1
        );
    });
    return [...offices.entries()]
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [overviewSurveys]);
  const improvementOffices = useMemo(() => {
    const names = new Map<string, number>();
    overviewSurveys.forEach((activity) => {
      const name = getDetails(activity).weakServiceOffices.trim();
      if (name) names.set(name, (names.get(name) ?? 0) + 1);
    });
    return [...names.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [overviewSurveys]);

  const satisfactionData = [
    { name: 'सन्तुष्ट', value: satisfiedCount },
    { name: 'असन्तुष्ट', value: dissatisfiedCount },
  ].filter((item) => item.value > 0);
  const genderData = ['पुरुष', 'महिला', 'अन्य'].map((gender) => ({
    name: gender,
    count: overviewSurveys.filter((activity) => getDetails(activity).gender === gender)
      .length,
  }));
  const reasonData = DISSATISFACTION_REASONS.map((name) => ({
    name,
    count: overviewSurveys.filter((activity) =>
      getDetails(activity).dissatisfactionReasons.includes(name)
    ).length,
  })).filter((item) => item.count > 0);
  const extraMoneyData = EXTRA_MONEY_PATHS.map((name) => ({
    name,
    count: overviewSurveys.filter((activity) => {
      const record = getDetails(activity);
      return (
        record.answers.extraMoney === 'पर्‍यो' &&
        record.answers.extraMoneyReceiver === name
      );
    }).length,
  }));
  const districtCounts = overviewSurveys.reduce<Record<string, number>>((counts, activity) => {
    const record = getDetails(activity);
    const matched =
      mapMode === 'satisfaction'
        ? record.answers.serviceSatisfaction === 'सन्तुष्ट'
        : mapMode === 'extraMoney'
        ? record.answers.extraMoney === 'पर्‍यो'
        : record.answers.constructionQuality === 'राम्रो';
    if (matched) counts[record.districtEn] = (counts[record.districtEn] ?? 0) + 1;
    return counts;
  }, {});
  const monthlyData = NEPALI_MONTHS.map((month, index) => {
    const monthSurveys = overviewSurveys.filter(
      (activity) => activity.monthIndex === index + 1
    );
    const monthSatisfied = monthSurveys.filter(
      (activity) => getDetails(activity).answers.serviceSatisfaction === 'सन्तुष्ट'
    ).length;
    return {
      month,
      satisfaction: getRate(monthSatisfied, monthSurveys.length),
    };
  });
  const cards = [
    { label: 'कुल सर्भेक्षण', value: toNepaliDigits(overviewSurveys.length), icon: ClipboardList, accent: 'border-blue-200 bg-blue-50/70 text-blue-900', glow: 'hover:border-blue-400' },
    { label: 'समग्र सेवा सन्तुष्टि', value: `${toNepaliDigits(satisfiedRate)}%`, icon: ThumbsUp, accent: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', glow: 'hover:border-emerald-400' },
    { label: 'उत्कृष्ट सेवा अनुभव', value: toNepaliDigits(satisfiedCount), icon: Trophy, accent: 'border-cyan-200 bg-cyan-50/70 text-cyan-900', glow: 'hover:border-cyan-400' },
    { label: 'सेवा सुधार आवश्यक', value: toNepaliDigits(dissatisfiedCount), icon: AlertTriangle, accent: 'border-orange-200 bg-orange-50/70 text-orange-900', glow: 'hover:border-orange-400' },
    {
      label: 'नागरिक बडापत्र जानकारी',
      value: toNepaliDigits(overviewSurveys.filter(
        (activity) => getDetails(activity).answers.charterInfo === 'छ'
      ).length),
      icon: FileText,
      accent: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
      glow: 'hover:border-indigo-400',
    },
    { label: 'अतिरिक्त रकम मागिएको', value: toNepaliDigits(extraMoneyCount), icon: Activity, accent: 'border-red-200 bg-red-50/70 text-red-900', glow: 'hover:border-red-400' },
  ];

  const openNewForm = () => {
    setEditingActivity(null);
    setDetails(EMPTY_DETAILS);
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };
  const openEditForm = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setDetails(getDetails(activity));
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };
  const updateAnswer = (key: string, value: string) =>
    setDetails((current) => {
      const answers = { ...current.answers, [key]: value };
      if (key === 'extraMoney' && value !== 'पर्‍यो') {
        delete answers.extraMoneyReceiver;
      }
      return { ...current, answers };
    });
  const updateSurveyDate = (part: 'year' | 'month' | 'day', value: string) => {
    const [year = '', month = '', day = ''] = englishDigits(details.surveyDate).split('-');
    const next = { year, month, day, [part]: value };
    setDetails((current) => ({
      ...current,
      surveyDate: [next.year, next.month, next.day].some(Boolean)
        ? `${next.year}-${next.month}-${next.day}`
        : '',
    }));
  };

  const saveSurvey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    const surveyId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    const mahashakhaId =
      MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ?? 'maha_admin';
    const shakhaId =
      SHAKHAS.find(
        (item) =>
          item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
      )?.id ??
      SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
      'shakha_admin_plan';
    const savedDetails: ServiceSurveyDetails = {
      ...details,
      surveyDate: englishDigits(details.surveyDate),
      previousOffices: details.previousOffices.map((office) => office.trim()),
      answers: { ...details.answers },
      dissatisfactionReasons: [...details.dissatisfactionReasons],
    };
    const monthIndex =
      Number(savedDetails.surveyDate.split('-')[1]) || CURRENT_NEPALI_MONTH_INDEX;
    const serviceScore = savedDetails.answers.serviceSatisfaction === 'सन्तुष्ट';
    const issues = [
      savedDetails.answers.extraMoney === 'पर्‍यो',
      savedDetails.answers.serviceOnTime === 'भएन',
      savedDetails.answers.constructionQuality === 'कमजोर',
      savedDetails.answers.planSatisfaction === 'असन्तुष्ट',
    ].filter(Boolean).length;
    const savedActivity: ActivityRecord = {
      ...(editingActivity ?? {}),
      id: surveyId,
      refNo: editingActivity?.refNo ?? surveyId,
      activityType: 'service_survey',
      title: `${savedDetails.serviceOffice.trim()} सेवाग्राही सर्वेक्षण`,
      entityName: savedDetails.serviceOffice.trim(),
      districtEn: savedDetails.districtEn,
      fiscalYear: editingActivity?.fiscalYear ?? selectedFiscalYear,
      monthIndex,
      nepaliDate: savedDetails.surveyDate,
      nonComplianceCount: issues,
      directiveCount: serviceScore ? 1 : 0,
      status: 'sampanna',
      mahashakhaId,
      shakhaId,
      createdByUid: editingActivity?.createdByUid ?? currentUid,
      serviceSurveyDetails: savedDetails,
      createdAt: editingActivity?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { data, error } = editingActivity
        ? await supabase
            .from('activities')
            .update(savedActivity)
            .eq('id', surveyId)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('activities')
            .insert(savedActivity)
            .select('id')
            .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('सर्भेक्षण सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedActivity);
      setFormOpen(false);
      setNotice(editingActivity ? 'सर्भेक्षण अद्यावधिक गरियो।' : 'नयाँ सर्भेक्षण सुरक्षित गरियो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save service survey:', error);
      setErrorMessage(`सर्भेक्षण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteSurvey = async (activity: ActivityRecord) => {
    if (!window.confirm('यो सेवाग्राही सर्भेक्षण मेटाउने?')) return;
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
      if (!data) throw new Error('सर्भेक्षण मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);
      setNotice('सर्भेक्षण मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete service survey:', error);
      setNotice(`सर्भेक्षण मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const setPreviousOffice = (index: number, value: string) =>
    setDetails((current) => ({
      ...current,
      previousOffices: current.previousOffices.map((office, itemIndex) =>
        itemIndex === index ? value : office
      ),
    }));
  const toggleReason = (reason: string) =>
    setDetails((current) => ({
      ...current,
      dissatisfactionReasons: current.dissatisfactionReasons.includes(reason)
        ? current.dissatisfactionReasons.filter((item) => item !== reason)
        : [...current.dissatisfactionReasons, reason],
    }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const dateParts = englishDigits(details.surveyDate).split('-');
  const satisfiedLabel = (record: ServiceSurveyDetails) =>
    record.answers.serviceSatisfaction || record.answers.planSatisfaction || '-';

  return (
    <div className="space-y-4">
      <header className="glass-panel rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
              <MessageSquareText className="h-6 w-6 text-blue-200" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  सेवाग्राही सर्वेक्षण विश्लेषण ड्यासबोर्ड (Citizen Feedback Workspace)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  आ.व. {toNepaliDigits(selectedFiscalYear)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                सार्वजनिक सेवाग्राही सन्तुष्टि, बडापत्र जानकारी, अतिरिक्त रकम (घुस) जोखिम र सुधारका सुझावहरू
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="महिनाअनुसार फिल्टर"
              value={filters.month}
              onChange={(event) =>
                setFilters((current) => ({ ...current, month: event.target.value }))
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="">सबै महिना</option>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.name}
                </option>
              ))}
            </select>
            <select
              aria-label="लिङ्गअनुसार फिल्टर"
              value={filters.gender}
              onChange={(event) =>
                setFilters((current) => ({ ...current, gender: event.target.value }))
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="">सबै लिङ्ग</option>
              {['पुरुष', 'महिला', 'अन्य'].map((gender) => (
                <option key={gender}>{gender}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B49] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              नयाँ सर्भेक्षण
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
            <p className="mt-2 truncate text-xl font-black text-slate-900">{value}</p>
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
                <option value="">सबै प्रदेश</option>
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
                <option value="">सबै जिल्ला</option>
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
                <option value="">सबै स्थानीय तह</option>
                {filters.district &&
                  getLocalLevelsForDistrict(filters.district).map((level) => (
                    <option key={level}>{level}</option>
                  ))}
              </select>
            </Field>
            <Field label="लिङ्ग">
              <select
                value={filters.gender}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, gender: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="">सबै</option>
                {['पुरुष', 'महिला', 'अन्य'].map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </Field>
            <Field label="सेवा सन्तुष्टि">
              <select
                value={filters.satisfaction}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    satisfaction: event.target.value,
                  }))
                }
                className={inputClassName}
              >
                <option value="">सबै</option>
                <option>सन्तुष्ट</option>
                <option>असन्तुष्ट</option>
              </select>
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
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                रिसेट
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-blue-950">प्रदेशगत सर्भेक्षण</h3>
            <div className="flex gap-1">
              {([
                ['satisfaction', 'सन्तुष्टि'],
                ['extraMoney', 'अतिरिक्त रकम'],
                ['quality', 'गुणस्तर'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMapMode(mode)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    mapMode === mode
                      ? 'border-blue-700 text-blue-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <NepalChoroplethMap
            districtCounts={districtCounts}
            selectedDistrict={filters.district || null}
            onSelectDistrict={(district) =>
              setFilters((current) => ({ ...current, district: district ?? '' }))
            }
          />
        </section>

        <ChartCard title="समग्र सेवा सन्तुष्टि" subtitle="सन्तुष्ट र असन्तुष्ट सेवाग्राहीको अनुपात">
          <div className="relative h-[290px]">
            {satisfactionData.length ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={satisfactionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={104}
                      paddingAngle={3}
                    >
                      {satisfactionData.map((item, index) => (
                        <Cell key={item.name} fill={index === 0 ? '#16a34a' : '#f97316'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => toNepaliDigits(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
                  <span className="text-3xl font-bold text-slate-900">
                    {toNepaliDigits(satisfiedRate)}%
                  </span>
                  <span className="text-xs text-slate-500">सन्तुष्टि दर</span>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                सर्भेक्षण तथ्याङ्क उपलब्ध छैन।
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="लिङ्ग अनुसार सहभागिता">
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#18a6b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="असन्तुष्टिका मुख्य कारणहरू">
          <div className="mt-3 h-56">
            {reasonData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonData} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} fontSize={10} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={9} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                असन्तुष्टिको कारण उल्लेख छैन।
              </div>
            )}
          </div>
        </ChartCard>
        <ChartCard title="अतिरिक्त रकम कसलाई दिइयो?">
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={extraMoneyData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={10} />
                <YAxis type="category" dataKey="name" width={145} fontSize={9} />
                <Tooltip />
                <Bar dataKey="count" fill="#e7a43c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="मासिक सन्तुष्टि प्रवृत्ति" subtitle="महिनावार सेवा सन्तुष्टि दर (%)">
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={10} />
              <YAxis domain={[0, 100]} unit="%" fontSize={10} />
              <Tooltip formatter={(value) => `${toNepaliDigits(Number(value))}%`} />
              <Line
                type="monotone"
                dataKey="satisfaction"
                name="सन्तुष्टि दर"
                stroke="#1d4ed8"
                strokeWidth={2}
                connectNulls
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="उत्कृष्ट सेवा प्रवाह गर्ने कार्यालयहरू"
          subtitle="सन्तुष्ट सेवाग्राहीले उल्लेख गरेका कार्यालय"
        >
          <div className="mt-3 space-y-3">
            {goodServiceOffices.length ? (
              goodServiceOffices.map((office) => (
                <div key={office.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-800">{office.name}</span>
                  <span className="shrink-0 font-bold text-slate-900">
                    {toNepaliDigits(office.count)} पटक
                  </span>
                </div>
              ))
            ) : (
              <p className="py-5 text-xs text-slate-400">कार्यालयगत सन्तुष्टि तथ्याङ्क उपलब्ध छैन।</p>
            )}
          </div>
        </ChartCard>
        <ChartCard title="सुधार आवश्यक कार्यालयहरू" subtitle="सेवाग्राहीले उल्लेख गरेका कार्यालयहरू">
          <div className="mt-3 space-y-3">
            {improvementOffices.length ? (
              improvementOffices.map((office) => (
                <div key={office.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-800">{office.name}</span>
                  <span className="shrink-0 font-bold text-red-700">{toNepaliDigits(office.value)}</span>
                </div>
              ))
            ) : (
              <p className="py-5 text-xs text-slate-400">सुधार आवश्यक कार्यालय उल्लेख गरिएको छैन।</p>
            )}
          </div>
        </ChartCard>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-blue-950">
              <ClipboardList className="h-4 w-4" />
              हालका प्रतिक्रियाहरू
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              फिल्टर अनुसार पछिल्ला १० वटा सर्भेक्षण
            </p>
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="सर्भेक्षण खोज्नुहोस्..."
              aria-label="सर्भेक्षण खोज्नुहोस्"
              className={`${inputClassName} pl-8`}
            />
          </label>
        </div>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 font-semibold text-slate-600">
                <th className="px-3 py-2.5">मिति</th>
                <th className="px-3 py-2.5">प्रदेश</th>
                <th className="px-3 py-2.5">जिल्ला</th>
                <th className="px-3 py-2.5">लिङ्ग</th>
                <th className="px-3 py-2.5">कार्यालय</th>
                <th className="px-3 py-2.5">सन्तुष्टि</th>
                <th className="px-3 py-2.5">अतिरिक्त रकम (घुस)</th>
                <th className="px-3 py-2.5">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {shownSurveys.length ? (
                shownSurveys.slice(0, 10).map((activity) => {
                  const record = getDetails(activity);
                  const satisfaction = satisfiedLabel(record);
                  const extraMoney = record.answers.extraMoney === 'पर्‍यो';
                  return (
                    <tr key={activity.id} className="align-middle text-slate-700 hover:bg-blue-50/40 transition-colors">
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                        {toNepaliDigits(surveyDate(record, activity))}
                      </td>
                      <td className="px-3 py-2.5">{record.province || '-'}</td>
                      <td className="px-3 py-2.5 font-medium">
                        {DISTRICT_NE_MAP[record.districtEn] || record.districtEn || '-'}
                      </td>
                      <td className="px-3 py-2.5">{record.gender || '-'}</td>
                      <td className="max-w-48 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setViewActivity(activity)}
                          className="font-bold text-slate-900 text-left hover:text-blue-800 hover:underline block leading-snug"
                        >
                          {record.serviceOffice || '-'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          satisfaction === 'सन्तुष्ट'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}>
                          {satisfaction}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          extraMoney ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-600'
                        }`}>
                          {record.answers.extraMoney || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
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
                            onClick={() => void deleteSurvey(activity)}
                            className="rounded-lg p-1 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    {surveys.length
                      ? 'फिल्टर वा खोजीसँग मिल्ने सर्भेक्षण भेटिएन।'
                      : 'हाल कुनै सेवाग्राही सर्भेक्षण उपलब्ध छैन।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-500">
          डाटा स्रोत: सेवाग्राही सर्भेक्षण फाराम · कुल अभिलेख: {toNepaliDigits(overviewSurveys.length)}
        </footer>
      </section>

      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="service-survey-form-title"
              className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
                <div>
                  <h3 id="service-survey-form-title" className="text-sm font-bold text-slate-900">
                    {editingActivity ? 'सेवाग्राही सर्भेक्षण सम्पादन' : 'सेवाग्राही सर्वेक्षण फाराम'}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">तारा (*) लगाइएका विवरण अनिवार्य छन्।</p>
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
              <form onSubmit={saveSurvey} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                      व्यक्तिगत तथा ठेगाना विवरण
                    </h4>
                    <div className="space-y-3">
                      <Field label="प्रदेश" required>
                        <select
                          required
                          value={details.province}
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              province: event.target.value,
                              districtEn: '',
                              localLevel: '',
                            }))
                          }
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
                          value={details.districtEn}
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              districtEn: event.target.value,
                              localLevel: '',
                            }))
                          }
                          className={inputClassName}
                        >
                          <option value="">पहिले प्रदेश छान्नुहोस्</option>
                          {(details.province
                            ? PROVINCES_DATA.find(
                                (province) => province.nameNe === details.province
                              )?.districtsEn ?? []
                            : []
                          ).map((district) => (
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
                            setDetails((current) => ({
                              ...current,
                              localLevel: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        >
                          <option value="">पहिले जिल्ला छान्नुहोस्</option>
                          {details.districtEn &&
                            getLocalLevelsForDistrict(details.districtEn).map((level) => (
                              <option key={level}>{level}</option>
                            ))}
                        </select>
                      </Field>
                      <Field label="पूरा ठेगाना">
                        <input
                          value={details.fullAddress}
                          onChange={(event) =>
                            setDetails((current) => ({
                              ...current,
                              fullAddress: event.target.value,
                            }))
                          }
                          placeholder="स्थान टाइप गर्नुहोस् वा स्थान छान्नुहोस्"
                          className={inputClassName}
                        />
                      </Field>
                      <fieldset>
                        <legend className="mb-2 text-xs font-semibold text-slate-700">
                          लिङ्ग <span className="text-red-600">*</span>
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {['पुरुष', 'महिला', 'अन्य'].map((gender) => (
                            <label
                              key={gender}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                                details.gender === gender
                                  ? 'border-blue-700 bg-blue-50 text-blue-900'
                                  : 'border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="survey-gender"
                                required
                                value={gender}
                                checked={details.gender === gender}
                                onChange={() =>
                                  setDetails((current) => ({ ...current, gender }))
                                }
                              />
                              {gender}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                      सेवा लिएका कार्यालयहरू (पछिल्लो १ वर्षमा)
                    </h4>
                    <div className="space-y-3">
                      {details.previousOffices.map((office, index) => (
                        <Field key={index} label={`कार्यालय ${toNepaliDigits(index + 1)}`}>
                          <input
                            value={office}
                            onChange={(event) => setPreviousOffice(index, event.target.value)}
                            placeholder="कार्यालयको नाम"
                            className={inputClassName}
                          />
                        </Field>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                      विवरण दिन चाहेको कार्यालय
                    </h4>
                    <Field label="कार्यालयको नाम" required>
                      <input
                        required
                        value={details.serviceOffice}
                        onChange={(event) =>
                          setDetails((current) => ({
                            ...current,
                            serviceOffice: event.target.value,
                          }))
                        }
                        placeholder="कार्यालयको नाम"
                        className={inputClassName}
                      />
                    </Field>
                  </section>

                  <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                      सेवाग्राही अनुभव तथा सेवा सम्बन्धी जानकारी
                    </h4>
                    {QUESTIONS.map((question) => (
                      <fieldset
                        key={question.key}
                        className="grid gap-3 border-b border-dashed border-slate-200 py-3 last:border-0 md:grid-cols-[minmax(240px,1fr)_1.5fr] md:items-center"
                      >
                        <legend className="sr-only">{question.label}</legend>
                        <span className="text-xs font-medium text-slate-800">
                          {question.label}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <label
                              key={option}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                                details.answers[question.key] === option
                                  ? 'border-blue-700 bg-blue-50 text-blue-900'
                                  : 'border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`survey-${question.key}`}
                                required={
                                  question.key === 'serviceSatisfaction' ||
                                  question.key === 'planSatisfaction'
                                }
                                checked={details.answers[question.key] === option}
                                onChange={() => updateAnswer(question.key, option)}
                              />
                              {option}
                            </label>
                          ))}
                          {question.key === 'extraMoney' &&
                            details.answers.extraMoney === 'पर्‍यो' && (
                              <select
                                required
                                value={details.answers.extraMoneyReceiver ?? ''}
                                onChange={(event) =>
                                  updateAnswer('extraMoneyReceiver', event.target.value)
                                }
                                className={inputClassName}
                              >
                                <option value="">कसलाई दिइयो?</option>
                                {EXTRA_MONEY_PATHS.map((path) => (
                                  <option key={path}>{path}</option>
                                ))}
                              </select>
                            )}
                        </div>
                      </fieldset>
                    ))}
                  </section>

                  <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">
                      सेवा प्रवाहको सुझाव तथा कार्यालयहरू
                    </h4>
                    <Field label="सेवा प्रवाहमा सुधारका लागि सुझाव">
                      <textarea
                        rows={3}
                        value={details.improvements}
                        onChange={(event) => {
                          const value = event.target.value;
                          const words = value.trim().split(/\s+/);
                          setDetails((current) => ({
                            ...current,
                            improvements:
                              value.trim() && words.length > 100
                                ? words.slice(0, 100).join(' ')
                                : value,
                          }));
                        }}
                        placeholder="सुझाव दिनुहोस् (बढीमा १०० शब्द)..."
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="राम्रो सेवा प्रवाह गर्ने कार्यालय(हरू)">
                      <input
                        value={details.goodServiceOffices}
                        onChange={(event) =>
                          setDetails((current) => ({
                            ...current,
                            goodServiceOffices: event.target.value,
                          }))
                        }
                        placeholder="कार्यालयको नाम"
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="सेवा प्रवाह कमजोर/अनियमित रहेका कार्यालय(हरू)">
                      <input
                        value={details.weakServiceOffices}
                        onChange={(event) =>
                          setDetails((current) => ({
                            ...current,
                            weakServiceOffices: event.target.value,
                          }))
                        }
                        placeholder="कार्यालयको नाम"
                        className={inputClassName}
                      />
                    </Field>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-bold text-blue-950">
                      असन्तुष्टिको कारण
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {DISSATISFACTION_REASONS.map((reason) => (
                        <label
                          key={reason}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={details.dissatisfactionReasons.includes(reason)}
                            onChange={() => toggleReason(reason)}
                          />
                          {reason}
                        </label>
                      ))}
                    </div>
                    {details.dissatisfactionReasons.includes('अन्य') && (
                      <input
                        value={details.answers.otherReason ?? ''}
                        onChange={(event) => updateAnswer('otherReason', event.target.value)}
                        placeholder="अन्य कारण खुलाउनुहोस्"
                        className={`${inputClassName} mt-3`}
                      />
                    )}
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-2 text-xs font-semibold text-slate-700">
                      सर्भेक्षण मिति <span className="text-red-600">*</span>
                    </h4>
                    <NepaliDatePicker
                      required
                      value={details.surveyDate}
                      onChange={(date) =>
                        setDetails((current) => ({ ...current, surveyDate: date }))
                      }
                    />
                  </section>

                  {errorMessage && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      {errorMessage}
                    </p>
                  )}
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
                    {saving ? 'सुरक्षित हुँदैछ...' : 'सर्भेक्षण सेभ गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {viewActivity && (
        <ServiceSurveyDossierModal
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
