import React from 'react';
import { ActivityRecord, CitizenCharterDetails } from '../types/nvc';
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
  Users,
  ScrollText,
  Wrench,
  ShieldCheck,
  Accessibility,
} from 'lucide-react';

interface CitizenCharterDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
}

const CHECKS: Array<{ key: string; label: string }> = [
  { key: 'charter', label: 'नागरिक बडापत्र (डिजिटल/अडियो माध्यम सहित)' },
  { key: 'serviceProcess', label: 'सेवा प्रक्रिया, आवश्यक कागजात, दस्तुर र लाग्ने समय' },
  { key: 'branchStructure', label: 'शाखागत व्यवस्था, कोठा नं. र जिम्मेवार कर्मचारीको नामावली' },
  { key: 'compensation', label: 'नागरिक बडापत्रमा तोकिएको क्षतिपूर्तिको व्यवस्था' },
  { key: 'intermediary', label: 'बिचौलिया/मध्यस्थकर्ताको प्रवेश र चलखेल' },
  { key: 'website', label: 'नागरिक बडापत्र कार्यालयको वेबसाइटमा अपलोड र अद्यावधिक' },
  { key: 'disclosure', label: 'सूचनाको हक सम्बन्धी स्वतः प्रकाशन (Proactive Disclosure)' },
  { key: 'selfService', label: 'सेवाग्राहीले स्वतः जानकारी पाउने डिजिटल माध्यम' },
  { key: 'attendance', label: 'कर्मचारीहरूको विद्युतीय/रजिस्टर हाजिरी' },
  { key: 'staffAtDesk', label: 'कर्मचारीहरू तोकिएको कार्यकक्षमा नियमित उपस्थित' },
  { key: 'informationBoard', label: 'सूचना पाटी र स्पष्ट सूचना प्रवाह' },
  { key: 'cleanliness', label: 'कार्यालय परिसर तथा कार्यकक्षको सरसफाइ' },
];

const FACILITIES = [
  'सेवाग्राही सहायता कक्ष (Help Desk)',
  'अपाङ्गमैत्री भौतिक पूर्वाधार (Ramp/Toilet)',
  'प्रतीक्षालय तथा बस्ने उचित व्यवस्था',
  'महिला तथा पुरुषका लागि छुट्टाछुट्टै शौचालय',
  'शुद्ध पिउने पानीको उचित व्यवस्था',
  'स्तनपान कक्ष / बालमैत्री स्थान',
  'धूम्रपान निषेध सूचना तथा पालना',
  'उजुरी पेटिका तथा नियमित खोल्ने व्यवस्था',
  'चमेनागृह तथा प्राथमिक उपचार',
  'कार्यालय वेबसाइट तथा सामाजिक सञ्जाल',
];

export const CitizenCharterDossierModal: React.FC<CitizenCharterDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
}) => {
  if (!activity) return null;

  const record: CitizenCharterDetails = {
    date: activity.citizenCharterDetails?.date ?? activity.nepaliDate ?? '',
    province: activity.citizenCharterDetails?.province ?? '',
    localLevel: activity.citizenCharterDetails?.localLevel ?? '',
    fullAddress: activity.citizenCharterDetails?.fullAddress ?? '',
    officeName:
      activity.citizenCharterDetails?.officeName ??
      activity.entityName ??
      activity.title ??
      '',
    auditor: activity.citizenCharterDetails?.auditor ?? 'अनुगमन अधिकृत',
    auditorPost: activity.citizenCharterDetails?.auditorPost ?? 'शाखा अधिकृत',
    checks: activity.citizenCharterDetails?.checks ?? {},
    facilities: activity.citizenCharterDetails?.facilities ?? {},
    mainServices: activity.citizenCharterDetails?.mainServices ?? '',
    irregularities: activity.citizenCharterDetails?.irregularities ?? '',
    recommendations: activity.citizenCharterDetails?.recommendations ?? '',
    staffing: activity.citizenCharterDetails?.staffing ?? {
      sanctioned: 0,
      working: 0,
      vacant: 0,
      equalizationPending: 0,
      excess: 0,
    },
    auditorRemarks: activity.citizenCharterDetails?.auditorRemarks ?? '',
  };

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
              नागरिक बडापत्र अनुगमन मिसिल (Citizen Charter Audit Dossier)
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
                प्रशासन तथा सूचना सङ्कलन महाशाखा · प्रशासन, योजना तथा अनुगमन शाखा
              </p>
              <p className="text-[11px] text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">अभिलेख / मिसिल कोड:</span>
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
                <span className="font-semibold text-slate-600">अनुगमन मिति:</span>
                <span className="font-bold text-slate-900">
                  {toNepaliDigits(record.date || activity.nepaliDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Citizen Charter & Public Service Audit Report
              </span>
              <h2 className="text-base font-bold text-[#002B49]">
                नागरिक बडापत्र तथा सार्वजनिक सेवा प्रवाह अनुगमन विस्तृत प्रतिवेदन
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                {record.province || 'नेपाल सरकार'}
              </span>
            </div>
          </div>

          {/* Section 1: Office & Location Metadata */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Building2 className="h-4 w-4 text-blue-800" />
              १. अनुगमन गरिएको सेवा प्रदायक कार्यालयको विवरण
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">कार्यालयको नाम:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {record.officeName || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">स्थान / जिल्ला / स्थानीय तह:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn || '-'}, {record.localLevel || ''} ({record.province || '-'})
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">पूरा ठेगाना:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.fullAddress || '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">अनुगमनकर्ताको नाम:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {record.auditor || 'अनुगमन अधिकृत'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">अनुगमनकर्ताको पद:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {record.auditorPost || 'शाखा अधिकृत'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500 block">अनुगमन मिति:</span>
                <span className="font-semibold text-blue-900 mt-0.5 block">
                  {toNepaliDigits(record.date || activity.nepaliDate)}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: 12-Point Citizen Charter Checklist */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <ScrollText className="h-4 w-4 text-blue-800" />
              २. नागरिक बडापत्र एवं सेवा प्रवाह अवस्था (१२-बुँदे अनुगमन चेकलिस्ट)
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 text-center w-12">क्र.सं.</th>
                    <th className="px-3.5 py-2.5 text-left">परीक्षण गरिएका सूचकहरू</th>
                    <th className="px-3.5 py-2.5 text-right w-48">स्थलगत स्थिति / नतिजा</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CHECKS.map((item, index) => {
                    const status = record.checks[item.key] || 'नभएको';
                    const isPositive =
                      status.includes('स्पष्ट') ||
                      status.includes('भएको') ||
                      status.includes('गरेको') ||
                      status.includes('राम्रो') ||
                      status.includes('देखिएन') ||
                      status.includes('भेटियो');

                    return (
                      <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-500 font-mono">
                          {toNepaliDigits(index + 1)}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">
                          {item.label}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: 10 Citizen Facilities & Physical Infrastructure */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Accessibility className="h-4 w-4 text-blue-800" />
              ३. सेवाग्राही भौतिक सुविधा तथा सहायता पूर्वाधार (१०-बुँदे परीक्षण)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {FACILITIES.map((facility) => {
                const val = record.facilities[facility] || 'छैन';
                const hasFacility = val === 'छ';
                return (
                  <div
                    key={facility}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60"
                  >
                    <span className="font-medium text-slate-800">{facility}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                        hasFacility
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : val === 'सामान्य'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-red-50 text-red-800 border-red-300'
                      }`}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 4: Staffing Status */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Users className="h-4 w-4 text-blue-800" />
              ४. कर्मचारी दरबन्दी तथा पदपूर्ति विश्लेषण
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] text-slate-500 block">स्वीकृत दरबन्दी</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {toNepaliDigits(record.staffing.sanctioned)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <span className="text-[11px] text-emerald-800 block">कार्यरत संख्या</span>
                <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                  {toNepaliDigits(record.staffing.working)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-red-200 bg-red-50/60">
                <span className="text-[11px] text-red-800 block">रिक्त दरबन्दी</span>
                <span className="text-lg font-black text-red-800 mt-0.5 block">
                  {toNepaliDigits(record.staffing.vacant)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                <span className="text-[11px] text-amber-800 block">समायोजन लिन बाँकी</span>
                <span className="text-lg font-black text-amber-800 mt-0.5 block">
                  {toNepaliDigits(record.staffing.equalizationPending)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60">
                <span className="text-[11px] text-indigo-800 block">फाजिल / बढी</span>
                <span className="text-lg font-black text-indigo-800 mt-0.5 block">
                  {toNepaliDigits(record.staffing.excess)}
                </span>
              </div>
            </div>
          </section>

          {/* Section 5: Services, Irregularities & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-800" />
                कार्यालयका मुख्य सेवाहरू (Key Services)
              </h4>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                {record.mainServices || 'नागरिकता, राहदानी सिफारिस, पञ्जीकरण तथा अन्य प्रशासनिक सेवाहरू।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-1.5">
              <h4 className="font-bold text-red-950 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                देखिएका कमजोरी / अनियमितता (Irregularities / Issues)
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {record.irregularities || 'नागरिक बडापत्र स्पष्ट नभएको, डिजिटल अडियो माध्यम नभएको।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-1.5">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                सुधारका उपायहरू (Corrective Recommendations)
              </h4>
              <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                {record.recommendations || 'नागरिक बडापत्रलाई डिजिटल र अडियो माध्यममा अध्यावधिक गरी सबैले देख्ने गरी राख्न निर्देशन।'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-800" />
                अनुगमनकर्ताको टिप्पणी (Auditor Remarks)
              </h4>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                {record.auditorRemarks || 'कार्यालय प्रमुखलाई आवश्यक सुधारका लागि ७ दिने समयसीमा दिई निर्देशन दिइयो।'}
              </p>
            </div>
          </div>

          {/* Section 6: Official Multi-Tier Sign-off */}
          <section className="pt-6 border-t-2 border-slate-300">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-8">
              प्रमाणीकरण तथा सिफारिस खण्ड (Official Verification & Sign-off)
            </p>
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                <p className="font-bold text-slate-900">{record.auditor || 'अनुगमन अधिकृत'}</p>
                <p className="text-[10px] text-slate-500">
                  {record.auditorPost || 'शाखा अधिकृत'}
                </p>
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
            आधिकारिक नागरिक बडापत्र अनुगमन मिसिल हो।
          </div>
        </div>
      </div>
    </div>
  );
};

