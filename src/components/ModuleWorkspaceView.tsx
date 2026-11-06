import React, { useState } from 'react';
import { supabase, OperationType, handleSupabaseError } from '../supabase';
import {
  MenuId,
  ComplaintRecord,
  ActivityRecord,
  ComplaintSource,
  RoleLevel,
  FiscalYear,
} from '../types/nvc';
import {
  MENU_LABELS,
  getMahashakhaName,
  getShakhaName,
  toNepaliDigits,
  NEPALI_MONTHS,
  CURRENT_NEPALI_MONTH_INDEX,
} from '../data/nvcStructure';
import {
  FileText,
  Calendar as CalendarIcon,
  Lock,
  Settings as SettingsIcon,
} from 'lucide-react';
import { NewComplaintFormView } from './NewComplaintFormView';
import { ComplaintsListView } from './ComplaintsListView';
import { ReportsGeneratorView } from './ReportsGeneratorView';
import { InvestigationWorkspaceView } from './InvestigationWorkspaceView';
import { OfficeMonitoringWorkspaceView } from './OfficeMonitoringWorkspaceView';
import { CitizenCharterWorkspaceView } from './CitizenCharterWorkspaceView';
import { ServiceSurveyWorkspaceView } from './ServiceSurveyWorkspaceView';
import { PromotionalProgramWorkspaceView } from './PromotionalProgramWorkspaceView';
import { NoticePublicationWorkspaceView } from './NoticePublicationWorkspaceView';
import { ProjectMonitoringWorkspaceView } from './ProjectMonitoringWorkspaceView';
import { TechnicalAuditWorkspaceView } from './TechnicalAuditWorkspaceView';

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
  onActivitySaved: (record: ActivityRecord) => void;
  onActivityDeleted: (id: string) => void;
  onNavigateDashboard: () => void;
  onSelectMenu: (menu: MenuId) => void;
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
  onActivitySaved,
  onActivityDeleted,
  onNavigateDashboard,
  onSelectMenu,
}) => {
  const [editingComplaint, setEditingComplaint] = useState<ComplaintRecord | null>(null);

  // Sample / Activity Form State
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleEntity, setSampleEntity] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreateLabSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleTitle.trim() || !sampleEntity.trim()) return;
    setSaving(true);
    const id = `act_${Date.now()}`;
    try {
      const { error } = await supabase.from('activities').insert({
        id,
        refNo: `LAB-२०८३-${Math.floor(100 + Math.random() * 899)}`,
        activityType: 'namuna_parikshan',
        title: sampleTitle.trim().slice(0, 240),
        entityName: sampleEntity.trim().slice(0, 160),
        districtEn: 'Kathmandu',
        fiscalYear: selectedFiscalYear,
        monthIndex: CURRENT_NEPALI_MONTH_INDEX,
        nepaliDate: '२०८३-०७-१६',
        nonComplianceCount: 0,
        directiveCount: 1,
        status: 'chalu',
        mahashakhaId: 'maha_tech',
        shakhaId: 'shakha_lab_testing',
        createdByUid: currentUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (error) throw error;
      setSampleTitle('');
      setSampleEntity('');
      setNotice('प्रयोगशाला परीक्षणका लागि नयाँ नमूना दर्ता गरियो।');
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, 'activities');
    } finally {
      setSaving(false);
    }
  };

  // १. नयाँ उजुरी दर्ता वा सम्पादन फारम (Matches new_complaint.pdf)
  if (activeMenu === 'new_complaint' || editingComplaint) {
    return (
      <NewComplaintFormView
        currentUid={currentUid}
        effectiveRole={effectiveRole}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        editingComplaint={editingComplaint}
        onCancel={() => {
          setEditingComplaint(null);
          if (activeMenu === 'new_complaint') {
            onSelectMenu('complaints_all');
          }
        }}
        onSaved={() => {
          setEditingComplaint(null);
          onSelectMenu('complaints_all');
        }}
      />
    );
  }

  // २. उजुरीहरु र स्रोतगत उजुरी सूची (Matches complaint.pdf)
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

    return (
      <ComplaintsListView
        titleLabel={MENU_LABELS[activeMenu]}
        complaints={complaints}
        sourceFilter={sourceFilter}
        globalSearchQuery={searchQuery}
        effectiveRole={effectiveRole}
        onAddNewComplaint={() => onSelectMenu('new_complaint')}
        onEditComplaint={(cmp) => setEditingComplaint(cmp)}
      />
    );
  }

  // ३. रिपोर्टहरु (Matches report.pdf)
  if (activeMenu === 'reports') {
    return (
      <ReportsGeneratorView
        complaints={complaints}
        activities={activities}
        selectedFiscalYear={selectedFiscalYear}
      />
    );
  }

  if (activeMenu === 'investigation') {
    return (
      <InvestigationWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'office_monitoring') {
    return (
      <OfficeMonitoringWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        searchQuery={searchQuery}
        onActivitySaved={onActivitySaved}
      />
    );
  }

  if (activeMenu === 'citizen_charter') {
    return (
      <CitizenCharterWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'service_survey') {
    return (
      <ServiceSurveyWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'project_monitoring') {
    return (
      <ProjectMonitoringWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'technical_audit') {
    return (
      <TechnicalAuditWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'promotional_program') {
    return (
      <PromotionalProgramWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  if (activeMenu === 'notice_publication') {
    return (
      <NoticePublicationWorkspaceView
        activities={activities}
        currentUid={currentUid}
        effectiveMahashakhaId={effectiveMahashakhaId}
        effectiveShakhaId={effectiveShakhaId}
        selectedFiscalYear={selectedFiscalYear}
        onActivitySaved={onActivitySaved}
        onActivityDeleted={onActivityDeleted}
      />
    );
  }

  // ४. प्रयोगशाला नयाँ नमूना दर्ता
  if (activeMenu === 'new_sample') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full">
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
            <label className="block font-medium text-slate-700 mb-1">
              नमूना विवरण / परीक्षण प्रकार *
            </label>
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
            <label className="block font-medium text-slate-700 mb-1">
              आयोजना / कार्यालयको नाम *
            </label>
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

  // ५. क्यालेन्डर
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
          <span className="text-xs text-slate-500">
            हालको महिना: {NEPALI_MONTHS[CURRENT_NEPALI_MONTH_INDEX - 1]} २०८३
          </span>
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
                day === 16
                  ? 'border-blue-900 bg-blue-50/50'
                  : day % 7 === 0
                  ? 'border-red-100 bg-red-50/30 text-red-700'
                  : 'border-slate-200'
              }`}
            >
              <div className="font-mono-num font-semibold">{toNepaliDigits(day)}</div>
              {day === 16 && (
                <div className="mt-1 text-[10px] text-blue-950 font-medium">
                  आज · छड्के अनुगमन
                </div>
              )}
              {day === 21 && (
                <div className="mt-1 text-[10px] text-slate-600">
                  प्राविधिक परीक्षण समीक्षा
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ६. पासवर्ड परिवर्तन / सेटिङ्गस्
  if (activeMenu === 'change_password' || activeMenu === 'settings') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full">
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
            यो प्रणाली Google Workspace / आधिकारिक एकीकृत प्रमाणीकरण (SSO) मार्फत सुरक्षित गरिएको छ।
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

  // ७. अन्य क्रियाकलाप मोड्युलहरू (छानविन/अन्वेषण, कार्यालय अनुगमन, प्राविधिक परीक्षण, आयोजना अनुगमन आदि)
  const activityTypeMap: Partial<Record<MenuId, string>> = {
    investigation: 'chhanbin_anveshan',
    office_monitoring: 'karyalaya_anugaman',
    citizen_charter: 'badapatra_anugaman',
    project_monitoring: 'aayojana_anugaman',
    technical_audit: 'prabidhik_parikshan',
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
              तपाईंको महाशाखा/शाखा अन्तर्गतका क्रियाकलाप अभिलेख (
              {toNepaliDigits(filteredActivities.length)} रेकर्ड)
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
                  <td className="py-2.5 px-3 font-mono-num text-slate-600">
                    {act.nepaliDate}
                  </td>
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
