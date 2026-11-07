import React from 'react';
import { ActivityRecord, NoticePublicationDetails } from '../types/nvc';
import { toNepaliDigits } from '../data/nvcStructure';
import {
  X,
  Printer,
  Calendar,
  Building,
  FileText,
  Share2,
  Copy,
  Check,
  Megaphone,
} from 'lucide-react';

interface NoticePublicationDossierModalProps {
  activity: ActivityRecord | null;
  onClose: () => void;
  onEdit?: (act: ActivityRecord) => void;
}

export const NoticePublicationDossierModal: React.FC<NoticePublicationDossierModalProps> = ({
  activity,
  onClose,
  onEdit,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!activity) return null;

  const details: NoticePublicationDetails = {
    date:
      activity.noticePublicationDetails?.date ??
      activity.nepaliDate ??
      '',
    title:
      activity.noticePublicationDetails?.title ??
      activity.title ??
      '',
    description:
      activity.noticePublicationDetails?.description ??
      activity.reportSummary ??
      activity.complaintDetails ??
      '',
    noticeNo:
      activity.noticePublicationDetails?.noticeNo ??
      activity.refNo ??
      `NVC/सूचना/${toNepaliDigits(new Date().getFullYear())}`,
    dispatchedBy:
      activity.noticePublicationDetails?.dispatchedBy ??
      'सूचना अधिकारी / प्रवक्ता',
    category:
      activity.noticePublicationDetails?.category ??
      'सार्वजनिक सूचना तथा परिपत्र',
    targetAudience:
      activity.noticePublicationDetails?.targetAudience ??
      'सबै मन्त्रालय, आयोग, निकाय, स्थानीय तह तथा सम्पूर्ण राष्ट्रसेवक कर्मचारीहरू',
  };

  const handleCopy = () => {
    const text = `${details.title}\nमिति: ${details.date}\n\n${details.description}\n\nराष्ट्रिय सतर्कता केन्द्र, सिंहदरबार।`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <Megaphone className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                राष्ट्रिय सतर्कता केन्द्र — आधिकारिक सार्वजनिक सूचना तथा परिपत्र
              </div>
              <div className="text-sm font-semibold text-slate-100 line-clamp-1">
                {details.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'कपि भयो' : 'पाठ कपी'}</span>
            </button>
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

        {/* Official Printable Gazette / Notice Sheet */}
        <div className="overflow-y-auto p-8 sm:p-12 space-y-6 bg-white text-slate-800 print:p-0 print:m-0 print:overflow-visible">
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
                  प्रशासन तथा सूचना शाखा
                </div>
                <div className="text-xs text-slate-500">सिंहदरबार, काठमाडौं, नेपाल</div>
              </div>
              <div className="w-20 text-right text-[11px] text-slate-500 space-y-0.5">
                <div>सूचना नं:</div>
                <div className="font-mono-num font-semibold text-slate-700">
                  {details.noticeNo || '०१/२०८१'}
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
              <div>
                <span>चलानी नं: </span>
                <span className="font-mono-num font-semibold text-slate-900">
                  {activity.refNo ? toNepaliDigits(activity.refNo.replace(/\D/g, '') || '१२३') : '१०८'}
                </span>
              </div>
              <div>
                <span>मिति: </span>
                <span className="font-mono-num font-bold text-slate-900">
                  {toNepaliDigits(details.date || '२०८१-...')}
                </span>
              </div>
            </div>
          </div>

          {/* Recipient / Notice Target */}
          <div className="space-y-1 text-xs">
            <div className="font-bold text-slate-900">सरोकारवाला:</div>
            <div className="text-slate-700 font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              {details.targetAudience}
            </div>
          </div>

          {/* Subject Banner */}
          <div className="py-2.5 px-4 bg-blue-50/70 border-l-4 border-blue-900 rounded-r-lg">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              विषय:
            </div>
            <div className="text-base font-bold text-blue-950 mt-0.5 leading-snug">
              {details.title}
            </div>
          </div>

          {/* Notice Detailed Body */}
          <div className="space-y-4 text-xs sm:text-sm leading-7 text-slate-800 text-justify">
            <p className="whitespace-pre-wrap leading-relaxed indent-8">
              {details.description}
            </p>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs leading-relaxed text-amber-950">
              <span className="font-bold">कानूनी आधार: </span>
              भ्रष्टाचार निवारण ऐन, २०५९ तथा राष्ट्रिय सतर्कता केन्द्र नियमावली बमोजिम यस केन्द्रबाट जारी निर्देशन तथा सूचनाको पूर्ण पालना गर्नु सम्बन्धित सबै निकाय तथा पदाधिकारीहरूको कानूनी कर्तव्य हुनेछ।
            </div>
          </div>

          {/* Official Sign-off Block */}
          <div className="pt-10 flex justify-end text-xs text-slate-800">
            <div className="text-center space-y-1 w-64">
              <div className="h-16 border-b border-dashed border-slate-400" />
              <div className="font-bold text-slate-900">............................................</div>
              <div className="font-bold text-slate-900">({details.dispatchedBy})</div>
              <div className="text-slate-600">राष्ट्रिय सतर्कता केन्द्र</div>
              <div className="text-slate-500 text-[11px]">सिंहदरबार, काठमाडौं</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <div>वेबसाइट: www.nvc.gov.np | फोन: ०१-४२००४०० | इमेल: info@nvc.gov.np</div>
            <div>सिंहदरबार, काठमाडौं</div>
          </div>
        </div>
      </div>
    </div>
  );
};
