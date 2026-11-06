import { supabase, OperationType, handleSupabaseError } from '../supabase';
import {
  ComplaintSource,
  ComplaintStatus,
  ComplaintPriority,
  FiscalYear,
  MahashakhaId,
  ShakhaId,
  ActivityType,
} from '../types/nvc';
import {
  DISTRICT_NE_MAP,
  MINISTRIES_LIST,
  COMPLAINT_NATURES,
  getProvinceForDistrict,
  getLocalLevelsForDistrict,
} from './nvcStructure';

const ALL_DISTRICTS = Object.keys(DISTRICT_NE_MAP);

interface SeedComplaintInput {
  dartaNo: string;
  title: string;
  complainant: string;
  respondent: string;
  source: ComplaintSource;
  ministry: string;
  nature: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  province: string;
  districtEn: string;
  localLevel: string;
  committeeDecision: string;
  finalDecision: string;
  remarks: string;
  fiscalYear: FiscalYear;
  monthIndex: number;
  nepaliDate: string;
  mahashakhaId: MahashakhaId;
  shakhaId: ShakhaId;
}

const REALISTIC_COMPLAINTS: SeedComplaintInput[] = [
  {
    dartaNo: '१९३४/२०८३-१-६',
    title: 'बारा जिल्ला कलैया उपमहानगरपालिका-२० स्थित श्री नेपाल राष्ट्रिय माध्यमिक विद्यालय बसतपुरका प्रधानाध्यापक राम उदार साह तेलीको जन्ममिति संशोधन गरी सेवा अवधि बढाइ लिएको तलब सुविधा रोक्का गरी कारबाही गर्ने सम्बन्धमा।',
    complainant: 'मृत्युंजय कुमार सिंह',
    respondent: 'श्री नेपाल राष्ट्रिय मा.वि. बसतपुर',
    source: 'kendra_darta',
    ministry: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    nature: 'सेवा प्रवाहमा ढिलासुस्ती',
    status: 'kam_baki',
    priority: 'मध्यम',
    province: 'मधेश प्रदेश',
    districtEn: 'Bara',
    localLevel: 'कलैया उपमहानगरपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा आवश्यक छानविन गरी १५ दिनभित्र राय प्रतिक्रिया उपलब्ध गराउन लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-२६',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '३१७७/२०८३-६-२१',
    title: 'सिरहा जिल्ला सुखिपुर नगरपालिका-९ स्थित श्री आ.वि. बैशाखामा कार्यरत शिक्षक पतिराम यादवलाई शिक्षा नियमावली विपरित पद/तह नमिल्ने गरी सरुवा गरिएको विषय।',
    complainant: 'पतिराम यादव (नि.मा.शि. द्वितिय श्रेणी)',
    respondent: 'सुखिपुर नगरपालिका',
    source: 'kendra_darta',
    ministry: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    nature: 'सेवा प्रवाहमा ढिलासुस्ती',
    status: 'kam_baki',
    priority: 'मध्यम',
    province: 'मधेश प्रदेश',
    districtEn: 'Siraha',
    localLevel: 'सुखिपुर नगरपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा के भएको हो, राय/प्रतिकृया १५ दिनभित्र उपलब्ध गराउन सुखिपुर नगरपालिकालाई लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-२१',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '१२४/२०८३-४-५',
    title: 'सोनु कुमार सोनीको हालसम्म काज फिर्ता नगरिएको विषय।',
    complainant: 'बेनामी',
    respondent: '-',
    source: 'hotline',
    ministry: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    nature: 'कार्यालय समय र पोशाक अपरिपालना',
    status: 'kam_baki',
    priority: 'सामान्य',
    province: 'बागमती प्रदेश',
    districtEn: 'Kathmandu',
    localLevel: 'काठमाडौँ महानगरपालिका',
    committeeDecision: 'यस सम्बन्धमा निर्णय भई कार्यान्वयनमा गइसकेकाले सोही फाइलमा समावेश गर्ने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-१९',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '६७९३/२०८३-३-१६',
    title: 'आर्थिक वर्षको क्लोजिङ अगाडि इलाम अस्पतालको पेमेन्ट पश्चात कमिशन उठाउने कार्य भएको सम्बन्धमा छानविन गरी पाउँ।',
    complainant: 'Hs-WEB-147806-DM',
    respondent: 'इलाम अस्पताल',
    source: 'hello_sarkar',
    ministry: 'स्वास्थ्य तथा जनसङ्ख्या मन्त्रालय',
    nature: 'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
    status: 'kam_baki',
    priority: 'मध्यम',
    province: 'कोशी प्रदेश',
    districtEn: 'Ilam',
    localLevel: 'इलाम नगरपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा के भएको हो, राय/प्रतिकृया १५ दिनभित्र उपलब्ध गराउन इलाम अस्पताललाई लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-१९',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '२७२/२०८३/४/७',
    title: 'सप्तरी जिल्लाको तिलाठी कोईलाडी गाउँपालिकामा इन्धन, न्यायिक समितिको सफ्टवेयर, मसलन्द तथा कार्यालय सामग्री खरिदमा अनियमितता गरेको।',
    complainant: 'बेनामी',
    respondent: 'अध्यक्ष, प्रमुख प्रशासकीय अधिकृत र लेखापाल',
    source: 'online',
    ministry: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    nature: 'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
    status: 'kam_baki',
    priority: 'उच्च',
    province: 'मधेश प्रदेश',
    districtEn: 'Saptari',
    localLevel: 'तिलाठी कोईलाडी गाउँपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा के भएको हो, राय/प्रतिकृयासहित सम्बद्ध कागजात १५ दिनभित्र उपलब्ध गराउन तिलाठी कोईलाडी गाउँपालिकालाई लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-१९',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '२८५४/२०८३-६-१२',
    title: 'काठमाडौँ जिल्ला कीर्तिपुर नगरपालिका वडा नं १ चक्रपथ ट्रयाक रोडमा परेको सर्वोच्च अदालतको फैसला कार्यान्वयन नगरेको सम्बन्धमा।',
    complainant: 'राम कुमार रिजाल',
    respondent: 'भूमि प्रशासन विभाग, मालपोत कार्यालय कलंकी समेत',
    source: 'kendra_darta',
    ministry: 'भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालय',
    nature: 'सेवा प्रवाहमा ढिलासुस्ती',
    status: 'kam_baki',
    priority: 'मध्यम',
    province: 'बागमती प्रदेश',
    districtEn: 'Kathmandu',
    localLevel: 'कीर्तिपुर नगरपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा के भएको हो, राय/प्रतिकृया १५ दिनभित्र उपलब्ध गराउन भूमि व्यवस्थापन तथा अभिलेख विभागलाई लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-१२',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: '२६७१/२०८३-६-६',
    title: 'पाँचथर जिल्ला फिदिम नगरपालिकामा नक्सा स्वीकृत नगराई निर्माण भइरहेको भवन संरचना रोक्का आदेश कार्यान्वयन नभएको विषय।',
    complainant: 'सहदेव आचार्य',
    respondent: 'फिदिम नगरपालिका',
    source: 'online',
    ministry: 'सहरी विकास मन्त्रालय',
    nature: 'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
    status: 'kam_baki',
    priority: 'मध्यम',
    province: 'कोशी प्रदेश',
    districtEn: 'Panchthar',
    localLevel: 'फिदिम नगरपालिका',
    committeeDecision: 'प्रस्तुत उजुरीका सम्बन्धमा के भएको हो, राय/प्रतिकृया १५ दिनभित्र उपलब्ध गराउन फिदिम नगरपालिकालाई लेखिपठाउने।',
    finalDecision: '-',
    remarks: '-',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-०६',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_tech_investigation',
  },
  {
    dartaNo: '२१८१/२०८३-५-२४',
    title: 'रामस्वरूप रामसागर बहुमुखी क्याम्पस जनकपुरधाममा भौतिक निर्माण, शैक्षिक सामग्री खरिद तथा ठेक्कापट्टामा अनियमितता भएको सम्बन्धमा।',
    complainant: 'HS-WEB-183085-XM',
    respondent: 'विजय प्रसाद शर्मा',
    source: 'hello_sarkar',
    ministry: 'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय',
    nature: 'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
    status: 'chhanbin_ma',
    priority: 'उच्च',
    province: 'मधेश प्रदेश',
    districtEn: 'Dhanusha',
    localLevel: 'जनकपुरधाम उपमहानगरपालिका',
    committeeDecision: 'छानविन टोली खटाई विस्तृत प्रतिवेदन पेश गर्ने।',
    finalDecision: '-',
    remarks: 'जरुरी छानविन',
    fiscalYear: '2083/84',
    monthIndex: 5,
    nepaliDate: '२०८३-०५-२४',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_investigation',
  },
];

const SHAKHA_ROTATION: { mahashakhaId: MahashakhaId; shakhaId: ShakhaId }[] = [
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_admin_plan' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_info_complaint' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_finance' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_investigation' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_legal' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_property' },
  { mahashakhaId: 'maha_admin', shakhaId: 'shakha_decision_archive' },
  { mahashakhaId: 'maha_tech', shakhaId: 'shakha_tech_audit' },
  { mahashakhaId: 'maha_tech', shakhaId: 'shakha_tech_investigation' },
  { mahashakhaId: 'maha_tech', shakhaId: 'shakha_lab_testing' },
  { mahashakhaId: 'maha_tech', shakhaId: 'shakha_tech_training' },
  { mahashakhaId: 'maha_tech', shakhaId: 'shakha_it' },
  { mahashakhaId: 'maha_police', shakhaId: 'shakha_police' },
];

export async function ensureInitialNvcSeedData(currentUid: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('complaints')
    .select('id')
    .limit(1);
  if (existingError) {
    handleSupabaseError(existingError, OperationType.LIST, 'complaints');
  }
  if (existing.length > 0) return;

  try {
    const complaintRows: Record<string, unknown>[] = [];
    const activityRows: Record<string, unknown>[] = [];
    const sources: ComplaintSource[] = ['hello_sarkar', 'online', 'hotline', 'kendra_darta'];
    const statuses: ComplaintStatus[] = ['kam_baki', 'chalu', 'farchhaut', 'patrachar_baki', 'chhanbin_ma'];
    const priorities: ComplaintPriority[] = ['मध्यम', 'उच्च', 'सामान्य'];

    REALISTIC_COMPLAINTS.forEach((item, idx) => {
      const id = `cmp_curated_${String(idx + 1).padStart(3, '0')}`;
      complaintRows.push({
        id,
        ...item,
        createdByUid: currentUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    for (let i = 0; i < 84; i++) {
      const id = `cmp_dist_${String(i + 1).padStart(3, '0')}`;
      const districtEn = ALL_DISTRICTS[i % ALL_DISTRICTS.length];
      const districtNe = DISTRICT_NE_MAP[districtEn] || districtEn;
      const province = getProvinceForDistrict(districtEn);
      const localLevel = getLocalLevelsForDistrict(districtEn)[0];
      const unit = SHAKHA_ROTATION[i % SHAKHA_ROTATION.length];
      const fiscalYear: FiscalYear = i < 62 ? '2083/84' : '2082/83';
      const monthIndex = fiscalYear === '2083/84' ? (i % 7) + 1 : (i % 12) + 1;
      const day = ((i * 3) % 27) + 1;
      const fyPrefix = fiscalYear === '2083/84' ? '२०८३' : '२०८२';
      const nature = COMPLAINT_NATURES[i % COMPLAINT_NATURES.length];
      const ministry = MINISTRIES_LIST[i % MINISTRIES_LIST.length];
      const source = sources[i % sources.length];
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];

      complaintRows.push({
        id,
        dartaNo: `${1100 + i}/${fyPrefix}-${monthIndex}-${day}`,
        title: `${districtNe} जिल्ला ${localLevel} अन्तर्गत ${nature} सम्बन्धमा छानविन तथा आवश्यक कारबाही गरिपाउँ।`,
        complainant: i % 4 === 0 ? 'बेनामी' : `नागरिक निवेदक समूह, ${districtNe}`,
        respondent: `${localLevel} को कार्यालय`,
        source,
        ministry,
        nature,
        status,
        priority,
        province,
        districtEn,
        localLevel,
        committeeDecision:
          status === 'farchhaut'
            ? 'छानविन सम्पन्न भई आवश्यक निर्देशन पठाइएकोले तामेलीमा राख्ने।'
            : 'प्रस्तुत उजुरीका सम्बन्धमा १५ दिनभित्र राय प्रतिक्रिया माग गर्ने।',
        finalDecision: status === 'farchhaut' ? 'फर्छ्यौट / तामेली' : '-',
        remarks: '-',
        fiscalYear,
        monthIndex,
        nepaliDate: `${fyPrefix}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        mahashakhaId: unit.mahashakhaId,
        shakhaId: unit.shakhaId,
        createdByUid: currentUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const activityTypes: ActivityType[] = [
      'karyalaya_anugaman',
      'prabidhik_parikshan',
      'aayojana_anugaman',
      'chhanbin_anveshan',
      'badapatra_anugaman',
      'namuna_parikshan',
    ];

    for (let j = 0; j < 42; j++) {
      const actId = `act_seed_${String(j + 1).padStart(3, '0')}`;
      const actType = activityTypes[j % activityTypes.length];
      const districtEn = ALL_DISTRICTS[(j * 2) % ALL_DISTRICTS.length];
      const districtNe = DISTRICT_NE_MAP[districtEn] || districtEn;

      let unit = SHAKHA_ROTATION[j % SHAKHA_ROTATION.length];
      if (actType === 'prabidhik_parikshan' || actType === 'aayojana_anugaman') {
        const techShakhas: ShakhaId[] = [
          'shakha_tech_audit',
          'shakha_tech_investigation',
          'shakha_lab_testing',
          'shakha_tech_training',
          'shakha_it',
        ];
        unit = {
          mahashakhaId: 'maha_tech',
          shakhaId: techShakhas[j % techShakhas.length],
        };
      } else if (actType === 'namuna_parikshan') {
        unit = {
          mahashakhaId: 'maha_tech',
          shakhaId: 'shakha_lab_testing',
        };
      }

      const monthIndex = j % 3 === 0 ? 7 : (j % 6) + 1;
      const nonComplianceCount = actType === 'karyalaya_anugaman' ? (j % 9) + 2 : 0;
      const directiveCount = actType === 'karyalaya_anugaman' ? (j % 5) + 1 : 1;

      const titleMap: Record<ActivityType, string> = {
        karyalaya_anugaman: `${districtNe} स्थित सरकारी कार्यालयहरूको छड्के हाजिरी तथा पोशाक अनुगमन`,
        badapatra_anugaman: `${districtNe} सेवा प्रदायक कार्यालयको नागरिक बडापत्र अनुगमन`,
        service_survey: `${districtNe} सेवाग्राही सर्वेक्षण`,
        chhanbin_anveshan: `${districtNe} खरिद तथा निर्माण कार्यको विस्तृत छानविन अन्वेषण`,
        prabidhik_parikshan: `${districtNe} सडक तथा पुल निर्माण आयोजनाको प्राविधिक परीक्षण (Technical Audit)`,
        aayojana_anugaman: `${districtNe} राष्ट्रिय गौरव तथा बहुवर्षीय आयोजना स्थलगत अनुगमन`,
        namuna_parikshan: `${districtNe} आयोजनाको बिटुमिन तथा कङ्क्रिट कोर प्रयोगशाला परीक्षण`,
        prabardhanatmak: `${districtNe} सुशासन तथा भ्रष्टाचार न्यूनीकरण अन्तरक्रिया कार्यक्रम`,
        suchana_prakashan: `त्रैमासिक सतर्कता बुलेटिन तथा सार्वजनिक सूचना प्रकाशन`,
      };

      activityRows.push({
        id: actId,
        refNo: `ACT-२०८३-${200 + j}`,
        activityType: actType,
        title: titleMap[actType],
        entityName: `जिल्ला स्थित सरकारी निकाय / आयोजना कार्यालय, ${districtNe}`,
        districtEn,
        fiscalYear: '2083/84',
        monthIndex,
        nepaliDate: `२०८३-०${monthIndex}-${String(((j * 4) % 26) + 1).padStart(2, '0')}`,
        nonComplianceCount,
        directiveCount,
        status: j % 3 === 0 ? 'chalu' : 'sampanna',
        mahashakhaId: unit.mahashakhaId,
        shakhaId: unit.shakhaId,
        createdByUid: currentUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const { error: complaintsError } = await supabase
      .from('complaints')
      .upsert(complaintRows, { onConflict: 'id', ignoreDuplicates: true });
    if (complaintsError) throw complaintsError;
    const { error: activitiesError } = await supabase
      .from('activities')
      .upsert(activityRows, { onConflict: 'id', ignoreDuplicates: true });
    if (activitiesError) throw activitiesError;
  } catch (err) {
    handleSupabaseError(err, OperationType.WRITE, 'complaints/activities');
  }
}
