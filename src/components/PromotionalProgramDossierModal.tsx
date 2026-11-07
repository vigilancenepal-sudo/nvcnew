import React from 'react';
import { ActivityRecord, PromotionalProgramDetails } from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  getProvinceForDistrict,
  toNepaliDigits,
} from '../data/nvcStructure';
import {
  X,
  Printer,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  FileCheck,
  Building,
  Image as ImageIcon,
} from 'lucide-react';

interface PromotionalProgramDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
  onOpenAttachment?: (path: string) => void;
}

export const PromotionalProgramDossierModal: React.FC<PromotionalProgramDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
  onOpenAttachment,
}) => {
  if (!activity) return null;

  const details: PromotionalProgramDetails = {
    programName:
      activity.promotionalProgramDetails?.programName ?? activity.title ?? '',
    plannedFiscalYear:
      activity.promotionalProgramDetails?.plannedFiscalYear ??
      activity.fiscalYear ??
      '2081/82',
    date:
      activity.promotionalProgramDetails?.date ??
      activity.nepaliDate ??
      '',
    location: activity.promotionalProgramDetails?.location ?? '',
    districtEn:
      activity.promotionalProgramDetails?.districtEn ??
      activity.districtEn ??
      '',
    localLevel: activity.promotionalProgramDetails?.localLevel ?? '',
    targetGroup: activity.promotionalProgramDetails?.targetGroup ?? 'सरोकारवाला तथा नागरिक',
    participantCount:
      activity.promotionalProgramDetails?.participantCount ?? 0,
    status: activity.promotionalProgramDetails?.status ?? 'completed',
    chiefGuest: activity.promotionalProgramDetails?.chiefGuest ?? '',
    objective:
      activity.promotionalProgramDetails?.objective ??
      activity.complaintDetails ??
      'भ्रष्टाचार विरुद्ध शून्य सहनशीलता, सार्वजनिक सेवा प्रवाहमा सदाचार तथा सुशासन प्रवर्द्धन गर्ने।',
    keyOutcomes:
      activity.promotionalProgramDetails?.keyOutcomes ??
      activity.reportSummary ??
      'सरोकारवालाहरूले भ्रष्टाचार न्यूनीकरणका उपायहरू, नागरिक बडापत्रको प्रभावकारिता र गुनासो सुनुवाइ प्रक्रियाबारे स्पष्ट जानकारी प्राप्त गरेका छन्।',
    budgetAmount: activity.promotionalProgramDetails?.budgetAmount ?? 0,
    coordinatorName: activity.promotionalProgramDetails?.coordinatorName ?? '',
  };

  const districtNe = DISTRICT_NE_MAP[details.districtEn] || details.districtEn;
  const provinceNe = getProvinceForDistrict(details.districtEn);

  const statusLabel =
    details.status === 'completed'
      ? 'सम्पन्न'
      : details.status === 'ongoing'
      ? 'सञ्चालन भइरहेको'
      : details.status === 'cancelled'
      ? 'रद्द भएको'
      : 'आगामी';

  const statusBadgeClass =
    details.status === 'completed'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : details.status === 'ongoing'
      ? 'bg-blue-50 text-blue-800 border-blue-300'
      : details.status === 'cancelled'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-amber-50 text-amber-800 border-amber-300';

  const imageAttachments = (activity.attachmentPaths ?? []).filter((path) =>
    /\.(png|jpe?g|webp)$/i.test(path)
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                राष्ट्रिय सतर्कता केन्द्र — प्रवर्द्धनात्मक कार्यक्रम मिसिल
              </div>
              <div className="text-sm font-semibold text-slate-100 line-clamp-1">
                {details.programName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(activity)}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
              >
                सम्पादन
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिन्ट / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Dossier Sheet */}
        <div className="overflow-y-auto p-8 sm:p-10 space-y-7 bg-white text-slate-800 print:p-0 print:m-0 print:overflow-visible">
          {/* Sovereign Government Letterhead */}
          <div className="border-b-2 border-red-700 pb-5 text-center relative">
            <div className="flex items-center justify-between">
              <img
                src="/coa.png"
                alt="नेपालको निशाना छाप"
                className="w-20 h-20 object-contain drop-shadow-sm"
              />
              <div className="flex-1 px-4 text-center">
                <div className="text-sm font-semibold text-red-700 tracking-wide">नेपाल सरकार</div>
                <div className="text-sm font-semibold text-slate-800">
                  प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय
                </div>
                <div className="text-xl font-bold text-blue-950 mt-0.5">
                  राष्ट्रिय सतर्कता केन्द्र
                </div>
                <div className="text-xs font-medium text-slate-600">
                  सुशासन तथा सदाचार प्रवर्द्धन शाखा
                </div>
                <div className="text-xs text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</div>
              </div>
              <div className="w-20 text-right text-[11px] text-slate-500 space-y-0.5">
                <div>अनुसूची: ७(ख)</div>
                <div className="font-mono-num font-semibold text-slate-700">
                  {activity.refNo || 'NVC-PR-२०८१'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
              <div>
                <span>पत्र संख्या: </span>
                <span className="font-mono-num font-semibold text-slate-900">
                  २०८१/८२ (प्र.शा.)
                </span>
              </div>
              <div className="inline-block bg-blue-950 text-white font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider">
                भ्रष्टाचार विरुद्ध सचेतना तथा प्रवर्द्धनात्मक कार्यक्रम सम्पन्न मिसिल
              </div>
              <div>
                <span>मिति: </span>
                <span className="font-mono-num font-bold text-slate-900">
                  {toNepaliDigits(details.date || '२०८१-...')}
                </span>
              </div>
            </div>
          </div>

          {/* Program Quick Profile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                <span>आयोजना मिति</span>
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono-num mt-1">
                {toNepaliDigits(details.date)}
              </div>
              <div className="text-[10px] text-slate-500">
                आ.व. {toNepaliDigits(details.plannedFiscalYear)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>स्थान र ठेगाना</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {details.location || details.localLevel || '-'}
              </div>
              <div className="text-[10px] text-slate-500">
                {districtNe} ({provinceNe})
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>सहभागी संख्या</span>
              </div>
              <div className="text-xs font-bold text-emerald-800 font-mono-num mt-1">
                {toNepaliDigits(details.participantCount)} जना
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {details.targetGroup}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                <span>कार्यक्रमको स्थिति</span>
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClass}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: कार्यक्रमको विस्तृत परिचय */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Award className="w-4 h-4 text-blue-700" />
              <span>१. कार्यक्रमको विस्तृत परिचय तथा सञ्चालन ढाँचा</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 font-medium block">कार्यक्रमको शीर्षक:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {details.programName}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 font-medium block">लक्षित समूह तथा सरोकारवाला:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {details.targetGroup}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 font-medium block">प्रमुख वक्ता / सहजकर्ता:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {details.chiefGuest || 'राष्ट्रिय सतर्कता केन्द्रका अधिकृत तथा विज्ञ सहजकर्ता'}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 font-medium block">संयोजक / अनुगमन अधिकृत:</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {details.coordinatorName || 'प्रवर्द्धनात्मक शाखा प्रमुख / प्रतिनिधि'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: कार्यक्रमको उद्देश्य तथा छलफलका विषयवस्तु */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <FileCheck className="w-4 h-4 text-blue-700" />
              <span>२. उद्देश्य तथा मुख्य छलफलका बुँदाहरू</span>
            </h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs leading-relaxed text-slate-800">
              <div className="font-semibold text-slate-700">कार्यक्रमको मूल उद्देश्य:</div>
              <p className="text-slate-700 whitespace-pre-wrap">{details.objective}</p>
            </div>
          </div>

          {/* Section 3: मुख्य उपलब्धि तथा सहभागीहरूको निष्कर्ष */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>३. कार्यक्रमका प्रमुख उपलब्धि तथा सरोकारवाला पृष्ठपोषण</span>
            </h3>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs leading-relaxed text-slate-800 space-y-2">
              <div className="font-semibold text-emerald-950">कार्यक्रमको प्रतिफल तथा प्रभाव:</div>
              <p className="whitespace-pre-wrap">{details.keyOutcomes}</p>
            </div>
          </div>

          {/* Section 4: कार्यक्रमका तस्वीरहरू (Inspection / Event Photos) */}
          {imageAttachments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                <span>४. कार्यक्रम सञ्चालनका प्रमाणिक तस्वीरहरू</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageAttachments.map((path, idx) => (
                  <div
                    key={path}
                    className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center cursor-pointer hover:border-blue-700 transition-all"
                    onClick={() => onOpenAttachment && onOpenAttachment(path)}
                  >
                    <div className="text-center p-2">
                      <ImageIcon className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-700 mb-1" />
                      <span className="text-[10px] text-slate-600 font-medium">
                        तस्वीर #{toNepaliDigits(idx + 1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3-Tier Official Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs text-slate-700 mt-8">
            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400" />
              <div className="font-bold text-slate-900">तयार गर्ने (कार्यक्रम सहजकर्ता)</div>
              <div className="text-[11px] text-slate-500">पद: सहायक / शाखा अधिकृत</div>
              <div className="text-[10px] text-slate-400">मिति: ........................</div>
            </div>
            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400" />
              <div className="font-bold text-slate-900">जाँच गर्ने (शाखा प्रमुख)</div>
              <div className="text-[11px] text-slate-500">सुशासन तथा सदाचार प्रवर्द्धन शाखा</div>
              <div className="text-[10px] text-slate-400">मिति: ........................</div>
            </div>
            <div className="space-y-1">
              <div className="h-14 border-b border-dashed border-slate-400" />
              <div className="font-bold text-slate-900">स्वीकृत गर्ने (महाशाखा प्रमुख)</div>
              <div className="text-[11px] text-slate-500">नीति, योजना तथा अनुगमन महाशाखा</div>
              <div className="text-[10px] text-slate-400">मिति: ........................</div>
            </div>
          </div>

          {/* Official Seal Watermark / Bottom Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <div>भ्रष्टाचार नियन्त्रण तथा सुशासन प्रवर्द्धन ऐन, २०५९ बमोजिम अभिलेखीकरण गरिएको।</div>
            <div>पृष्ठ १ / १</div>
          </div>
        </div>
      </div>
    </div>
  );
};
