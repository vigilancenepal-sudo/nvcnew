import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { ActivityRecord, FiscalYear, NoticePublicationDetails } from '../types/nvc';
import { MAHASHAKHAS, SHAKHAS, toNepaliDigits } from '../data/nvcStructure';
import { NoticePublicationDossierModal } from './NoticePublicationDossierModal';
import { NepaliDatePicker } from './NepaliDatePicker';

interface NoticePublicationWorkspaceViewProps {
  activities: ActivityRecord[];
  currentUid: string;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  onActivitySaved: (record: ActivityRecord) => void;
  onActivityDeleted: (id: string) => void;
}

interface NoticeForm {
  date: string;
  title: string;
  description: string;
}

const EMPTY_FORM: NoticeForm = { date: '', title: '', description: '' };
const inputClassName =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

const detailsFor = (activity: ActivityRecord): NoticePublicationDetails => ({
  date: activity.noticePublicationDetails?.date ?? activity.nepaliDate ?? '',
  title: activity.noticePublicationDetails?.title ?? activity.title ?? '',
  description:
    activity.noticePublicationDetails?.description ??
    activity.reportSummary ??
    activity.complaintDetails ??
    '',
});

const formatDate = (date: string) => {
  return toNepaliDigits(date);
};

export const NoticePublicationWorkspaceView: React.FC<
  NoticePublicationWorkspaceViewProps
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
  const [form, setForm] = useState<NoticeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const notices = useMemo(
    () =>
      activities
        .filter((activity) => activity.activityType === 'suchana_prakashan')
        .sort((a, b) => detailsFor(b).date.localeCompare(detailsFor(a).date)),
    [activities]
  );

  const openNewForm = () => {
    setEditingActivity(null);
    setForm(EMPTY_FORM);
    setErrorMessage(null);
    setFormOpen(true);
  };

  const openEditForm = (activity: ActivityRecord) => {
    const details = detailsFor(activity);
    setEditingActivity(activity);
    setForm({
      date: details.date,
      title: details.title,
      description: details.description,
    });
    setErrorMessage(null);
    setFormOpen(true);
  };

  const saveNotice = async (event: React.FormEvent<HTMLFormElement>) => {
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
    const savedDetails: NoticePublicationDetails = {
      date: form.date,
      title: form.title.trim(),
      description: form.description.trim(),
    };
    const savedRecord: ActivityRecord = {
      ...(editingActivity ?? {}),
      id: recordId,
      refNo: editingActivity?.refNo ?? recordId,
      activityType: 'suchana_prakashan',
      title: savedDetails.title,
      entityName: 'सूचना',
      districtEn: '',
      fiscalYear: editingActivity?.fiscalYear ?? selectedFiscalYear,
      monthIndex: Number(savedDetails.date.slice(5, 7)),
      nepaliDate: savedDetails.date,
      nonComplianceCount: 0,
      directiveCount: 0,
      status: 'sampanna',
      mahashakhaId,
      shakhaId,
      createdByUid: editingActivity?.createdByUid ?? currentUid,
      noticePublicationDetails: savedDetails,
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
      if (!data) throw new Error('सूचना सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(editingActivity ? 'सूचना अद्यावधिक गरियो।' : 'नयाँ सूचना सुरक्षित गरियो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to save published notice:', error);
      setErrorMessage(`सूचना सुरक्षित गर्न सकिएन। ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (activity: ActivityRecord) => {
    if (!window.confirm('यो सूचना मेटाउने?')) return;
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
      if (!data) throw new Error('सूचना मेटाउने अनुमति छैन वा विवरण भेटिएन।');
      onActivityDeleted(activity.id);
      setNotice('सूचना मेटाइयो।');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unable to delete published notice:', error);
      setNotice(`सूचना मेटाउन सकिएन। ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="glass-panel overflow-hidden rounded-xl shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">सूचना प्रकाशन</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                प्रकाशित सूचनाहरूको अभिलेख ({toNepaliDigits(notices.length)} सूचना)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            <Plus className="h-3.5 w-3.5" />
            नयाँ सूचना
          </button>
        </header>

        {notice && (
          <p role="status" className="mx-4 mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {notice}
          </p>
        )}

        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 font-semibold text-slate-600">
                <th className="px-3 py-2.5">क्र. सं.</th>
                <th className="px-3 py-2.5">मिति</th>
                <th className="px-3 py-2.5">शीर्षक</th>
                <th className="px-3 py-2.5">सूचनाको विवरण</th>
                <th className="px-3 py-2.5 text-center">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notices.length ? (
                notices.map((activity, index) => {
                  const details = detailsFor(activity);
                  return (
                    <tr key={activity.id} className="align-top text-slate-700 hover:bg-slate-50/70">
                      <td className="px-3 py-3 font-semibold text-slate-600">
                        {toNepaliDigits(index + 1)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(details.date)}</td>
                      <td className="max-w-56 px-3 py-3 font-semibold text-slate-900">
                        {details.title}
                      </td>
                      <td className="max-w-xl whitespace-pre-wrap px-3 py-3 leading-5">
                        {details.description || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            aria-label="सूचना हेर्नुहोस्"
                            title="हेर्नुहोस्"
                            onClick={() => setViewActivity(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="सूचना सम्पादन गर्नुहोस्"
                            title="सम्पादन"
                            onClick={() => openEditForm(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="सूचना मेटाउनुहोस्"
                            title="मेटाउनुहोस्"
                            disabled={deletingId === activity.id}
                            onClick={() => deleteNotice(activity)}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    हाल कुनै सूचना प्रकाशित गरिएको छैन।
                  </td>
                </tr>
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
              aria-labelledby="notice-form-title"
              className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-slate-200 bg-blue-950 px-5 py-3 text-white">
                <h3 id="notice-form-title" className="text-sm font-bold">
                  {editingActivity ? 'सूचना सम्पादन' : 'नयाँ सूचना'}
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
              <form onSubmit={saveNotice}>
                <div className="space-y-4 p-5">
                  <div className="block text-xs font-semibold text-slate-700">
                    <span className="block mb-1">
                      मिति<span className="ml-1 text-red-600">*</span>
                    </span>
                    <NepaliDatePicker
                      required
                      value={form.date}
                      onChange={(date) =>
                        setForm((current) => ({ ...current, date }))
                      }
                    />
                  </div>
                  <label className="block text-xs font-semibold text-slate-700">
                    शीर्षक<span className="ml-1 text-red-600">*</span>
                    <input
                      required
                      maxLength={240}
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="सूचनाको शीर्षक लेख्नुहोस्"
                      className={`${inputClassName} mt-1.5`}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    सूचनाको विवरण<span className="ml-1 text-red-600">*</span>
                    <textarea
                      required
                      rows={6}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="सूचनाको विवरण लेख्नुहोस्"
                      className={`${inputClassName} mt-1.5 resize-y`}
                    />
                  </label>
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
                    className="rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {saving ? 'सुरक्षित हुँदैछ...' : 'सूचना सुरक्षित गर्नुहोस्'}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {viewActivity && (
        <NoticePublicationDossierModal
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
