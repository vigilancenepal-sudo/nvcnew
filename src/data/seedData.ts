import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import {
  ComplaintSource,
  ComplaintStatus,
  FiscalYear,
  MahashakhaId,
  ShakhaId,
  ActivityType,
} from '../types/nvc';
import { DISTRICT_NE_MAP, MINISTRIES_LIST, COMPLAINT_NATURES } from './nvcStructure';

const ALL_DISTRICTS = Object.keys(DISTRICT_NE_MAP);

interface SeedComplaintInput {
  dartaNo: string;
  title: string;
  complainant: string;
  source: ComplaintSource;
  ministry: string;
  nature: string;
  status: ComplaintStatus;
  districtEn: string;
  fiscalYear: FiscalYear;
  monthIndex: number;
  nepaliDate: string;
  mahashakhaId: MahashakhaId;
  shakhaId: ShakhaId;
}

const REALISTIC_COMPLAINTS: SeedComplaintInput[] = [
  {
    dartaNo: 'NVC-२०८३-०१४८',
    title: 'नारायणगढ–बुटवल सडक खण्डको कालोपत्रे निर्माण गुणस्तरहीन भएको सम्बन्धमा',
    complainant: 'स्थानीय उपभोक्ता सरोकार समिति, नवलपुर',
    source: 'online',
    ministry: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    nature: 'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
    status: 'chhanbin_ma',
    districtEn: 'Nawalparasi East',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-१४',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_tech_investigation',
  },
  {
    dartaNo: 'NVC-२०८३-०१४७',
    title: 'मालपोत कार्यालय डिल्लीबजारमा जग्गा नामसारी सेवामा अनावश्यक ढिलासुस्ती',
    complainant: 'रामप्रसाद अधिकारी',
    source: 'hello_sarkar',
    ministry: 'भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालय',
    nature: 'सेवा प्रवाहमा ढिलासुस्ती',
    status: 'chalu',
    districtEn: 'Kathmandu',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-१३',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_info_complaint',
  },
  {
    dartaNo: 'NVC-२०८३-०१४६',
    title: 'यातायात व्यवस्था कार्यालय एकान्तकुनामा नागरिक बडापत्र अद्यावधिक नगरिएको',
    complainant: 'सुनिता श्रेष्ठ',
    source: 'hotline',
    ministry: 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय',
    nature: 'नागरिक बडापत्र कार्यान्वयन अभाव',
    status: 'patrachar_baki',
    districtEn: 'Lalitpur',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-१२',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_admin_plan',
  },
  {
    dartaNo: 'NVC-२०८३-०१४५',
    title: 'भेरी–बबई डाइभर्सन बहुउद्देश्यीय आयोजनाको कङ्क्रिट नमूना परीक्षण सम्बन्धी',
    complainant: 'सिँचाइ डिभिजन प्राविधिक अनुगमन टोली',
    source: 'kendra_darta',
    ministry: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    nature: 'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
    status: 'chalu',
    districtEn: 'Surkhet',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-११',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_lab_testing',
  },
  {
    dartaNo: 'NVC-२०८३-०१४४',
    title: 'प्रादेशिक अस्पताल जनकपुरको स्वास्थ्य उपकरण खरिद बोलपत्रमा अनियमितता',
    complainant: 'जनकपुर नागरिक समाज',
    source: 'online',
    ministry: 'स्वास्थ्य तथा जनसङ्ख्या मन्त्रालय',
    nature: 'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
    status: 'chhanbin_ma',
    districtEn: 'Dhanusha',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-०९',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_investigation',
  },
  {
    dartaNo: 'NVC-२०८३-०१४३',
    title: 'सार्वजनिक जग्गा अतिक्रमण गरी व्यावसायिक संरचना निर्माण गरिएको उजुरी',
    complainant: 'पोखरा महानगर वडा नं. ८ बासी',
    source: 'kendra_darta',
    ministry: 'सहरी विकास मन्त्रालय',
    nature: 'सरकारी जग्गा तथा सार्वजनिक सम्पत्ति अतिक्रमण',
    status: 'chalu',
    districtEn: 'Kaski',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-०८',
    mahashakhaId: 'maha_police',
    shakhaId: 'shakha_police',
  },
  {
    dartaNo: 'NVC-२०८३-०१४२',
    title: 'सरकारी कर्मचारीहरूको निर्धारित पोशाक तथा कार्यालय हाजिरी छड्के जाँच',
    complainant: 'केन्द्रीय छड्के अनुगमन टोली',
    source: 'hotline',
    ministry: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    nature: 'कार्यालय समय र पोशाक अपरिपालना',
    status: 'farchhaut',
    districtEn: 'Bhaktapur',
    fiscalYear: '2083/84',
    monthIndex: 7,
    nepaliDate: '२०८३-०७-०६',
    mahashakhaId: 'maha_police',
    shakhaId: 'shakha_police',
  },
  {
    dartaNo: 'NVC-२०८३-०१४१',
    title: 'सार्वजनिक पद धारण गरेका पदाधिकारीको वार्षिक सम्पत्ति विवरण बुझाउन ढिलाइ',
    complainant: 'अभिलेख सुपरीवेक्षण इकाई',
    source: 'kendra_darta',
    ministry: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय',
    nature: 'गैरकानूनी सम्पत्ति आर्जन / आर्थिक अनियमितता',
    status: 'kam_baki',
    districtEn: 'Morang',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-२७',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_property',
  },
  {
    dartaNo: 'NVC-२०८३-०१४०',
    title: 'रानी जमरा कुलरिया सिँचाइ आयोजनाको नहर लाइनिङ प्राविधिक परीक्षण माग',
    complainant: 'जल उपभोक्ता महासंघ, कैलाली',
    source: 'online',
    ministry: 'ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय',
    nature: 'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
    status: 'farchhaut',
    districtEn: 'Kailali',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-२२',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_tech_audit',
  },
  {
    dartaNo: 'NVC-२०८३-०१३९',
    title: 'वीरगञ्ज भन्सार र सुख्खा बन्दरगाह पहुँच मार्ग मर्मत ठेक्का छानविन',
    complainant: 'ढुवानी व्यवसायी संघ, पर्सा',
    source: 'hello_sarkar',
    ministry: 'अर्थ मन्त्रालय',
    nature: 'सार्वजनिक खरिद तथा ठेक्का अनियमितता',
    status: 'farchhaut',
    districtEn: 'Parsa',
    fiscalYear: '2083/84',
    monthIndex: 6,
    nepaliDate: '२०८३-०६-१८',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_legal',
  },
  {
    dartaNo: 'NVC-२०८३-०१३८',
    title: 'एकीकृत खानेपानी तथा ढल निकास आयोजना बुटवलको पाइपलाइन गुणस्तर सम्बन्धी',
    complainant: 'टोल विकास संस्था, रुपन्देही',
    source: 'online',
    ministry: 'खानेपानी मन्त्रालय',
    nature: 'निर्माण गुणस्तरहीन / प्राविधिक त्रुटि',
    status: 'chalu',
    districtEn: 'Rupandehi',
    fiscalYear: '2083/84',
    monthIndex: 5,
    nepaliDate: '२०८३-०५-२४',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_tech_audit',
  },
  {
    dartaNo: 'NVC-२०८३-०१३७',
    title: 'केन्द्रीय निर्णय कार्यान्वयनको प्रगति विवरण पठाउन अटेर गरेको सम्बन्धमा',
    complainant: 'अनुगमन शाखा प्रतिवेदन',
    source: 'kendra_darta',
    ministry: 'गृह मन्त्रालय',
    nature: 'सेवा प्रवाहमा ढिलासुस्ती',
    status: 'patrachar_baki',
    districtEn: 'Chitawan',
    fiscalYear: '2083/84',
    monthIndex: 5,
    nepaliDate: '२०८३-०५-१५',
    mahashakhaId: 'maha_admin',
    shakhaId: 'shakha_decision_archive',
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
  try {
    const existingSnap = await getDocs(query(collection(db, 'complaints'), limit(1)));
    if (!existingSnap.empty) {
      return;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'complaints');
  }

  try {
    const batch = writeBatch(db);
    const sources: ComplaintSource[] = ['hello_sarkar', 'online', 'hotline', 'kendra_darta'];
    const statuses: ComplaintStatus[] = ['chalu', 'farchhaut', 'patrachar_baki', 'chhanbin_ma', 'kam_baki'];

    // 1. Add the 12 curated realistic complaints first
    REALISTIC_COMPLAINTS.forEach((item, idx) => {
      const id = `cmp_curated_${String(idx + 1).padStart(3, '0')}`;
      batch.set(doc(db, 'complaints', id), {
        ...item,
        createdByUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    // 2. Add distributed complaints across Nepal's 77 districts & fiscal years (2083/84 & 2082/83)
    for (let i = 0; i < 84; i++) {
      const id = `cmp_dist_${String(i + 1).padStart(3, '0')}`;
      const districtEn = ALL_DISTRICTS[i % ALL_DISTRICTS.length];
      const districtNe = DISTRICT_NE_MAP[districtEn] || districtEn;
      const unit = SHAKHA_ROTATION[i % SHAKHA_ROTATION.length];
      const fiscalYear: FiscalYear = i < 62 ? '2083/84' : '2082/83';
      const monthIndex = fiscalYear === '2083/84' ? (i % 7) + 1 : (i % 12) + 1;
      const day = ((i * 3) % 27) + 1;
      const fyPrefix = fiscalYear === '2083/84' ? '२०८३' : '२०८२';
      const nature = COMPLAINT_NATURES[i % COMPLAINT_NATURES.length];
      const ministry = MINISTRIES_LIST[i % MINISTRIES_LIST.length];
      const source = sources[i % sources.length];
      const status = statuses[i % statuses.length];

      batch.set(doc(db, 'complaints', id), {
        dartaNo: `NVC-${fyPrefix}-०${100 + i}`,
        title: `${districtNe} जिल्ला अन्तर्गत ${nature} सम्बन्धी उजुरी छानविन`,
        complainant: `नागरिक निवेदक समूह, ${districtNe}`,
        source,
        ministry,
        nature,
        status,
        districtEn,
        fiscalYear,
        monthIndex,
        nepaliDate: `${fyPrefix}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        mahashakhaId: unit.mahashakhaId,
        shakhaId: unit.shakhaId,
        createdByUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Add Activity Records (Office monitoring, Investigations, Technical Audits, Project Monitoring, Lab Samples)
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
        chhanbin_anveshan: `${districtNe} खरिद तथा निर्माण कार्यको विस्तृत छानविन अन्वेषण`,
        prabidhik_parikshan: `${districtNe} सडक तथा पुल निर्माण आयोजनाको प्राविधिक परीक्षण (Technical Audit)`,
        aayojana_anugaman: `${districtNe} राष्ट्रिय गौरव तथा बहुवर्षीय आयोजना स्थलगत अनुगमन`,
        namuna_parikshan: `${districtNe} आयोजनाको बिटुमिन तथा कङ्क्रिट कोर प्रयोगशाला परीक्षण`,
        prabardhanatmak: `${districtNe} सुशासन तथा भ्रष्टाचार न्यूनीकरण अन्तरक्रिया कार्यक्रम`,
        suchana_prakashan: `त्रैमासिक सतर्कता बुलेटिन तथा सार्वजनिक सूचना प्रकाशन`,
      };

      batch.set(doc(db, 'activities', actId), {
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'complaints/activities');
  }
}
