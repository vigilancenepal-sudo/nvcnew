import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  DISTRICT_NE_MAP,
  FISCAL_YEARS,
  getLocalLevelsForDistrict,
  getProvinceForDistrict,
  NEPALI_MONTHS,
  PROVINCES_DATA,
  MAHASHAKHAS,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import { ActivityRecord, FiscalYear, PromotionalProgramDetails } from '../types/nvc';
import { NepalChoroplethMap } from './NepalChoroplethMap';

const ATTACHMENT_BUCKET = 'activity-attachments';
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const NEPALI_YEARS = ['२०८१', '२०८२', '२०८३', '२०८४', '२०८५'];
const STATUS_OPTIONS: Array<{
  value: PromotionalProgramDetails['status'];
  label: string;
}> = [
  { value: 'upcoming', label: 'आगामी' },
  { value: 'ongoing', label: 'सञ्चालन भइरहेको' },
  { value: 'completed', label: 'सम्पन्न' },
  { value: 'cancelled', label: 'रद्द भएको' },
];

const EMPTY_DETAILS: PromotionalProgramDetails = {
  programName: '',
  plannedFiscalYear: '2083/84',
  date: '',
  location: '',
  districtEn: '',
  localLevel: '',
  targetGroup: '',
  participantCount: 0,
  status: 'upcoming',
};

const inputClassName =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

interface PromotionalProgramWorkspaceViewProps {
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
    <span className="mt-1.5 block">{children}</span>
  </label>
);

const englishDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));

const normalizedDetails = (activity: ActivityRecord): PromotionalProgramDetails => ({
  ...EMPTY_DETAILS,
  ...activity.promotionalProgramDetails,
});

const parseDate = (date: string) => {
  const [year = '', month = '', day = ''] = englishDigits(date).split('-');
  return { year, month, day };
};

const formatDate = (date: string) => {
  if (!date) return '-';
  const { year, month, day } = parseDate(date);
  const monthName = NEPALI_MONTHS[Number(month) - 1];
  return monthName
    ? `${toNepaliDigits(year)} ${monthName} ${toNepaliDigits(Number(day))}`
    : toNepaliDigits(date);
};

const statusLabel = (status: PromotionalProgramDetails['status']) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'आगामी';

const statusClassName = (status: PromotionalProgramDetails['status']) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'ongoing') return 'bg-blue-50 text-blue-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-50 text-amber-700';
};

export const PromotionalProgramWorkspaceView: React.FC<
  PromotionalProgramWorkspaceViewProps
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
  const [details, setDetails] = useState<PromotionalProgramDetails>(EMPTY_DETAILS);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_NEPALI_MONTH_INDEX);
  const [calendarYear, setCalendarYear] = useState(
    Number(selectedFiscalYear.split('/')[0])
  );
  const [selectedMapDistrict, setSelectedMapDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoActivityId, setPhotoActivityId] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setCalendarYear(Number(selectedFiscalYear.split('/')[0]));
  }, [selectedFiscalYear]);

  const programs = useMemo(
    () =>
      activities
        .filter(
          (activity) =>
            activity.activityType === 'prabardhanatmak' &&
            activity.fiscalYear === selectedFiscalYear
        )
        .map((activity) => ({ activity, details: normalizedDetails(activity) }))
        .sort((a, b) => a.details.date.localeCompare(b.details.date)),
    [activities, selectedFiscalYear]
  );

  const query = search.trim().toLocaleLowerCase();
  const visiblePrograms = programs.filter(({ details: record }) =>
    [
      record.programName,
      record.location,
      record.localLevel,
      DISTRICT_NE_MAP[record.districtEn] || record.districtEn,
      record.targetGroup,
      statusLabel(record.status),
    ].some((value) => value.toLocaleLowerCase().includes(query))
  );
  const upcomingPrograms = programs.filter(
    ({ details: record }) => record.status === 'upcoming' || record.status === 'ongoing'
  );
  const completedPrograms = programs.filter(
    ({ details: record }) => record.status === 'completed'
  );
  const totalParticipants = programs.reduce(
    (total, { details: record }) => total + (Number(record.participantCount) || 0),
    0
  );
  const calendarPrograms = programs.filter(({ details: record }) => {
    const date = parseDate(record.date);
    return (
      Number(date.year) === calendarYear &&
      Number(date.month) === selectedMonth
    );
  });
  const dailyPrograms = new Map<number, typeof calendarPrograms>();
  calendarPrograms.forEach((program) => {
    const day = Number(parseDate(program.details.date).day);
    dailyPrograms.set(day, [...(dailyPrograms.get(day) ?? []), program]);
  });
  const quarterData = [0, 1, 2, 3].map((quarter) => {
    const quarterPrograms = programs.filter(({ details: record }) => {
      const month = Number(parseDate(record.date).month);
      const quarterMonths = [
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
        [1, 2, 3],
      ][quarter];
      return quarterMonths.includes(month);
    });
    return {
      quarter: `${toNepaliDigits(quarter + 1)} त्रैमासिक`,
      लक्ष्य: quarterPrograms.length,
      सम्पन्न: quarterPrograms.filter(({ details: record }) => record.status === 'completed')
        .length,
    };
  });
  const districtCounts = programs.reduce<Record<string, number>>(
    (counts, { details: record }) => {
      if (record.districtEn) {
        counts[record.districtEn] = (counts[record.districtEn] ?? 0) + 1;
      }
      return counts;
    },
    {}
  );
  const photoPrograms = programs.filter(({ activity }) =>
    (activity.attachmentPaths ?? []).some((path) => /\.(png|jpe?g)$/i.test(path))
  );

  const openNewForm = () => {
    setEditingActivity(null);
    setDetails({ ...EMPTY_DETAILS, plannedFiscalYear: selectedFiscalYear });
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };

  const openEditForm = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setDetails(normalizedDetails(activity));
    setErrorMessage(null);
    setNotice(null);
    setFormOpen(true);
  };

  const updateDate = (part: 'year' | 'month' | 'day', value: string) => {
    const current = parseDate(details.date);
    const next = { ...current, [part]: value };
    setDetails((existing) => ({
      ...existing,
      date: [next.year, next.month, next.day].some(Boolean)
        ? `${next.year}-${next.month}-${next.day}`
        : '',
    }));
  };

  const saveProgram = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const recordId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    const mahashakhaId =
      MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ?? 'maha_admin';
    const shakhaId =
      SHAKHAS.find(
        (item) =>
          item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
      )?.id ??
      SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
      'shakha_admin_plan';
    const savedDetails: PromotionalProgramDetails = {
      ...details,
      programName: details.programName.trim(),
      date: englishDigits(details.date),
      location: details.location.trim(),
      targetGroup: details.targetGroup.trim(),
      participantCount: Math.max(0, Number(details.participantCount) || 0),
    };
    const dateParts = parseDate(savedDetails.date);
    const mappedStatus: ActivityRecord['status'] =
      savedDetails.status === 'completed'
        ? 'sampanna'
        : savedDetails.status === 'cancelled'
          ? 'cancelled'
          : 'chalu';
    const savedRecord: ActivityRecord = {
      ...(editingActivity ?? {}),
      id: recordId,
      refNo: editingActivity?.refNo ?? recordId,
      activityType: 'prabardhanatmak',
      title: savedDetails.programName,
      entityName: savedDetails.localLevel || savedDetails.location || 'कार्यक्रम स्थल',
      districtEn: savedDetails.districtEn,
      fiscalYear: savedDetails.plannedFiscalYear,
      monthIndex: Number(dateParts.month),
      nepaliDate: savedDetails.date,
      nonComplianceCount: 0,
      directiveCount: 0,
      status: mappedStatus,
      mahashakhaId,
      shakhaId,
      createdByUid: editingActivity?.createdByUid ?? currentUid,
      promotionalProgramDetails: savedDetails,
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
      if (!data) throw new Error('कार्यक्रम सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(editingActivity ? 'कार्यक्रम अद्यावधिक गरियो।' : 'नयाँ कार्यक्रम सुरक्षित गरियो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save promotional program:', error);
      setErrorMessage(`कार्यक्रम सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteProgram = async (activity: ActivityRecord) => {
    if (!window.confirm('यो कार्यक्रम अभिलेख मेटाउने?')) return;
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
      if (!data) throw new Error('कार्यक्रम मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);
      const ownPaths = (activity.attachmentPaths ?? []).filter((path) =>
        path.startsWith(`${currentUid}/`)
      );
      if (ownPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(ownPaths);
        if (storageError) {
          console.error('Unable to remove promotional program attachments:', storageError);
          setNotice(`कार्यक्रम मेटाइयो, तर संलग्न तस्वीर हटाउन सकिएन। ${storageError.message}`);
          return;
        }
      }
      setNotice('कार्यक्रम मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete promotional program:', error);
      setNotice(`कार्यक्रम मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const changeMonth = (direction: -1 | 1) => {
    const nextMonth = selectedMonth + direction;
    if (nextMonth < 1) {
      setSelectedMonth(12);
      setCalendarYear((year) => year - 1);
    } else if (nextMonth > 12) {
      setSelectedMonth(1);
      setCalendarYear((year) => year + 1);
    } else {
      setSelectedMonth(nextMonth);
    }
  };

  const uploadProgramPhoto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoActivityId || !photoFile) return;
    setPhotoSaving(true);
    setPhotoError(null);
    const activity = programs.find((program) => program.activity.id === photoActivityId)?.activity;
    if (!activity) {
      setPhotoError('तस्वीर जोड्ने कार्यक्रम भेटिएन।');
      setPhotoSaving(false);
      return;
    }
    if (
      !photoFile.type.match(/^image\/(jpeg|png)$/) ||
      photoFile.size > MAX_IMAGE_SIZE
    ) {
      setPhotoError('JPG वा PNG तस्वीरको आकार २० MB भन्दा कम हुनुपर्छ।');
      setPhotoSaving(false);
      return;
    }
    let uploadedPath = '';
    try {
      const path = `${currentUid}/${activity.id}/${crypto.randomUUID()}_${photoFile.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = path;
      const attachmentPaths = [...(activity.attachmentPaths ?? []), path];
      const updatedActivity = {
        ...activity,
        attachmentPaths,
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('activities')
        .update({ attachmentPaths, updatedAt: updatedActivity.updatedAt })
        .eq('id', activity.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('कार्यक्रममा तस्वीर जोड्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(updatedActivity);
      setPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoActivityId('');
      setPhotoNotice('कार्यक्रमको तस्वीर अपलोड गरियो।');
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove([uploadedPath]);
        if (cleanupError) {
          console.error('Unable to clean up failed promotional photo upload:', cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to upload promotional program photo:', error);
      setPhotoError(`तस्वीर अपलोड गर्न सकिएन। ${message}`);
    } finally {
      setPhotoSaving(false);
    }
  };

  const openProgramPhoto = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(path, 60);
      if (error) throw error;
      setPhotoUrls((current) => ({ ...current, [path]: data.signedUrl }));
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to open promotional program photo:', error);
      setNotice(`तस्वीर खोल्न सकिएन। ${message}`);
    }
  };

  const dateParts = parseDate(details.date);
  const participantCount = (value: string) => Math.max(0, Number(value) || 0);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">प्रवर्द्धनात्मक कार्यक्रम</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                कार्यक्रमको योजना, प्रगति र सहभागिता व्यवस्थापन
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={programs.length === 0}
              onClick={() => {
                setPhotoError(null);
                setPhotoModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              तस्वीर अपलोड
            </button>
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Plus className="h-3.5 w-3.5" />
              नयाँ कार्यक्रम
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {notice}
          </p>
        )}
        {photoNotice && (
          <p role="status" className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {photoNotice}
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { title: 'कुल कार्यक्रम', count: programs.length, icon: CalendarDays, color: 'bg-blue-50 text-blue-800' },
          { title: 'आगामी कार्यक्रम', count: upcomingPrograms.length, icon: Clock3, color: 'bg-amber-50 text-amber-800' },
          { title: 'सम्पन्न कार्यक्रम', count: completedPrograms.length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-800' },
          { title: 'सहभागी संख्या', count: totalParticipants, icon: Users, color: 'bg-cyan-50 text-cyan-800' },
        ].map(({ title, count, icon: Icon, color }) => (
          <article key={title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] text-slate-500">{title}</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{toNepaliDigits(count)}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-blue-950">कार्यक्रम तालिका</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="अघिल्लो महिना"
                onClick={() => changeMonth(-1)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="min-w-28 text-center text-sm font-bold text-slate-800">
                {NEPALI_MONTHS[selectedMonth - 1]} {toNepaliDigits(calendarYear)}
              </span>
              <button
                type="button"
                aria-label="अर्को महिना"
                onClick={() => changeMonth(1)}
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }, (_, index) => {
              const day = index + 1;
              const daily = dailyPrograms.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={`min-h-[65px] rounded-md border p-1.5 ${
                    day > 32 ? 'invisible' : 'border-slate-100 bg-slate-50/60'
                  }`}
                >
                  {day <= 32 && (
                    <>
                      <span className="text-[10px] font-semibold text-slate-600">
                        {toNepaliDigits(day)}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {daily.slice(0, 2).map(({ activity, details: record }) => (
                          <button
                            key={activity.id}
                            type="button"
                            onClick={() => setViewActivity(activity)}
                            title={record.programName}
                            className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] ${
                              record.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.status === 'ongoing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : record.status === 'cancelled'
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {record.programName}
                          </button>
                        ))}
                        {daily.length > 2 && (
                          <span className="block text-[9px] text-slate-500">
                            +{toNepaliDigits(daily.length - 2)}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-600">
            {STATUS_OPTIONS.map((status) => (
              <span key={status.value} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${statusClassName(status.value)}`} />
                {status.label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-blue-950">कार्यक्रम सूची</h3>
            <label className="relative w-full max-w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="कार्यक्रम खोज्नुहोस्"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="कार्यक्रम खोज्नुहोस्..."
                className={`${inputClassName} pl-8`}
              />
            </label>
          </div>
          <div className="mt-3 max-h-[410px] overflow-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2.5 py-2">कार्यक्रमको नाम</th>
                  <th className="px-2.5 py-2">मिति</th>
                  <th className="px-2.5 py-2">स्थान</th>
                  <th className="px-2.5 py-2">लक्षित समूह</th>
                  <th className="px-2.5 py-2">सहभागी</th>
                  <th className="px-2.5 py-2">स्थिति</th>
                  <th className="px-2.5 py-2">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePrograms.length ? (
                  visiblePrograms.map(({ activity, details: record }) => (
                    <tr key={activity.id} className="text-slate-700 hover:bg-slate-50">
                      <td className="max-w-40 px-2.5 py-2.5 font-semibold text-slate-900">
                        <span className="block truncate">{record.programName}</span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5">{formatDate(record.date)}</td>
                      <td className="max-w-32 px-2.5 py-2.5">
                        <span className="block truncate">{record.location || record.localLevel || '-'}</span>
                      </td>
                      <td className="max-w-28 px-2.5 py-2.5">
                        <span className="block truncate">{record.targetGroup || '-'}</span>
                      </td>
                      <td className="px-2.5 py-2.5">{toNepaliDigits(record.participantCount)}</td>
                      <td className="px-2.5 py-2.5">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClassName(record.status)}`}>
                          {statusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="विवरण"
                            onClick={() => setViewActivity(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="सम्पादन"
                            onClick={() => openEditForm(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="मेटाउनुहोस्"
                            disabled={deletingId === activity.id}
                            onClick={() => deleteProgram(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {programs.length ? 'खोजीसँग मिल्ने कार्यक्रम भेटिएन।' : 'हाल कुनै कार्यक्रम दर्ता छैन।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950">आगामी कार्यक्रम</h3>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
              {toNepaliDigits(upcomingPrograms.length)} कार्यक्रम
            </span>
          </div>
          <div className="space-y-2.5">
            {upcomingPrograms.length ? (
              upcomingPrograms.slice(0, 5).map(({ activity, details: record }) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => setViewActivity(activity)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-left hover:border-blue-200"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-800">{record.programName}</span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {[record.location, record.localLevel, DISTRICT_NE_MAP[record.districtEn]]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[10px] font-semibold text-blue-900">{formatDate(record.date)}</span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {toNepaliDigits(record.participantCount)} सहभागी
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="py-12 text-center text-xs text-slate-400">आगामी कार्यक्रमहरू यहाँ देखिनेछन्।</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-sm font-bold text-blue-950">सम्पन्न कार्यक्रमका झलक</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {photoPrograms.length ? (
              photoPrograms.slice(0, 4).map(({ activity, details: record }) => {
                const imagePath = (activity.attachmentPaths ?? []).find((path) =>
                  /\.(png|jpe?g)$/i.test(path)
                );
                return (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => imagePath && openProgramPhoto(imagePath)}
                    disabled={!imagePath}
                    className="flex min-h-24 items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 disabled:cursor-default"
                  >
                    {imagePath && photoUrls[imagePath] ? (
                      <img src={photoUrls[imagePath]} alt="" className="h-16 w-20 rounded object-cover" />
                    ) : (
                      <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{record.programName}</span>
                      <span className="mt-1 block text-[10px] text-slate-500">{formatDate(record.date)}</span>
                      <span className="mt-1 block text-[10px] text-emerald-700">{statusLabel(record.status)}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="col-span-full py-12 text-center text-xs text-slate-400">
                कार्यक्रमका तस्वीर अपलोड गरेपछि यहाँ देखिनेछन्।
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPhotoModalOpen(true)}
            className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            तस्वीर अपलोड गर्नुहोस् →
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-sm font-bold text-blue-950">त्रैमासिक प्रगति</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" fontSize={10} />
                <YAxis allowDecimals={false} fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="लक्ष्य" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="सम्पन्न" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <NepalChoroplethMap
            districtCounts={districtCounts}
            selectedDistrict={selectedMapDistrict}
            onSelectDistrict={setSelectedMapDistrict}
            title="जिल्लागत कार्यक्रम नक्सा"
            subtitle="आर्थिक वर्ष अनुसार कार्यक्रमको जिल्लागत वितरण"
            entityLabel="कार्यक्रम"
            entityPlural="कार्यक्रमहरू"
            emptyMessage="कुनै कार्यक्रम दर्ता भएको छैन।"
          />
        </section>
      </div>

      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="promotional-program-form-title"
              className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            >
              <header className="flex items-center justify-between bg-[#12395d] px-5 py-4 text-white">
                <h3 id="promotional-program-form-title" className="text-sm font-bold">
                  {editingActivity ? 'कार्यक्रम सम्पादन' : 'नयाँ कार्यक्रम प्रविष्टि'}
                </h3>
                <button
                  type="button"
                  aria-label="बन्द गर्नुहोस्"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <form onSubmit={saveProgram} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto p-5">
                  <Field label="कार्यक्रमको नाम" required>
                    <input
                      required
                      maxLength={240}
                      value={details.programName}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, programName: event.target.value }))
                      }
                      placeholder="कार्यक्रमको नाम लेख्नुहोस्"
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="प्रस्तावित आर्थिक वर्ष" required>
                    <select
                      required
                      value={details.plannedFiscalYear}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          plannedFiscalYear: event.target.value as FiscalYear,
                        }))
                      }
                      className={inputClassName}
                    >
                      {FISCAL_YEARS.map((year) => (
                        <option key={year.value} value={year.value}>{year.labelNe}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="मिति" required>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          required
                          aria-label="साल"
                          value={dateParts.year}
                          onChange={(event) => updateDate('year', event.target.value)}
                          className={inputClassName}
                        >
                          <option value="">साल</option>
                          {NEPALI_YEARS.map((year) => (
                            <option key={year} value={englishDigits(year)}>{year}</option>
                          ))}
                        </select>
                        <select
                          required
                          aria-label="महिना"
                          value={dateParts.month}
                          onChange={(event) =>
                            updateDate('month', event.target.value.padStart(2, '0'))
                          }
                          className={inputClassName}
                        >
                          <option value="">महिना</option>
                          {NEPALI_MONTHS.map((month, index) => (
                            <option key={month} value={String(index + 1).padStart(2, '0')}>
                              {month}
                            </option>
                          ))}
                        </select>
                        <select
                          required
                          aria-label="गते"
                          value={dateParts.day}
                          onChange={(event) =>
                            updateDate('day', event.target.value.padStart(2, '0'))
                          }
                          className={inputClassName}
                        >
                          <option value="">गते</option>
                          {Array.from({ length: 32 }, (_, index) => index + 1).map((day) => (
                            <option key={day} value={String(day).padStart(2, '0')}>
                              {toNepaliDigits(day)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    <Field label="स्थान">
                      <input
                        maxLength={160}
                        value={details.location}
                        onChange={(event) =>
                          setDetails((current) => ({ ...current, location: event.target.value }))
                        }
                        placeholder="स्थान खुलाउनुहोस्"
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="जिल्ला" required>
                      <select
                        required
                        value={details.districtEn}
                        onChange={(event) =>
                          setDetails((current) => ({ ...current, districtEn: event.target.value }))
                        }
                        className={inputClassName}
                      >
                        <option value="">जिल्ला छान्नुहोस्</option>
                        {PROVINCES_DATA.flatMap((province) => province.districtsEn)
                          .map((district) => (
                            <option key={district} value={district}>
                              {DISTRICT_NE_MAP[district] || district}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="स्थानीय तह">
                      <select
                        value={details.localLevel}
                        onChange={(event) =>
                          setDetails((current) => ({ ...current, localLevel: event.target.value }))
                        }
                        className={inputClassName}
                      >
                        <option value="">स्थानीय तह छान्नुहोस्</option>
                        {details.districtEn &&
                          getLocalLevelsForDistrict(details.districtEn).map((level) => (
                            <option key={level}>{level}</option>
                          ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="लक्षित समूह">
                      <input
                        maxLength={160}
                        value={details.targetGroup}
                        onChange={(event) =>
                          setDetails((current) => ({ ...current, targetGroup: event.target.value }))
                        }
                        placeholder="जस्तै: विद्यार्थी, सर्वसाधारण"
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="सहभागी संख्या">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={details.participantCount}
                        onChange={(event) =>
                          setDetails((current) => ({
                            ...current,
                            participantCount: participantCount(event.target.value),
                          }))
                        }
                        placeholder="जस्तै: १५०"
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                  <Field label="स्थिति" required>
                    <select
                      required
                      value={details.status}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          status: event.target.value as PromotionalProgramDetails['status'],
                        }))
                      }
                      className={inputClassName}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </Field>
                  {errorMessage && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      {errorMessage}
                    </p>
                  )}
                </div>
                <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setFormOpen(false)}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'सुरक्षित हुँदैछ...' : 'कार्यक्रम सुरक्षित गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {photoModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/60 p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="promotional-photo-title"
              className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h3 id="promotional-photo-title" className="text-sm font-bold text-slate-900">
                  कार्यक्रमको तस्वीर अपलोड
                </h3>
                <button
                  type="button"
                  aria-label="बन्द गर्नुहोस्"
                  onClick={() => setPhotoModalOpen(false)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <form onSubmit={uploadProgramPhoto} className="space-y-4 p-5">
                <Field label="कार्यक्रम" required>
                  <select
                    required
                    value={photoActivityId}
                    onChange={(event) => setPhotoActivityId(event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">कार्यक्रम छान्नुहोस्</option>
                    {programs.map(({ activity, details: record }) => (
                      <option key={activity.id} value={activity.id}>{record.programName}</option>
                    ))}
                  </select>
                </Field>
                <Field label="तस्वीर (JPG, PNG, अधिकतम २० MB)" required>
                  <input
                    required
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setPhotoFile(file);
                      setPhotoError(
                        file && file.size > MAX_IMAGE_SIZE
                          ? 'तस्वीरको आकार २० MB भन्दा कम हुनुपर्छ।'
                          : null
                      );
                    }}
                    className={inputClassName}
                  />
                </Field>
                {photoError && (
                  <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    {photoError}
                  </p>
                )}
                <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={() => setPhotoModalOpen(false)}
                    className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={photoSaving || !photoFile || photoFile.size > MAX_IMAGE_SIZE}
                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {photoSaving ? 'अपलोड हुँदैछ...' : 'तस्वीर अपलोड गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {viewActivity &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="promotional-program-detail-title"
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            >
              {(() => {
                const record = normalizedDetails(viewActivity);
                return (
                  <>
                    <header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
                      <div>
                        <h3 id="promotional-program-detail-title" className="text-sm font-bold text-slate-900">
                          कार्यक्रम विवरण
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">{record.programName}</p>
                      </div>
                      <button
                        type="button"
                        aria-label="बन्द गर्नुहोस्"
                        onClick={() => setViewActivity(null)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </header>
                    <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                      {[
                        ['प्रस्तावित आर्थिक वर्ष', `आ.व. ${toNepaliDigits(record.plannedFiscalYear)}`],
                        ['मिति', formatDate(record.date)],
                        ['स्थान', record.location],
                        ['जिल्ला', DISTRICT_NE_MAP[record.districtEn] || record.districtEn],
                        ['प्रदेश', getProvinceForDistrict(record.districtEn)],
                        ['स्थानीय तह', record.localLevel],
                        ['लक्षित समूह', record.targetGroup],
                        ['सहभागी संख्या', toNepaliDigits(record.participantCount)],
                        ['स्थिति', statusLabel(record.status)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="font-semibold text-slate-500">{label}</div>
                          <div className="mt-1 text-slate-800">{value || '-'}</div>
                        </div>
                      ))}
                    </div>
                    {(viewActivity.attachmentPaths ?? []).length > 0 && (
                      <div className="px-5 pb-5">
                        <h4 className="mb-2 text-xs font-bold text-slate-700">तस्वीरहरू</h4>
                        <div className="flex flex-wrap gap-2">
                          {(viewActivity.attachmentPaths ?? [])
                            .filter((path) => /\.(png|jpe?g)$/i.test(path))
                            .map((path) => (
                              <button
                                key={path}
                                type="button"
                                onClick={() => openProgramPhoto(path)}
                                className="rounded-md border border-slate-200 px-3 py-2 text-xs text-blue-800 hover:bg-blue-50"
                              >
                                तस्वीर हेर्नुहोस्
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
