import React from 'react';
import {
  ComplaintRecord,
} from '../types/nvc';
import {
  COMPLAINT_SOURCE_LABELS,
  COMPLAINT_STATUS_LABELS,
  DISTRICT_NE_MAP,
  getMahashakhaName,
  getShakhaName,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  SquarePen,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  FileText,
  Building2,
  Landmark,
  User,
  Phone,
  FileCheck2,
  AlertTriangle,
  Scale,
  Send,
  Calendar,
} from 'lucide-react';

interface ComplaintDossierModalProps {
  complaint: ComplaintRecord | null;
  onClose: () => void;
  onEdit?: (cmp: ComplaintRecord) => void;
}

export const ComplaintDossierModal: React.FC<ComplaintDossierModalProps> = ({
  complaint,
  onClose,
  onEdit,
}) => {
  if (!complaint) return null;

  const isFarchhaut = complaint.status === 'farchhaut';
  const hasCommitteeDecision = Boolean(complaint.committeeDecision && complaint.committeeDecision !== '-');
  const hasFinalDecision = Boolean(
    (complaint.finalDecision && complaint.finalDecision !== '-') ||
    (complaint.finalDecisionType && complaint.finalDecisionType !== '-')
  );
  const hasOfficer = Boolean(complaint.investigationOfficer && complaint.investigationOfficer !== '-');
  const hasChalani = Boolean(complaint.patracharChalaniNo && complaint.patracharChalaniNo !== '-');
  const isCiaaReferral =
    complaint.finalDecisionType?.includes('अख्तियार') ||
    complaint.finalDecision?.includes('अख्तियार');

  // 7-Stage Government Workflow Determination
  const stages = [
    {
      id: 1,
      title: 'उजुरी दर्ता',
      subtitle: `${COMPLAINT_SOURCE_LABELS[complaint.source]} · ${complaint.nepaliDate}`,
      completed: true,
      current: false,
    },
    {
      id: 2,
      title: 'प्रारम्भिक छानविन / तोक',
      subtitle: getShakhaName(complaint.shakhaId),
      completed: true,
      current: false,
    },
    {
      id: 3,
      title: 'छानविन अधिकृत तोकिएको',
      subtitle: hasOfficer ? (complaint.investigationOfficer || '') : 'अधिकृत तोक्न बाँकी',
      completed: hasOfficer || isFarchhaut,
      current: !hasOfficer && !isFarchhaut && (complaint.status === 'chhanbin_ma' || complaint.status === 'chalu'),
    },
    {
      id: 4,
      title: 'पत्राचार तथा प्रमाण संकलन',
      subtitle: hasChalani ? `चलानी नं: ${complaint.patracharChalaniNo}` : 'पत्राचार प्रक्रियामा',
      completed: hasChalani || isFarchhaut,
      current: hasOfficer && !hasChalani && !isFarchhaut,
    },
    {
      id: 5,
      title: 'समितिको निर्णय / प्रतिवेदन',
      subtitle: hasCommitteeDecision ? 'समिति राय प्राप्त' : 'प्रतिवेदन पेश हुन बाँकी',
      completed: hasCommitteeDecision || isFarchhaut,
      current: hasChalani && !hasCommitteeDecision && !isFarchhaut,
    },
    {
      id: 6,
      title: 'केन्द्रको अन्तिम निर्णय',
      subtitle: hasFinalDecision ? (complaint.finalDecisionType || 'निर्णय भएको') : 'निर्णयार्थ पेश',
      completed: hasFinalDecision || isFarchhaut,
      current: hasCommitteeDecision && !hasFinalDecision && !isFarchhaut,
    },
    {
      id: 7,
      title: 'कार्यान्वयन तथा फर्स्यौट',
      subtitle: isFarchhaut ? 'फर्स्यौट सम्पन्न' : 'कार्यान्वयन फलो-अप बाँकी',
      completed: isFarchhaut,
      current: hasFinalDecision && !isFarchhaut,
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="glass-panel-elevated rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/90 text-xs text-slate-800 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar (Screen Only) */}
        <div className="px-5 py-3.5 bg-blue-950 text-white flex items-center justify-between rounded-t-2xl border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/95 p-0.5 border border-white/20 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/coa.png"
                alt="नेपालको निशान छाप"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-red-300 tracking-wider">नेपाल सरकार · प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय</span>
              <h3 className="text-sm font-bold text-white leading-tight">
                राष्ट्रिय सतर्कता केन्द्र — उजुरी तथा छानविन डिजिटल मिसिल (E-Dossier)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="मिसिल छाप्नुहोस् / PDF सेभ गर्नुहोस्"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">मिसिल छाप्नुहोस्</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(complaint)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <SquarePen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">सम्पादन</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="बन्द गर्नुहोस्"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dossier Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Official Letterhead Header for Government Record & Printing */}
          <div className="text-center pb-4 border-b-2 border-slate-200/80 space-y-1 relative">
            <div className="flex justify-center mb-1">
              <img
                src="/coa.png"
                alt="नेपालको निशान छाप"
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="text-xs font-bold text-red-700 uppercase tracking-widest">
              नेपाल सरकार · प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय
            </div>
            <h1 className="text-lg sm:text-xl font-black text-blue-950 tracking-tight">
              राष्ट्रिय सतर्कता केन्द्र
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              सिंहदरबार, काठमाडौँ · उजुरी छानविन तथा अनुसन्धान डिजिटल मिसिल
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-950 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-mono-num text-[13px]">
                  दर्ता नं: {complaint.dartaNo}
                </span>
                <span className="text-slate-600 font-medium">
                  दर्ता मिति: <strong className="font-mono-num text-slate-900">{complaint.nepaliDate}</strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">
                  आ.व.: <strong className="font-mono-num text-slate-900">{toNepaliDigits(complaint.fiscalYear)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                    isFarchhaut
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : complaint.status === 'patrachar_baki' || complaint.status === 'kam_baki'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  स्थिति: {COMPLAINT_STATUS_LABELS[complaint.status]}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                    complaint.priority === 'उच्च'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : complaint.priority === 'मध्यम'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  प्राथमिकता: {complaint.priority || 'मध्यम'}
                </span>
              </div>
            </div>
          </div>

          {/* 7-Stage Lifecycle Stepper (उजुरी कार्यप्रवाह जीवनचक्र) */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-900" />
                उजुरी छानविन तथा फर्स्यौट कार्यप्रवाह (7-Stage Lifecycle Tracker)
              </span>
              <span className="text-[11px] text-slate-500">
                वर्तमान अवस्था:{' '}
                <strong className="text-blue-950 font-semibold">
                  {COMPLAINT_STATUS_LABELS[complaint.status]}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {stages.map((stg) => (
                <div
                  key={stg.id}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    stg.completed
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : stg.current
                      ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/40'
                      : 'bg-white border-slate-200 text-slate-400 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {stg.completed ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    ) : stg.current ? (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse">
                        {toNepaliDigits(stg.id)}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                        {toNepaliDigits(stg.id)}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-[11px] leading-tight line-clamp-1">{stg.title}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1 truncate" title={stg.subtitle}>
                    {stg.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CIAA / Anti-Corruption Special Notice Banner */}
          {isCiaaReferral && (
            <div className="p-3.5 bg-red-50 border-l-4 border-red-700 rounded-r-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-red-900 font-bold">
                <ShieldAlert className="w-4 h-4 text-red-700" />
                <span>अख्तियार दुरुपयोग अनुसन्धान आयोग (CIAA) रिफरल उजुरी</span>
              </div>
              <p className="text-red-800 leading-relaxed text-[11px]">
                राष्ट्रिय सतर्कता केन्द्रको छानविन तथा निर्णयानुसार भ्रष्टाचार/अनियमितता पुष्टि भई आवश्यक थप अनुसन्धान एवम् मुद्दा दायरका लागि सम्बन्धित प्रमाण सहित अख्तियार दुरुपयोग अनुसन्धान आयोगमा लेखी पठाइएको।
              </p>
            </div>
          )}

          {/* Section 1: उजुरकर्ता, विपक्षी र भौगोलिक स्थान */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-blue-900" />
              खण्ड १: पक्ष/विपक्ष तथा भौगोलिक क्षेत्राधिकार
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">उजुरकर्ता (निवेदक)</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {complaint.complainant || 'बेनामी'}
                </span>
                {complaint.complainantContact && complaint.complainantContact !== '-' && (
                  <span className="text-[11px] text-blue-900 font-mono-num flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {complaint.complainantContact}
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">विपक्षी (प्रतिवादी)</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {complaint.respondent || '-'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">सार्वजनिक पदधारक / निकाय</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">सम्बद्ध मन्त्रालय / निकाय</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block truncate" title={complaint.ministry}>
                  {complaint.ministry || '-'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">सम्बन्धित मन्त्रालयगत क्षेत्र</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">स्थान (जिल्ला / स्थानीय तह)</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {DISTRICT_NE_MAP[complaint.districtEn] || complaint.districtEn}
                  {complaint.localLevel && complaint.localLevel !== '-' ? ` · ${complaint.localLevel}` : ''}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {complaint.province || 'नेपाल'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: उजुरीको पूर्ण विषय र व्यहोरा */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <FileText className="w-3.5 h-3.5 text-blue-900" />
              खण्ड २: उजुरीको व्यहोरा तथा आरोप विवरण
            </h4>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-100 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-blue-950 text-xs">
                  विषय: {complaint.title}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-900">
                  प्रकृति: {complaint.nature}
                </span>
              </div>
              <p className="text-slate-800 leading-relaxed text-xs whitespace-pre-wrap">
                {complaint.title}
              </p>
            </div>
          </div>

          {/* Section 3: छानविन प्रक्रिया, तोक आदेश र पत्राचार */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Landmark className="w-3.5 h-3.5 text-blue-900" />
              खण्ड ३: आन्तरिक कारबाही, जिम्मेवार शाखा तथा पत्राचार ट्र्याकिङ
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">जिम्मेवार शाखा</span>
                <span className="font-bold text-blue-950 text-xs mt-0.5 block">
                  {getShakhaName(complaint.shakhaId)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {getMahashakhaName(complaint.mahashakhaId)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">छानविन अधिकृत / संयोजक</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {complaint.investigationOfficer && complaint.investigationOfficer !== '-'
                    ? complaint.investigationOfficer
                    : 'तोक्न बाँकी'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">जिम्मेवार अनुसन्धानकर्ता</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-[10px] block">पत्राचार चलानी नं.</span>
                <span className="font-bold font-mono-num text-slate-900 text-xs mt-0.5 block">
                  {complaint.patracharChalaniNo && complaint.patracharChalaniNo !== '-'
                    ? complaint.patracharChalaniNo
                    : 'पत्राचार नभएको'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">आधिकारिक चलानी अभिलेख</span>
              </div>
            </div>

            {complaint.progressNote && complaint.progressNote !== '-' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold text-[11px] block mb-1">
                  कारबाही प्रगति / राय प्रतिक्रिया विवरण:
                </span>
                <p className="text-slate-800 leading-relaxed text-xs">
                  {complaint.progressNote}
                </p>
              </div>
            )}
          </div>

          {/* Section 4: समितिको निर्णय र केन्द्रको अन्तिम निर्णय */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Scale className="w-3.5 h-3.5 text-blue-900" />
              खण्ड ४: छानविन समिति तथा केन्द्रको अन्तिम निर्णय
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-600 font-bold text-[11px] mb-1">
                  छानविन समितिको निर्णय तथा राय:
                </div>
                <p className="text-slate-800 leading-relaxed text-xs">
                  {complaint.committeeDecision && complaint.committeeDecision !== '-'
                    ? complaint.committeeDecision
                    : 'समितिको निर्णय प्राप्त हुन बाँकी।'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold text-[11px]">
                    केन्द्रको अन्तिम निर्णय:
                  </span>
                  {complaint.finalDecisionDate && complaint.finalDecisionDate !== '-' && (
                    <span className="text-[10px] font-mono-num text-slate-500">
                      मिति: {complaint.finalDecisionDate}
                    </span>
                  )}
                </div>

                {complaint.finalDecisionType && complaint.finalDecisionType !== '-' && (
                  <div className="text-blue-900 font-bold text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200/60 inline-block">
                    प्रकार: {complaint.finalDecisionType}
                  </div>
                )}

                <p className="text-slate-800 leading-relaxed text-xs">
                  {complaint.finalDecision && complaint.finalDecision !== '-'
                    ? complaint.finalDecision
                    : 'केन्द्रबाट अन्तिम निर्णय हुन बाँकी।'}
                </p>

                {complaint.implementationInfoDate && complaint.implementationInfoDate !== '-' && (
                  <div className="pt-2 border-t border-slate-200 text-emerald-800 font-semibold text-[11px] font-mono-num">
                    कार्यान्वयनको जानकारी प्राप्त मिति: {complaint.implementationInfoDate}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: कैफियत */}
          {complaint.remarks && complaint.remarks !== '-' && (
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70">
              <span className="text-amber-900 font-bold text-[11px] block">कैफियत / टिप्पणी:</span>
              <p className="text-slate-800 text-xs mt-0.5 leading-relaxed">
                {complaint.remarks}
              </p>
            </div>
          )}

          {/* Section 6: Official Signatures Section for Record & Printing */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 w-32 mx-auto" />
              <div>
                <span className="font-bold text-slate-800 block">तयार गर्ने</span>
                <span className="text-[10px] text-slate-500 block">फाँटवाला / सहायक</span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 w-32 mx-auto" />
              <div>
                <span className="font-bold text-slate-800 block">जाँच गर्ने</span>
                <span className="text-[10px] text-slate-500 block">शाखा अधिकृत</span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 w-32 mx-auto" />
              <div>
                <span className="font-bold text-slate-800 block">सिफारिस गर्ने</span>
                <span className="text-[10px] text-slate-500 block">महाशाखा प्रमुख</span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 w-32 mx-auto" />
              <div>
                <span className="font-bold text-slate-800 block">निर्णय / स्वीकृत गर्ने</span>
                <span className="text-[10px] text-slate-500 block">सचिव / केन्द्र प्रमुख</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            राष्ट्रिय सतर्कता केन्द्र · भ्रष्टाचार निवारण ऐन, २०५९
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              छाप्नुहोस्
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(complaint);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <SquarePen className="w-3.5 h-3.5" />
                सम्पादन
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              बन्द गर्नुहोस्
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

