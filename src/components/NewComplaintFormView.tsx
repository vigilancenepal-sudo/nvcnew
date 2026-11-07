import React, { useState, useEffect, useRef } from 'react';
import { supabase, OperationType, handleSupabaseError } from '../supabase';
import {
  ComplaintRecord,
  ComplaintSource,
  ComplaintStatus,
  ComplaintPriority,
  FiscalYear,
  MahashakhaId,
  RoleLevel,
  ShakhaId,
} from '../types/nvc';
import {
  NEPALI_YEARS,
  NEPALI_MONTHS,
  MINISTRIES_LIST,
  COMPLAINT_NATURES,
  FINAL_DECISION_TYPES,
  COMPLAINT_SOURCE_LABELS,
  PROVINCES_DATA,
  DISTRICT_NE_MAP,
  getLocalLevelsForDistrict,
  getProvinceForDistrict,
  MAHASHAKHAS,
  SHAKHAS,
  toNepaliDigits,
  fromNepaliDigits,
} from '../data/nvcStructure';
import {
  FilePenLine,
  Info,
  Hash,
  Calendar,
  User,
  Phone,
  UserX,
  Landmark,
  MapPinned,
  Map,
  MapPin,
  Building2,
  FileText,
  PenLine,
  Gavel,
  Stamp,
  Hourglass,
  StickyNote,
  Mic,
  MicOff,
  X,
  Save,
  CheckCircle2,
  GitBranch,
  UserCheck,
  CheckSquare,
  Send,
  ArrowLeft,
  Trash2,
  Tag,
  Globe,
} from 'lucide-react';

interface NewComplaintFormViewProps {
  currentUid: string;
  effectiveRole: RoleLevel;
  effectiveMahashakhaId: string;
  effectiveShakhaId: string;
  selectedFiscalYear: FiscalYear;
  editingComplaint?: ComplaintRecord | null;
  onCancel: () => void;
  onSaved: () => void;
}

type VoiceFieldKey = 'description' | 'decision' | 'finalDecision' | 'progressNote';

export const NewComplaintFormView: React.FC<NewComplaintFormViewProps> = ({
  currentUid,
  effectiveRole,
  effectiveMahashakhaId,
  effectiveShakhaId,
  selectedFiscalYear,
  editingComplaint,
  onCancel,
  onSaved,
}) => {
  // Section 1: आधारभूत जानकारी
  const [dartaNo, setDartaNo] = useState('');
  const [dartaYear, setDartaYear] = useState('२०८३');
  const [dartaMonthIdx, setDartaMonthIdx] = useState(7); // कार्तिक (1-based)
  const [dartaDay, setDartaDay] = useState(16);
  const [complainant, setComplainant] = useState('');
  const [complainantContact, setComplainantContact] = useState('');
  const [respondent, setRespondent] = useState('');
  const [ministry, setMinistry] = useState('');
  const [source, setSource] = useState<ComplaintSource>('kendra_darta');
  const [nature, setNature] = useState<string>(COMPLAINT_NATURES[0]);
  const [priority, setPriority] = useState<ComplaintPriority>('मध्यम');

  // Section 2: स्थान जानकारी
  const [province, setProvince] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [localLevel, setLocalLevel] = useState('');

  // Section 3: उजुरी विवरण
  const [description, setDescription] = useState('');

  // Section 4: समितिको निर्णय
  const [committeeDecision, setCommitteeDecision] = useState('');

  // Section 5 & 6 (Additional Edit Form Components: शाखा जिम्मेवारी, छानविन अधिकृत, पत्राचार, अन्तिम निर्णय र प्रगति विवरण)
  const [assignedMahashakhaId, setAssignedMahashakhaId] = useState<MahashakhaId>('maha_admin');
  const [assignedShakhaId, setAssignedShakhaId] = useState<ShakhaId>('shakha_info_complaint');
  const [investigationOfficer, setInvestigationOfficer] = useState('');
  const [patracharChalaniNo, setPatracharChalaniNo] = useState('');
  const [finalDecision, setFinalDecision] = useState('');
  const [finalDecisionType, setFinalDecisionType] = useState('');
  const [finalYear, setFinalYear] = useState('');
  const [finalMonthIdx, setFinalMonthIdx] = useState<string>('');
  const [finalDay, setFinalDay] = useState<string>('');
  const [implYear, setImplYear] = useState('');
  const [implMonthIdx, setImplMonthIdx] = useState<string>('');
  const [implDay, setImplDay] = useState<string>('');
  const [progressNote, setProgressNote] = useState('');

  // स्थिति + कैफियत
  const [status, setStatus] = useState<ComplaintStatus>('kam_baki');
  const [remarks, setRemarks] = useState('');

  // Voice Dictation State
  const [listeningField, setListeningField] = useState<VoiceFieldKey | null>(null);
  const recognitionRef = useRef<any>(null);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingComplaint) {
      setDartaNo(editingComplaint.dartaNo);
      const parts = editingComplaint.nepaliDate.split('-');
      if (parts.length === 3) {
        setDartaYear(parts[0]);
        const mNum = parseInt(fromNepaliDigits(parts[1]), 10);
        const dNum = parseInt(fromNepaliDigits(parts[2]), 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) setDartaMonthIdx(mNum);
        if (!isNaN(dNum) && dNum >= 1 && dNum <= 32) setDartaDay(dNum);
      }
      setComplainant(editingComplaint.complainant === 'बेनामी' ? '' : editingComplaint.complainant);
      setComplainantContact(
        editingComplaint.complainantContact && editingComplaint.complainantContact !== '-'
          ? editingComplaint.complainantContact
          : ''
      );
      setRespondent(
        editingComplaint.respondent && editingComplaint.respondent !== '-'
          ? editingComplaint.respondent
          : ''
      );
      setMinistry(
        editingComplaint.ministry && editingComplaint.ministry !== '-'
          ? editingComplaint.ministry
          : ''
      );
      setSource(editingComplaint.source || 'kendra_darta');
      setNature(editingComplaint.nature || COMPLAINT_NATURES[0]);
      setPriority(editingComplaint.priority || 'मध्यम');

      const prov =
        editingComplaint.province || getProvinceForDistrict(editingComplaint.districtEn);
      setProvince(prov);
      setDistrictEn(editingComplaint.districtEn || '');
      setLocalLevel(
        editingComplaint.localLevel && editingComplaint.localLevel !== '-'
          ? editingComplaint.localLevel
          : ''
      );

      setDescription(editingComplaint.title || '');
      setCommitteeDecision(
        editingComplaint.committeeDecision && editingComplaint.committeeDecision !== '-'
          ? editingComplaint.committeeDecision
          : ''
      );

      setAssignedMahashakhaId(editingComplaint.mahashakhaId || 'maha_admin');
      setAssignedShakhaId(editingComplaint.shakhaId || 'shakha_info_complaint');
      setInvestigationOfficer(
        editingComplaint.investigationOfficer && editingComplaint.investigationOfficer !== '-'
          ? editingComplaint.investigationOfficer
          : ''
      );
      setPatracharChalaniNo(
        editingComplaint.patracharChalaniNo && editingComplaint.patracharChalaniNo !== '-'
          ? editingComplaint.patracharChalaniNo
          : ''
      );
      setFinalDecision(
        editingComplaint.finalDecision && editingComplaint.finalDecision !== '-'
          ? editingComplaint.finalDecision
          : ''
      );
      setFinalDecisionType(
        editingComplaint.finalDecisionType && editingComplaint.finalDecisionType !== '-'
          ? editingComplaint.finalDecisionType
          : ''
      );

      if (editingComplaint.finalDecisionDate && editingComplaint.finalDecisionDate !== '-') {
        const fParts = editingComplaint.finalDecisionDate.split('-');
        if (fParts.length === 3) {
          setFinalYear(fParts[0]);
          setFinalMonthIdx(String(parseInt(fromNepaliDigits(fParts[1]), 10) || ''));
          setFinalDay(String(parseInt(fromNepaliDigits(fParts[2]), 10) || ''));
        }
      } else {
        setFinalYear('');
        setFinalMonthIdx('');
        setFinalDay('');
      }

      if (
        editingComplaint.implementationInfoDate &&
        editingComplaint.implementationInfoDate !== '-'
      ) {
        const iParts = editingComplaint.implementationInfoDate.split('-');
        if (iParts.length === 3) {
          setImplYear(iParts[0]);
          setImplMonthIdx(String(parseInt(fromNepaliDigits(iParts[1]), 10) || ''));
          setImplDay(String(parseInt(fromNepaliDigits(iParts[2]), 10) || ''));
        }
      } else {
        setImplYear('');
        setImplMonthIdx('');
        setImplDay('');
      }

      setProgressNote(
        editingComplaint.progressNote && editingComplaint.progressNote !== '-'
          ? editingComplaint.progressNote
          : ''
      );
      setStatus(editingComplaint.status || 'kam_baki');
      setRemarks(
        editingComplaint.remarks && editingComplaint.remarks !== '-'
          ? editingComplaint.remarks
          : ''
      );
    } else {
      const randNum = Math.floor(1000 + Math.random() * 8999);
      setDartaNo(`NVC-२०८३-${toNepaliDigits(randNum)}`);
      setDartaYear('२०८३');
      setDartaMonthIdx(7);
      setDartaDay(16);
      setComplainant('');
      setComplainantContact('');
      setRespondent('');
      setMinistry('');
      setSource('kendra_darta');
      setNature(COMPLAINT_NATURES[0]);
      setPriority('मध्यम');
      setProvince('');
      setDistrictEn('');
      setLocalLevel('');
      setDescription('');
      setCommitteeDecision('');

      const defaultMaha: MahashakhaId =
        effectiveRole === 'admin'
          ? 'maha_admin'
          : (effectiveMahashakhaId as MahashakhaId);
      const defaultShakha: ShakhaId =
        effectiveRole === 'shakha'
          ? (effectiveShakhaId as ShakhaId)
          : SHAKHAS.find((s) => s.mahashakhaId === defaultMaha)?.id || 'shakha_info_complaint';

      setAssignedMahashakhaId(defaultMaha);
      setAssignedShakhaId(defaultShakha);
      setInvestigationOfficer('');
      setPatracharChalaniNo('');
      setFinalDecision('');
      setFinalDecisionType('');
      setFinalYear('');
      setFinalMonthIdx('');
      setFinalDay('');
      setImplYear('');
      setImplMonthIdx('');
      setImplDay('');
      setProgressNote('');
      setStatus('kam_baki');
      setRemarks('');
    }
  }, [editingComplaint, effectiveRole, effectiveMahashakhaId, effectiveShakhaId]);

  const selectedProvinceObj = PROVINCES_DATA.find((p) => p.nameNe === province);
  const availableDistricts = selectedProvinceObj ? selectedProvinceObj.districtsEn : [];
  const availableLocalLevels = districtEn ? getLocalLevelsForDistrict(districtEn) : [];
  const availableShakhasForMaha = SHAKHAS.filter(
    (s) => s.mahashakhaId === assignedMahashakhaId
  );

  const handleVoiceToggle = (field: VoiceFieldKey) => {
    if (listeningField === field) {
      recognitionRef.current?.stop();
      setListeningField(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFormError('तपाईंको ब्राउजरमा आवाज पहिचान (Voice Input) सुविधा उपलब्ध छैन।');
      return;
    }

    try {
      recognitionRef.current?.stop();
      const recognition = new SpeechRecognition();
      recognition.lang = 'ne-NP';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setListeningField(field);
        setFormError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (!transcript) return;
        if (field === 'description') {
          setDescription((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.slice(0, 1500));
        } else if (field === 'decision') {
          setCommitteeDecision((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.slice(0, 1000));
        } else if (field === 'finalDecision') {
          setFinalDecision((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.slice(0, 500));
        } else if (field === 'progressNote') {
          setProgressNote((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.slice(0, 1000));
        }
      };

      recognition.onerror = () => setListeningField(null);
      recognition.onend = () => setListeningField(null);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListeningField(null);
    }
  };

  const handleResetOrCancel = () => {
    recognitionRef.current?.stop();
    setListeningField(null);
    onCancel();
  };

  const handleDeleteCurrentComplaint = async () => {
    if (!editingComplaint) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', editingComplaint.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, `complaints/${editingComplaint.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!dartaNo.trim()) {
      setFormError('दर्ता नं अनिवार्य छ।');
      return;
    }
    if (!respondent.trim()) {
      setFormError('विपक्षीको नाम अनिवार्य छ।');
      return;
    }
    if (!description.trim()) {
      setFormError('उजुरीको विवरण अनिवार्य छ।');
      return;
    }

    setSaving(true);

    const formattedMonth = toNepaliDigits(String(dartaMonthIdx).padStart(2, '0'));
    const formattedDay = toNepaliDigits(String(dartaDay).padStart(2, '0'));
    const nepaliDateStr = `${dartaYear}-${formattedMonth}-${formattedDay}`;

    const finalDecisionDateStr =
      finalYear && finalMonthIdx && finalDay
        ? `${finalYear}-${toNepaliDigits(String(finalMonthIdx).padStart(2, '0'))}-${toNepaliDigits(
            String(finalDay).padStart(2, '0')
          )}`
        : '-';

    const implementationInfoDateStr =
      implYear && implMonthIdx && implDay
        ? `${implYear}-${toNepaliDigits(String(implMonthIdx).padStart(2, '0'))}-${toNepaliDigits(
            String(implDay).padStart(2, '0')
          )}`
        : '-';

    const resolvedDistrict = districtEn || 'Kathmandu';
    const resolvedProvince = province || getProvinceForDistrict(resolvedDistrict);

    const resolvedFiscalYear: FiscalYear =
      dartaYear === '२०८२'
        ? '2082/83'
        : dartaYear === '२०८१'
        ? '2081/82'
        : selectedFiscalYear;

    try {
      if (editingComplaint) {
        if (editingComplaint.status === 'farchhaut' && effectiveRole !== 'admin') {
          const { error } = await supabase.from('complaints').update({
            implementationInfoDate: implementationInfoDateStr,
            progressNote: (progressNote.trim() || '-').slice(0, 1000),
            remarks: (remarks.trim() || '-').slice(0, 500),
            updatedAt: new Date().toISOString(),
          }).eq('id', editingComplaint.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('complaints').update({
            dartaNo: dartaNo.trim().slice(0, 80),
            title: description.trim().slice(0, 1500),
            complainant: (complainant.trim() || 'बेनामी').slice(0, 200),
            complainantContact: (complainantContact.trim() || '-').slice(0, 120),
            respondent: respondent.trim().slice(0, 240),
            source,
            ministry: (ministry || '-').slice(0, 160),
            nature: (nature || COMPLAINT_NATURES[0]).slice(0, 120),
            priority,
            province: resolvedProvince.slice(0, 80),
            districtEn: resolvedDistrict,
            localLevel: (localLevel || '-').slice(0, 140),
            committeeDecision: (committeeDecision.trim() || '-').slice(0, 1000),
            finalDecision: (
              finalDecision.trim() ||
              finalDecisionType.trim() ||
              (status === 'farchhaut' ? 'फर्छ्यौट / तामेली' : '-')
            ).slice(0, 500),
            finalDecisionType: (finalDecisionType.trim() || '-').slice(0, 160),
            finalDecisionDate: finalDecisionDateStr,
            implementationInfoDate: implementationInfoDateStr,
            investigationOfficer: (investigationOfficer.trim() || '-').slice(0, 140),
            patracharChalaniNo: (patracharChalaniNo.trim() || '-').slice(0, 80),
            progressNote: (progressNote.trim() || '-').slice(0, 1000),
            status,
            remarks: (remarks.trim() || '-').slice(0, 500),
            mahashakhaId: assignedMahashakhaId,
            shakhaId: assignedShakhaId,
            nepaliDate: nepaliDateStr,
            monthIndex: dartaMonthIdx,
            fiscalYear: resolvedFiscalYear,
            updatedAt: new Date().toISOString(),
          }).eq('id', editingComplaint.id);
          if (error) throw error;
        }
        setToastMsg(`उजुरी दर्ता नं. ${dartaNo} सफलतापूर्वक अद्यावधिक गरियो।`);
      } else {
        const newId = `cmp_${Date.now()}`;
        const { error } = await supabase.from('complaints').insert({
          id: newId,
          dartaNo: dartaNo.trim().slice(0, 80),
          title: description.trim().slice(0, 1500),
          complainant: (complainant.trim() || 'बेनामी').slice(0, 200),
          complainantContact: (complainantContact.trim() || '-').slice(0, 120),
          respondent: respondent.trim().slice(0, 240),
          source,
          ministry: (ministry || '-').slice(0, 160),
          nature: (nature || COMPLAINT_NATURES[0]).slice(0, 120),
          status,
          priority,
          province: resolvedProvince.slice(0, 80),
          districtEn: resolvedDistrict,
          localLevel: (localLevel || '-').slice(0, 140),
          committeeDecision: (committeeDecision.trim() || '-').slice(0, 1000),
          finalDecision: status === 'farchhaut' ? 'फर्छ्यौट / तामेली' : '-',
          finalDecisionType: '-',
          finalDecisionDate: '-',
          implementationInfoDate: '-',
          investigationOfficer: '-',
          patracharChalaniNo: '-',
          progressNote: '-',
          remarks: (remarks.trim() || '-').slice(0, 500),
          fiscalYear: resolvedFiscalYear,
          monthIndex: dartaMonthIdx,
          nepaliDate: nepaliDateStr,
          mahashakhaId: assignedMahashakhaId,
          shakhaId: assignedShakhaId,
          createdByUid: currentUid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (error) throw error;
        setToastMsg(`नयाँ उजुरी (दर्ता नं. ${dartaNo}) सफलतापूर्वक सुरक्षित गरियो।`);
      }

      setTimeout(() => {
        onSaved();
      }, 700);
    } catch (err) {
      handleSupabaseError(
        err,
        editingComplaint ? OperationType.UPDATE : OperationType.CREATE,
        'complaints'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel-elevated rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
            <FilePenLine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">
                {editingComplaint ? 'उजुरी विवरण सम्पादन फारम' : 'नयाँ उजुरी दर्ता फारम'}
              </h2>
              {editingComplaint && (
                <span className="text-xs font-semibold text-blue-900 font-mono-num">
                  · दर्ता नं: {editingComplaint.dartaNo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              सबै <span className="text-red-600 font-semibold">*</span> चिह्न भएका फिल्ड अनिवार्य छन्
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetOrCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>सूचीमा फर्कनुहोस्</span>
        </button>
      </div>

      {/* Edit Mode Summary Strip */}
      {editingComplaint && (
        <div className="px-6 py-3 bg-blue-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <span>
              <strong className="text-slate-900">मूल दर्ता मिति:</strong>{' '}
              <span className="font-mono-num">{editingComplaint.nepaliDate}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              <strong className="text-slate-900">आर्थिक वर्ष:</strong>{' '}
              <span className="font-mono-num">{toNepaliDigits(editingComplaint.fiscalYear)}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              <strong className="text-slate-900">उजुरी स्रोत:</strong>{' '}
              {COMPLAINT_SOURCE_LABELS[source]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">हालको स्थिति:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
              className="px-2.5 py-1 border border-blue-200 rounded bg-white text-xs font-semibold text-blue-950 focus:outline-none focus:border-blue-800"
            >
              <option value="kam_baki">काम बाँकी</option>
              <option value="chalu">चालु</option>
              <option value="patrachar_baki">पत्राचार बाँकी</option>
              <option value="chhanbin_ma">छानविनमा रहेको</option>
              <option value="farchhaut">फर्छ्यौट भएको</option>
            </select>
          </div>
        </div>
      )}

      {formError && (
        <div className="mx-6 mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
          {formError}
        </div>
      )}

      {toastMsg && (
        <div className="mx-6 mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toastMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-7 text-xs">
        {/* १. आधारभूत जानकारी */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-950 font-bold text-sm">
            <Info className="w-4 h-4 text-blue-700" />
            <span>आधारभूत जानकारी</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* दर्ता नं * */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>दर्ता नं</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={dartaNo}
                onChange={(e) => setDartaNo(e.target.value)}
                placeholder="NVC-YYYY-NNNN"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
              />
            </div>

            {/* दर्ता मिति * */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>दर्ता मिति</span>
                <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={dartaYear}
                  onChange={(e) => setDartaYear(e.target.value)}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                >
                  {NEPALI_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <select
                  value={dartaMonthIdx}
                  onChange={(e) => setDartaMonthIdx(Number(e.target.value))}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                >
                  {NEPALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={dartaDay}
                  onChange={(e) => setDartaDay(Number(e.target.value))}
                  className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                >
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {toNepaliDigits(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* उजुरकर्ताको नाम */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>उजुरकर्ताको नाम</span>
              </label>
              <input
                type="text"
                value={complainant}
                onChange={(e) => setComplainant(e.target.value)}
                placeholder="पूरा नाम"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
              />
            </div>

            {/* विपक्षी * */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <UserX className="w-3.5 h-3.5 text-slate-500" />
                <span>विपक्षी</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={respondent}
                onChange={(e) => setRespondent(e.target.value)}
                placeholder="विपक्षीको नाम"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* मन्त्रालय/निकाय */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Landmark className="w-3.5 h-3.5 text-slate-500" />
                <span>मन्त्रालय/निकाय</span>
              </label>
              <select
                value={ministry}
                onChange={(e) => setMinistry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                <option value="">छान्नुहोस्</option>
                {MINISTRIES_LIST.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* उजुरीको स्रोत र प्रकृति (Shown in Edit Form & optionally usable) */}
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>उजुरीको माध्यम (स्रोत)</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ComplaintSource)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                <option value="kendra_darta">केन्द्रमा दर्ता</option>
                <option value="hello_sarkar">हेलो सरकार</option>
                <option value="online">अनलाइन उजुरी</option>
                <option value="hotline">हटलाइन उजुरी</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>उजुरीको प्रकृति</span>
              </label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                {COMPLAINT_NATURES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <span>प्राथमिकता तह</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                <option value="उच्च">उच्च</option>
                <option value="मध्यम">मध्यम</option>
                <option value="सामान्य">सामान्य</option>
              </select>
            </div>
          </div>

          {editingComplaint && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>उजुरकर्ताको सम्पर्क / इमेल</span>
                </label>
                <input
                  type="text"
                  value={complainantContact}
                  onChange={(e) => setComplainantContact(e.target.value)}
                  placeholder="फोन नं वा इमेल ठेगाना"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>
          )}
        </section>

        {/* २. स्थान जानकारी */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-950 font-bold text-sm">
            <MapPinned className="w-4 h-4 text-blue-700" />
            <span>स्थान जानकारी</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Map className="w-3.5 h-3.5 text-slate-500" />
                <span>प्रदेश</span>
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setDistrictEn('');
                  setLocalLevel('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                <option value="">प्रदेश छान्नुहोस्</option>
                {PROVINCES_DATA.map((p) => (
                  <option key={p.id} value={p.nameNe}>
                    {p.nameNe}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>जिल्ला</span>
              </label>
              <select
                value={districtEn}
                disabled={!province}
                onChange={(e) => {
                  setDistrictEn(e.target.value);
                  setLocalLevel('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:border-blue-800"
              >
                <option value="">
                  {province ? 'जिल्ला छान्नुहोस्' : 'पहिला प्रदेश छान्नुहोस्'}
                </option>
                {availableDistricts.map((dEn) => (
                  <option key={dEn} value={dEn}>
                    {DISTRICT_NE_MAP[dEn] || dEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>स्थानीय तह</span>
              </label>
              <select
                value={localLevel}
                disabled={!districtEn}
                onChange={(e) => setLocalLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:border-blue-800"
              >
                <option value="">
                  {districtEn ? 'स्थानीय तह छान्नुहोस्' : 'पहिला जिल्ला छान्नुहोस्'}
                </option>
                {availableLocalLevels.map((ll) => (
                  <option key={ll} value={ll}>
                    {ll}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ३. उजुरी विवरण */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-950 font-bold text-sm">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>उजुरी विवरण</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 font-semibold text-slate-700">
              <PenLine className="w-3.5 h-3.5 text-slate-500" />
              <span>उजुरीको विवरण</span>
              <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => handleVoiceToggle('description')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                listeningField === 'description'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50'
              }`}
            >
              {listeningField === 'description' ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
              <span>{listeningField === 'description' ? 'रोक्नुहोस्' : 'आवाज'}</span>
            </button>
          </div>

          <textarea
            required
            rows={4}
            maxLength={1500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="उजुरीको संक्षिप्त विवरण लेख्नुहोस्..."
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800 resize-y"
          />
          <div className="text-[11px] text-slate-400 font-mono-num">
            {toNepaliDigits(description.length)}/१५०० अक्षर
          </div>
        </section>

        {/* ४. शाखा जिम्मेवारी, छानविन अधिकृत तथा पत्राचार विवरण (Additional Edit Form Components) */}
        {editingComplaint && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-950 font-bold text-sm">
              <GitBranch className="w-4 h-4 text-blue-700" />
              <span>शाखा जिम्मेवारी, छानविन तथा पत्राचार विवरण</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>जिम्मेवार महाशाखा</span>
                </label>
                <select
                  value={assignedMahashakhaId}
                  disabled={effectiveRole === 'shakha'}
                  onChange={(e) => {
                    const mId = e.target.value as MahashakhaId;
                    setAssignedMahashakhaId(mId);
                    const firstShakha = SHAKHAS.find((s) => s.mahashakhaId === mId);
                    if (firstShakha) setAssignedShakhaId(firstShakha.id);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-blue-800"
                >
                  {MAHASHAKHAS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameNe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  <span>जिम्मेवार शाखा</span>
                </label>
                <select
                  value={assignedShakhaId}
                  disabled={effectiveRole === 'shakha'}
                  onChange={(e) => setAssignedShakhaId(e.target.value as ShakhaId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-blue-800"
                >
                  {availableShakhasForMaha.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameNe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>तोकिएको अनुसन्धान / छानविन अधिकृत</span>
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={investigationOfficer}
                  onChange={(e) => setInvestigationOfficer(e.target.value)}
                  placeholder="अधिकृतको नाम र पद"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  <span>पत्राचार चलानी नं. / मिति</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={patracharChalaniNo}
                  onChange={(e) => setPatracharChalaniNo(e.target.value)}
                  placeholder="उदा: च.नं. ४५२ / २०८३-०७-१०"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>
          </section>
        )}

        {/* ५. समितिको निर्णय तथा अन्तिम निर्णय */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-950 font-bold text-sm">
            <Gavel className="w-4 h-4 text-blue-700" />
            <span>
              {editingComplaint
                ? 'समितिको निर्णय, अन्तिम निर्णय तथा फछ्र्यौट विवरण'
                : 'समितिको निर्णय'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Stamp className="w-3.5 h-3.5 text-slate-500" />
                <span>निर्णय विवरण (उजुरी व्यवस्थापन समिति)</span>
              </label>
              <button
                type="button"
                onClick={() => handleVoiceToggle('decision')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  listeningField === 'decision'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50'
                }`}
              >
                {listeningField === 'decision' ? (
                  <MicOff className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
                <span>{listeningField === 'decision' ? 'रोक्नुहोस्' : 'आवाज'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              maxLength={1000}
              value={committeeDecision}
              onChange={(e) => setCommitteeDecision(e.target.value)}
              placeholder="उजुरी व्यवस्थापन समितिको निर्णय"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800 resize-y"
            />
            <div className="text-[11px] text-slate-400 font-mono-num">
              {toNepaliDigits(committeeDecision.length)}/१००० अक्षर
            </div>
          </div>

          {/* Edit Mode Extra Components: अन्तिम निर्णयको प्रकार, अन्तिम निर्णय मिति, कार्यान्वयनको जानकारी प्राप्त मिति, अन्तिम निर्णय र कारबाही प्रगति */}
          {editingComplaint && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* १. अन्तिम निर्णयको प्रकार */}
                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                    <Gavel className="w-3.5 h-3.5 text-slate-500" />
                    <span>अन्तिम निर्णयको प्रकार</span>
                  </label>
                  <select
                    value={finalDecisionType}
                    onChange={(e) => setFinalDecisionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                  >
                    <option value="">छान्नुहोस्</option>
                    {FINAL_DECISION_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* २. अन्तिम निर्णय / फर्छ्यौट मिति */}
                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>अन्तिम निर्णय / फर्छ्यौट मिति</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={finalYear}
                      onChange={(e) => setFinalYear(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">साल</option>
                      {NEPALI_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <select
                      value={finalMonthIdx}
                      onChange={(e) => setFinalMonthIdx(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">महिना</option>
                      {NEPALI_MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={finalDay}
                      onChange={(e) => setFinalDay(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">गते</option>
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {toNepaliDigits(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ३. कार्यान्वयनको जानकारी प्राप्त मिति */}
                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>कार्यान्वयनको जानकारी प्राप्त मिति</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={implYear}
                      onChange={(e) => setImplYear(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">साल</option>
                      {NEPALI_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <select
                      value={implMonthIdx}
                      onChange={(e) => setImplMonthIdx(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">महिना</option>
                      {NEPALI_MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={implDay}
                      onChange={(e) => setImplDay(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
                    >
                      <option value="">गते</option>
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {toNepaliDigits(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>केन्द्रको अन्तिम निर्णय विवरण</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleVoiceToggle('finalDecision')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                        listeningField === 'finalDecision'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>आवाज</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={finalDecision}
                    onChange={(e) => setFinalDecision(e.target.value)}
                    placeholder="अन्तिम निर्णय वा निर्देशनको विस्तृत व्यहोरा..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800 resize-y"
                  />
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    {toNepaliDigits(finalDecision.length)}/५०० अक्षर
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>कारबाही प्रगति / राय प्रतिक्रिया विवरण</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleVoiceToggle('progressNote')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                        listeningField === 'progressNote'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>आवाज</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="सम्बन्धित निकायबाट प्राप्त जवाफ वा हालसम्मको छानविन प्रगति..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800 resize-y"
                  />
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    {toNepaliDigits(progressNote.length)}/१००० अक्षर
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* स्थिति * र कैफियत */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Hourglass className="w-3.5 h-3.5 text-slate-500" />
                <span>स्थिति</span>
                <span className="text-red-600">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800"
              >
                <option value="kam_baki">काम बाँकी</option>
                <option value="chalu">चालु</option>
                <option value="patrachar_baki">पत्राचार बाँकी</option>
                <option value="chhanbin_ma">छानविनमा रहेको</option>
                <option value="farchhaut">फर्छ्यौट भएको</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <StickyNote className="w-3.5 h-3.5 text-slate-500" />
                <span>कैफियत</span>
              </label>
              <input
                type="text"
                maxLength={500}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="कैफियत"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            {editingComplaint && (effectiveRole === 'admin' || editingComplaint.status !== 'farchhaut') && (
              <>
                {confirmDelete ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-red-700 font-semibold">के यो उजुरी पक्का हटाउने हो?</span>
                    <button
                      type="button"
                      onClick={handleDeleteCurrentComplaint}
                      className="px-3 py-1.5 bg-red-700 text-white font-semibold rounded-md cursor-pointer"
                    >
                      हो, हटाउनुहोस्
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md cursor-pointer"
                    >
                      रद्द
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-md font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>उजुरी हटाउनुहोस्</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetOrCancel}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>रद्द गर्नुहोस्</span>
            </button>

            <button
              type="submit"
              disabled={saving || !dartaNo.trim() || !respondent.trim() || !description.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-500 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'अद्यावधिक हुँदैछ...'
                  : editingComplaint
                  ? 'परिवर्तन सुरक्षित गर्नुहोस्'
                  : 'सुरक्षित गर्नुहोस्'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
