import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  DISTRICT_NE_MAP,
  MAHASHAKHAS,
  NEPALI_MONTHS,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import { ActivityRecord, FiscalYear, TechnicalAuditDetails } from '../types/nvc';

const ATTACHMENT_BUCKET = 'activity-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILE_ACCEPT = '.doc,.docx,.pdf,.jpg,.jpeg,.png';
const MONTHS = NEPALI_MONTHS;
const YEARS = ['२०८५', '२०८४', '२०८३', '२०८२', '२०८१', '२०८०', '२०७९'];
const PROJECT_NATURES = [
  'सिँचाइ',
  'विद्युत',
  'सडक',
  'भवन',
  'खानेपानी',
  'पुल',
  'अन्य',
];
const STATUS_OPTIONS: Array<{
  value: TechnicalAuditDetails['status'];
  label: string;
}> = [
  { value: 'chalu', label: 'चालु' },
  { value: 'sampanna', label: 'सम्पन्न' },
  { value: 'pratibedan_pesh', label: 'प्रतिवेदन पेश' },
];
const inputClassName =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

const EMPTY_DETAILS: TechnicalAuditDetails = {
  projectName: '',
  relatedAgency: '',
  projectNature: '',
  auditDate: '',
  status: 'chalu',
  nonComplianceDetails: '',
  reportDate: '',
  reportInformationDate: '',
  remarks: '',
};

interface TechnicalAuditWorkspaceViewProps {
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
  <label className="block text-xs font-medium text-slate-700">
    {label}
    {required && <span className="ml-1 text-red-600">*</span>}
    <span className="mt-1.5 block">{children}</span>
  </label>
);

const normalizeDetails = (activity: ActivityRecord): TechnicalAuditDetails => ({
  ...EMPTY_DETAILS,
  ...activity.technicalAuditDetails,
  projectName: activity.technicalAuditDetails?.projectName ?? activity.title ?? '',
  relatedAgency:
    activity.technicalAuditDetails?.relatedAgency ??
    activity.relatedAgency ??
    activity.entityName ??
    '',
  auditDate:
    activity.technicalAuditDetails?.auditDate ??
    activity.investigationDate ??
    activity.nepaliDate ??
    '',
  nonComplianceDetails:
    activity.technicalAuditDetails?.nonComplianceDetails ??
    activity.reportSummary ??
    activity.complaintDetails ??
    '',
  remarks:
    activity.technicalAuditDetails?.remarks ??
    activity.reportSummary ??
    '',
});

const englishDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
const dateParts = (value: string) => {
  const [year = '', month = '', day = ''] = englishDigits(value).split('-');
  return { year, month, day };
};
const formatDate = (date: string) => {
  if (!date) return '-';
  const { year, month, day } = dateParts(date);
  const monthName = MONTHS[Number(month) - 1];
  return monthName
    ? `${toNepaliDigits(year)} ${monthName} ${toNepaliDigits(Number(day))}`
    : toNepaliDigits(date);
};
const statusLabel = (status: TechnicalAuditDetails['status']) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'चालु';
const statusClassName = (status: TechnicalAuditDetails['status']) => {
  if (status === 'sampanna') return 'bg-emerald-50 text-emerald-700';
  if (status === 'pratibedan_pesh') return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-800';
};

export const TechnicalAuditWorkspaceView: React.FC<
  TechnicalAuditWorkspaceViewProps
> = ({
  activities,
  currentUid,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  onActivitySaved,
  onActivityDeleted,
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
  const [viewActivity, setViewActivity] = useState<ActivityRecord | null>(null);
  const [details, setDetails] = useState<TechnicalAuditDetails>(EMPTY_DETAILS);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const audits = useMemo(
    () =>
      activities
        .filter(
          (activity) =>
            activity.activityType === 'prabidhik_parikshan' &&
            activity.fiscalYear === selectedFiscalYear
        )
        .sort((a, b) =>
          normalizeDetails(b).auditDate.localeCompare(normalizeDetails(a).auditDate)
        ),
    [activities, selectedFiscalYear]
  );
  const thisMonthCount = audits.filter(
    (activity) => activity.monthIndex === CURRENT_NEPALI_MONTH_INDEX
  ).length;
  const inProgressCount = audits.filter(
    (activity) => normalizeDetails(activity).status === 'chalu'
  ).length;
  const completedCount = audits.filter(
    (activity) => normalizeDetails(activity).status === 'sampanna'
  ).length;
  const reportSubmittedCount = audits.filter(
    (activity) => normalizeDetails(activity).status === 'pratibedan_pesh'
  ).length;
  const ncrCount = audits.filter(
    (activity) => normalizeDetails(activity).nonComplianceDetails.trim()
  ).length;

  const shownAudits = audits.filter((activity) => {
    const record = normalizeDetails(activity);
    if (statusFilter && record.status !== statusFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    return [
      record.projectName,
      record.relatedAgency,
      record.projectNature,
      record.nonComplianceDetails,
      record.remarks,
      DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn,
    ].some((value) => value.toLocaleLowerCase().includes(query));
  });

  const openNewForm = () => {
    setEditingActivity(null);
    setDetails(EMPTY_DETAILS);
    setFiles([]);
    setErrorMessage(null);
    setFormOpen(true);
  };
  const openEditForm = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setDetails(normalizeDetails(activity));
    setFiles([]);
    setErrorMessage(null);
    setFormOpen(true);
  };

  const updateDate = (
    field: 'auditDate' | 'reportDate' | 'reportInformationDate',
    part: 'year' | 'month' | 'day',
    value: string
  ) => {
    const current = dateParts(details[field]);
    const next = { ...current, [part]: value };
    setDetails((existing) => ({
      ...existing,
      [field]: [next.year, next.month, next.day].some(Boolean)
        ? `${next.year}-${next.month}-${next.day}`
        : '',
    }));
  };
  const renderDateField = (
    field: 'auditDate' | 'reportDate' | 'reportInformationDate',
    label: string,
    required = false
  ) => {
    const parts = dateParts(details[field]);
    return (
      <Field key={field} label={label} required={required}>
        <div className="grid grid-cols-3 gap-1.5">
          <select
            required={required}
            aria-label={`${label} साल`}
            value={parts.year}
            onChange={(event) =>
              updateDate(field, 'year', englishDigits(event.target.value))
            }
            className={inputClassName}
          >
            <option value="">वर्ष</option>
            {YEARS.map((year) => (
              <option key={year} value={englishDigits(year)}>{year}</option>
            ))}
          </select>
          <select
            required={required}
            aria-label={`${label} महिना`}
            value={parts.month}
            onChange={(event) =>
              updateDate(field, 'month', event.target.value.padStart(2, '0'))
            }
            className={inputClassName}
          >
            <option value="">महिना</option>
            {MONTHS.map((month, index) => (
              <option key={month} value={String(index + 1).padStart(2, '0')}>
                {month}
              </option>
            ))}
          </select>
          <select
            required={required}
            aria-label={`${label} गते`}
            value={parts.day}
            onChange={(event) =>
              updateDate(field, 'day', event.target.value.padStart(2, '0'))
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
    );
  };

  const saveAudit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalidFile = files.find((file) => file.size > MAX_FILE_SIZE);
    if (invalidFile) {
      setErrorMessage(`${invalidFile.name}: फाइलको आकार २० MB भन्दा कम हुनुपर्छ।`);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    const recordId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    const mahashakhaId =
      MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ?? 'maha_tech';
    const shakhaId =
      SHAKHAS.find(
        (item) =>
          item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
      )?.id ??
      SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
      'shakha_tech_audit';
    const savedDetails: TechnicalAuditDetails = {
      ...details,
      projectName: details.projectName.trim(),
      relatedAgency: details.relatedAgency.trim(),
      nonComplianceDetails: details.nonComplianceDetails.trim(),
      remarks: details.remarks.trim(),
    };
    const date = savedDetails.auditDate || '';
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const path = `${currentUid}/${recordId}/${crypto.randomUUID()}_${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
        const { error } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
      }

      const savedRecord: ActivityRecord = {
        ...(editingActivity ?? {}),
        id: recordId,
        refNo: editingActivity?.refNo ?? recordId,
        activityType: 'prabidhik_parikshan',
        title: savedDetails.projectName,
        entityName: savedDetails.relatedAgency,
        districtEn: editingActivity?.districtEn ?? '',
        fiscalYear: editingActivity?.fiscalYear ?? selectedFiscalYear,
        monthIndex: Number(dateParts(date).month) || CURRENT_NEPALI_MONTH_INDEX,
        nepaliDate: date,
        nonComplianceCount: savedDetails.nonComplianceDetails ? 1 : 0,
        directiveCount: savedDetails.remarks ? 1 : 0,
        status: savedDetails.status,
        mahashakhaId,
        shakhaId,
        createdByUid: editingActivity?.createdByUid ?? currentUid,
        relatedAgency: savedDetails.relatedAgency,
        investigationDate: savedDetails.auditDate,
        reportDate: savedDetails.reportDate,
        reportSummary: savedDetails.remarks,
        attachmentPaths: [...(editingActivity?.attachmentPaths ?? []), ...uploadedPaths],
        technicalAuditDetails: savedDetails,
        createdAt: editingActivity?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

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
      if (!data) throw new Error('प्राविधिक परीक्षण सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(editingActivity ? 'प्राविधिक परीक्षण अद्यावधिक गरियो।' : 'नयाँ प्राविधिक परीक्षण सुरक्षित गरियो।');
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          console.error('Unable to remove partially uploaded technical audit files:', cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save technical audit:', error);
      setErrorMessage(`प्राविधिक परीक्षण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAudit = async (activity: ActivityRecord) => {
    if (!window.confirm('यो प्राविधिक परीक्षण अभिलेख मेटाउने?')) return;
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
      if (!data) throw new Error('प्राविधिक परीक्षण मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);
      const ownPaths = (activity.attachmentPaths ?? []).filter((path) =>
        path.startsWith(`${currentUid}/`)
      );
      if (ownPaths.length) {
        const { error: storageError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(ownPaths);
        if (storageError) {
          console.error('Unable to remove technical audit attachments:', storageError);
          setNotice(`अभिलेख मेटाइयो, तर संलग्न फाइल हटाउन सकिएन। ${storageError.message}`);
          return;
        }
      }
      setNotice('प्राविधिक परीक्षण मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete technical audit:', error);
      setNotice(`प्राविधिक परीक्षण मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openAttachment = async (path: string, download = false) => {
    try {
      const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(path, 60, { download });
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to access technical audit attachment:', error);
      setNotice(`संलग्न फाइल खोल्न सकिएन। ${message}`);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">प्राविधिक परीक्षण</h2>
              <p className="mt-0.5 text-xs text-slate-500">प्राविधिक परीक्षणको विवरण तथा अनुगमन</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600">
              स्थिति:
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="ml-2 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700"
              >
                <option value="">सबै</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="प्राविधिक परीक्षण खोज्नुहोस्"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="खोज्नुहोस्..."
                className={`${inputClassName} pl-8`}
              />
            </label>
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Plus className="h-3.5 w-3.5" />
              नयाँ प्राविधिक परीक्षण
            </button>
          </div>
        </header>

        {notice && (
          <p role="status" className="mx-4 mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {notice}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'कूल परीक्षण', value: audits.length, icon: ClipboardCheck, color: 'text-blue-800 bg-blue-50' },
            { label: 'यस महिनाका', value: thisMonthCount, icon: CalendarDays, color: 'text-cyan-800 bg-cyan-50' },
            { label: 'चालु परीक्षण', value: inProgressCount, icon: Clock3, color: 'text-amber-800 bg-amber-50' },
            { label: 'सम्पन्न परीक्षण', value: completedCount, icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-50' },
            { label: 'NCR उल्लेख', value: ncrCount, icon: AlertTriangle, color: 'text-orange-800 bg-orange-50' },
            { label: 'प्रतिवेदन पेश', value: reportSubmittedCount, icon: FileText, color: 'text-indigo-800 bg-indigo-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="flex min-h-[78px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{toNepaliDigits(value)}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto px-3 pb-3">
          <h3 className="px-2 py-2 text-sm font-bold text-blue-950">प्राविधिक परीक्षण सूची</h3>
          <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 font-semibold text-slate-600">
                <th className="px-2.5 py-2.5">क्र.सं.</th>
                <th className="px-2.5 py-2.5">आयोजनाको नाम</th>
                <th className="px-2.5 py-2.5">सम्बन्धित निकाय</th>
                <th className="px-2.5 py-2.5">आयोजनाको प्रकृति</th>
                <th className="px-2.5 py-2.5">परीक्षण मिति</th>
                <th className="px-2.5 py-2.5">अपरिपालनाहरू (NCR)</th>
                <th className="px-2.5 py-2.5">डिस्पोजल पत्रको मिति</th>
                <th className="px-2.5 py-2.5">डिस्पोजल जानकारी मिति</th>
                <th className="px-2.5 py-2.5">कैफियत</th>
                <th className="px-2.5 py-2.5">फाइल</th>
                <th className="px-2.5 py-2.5">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shownAudits.length ? (
                shownAudits.map((activity, index) => {
                  const record = normalizeDetails(activity);
                  return (
                    <tr key={activity.id} className="align-top text-slate-700 hover:bg-slate-50/70">
                      <td className="px-2.5 py-3">{toNepaliDigits(index + 1)}</td>
                      <td className="max-w-40 px-2.5 py-3">
                        <div className="font-semibold text-slate-900">{record.projectName}</div>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClassName(record.status)}`}>
                          {statusLabel(record.status)}
                        </span>
                      </td>
                      <td className="max-w-36 px-2.5 py-3">{record.relatedAgency || '-'}</td>
                      <td className="px-2.5 py-3">{record.projectNature || '-'}</td>
                      <td className="whitespace-nowrap px-2.5 py-3">{formatDate(record.auditDate)}</td>
                      <td className="max-w-52 whitespace-pre-wrap px-2.5 py-3">{record.nonComplianceDetails || '-'}</td>
                      <td className="whitespace-nowrap px-2.5 py-3">{formatDate(record.reportDate)}</td>
                      <td className="whitespace-nowrap px-2.5 py-3">{formatDate(record.reportInformationDate)}</td>
                      <td className="max-w-40 px-2.5 py-3">{record.remarks || '-'}</td>
                      <td className="px-2.5 py-3">
                        {(activity.attachmentPaths ?? []).length ? (
                          <div className="flex flex-col gap-1">
                            {(activity.attachmentPaths ?? []).map((path) => (
                              <button key={path} type="button" onClick={() => openAttachment(path)} className="text-blue-700 hover:underline">
                                हेर्नुहोस्
                              </button>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex flex-col items-center gap-1">
                          <button type="button" title="विवरण हेर्नुहोस्" onClick={() => setViewActivity(activity)} className="rounded p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-800">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="सम्पादन" onClick={() => openEditForm(activity)} className="rounded p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-800">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" title="मेटाउनुहोस्" disabled={deletingId === activity.id} onClick={() => deleteAudit(activity)} className="rounded p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    {audits.length ? 'फिल्टर वा खोजीसँग मिल्ने परीक्षण भेटिएन।' : 'हाल कुनै प्राविधिक परीक्षण दर्ता छैन।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-500">
          आर्थिक वर्ष {toNepaliDigits(selectedFiscalYear)} · कुल रेकर्ड {toNepaliDigits(audits.length)}
        </footer>
      </section>

      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div role="dialog" aria-modal="true" aria-labelledby="technical-audit-form-title" className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                <h3 id="technical-audit-form-title" className="text-sm font-bold">
                  {editingActivity ? 'प्राविधिक परीक्षण सम्पादन' : 'नयाँ प्राविधिक परीक्षण थप्नुहोस्'}
                </h3>
                <button type="button" aria-label="बन्द गर्नुहोस्" disabled={saving} onClick={() => setFormOpen(false)} className="rounded p-1 text-white/75 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <form onSubmit={saveAudit} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 overflow-y-auto p-4">
                  <Field label="आयोजनाको नाम">
                    <input required value={details.projectName} onChange={(event) => setDetails((current) => ({ ...current, projectName: event.target.value }))} placeholder="आयोजनाको नाम" className={inputClassName} />
                  </Field>
                  <Field label="सम्बन्धित निकाय">
                    <input required value={details.relatedAgency} onChange={(event) => setDetails((current) => ({ ...current, relatedAgency: event.target.value }))} placeholder="सम्बन्धित निकायको नाम" className={inputClassName} />
                  </Field>
                  <Field label="आयोजनाको प्रकृति">
                    <select required value={details.projectNature} onChange={(event) => setDetails((current) => ({ ...current, projectNature: event.target.value }))} className={inputClassName}>
                      <option value="">छान्नुहोस्</option>
                      {PROJECT_NATURES.map((nature) => <option key={nature}>{nature}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {renderDateField('auditDate', 'परीक्षण मिति', true)}
                    <Field label="स्थिति">
                      <select value={details.status} onChange={(event) => setDetails((current) => ({ ...current, status: event.target.value as TechnicalAuditDetails['status'] }))} className={inputClassName}>
                        {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="अपरिपालनाहरू (NCR)">
                    <textarea rows={3} value={details.nonComplianceDetails} onChange={(event) => setDetails((current) => ({ ...current, nonComplianceDetails: event.target.value }))} placeholder="NCR हरू लेख्नुहोस्..." className={`${inputClassName} resize-y`} />
                  </Field>
                  <div className="flex justify-start">
                    <button type="button" onClick={() => setDetails((current) => ({ ...current, nonComplianceDetails: current.nonComplianceDetails ? `${current.nonComplianceDetails}\n` : '' }))} className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100">
                      NCR थप्नुहोस्
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {renderDateField('reportDate', 'डिस्पोजल पत्रको मिति')}
                    {renderDateField('reportInformationDate', 'डिस्पोजल जानकारी मिति')}
                  </div>
                  <Field label="कैफियत">
                    <textarea rows={3} value={details.remarks} onChange={(event) => setDetails((current) => ({ ...current, remarks: event.target.value }))} placeholder="कैफियत लेख्नुहोस्..." className={`${inputClassName} resize-y`} />
                  </Field>
                  <Field label="फाइल संलग्न गर्नुहोस् (Word, PDF, JPEG)">
                    <input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className={inputClassName} />
                    <span className="mt-1 block text-[10px] font-normal text-slate-500">doc, docx, pdf, jpg, jpeg, png · प्रति फाइल अधिकतम २० MB</span>
                  </Field>
                  {editingActivity && (editingActivity.attachmentPaths ?? []).length > 0 && (
                    <p className="text-[10px] text-slate-500">पहिलेका संलग्न फाइलहरू सुरक्षित रहनेछन्।</p>
                  )}
                  {errorMessage && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{errorMessage}</p>
                  )}
                </div>
                <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">रद्द गर्नुहोस्</button>
                  <button type="submit" disabled={saving} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}</button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {viewActivity &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
            <div role="dialog" aria-modal="true" aria-labelledby="technical-audit-detail-title" className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
              {(() => {
                const record = normalizeDetails(viewActivity);
                return (
                  <>
                    <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                      <h3 id="technical-audit-detail-title" className="text-sm font-bold">प्राविधिक परीक्षण विवरण</h3>
                      <button type="button" aria-label="बन्द गर्नुहोस्" onClick={() => setViewActivity(null)} className="rounded p-1 text-white/75 hover:bg-white/10"><X className="h-4 w-4" /></button>
                    </header>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                      {[
                        ['आयोजनाको नाम', record.projectName],
                        ['सम्बन्धित निकाय', record.relatedAgency],
                        ['आयोजनाको प्रकृति', record.projectNature],
                        ['परीक्षण मिति', formatDate(record.auditDate)],
                        ['स्थिति', statusLabel(record.status)],
                        ['डिस्पोजल पत्रको मिति', formatDate(record.reportDate)],
                        ['डिस्पोजल जानकारी मिति', formatDate(record.reportInformationDate)],
                        ['अपरिपालनाहरू (NCR)', record.nonComplianceDetails],
                        ['कैफियत', record.remarks],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="font-semibold text-slate-500">{label}</div>
                          <div className="mt-1 whitespace-pre-wrap text-slate-800">{value || '-'}</div>
                        </div>
                      ))}
                      {(viewActivity.attachmentPaths ?? []).length > 0 && (
                        <div className="sm:col-span-2">
                          <h4 className="mb-2 text-xs font-bold text-slate-700">संलग्न फाइलहरू</h4>
                          <div className="flex flex-wrap gap-2">
                            {(viewActivity.attachmentPaths ?? []).map((path) => (
                              <button key={path} type="button" onClick={() => openAttachment(path)} className="rounded border border-slate-200 px-3 py-2 text-xs text-blue-800 hover:bg-blue-50">{path.split('/').pop()}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
