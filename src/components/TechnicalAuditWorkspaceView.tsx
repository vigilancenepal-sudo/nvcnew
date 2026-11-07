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
  Coins,
  ShieldCheck,
  Building2,
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
import { TechnicalAuditDossierModal } from './TechnicalAuditDossierModal';
import { NepaliDatePicker } from './NepaliDatePicker';

const ATTACHMENT_BUCKET = 'activity-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILE_ACCEPT = '.doc,.docx,.pdf,.jpg,.jpeg,.png';
const MONTHS = NEPALI_MONTHS;
const YEARS = ['२०८५', '२०८४', '२०८३', '२०८२', '२०८१', '२०८०', '२०७९'];
const PROJECT_NATURES = [
  'सडक पूर्वाधार',
  'पुल निर्माण',
  'सिँचाइ आयोजना',
  'जलविद्युत आयोजना',
  'सरकारी/सार्वजनिक भवन',
  'खानेपानी तथा सरसफाइ',
  'तटबन्ध तथा नदी नियन्त्रण',
  'अन्य पूर्वाधार निर्माण',
];

const AUDIT_STAGES = [
  { value: 'during_construction', label: 'निर्माण कार्य भइरहेको अवस्था' },
  { value: 'pre_construction', label: 'निर्माण पूर्व / डिजाइन तथा खरिद' },
  { value: 'post_construction', label: 'निर्माण सम्पन्न पश्चात्' },
] as const;

const QUALITY_RATINGS = [
  { value: 'उत्कृष्ट', label: 'उत्कृष्ट (Excellent)' },
  { value: 'सन्तोषजनक', label: 'सन्तोषजनक (Satisfactory)' },
  { value: 'सुधार आवश्यक', label: 'सुधार आवश्यक (Needs Improvement)' },
  { value: 'गम्भीर त्रुटि', label: 'गम्भीर त्रुटि (Critical Non-compliance)' },
] as const;

const STATUS_OPTIONS: Array<{
  value: TechnicalAuditDetails['status'];
  label: string;
}> = [
  { value: 'chalu', label: 'चालु' },
  { value: 'pratibedan_pesh', label: 'प्रतिवेदन पेश' },
  { value: 'sampanna', label: 'सम्पन्न' },
];

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all';

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
  auditorName: '',
  auditorDesignation: 'इन्जिनियर / प्राविधिक परीक्षक',
  contractNo: '',
  contractAmount: 0,
  consultantName: '',
  auditStage: 'during_construction',
  qualityRating: 'सन्तोषजनक',
  financialRecoveryAmount: 0,
  remedialDirectives: '',
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
  hint?: string;
}

const Field: React.FC<FieldProps> = ({ label, children, required, hint }) => (
  <label className="block text-xs font-medium text-slate-700">
    <div className="flex items-center justify-between">
      <span>
        {label}
        {required && <span className="ml-1 text-red-600 font-bold">*</span>}
      </span>
      {hint && <span className="text-[10px] text-slate-400 font-normal">{hint}</span>}
    </div>
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
  contractNo: activity.technicalAuditDetails?.contractNo ?? '',
  contractAmount: activity.technicalAuditDetails?.contractAmount ?? 0,
  auditorName: activity.technicalAuditDetails?.auditorName ?? '',
  auditorDesignation: activity.technicalAuditDetails?.auditorDesignation ?? 'इन्जिनियर / प्राविधिक परीक्षक',
  consultantName: activity.technicalAuditDetails?.consultantName ?? '',
  auditStage: activity.technicalAuditDetails?.auditStage ?? 'during_construction',
  qualityRating: activity.technicalAuditDetails?.qualityRating ?? 'सन्तोषजनक',
  financialRecoveryAmount: activity.technicalAuditDetails?.financialRecoveryAmount ?? 0,
  remedialDirectives: activity.technicalAuditDetails?.remedialDirectives ?? '',
});

const englishDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६८९'.indexOf(digit)));

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

const statusBadgeClass = (status: TechnicalAuditDetails['status']) => {
  if (status === 'sampanna') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  if (status === 'pratibedan_pesh') return 'bg-blue-50 text-blue-800 border-blue-300';
  return 'bg-amber-50 text-amber-800 border-amber-300';
};

export const TechnicalAuditWorkspaceView: React.FC<TechnicalAuditWorkspaceViewProps> = ({
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
  const [dossierActivity, setDossierActivity] = useState<ActivityRecord | null>(null);
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

  const totalRecoveryAmount = useMemo(
    () =>
      audits.reduce(
        (acc, item) => acc + (normalizeDetails(item).financialRecoveryAmount ?? 0),
        0
      ),
    [audits]
  );

  const shownAudits = audits.filter((activity) => {
    const record = normalizeDetails(activity);
    if (statusFilter && record.status !== statusFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    return [
      record.projectName,
      record.relatedAgency,
      record.projectNature,
      record.contractNo ?? '',
      record.auditorName ?? '',
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
    return (
      <Field key={field} label={label} required={required}>
        <NepaliDatePicker
          required={required}
          value={details[field]}
          onChange={(date) => setDetails((c) => ({ ...c, [field]: date }))}
        />
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
      contractNo: details.contractNo?.trim() || '',
      auditorName: details.auditorName?.trim() || '',
      consultantName: details.consultantName?.trim() || '',
      remedialDirectives: details.remedialDirectives?.trim() || '',
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
        await supabase.storage.from(ATTACHMENT_BUCKET).remove(uploadedPaths);
      }
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`प्राविधिक परीक्षण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAudit = async (activity: ActivityRecord) => {
    const confirmation = window.confirm(
      `के तपाईं "${normalizeDetails(activity).projectName || 'यो परीक्षण'}" हटाउन निश्चित हुनुहुन्छ?`
    );
    if (!confirmation) return;

    setDeletingId(activity.id);
    try {
      if ((activity.attachmentPaths ?? []).length > 0) {
        await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(activity.attachmentPaths ?? []);
      }
      const { error } = await supabase.from('activities').delete().eq('id', activity.id);
      if (error) throw error;
      onActivityDeleted(activity.id);
      setNotice('प्राविधिक परीक्षण सफलतापूर्वक हटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNotice(`प्राविधिक परीक्षण हटाउन सकिएन। ${message}`);
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
      setNotice(`संलग्न फाइल खोल्न सकिएन। ${message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Glass Panel Card */}
      <section className="glass-panel rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header Strip */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 bg-white/70">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
              <ClipboardCheck className="h-6 w-6 text-blue-200" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  प्राविधिक परीक्षण महाशाखा (Technical Audit Workspace)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  आ.व. {toNepaliDigits(selectedFiscalYear)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                सार्वजनिक पूर्वाधार आयोजनाहरूको स्थलगत प्राविधिक गुणस्तर परीक्षण, NCR र वित्तीय असुली अनुगमन
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <span>स्थिति:</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">सबै स्थितिहरू</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>

            <label className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="प्राविधिक परीक्षण खोज्नुहोस्"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="आयोजना, निकाय वा ठेक्का नं..."
                className={`${inputClassName} pl-9 py-2 rounded-xl`}
              />
            </label>

            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B49] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              नयाँ प्राविधिक परीक्षण
            </button>
          </div>
        </header>

        {notice && (
          <div role="status" className="mx-5 mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-900">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-blue-700 hover:text-blue-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 6 High-Impact Glass Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: 'कुल परीक्षण',
              value: audits.length,
              icon: ClipboardCheck,
              accent: 'border-blue-200 text-blue-900 bg-blue-50/70',
              glow: 'hover:border-blue-400',
            },
            {
              label: 'यस महिनाका',
              value: thisMonthCount,
              icon: CalendarDays,
              accent: 'border-cyan-200 text-cyan-900 bg-cyan-50/70',
              glow: 'hover:border-cyan-400',
            },
            {
              label: 'चालु परीक्षण',
              value: inProgressCount,
              icon: Clock3,
              accent: 'border-amber-200 text-amber-900 bg-amber-50/70',
              glow: 'hover:border-amber-400',
            },
            {
              label: 'सम्पन्न परीक्षण',
              value: completedCount,
              icon: CheckCircle2,
              accent: 'border-emerald-200 text-emerald-900 bg-emerald-50/70',
              glow: 'hover:border-emerald-400',
            },
            {
              label: 'NCR कैफियत सहित',
              value: ncrCount,
              icon: AlertTriangle,
              accent: 'border-orange-200 text-orange-900 bg-orange-50/70',
              glow: 'hover:border-orange-400',
            },
            {
              label: 'प्रतिवेदन पेश',
              value: reportSubmittedCount,
              icon: FileText,
              accent: 'border-indigo-200 text-indigo-900 bg-indigo-50/70',
              glow: 'hover:border-indigo-400',
            },
          ].map(({ label, value, icon: Icon, accent, glow }) => (
            <article
              key={label}
              className={`stat-tile-glow flex items-center gap-3 rounded-xl border p-3.5 bg-white/80 backdrop-blur-xs transition-all ${accent} ${glow}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {toNepaliDigits(value)}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Financial Recovery Highlight Strip */}
        {totalRecoveryAmount > 0 && (
          <div className="mx-5 mb-4 p-3.5 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-red-900">
              <Coins className="h-4 w-4 text-red-600" />
              <span className="font-semibold">
                यस आ.व. मा प्राविधिक परीक्षणबाट सिफारिस कुल वित्तीय असुली/कम भुक्तानी रकम:
              </span>
            </div>
            <span className="font-extrabold text-sm text-red-700 font-mono bg-white px-3 py-1 rounded-lg border border-red-200 shadow-2xs">
              रु. {toNepaliDigits(totalRecoveryAmount.toLocaleString('en-IN'))}/-
            </span>
          </div>
        )}

        {/* Audits Table */}
        <div className="overflow-x-auto px-4 pb-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/90 font-bold text-slate-700 border-b border-slate-200">
                  <th className="px-3.5 py-3">क्र.सं.</th>
                  <th className="px-3.5 py-3">आयोजना एवं सम्झौता विवरण</th>
                  <th className="px-3.5 py-3">सम्बन्धित निकाय</th>
                  <th className="px-3.5 py-3">क्षेत्र / प्रकृति</th>
                  <th className="px-3.5 py-3">परीक्षण मिति</th>
                  <th className="px-3.5 py-3">गुणस्तर स्तर</th>
                  <th className="px-3.5 py-3">अपरिपालनाहरू (NCR)</th>
                  <th className="px-3.5 py-3">असुली सिफारिस (रु.)</th>
                  <th className="px-3.5 py-3 text-center">डिजिटल मिसिल</th>
                  <th className="px-3.5 py-3 text-center">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shownAudits.length ? (
                  shownAudits.map((activity, index) => {
                    const record = normalizeDetails(activity);
                    const hasRecovery = (record.financialRecoveryAmount ?? 0) > 0;
                    return (
                      <tr
                        key={activity.id}
                        className="align-middle text-slate-700 hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="px-3.5 py-3.5 font-bold text-slate-500 font-mono">
                          {toNepaliDigits(index + 1)}
                        </td>
                        <td className="max-w-64 px-3.5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDossierActivity(activity)}
                            className="font-bold text-slate-900 text-left hover:text-blue-800 hover:underline block leading-snug"
                          >
                            {record.projectName}
                          </button>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBadgeClass(
                                record.status
                              )}`}
                            >
                              {statusLabel(record.status)}
                            </span>
                            {record.contractNo && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                ठेक्का: {toNepaliDigits(record.contractNo)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-44 px-3.5 py-3.5 font-medium text-slate-700">
                          {record.relatedAgency || '-'}
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {record.projectNature || 'सडक/पुल'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 font-medium">
                          {formatDate(record.auditDate)}
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              record.qualityRating === 'उत्कृष्ट'
                                ? 'bg-emerald-50 text-emerald-800'
                                : record.qualityRating === 'गम्भीर त्रुटि'
                                ? 'bg-red-50 text-red-800'
                                : record.qualityRating === 'सुधार आवश्यक'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {record.qualityRating || 'सन्तोषजनक'}
                          </span>
                        </td>
                        <td className="max-w-48 px-3.5 py-3.5">
                          {record.nonComplianceDetails ? (
                            <span className="line-clamp-2 text-slate-800 font-normal">
                              {record.nonComplianceDetails}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">कुनै गम्भीर NCR छैन</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5">
                          {hasRecovery ? (
                            <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              रु. {toNepaliDigits(record.financialRecoveryAmount!.toLocaleString('en-IN'))}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setDossierActivity(activity)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] transition-colors border border-blue-200 shadow-2xs"
                          >
                            <FileText className="h-3 w-3" />
                            मिसिल हेर्नुहोस्
                          </button>
                        </td>
                        <td className="px-3.5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="सम्पादन गर्नुहोस्"
                              onClick={() => openEditForm(activity)}
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="मेटाउनुहोस्"
                              disabled={deletingId === activity.id}
                              onClick={() => deleteAudit(activity)}
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
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
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      {audits.length
                        ? 'फिल्टर वा खोज्नुभएको विवरणसँग मिल्ने प्राविधिक परीक्षण फेला परेन।'
                        : 'यस आर्थिक वर्षमा हालसम्म कुनै प्राविधिक परीक्षण दर्ता गरिएको छैन।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="border-t border-slate-200/80 px-5 py-3.5 bg-slate-50/60 text-center text-xs font-medium text-slate-500">
          नेपाल सरकार · राष्ट्रिय सतर्कता केन्द्र | प्राविधिक परीक्षण शाखा · आ.व. {toNepaliDigits(selectedFiscalYear)} · कुल {toNepaliDigits(audits.length)} अभिलेखहरू
        </footer>
      </section>

      {/* Technical Audit Dossier Modal */}
      {dossierActivity && (
        <TechnicalAuditDossierModal
          activity={dossierActivity}
          onClose={() => setDossierActivity(null)}
          onEdit={(act) => openEditForm(act)}
          onOpenAttachment={(path) => openAttachment(path)}
        />
      )}

      {/* New/Edit Modal Form */}
      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="technical-audit-form-title"
              className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
            >
              <header className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/30 text-blue-300 font-bold text-xs">
                    NVC
                  </span>
                  <h3 id="technical-audit-form-title" className="text-sm font-bold">
                    {editingActivity
                      ? 'प्राविधिक परीक्षण अभिलेख सम्पादन'
                      : 'नयाँ प्राविधिक परीक्षण प्रविष्टि'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="बन्द गर्नुहोस्"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg p-1.5 text-white/75 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <form onSubmit={saveAudit} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto p-6 text-xs">
                  {/* Project Basic Info */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-blue-800" />
                      आयोजना तथा सम्झौताको विवरण
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="आयोजनाको नाम" required>
                        <input
                          required
                          value={details.projectName}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, projectName: e.target.value }))
                          }
                          placeholder="उदा: नागढुङ्गा सुरुङमार्ग निर्माण आयोजना"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="सम्बन्धित निकाय / मन्त्रालय" required>
                        <input
                          required
                          value={details.relatedAgency}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, relatedAgency: e.target.value }))
                          }
                          placeholder="उदा: सडक विभाग / गुणस्तर, अनुसन्धान तथा विकास केन्द्र"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="आयोजनाको प्रकृति" required>
                        <select
                          required
                          value={details.projectNature}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, projectNature: e.target.value }))
                          }
                          className={inputClassName}
                        >
                          <option value="">छान्नुहोस्</option>
                          {PROJECT_NATURES.map((nature) => (
                            <option key={nature} value={nature}>
                              {nature}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="ठेक्का / सम्झौता नम्बर">
                        <input
                          value={details.contractNo ?? ''}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, contractNo: e.target.value }))
                          }
                          placeholder="उदा: NVC/W/2083-01"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="स्वीकृत सम्झौता रकम (रु.)">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={details.contractAmount ?? 0}
                          onChange={(e) =>
                            setDetails((c) => ({
                              ...c,
                              contractAmount: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="०.००"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="परामर्शदाताको नाम">
                        <input
                          value={details.consultantName ?? ''}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, consultantName: e.target.value }))
                          }
                          placeholder="उदा: बी.सी.सी. इन्जिनियरिङ कन्सल्टेन्ट्स"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="परीक्षण चरण">
                        <select
                          value={details.auditStage ?? 'during_construction'}
                          onChange={(e) =>
                            setDetails((c) => ({
                              ...c,
                              auditStage: e.target.value as TechnicalAuditDetails['auditStage'],
                            }))
                          }
                          className={inputClassName}
                        >
                          {AUDIT_STAGES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Audit Team, Status & Dates */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-800" />
                      परीक्षण टोली, स्थिति तथा कार्यतालिका
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="प्राविधिक परीक्षकको नाम">
                        <input
                          value={details.auditorName ?? ''}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, auditorName: e.target.value }))
                          }
                          placeholder="उदा: ई. प्रकाशचन्द्र ज्ञवाली"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="परीक्षकको पद">
                        <input
                          value={details.auditorDesignation ?? ''}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, auditorDesignation: e.target.value }))
                          }
                          placeholder="उदा: सि.डि.ई. / प्राविधिक परीक्षक"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {renderDateField('auditDate', 'स्थलगत परीक्षण मिति', true)}
                      <Field label="परीक्षण स्थिति">
                        <select
                          value={details.status}
                          onChange={(e) =>
                            setDetails((c) => ({
                              ...c,
                              status: e.target.value as TechnicalAuditDetails['status'],
                            }))
                          }
                          className={inputClassName}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {renderDateField('reportDate', 'डिस्पोजल पत्रको मिति')}
                      {renderDateField('reportInformationDate', 'डिस्पोजल जानकारी मिति')}
                    </div>
                  </div>

                  {/* Non-compliance & Quality Rating */}
                  <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        अपरिपालनाहरू (NCR) तथा गुणस्तर स्तरीकरण
                      </h4>
                      <div className="w-56">
                        <select
                          value={details.qualityRating ?? 'सन्तोषजनक'}
                          onChange={(e) =>
                            setDetails((c) => ({
                              ...c,
                              qualityRating: e.target.value as TechnicalAuditDetails['qualityRating'],
                            }))
                          }
                          className={inputClassName}
                        >
                          {QUALITY_RATINGS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Field
                      label="अपरिपालना विवरण (Non-Compliance Report - NCR)"
                      hint="डिजाइन, सामग्री वा मापदण्ड विपरित भएका कैफियतहरू"
                    >
                      <textarea
                        rows={3}
                        value={details.nonComplianceDetails}
                        onChange={(e) =>
                          setDetails((c) => ({
                            ...c,
                            nonComplianceDetails: e.target.value,
                          }))
                        }
                        placeholder="विस्तृत NCR कैफियत लेख्नुहोस्..."
                        className={`${inputClassName} resize-y`}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field
                        label="असुली वा कम भुक्तानी गर्नुपर्ने रकम (रु.)"
                        hint="मापदण्ड विपरित पाइएको कार्यको मूल्यांकन रकम"
                      >
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={details.financialRecoveryAmount ?? 0}
                          onChange={(e) =>
                            setDetails((c) => ({
                              ...c,
                              financialRecoveryAmount: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="०.००"
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="सुधारात्मक निर्देशनहरू (Remedial Directives)">
                        <input
                          value={details.remedialDirectives ?? ''}
                          onChange={(e) =>
                            setDetails((c) => ({ ...c, remedialDirectives: e.target.value }))
                          }
                          placeholder="उदा: म्याद थप रद्द, परीक्षण पुनः गर्न निर्देशन"
                          className={inputClassName}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Remarks & Files */}
                  <Field label="समग्र कैफियत / अवलोकन निष्कर्ष">
                    <textarea
                      rows={2}
                      value={details.remarks}
                      onChange={(e) =>
                        setDetails((c) => ({ ...c, remarks: e.target.value }))
                      }
                      placeholder="केन्द्रको अन्तिम निर्णय वा अन्य विवरण..."
                      className={`${inputClassName} resize-y`}
                    />
                  </Field>

                  <Field label="फाइल तथा प्राविधिक प्रतिवेदन संलग्न गर्नुहोस् (Word, PDF, JPEG)">
                    <input
                      type="file"
                      multiple
                      accept={FILE_ACCEPT}
                      onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                      className={inputClassName}
                    />
                    <span className="mt-1 block text-[10px] text-slate-500">
                      doc, docx, pdf, jpg, jpeg, png · प्रति फाइल अधिकतम २० MB
                    </span>
                  </Field>

                  {errorMessage && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                    >
                      {errorMessage}
                    </p>
                  )}
                </div>

                <footer className="flex justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setFormOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#002B49] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs disabled:opacity-60"
                  >
                    {saving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
