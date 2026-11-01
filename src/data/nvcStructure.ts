import {
  MahashakhaDef,
  ShakhaDef,
  MenuId,
  RoleLevel,
  ComplaintSource,
  ComplaintStatus,
  FiscalYear,
} from '../types/nvc';

export const FISCAL_YEARS: { value: FiscalYear; labelNe: string }[] = [
  { value: '2083/84', labelNe: 'आ.व. २०८३/८४' },
  { value: '2082/83', labelNe: 'आ.व. २०८२/८३' },
  { value: '2081/82', labelNe: 'आ.व. २०८१/८२' },
];

export const NEPALI_MONTHS = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
];

export const CURRENT_NEPALI_MONTH_INDEX = 7; // कार्तिक (2026-11-01 corresponds to Kartik 2083 BS)
export const CURRENT_NEPALI_DATE_DISPLAY = '२०८३ कार्तिक १५, आइतबार';

export const MAHASHAKHAS: MahashakhaDef[] = [
  {
    id: 'maha_admin',
    code: '१',
    nameNe: 'प्रशासन तथा सूचना सङ्कलन महाशाखा',
    shortNe: 'प्रशासन तथा सूचना सङ्कलन',
  },
  {
    id: 'maha_tech',
    code: '२',
    nameNe: 'प्राविधिक परीक्षण तथा अनुगमन महाशाखा',
    shortNe: 'प्राविधिक परीक्षण तथा अनुगमन',
  },
  {
    id: 'maha_police',
    code: '३',
    nameNe: 'प्रहरी महाशाखा',
    shortNe: 'प्रहरी महाशाखा',
  },
];

export const SHAKHAS: ShakhaDef[] = [
  // १. प्रशासन तथा सूचना सङ्कलन महाशाखा अन्तर्गत (7 shakhas)
  {
    id: 'shakha_admin_plan',
    code: '१.क',
    mahashakhaId: 'maha_admin',
    nameNe: 'प्रशासन, योजना तथा अनुगमन शाखा',
    menuGroup: 'a',
  },
  {
    id: 'shakha_info_complaint',
    code: '१.ख',
    mahashakhaId: 'maha_admin',
    nameNe: 'सूचना सङ्कलन तथा उजुरी व्यवस्थापन शाखा',
    menuGroup: 'b',
  },
  {
    id: 'shakha_finance',
    code: '१.ग',
    mahashakhaId: 'maha_admin',
    nameNe: 'आर्थिक प्रशासन शाखा',
    menuGroup: 'b',
  },
  {
    id: 'shakha_investigation',
    code: '१.घ',
    mahashakhaId: 'maha_admin',
    nameNe: 'उजुरी छानविन तथा अन्वेषण शाखा',
    menuGroup: 'b',
  },
  {
    id: 'shakha_legal',
    code: '१.ङ',
    mahashakhaId: 'maha_admin',
    nameNe: 'कानूनी राय तथा परामर्श शाखा',
    menuGroup: 'b',
  },
  {
    id: 'shakha_property',
    code: '१.च',
    mahashakhaId: 'maha_admin',
    nameNe: 'सम्पत्ति विवरण तथा आय अनुगमन शाखा',
    menuGroup: 'b',
  },
  {
    id: 'shakha_decision_archive',
    code: '१.छ',
    mahashakhaId: 'maha_admin',
    nameNe: 'निर्णय कार्यान्वयन तथा अभिलेख व्यवस्थापन शाखा',
    menuGroup: 'b',
  },

  // २. प्राविधिक परीक्षण तथा अनुगमन महाशाखा अन्तर्गत (5 shakhas)
  {
    id: 'shakha_tech_audit',
    code: '२.क',
    mahashakhaId: 'maha_tech',
    nameNe: 'प्राविधिक परीक्षण शाखा',
    menuGroup: 'c',
  },
  {
    id: 'shakha_tech_investigation',
    code: '२.ख',
    mahashakhaId: 'maha_tech',
    nameNe: 'प्राविधिक छानविन तथा अनुगमन शाखा',
    menuGroup: 'c',
  },
  {
    id: 'shakha_lab_testing',
    code: '२.ग',
    mahashakhaId: 'maha_tech',
    nameNe: 'प्रयोगशाला परीक्षण शाखा',
    menuGroup: 'd',
  },
  {
    id: 'shakha_tech_training',
    code: '२.घ',
    mahashakhaId: 'maha_tech',
    nameNe: 'प्राविधिक परीक्षण तालिम तथा क्षमता विकास शाखा',
    menuGroup: 'c',
  },
  {
    id: 'shakha_it',
    code: '२.ङ',
    mahashakhaId: 'maha_tech',
    nameNe: 'सूचना प्रविधि शाखा',
    menuGroup: 'c',
  },

  // ३. प्रहरी महाशाखा अन्तर्गत (1 shakha)
  {
    id: 'shakha_police',
    code: '३.क',
    mahashakhaId: 'maha_police',
    nameNe: 'प्रहरी शाखा',
    menuGroup: 'b',
  },
];

export interface SidebarMenuItem {
  id: MenuId;
  labelNe: string;
}

export const MENU_LABELS: Record<MenuId, string> = {
  dashboard: 'ड्यासबोर्ड',
  new_complaint: 'नयाँ उजुरी',
  complaints_all: 'उजुरीहरु',
  hello_sarkar: 'हेलो सरकार उजुरी',
  online_complaint: 'अनलाइन उजुरी',
  hotline_complaint: 'हटलाइन उजुरी',
  investigation: 'छानविन/अन्वेषण',
  office_monitoring: 'कार्यालय अनुगमन',
  citizen_charter: 'नागरिक बडापत्र अनुगमन',
  project_monitoring: 'आयोजना अनुगमन',
  technical_audit: 'प्राविधिक परीक्षण',
  new_sample: 'नयाँ नमूना',
  sample_reports: 'नमूना रिपोर्टहरु',
  promotional_program: 'प्रवर्द्धनात्मक कार्यक्रम',
  notice_publication: 'सूचना प्रकाशन',
  reports: 'रिपोर्टहरु',
  calendar: 'क्यालेन्डर',
  change_password: 'पासवर्ड परिवर्तन',
  user_management: 'प्रयोगकर्ता व्यवस्थापन',
  settings: 'सेटिङ्गस्',
};

/**
 * Exact Sidebar Menu Rules per Specification (a - g):
 * a. प्रशासन, योजना तथा अनुगमन शाखा
 * b. सूचना सङ्कलन..., आर्थिक प्रशासन..., उजुरी छानविन..., कानूनी राय..., सम्पत्ति विवरण..., निर्णय कार्यान्वयन... र प्रहरी शाखा
 * c. प्राविधिक परीक्षण शाखा, प्राविधिक छानविन तथा अनुगमन शाखा, प्राविधिक परीक्षण तालिम तथा क्षमता विकास शाखा, सूचना प्रविधि शाखा
 * d. प्रयोगशाला परीक्षण शाखा
 * e. प्रशासन तथा सूचना सङ्कलन महाशाखा र प्रहरी महाशाखा
 * f. प्राविधिक परीक्षण तथा अनुगमन महाशाखा
 * g. एडमिन (Admin)
 */
export function getSidebarMenuForRole(
  role: RoleLevel,
  mahashakhaId: string,
  shakhaId: string
): SidebarMenuItem[] {
  let ids: MenuId[] = [];

  if (role === 'admin') {
    // g. एडमिन को ड्यासबोर्डको साइडबार मेनुहरु
    ids = [
      'dashboard',
      'complaints_all',
      'hello_sarkar',
      'online_complaint',
      'hotline_complaint',
      'investigation',
      'office_monitoring',
      'citizen_charter',
      'project_monitoring',
      'technical_audit',
      'sample_reports',
      'calendar',
      'change_password',
      'user_management',
      'settings',
    ];
  } else if (role === 'mahashakha') {
    if (mahashakhaId === 'maha_tech') {
      // f. प्राविधिक परीक्षण तथा अनुगमन महाशाखा
      ids = [
        'dashboard',
        'complaints_all',
        'hello_sarkar',
        'online_complaint',
        'hotline_complaint',
        'investigation',
        'office_monitoring',
        'citizen_charter',
        'project_monitoring',
        'technical_audit',
        'sample_reports',
        'calendar',
        'change_password',
        'settings',
      ];
    } else {
      // e. प्रशासन तथा सूचना सङ्कलन महाशाखा र प्रहरी महाशाखा
      ids = [
        'dashboard',
        'complaints_all',
        'hello_sarkar',
        'online_complaint',
        'hotline_complaint',
        'investigation',
        'office_monitoring',
        'citizen_charter',
        'calendar',
        'change_password',
        'settings',
      ];
    }
  } else {
    // role === 'shakha'
    const shakha = SHAKHAS.find((s) => s.id === shakhaId);
    const group = shakha?.menuGroup || 'b';

    if (group === 'a') {
      // a. प्रशासन, योजना तथा अनुगमन शाखा
      ids = [
        'dashboard',
        'new_complaint',
        'hello_sarkar',
        'online_complaint',
        'hotline_complaint',
        'investigation',
        'office_monitoring',
        'citizen_charter',
        'promotional_program',
        'notice_publication',
        'calendar',
        'change_password',
        'settings',
      ];
    } else if (group === 'c') {
      // c. प्राविधिक परीक्षण शाखा, प्राविधिक छानविन..., तालिम..., सूचना प्रविधि शाखा
      ids = [
        'dashboard',
        'new_complaint',
        'complaints_all',
        'investigation',
        'project_monitoring',
        'technical_audit',
        'reports',
        'calendar',
        'change_password',
        'settings',
      ];
    } else if (group === 'd') {
      // d. प्रयोगशाला परीक्षण शाखा
      ids = [
        'dashboard',
        'new_complaint',
        'complaints_all',
        'investigation',
        'project_monitoring',
        'technical_audit',
        'new_sample',
        'sample_reports',
        'reports',
        'calendar',
        'change_password',
        'settings',
      ];
    } else {
      // b. सूचना सङ्कलन..., आर्थिक प्रशासन..., उजुरी छानविन..., कानूनी राय..., सम्पत्ति विवरण..., निर्णय कार्यान्वयन..., र प्रहरी शाखा
      ids = [
        'dashboard',
        'new_complaint',
        'complaints_all',
        'investigation',
        'office_monitoring',
        'citizen_charter',
        'reports',
        'calendar',
        'change_password',
        'settings',
      ];
    }
  }

  return ids.map((id) => ({ id, labelNe: MENU_LABELS[id] }));
}

/**
 * Requirement i:
 * प्राविधिक परीक्षण तथा अनुगमन शाखा र महाशाखाको ड्यासबोर्डको stat card मा
 * ‘कूल आयोजना अनुगमन’, ‘यस महिनाको आयोजना अनुगमन’, ‘कूल प्राविधिक परीक्षण’ र ‘यस महिनाको प्राविधिक परीक्षण’ पनि थप stat card राख्नुहोस्।
 */
export function hasExtraTechnicalStatCards(
  role: RoleLevel,
  mahashakhaId: string,
  shakhaId: string
): boolean {
  if (role === 'mahashakha' && mahashakhaId === 'maha_tech') {
    return true;
  }
  if (role === 'shakha') {
    const shakha = SHAKHAS.find((s) => s.id === shakhaId);
    if (shakha?.mahashakhaId === 'maha_tech') {
      return true;
    }
  }
  return false;
}

export const COMPLAINT_SOURCE_LABELS: Record<ComplaintSource, string> = {
  hello_sarkar: 'हेलो सरकार',
  online: 'अनलाइन',
  hotline: 'हटलाइन',
  kendra_darta: 'केन्द्रमा दर्ता',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  chalu: 'चालु',
  farchhaut: 'फर्छ्यौट भएको',
  patrachar_baki: 'पत्राचार बाँकी',
  chhanbin_ma: 'छानविनमा रहेको',
  kam_baki: 'काम बाँकी',
};

export const MINISTRIES_LIST = [
  'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
  'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
  'सहरी विकास मन्त्रालय',
  'भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालय',
  'स्वास्थ्य तथा जनसङ्ख्या मन्त्रालय',
  'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
  'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
  'गृह मन्त्रालय',
  'अर्थ मन्त्रालय',
  'खानेपानी मन्त्रालय',
];

export const COMPLAINT_NATURES = [
  'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
  'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
  'सेवा प्रवाहमा ढिलासुस्ती',
  'कार्यालय समय र पोशाक अपरिपालना',
  'गैरकानूनी सम्पत्ति आर्जन / आर्थिक अनियमितता',
  'नागरिक बडापत्र कार्यान्वयन अभाव',
  'सरकारी जग्गा तथा सार्वजनिक सम्पत्ति अतिक्रमण',
];

export const DISTRICT_NE_MAP: Record<string, string> = {
  Achham: 'अछाम',
  Arghakhanchi: 'अर्घाखाँची',
  Baglung: 'बागलुङ',
  Baitadi: 'बैतडी',
  Bajhang: 'बझाङ',
  Bajura: 'बाजुरा',
  Banke: 'बाँके',
  Bara: 'बारा',
  Bardiya: 'बर्दिया',
  Bhaktapur: 'भक्तपुर',
  Bhojpur: 'भोजपुर',
  Chitawan: 'चितवन',
  Dadeldhura: 'डडेल्धुरा',
  Dailekh: 'दैलेख',
  Dang: 'दाङ',
  Darchula: 'दार्चुला',
  Dhading: 'धादिङ',
  Dhankuta: 'धनकुटा',
  Dhanusha: 'धनुषा',
  Dolakha: 'दोलखा',
  Dolpa: 'डोल्पा',
  Doti: 'डोटी',
  Gorkha: 'गोरखा',
  Gulmi: 'गुल्मी',
  Humla: 'हुम्ला',
  Ilam: 'इलाम',
  Jajarkot: 'जाजरकोट',
  Jhapa: 'झापा',
  Jumla: 'जुम्ला',
  Kabhrepalanchok: 'काभ्रेपलाञ्चोक',
  Kailali: 'कैलाली',
  Kalikot: 'कालिकोट',
  Kanchanpur: 'कञ्चनपुर',
  Kapilbastu: 'कपिलवस्तु',
  Kaski: 'कास्की',
  Kathmandu: 'काठमाडौँ',
  Khotang: 'खोटाङ',
  Lalitpur: 'ललितपुर',
  Lamjung: 'लमजुङ',
  Mahottari: 'महोत्तरी',
  Makawanpur: 'मकवानपुर',
  Manang: 'मनाङ',
  Morang: 'मोरङ',
  Mugu: 'मुगु',
  Mustang: 'मुस्ताङ',
  Myagdi: 'म्याग्दी',
  'Nawalparasi East': 'नवलपुर (बर्दघाट सुस्ता पूर्व)',
  'Nawalparasi West': 'परासी (बर्दघाट सुस्ता पश्चिम)',
  Nuwakot: 'नुवाकोट',
  Okhaldhunga: 'ओखलढुङ्गा',
  Palpa: 'पाल्पा',
  Panchthar: 'पाँचथर',
  Parbat: 'पर्वत',
  Parsa: 'पर्सा',
  Pyuthan: 'प्यूठान',
  Ramechhap: 'रामेछाप',
  Rasuwa: 'रसुवा',
  Rautahat: 'रौतहट',
  Rolpa: 'रोल्पा',
  'Rukum East': 'रुकुम पूर्व',
  'Rukum West': 'रुकुम पश्चिम',
  Rupandehi: 'रुपन्देही',
  Salyan: 'सल्यान',
  Sankhuwasabha: 'संखुवासभा',
  Saptari: 'सप्तरी',
  Sarlahi: 'सर्लाही',
  Sindhuli: 'सिन्धुली',
  Sindhupalchok: 'सिन्धुपाल्चोक',
  Siraha: 'सिराहा',
  Solukhumbu: 'सोलुखुम्बु',
  Sunsari: 'सुनसरी',
  Surkhet: 'सुर्खेत',
  Syangja: 'स्याङ्जा',
  Tanahu: 'तनहुँ',
  Taplejung: 'ताप्लेजुङ',
  Terhathum: 'तेह्रथुम',
  Udayapur: 'उदयपुर',
};

export function toNepaliDigits(value: number | string): string {
  const map: Record<string, string> = {
    '0': '०',
    '1': '१',
    '2': '२',
    '3': '३',
    '4': '४',
    '5': '५',
    '6': '६',
    '7': '७',
    '8': '८',
    '9': '९',
  };
  return String(value).replace(/[0-9]/g, (d) => map[d] || d);
}

export function getMahashakhaName(id: string): string {
  return MAHASHAKHAS.find((m) => m.id === id)?.nameNe || 'केन्द्रीय प्रशासन';
}

export function getShakhaName(id: string): string {
  return SHAKHAS.find((s) => s.id === id)?.nameNe || 'सबै शाखा';
}
