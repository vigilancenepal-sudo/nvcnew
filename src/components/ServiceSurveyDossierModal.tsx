import React from 'react';
import { ActivityRecord, ServiceSurveyDetails } from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  ShieldAlert,
  MessageSquareText,
} from 'lucide-react';

interface ServiceSurveyDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
}

const QUESTIONS: Array<{ key: string; label: string }> = [
  { key: 'charterInfo', label: '१. नागरिक बडापत्रको बारेमा जानकारी छ?' },
  { key: 'serviceCostInfo', label: '२. सेवाको लागि लाग्ने समय र दस्तुरको पूर्व जानकारी छ?' },
  { key: 'serviceOnTime', label: '३. तोकिएको समयमै काम सम्पन्न भयो?' },
  { key: 'outsideHelp', label: '४. सेवा प्राप्त गर्न बाहिरी व्यक्तिको सहयोग लिनुपर्‍यो?' },
  { key: 'extraMoney', label: '५. अतिरिक्त रकम (घुस/कमिसन) मागियो वा दिनुपर्‍यो?' },
  { key: 'serviceSatisfaction', label: '६. कार्यालयको सेवा प्रवाह र गुणस्तरप्रति सन्तुष्टि स्तर' },
  { key: 'rightToInfo', label: '७. सूचनाको हक (Right to Information) सम्बन्धमा जानकारी छ?' },
  { key: 'complaint', label: '८. काममा ढिलासुस्ती हुँदा गुनासो वा उजुरी गर्नुभएको छ?' },
  { key: 'publicHearing', label: '९. सार्वजनिक सुनुवाइ वा सामाजिक परीक्षणमा सहभागी हुनुभएको छ?' },
  { key: 'developmentInfo', label: '१०. स्थानीय विकास निर्माणको कामबारे पूर्व जानकारी छ?' },
];

export const ServiceSurveyDossierModal: React.FC<ServiceSurveyDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
}) => {
  if (!activity) return null;

  const record: ServiceSurveyDetails = {
    province: activity.serviceSurveyDetails?.province ?? '',
    districtEn: activity.serviceSurveyDetails?.districtEn ?? activity.districtEn ?? '',
    localLevel: activity.serviceSurveyDetails?.localLevel ?? '',
    fullAddress: activity.serviceSurveyDetails?.fullAddress ?? '',
    gender: activity.serviceSurveyDetails?.gender ?? 'अन्य',
    previousOffices: activity.serviceSurveyDetails?.previousOffices ?? [],
    serviceOffice:
      activity.serviceSurveyDetails?.serviceOffice ??
      activity.entityName ??
      activity.title ??
      '',
    improvements: activity.serviceSurveyDetails?.improvements ?? '',
    goodServiceOffices: activity.serviceSurveyDetails?.goodServiceOffices ?? '',
    weakServiceOffices: activity.serviceSurveyDetails?.weakServiceOffices ?? '',
    answers: activity.serviceSurveyDetails?.answers ?? {},
    dissatisfactionReasons: activity.serviceSurveyDetails?.dissatisfactionReasons ?? [],
    surveyDate:
      activity.serviceSurveyDetails?.surveyDate ??
      activity.investigationDate ??
      activity.nepaliDate ??
      '',
  };

  const isSatisfied = record.answers.serviceSatisfaction === 'सन्तुष्ट';
  const hasExtraMoney = record.answers.extraMoney === 'पर्‍यो';
  const hasOutsideHelp = record.answers.outsideHelp === 'पर्‍यो';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl max-h-[96vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/30 text-blue-300 text-xs font-bold">
              NVC
            </span>
            <span className="text-sm font-semibold tracking-wide">
              सेवाग्राही सन्तुष्टि सर्वेक्षण मिसिल (Citizen Feedback Dossier)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(activity);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="h-3.5 w-3.5" />
                सम्पादन
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              मिसिल प्रिन्ट
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="बन्द गर्नुहोस्"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 print:p-0 print:space-y-4 print:overflow-visible">
          {/* Official Letterhead */}
          <div className="text-center pb-5 border-b-2 border-red-700/80 relative">
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
              <h1 className="text-xl md:text-2xl font-black text-[#002B49] tracking-tight">
                राष्ट्रिय सतर्कता केन्द्र
              </h1>
              <p className="text-xs font-medium text-slate-600">
                प्रशासन तथा सूचना सङ्कलन महाशाखा · सूचना सङ्कलन तथा अनुगमन शाखा
              </p>
              <p className="text-[11px] text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">सर्वेक्षण कोड:</span>
                <span className="font-bold text-[#002B49] font-mono">
                  {toNepaliDigits(activity.refNo || activity.id.slice(0, 8))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">आर्थिक वर्ष:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(activity.fiscalYear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">सर्वेक्षण मिति:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(record.surveyDate || activity.nepaliDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Citizen Perception & Public Service Satisfaction Audit Report
              </span>
              <h2 className="text-base font-bold text-[#002B49]">
                सेवाग्राही सन्तुष्टि एवं सार्वजनिक सेवा प्रवाह सर्वेक्षण स्थलगत मिसिल
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  isSatisfied
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {isSatisfied ? 'सेवाप्रति सन्तुष्ट' : 'सेवाप्रति असन्तुष्ट'}
              </span>
            </div>
          </div>

          {/* Critical Governance Red Flags Banner (If Extra Money or Intermediaries reported) */}
          {(hasExtraMoney || hasOutsideHelp) && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 border-l-4 border-red-600 rounded-xl shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-950">
                  सुशासन जोखिम संकेत (Governance Integrity Warning)
                </h3>
                <p className="mt-1 text-xs text-red-800 leading-relaxed">
                  यस सेवाग्राही सर्वेक्षणमा{' '}
                  {hasExtraMoney && <b>अतिरिक्त रकम (घुस/कमिसन) तिर्नुपरेको</b>}
                  {hasExtraMoney && hasOutsideHelp && ' र '}
                  {hasOutsideHelp && <b>बिचौलिया/बाहिरी व्यक्तिको सहयोग लिनुपरेको</b>}{' '}
                  प्रतिक्रिया प्राप्त भएको छ। यस सम्बन्धमा सम्बन्धित कार्यालयमा तत्काल आकस्मिक
                  छानविन गर्न सिफारिस गरिन्छ।
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Office & Respondent Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Building2 className="h-4 w-4 text-blue-800" />
              १. सेवा प्रदायक कार्यालय तथा सेवाग्राहीको विवरण
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सम्बन्धित कार्यालय:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {record.serviceOffice || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">स्थान / जिल्ला / स्थानीय तह:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {DISTRICT_NE_MAP[record.districtEn] || record.districtEn || '-'}, {record.localLevel || ''} ({record.province || '-'})
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सेवाग्राहीको पूरा ठेगाना:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.fullAddress || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सेवाग्राहीको लिङ्ग:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {record.gender || 'गोप्य'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 md:col-span-2">
                <span className="text-[11px] font-medium text-slate-500 block">पछिल्लो वर्ष सेवा लिएका अन्य कार्यालयहरू:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.previousOffices.filter(Boolean).join(' · ') || 'कुनै छैन'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: 10-Question Survey Responses */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <MessageSquareText className="h-4 w-4 text-blue-800" />
              २. सर्वेक्षणका प्रश्नहरू तथा सेवाग्राहीको प्रतिक्रिया
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">सर्वेक्षण प्रश्न (Survey Question)</th>
                    <th className="px-3.5 py-2.5 text-right w-56">सेवाग्राहीको जवाफ (Response)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUESTIONS.map((q) => {
                    const ans = record.answers[q.key] || '-';
                    const isWarning =
                      ans === 'छैन' && (q.key === 'charterInfo' || q.key === 'serviceCostInfo' || q.key === 'serviceOnTime') ||
                      ans === 'पर्‍यो' && (q.key === 'extraMoney' || q.key === 'outsideHelp') ||
                      ans === 'असन्तुष्ट';

                    return (
                      <tr key={q.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">
                          {q.label}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                              isWarning
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {ans}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Subjective Feedback & Best/Weak Offices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-1.5">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-800" />
                सेवा प्रवाह सुधारका लागि सेवाग्राहीको सुझाव
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {record.improvements || 'कर्मचारीको संख्या थप गर्नुपर्ने र टोकन प्रणाली लागू गर्नुपर्ने।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                असन्तुष्टिका मुख्य कारणहरू (Reasons for Dissatisfaction)
              </h4>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                {record.dissatisfactionReasons.join(', ') ||
                  record.answers.otherReason ||
                  'कर्मचारी समयमा नभेटिएको र काममा अनावश्यक ढिलासुस्ती।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-1.5">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4 text-emerald-700" />
                राम्रो सेवा प्रवाह गर्ने कार्यालयहरू (Good Performing Offices)
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {record.goodServiceOffices || 'जिल्ला प्रशासन कार्यालय, यातायात व्यवस्था कार्यालय'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-1.5">
              <h4 className="font-bold text-red-950 flex items-center gap-1.5">
                <ThumbsDown className="h-4 w-4 text-red-700" />
                सेवा प्रवाह कमजोर / अनियमित कार्यालयहरू (Weak/Irregular Offices)
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {record.weakServiceOffices || 'नापी कार्यालय, मालपोत कार्यालय'}
              </p>
            </div>
          </div>

          {/* Section 4: Official Multi-Tier Sign-off */}
          <section className="pt-6 border-t-2 border-slate-300">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-8">
              प्रमाणीकरण तथा सिफारिस खण्ड (Official Verification & Sign-off)
            </p>
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                <p className="font-bold text-slate-900">सर्वेक्षणकर्ता / अनुगमन अधिकृत</p>
                <p className="text-[10px] text-slate-500">शाखा अधिकृत</p>
                <p className="text-[10px] text-slate-400">मिति: ........................</p>
              </div>

              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                <p className="font-bold text-slate-900">शाखा प्रमुख</p>
                <p className="text-[10px] text-slate-500">उप-सचिव</p>
                <p className="text-[10px] text-slate-400">मिति: ........................</p>
              </div>

              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                <p className="font-bold text-slate-900">महाशाखा प्रमुख</p>
                <p className="text-[10px] text-slate-500">सह-सचिव</p>
                <p className="text-[10px] text-slate-400">मिति: ........................</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
            यो राष्ट्रिय सतर्कता केन्द्रको एकीकृत व्यवस्थापन सूचना प्रणाली (NVC-MIS) बाट सिर्जना गरिएको
            आधिकारिक सेवाग्राही सर्वेक्षण मिसिल हो।
          </div>
        </div>
      </div>
    </div>
  );
};

