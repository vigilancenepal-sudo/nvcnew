import React from 'react';
import { ActivityRecord, ProjectMonitoringDetails } from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  Wrench,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  TrendingUp,
  Scale,
  Users,
  FileCheck,
} from 'lucide-react';

const CHECK_SECTIONS: Array<{
  key: string;
  title: string;
  items: Array<{ key: string; label: string }>;
}> = [
  {
    key: 'objective',
    title: '१. उद्देश्य तथा लक्ष्य अनुरूप कार्यान्वयन',
    items: [
      { key: 'objectiveAligned', label: 'आयोजना निर्धारित उद्देश्य अनुरूप कार्यान्वयन भए/नभएको' },
      { key: 'targetClear', label: 'आयोजनाको लक्ष्य (Target) स्पष्ट रूपमा तोकिए/नतोकिएको' },
      { key: 'progressOnTarget', label: 'तोकिएको लक्ष्य अनुरूप काम प्रगति भए/नभएको' },
      { key: 'feasibilityStudy', label: 'सम्भाव्यता अध्ययन (Feasibility Study) गरिएको/नगरिएको' },
    ],
  },
  {
    key: 'quality',
    title: '२. गुणस्तर तथा प्राविधिक पक्ष (Quality Assurance & Lab Testing)',
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
    title: '३. आर्थिक तथा समय व्यवस्थापन (Financial & Schedule Control)',
    items: [
      { key: 'budgetAvailable', label: 'आयोजनाका लागि बजेट विनियोजन र निकासा समयमा भए/नभएको' },
      { key: 'scheduleProgress', label: 'तोकिएको समय तालिका (Schedule) अनुसार काम अगाडि बढे/नबढेको' },
      { key: 'revisedEstimate', label: 'निर्माण कार्य पुनर्मूल्याङ्कन गरिएको लागतभित्र सम्पन्न हुने देखिए/नदेखिएको' },
      { key: 'costOverrun', label: 'म्याद थप वा लागत वृद्धि (Variation/Cost Overrun) भए/नभएको' },
    ],
  },
  {
    key: 'procurement',
    title: '४. खरिद प्रक्रिया तथा सम्झौता परिपालना',
    items: [
      { key: 'transparentProcurement', label: 'सेवा, वस्तु वा निर्माण सामग्री खरिद प्रक्रिया पारदर्शी ढङ्गले भए/नभएको' },
      { key: 'procurementLaw', label: 'खरिद ऐन/नियम बमोजिमको प्रक्रिया पूरा गरिएको/नगरिएको' },
      { key: 'contractGuarantee', label: 'ठेक्का सम्झौता र बीमा/जमानतपत्र (Guarantee) यथास्थित रहे/नरहेको' },
    ],
  },
  {
    key: 'outcome',
    title: '५. उपलब्धि, दिगोपन र लागत प्रभावकारिता',
    items: [
      { key: 'outcomesAchieved', label: 'आयोजनाबाट अपेक्षित उपलब्धि हासिल हुने देखिए/नदेखिएको' },
      { key: 'sustainability', label: 'आयोजनाको दिगोपन (Sustainability) सुनिश्चित भए/नभएको' },
      { key: 'costEffectiveness', label: 'लागतको प्रभावकारिता (Cost Effectiveness) रहे/नरहेको' },
      { key: 'operationMaintenance', label: 'सञ्चालन तथा मर्मत-सम्भारको जिम्मेवारी स्पष्ट तोकिए/नतोकिएको' },
    ],
  },
];

interface ProjectMonitoringDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
  onOpenAttachment?: (path: string) => void;
}

export const ProjectMonitoringDossierModal: React.FC<ProjectMonitoringDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
  onOpenAttachment,
}) => {
  if (!activity) return null;

  const details: ProjectMonitoringDetails = {
    projectName:
      activity.projectMonitoringDetails?.projectName ?? activity.title ?? '',
    province: activity.projectMonitoringDetails?.province ?? '',
    districtEn:
      activity.projectMonitoringDetails?.districtEn ?? activity.districtEn ?? '',
    localLevel: activity.projectMonitoringDetails?.localLevel ?? '',
    fullAddress: activity.projectMonitoringDetails?.fullAddress ?? '',
    wardNo: activity.projectMonitoringDetails?.wardNo ?? '',
    implementingAgency:
      activity.projectMonitoringDetails?.implementingAgency ??
      activity.relatedAgency ??
      activity.entityName ??
      '',
    contractorName: activity.projectMonitoringDetails?.contractorName ?? '',
    agreementNo: activity.projectMonitoringDetails?.agreementNo ?? '',
    agreementDate: activity.projectMonitoringDetails?.agreementDate ?? '',
    startDate: activity.projectMonitoringDetails?.startDate ?? '',
    expectedCompletionDate:
      activity.projectMonitoringDetails?.expectedCompletionDate ?? '',
    approvedCost: activity.projectMonitoringDetails?.approvedCost ?? 0,
    paidAmount: activity.projectMonitoringDetails?.paidAmount ?? 0,
    physicalProgress: activity.projectMonitoringDetails?.physicalProgress ?? 0,
    inspectionDate:
      activity.projectMonitoringDetails?.inspectionDate ??
      activity.investigationDate ??
      activity.nepaliDate ??
      '',
    checks: activity.projectMonitoringDetails?.checks ?? {},
    overallRemarks:
      activity.projectMonitoringDetails?.overallRemarks ??
      activity.reportSummary ??
      activity.complaintDetails ??
      '',
    recommendation: activity.projectMonitoringDetails?.recommendation ?? '',
    team: activity.projectMonitoringDetails?.team ?? [],
    status: activity.projectMonitoringDetails?.status ?? 'ongoing',
  };

  const statusMap = {
    planned: { label: 'योजना अवस्थामा', bg: 'bg-teal-50 text-teal-800 border-teal-300' },
    ongoing: { label: 'प्रगतिमा', bg: 'bg-blue-50 text-blue-800 border-blue-300' },
    completed: { label: 'सम्पन्न', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    delayed: { label: 'लक्ष्यभन्दा पछाडि', bg: 'bg-amber-50 text-amber-800 border-amber-300' },
  };

  const currentStatus = statusMap[details.status] || statusMap.ongoing;

  const financialProgress =
    details.approvedCost > 0
      ? Math.min(100, Math.round((details.paidAmount / details.approvedCost) * 100))
      : 0;

  const progressGap = financialProgress - details.physicalProgress;
  const isFinancialAhead = progressGap > 5;

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return 'रु. ०.००';
    return `रु. ${toNepaliDigits(val.toLocaleString('en-IN'))}/-`;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl max-h-[95vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/30 text-blue-300 text-xs font-bold">
              NVC
            </span>
            <span className="text-sm font-semibold tracking-wide">
              आयोजना अनुगमन मिसिल (Project Monitoring Dossier)
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
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
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
                प्राविधिक परीक्षण तथा अनुगमन महाशाखा · प्राविधिक छानविन तथा अनुगमन शाखा
              </p>
              <p className="text-[11px] text-slate-500">
                सिंहदरबार, काठमाडौं, नेपाल
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">सम्झौता / दर्ता नं:</span>
                <span className="font-bold text-[#002B49] font-mono">
                  {details.agreementNo ? toNepaliDigits(details.agreementNo) : toNepaliDigits(activity.dartaNo || activity.id.slice(0, 8))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">आर्थिक वर्ष:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(activity.fiscalYear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">अनुगमन मिति:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(details.inspectionDate || activity.nepaliDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Project Field Monitoring & Progress Evaluation Report
              </span>
              <h2 className="text-base font-bold text-[#002B49]">
                आयोजना स्थलगत अनुगमन विस्तृत प्रतिवेदन एवं मूल्याङ्कन मिसिल
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border shadow-2xs ${currentStatus.bg}`}
              >
                {currentStatus.label}
              </span>
            </div>
          </div>

          {/* S-Curve & Progress Dual Meter */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-800" />
                भौतिक तथा वित्तीय प्रगति तुलनात्मक विश्लेषण
              </span>
              {isFinancialAhead && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  वित्तीय खर्च भौतिक प्रगतिभन्दा {toNepaliDigits(progressGap)}% बढी
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Physical Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">स्थलगत भौतिक प्रगति:</span>
                  <span className="text-blue-900 font-mono font-bold text-sm">
                    {toNepaliDigits(details.physicalProgress)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, details.physicalProgress)}%` }}
                  />
                </div>
              </div>

              {/* Financial Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">हालसम्मको वित्तीय खर्च प्रगति:</span>
                  <span className="text-emerald-800 font-mono font-bold text-sm">
                    {toNepaliDigits(financialProgress)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, financialProgress)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Project & Location Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Building2 className="h-4 w-4 text-blue-800" />
              १. आयोजना तथा सम्झौता सम्बन्धी विवरण
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">आयोजनाको नाम:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {details.projectName || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">कार्यान्वयन गर्ने निकाय:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {details.implementingAgency || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">निर्माण व्यवसायी / ठेकेदार:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {details.contractorName || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">जिल्ला तथा स्थानीय तह:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {DISTRICT_NE_MAP[details.districtEn] || details.districtEn || '-'}, {details.localLevel || ''} {details.wardNo ? `(वडा नं. ${toNepaliDigits(details.wardNo)})` : ''}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">पूरा ठेगाना / स्थान:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {details.fullAddress || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सम्झौता नम्बर:</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {details.agreementNo ? toNepaliDigits(details.agreementNo) : '-'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Financial Details & Dates */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Calendar className="h-4 w-4 text-blue-800" />
              २. लागत विवरण तथा आयोजना कार्यतालिका
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">स्वीकृत लागत अनुमान:</span>
                <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                  {formatCurrency(details.approvedCost)}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">हालसम्म भुक्तानी / खर्च रकम:</span>
                <span className="font-bold text-emerald-800 mt-0.5 block font-mono">
                  {formatCurrency(details.paidAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सम्झौता मिति:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.agreementDate ? toNepaliDigits(details.agreementDate) : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सम्पन्न हुनुपर्ने मिति:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.expectedCompletionDate ? toNepaliDigits(details.expectedCompletionDate) : '-'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: 5-Dimensional Checklist Evaluation */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Scale className="h-4 w-4 text-blue-800" />
              ३. पाँच-आयामीय स्थलगत प्राविधिक जाँच सूची (Field Inspection Checklist)
            </h3>
            <div className="space-y-3">
              {CHECK_SECTIONS.map((section) => (
                <div
                  key={section.key}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white"
                >
                  <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-[#002B49]">{section.title}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="px-3 py-2 text-left font-semibold">निरीक्षण गरिएको विषय</th>
                          <th className="w-24 px-3 py-2 text-center font-semibold">स्थिति</th>
                          <th className="w-64 px-3 py-2 text-left font-semibold">स्थलगत कैफियत</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {section.items.map((item) => {
                          const check = details.checks[item.key] || { answer: '', remarks: '' };
                          const answerText =
                            check.answer === 'yes'
                              ? 'छ'
                              : check.answer === 'no'
                              ? 'छैन'
                              : check.answer === 'na'
                              ? 'लागू छैन'
                              : '-';

                          const answerClass =
                            check.answer === 'yes'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : check.answer === 'no'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300';

                          return (
                            <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2.5 text-slate-800 font-medium">{item.label}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${answerClass}`}
                                >
                                  {answerText}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 font-normal">
                                {check.remarks || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 & 5: Overall Remarks & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-800" />
                ४. स्थलगत समग्र अवलोकन तथा कैफियत (Overall Remarks)
              </h4>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                {details.overallRemarks || 'कुनै विशेष कैफियत उल्लेख नगरिएको।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 text-xs space-y-1.5">
              <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                ५. अनुगमन टोलीको सुझाव तथा सिफारिस (Recommendations)
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {details.recommendation || 'तोकिएको गुणस्तर र समय तालिका बमोजिम कार्य अगाडि बढाउन सुझाव दिइयो।'}
              </p>
            </div>
          </div>

          {/* Section 6: Inspection Team & Official Sign-off */}
          <section className="pt-6 border-t-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-800" />
                ६. स्थलगत अनुगमन टोली एवं आधिकारिक हस्ताक्षर खण्ड
              </h3>
            </div>

            {details.team.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
                {details.team.map((member, index) => (
                  <div key={index} className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                    <p className="font-bold text-slate-900">{member.name || `अनुगमन सदस्य ${toNepaliDigits(index + 1)}`}</p>
                    <p className="text-[10px] text-slate-500">{member.post || 'सदस्य / प्राविधिक अधिकृत'}</p>
                    <p className="text-[10px] text-slate-400">
                      मिति: {member.date ? toNepaliDigits(member.date) : '........................'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center text-xs pt-2">
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                  <p className="font-bold text-slate-900">अनुगमन अधिकृत (प्रा.)</p>
                  <p className="text-[10px] text-slate-500">इन्जिनियर / अधिकृत</p>
                  <p className="text-[10px] text-slate-400">मिति: ........................</p>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                  <p className="font-bold text-slate-900">शाखा प्रमुख</p>
                  <p className="text-[10px] text-slate-500">उप-सचिव (प्राविधिक)</p>
                  <p className="text-[10px] text-slate-400">मिति: ........................</p>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                  <p className="font-bold text-slate-900">महाशाखा प्रमुख</p>
                  <p className="text-[10px] text-slate-500">सह-सचिव (प्राविधिक)</p>
                  <p className="text-[10px] text-slate-400">मिति: ........................</p>
                </div>
              </div>
            )}
          </section>

          {/* Section 7: Attachments */}
          {(activity.attachmentPaths ?? []).length > 0 && (
            <section className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-blue-800" />
                संलग्न स्थलगत फोटो तथा कागजात
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {(activity.attachmentPaths ?? []).map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => onOpenAttachment && onOpenAttachment(path)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-blue-800 font-medium transition-colors shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{path.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Footer stamp */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            यो राष्ट्रिय सतर्कता केन्द्रको एकीकृत व्यवस्थापन सूचना प्रणाली (NVC-MIS) बाट सिर्जना गरिएको
            आधिकारिक आयोजना अनुगमन मिसिल हो।
          </div>
        </div>
      </div>
    </div>
  );
};

