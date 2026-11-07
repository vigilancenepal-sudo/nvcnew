import React from 'react';
import { ActivityRecord, TechnicalAuditDetails } from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  FileText,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Wrench,
  FileCheck,
  Scale,
} from 'lucide-react';

interface TechnicalAuditDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
  onOpenAttachment?: (path: string) => void;
}

export const TechnicalAuditDossierModal: React.FC<TechnicalAuditDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
  onOpenAttachment,
}) => {
  if (!activity) return null;

  const details: TechnicalAuditDetails = {
    projectName: activity.technicalAuditDetails?.projectName ?? activity.title ?? '',
    relatedAgency:
      activity.technicalAuditDetails?.relatedAgency ??
      activity.relatedAgency ??
      activity.entityName ??
      '',
    projectNature: activity.technicalAuditDetails?.projectNature ?? '',
    auditDate:
      activity.technicalAuditDetails?.auditDate ??
      activity.investigationDate ??
      activity.nepaliDate ??
      '',
    status: activity.technicalAuditDetails?.status ?? 'chalu',
    nonComplianceDetails:
      activity.technicalAuditDetails?.nonComplianceDetails ??
      activity.reportSummary ??
      activity.complaintDetails ??
      '',
    reportDate: activity.technicalAuditDetails?.reportDate ?? activity.reportDate ?? '',
    reportInformationDate:
      activity.technicalAuditDetails?.reportInformationDate ?? '',
    remarks: activity.technicalAuditDetails?.remarks ?? '',
    auditorName: activity.technicalAuditDetails?.auditorName ?? '',
    auditorDesignation: activity.technicalAuditDetails?.auditorDesignation ?? '',
    contractNo: activity.technicalAuditDetails?.contractNo ?? '',
    contractAmount: activity.technicalAuditDetails?.contractAmount ?? 0,
    consultantName: activity.technicalAuditDetails?.consultantName ?? '',
    auditStage: activity.technicalAuditDetails?.auditStage ?? 'during_construction',
    qualityRating: activity.technicalAuditDetails?.qualityRating ?? 'सन्तोषजनक',
    financialRecoveryAmount: activity.technicalAuditDetails?.financialRecoveryAmount ?? 0,
    remedialDirectives: activity.technicalAuditDetails?.remedialDirectives ?? '',
  };

  const statusLabel =
    details.status === 'sampanna'
      ? 'सम्पन्न'
      : details.status === 'pratibedan_pesh'
      ? 'प्रतिवेदन पेश'
      : 'चालु';

  const statusBadgeClass =
    details.status === 'sampanna'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : details.status === 'pratibedan_pesh'
      ? 'bg-blue-50 text-blue-800 border-blue-300'
      : 'bg-amber-50 text-amber-800 border-amber-300';

  const stageLabel =
    details.auditStage === 'pre_construction'
      ? 'निर्माण पूर्व / डिजाइन तथा खरिद'
      : details.auditStage === 'post_construction'
      ? 'निर्माण सम्पन्न पश्चात्'
      : 'निर्माण कार्य भइरहेको अवस्था';

  const formatCurrency = (val?: number) => {
    if (!val || val === 0) return 'रु. ०.००';
    return `रु. ${toNepaliDigits(val.toLocaleString('en-IN'))}/-`;
  };

  const hasFinancialRecovery = (details.financialRecoveryAmount ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl max-h-[95vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/30 text-blue-300 text-xs font-bold">
              NVC
            </span>
            <span className="text-sm font-semibold tracking-wide">
              प्राविधिक परीक्षण डिजिटल मिसिल (Technical Audit E-Dossier)
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
                प्राविधिक परीक्षण तथा अनुगमन महाशाखा · प्राविधिक परीक्षण शाखा
              </p>
              <p className="text-[11px] text-slate-500">
                सिंहदरबार, काठमाडौं, नेपाल
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">आयोजना कोड / दर्ता नं:</span>
                <span className="font-bold text-[#002B49] font-mono">
                  {toNepaliDigits(activity.dartaNo || activity.id.slice(0, 8))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">आर्थिक वर्ष:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(activity.fiscalYear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">परीक्षण मिति:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(details.auditDate || activity.nepaliDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Technical Audit Field Inspection Report
              </span>
              <h2 className="text-base font-bold text-[#002B49]">
                प्राविधिक परीक्षण विस्तृत प्रतिवेदन एवं स्थलगत निरीक्षण मिसिल
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border shadow-2xs ${statusBadgeClass}`}
              >
                {statusLabel}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                {stageLabel}
              </span>
            </div>
          </div>

          {/* Financial Recovery Alert Banner (If Applicable) */}
          {hasFinancialRecovery && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 border-l-4 border-red-600 rounded-xl shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-red-900">
                    आर्थिक असुली / कम भुक्तानी सिफारिस (Financial Recovery Recommended)
                  </h3>
                  <span className="text-base font-extrabold text-red-700 font-mono bg-white px-3 py-0.5 rounded-lg border border-red-200 shadow-2xs">
                    {formatCurrency(details.financialRecoveryAmount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-red-800 leading-relaxed">
                  प्राविधिक परीक्षण तथा मापदण्ड विपरित भएको कार्यको मूल्यांकन अनुसार सम्बन्धित
                  निर्माण व्यवसायीबाट उक्त रकम असुल उपर गर्न वा अन्तिम बिल भुक्तानीबाट कट्टा गर्न
                  केन्द्रको प्राविधिक परीक्षण निर्देशिका बमोजिम सिफारिस गरिएको छ।
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Project & Contractual Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Building2 className="h-4 w-4 text-blue-800" />
              १. आयोजना तथा सम्झौता सम्बन्धी आधारभूत विवरण
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">आयोजनाको नाम:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {details.projectName || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">सम्बन्धित निकाय / मन्त्रालय:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {details.relatedAgency || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">आयोजनाको प्रकृति / क्षेत्र:</span>
                <span className="font-semibold text-blue-900 mt-0.5 inline-block px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                  {details.projectNature || 'सडक तथा पूर्वाधार'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">ठेक्का / सम्झौता नम्बर:</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {details.contractNo ? toNepaliDigits(details.contractNo) : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">स्वीकृत ठेक्का रकम (भ्याट सहित):</span>
                <span className="font-semibold text-slate-900 mt-0.5 block font-mono">
                  {formatCurrency(details.contractAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">आयोजना स्थल / जिल्ला:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">परामर्शदाता (Consultant):</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {details.consultantName || 'आन्तरिक प्राविधिक जनशक्ति'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">गुणस्तर स्तरीकरण (Quality Rating):</span>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-md ${
                    details.qualityRating === 'उत्कृष्ट'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : details.qualityRating === 'गम्भीर त्रुटि'
                      ? 'bg-red-50 text-red-800 border border-red-300'
                      : details.qualityRating === 'सुधार आवश्यक'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-blue-50 text-blue-800 border border-blue-300'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {details.qualityRating || 'सन्तोषजनक'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">परीक्षण चरण:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {stageLabel}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Audit Timeline & Inspection Team */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Calendar className="h-4 w-4 text-blue-800" />
              २. परीक्षण कार्यतालिका तथा प्राविधिक परीक्षक
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">स्थलगत परीक्षण मिति:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.auditDate ? toNepaliDigits(details.auditDate) : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">डिस्पोजल / प्रतिवेदन पत्र मिति:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.reportDate ? toNepaliDigits(details.reportDate) : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">डिस्पोजल जानकारी मिति:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.reportInformationDate ? toNepaliDigits(details.reportInformationDate) : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">प्रमुख प्राविधिक परीक्षक:</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {details.auditorName || 'केन्द्रबाट खटिएका प्राविधिक परीक्षक'}
                  {details.auditorDesignation ? ` (${details.auditorDesignation})` : ''}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Non-Compliance Records (NCR) */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2 border-b border-red-200 pb-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              ३. अपरिपालनाहरू, प्राविधिक त्रुटि तथा कैफियत (Non-Compliance Report - NCR)
            </h3>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 text-xs">
              {details.nonComplianceDetails ? (
                <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                  {details.nonComplianceDetails}
                </div>
              ) : (
                <p className="text-slate-500 italic">
                  यस आयोजनामा हालसम्म कुनै गम्भीर अपरिपालना (NCR) दर्ता गरिएको छैन वा तोकिएको मापदण्ड
                  अनुसार कार्य भएको छ।
                </p>
              )}
            </div>
          </section>

          {/* Section 4: Remedial Directives & Suggestions */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Scale className="h-4 w-4 text-blue-800" />
              ४. सुधारात्मक निर्देशनहरू तथा सिफारिस (Remedial Directives)
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-blue-50/30 text-xs">
              {details.remedialDirectives || details.remarks ? (
                <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                  {details.remedialDirectives || details.remarks}
                </div>
              ) : (
                <p className="text-slate-500 italic">
                  सुधारात्मक निर्देशन प्रतिवेदनमा उल्लेख भए बमोजिम सम्बन्धित आयोजना प्रमुख तथा
                  निर्माण व्यवसायीले गुणस्तर सुधार गरी ७ दिनभित्र प्रगति पेश गर्न निर्देशन दिइएको छ।
                </p>
              )}
            </div>
          </section>

          {/* Section 5: Attachments & Audit Documents */}
          {(activity.attachmentPaths ?? []).length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <FileCheck className="h-4 w-4 text-blue-800" />
                ५. संलग्न प्राविधिक कागजात तथा स्थलगत प्रमाण
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {(activity.attachmentPaths ?? []).map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => onOpenAttachment && onOpenAttachment(path)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-blue-800 font-medium transition-colors shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{path.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Official Multi-Tier Sign-Off Block */}
          <section className="pt-8 border-t-2 border-slate-300">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-8">
              प्रमाणीकरण तथा अनुमोदन (Official Verification & Endorsement)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                <p className="font-bold text-slate-900">
                  {details.auditorName || 'प्राविधिक परीक्षक'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {details.auditorDesignation || 'इन्जिनियर / प्राविधिक परीक्षक'}
                </p>
                <p className="text-[10px] text-slate-400">मिति: ........................</p>
              </div>

              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-12 mb-2" />
                <p className="font-bold text-slate-900">जाँच गर्ने प्राविधिक अधिकृत</p>
                <p className="text-[10px] text-slate-500">सि.डि.ई. / प्राविधिक अधिकृत</p>
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
          </section>

          {/* Footer stamp */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            यो राष्ट्रिय सतर्कता केन्द्रको एकीकृत व्यवस्थापन सूचना प्रणाली (NVC-MIS) बाट सिर्जना गरिएको
            आधिकारिक प्राविधिक परीक्षण मिसिल हो।
          </div>
        </div>
      </div>
    </div>
  );
};

