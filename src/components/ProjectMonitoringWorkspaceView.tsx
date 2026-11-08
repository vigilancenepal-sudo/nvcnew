import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  FileText,
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
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
  NEPALI_YEARS,
  NEPALI_MONTHS,
  PROVINCES_DATA,
  SHAKHAS,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  ActivityRecord,
  FiscalYear,
  ProjectMonitoringCheck,
  ProjectMonitoringDetails,
  ProjectMonitoringTeamMember,
} from '../types/nvc';
import { NepalChoroplethMap } from './NepalChoroplethMap';
import { ProjectMonitoringDossierModal } from './ProjectMonitoringDossierModal';
import { NepaliDatePicker } from './NepaliDatePicker';

const ATTACHMENT_BUCKET = 'activity-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf';
const YEARS = NEPALI_YEARS;
const MONTHS = NEPALI_MONTHS;
const STATUSES: Array<{
  value: ProjectMonitoringDetails['status'];
  label: string;
}> = [
    { value: 'planned', label: 'योजना अवस्थामा' },
    { value: 'ongoing', label: 'प्रगतिमा' },
    { value: 'completed', label: 'सम्पन्न' },
    { value: 'delayed', label: 'लक्ष्यभन्दा पछाडि' },
  ];
const STATUS_COLORS: Record<ProjectMonitoringDetails['status'], string> = {
  planned: '#0f766e',
  ongoing: '#3b82f6',
  delayed: '#f97316',
  completed: '#16a34a',
};

const CHECK_SECTIONS: Array<{ key: string; title: string; items: Array<{ key: string; label: string }> }> = [
  {
    key: 'objective',
    title: 'उद्देश्य तथा लक्ष्य',
    items: [
      { key: 'objectiveAligned', label: 'आयोजना निर्धारित उद्देश्य अनुरूप कार्यान्वयन भए/नभएको' },
      { key: 'targetClear', label: 'आयोजनाको लक्ष्य (Target) स्पष्ट रूपमा तोकिए/नतोकिएको' },
      { key: 'progressOnTarget', label: 'तोकिएको लक्ष्य अनुरूप काम प्रगति भए/नभएको' },
      { key: 'feasibilityStudy', label: 'सम्भाव्यता अध्ययन (Feasibility Study) गरिएको/नगरिएको' },
    ],
  },
  {
    key: 'quality',
    title: 'गुणस्तर तथा प्राविधिक पक्ष',
    items: [
      { key: 'designStandard', label: 'आयोजनाको डिजाइन/ड्रइङ उपयुक्त र मापदण्ड अनुसार भए/नभएको' },
      { key: 'materialQuality', label: 'निर्माण सामग्रीको गुणस्तर तोकिएको Specification अनुरूप भए/नभएको' },
      { key: 'constructionStandard', label: 'निर्माण कार्य सार्वजनिक निर्माण निर्देशिका/प्रचलित कानून बमोजिम भए/नभएको' },
      { key: 'labTest', label: 'गुणस्तर नियन्त्रणका लागि प्रयोगशाला परीक्षण (Lab Test) गरिएको/नगरिएको' },
      { key: 'labCalibration', label: 'प्रयोगशाला परीक्षण उपकरण क्यालिब्रेसन गरिएको/नगरिएको' },
    ],
  },
  {
    key: 'financeTime',
    title: 'आर्थिक तथा समय व्यवस्थापन',
    items: [
      { key: 'budgetAvailable', label: 'आयोजनाका लागि बजेट विनियोजन र निकासा समयमा भए/नभएको' },
      { key: 'scheduleProgress', label: 'तोकिएको समय तालिका (Schedule) अनुसार काम अगाडि बढे/नबढेको' },
      { key: 'revisedEstimate', label: 'निर्माण कार्य पुनर्मूल्याङ्कन गरिएको लागतभित्र सम्पन्न हुने देखिए/नदेखिएको' },
      { key: 'costOverrun', label: 'म्याद थप वा लागत वृद्धि (Variation/Cost Overrun) भए/नभएको' },
    ],
  },
  {
    key: 'procurement',
    title: 'खरिद प्रक्रिया',
    items: [
      { key: 'transparentProcurement', label: 'सेवा, वस्तु वा निर्माण सामग्री खरिद प्रक्रिया पारदर्शी ढङ्गले भए/नभएको' },
      { key: 'procurementLaw', label: 'खरिद ऐन/नियम बमोजिमको प्रक्रिया पूरा गरिएको/नगरिएको' },
      { key: 'contractGuarantee', label: 'ठेक्का सम्झौता र बीमा/जमानतपत्र (Guarantee) यथास्थित रहे/नरहेको' },
    ],
  },
  {
    key: 'outcome',
    title: 'उपलब्धि, दिगोपन र लागत प्रभावकारिता',
    items: [
      { key: 'outcomesAchieved', label: 'आयोजनाबाट अपेक्षित उपलब्धि हासिल हुने देखिए/नदेखिएको' },
      { key: 'sustainability', label: 'आयोजनाको दिगोपन (Sustainability) सुनिश्चित भए/नभएको' },
      { key: 'costEffectiveness', label: 'लागतको प्रभावकारिता (Cost Effectiveness) रहे/नरहेको' },
      { key: 'operationMaintenance', label: 'सञ्चालन तथा मर्मत-सम्भारको जिम्मेवारी स्पष्ट तोकिए/नतोकिएको' },
    ],
  },
];

const EMPTY_CHECK: ProjectMonitoringCheck = { answer: '', remarks: '' };
const EMPTY_TEAM_MEMBER: ProjectMonitoringTeamMember = { name: '', post: '', date: '' };
const EMPTY_DETAILS: ProjectMonitoringDetails = {
  projectName: '',
  province: '',
  districtEn: '',
  localLevel: '',
  fullAddress: '',
  wardNo: '',
  implementingAgency: '',
  contractorName: '',
  agreementNo: '',
  agreementDate: '',
  startDate: '',
  expectedCompletionDate: '',
  approvedCost: 0,
  paidAmount: 0,
  physicalProgress: 0,
  inspectionDate: '',
  checks: {},
  overallRemarks: '',
  recommendation: '',
  team: [],
  status: 'ongoing',
};
const inputClassName =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700';

type ProjectFilters = {
  province: string;
  district: string;
  localLevel: string;
  status: string;
};
const EMPTY_FILTERS: ProjectFilters = {
  province: '',
  district: '',
  localLevel: '',
  status: '',
};

interface ProjectMonitoringWorkspaceViewProps {
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

const numberField = (value: string) => Math.max(0, Number(value) || 0);

const normalizeDetails = (activity: ActivityRecord): ProjectMonitoringDetails => {
  const savedDetails = activity.projectMonitoringDetails;
  return {
    ...EMPTY_DETAILS,
    ...savedDetails,
    projectName: savedDetails?.projectName || activity.title || '',
    province:
      savedDetails?.province ||
      PROVINCES_DATA.find((province) =>
        province.districtsEn.includes(activity.districtEn)
      )?.nameNe ||
      '',
    districtEn: savedDetails?.districtEn || activity.districtEn || '',
    implementingAgency:
      savedDetails?.implementingAgency || activity.entityName || '',
    inspectionDate: savedDetails?.inspectionDate || activity.nepaliDate || '',
    checks: { ...savedDetails?.checks },
    team: [...(savedDetails?.team ?? [])],
  };
};

const dateParts = (value: string) => {
  const [year = '', month = '', day = ''] = englishDigits(value).split('-');
  return { year, month, day };
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const { year, month, day } = dateParts(value);
  const monthName = MONTHS[Number(month) - 1];
  return monthName
    ? `${toNepaliDigits(year)} ${monthName} ${toNepaliDigits(Number(day))}`
    : toNepaliDigits(value);
};

const statusLabel = (status: ProjectMonitoringDetails['status']) =>
  STATUSES.find((item) => item.value === status)?.label ?? 'प्रगतिमा';

const amountLabel = (amount: number) =>
  `रु. ${toNepaliDigits(Number(amount || 0).toLocaleString('en-IN'))}`;

export const ProjectMonitoringWorkspaceView: React.FC<
  ProjectMonitoringWorkspaceViewProps
> = ({
  activities,
  currentUid,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  onActivitySaved,
  onActivityDeleted,
}) => {
    const [filters, setFilters] = useState<ProjectFilters>(EMPTY_FILTERS);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
    const [viewActivity, setViewActivity] = useState<ActivityRecord | null>(null);
    const [details, setDetails] = useState<ProjectMonitoringDetails>(EMPTY_DETAILS);
    const [files, setFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    const allProjects = useMemo(
      () =>
        activities
          .filter((activity) => activity.activityType === 'aayojana_anugaman')
          .map((activity) => ({ activity, details: normalizeDetails(activity) }))
          .filter(({ activity }) => activity.fiscalYear === selectedFiscalYear)
          .sort((a, b) => b.details.inspectionDate.localeCompare(a.details.inspectionDate)),
      [activities, selectedFiscalYear]
    );
    const districts = filters.province
      ? PROVINCES_DATA.find((province) => province.nameNe === filters.province)?.districtsEn ?? []
      : PROVINCES_DATA.flatMap((province) => province.districtsEn);
    const filteredDashboardProjects = allProjects.filter(({ details: record }) => {
      if (selectedDistrict && record.districtEn !== selectedDistrict) return false;
      if (filters.province && record.province !== filters.province) return false;
      if (filters.district && record.districtEn !== filters.district) return false;
      if (filters.localLevel && record.localLevel !== filters.localLevel) return false;
      if (filters.status && record.status !== filters.status) return false;
      return true;
    });
    const query = search.trim().toLocaleLowerCase();
    const visibleProjects = filteredDashboardProjects.filter(({ details: record }) =>
      [
        record.projectName,
        record.province,
        DISTRICT_NE_MAP[record.districtEn] || record.districtEn,
        record.localLevel,
        record.implementingAgency,
        record.contractorName,
        record.agreementNo,
      ].some((value) => value.toLocaleLowerCase().includes(query))
    );
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(visibleProjects.length / pageSize));
    const pageProjects = visibleProjects.slice(page * pageSize, (page + 1) * pageSize);
    const totalBudget = filteredDashboardProjects.reduce(
      (sum, { details: record }) => sum + Number(record.approvedCost || 0),
      0
    );
    const totalPaid = filteredDashboardProjects.reduce(
      (sum, { details: record }) => sum + Number(record.paidAmount || 0),
      0
    );
    const averageProgress = filteredDashboardProjects.length
      ? Math.round(
        filteredDashboardProjects.reduce(
          (sum, { details: record }) => sum + Number(record.physicalProgress || 0),
          0
        ) / filteredDashboardProjects.length
      )
      : 0;
    const delayedCount = filteredDashboardProjects.filter(
      ({ details: record }) => record.status === 'delayed'
    ).length;
    const completedCount = filteredDashboardProjects.filter(
      ({ details: record }) => record.status === 'completed'
    ).length;

    const provinceData = PROVINCES_DATA.map((province) => {
      const records = filteredDashboardProjects.filter(
        ({ details: record }) => record.province === province.nameNe
      );
      return {
        province: province.nameNe.replace(' प्रदेश', ''),
        count: records.length,
        progress: records.length
          ? Math.round(
            records.reduce((sum, { details: record }) => sum + Number(record.physicalProgress || 0), 0) /
            records.length
          )
          : 0,
      };
    });
    const statusData = STATUSES.map(({ value, label }) => ({
      name: label,
      value: filteredDashboardProjects.filter(({ details: record }) => record.status === value).length,
      color: STATUS_COLORS[value],
    })).filter((item) => item.value > 0);
    const challengeData = CHECK_SECTIONS.map((section) => {
      const total = filteredDashboardProjects.reduce(
        (sum, { details: record }) =>
          sum +
          section.items.filter((item) => record.checks[item.key]?.answer === 'no').length,
        0
      );
      return {
        name: section.title, percent: filteredDashboardProjects.length
          ? Math.round((total / (filteredDashboardProjects.length * section.items.length)) * 100)
          : 0
      };
    }).sort((a, b) => b.percent - a.percent);
    const scatterData = filteredDashboardProjects.map(({ details: record }) => ({
      project: record.projectName,
      paid: Number(record.paidAmount || 0),
      progress: Number(record.physicalProgress || 0),
      budget: Number(record.approvedCost || 0),
    }));
    const districtCounts = filteredDashboardProjects.reduce<Record<string, number>>(
      (counts, { details: record }) => {
        if (record.districtEn) counts[record.districtEn] = (counts[record.districtEn] ?? 0) + 1;
        return counts;
      },
      {}
    );

    const updateDate = (
      field: 'agreementDate' | 'startDate' | 'expectedCompletionDate' | 'inspectionDate',
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

    const setCheck = (key: string, patch: Partial<ProjectMonitoringCheck>) =>
      setDetails((current) => ({
        ...current,
        checks: {
          ...current.checks,
          [key]: { ...EMPTY_CHECK, ...current.checks[key], ...patch },
        },
      }));

    const openNewForm = () => {
      setEditingActivity(null);
      setDetails({ ...EMPTY_DETAILS, inspectionDate: '' });
      setFiles([]);
      setErrorMessage(null);
      setNotice(null);
      setFormOpen(true);
    };

    const openEditForm = (activity: ActivityRecord) => {
      setEditingActivity(activity);
      setDetails(normalizeDetails(activity));
      setFiles([]);
      setErrorMessage(null);
      setNotice(null);
      setFormOpen(true);
    };

    const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setErrorMessage(null);
      const invalidFile = files.find((file) => file.size > MAX_FILE_SIZE);
      if (invalidFile) {
        setErrorMessage(`${invalidFile.name}: फाइलको आकार २० MB भन्दा कम हुनुपर्छ।`);
        setSaving(false);
        return;
      }

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
      const savedDetails: ProjectMonitoringDetails = {
        ...details,
        projectName: details.projectName.trim(),
        fullAddress: details.fullAddress.trim(),
        wardNo: details.wardNo.trim(),
        implementingAgency: details.implementingAgency.trim(),
        contractorName: details.contractorName.trim(),
        agreementNo: details.agreementNo.trim(),
        approvedCost: numberField(String(details.approvedCost)),
        paidAmount: numberField(String(details.paidAmount)),
        physicalProgress: Math.min(100, numberField(String(details.physicalProgress))),
        overallRemarks: details.overallRemarks.trim(),
        recommendation: details.recommendation.trim(),
        checks: Object.fromEntries(
          Object.entries(details.checks).map(([key, check]) => [
            key,
            { answer: check.answer, remarks: check.remarks.trim() },
          ])
        ),
        team: details.team.filter((member) => member.name.trim() || member.post.trim()),
      };
      const activityDate = savedDetails.inspectionDate || savedDetails.startDate;
      const monthIndex =
        Number(dateParts(activityDate).month) || CURRENT_NEPALI_MONTH_INDEX;
      const activityStatus: ActivityRecord['status'] =
        savedDetails.status === 'completed'
          ? 'sampanna'
          : savedDetails.status === 'delayed'
            ? 'pratibedan_pesh'
            : 'chalu';
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
          activityType: 'aayojana_anugaman',
          title: savedDetails.projectName,
          entityName: savedDetails.implementingAgency || savedDetails.projectName,
          districtEn: savedDetails.districtEn,
          fiscalYear: selectedFiscalYear,
          monthIndex,
          nepaliDate: activityDate,
          nonComplianceCount: Object.values(savedDetails.checks).filter(
            (check) => check.answer === 'no'
          ).length,
          directiveCount: savedDetails.recommendation ? 1 : 0,
          status: activityStatus,
          mahashakhaId,
          shakhaId,
          createdByUid: editingActivity?.createdByUid ?? currentUid,
          attachmentPaths: [...(editingActivity?.attachmentPaths ?? []), ...uploadedPaths],
          projectMonitoringDetails: savedDetails,
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
        if (!data) throw new Error('आयोजना अनुगमन सुरक्षित गर्ने अनुमति छैन वा विवरण भेटिएन।');
        onActivitySaved(savedRecord);
        setFormOpen(false);
        setNotice(editingActivity ? 'आयोजना अनुगमन अद्यावधिक गरियो।' : 'नयाँ आयोजना अनुगमन सुरक्षित गरियो।');
      } catch (error) {
        if (uploadedPaths.length > 0) {
          const { error: cleanupError } = await supabase.storage
            .from(ATTACHMENT_BUCKET)
            .remove(uploadedPaths);
          if (cleanupError) {
            console.error('Unable to remove partially uploaded project monitoring files:', cleanupError);
          }
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Unable to save project monitoring record:', error);
        setErrorMessage(`आयोजना अनुगमन सुरक्षित गर्न सकिएन। ${message}`);
      } finally {
        setSaving(false);
      }
    };

    const deleteProject = async (activity: ActivityRecord) => {
      if (!window.confirm('यो आयोजना अनुगमन अभिलेख मेटाउने?')) return;
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
        if (!data) throw new Error('आयोजना अनुगमन मेटाउने अनुमति छैन वा विवरण भेटिएन।');
        onActivityDeleted(activity.id);
        setPage(0);
        const ownPaths = (activity.attachmentPaths ?? []).filter((path) =>
          path.startsWith(`${currentUid}/`)
        );
        if (ownPaths.length) {
          const { error: storageError } = await supabase.storage
            .from(ATTACHMENT_BUCKET)
            .remove(ownPaths);
          if (storageError) {
            console.error('Unable to remove project monitoring attachments:', storageError);
            setNotice(`आयोजना अनुगमन मेटाइयो, तर संलग्न फाइल हटाउन सकिएन। ${storageError.message}`);
            return;
          }
        }
        setNotice('आयोजना अनुगमन मेटाइयो।');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Unable to delete project monitoring record:', error);
        setNotice(`आयोजना अनुगमन मेटाउन सकिएन। ${message}`);
      } finally {
        setDeletingId(null);
      }
    };

    const openAttachment = async (path: string) => {
      try {
        const { data, error } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .createSignedUrl(path, 60);
        if (error) throw error;
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Unable to open project monitoring attachment:', error);
        setNotice(`संलग्न फाइल खोल्न सकिएन। ${message}`);
      }
    };

    const clearFilters = () => {
      setFilters(EMPTY_FILTERS);
      setSelectedDistrict(null);
      setSearch('');
      setPage(0);
    };
    const updateFilter = (patch: Partial<ProjectFilters>) => {
      setFilters((current) => ({ ...current, ...patch }));
      setPage(0);
    };
    const updateTeam = (index: number, patch: Partial<ProjectMonitoringTeamMember>) =>
      setDetails((current) => ({
        ...current,
        team: current.team.map((member, itemIndex) =>
          itemIndex === index ? { ...member, ...patch } : member
        ),
      }));

    return (
      <div className="space-y-4">
        <header className="glass-panel rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
                <MapPin className="h-6 w-6 text-blue-200" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    आयोजना अनुगमन (Project Monitoring Workspace)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    आ.व. {toNepaliDigits(selectedFiscalYear)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  सार्वजनिक पूर्वाधार आयोजनाहरूको स्थलगत भौतिक प्रगति, खर्च दक्षता र ५-आयामिक गुणस्तर अनुगमन
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B49] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              नयाँ आयोजना अनुगमन
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-3 rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-900">
              {notice}
            </p>
          )}
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Field label="प्रदेश">
              <select
                value={filters.province}
                onChange={(event) =>
                  updateFilter({ province: event.target.value, district: '', localLevel: '' })
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
                onChange={(event) => updateFilter({ district: event.target.value, localLevel: '' })}
                className={inputClassName}
              >
                <option value="">सबै जिल्ला</option>
                {districts.map((district) => (
                  <option key={district} value={district}>{DISTRICT_NE_MAP[district] || district}</option>
                ))}
              </select>
            </Field>
            <Field label="स्थानीय तह">
              <select
                value={filters.localLevel}
                onChange={(event) => updateFilter({ localLevel: event.target.value })}
                className={inputClassName}
              >
                <option value="">सबै स्थानीय तह</option>
                {filters.district &&
                  getLocalLevelsForDistrict(filters.district).map((level) => (
                    <option key={level}>{level}</option>
                  ))}
              </select>
            </Field>
            <Field label="स्थिति">
              <select
                value={filters.status}
                onChange={(event) => updateFilter({ status: event.target.value })}
                className={inputClassName}
              >
                <option value="">सबै स्थिति</option>
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </Field>
            <Field label="आयोजना खोज्नुहोस्">
              <span className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  placeholder="आयोजना, ठेकेदार वा जिल्ला..."
                  className={`${inputClassName} pl-8`}
                />
              </span>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                फिल्टर हटाउनुहोस्
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'कूल आयोजना', value: toNepaliDigits(filteredDashboardProjects.length), icon: CalendarDays, color: 'border-blue-200 bg-blue-50/70 text-blue-900', glow: 'hover:border-blue-400' },
            { label: 'स्वीकृत लागत', value: amountLabel(totalBudget), icon: FileText, color: 'border-cyan-200 bg-cyan-50/70 text-cyan-900', glow: 'hover:border-cyan-400' },
            { label: 'हालसम्म भुक्तानी', value: amountLabel(totalPaid), icon: CheckCircle2, color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', glow: 'hover:border-emerald-400' },
            { label: 'औसत भौतिक प्रगति', value: `${toNepaliDigits(averageProgress)}%`, icon: Clock3, color: 'border-indigo-200 bg-indigo-50/70 text-indigo-900', glow: 'hover:border-indigo-400' },
            { label: 'लक्ष्यभन्दा पछाडि', value: toNepaliDigits(delayedCount), icon: AlertTriangle, color: 'border-orange-200 bg-orange-50/70 text-orange-900', glow: 'hover:border-orange-400' },
            { label: 'सम्पन्न आयोजना', value: toNepaliDigits(completedCount), icon: CheckCircle2, color: 'border-green-200 bg-green-50/70 text-green-900', glow: 'hover:border-green-400' },
          ].map(({ label, value, icon: Icon, color, glow }) => (
            <article key={label} className={`stat-tile-glow min-w-0 rounded-xl border p-3.5 bg-white/80 backdrop-blur-xs transition-all shadow-2xs ${color} ${glow}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-500">{label}</p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 truncate text-lg font-black text-slate-900">{value}</p>
            </article>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <NepalChoroplethMap
            districtCounts={districtCounts}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(district) => {
              setSelectedDistrict(district);
              setPage(0);
            }}
            title="जिल्लागत आयोजना अनुगमन नक्सा"
            subtitle="अनुगमन भएका आयोजनाको जिल्लागत वितरण"
            entityLabel="आयोजना"
            entityPlural="आयोजना"
            emptyMessage="यस आर्थिक वर्षमा आयोजना अनुगमन अभिलेख छैन।"
          />
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-blue-950">प्रदेशगत आयोजना संख्या र औसत भौतिक प्रगति</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={provinceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" fontSize={9} />
                  <YAxis yAxisId="left" allowDecimals={false} fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" fontSize={9} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="आयोजना संख्या" fill="#397fba" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="progress" name="औसत प्रगति %" stroke="#f59e0b" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-blue-950">प्रगति स्थिति अनुसार वितरण</h3>
            <div className="mt-3 h-64">
              {statusData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
                      {statusData.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => toNepaliDigits(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-xs text-slate-400">आयोजना विवरण उपलब्ध छैन।</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-blue-950">चेकलिस्ट श्रेणी अनुसार समस्या</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={challengeData} layout="vertical" margin={{ left: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" fontSize={9} />
                  <YAxis type="category" dataKey="name" width={142} fontSize={9} />
                  <Tooltip formatter={(value) => `${toNepaliDigits(Number(value))}%`} />
                  <Bar dataKey="percent" name="नकारात्मक जवाफ" fill="#e39328" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-blue-950">खर्च दक्षता: लागत खर्च Vs भौतिक प्रगति %</h3>
            <div className="mt-3 h-64">
              {scatterData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ bottom: 8, left: 8, right: 12 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="paid" name="खर्च" tickFormatter={(value) => toNepaliDigits(value)} fontSize={9} />
                    <YAxis type="number" dataKey="progress" name="भौतिक प्रगति" domain={[0, 100]} unit="%" fontSize={9} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="#397fba" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-xs text-slate-400">आयोजना तथ्याङ्क उपलब्ध छैन।</p>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <header className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-bold text-blue-950">आयोजनागत विस्तृत तालिका</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              छानिएको आर्थिक वर्ष र फिल्टर अनुसार आयोजना अनुगमन विवरण
            </p>
          </header>
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[1260px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="bg-slate-50 font-semibold text-slate-600">
                  <th className="px-2.5 py-2.5">आयोजनाको नाम</th>
                  <th className="px-2.5 py-2.5">प्रदेश</th>
                  <th className="px-2.5 py-2.5">जिल्ला</th>
                  <th className="px-2.5 py-2.5">स्थानीय तह</th>
                  <th className="px-2.5 py-2.5">स्वीकृत लागत</th>
                  <th className="px-2.5 py-2.5">खर्च</th>
                  <th className="px-2.5 py-2.5">भौतिक प्रगति</th>
                  <th className="px-2.5 py-2.5">स्थिति</th>
                  <th className="px-2.5 py-2.5">कैफियत</th>
                  <th className="px-2.5 py-2.5">संलग्न फाइल</th>
                  <th className="px-2.5 py-2.5">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageProjects.length ? (
                  pageProjects.map(({ activity, details: record }) => (
                    <tr key={activity.id} className="align-middle text-slate-700 hover:bg-blue-50/40 transition-colors">
                      <td className="max-w-44 px-2.5 py-3">
                        <button
                          type="button"
                          onClick={() => setViewActivity(activity)}
                          className="font-bold text-slate-900 text-left hover:text-blue-800 hover:underline block leading-snug"
                        >
                          {record.projectName}
                        </button>
                        {record.contractorName && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            ठेकेदार: {record.contractorName}
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-3">{record.province}</td>
                      <td className="px-2.5 py-3">{DISTRICT_NE_MAP[record.districtEn] || record.districtEn}</td>
                      <td className="px-2.5 py-3">{record.localLevel}</td>
                      <td className="whitespace-nowrap px-2.5 py-3 font-mono">{amountLabel(record.approvedCost)}</td>
                      <td className="whitespace-nowrap px-2.5 py-3 font-mono">{amountLabel(record.paidAmount)}</td>
                      <td className="px-2.5 py-3 font-bold text-blue-900">{toNepaliDigits(record.physicalProgress)}%</td>
                      <td className="px-2.5 py-3">
                        <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold border" style={{ backgroundColor: `${STATUS_COLORS[record.status]}15`, color: STATUS_COLORS[record.status], borderColor: `${STATUS_COLORS[record.status]}40` }}>
                          {statusLabel(record.status)}
                        </span>
                      </td>
                      <td className="max-w-40 px-2.5 py-3 truncate">{record.overallRemarks || '-'}</td>
                      <td className="px-2.5 py-3">
                        {(activity.attachmentPaths ?? []).length ? (
                          <div className="flex flex-col gap-1">
                            {(activity.attachmentPaths ?? []).map((path) => (
                              <button key={path} type="button" onClick={() => openAttachment(path)} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                                <FileImage className="h-3 w-3" />
                                फाइल
                              </button>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1">
                          <button type="button" title="डिजिटल मिसिल हेर्नुहोस्" onClick={() => setViewActivity(activity)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[10px] border border-blue-200">
                            <Eye className="h-3 w-3" />
                            मिसिल
                          </button>
                          <button type="button" title="सम्पादन" onClick={() => openEditForm(activity)} className="rounded p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-800"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" title="मेटाउनुहोस्" disabled={deletingId === activity.id} onClick={() => deleteProject(activity)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={11} className="py-12 text-center text-slate-400">{allProjects.length ? 'फिल्टर वा खोजीसँग मिल्ने आयोजना भेटिएन।' : 'हाल कुनै आयोजना अनुगमन दर्ता छैन।'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
            <span>कुल {toNepaliDigits(visibleProjects.length)} आयोजना</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded border border-slate-200 px-2.5 py-1 disabled:opacity-40">अघिल्लो</button>
              <span>{toNepaliDigits(page + 1)} / {toNepaliDigits(pageCount)}</span>
              <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="rounded border border-slate-200 px-2.5 py-1 disabled:opacity-40">अर्को</button>
            </div>
          </footer>
        </section>

        {formOpen &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3">
              <div role="dialog" aria-modal="true" aria-labelledby="project-monitoring-form-title" className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-xl">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
                  <div>
                    <h3 id="project-monitoring-form-title" className="text-sm font-bold text-blue-950">
                      {editingActivity ? 'आयोजना अनुगमन सम्पादन' : 'नयाँ आयोजना अनुगमन'}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">तारा (*) लगाइएका विवरण अनिवार्य छन्।</p>
                  </div>
                  <button type="button" aria-label="बन्द गर्नुहोस्" disabled={saving} onClick={() => setFormOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </header>
                <form onSubmit={saveProject} className="flex min-h-0 flex-1 flex-col">
                  <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                      <h4 className="border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">आयोजना तथा ठेगाना सम्बन्धी मूल जानकारी</h4>
                      <Field label="आयोजनाको नाम" required>
                        <input required maxLength={240} value={details.projectName} onChange={(event) => setDetails((current) => ({ ...current, projectName: event.target.value }))} placeholder="आयोजनाको नाम" className={inputClassName} />
                      </Field>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Field label="प्रदेश" required>
                          <select required value={details.province} onChange={(event) => setDetails((current) => ({ ...current, province: event.target.value, districtEn: '', localLevel: '' }))} className={inputClassName}>
                            <option value="">प्रदेश छान्नुहोस्</option>
                            {PROVINCES_DATA.map((province) => <option key={province.id}>{province.nameNe}</option>)}
                          </select>
                        </Field>
                        <Field label="जिल्ला" required>
                          <select required value={details.districtEn} onChange={(event) => setDetails((current) => ({ ...current, districtEn: event.target.value, localLevel: '' }))} className={inputClassName}>
                            <option value="">पहिले प्रदेश छान्नुहोस्</option>
                            {(PROVINCES_DATA.find((province) => province.nameNe === details.province)?.districtsEn ?? []).map((district) => <option key={district} value={district}>{DISTRICT_NE_MAP[district] || district}</option>)}
                          </select>
                        </Field>
                        <Field label="स्थानीय तह" required>
                          <select required value={details.localLevel} onChange={(event) => setDetails((current) => ({ ...current, localLevel: event.target.value }))} className={inputClassName}>
                            <option value="">स्थानीय तह छान्नुहोस्</option>
                            {details.districtEn && getLocalLevelsForDistrict(details.districtEn).map((level) => <option key={level}>{level}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="पूरा ठेगाना">
                          <input value={details.fullAddress} onChange={(event) => setDetails((current) => ({ ...current, fullAddress: event.target.value }))} placeholder="स्थान वा ठेगाना" className={inputClassName} />
                        </Field>
                        <Field label="वडा नं.">
                          <input value={details.wardNo} onChange={(event) => setDetails((current) => ({ ...current, wardNo: event.target.value }))} placeholder="वडा नं." className={inputClassName} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="कार्यान्वयन गर्ने निकाय" required>
                          <input required value={details.implementingAgency} onChange={(event) => setDetails((current) => ({ ...current, implementingAgency: event.target.value }))} placeholder="कार्यान्वयन गर्ने निकाय" className={inputClassName} />
                        </Field>
                        <Field label="निर्माण व्यवसायी/ठेकेदारको नाम" required>
                          <input required value={details.contractorName} onChange={(event) => setDetails((current) => ({ ...current, contractorName: event.target.value }))} placeholder="ठेकेदारको नाम" className={inputClassName} />
                        </Field>
                      </div>
                      <Field label="सम्झौता नं." required>
                        <input required value={details.agreementNo} onChange={(event) => setDetails((current) => ({ ...current, agreementNo: event.target.value }))} placeholder="सम्झौता नं." className={inputClassName} />
                      </Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {([
                          ['agreementDate', 'सम्झौता मिति', true],
                          ['startDate', 'आयोजना सुरु मिति', true],
                          ['expectedCompletionDate', 'आयोजना सम्पन्न हुने मिति', true],
                          ['inspectionDate', 'अनुगमन मिति', true],
                        ] as const).map(([field, label, required]) => (
                          <Field key={field} label={label} required={required}>
                            <NepaliDatePicker
                              required={required}
                              value={details[field]}
                              onChange={(date) =>
                                setDetails((current) => ({ ...current, [field]: date }))
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Field label="स्वीकृत लागत अनुमान (रु.)" required>
                          <input required type="number" min={0} step="0.01" value={details.approvedCost} onChange={(event) => setDetails((current) => ({ ...current, approvedCost: numberField(event.target.value) }))} className={inputClassName} />
                        </Field>
                        <Field label="हालसम्म भुक्तानी/खर्च भएको रकम (रु.)" required>
                          <input required type="number" min={0} step="0.01" value={details.paidAmount} onChange={(event) => setDetails((current) => ({ ...current, paidAmount: numberField(event.target.value) }))} className={inputClassName} />
                        </Field>
                        <Field label="भौतिक प्रगति (%)" required>
                          <input required type="number" min={0} max={100} step="0.1" value={details.physicalProgress} onChange={(event) => setDetails((current) => ({ ...current, physicalProgress: Math.min(100, numberField(event.target.value)) }))} className={inputClassName} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="स्थिति" required>
                          <select required value={details.status} onChange={(event) => setDetails((current) => ({ ...current, status: event.target.value as ProjectMonitoringDetails['status'] }))} className={inputClassName}>
                            {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                          </select>
                        </Field>
                        <Field label="संलग्न फोटो/फाइल">
                          <input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className={inputClassName} />
                          <span className="mt-1 block text-[10px] font-normal text-slate-500">PDF, JPG, PNG · प्रति फाइल अधिकतम २० MB</span>
                        </Field>
                      </div>
                      {editingActivity && (editingActivity.attachmentPaths ?? []).length > 0 && (
                        <p className="text-[10px] text-slate-500">पहिलेका संलग्न फाइलहरू सुरक्षित रहनेछन्।</p>
                      )}
                    </section>

                    {CHECK_SECTIONS.map((section) => (
                      <section key={section.key} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="mb-3 border-b border-slate-100 pb-3 text-sm font-bold text-blue-950">{section.title}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[680px] text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600">
                                <th className="py-2 text-left">अनुगमनका विषय</th>
                                <th className="w-16 py-2 text-center">छ</th>
                                <th className="w-16 py-2 text-center">छैन</th>
                                <th className="w-16 py-2 text-center">लागू छैन</th>
                                <th className="w-64 py-2 text-left">कैफियत</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {section.items.map((item) => (
                                <tr key={item.key}>
                                  <td className="py-2.5 pr-2 text-slate-700">{item.label}</td>
                                  {([
                                    ['yes', 'छ'],
                                    ['no', 'छैन'],
                                    ['na', 'लागू छैन'],
                                  ] as const).map(([answer, label]) => (
                                    <td key={answer} className="py-2 text-center">
                                      <label className="inline-flex items-center justify-center gap-1">
                                        <input
                                          type="radio"
                                          name={`project-check-${item.key}`}
                                          aria-label={`${item.label}: ${label}`}
                                          checked={details.checks[item.key]?.answer === answer}
                                          onChange={() => setCheck(item.key, { answer })}
                                        />
                                      </label>
                                    </td>
                                  ))}
                                  <td className="py-1.5">
                                    <input value={details.checks[item.key]?.remarks ?? ''} onChange={(event) => setCheck(item.key, { remarks: event.target.value })} placeholder="कैफियत" className={inputClassName} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {([
                        ['overallRemarks', 'समग्र कैफियत / अवलोकन'],
                        ['recommendation', 'सुझाव / सिफारिस'],
                      ] as const).map(([field, label]) => (
                        <Field key={field} label={label}>
                          <textarea rows={4} maxLength={2000} value={details[field]} onChange={(event) => setDetails((current) => ({ ...current, [field]: event.target.value }))} placeholder={`${label} लेख्नुहोस्...`} className={inputClassName} />
                        </Field>
                      ))}
                    </div>

                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-blue-950">अनुगमन टोली</h4>
                        <button type="button" onClick={() => setDetails((current) => ({ ...current, team: [...current.team, { ...EMPTY_TEAM_MEMBER }] }))} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">
                          <Users className="mr-1 inline h-3.5 w-3.5" /> सदस्य थप्नुहोस्
                        </button>
                      </div>
                      {details.team.length ? (
                        <div className="space-y-3">
                          {details.team.map((member, index) => (
                            <div key={index} className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                              <Field label={`सदस्य ${toNepaliDigits(index + 1)} को नाम`}>
                                <input value={member.name} onChange={(event) => updateTeam(index, { name: event.target.value })} placeholder="नाम थर" className={inputClassName} />
                              </Field>
                              <Field label="पद">
                                <input value={member.post} onChange={(event) => updateTeam(index, { post: event.target.value })} placeholder="पद" className={inputClassName} />
                              </Field>
                              <Field label="मिति">
                                <input value={member.date} onChange={(event) => updateTeam(index, { date: event.target.value })} placeholder="२०८३-०७-२०" className={inputClassName} />
                              </Field>
                              <button type="button" aria-label="सदस्य हटाउनुहोस्" onClick={() => setDetails((current) => ({ ...current, team: current.team.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-5 rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">अनुगमन टोलीको सदस्य विवरण थप्नुहोस्।</p>
                      )}
                    </section>

                    {errorMessage && (
                      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{errorMessage}</p>
                    )}
                  </div>
                  <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                    <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">रद्द गर्नुहोस्</button>
                    <button type="submit" disabled={saving} className="rounded-md bg-blue-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60">{saving ? 'सुरक्षित हुँदैछ...' : 'अनुगमन फाराम सुरक्षित गर्नुहोस्'}</button>
                  </footer>
                </form>
              </div>
            </div>,
            document.body
          )}

        {viewActivity && (
          <ProjectMonitoringDossierModal
            activity={viewActivity}
            onClose={() => setViewActivity(null)}
            onEdit={(act) => {
              setViewActivity(null);
              openEditForm(act);
            }}
            onOpenAttachment={(path) => openAttachment(path)}
          />
        )}
      </div>
    );
  };
