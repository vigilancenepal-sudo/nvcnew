import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Download,
  Eye,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  CURRENT_NEPALI_MONTH_INDEX,
  FISCAL_YEARS,
  MAHASHAKHAS,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  ActivityRecord,
  FiscalYear,
  MahashakhaId,
  ShakhaId,
} from '../types/nvc';

const ATTACHMENT_BUCKET = 'activity-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILE_ACCEPT = '.doc,.docx,.pdf,.jpg,.jpeg,.png';

interface InvestigationWorkspaceViewProps {
  activities: ActivityRecord[];
  currentUid: string;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  onActivitySaved: (record: ActivityRecord) => void;
  onActivityDeleted: (id: string) => void;
}

interface InvestigationForm {
  dartaNo: string;
  dartaDate: string;
  complainant: string;
  respondent: string;
  relatedAgency: string;
  complaintDetails: string;
  investigationDate: string;
  reportDate: string;
  reportSummary: string;
}

const EMPTY_FORM: InvestigationForm = {
  dartaNo: '',
  dartaDate: '',
  complainant: '',
  respondent: '',
  relatedAgency: '',
  complaintDetails: '',
  investigationDate: '',
  reportDate: '',
  reportSummary: '',
};

const inputClassName =
  'w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

const displayValue = (value?: string | null) => value?.trim() || '-';

export const InvestigationWorkspaceView: React.FC<InvestigationWorkspaceViewProps> = ({
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
  const [form, setForm] = useState<InvestigationForm>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  const investigationRecords = activities.filter(
    (activity) => activity.activityType === 'chhanbin_anveshan'
  );
  const searchTerm = tableSearch.trim().toLocaleLowerCase();
  const shownInvestigationRecords = investigationRecords.filter((record) =>
    !searchTerm ||
    [
        record.dartaNo,
        record.refNo,
        record.dartaDate,
        record.complainant,
        record.respondent,
        record.relatedAgency,
        record.entityName,
        record.complaintDetails,
        record.title,
        record.investigationDate,
        record.reportDate,
        record.reportSummary,
      ].some((value) => value?.toLocaleLowerCase().includes(searchTerm))
  );
  const selectedYearIndex = FISCAL_YEARS.findIndex(
    (year) => year.value === selectedFiscalYear
  );
  const previousFiscalYear = FISCAL_YEARS[selectedYearIndex + 1]?.value;
  const cards = [
    {
      label: 'कुल छानविन/अन्वेषण',
      count: investigationRecords.length,
      icon: ClipboardList,
    },
    {
      label: 'चालु आ.व.को छानविन/अन्वेषण',
      count: investigationRecords.filter(
        (record) => record.fiscalYear === selectedFiscalYear
      ).length,
      icon: CalendarDays,
    },
    {
      label: 'गत आ.व.को जारी',
      count: investigationRecords.filter(
        (record) =>
          record.fiscalYear === previousFiscalYear && record.status === 'chalu'
      ).length,
      icon: History,
    },
    {
      label: 'सम्पन्न भएका',
      count: investigationRecords.filter((record) => record.status === 'sampanna')
        .length,
      icon: CheckCheck,
    },
    {
      label: 'चालु छानविन/अन्वेषण',
      count: investigationRecords.filter((record) => record.status === 'chalu')
        .length,
      icon: LoaderCircle,
    },
  ];

  const openNewForm = () => {
    setEditingActivity(null);
    setForm(EMPTY_FORM);
    setFiles([]);
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const openEditForm = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setForm({
      dartaNo: activity.dartaNo ?? '',
      dartaDate: activity.dartaDate ?? '',
      complainant: activity.complainant ?? '',
      respondent: activity.respondent ?? '',
      relatedAgency: activity.relatedAgency ?? '',
      complaintDetails: activity.complaintDetails ?? activity.title ?? '',
      investigationDate: activity.investigationDate ?? '',
      reportDate: activity.reportDate ?? '',
      reportSummary: activity.reportSummary ?? '',
    });
    setFiles([]);
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const updateForm = (key: keyof InvestigationForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadAttachments = async (recordId: string) => {
    const uploadedPaths: string[] = [];
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
        const path = `${currentUid}/${recordId}/${crypto.randomUUID()}_${safeName}`;
        const { error } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
      }
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          console.error('Unable to remove partially uploaded investigation attachments:', cleanupError);
        }
      }
      throw error;
    }
    return uploadedPaths;
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const recordId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    let uploadedPaths: string[] = [];

    try {
      const invalidFile = files.find((file) => file.size > MAX_FILE_SIZE);
      if (invalidFile) {
        throw new Error(`${invalidFile.name}: फाइलको आकार २० MB भन्दा कम हुनुपर्छ।`);
      }

      uploadedPaths = await uploadAttachments(recordId);
      const mahashakhaId =
        MAHASHAKHAS.find((item) => item.id === effectiveMahashakhaId)?.id ??
        'maha_admin';
      const shakhaId =
        SHAKHAS.find(
          (item) =>
            item.id === effectiveShakhaId && item.mahashakhaId === mahashakhaId
        )?.id ??
        SHAKHAS.find((item) => item.mahashakhaId === mahashakhaId)?.id ??
        'shakha_investigation';
      const now = new Date().toISOString();
      const savedRecord: ActivityRecord = {
        ...(editingActivity ?? {}),
        id: recordId,
        refNo: form.dartaNo.trim(),
        activityType: 'chhanbin_anveshan',
        title: form.complaintDetails.trim() || 'छानविन/अन्वेषण',
        entityName: form.relatedAgency.trim() || '-',
        districtEn: editingActivity?.districtEn ?? '-',
        fiscalYear: editingActivity?.fiscalYear ?? selectedFiscalYear,
        monthIndex: editingActivity?.monthIndex ?? CURRENT_NEPALI_MONTH_INDEX,
        nepaliDate: form.investigationDate || form.dartaDate,
        nonComplianceCount: editingActivity?.nonComplianceCount ?? 0,
        directiveCount: editingActivity?.directiveCount ?? 0,
        status: editingActivity?.status ?? 'chalu',
        mahashakhaId,
        shakhaId,
        createdByUid: editingActivity?.createdByUid ?? currentUid,
        dartaNo: form.dartaNo.trim(),
        dartaDate: form.dartaDate,
        complainant: form.complainant.trim(),
        respondent: form.respondent.trim(),
        relatedAgency: form.relatedAgency.trim(),
        complaintDetails: form.complaintDetails.trim(),
        investigationDate: form.investigationDate,
        reportDate: form.reportDate,
        reportSummary: form.reportSummary.trim(),
        attachmentPaths: [
          ...(editingActivity?.attachmentPaths ?? []),
          ...uploadedPaths,
        ],
        createdAt: editingActivity?.createdAt ?? now,
        updatedAt: now,
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
      if (!data) throw new Error('यो विवरण सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');

      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(editingActivity ? 'छानविन विवरण अद्यावधिक गरियो।' : 'नयाँ छानविन/अन्वेषण दर्ता गरियो।');
      setFiles([]);
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          console.error('Unable to remove unlinked investigation attachments:', cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save investigation record:', error);
      setFormError(`छानविन विवरण सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity: ActivityRecord) => {
    if (!window.confirm(`दर्ता नं. ${displayValue(activity.dartaNo)} मेटाउने?`)) return;
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
      if (!data) throw new Error('यो विवरण मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);

      const ownPaths = (activity.attachmentPaths ?? []).filter((path) =>
        path.startsWith(`${currentUid}/`)
      );
      if (ownPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove(ownPaths);
        if (storageError) {
          console.error('Unable to remove deleted investigation attachments:', storageError);
          setNotice('छानविन विवरण मेटाइयो, तर संलग्न फाइल हटाउन सकिएन।');
          return;
        }
      }
      setNotice('छानविन विवरण मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete investigation record:', error);
      setNotice(`छानविन विवरण मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openAttachment = async (path: string, download: boolean) => {
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
      console.error('Unable to access investigation attachment:', error);
      setNotice(`संलग्न फाइल खोल्न सकिएन। ${message}`);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">छानविन/अन्वेषण</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                छानविन तथा अन्वेषण अभिलेख व्यवस्थापन
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            <Plus className="h-3.5 w-3.5" />
            नयाँ छानविन/अन्वेषण
          </button>
        </div>
      </section>

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

      {notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-950">
          {notice}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">छानविन/अन्वेषण अभिलेख</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {toNepaliDigits(shownInvestigationRecords.length)} /{' '}
              {toNepaliDigits(investigationRecords.length)} अभिलेख
            </p>
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="अभिलेख खोज्नुहोस्..."
              aria-label="छानविन/अन्वेषण अभिलेख खोज्नुहोस्"
              className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1450px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <th className="px-2.5 py-2.5">क्र.सं.</th>
              <th className="px-2.5 py-2.5">उजुरी दर्ता नं</th>
              <th className="px-2.5 py-2.5">दर्ता मिति</th>
              <th className="px-2.5 py-2.5">उजुरकर्ता</th>
              <th className="px-2.5 py-2.5">विपक्षी</th>
              <th className="px-2.5 py-2.5">सम्बन्धित निकाय</th>
              <th className="px-2.5 py-2.5">उजुरीको विवरण</th>
              <th className="px-2.5 py-2.5">छानविन/अन्वेषण मिति</th>
              <th className="px-2.5 py-2.5">प्रतिवेदन मिति</th>
              <th className="px-2.5 py-2.5">प्रतिवेदनको सार</th>
              <th className="px-2.5 py-2.5">फाइल</th>
              <th className="px-2.5 py-2.5">कार्य</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
            {shownInvestigationRecords.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-slate-500">
                  {investigationRecords.length === 0
                    ? 'हाल कुनै छानविन/अन्वेषण अभिलेख उपलब्ध छैन।'
                    : 'खोजीसँग मिल्ने अभिलेख भेटिएन।'}
                </td>
              </tr>
            ) : (
              shownInvestigationRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-2.5 py-3">
                    {toNepaliDigits(index + 1)}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-3">
                    {displayValue(record.dartaNo ?? record.refNo)}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-3">
                    {displayValue(record.dartaDate)}
                  </td>
                  <td className="px-2.5 py-3">{displayValue(record.complainant)}</td>
                  <td className="px-2.5 py-3">{displayValue(record.respondent)}</td>
                  <td className="px-2.5 py-3">
                    {displayValue(record.relatedAgency ?? record.entityName)}
                  </td>
                  <td className="max-w-52 px-2.5 py-3">{displayValue(record.complaintDetails ?? record.title)}</td>
                  <td className="whitespace-nowrap px-2.5 py-3">{displayValue(record.investigationDate)}</td>
                  <td className="whitespace-nowrap px-2.5 py-3">{displayValue(record.reportDate)}</td>
                  <td className="max-w-52 px-2.5 py-3">{displayValue(record.reportSummary)}</td>
                  <td className="whitespace-nowrap px-2.5 py-3">
                    {(record.attachmentPaths ?? []).length === 0 ? (
                      '-'
                    ) : (
                      <div className="flex max-w-36 flex-col gap-1">
                        {(record.attachmentPaths ?? []).map((path) => {
                          const fileName = path.split('/').pop() ?? 'Фाइल';
                          return (
                            <div key={path} className="flex items-center gap-1">
                              <span className="max-w-24 truncate" title={fileName}>
                                {fileName.replace(/^[^_]+_/, '')}
                              </span>
                              <button
                                type="button"
                                title="फाइल हेर्नुहोस्"
                                aria-label={`${fileName} हेर्नुहोस्`}
                                onClick={() => void openAttachment(path, false)}
                                className="text-slate-500 hover:text-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="फाइल डाउनलोड गर्नुहोस्"
                                aria-label={`${fileName} डाउनलोड गर्नुहोस्`}
                                onClick={() => void openAttachment(path, true)}
                                className="text-slate-500 hover:text-blue-700"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="सम्पादन गर्नुहोस्"
                        aria-label="सम्पादन गर्नुहोस्"
                        onClick={() => openEditForm(record)}
                        className="text-slate-500 hover:text-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="मेटाउनुहोस्"
                        aria-label="मेटाउनुहोस्"
                        disabled={deletingId === record.id}
                        onClick={() => void handleDelete(record)}
                        className="text-slate-500 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="investigation-form-title"
            className="flex max-h-[96vh] w-full max-w-[480px] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between bg-blue-900 px-3 py-1.5 text-white">
              <h3 id="investigation-form-title" className="text-xs font-semibold">
                {editingActivity ? 'छानविन/अन्वेषण विवरण सम्पादन' : 'नयाँ छानविन/अन्वेषण बहुउद्देश्य'}
              </h3>
              <button
                type="button"
                aria-label="बन्द गर्नुहोस्"
                disabled={saving}
                onClick={() => setFormOpen(false)}
                className="text-white/90 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-3 overflow-y-auto p-4 text-[11px]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block font-medium text-slate-700">
                    उजुरी दर्ता नं
                    <input
                      required
                      maxLength={100}
                      value={form.dartaNo}
                      onChange={(event) => updateForm('dartaNo', event.target.value)}
                      placeholder="उजुरी दर्ता नं"
                      className={`${inputClassName} mt-1`}
                    />
                  </label>
                  <label className="block font-medium text-slate-700">
                    दर्ता मिति
                    <input
                      required
                      type="date"
                      value={form.dartaDate}
                      onChange={(event) => updateForm('dartaDate', event.target.value)}
                      className={`${inputClassName} mt-1`}
                    />
                  </label>
                  <label className="block font-medium text-slate-700">
                    उजुरकर्ता
                    <input
                      maxLength={160}
                      value={form.complainant}
                      onChange={(event) => updateForm('complainant', event.target.value)}
                      placeholder="उजुरकर्ताको नाम"
                      className={`${inputClassName} mt-1`}
                    />
                  </label>
                  <label className="block font-medium text-slate-700">
                    विपक्षी
                    <input
                      maxLength={160}
                      value={form.respondent}
                      onChange={(event) => updateForm('respondent', event.target.value)}
                      placeholder="विपक्षीको नाम"
                      className={`${inputClassName} mt-1`}
                    />
                  </label>
                </div>
                <label className="block font-medium text-slate-700">
                  सम्बन्धित निकाय
                  <input
                    maxLength={200}
                    value={form.relatedAgency}
                    onChange={(event) => updateForm('relatedAgency', event.target.value)}
                    placeholder="कार्यालय/निकायको नाम"
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  उजुरीको विवरण
                  <textarea
                    maxLength={4000}
                    rows={3}
                    value={form.complaintDetails}
                    onChange={(event) => updateForm('complaintDetails', event.target.value)}
                    placeholder="उजुरीको विवरण लेख्नुहोस्"
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  छानविन/अन्वेषण मिति
                  <input
                    type="date"
                    value={form.investigationDate}
                    onChange={(event) => updateForm('investigationDate', event.target.value)}
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  प्रतिवेदन मिति
                  <input
                    type="date"
                    value={form.reportDate}
                    onChange={(event) => updateForm('reportDate', event.target.value)}
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  प्रतिवेदनको सार
                  <textarea
                    maxLength={4000}
                    rows={3}
                    value={form.reportSummary}
                    onChange={(event) => updateForm('reportSummary', event.target.value)}
                    placeholder="प्रतिवेदनको सार लेख्नुहोस्..."
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  फाइल संलग्न गर्नुहोस् (Word, PDF, JPEG)
                  <input
                    type="file"
                    multiple
                    accept={FILE_ACCEPT}
                    onChange={(event) =>
                      setFiles(Array.from(event.target.files ?? []))
                    }
                    className={`${inputClassName} mt-1 bg-white`}
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">
                    doc, docx, pdf, jpg, jpeg, png · प्रति फाइल अधिकतम २० MB
                  </span>
                  {editingActivity && (editingActivity.attachmentPaths ?? []).length > 0 && (
                    <span className="mt-1 block text-[10px] text-slate-500">
                      पहिलेका संलग्न फाइलहरू सुरक्षित रहनेछन्।
                    </span>
                  )}
                </label>
                {formError && (
                  <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-red-800">
                    {formError}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
                >
                  {saving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
