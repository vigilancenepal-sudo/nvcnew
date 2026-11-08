import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  X,
  Pencil,
  Trash2,
  Scale,
  Calendar,
  Building2,
  Check,
  AlertTriangle,
  Award,
  ShieldCheck,
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
import { ActivityRecord, FiscalYear, LabTestDetails } from '../types/nvc';
import { NepaliDatePicker } from './NepaliDatePicker';

interface LabTestingWorkspaceViewProps {
  activities: ActivityRecord[];
  currentUid: string;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  onActivitySaved: (record: ActivityRecord) => void;
  onActivityDeleted: (id: string) => void;
}

const MATERIAL_PRESETS: Record<
  LabTestDetails['sampleType'],
  {
    nameNe: string;
    standard: string;
    defaultRequired: number;
    unit: string;
    criteria: 'greater_equal' | 'lower_equal' | 'tolerance_range';
    description: string;
  }
> = {
  concrete_core: {
    nameNe: 'कङ्क्रिट कम्प्रेसिभ स्ट्रेन्थ (Concrete Compressive Strength)',
    standard: 'IS 516 / BS 1881 / NS 161 (M25 Grade)',
    defaultRequired: 25.0,
    unit: 'N/mm² (MPa)',
    criteria: 'greater_equal',
    description: '२८ दिने कङ्क्रिट क्युब / कोर कम्प्रेसिभ स्ट्रेन्थ परीक्षण',
  },
  bitumen: {
    nameNe: 'बिटुमिन एक्स्ट्र्याक्सन एवं पेनेत्रेसन (Bitumen Content & Penetration)',
    standard: 'ASTM D2172 / ASTM D5 (VG-30/80-100)',
    defaultRequired: 5.2,
    unit: '%',
    criteria: 'tolerance_range',
    description: 'अस्फाल्ट कङ्क्रिट / प्रिमिक्स कार्पेटिङमा बिटुमिनको मात्रा',
  },
  rebar_steel: {
    nameNe: 'स्टिल रिबार तन्यता तथा लचकता (Rebar Yield & Tensile Strength)',
    standard: 'IS 1786 / NS 191 (Fe 500D Grade)',
    defaultRequired: 500.0,
    unit: 'N/mm² (MPa)',
    criteria: 'greater_equal',
    description: 'डण्डीको Yield Strength तथा लचकता (Elongation) परीक्षण',
  },
  soil_cbr: {
    nameNe: 'माटोको सबग्रेड CBR तथा कम्प्याक्सन (California Bearing Ratio)',
    standard: 'IS 2720 (Part 16 & Part 8)',
    defaultRequired: 7.0,
    unit: '%',
    criteria: 'greater_equal',
    description: 'सडक सबग्रेड तथा बेस कोर्स माटोको CBR मान',
  },
  aggregate: {
    nameNe: 'गिट्टीको प्रभाव मान (Aggregate Impact Value - AIV)',
    standard: 'IS 2386 (Part 4) / BS 812',
    defaultRequired: 30.0,
    unit: '%',
    criteria: 'lower_equal',
    description: 'सडक निर्माणमा प्रयोग हुने ढुङ्गा/गिट्टीको भार वहन क्षमता (अधिकतम ३०%)',
  },
};

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all';

export const LabTestingWorkspaceView: React.FC<LabTestingWorkspaceViewProps> = ({
  activities,
  currentUid,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  onActivitySaved,
  onActivityDeleted,
}) => {
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [certificateActivity, setCertificateActivity] = useState<ActivityRecord | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [sampleType, setSampleType] = useState<LabTestDetails['sampleType']>('concrete_core');
  const [sampleCode, setSampleCode] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [locationChainage, setLocationChainage] = useState('');
  const [collectionDate, setCollectionDate] = useState('२०८३-०७-१०');
  const [testedDate, setTestedDate] = useState('२०८३-०७-२२');
  const [technicianName, setTechnicianName] = useState('ई. कृष्णहरि शर्मा');
  const [verifiedBy, setVerifiedBy] = useState('सि.डि.ई. दिनेश भट्टराई');
  const [specifiedStandard, setSpecifiedStandard] = useState(
    MATERIAL_PRESETS.concrete_core.standard
  );
  const [requiredValue, setRequiredValue] = useState<number>(25.0);
  const [obtainedValue, setObtainedValue] = useState<number>(26.8);
  const [unit, setUnit] = useState<string>('N/mm² (MPa)');
  const [remarks, setRemarks] = useState('');

  // Extract lab tests from activities
  const labActivities = useMemo(() => {
    return activities.filter(
      (a) =>
        a.activityType === 'prabidhik_parikshan' &&
        a.shakhaId === 'shakha_lab_testing' &&
        a.fiscalYear === selectedFiscalYear
    );
  }, [activities, selectedFiscalYear]);

  // Handle Preset Selection
  const handleSelectMaterialType = (type: LabTestDetails['sampleType']) => {
    setSampleType(type);
    const preset = MATERIAL_PRESETS[type];
    setSampleName(preset.nameNe);
    setSpecifiedStandard(preset.standard);
    setRequiredValue(preset.defaultRequired);
    setUnit(preset.unit);
  };

  // Live calculation of variance & pass/fail
  const calculatedResult = useMemo(() => {
    if (!requiredValue || requiredValue === 0) {
      return { variance: 0, pass: true };
    }
    const variance = ((obtainedValue - requiredValue) / requiredValue) * 100;
    const preset = MATERIAL_PRESETS[sampleType];

    let pass = true;
    if (preset.criteria === 'greater_equal') {
      pass = obtainedValue >= requiredValue;
    } else if (preset.criteria === 'lower_equal') {
      pass = obtainedValue <= requiredValue;
    } else {
      // tolerance range +/- 10%
      pass = Math.abs(variance) <= 10;
    }
    return { variance: parseFloat(variance.toFixed(2)), pass };
  }, [requiredValue, obtainedValue, sampleType]);

  // Open Add Form
  const openNewForm = () => {
    setEditingActivity(null);
    const autoCode = `LAB-NVC-${toNepaliDigits(Date.now().toString().slice(-4))}`;
    setSampleCode(autoCode);
    handleSelectMaterialType('concrete_core');
    setProjectName('');
    setLocationChainage('');
    setObtainedValue(26.5);
    setRemarks('');
    setErrorMessage(null);
    setFormOpen(true);
  };

  // Open Edit Form
  const openEditForm = (act: ActivityRecord) => {
    setEditingActivity(act);
    const lab = act.labTestDetails;
    if (lab) {
      setSampleType(lab.sampleType);
      setSampleCode(lab.sampleCode || act.refNo);
      setSampleName(lab.sampleName || act.title);
      setProjectName(lab.projectName || act.entityName);
      setLocationChainage(lab.locationChainage || '');
      setCollectionDate(lab.collectionDate || act.nepaliDate);
      setTestedDate(lab.testedDate || act.investigationDate || act.nepaliDate);
      setTechnicianName(lab.technicianName || '');
      setVerifiedBy(lab.verifiedBy || '');
      setSpecifiedStandard(lab.specifiedStandard || '');
      setRequiredValue(lab.requiredValue ?? 25);
      setObtainedValue(lab.obtainedValue ?? 25);
      setUnit(lab.unit || 'N/mm²');
      setRemarks(lab.remarks || act.reportSummary || '');
    } else {
      handleSelectMaterialType('concrete_core');
      setSampleCode(act.refNo || `LAB-${act.id.slice(0, 6)}`);
      setProjectName(act.entityName || act.title);
    }
    setErrorMessage(null);
    setFormOpen(true);
  };

  // Save Lab Sample
  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const recordId = editingActivity?.id ?? `act_${crypto.randomUUID()}`;
    const resultStatus: 'pass' | 'fail' = calculatedResult.pass ? 'pass' : 'fail';

    const labDetails: LabTestDetails = {
      sampleCode: sampleCode.trim() || `LAB-${Date.now().toString().slice(-4)}`,
      sampleType,
      sampleName: sampleName.trim() || MATERIAL_PRESETS[sampleType].nameNe,
      projectName: projectName.trim(),
      locationChainage: locationChainage.trim(),
      collectionDate,
      testedDate,
      technicianName: technicianName.trim(),
      verifiedBy: verifiedBy.trim(),
      specifiedStandard: specifiedStandard.trim(),
      requiredValue,
      obtainedValue,
      unit,
      variancePercentage: calculatedResult.variance,
      result: resultStatus,
      remarks: remarks.trim(),
    };

    const savedRecord: ActivityRecord = {
      ...(editingActivity ?? {}),
      id: recordId,
      refNo: labDetails.sampleCode,
      activityType: 'prabidhik_parikshan',
      title: `${labDetails.sampleName} - ${labDetails.projectName}`,
      entityName: labDetails.projectName,
      districtEn: editingActivity?.districtEn ?? 'Kathmandu',
      fiscalYear: selectedFiscalYear,
      monthIndex: CURRENT_NEPALI_MONTH_INDEX,
      nepaliDate: testedDate,
      nonComplianceCount: resultStatus === 'fail' ? 1 : 0,
      directiveCount: resultStatus === 'fail' ? 1 : 0,
      status: resultStatus === 'pass' ? 'sampanna' : 'chalu',
      mahashakhaId: 'maha_tech',
      shakhaId: 'shakha_lab_testing',
      createdByUid: editingActivity?.createdByUid ?? currentUid,
      labTestDetails: labDetails,
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
      if (!data) throw new Error('प्रयोगशाला परीक्षण सुरक्षित गर्ने अनुमति छैन।');

      onActivitySaved(savedRecord);
      setFormOpen(false);
      setNotice(
        editingActivity
          ? 'प्रयोगशाला परीक्षण विवरण सफलतापूर्वक अद्यावधिक गरियो।'
          : 'नयाँ प्रयोगशाला परीक्षण नमूना दर्ता गरी नतिजा प्रमाणीकरण गरियो।'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`प्रयोगशाला परीक्षण सुरक्षित गर्न सकिएन। ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSample = async (act: ActivityRecord) => {
    if (!window.confirm('के तपाईं यो प्रयोगशाला परीक्षण नमूना मेटाउन निश्चित हुनुहुन्छ?')) {
      return;
    }
    setDeletingId(act.id);
    try {
      const { error } = await supabase.from('activities').delete().eq('id', act.id);
      if (error) throw error;
      onActivityDeleted(act.id);
      setNotice('प्रयोगशाला परीक्षण नमूना हटाइयो।');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`नमूना मेटाउन सकिएन: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return labActivities.filter((act) => {
      const lab = act.labTestDetails;
      if (materialFilter !== 'all' && lab?.sampleType !== materialFilter) return false;
      if (resultFilter !== 'all' && lab?.result !== resultFilter) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return (
        act.title.toLowerCase().includes(q) ||
        act.entityName.toLowerCase().includes(q) ||
        (lab?.sampleCode || '').toLowerCase().includes(q) ||
        (lab?.locationChainage || '').toLowerCase().includes(q)
      );
    });
  }, [labActivities, materialFilter, resultFilter, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = labActivities.length;
    const concrete = labActivities.filter(
      (a) => a.labTestDetails?.sampleType === 'concrete_core'
    ).length;
    const bitumen = labActivities.filter(
      (a) => a.labTestDetails?.sampleType === 'bitumen'
    ).length;
    const steel = labActivities.filter(
      (a) => a.labTestDetails?.sampleType === 'rebar_steel'
    ).length;
    const passed = labActivities.filter(
      (a) => a.labTestDetails?.result === 'pass'
    ).length;
    const failed = labActivities.filter(
      (a) => a.labTestDetails?.result === 'fail'
    ).length;

    return { total, concrete, bitumen, steel, passed, failed };
  }, [labActivities]);

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <section className="glass-panel rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
              <FlaskConical className="h-6 w-6 text-blue-200" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  निर्माण सामग्री प्रयोगशाला सूचना व्यवस्थापन प्रणाली (Materials LIMS)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  आ.व. {toNepaliDigits(selectedFiscalYear)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                कङ्क्रिट, अस्फाल्ट, स्टिल, माटो तथा गिट्टीको गुणस्तर परीक्षण, नतिजा विश्लेषण र आधिकारिक प्रमाणपत्र
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#002B49] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              नयाँ नमूना परीक्षण दर्ता
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-900"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="font-bold text-blue-700 hover:text-blue-900 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 6 High-Impact Stat Tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <article className="stat-tile-glow rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-blue-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">कुल नमूना परीक्षण</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-blue-900">
                <FlaskConical className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-slate-900">
              {toNepaliDigits(stats.total)}
            </p>
          </article>

          <article className="stat-tile-glow rounded-xl border border-cyan-200 bg-cyan-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-cyan-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">कङ्क्रिट परीक्षण</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-cyan-900">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-slate-900">
              {toNepaliDigits(stats.concrete)}
            </p>
          </article>

          <article className="stat-tile-glow rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-amber-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">अस्फाल्ट/बिटुमिन</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-amber-900">
                <Scale className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-slate-900">
              {toNepaliDigits(stats.bitumen)}
            </p>
          </article>

          <article className="stat-tile-glow rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-indigo-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">डण्डी/स्टिल रिबार</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-indigo-900">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-slate-900">
              {toNepaliDigits(stats.steel)}
            </p>
          </article>

          <article className="stat-tile-glow rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-emerald-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">मापदण्ड अनुरुप (Pass)</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-emerald-700">
              {toNepaliDigits(stats.passed)}
            </p>
          </article>

          <article className="stat-tile-glow rounded-xl border border-red-200 bg-red-50/70 p-3.5 backdrop-blur-xs shadow-2xs hover:border-red-400 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">मापदण्ड विपरित (Fail)</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs text-red-700">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-red-700">
              {toNepaliDigits(stats.failed)}
            </p>
          </article>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              फिल्टर:
            </span>

            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">सबै निर्माण सामग्रीहरू</option>
              <option value="concrete_core">कङ्क्रिट कम्प्रेसिभ स्ट्रेन्थ</option>
              <option value="bitumen">बिटुमिन / अस्फाल्ट</option>
              <option value="rebar_steel">स्टिल रिबार (डण्डी)</option>
              <option value="soil_cbr">माटोको CBR / सबग्रेड</option>
              <option value="aggregate">गिट्टीको भार वहन (AIV)</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="all">सबै नतिजाहरू (Pass/Fail)</option>
              <option value="pass">मापदण्ड अनुरुप (Pass)</option>
              <option value="fail">मापदण्ड विपरित (Fail)</option>
            </select>
          </div>

          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="कोड, आयोजना वा स्थान खोज्नुहोस्..."
              className={`${inputClassName} pl-9 py-1.5 rounded-xl`}
            />
          </label>
        </div>
      </section>

      {/* Samples Table */}
      <section className="glass-panel rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <header className="border-b border-slate-200 px-5 py-3.5 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-blue-950">
              परीक्षण गरिएका निर्माण सामग्री नमूनाहरूको सूची
            </h3>
            <p className="text-[11px] text-slate-500">
              केन्द्रीय प्रयोगशालाबाट प्रमाणित आधिकारिक गुणस्तर तथ्याङ्क
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            कुल: {toNepaliDigits(filteredSamples.length)} नमूना
          </span>
        </header>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 font-bold text-slate-700 border-b border-slate-200">
                <th className="px-3.5 py-3">क्र.सं.</th>
                <th className="px-3.5 py-3">नमूना कोड / मिति</th>
                <th className="px-3.5 py-3">सामग्री प्रकार तथा मापदण्ड</th>
                <th className="px-3.5 py-3">आयोजना एवं स्थल (Chainage)</th>
                <th className="px-3.5 py-3 text-right">तोकिएको मान</th>
                <th className="px-3.5 py-3 text-right">प्राप्त नतिजा</th>
                <th className="px-3.5 py-3 text-right">फरक %</th>
                <th className="px-3.5 py-3 text-center">गुणस्तर नतिजा</th>
                <th className="px-3.5 py-3 text-center">प्रयोगशाला प्रमाणपत्र</th>
                <th className="px-3.5 py-3 text-center">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.length ? (
                filteredSamples.map((act, index) => {
                  const lab = act.labTestDetails;
                  const isPass = lab?.result === 'pass';
                  return (
                    <tr
                      key={act.id}
                      className="align-middle text-slate-700 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-500">
                        {toNepaliDigits(index + 1)}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="font-mono font-bold text-slate-900 block">
                          {lab?.sampleCode || act.refNo}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          परीक्षण: {toNepaliDigits(lab?.testedDate || act.nepaliDate)}
                        </span>
                      </td>
                      <td className="max-w-56 px-3.5 py-3">
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {lab?.sampleName || act.title}
                        </span>
                        <span className="text-[10px] text-blue-900 block mt-0.5 truncate">
                          {lab?.specifiedStandard || 'IS / NS Standard'}
                        </span>
                      </td>
                      <td className="max-w-48 px-3.5 py-3">
                        <span className="font-medium text-slate-800 block">
                          {lab?.projectName || act.entityName}
                        </span>
                        {lab?.locationChainage && (
                          <span className="text-[10px] text-slate-500 block font-mono">
                            स्थान: {lab.locationChainage}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-slate-700">
                        {lab?.requiredValue !== undefined
                          ? `${toNepaliDigits(lab.requiredValue)} ${lab.unit || ''}`
                          : '-'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                        {lab?.obtainedValue !== undefined
                          ? `${toNepaliDigits(lab.obtainedValue)} ${lab.unit || ''}`
                          : '-'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono">
                        {lab?.variancePercentage !== undefined ? (
                          <span
                            className={`font-semibold ${
                              lab.variancePercentage < 0
                                ? 'text-red-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {lab.variancePercentage > 0 ? '+' : ''}
                            {toNepaliDigits(lab.variancePercentage)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          {isPass ? (
                            <>
                              <Check className="h-3 w-3" />
                              PASS
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              FAIL
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setCertificateActivity(act)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] transition-colors border border-blue-200 shadow-2xs"
                        >
                          <Award className="h-3.5 w-3.5 text-blue-700" />
                          प्रमाणपत्र हेर्नुहोस्
                        </button>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="सम्पादन गर्नुहोस्"
                            onClick={() => openEditForm(act)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="मेटाउनुहोस्"
                            disabled={deletingId === act.id}
                            onClick={() => handleDeleteSample(act)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    यस आर्थिक वर्षमा हाल कुनै प्रयोगशाला परीक्षण नमूना दर्ता गरिएको छैन।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Official Government Lab Certificate Modal */}
      {certificateActivity &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 overflow-y-auto">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-3xl max-h-[96vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
            >
              {/* Header Action Bar */}
              <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white print:hidden">
                <span className="text-xs font-semibold tracking-wide">
                  प्रयोगशाला परीक्षण आधिकारिक प्रमाणपत्र (Material Quality Certificate)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    प्रमाणपत्र प्रिन्ट
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertificateActivity(null)}
                    aria-label="बन्द गर्नुहोस्"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable Certificate Sheet */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 print:p-0 print:overflow-visible">
                {/* Official Letterhead */}
                <div className="text-center pb-4 border-b-2 border-red-700/80 relative">
                  <div className="flex justify-center mb-2">
                    <img
                      src="/coa.png"
                      alt="नेपालको निशान छाप"
                      className="h-20 w-auto object-contain drop-shadow-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-700">नेपाल सरकार</p>
                    <p className="text-xs font-bold text-slate-800">
                      प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय
                    </p>
                    <h1 className="text-2xl font-black text-[#002B49] tracking-tight">
                      राष्ट्रिय सतर्कता केन्द्र
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      प्राविधिक परीक्षण तथा अनुगमन महाशाखा
                    </p>
                    <p className="text-sm font-bold text-blue-900">
                      केन्द्रीय निर्माण सामग्री प्रयोगशाला (Central Materials Testing Laboratory)
                    </p>
                    <p className="text-[11px] text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 font-medium">
                    <div>
                      <span>प्रमाणपत्र नं.: </span>
                      <span className="font-mono font-bold text-blue-950">
                        {certificateActivity.labTestDetails?.sampleCode ||
                          certificateActivity.refNo}
                      </span>
                    </div>
                    <div>
                      <span>आ.व.: </span>
                      <span className="font-bold">
                        {toNepaliDigits(certificateActivity.fiscalYear)}
                      </span>
                    </div>
                    <div>
                      <span>जारी मिति: </span>
                      <span className="font-bold">
                        {toNepaliDigits(
                          certificateActivity.labTestDetails?.testedDate ||
                            certificateActivity.nepaliDate
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Certificate Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-extrabold text-[#002B49] underline decoration-red-700 decoration-2 underline-offset-4">
                    निर्माण सामग्री गुणस्तर परीक्षण प्रमाणपत्र (Quality Test Certificate)
                  </h2>
                  <p className="text-xs text-slate-600">
                    केन्द्रको प्राविधिक परीक्षण कार्यविधि अनुसार प्रयोगशालामा संकलित नमूनाको
                    प्राविधिक परीक्षण सम्पन्न गरी यो प्रमाणपत्र जारी गरिएको छ।
                  </p>
                </div>

                {/* Project & Sample Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">आयोजनाको नाम:</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {certificateActivity.labTestDetails?.projectName ||
                        certificateActivity.entityName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">स्थान / Chainage:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {certificateActivity.labTestDetails?.locationChainage || 'आयोजना स्थल'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">नमूना संकलन मिति:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {toNepaliDigits(
                        certificateActivity.labTestDetails?.collectionDate || '२०८३-०७-१०'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">परीक्षण विधि तथा मापदण्ड:</span>
                    <span className="font-semibold text-blue-900 block mt-0.5">
                      {certificateActivity.labTestDetails?.specifiedStandard || 'IS / NS'}
                    </span>
                  </div>
                </div>

                {/* Test Result Data Box */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left">परीक्षण पारामिटर (Parameter)</th>
                        <th className="px-4 py-2.5 text-center">तोकिएको मापदण्ड (Required)</th>
                        <th className="px-4 py-2.5 text-center">प्रयोगशाला नतिजा (Obtained)</th>
                        <th className="px-4 py-2.5 text-center">फरक (Variance %)</th>
                        <th className="px-4 py-2.5 text-center">गुणस्तर स्थिति</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {certificateActivity.labTestDetails?.sampleName ||
                            certificateActivity.title}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                          {toNepaliDigits(
                            certificateActivity.labTestDetails?.requiredValue ?? 25
                          )}{' '}
                          {certificateActivity.labTestDetails?.unit}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 text-sm">
                          {toNepaliDigits(
                            certificateActivity.labTestDetails?.obtainedValue ?? 25
                          )}{' '}
                          {certificateActivity.labTestDetails?.unit}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span
                            className={
                              (certificateActivity.labTestDetails?.variancePercentage ?? 0) < 0
                                ? 'text-red-700'
                                : 'text-emerald-700'
                            }
                          >
                            {(certificateActivity.labTestDetails?.variancePercentage ?? 0) > 0
                              ? '+'
                              : ''}
                            {toNepaliDigits(
                              certificateActivity.labTestDetails?.variancePercentage ?? 0
                            )}
                            %
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${
                              certificateActivity.labTestDetails?.result === 'pass'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            {certificateActivity.labTestDetails?.result === 'pass'
                              ? 'मापदण्ड अनुरुप (PASS)'
                              : 'मापदण्ड विपरित (FAIL)'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Remarks & Laboratory Assessment */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-1">
                  <span className="font-bold text-slate-700">
                    प्रयोगशाला राय तथा निष्कर्ष (Laboratory Assessment):
                  </span>
                  <p className="text-slate-800 leading-relaxed font-sans">
                    {certificateActivity.labTestDetails?.remarks ||
                      (certificateActivity.labTestDetails?.result === 'pass'
                        ? 'परीक्षण गरिएको निर्माण सामग्री निर्धारित प्राविधिक मापदण्ड (Specification) बमोजिम गुणस्तरीय रहेको प्रमाणित गरिन्छ।'
                        : 'परीक्षण गरिएको निर्माण सामग्री तोकिएको प्राविधिक मापदण्ड भन्दा कम गुणस्तरको पाइएकोले सम्बन्धित कार्य अस्वीकृत गर्न तथा पुनः परीक्षण गराउन सिफारिस गरिन्छ।')}
                  </p>
                </div>

                {/* 3-Tier Sign-off */}
                <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                    <p className="font-bold text-slate-900">
                      {certificateActivity.labTestDetails?.technicianName || 'प्रयोगशाला प्राविधिक'}
                    </p>
                    <p className="text-[10px] text-slate-500">ल्याब प्राविधिक / सहायक इन्जिनियर</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                    <p className="font-bold text-slate-900">
                      {certificateActivity.labTestDetails?.verifiedBy ||
                        'गुणस्तर नियन्त्रण इन्जिनियर'}
                    </p>
                    <p className="text-[10px] text-slate-500">जाँच गर्ने इन्जिनियर</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                    <p className="font-bold text-slate-900">प्रयोगशाला प्रमुख / सि.डि.ई.</p>
                    <p className="text-[10px] text-slate-500">वरिष्ठ प्राविधिक अधिकृत</p>
                  </div>
                </div>

                {/* Footer Stamp */}
                <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                  राष्ट्रिय सतर्कता केन्द्र · केन्द्रीय निर्माण सामग्री प्रयोगशाला · सिंहदरबार, काठमाडौं
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* New / Edit Sample Form Modal */}
      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 overflow-y-auto">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-2xl max-h-[96vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
            >
              <header className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/30 text-blue-300 font-bold text-xs">
                    LIMS
                  </span>
                  <h3 className="text-sm font-bold">
                    {editingActivity
                      ? 'प्रयोगशाला नमूना सम्पादन'
                      : 'नयाँ प्रयोगशाला परीक्षण नमूना दर्ता'}
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg p-1 text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <form onSubmit={handleSaveSample} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto p-6 text-xs">
                  {/* Material Type Selection Tabs */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      परीक्षण गरिने निर्माण सामग्री छान्नुहोस् *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(
                        Object.keys(MATERIAL_PRESETS) as Array<LabTestDetails['sampleType']>
                      ).map((type) => {
                        const isSelected = sampleType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleSelectMaterialType(type)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-600/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <span className="font-bold text-xs block leading-tight">
                              {MATERIAL_PRESETS[type].nameNe.split('(')[0]}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {MATERIAL_PRESETS[type].unit}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sample Identification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        नमूना कोड (Sample Code) *
                      </label>
                      <input
                        type="text"
                        required
                        value={sampleCode}
                        onChange={(e) => setSampleCode(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        आयोजना / कार्यालयको नाम *
                      </label>
                      <input
                        type="text"
                        required
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="उदा: नागढुङ्गा सुरुङमार्ग निर्माण आयोजना"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        संकलन गरिएको स्थल (Chainage / Location)
                      </label>
                      <input
                        type="text"
                        value={locationChainage}
                        onChange={(e) => setLocationChainage(e.target.value)}
                        placeholder="उदा: Ch. 12+450, Pier No. 3"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        परीक्षण मापदण्ड (Standard / Specification)
                      </label>
                      <input
                        type="text"
                        value={specifiedStandard}
                        onChange={(e) => setSpecifiedStandard(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {/* Test Parameters & Live Auto Calculation */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <h4 className="font-bold text-blue-950 text-xs flex items-center justify-between">
                      <span>परीक्षण मान तथा स्वचालित नतिजा विश्लेषण</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          calculatedResult.pass
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {calculatedResult.pass ? 'मापदण्ड अनुरुप (PASS)' : 'मापदण्ड विपरित (FAIL)'}
                      </span>
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          तोकिएको न्यूनतम मान
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={requiredValue}
                          onChange={(e) => setRequiredValue(parseFloat(e.target.value) || 0)}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          प्रयोगशाला प्राप्त मान
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={obtainedValue}
                          onChange={(e) => setObtainedValue(parseFloat(e.target.value) || 0)}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          मापन एकाइ
                        </label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-600">
                        फरक दर (Variance Percentage):
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          calculatedResult.variance < 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {calculatedResult.variance > 0 ? '+' : ''}
                        {toNepaliDigits(calculatedResult.variance)}%
                      </span>
                    </div>
                  </div>

                  {/* Dates and Personnel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        नमूना संकलन मिति
                      </label>
                      <NepaliDatePicker
                        value={collectionDate}
                        onChange={(date) => setCollectionDate(date)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        प्रयोगशाला परीक्षण मिति
                      </label>
                      <NepaliDatePicker
                        value={testedDate}
                        onChange={(date) => setTestedDate(date)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        परीक्षण गर्ने प्राविधिकको नाम
                      </label>
                      <input
                        type="text"
                        value={technicianName}
                        onChange={(e) => setTechnicianName(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        जाँच तथा प्रमाणीकरण अधिकृत
                      </label>
                      <input
                        type="text"
                        value={verifiedBy}
                        onChange={(e) => setVerifiedBy(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      प्रयोगशाला कैफियत तथा राय (Remarks)
                    </label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="कुनै विशेष कैफियत वा निर्देशन..."
                      className={`${inputClassName} resize-y`}
                    />
                  </div>

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
                    {saving ? 'सुरक्षित हुँदैछ...' : 'नमूना सुरक्षित गरी नतिजा प्रमाणित गर्नुहोस्'}
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

