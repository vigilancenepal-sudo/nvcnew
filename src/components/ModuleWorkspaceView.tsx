import React, { useState } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import {
  MenuId,
  ComplaintRecord,
  ActivityRecord,
  ComplaintSource,
  ComplaintStatus,
  RoleLevel,
  MahashakhaId,
  ShakhaId,
  FiscalYear,
} from '../types/nvc';
import {
  MENU_LABELS,
  COMPLAINT_SOURCE_LABELS,
  COMPLAINT_STATUS_LABELS,
  DISTRICT_NE_MAP,
  MINISTRIES_LIST,
  COMPLAINT_NATURES,
  MAHASHAKHAS,
  SHAKHAS,
  getMahashakhaName,
  getShakhaName,
  toNepaliDigits,
  NEPALI_MONTHS,
  CURRENT_NEPALI_MONTH_INDEX,
} from '../data/nvcStructure';
import { Plus, FileText, Calendar as CalendarIcon, Lock, Settings as SettingsIcon } from 'lucide-react';

interface ModuleWorkspaceViewProps {
  activeMenu: MenuId;
  complaints: ComplaintRecord[];
  activities: ActivityRecord[];
  currentUid: string;
  effectiveRole: RoleLevel;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  searchQuery: string;
  onNavigateDashboard: () => void;
}

export const ModuleWorkspaceView: React.FC<ModuleWorkspaceViewProps> = ({
  activeMenu,
  complaints,
  activities,
  currentUid,
  effectiveRole,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  searchQuery,
  onNavigateDashboard,
}) => {
  // New Complaint Form State
  const [title, setTitle] = useState('');
  const [complainant, setComplainant] = useState('');
  const [source, setSource] = useState<ComplaintSource>('online');
  const [ministry, setMinistry] = useState(MINISTRIES_LIST[0]);
  const [nature, setNature] = useState(COMPLAINT_NATURES[0]);
  const [districtEn, setDistrictEn] = useState('Kathmandu');
  const [targetMaha, setTargetMaha] = useState<MahashakhaId>(
    (effectiveMahashakhaId !== 'all' ? effectiveMahashakhaId : 'maha_admin') as MahashakhaId
  );
  const [targetShakha, setTargetShakha] = useState<ShakhaId>(
    (effectiveShakhaId !== 'all' ? effectiveShakhaId : 'shakha_info_complaint') as ShakhaId
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Sample / Activity Form State
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleEntity, setSampleEntity] = useState('');

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !complainant.trim()) return;
    setSaving(true);

    const assignedMaha: MahashakhaId =
      effectiveRole === 'admin'
        ? targetMaha
        : (effectiveMahashakhaId as MahashakhaId);

    const assignedShakha: ShakhaId =
      effectiveRole === 'shakha'
        ? (effectiveShakhaId as ShakhaId)
        : targetShakha;

    const id = `cmp_${Date.now()}`;
    const dartaNum = `NVC-२०८३-${toNepaliDigits(Math.floor(200 + Math.random() * 799))}`;

    try {
      await setDoc(doc(collection(db, 'complaints'), id), {
        dartaNo: dartaNum,
        title: title.trim().slice(0, 240),
        complainant: complainant.trim().slice(0, 120),
        source,
        ministry,
        nature,
        status: 'chalu',
        districtEn,
        fiscalYear: selectedFiscalYear,
        monthIndex: CURRENT_NEPALI_MONTH_INDEX,
        nepaliDate: '२०८३-०७-१५',
        mahashakhaId: assignedMaha,
        shakhaId: assignedShakha,
        createdByUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle('');
      setComplainant('');
      setNotice(`उजुरी दर्ता नं. ${dartaNum} सफलतापूर्वक दर्ता भयो।`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'complaints');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (cmp: ComplaintRecord, nextStatus: ComplaintStatus) => {
    try {
      await updateDoc(doc(db, 'complaints', cmp.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setNotice(`दर्ता नं. ${cmp.dartaNo} को स्थिति अद्यावधिक गरियो।`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `complaints/${cmp.id}`);
    }
  };

  const handleCreateLabSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleTitle.trim() || !sampleEntity.trim()) return;
    setSaving(true);
    const id = `act_${Date.now()}`;
    try {
      await setDoc(doc(collection(db, 'activities'), id), {
        refNo: `LAB-२०८३-${Math.floor(100 + Math.random() * 899)}`,
        activityType: 'namuna_parikshan',
        title: sampleTitle.trim().slice(0, 240),
        entityName: sampleEntity.trim().slice(0, 160),
        districtEn,
        fiscalYear: selectedFiscalYear,
        monthIndex: CURRENT_NEPALI_MONTH_INDEX,
        nepaliDate: '२०८३-०७-१५',
        nonComplianceCount: 0,
        directiveCount: 1,
        status: 'chalu',
        mahashakhaId: 'maha_tech',
        shakhaId: 'shakha_lab_testing',
        createdByUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSampleTitle('');
      setSampleEntity('');
      setNotice('प्रयोगशाला परीक्षणका लागि नयाँ नमूना दर्ता गरियो।');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'activities');
    } finally {
      setSaving(false);
    }
  };

  // 1. New Complaint Registration View
  if (activeMenu === 'new_complaint') {
    const shakhaChoices = SHAKHAS.filter((s) =>
      effectiveRole === 'admin' ? s.mahashakhaId === targetMaha : s.mahashakhaId === effectiveMahashakhaId
    );

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-3xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">नयाँ उजुरी दर्ता फारम</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              राष्ट्रिय सतर्कता केन्द्रको उजुरी अभिलेखमा नयाँ उजुरी प्रविष्ट गर्नुहोस्
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
          >
            ड्यासबोर्डमा फर्कनुहोस्
          </button>
        </div>

        {notice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
            {notice}
          </div>
        )}

        <form onSubmit={handleCreateComplaint} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">उजुरीको विषय / शीर्षक *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उजुरीको संक्षिप्त र स्पष्ट विवरण लेख्नुहोस्..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">निवेदक / उजुरीकर्ता *</label>
              <input
                type="text"
                required
                value={complainant}
                onChange={(e) => setComplainant(e.target.value)}
                placeholder="निवेदकको नाम वा संस्था"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">उजुरीको माध्यम (Source) *</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ComplaintSource)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="kendra_darta">केन्द्रमा दर्ता</option>
                <option value="hello_sarkar">हेलो सरकार</option>
                <option value="online">अनलाइन उजुरी</option>
                <option value="hotline">हटलाइन उजुरी</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">सम्बद्ध मन्त्रालय / निकाय *</label>
              <select
                value={ministry}
                onChange={(e) => setMinistry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                {MINISTRIES_LIST.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">उजुरीको प्रकृति *</label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                {COMPLAINT_NATURES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">सम्बद्ध जिल्ला *</label>
              <select
                value={districtEn}
                onChange={(e) => setDistrictEn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                {Object.entries(DISTRICT_NE_MAP).map(([en, ne]) => (
                  <option key={en} value={en}>
                    {ne} ({en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {effectiveRole === 'admin' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">जिम्मेवार महाशाखा</label>
                <select
                  value={targetMaha}
                  onChange={(e) => {
                    const m = e.target.value as MahashakhaId;
                    setTargetMaha(m);
                    const first = SHAKHAS.find((s) => s.mahashakhaId === m);
                    if (first) setTargetShakha(first.id);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                >
                  {MAHASHAKHAS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameNe}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">जिम्मेवार शाखा</label>
                <select
                  value={targetShakha}
                  onChange={(e) => setTargetShakha(e.target.value as ShakhaId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                >
                  {shakhaChoices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameNe}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'दर्ता हुँदैछ...' : 'उजुरी दर्ता गर्नुहोस्'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 2. Complaint Source Filtered Lists
  if (
    activeMenu === 'complaints_all' ||
    activeMenu === 'hello_sarkar' ||
    activeMenu === 'online_complaint' ||
    activeMenu === 'hotline_complaint'
  ) {
    const sourceFilter: ComplaintSource | null =
      activeMenu === 'hello_sarkar'
        ? 'hello_sarkar'
        : activeMenu === 'online_complaint'
        ? 'online'
        : activeMenu === 'hotline_complaint'
        ? 'hotline'
        : null;

    const rows = complaints.filter((c) => {
      if (sourceFilter && c.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.dartaNo.toLowerCase().includes(q) ||
          c.ministry.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">{MENU_LABELS[activeMenu]} अभिलेख</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              तपाईंको अधिकार क्षेत्रभित्रका जम्मा {toNepaliDigits(rows.length)} उजुरीहरू
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
          >
            ड्यासबोर्डमा फर्कनुहोस्
          </button>
        </div>

        {notice && (
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800">
            {notice}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                <th className="py-2.5 px-3">दर्ता नं.</th>
                <th className="py-2.5 px-3">मिति</th>
                <th className="py-2.5 px-3">उजुरीको विषय</th>
                <th className="py-2.5 px-3">माध्यम · जिल्ला</th>
                <th className="py-2.5 px-3">जिम्मेवार शाखा</th>
                <th className="py-2.5 px-3">स्थिति परिवर्तन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    यस शीर्षकमा कुनै उजुरी भेटिएन।
                  </td>
                </tr>
              ) : (
                rows.slice(0, 30).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {c.dartaNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-slate-600 whitespace-nowrap">
                      {c.nepaliDate}
                    </td>
                    <td className="py-2.5 px-3 max-w-md">
                      <div className="font-medium text-slate-900">{c.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {c.ministry} · {c.nature}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {COMPLAINT_SOURCE_LABELS[c.source]} · {DISTRICT_NE_MAP[c.districtEn] || c.districtEn}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{getShakhaName(c.shakhaId)}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={c.status}
                        disabled={c.status === 'farchhaut' && effectiveRole !== 'admin'}
                        onChange={(e) =>
                          handleStatusChange(c, e.target.value as ComplaintStatus)
                        }
                        className="px-2 py-1 border border-slate-200 rounded bg-white text-xs text-slate-800 disabled:opacity-60"
                      >
                        {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. New Lab Sample View (प्रयोगशाला परीक्षण शाखा)
  if (activeMenu === 'new_sample') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl">
        <h2 className="text-base font-bold text-slate-900">
          नयाँ प्रयोगशाला नमूना दर्ता (प्रयोगशाला परीक्षण शाखा)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          सडक, पुल, भवन तथा सिँचाइ आयोजनाबाट संकलित निर्माण सामग्रीको नमूना प्रविष्टि
        </p>
        {notice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
            {notice}
          </div>
        )}
        <form onSubmit={handleCreateLabSample} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">नमूना विवरण / परीक्षण प्रकार *</label>
            <input
              type="text"
              required
              value={sampleTitle}
              onChange={(e) => setSampleTitle(e.target.value)}
              placeholder="उदा: कङ्क्रिट कम्प्रेसिभ स्ट्रेन्थ / बिटुमिन एक्स्ट्र्याक्सन परीक्षण"
              className="w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">आयोजना / कार्यालयको नाम *</label>
            <input
              type="text"
              required
              value={sampleEntity}
              onChange={(e) => setSampleEntity(e.target.value)}
              placeholder="उदा: मध्यपहाडी लोकमार्ग आयोजना कार्यालय"
              className="w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-950 text-white font-semibold rounded-md cursor-pointer"
          >
            {saving ? 'दर्ता हुँदैछ...' : 'नमूना दर्ता गर्नुहोस्'}
          </button>
        </form>
      </div>
    );
  }

  // 4. Calendar View
  if (activeMenu === 'calendar') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-900">
              वार्षिक कार्ययोजना तथा अनुगमन पात्रो — वि.सं. २०८३ कार्तिक
            </h2>
          </div>
          <span className="text-xs text-slate-500">हालको महिना: {NEPALI_MONTHS[CURRENT_NEPALI_MONTH_INDEX - 1]} २०८३</span>
        </div>
        <div className="grid grid-cols-7 gap-2 mt-4 text-center text-xs font-semibold text-slate-600">
          {['आइत', 'सोम', 'मंगलबार', 'बुध', 'बिही', 'शुक्र', 'शनि'].map((d) => (
            <div key={d} className="py-2 bg-slate-50 rounded">
              {d}
            </div>
          ))}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
            <div
              key={day}
              className={`p-3 border rounded-md text-left min-h-20 ${
                day === 15
                  ? 'border-blue-900 bg-blue-50/50'
                  : day % 7 === 0
                  ? 'border-red-100 bg-red-50/30 text-red-700'
                  : 'border-slate-200'
              }`}
            >
              <div className="font-mono-num font-semibold">{toNepaliDigits(day)}</div>
              {day === 15 && (
                <div className="mt-1 text-[10px] text-blue-950 font-medium">आज · छड्के अनुगमन</div>
              )}
              {day === 21 && (
                <div className="mt-1 text-[10px] text-slate-600">प्राविधिक परीक्षण समीक्षा</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Password / Settings
  if (activeMenu === 'change_password' || activeMenu === 'settings') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          {activeMenu === 'change_password' ? (
            <Lock className="w-5 h-5 text-blue-900" />
          ) : (
            <SettingsIcon className="w-5 h-5 text-blue-900" />
          )}
          <h2 className="text-base font-bold text-slate-900">{MENU_LABELS[activeMenu]}</h2>
        </div>
        <div className="mt-4 space-y-3 text-xs text-slate-600">
          <p>
            यो प्रणाली Google Workspace / आधिकारीक एकीकृत प्रमाणीकरण (SSO) मार्फत सुरक्षित गरिएको छ।
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div>
              <span className="font-semibold text-slate-800">सक्रिय महाशाखा:</span>{' '}
              {getMahashakhaName(effectiveMahashakhaId)}
            </div>
            <div>
              <span className="font-semibold text-slate-800">सक्रिय शाखा:</span>{' '}
              {getShakhaName(effectiveShakhaId)}
            </div>
            <div>
              <span className="font-semibold text-slate-800">आर्थिक वर्ष:</span> आ.व.{' '}
              {toNepaliDigits(selectedFiscalYear)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Operational Activity Modules (अनुगमन, छानविन, प्राविधिक परीक्षण, आयोजना अनुगमन, नमूना रिपोर्ट)
  const activityTypeMap: Partial<Record<MenuId, string>> = {
    investigation: 'chhanbin_anveshan',
    office_monitoring: 'karyalaya_anugaman',
    citizen_charter: 'badapatra_anugaman',
    project_monitoring: 'aayojana_anugaman',
    technical_audit: 'prabidhik_parikshan',
    sample_reports: 'namuna_parikshan',
    promotional_program: 'prabardhanatmak',
    notice_publication: 'suchana_prakashan',
  };

  const targetActType = activityTypeMap[activeMenu];
  const filteredActivities = targetActType
    ? activities.filter((a) => a.activityType === targetActType)
    : activities;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-900" />
          <div>
            <h2 className="text-base font-bold text-slate-900">{MENU_LABELS[activeMenu]}</h2>
            <p className="text-xs text-slate-500">
              तपाईंको महाशाखा/शाखा अन्तर्गतका क्रियाकलाप अभिलेख ({toNepaliDigits(filteredActivities.length)} रेकर्ड) — विस्तृत मोड्युल क्रमिक रूपमा विस्तारित हुने
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateDashboard}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
        >
          ड्यासबोर्डमा फर्कनुहोस्
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
              <th className="py-2.5 px-3">संकेत नं.</th>
              <th className="py-2.5 px-3">मिति</th>
              <th className="py-2.5 px-3">विवरण / शीर्षक</th>
              <th className="py-2.5 px-3">कार्यालय / आयोजना</th>
              <th className="py-2.5 px-3 text-right">अपरिपालना</th>
              <th className="py-2.5 px-3 text-right">निर्देशन</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  हाल यस शीर्षकमा कुनै अभिलेख उपलब्ध छैन।
                </td>
              </tr>
            ) : (
              filteredActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-900">
                    {act.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num text-slate-600">{act.nepaliDate}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{act.title}</td>
                  <td className="py-2.5 px-3 text-slate-600">{act.entityName}</td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-900">
                    {toNepaliDigits(act.nonComplianceCount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-900">
                    {toNepaliDigits(act.directiveCount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
