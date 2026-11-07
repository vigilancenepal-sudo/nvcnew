import React, { useState } from 'react';
import { ActivityRecord, OfficeMonitoringDetails } from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  Building2,
  Calendar,
  Clock,
  Shirt,
  Users,
  AlertTriangle,
  FileText,
  Mail,
  CheckCircle2,
  Wrench,
  ShieldAlert,
} from 'lucide-react';

interface OfficeMonitoringDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
}

export const OfficeMonitoringDossierModal: React.FC<OfficeMonitoringDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'warning_letter'>('dossier');

  if (!activity) return null;

  const details: OfficeMonitoringDetails = {
    date: activity.officeMonitoringDetails?.date ?? activity.nepaliDate ?? '',
    province: activity.officeMonitoringDetails?.province ?? '',
    localLevel: activity.officeMonitoringDetails?.localLevel ?? '',
    officeName:
      activity.officeMonitoringDetails?.officeName ??
      activity.entityName ??
      activity.title ??
      '',
    officePhone: activity.officeMonitoringDetails?.officePhone ?? '',
    monitoringTime: activity.officeMonitoringDetails?.monitoringTime ?? '१०:१५ AM',
    observer: activity.officeMonitoringDetails?.observer ?? 'अनुगमन अधिकृत',
    observerPost: activity.officeMonitoringDetails?.observerPost ?? 'शाखा अधिकृत',
    totalEmployees: activity.officeMonitoringDetails?.totalEmployees ?? 0,
    presentEmployees: activity.officeMonitoringDetails?.presentEmployees ?? 0,
    absentEmployees: activity.officeMonitoringDetails?.absentEmployees ?? 0,
    responsibleOfficer: activity.officeMonitoringDetails?.responsibleOfficer ?? '',
    responsibleOfficerPost:
      activity.officeMonitoringDetails?.responsibleOfficerPost ?? '',
    staff: activity.officeMonitoringDetails?.staff ?? [],
    remarks:
      activity.officeMonitoringDetails?.remarks ??
      activity.reportSummary ??
      activity.complaintDetails ??
      '',
    timeViolationCount:
      activity.officeMonitoringDetails?.timeViolationCount ??
      activity.nonComplianceCount ??
      0,
    dressViolationCount:
      activity.officeMonitoringDetails?.dressViolationCount ?? 0,
    recommendationCount:
      activity.officeMonitoringDetails?.recommendationCount ??
      activity.directiveCount ??
      0,
  };

  const totalViolations = details.timeViolationCount + details.dressViolationCount;

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
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'dossier'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                निरीक्षण मिसिल (Inspection Dossier)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('warning_letter')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'warning_letter'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Mail className="h-3 w-3" />
                सचेत / स्पष्टीकरण पत्र (Action Letter)
              </button>
            </div>
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
              {activeTab === 'dossier' ? 'मिसिल प्रिन्ट' : 'पत्र प्रिन्ट'}
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
          {activeTab === 'dossier' ? (
            /* TAB 1: INSPECTION DOSSIER */
            <>
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
                    <span className="font-semibold text-slate-600">अभिलेख / चलानी नं:</span>
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
                      {toNepaliDigits(details.date || activity.nepaliDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                    Office Surprise Inspection & Attendance Audit Dossier
                  </span>
                  <h2 className="text-base font-bold text-[#002B49]">
                    कार्यालय छड्के हाजिरी तथा पोशाक अनुगमन स्थलगत मिसिल
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                    अनुगमन समय: {toNepaliDigits(details.monitoringTime)}
                  </span>
                  {totalViolations > 0 && (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      उल्लङ्घन: {toNepaliDigits(totalViolations)} जना
                    </span>
                  )}
                </div>
              </div>

              {/* Section 1: Office & Responsible Officer Details */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <Building2 className="h-4 w-4 text-blue-800" />
                  १. अनुगमन गरिएको सरकारी कार्यालयको विवरण
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">कार्यालयको नाम:</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {details.officeName || '-'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">स्थान / जिल्ला / स्थानीय तह:</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn || '-'}, {details.localLevel || ''} ({details.province || '-'})
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">कार्यालय सम्पर्क फोन:</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                      {details.officePhone ? toNepaliDigits(details.officePhone) : '-'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">कार्यालय प्रमुख / जिम्मेवार अधिकारी:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {details.responsibleOfficer || 'कार्यालय प्रमुख'} {details.responsibleOfficerPost ? `(${details.responsibleOfficerPost})` : ''}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">केन्द्रबाट खटिएका अनुगमनकर्ता:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {details.observer || 'अनुगमन अधिकृत'} {details.observerPost ? `(${details.observerPost})` : ''}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">छड्के निरीक्षण समय:</span>
                    <span className="font-semibold text-blue-900 mt-0.5 block">
                      {toNepaliDigits(details.monitoringTime)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 2: Attendance & Sanctioned Staff Metrics */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <Users className="h-4 w-4 text-blue-800" />
                  २. कर्मचारी उपस्थिति तथा दरबन्दी अवस्था (Attendance & Staffing Audit)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[11px] text-slate-500 block">कुल दरबन्दी</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {toNepaliDigits(details.totalEmployees)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <span className="text-[11px] text-emerald-800 block">उपस्थित कर्मचारी</span>
                    <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                      {toNepaliDigits(details.presentEmployees)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-red-200 bg-red-50/60">
                    <span className="text-[11px] text-red-800 block">अनुपस्थित / समय उल्लङ्घन</span>
                    <span className="text-lg font-black text-red-800 mt-0.5 block">
                      {toNepaliDigits(details.timeViolationCount || details.absentEmployees)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                    <span className="text-[11px] text-amber-800 block">पोशाक पालना नगरेको</span>
                    <span className="text-lg font-black text-amber-800 mt-0.5 block">
                      {toNepaliDigits(details.dressViolationCount)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60">
                    <span className="text-[11px] text-indigo-800 block">कारबाही सिफारिस संख्या</span>
                    <span className="text-lg font-black text-indigo-800 mt-0.5 block">
                      {toNepaliDigits(details.recommendationCount)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 3: Staff Violation Register */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2 border-b border-red-200 pb-1.5">
                  <Shirt className="h-4 w-4 text-red-600" />
                  ३. समय तथा पोशाक अपरिपालना गर्ने कर्मचारीहरूको विवरण
                </h3>

                {details.staff.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 text-center w-12">क्र.सं.</th>
                          <th className="px-3.5 py-2.5 text-left">उल्लङ्घन प्रकार</th>
                          <th className="px-3.5 py-2.5 text-left">कर्मचारीको नाम</th>
                          <th className="px-3.5 py-2.5 text-left">पद / दर्जा</th>
                          <th className="px-3.5 py-2.5 text-left">कर्मचारी संकेत नं.</th>
                          <th className="px-3.5 py-2.5 text-left">स्थलगत कैफियत</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {details.staff.map((member, index) => (
                          <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-500 font-mono">
                              {toNepaliDigits(index + 1)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  member.type.includes('पोशाक')
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {member.type}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-900">
                              {member.name}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700">
                              {member.designation || '-'}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-slate-700">
                              {member.signalNo ? toNepaliDigits(member.signalNo) : '-'}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600">
                              {member.remarks || 'कार्यालय समयमा तोकिएको स्थानमा अनुपस्थित'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    अनुगमनको समयमा कर्मचारीहरू तोकिएको समय र पोशाक पालना गरी पूर्ण उपस्थित रहेको
                    पाइयो।
                  </div>
                )}
              </section>

              {/* Section 4: Remarks & Directives */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <FileText className="h-4 w-4 text-blue-800" />
                  ४. अनुगमन निष्कर्ष, सुधारका निर्देशन तथा कैफियत
                </h3>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                    {details.remarks ||
                      'सार्वजनिक सेवा प्रवाहलाई चुस्त र नियमित बनाउन सबै कर्मचारीहरूले अनिवार्य रूपमा कार्यालय समय पालना गर्न, तोकिएको पोशाक लगाउन र सेवाग्राहीसँग नम्र व्यवहार गर्न कार्यालय प्रमुखलाई निर्देशन दिइयो।'}
                  </p>
                </div>
              </section>

              {/* Section 5: Multi-Tier Official Sign-off Block */}
              <section className="pt-6 border-t-2 border-slate-300">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-8">
                  प्रमाणीकरण तथा सिफारिस खण्ड (Official Verification & Sign-off)
                </p>
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                    <p className="font-bold text-slate-900">{details.observer || 'अनुगमन अधिकृत'}</p>
                    <p className="text-[10px] text-slate-500">
                      {details.observerPost || 'शाखा अधिकृत / अनुगमनकर्ता'}
                    </p>
                    <p className="text-[10px] text-slate-400">मिति: ........................</p>
                  </div>

                  <div className="space-y-1">
                    <div className="border-b border-dotted border-slate-400 pb-10 mb-2" />
                    <p className="font-bold text-slate-900">शाखा प्रमुख</p>
                    <p className="text-[10px] text-slate-500">उप-सचिव (प्रशासन/अनुगमन)</p>
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
                आधिकारिक कार्यालय अनुगमन मिसिल हो।
              </div>
            </>
          ) : (
            /* TAB 2: AUTO-GENERATED FORMAL WARNING / CLARIFICATION LETTER */
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              {/* Formal Government Dispatch Header */}
              <div className="text-center pb-4 border-b-2 border-red-700/80">
                <div className="flex justify-center mb-1.5">
                  <img
                    src="/coa.png"
                    alt="नेपालको निशान छाप"
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <p className="text-xs font-semibold text-slate-700">नेपाल सरकार</p>
                <p className="text-xs font-bold text-slate-800">
                  प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय
                </p>
                <h2 className="text-xl font-black text-[#002B49]">
                  राष्ट्रिय सतर्कता केन्द्र
                </h2>
                <p className="text-xs text-slate-600">
                  प्रशासन तथा सूचना सङ्कलन महाशाखा · प्रशासन, योजना तथा अनुगमन शाखा
                </p>
                <p className="text-[11px] text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</p>

                <div className="mt-4 flex justify-between text-xs text-slate-700 border-t border-slate-200 pt-2 font-medium">
                  <div>
                    <span>पत्र संख्या: </span>
                    <span className="font-mono font-bold">
                      {toNepaliDigits(activity.fiscalYear)}
                    </span>
                  </div>
                  <div>
                    <span>चलानी नं: </span>
                    <span className="font-mono font-bold">
                      {toNepaliDigits(activity.refNo || 'NVC-MON-784')}
                    </span>
                  </div>
                  <div>
                    <span>मिति: </span>
                    <span className="font-bold">
                      {toNepaliDigits(details.date || activity.nepaliDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Addressee */}
              <div className="text-xs space-y-1 font-medium text-slate-800">
                <p>श्री कार्यालय प्रमुख ज्यू,</p>
                <p className="font-bold text-slate-900">{details.officeName},</p>
                <p>
                  {DISTRICT_NE_MAP[activity.districtEn] || activity.districtEn}, {details.province}।
                </p>
              </div>

              {/* Subject */}
              <div className="text-center py-2 border-y border-slate-200">
                <p className="text-xs font-extrabold text-[#002B49]">
                  विषय: छड्के हाजिरी तथा पोशाक अनुगमनका क्रममा अनुपस्थित / पोशाक पालना नगरेका
                  कर्मचारीहरूलाई सचेत गराउने / स्पष्टीकरण माग गर्ने सम्बन्धमा।
                </p>
              </div>

              {/* Official Letter Body */}
              <div className="text-xs leading-relaxed text-slate-800 space-y-3 text-justify font-sans">
                <p>
                  प्रस्तुत विषयमा भ्रष्टाचार निवारण ऐन, २०५९ को दफा ३८ तथा प्रचलित निजामती सेवा
                  नियमावली बमोजिम यस केन्द्रबाट खटिएको अधिकृतस्तरको स्थलगत अनुगमन टोलीले मिति{' '}
                  <b>{toNepaliDigits(details.date || activity.nepaliDate)}</b> गते समय{' '}
                  <b>{toNepaliDigits(details.monitoringTime)}</b> मा तहाँ कार्यालयमा आकस्मिक छड्के
                  हाजिरी तथा पोशाक निरीक्षण गर्दा देहाय बमोजिमका कर्मचारीहरू बिना जानकारी अनुपस्थित
                  रहेको / निर्धारित पोशाक नलगाएको पाइएको छ।
                </p>

                {/* Table inside the letter */}
                <div className="rounded-lg border border-slate-300 overflow-hidden my-3">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 text-center w-10">क्र.सं.</th>
                        <th className="p-2 text-left">कर्मचारीको नाम</th>
                        <th className="p-2 text-left">पद</th>
                        <th className="p-2 text-left">संकेत नं.</th>
                        <th className="p-2 text-left">कैफियत / उल्लङ्घन</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {details.staff.map((s, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center font-mono">{toNepaliDigits(idx + 1)}</td>
                          <td className="p-2 font-bold">{s.name}</td>
                          <td className="p-2">{s.designation || '-'}</td>
                          <td className="p-2 font-mono">{s.signalNo ? toNepaliDigits(s.signalNo) : '-'}</td>
                          <td className="p-2 text-red-700 font-medium">{s.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p>
                  अतः सार्वजनिक सेवा प्रवाहमा ढिलासुस्ती र अनुशासनहीनता अन्त्य गर्नका लागि उल्लेखित
                  कर्मचारीहरूलाई कार्यालय समय र पोशाक पूर्ण पालना गर्न सचेत गराई सो को जानकारी{' '}
                  <b>७ (सात) दिनभित्र</b> यस केन्द्रमा अनिवार्य पठाउनुहुन निर्णयानुसार अनुरोध छ।
                </p>
              </div>

              {/* Official Signature */}
              <div className="pt-8 flex justify-end text-xs text-right">
                <div className="space-y-1">
                  <div className="border-b border-dotted border-slate-400 pb-10 mb-2 w-48 ml-auto" />
                  <p className="font-bold text-slate-900">उप-सचिव (प्रशासन / अनुगमन)</p>
                  <p className="text-[10px] text-slate-500">राष्ट्रिय सतर्कता केन्द्र</p>
                  <p className="text-[10px] text-slate-500">सिंहदरबार, काठमाडौं</p>
                </div>
              </div>

              {/* Dispatch CC (बोधार्थ) */}
              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-700">बोधार्थ:</p>
                <p>१. सम्बन्धित मन्त्रालय / विभाग — जानकारी तथा आवश्यक कार्यान्वयनको लागि।</p>
                <p>२. राष्ट्रिय किताबखाना (निजामती), हरिहरभवन, ललितपुर — अभिलेखको लागि।</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

