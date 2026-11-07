export type RoleLevel = 'admin' | 'mahashakha' | 'shakha';

export type MahashakhaId = 'maha_admin' | 'maha_tech' | 'maha_police';

export type ShakhaId =
  | 'shakha_admin_plan'
  | 'shakha_info_complaint'
  | 'shakha_finance'
  | 'shakha_investigation'
  | 'shakha_legal'
  | 'shakha_property'
  | 'shakha_decision_archive'
  | 'shakha_tech_audit'
  | 'shakha_tech_investigation'
  | 'shakha_lab_testing'
  | 'shakha_tech_training'
  | 'shakha_it'
  | 'shakha_police';

export type MenuId =
  | 'dashboard'
  | 'complaints_all'
  | 'new_complaint'
  | 'hello_sarkar'
  | 'online_complaint'
  | 'hotline_complaint'
  | 'investigation'
  | 'office_monitoring'
  | 'citizen_charter'
  | 'service_survey'
  | 'project_monitoring'
  | 'technical_audit'
  | 'new_sample'
  | 'promotional_program'
  | 'notice_publication'
  | 'reports'
  | 'calendar'
  | 'change_password'
  | 'user_management'
  | 'settings';

export type ComplaintSource = 'hello_sarkar' | 'online' | 'hotline' | 'kendra_darta';
export type ComplaintStatus = 'chalu' | 'farchhaut' | 'patrachar_baki' | 'chhanbin_ma' | 'kam_baki';
export type ComplaintPriority = 'उच्च' | 'मध्यम' | 'सामान्य';
export type FiscalYear = '2083/84' | '2082/83' | '2081/82';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  designation: string;
  role: RoleLevel;
  mahashakhaId: string;
  shakhaId: string;
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ComplaintRecord {
  id: string;
  dartaNo: string;
  title: string; // उजुरीको विवरण
  complainant: string; // उजुरकर्ता
  complainantContact?: string; // सम्पर्क नं / इमेल
  respondent?: string; // विपक्षी
  source: ComplaintSource;
  ministry: string; // मन्त्रालय/निकाय
  nature: string;
  status: ComplaintStatus; // स्थिति
  priority?: ComplaintPriority; // उच्च / मध्यम / सामान्य
  province?: string; // प्रदेश
  districtEn: string; // जिल्ला
  localLevel?: string; // स्थानीय तह
  committeeDecision?: string; // समितिको निर्णय
  finalDecision?: string; // अन्तिम निर्णय
  finalDecisionType?: string; // अन्तिम निर्णयको प्रकार
  finalDecisionDate?: string; // अन्तिम निर्णय मिति
  implementationInfoDate?: string; // कार्यान्वयनको जानकारी प्राप्त मिति
  investigationOfficer?: string; // अनुसन्धान/छानविन अधिकृत
  investigationOutcome?: string; // छानविन निष्कर्ष
  patracharChalaniNo?: string; // पत्राचार चलानी नं.
  progressNote?: string; // कारबाही प्रगति विवरण
  remarks?: string; // कैफियत
  fiscalYear: FiscalYear;
  monthIndex: number; // 1 = बैशाख ... 12 = चैत्र
  nepaliDate: string;
  mahashakhaId: MahashakhaId;
  shakhaId: ShakhaId;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ActivityType =
  | 'karyalaya_anugaman'
  | 'badapatra_anugaman'
  | 'service_survey'
  | 'chhanbin_anveshan'
  | 'prabidhik_parikshan'
  | 'aayojana_anugaman'
  | 'namuna_parikshan'
  | 'prabardhanatmak'
  | 'suchana_prakashan';

export interface ActivityRecord {
  id: string;
  refNo: string;
  activityType: ActivityType;
  title: string;
  entityName: string;
  districtEn: string;
  fiscalYear: FiscalYear;
  monthIndex: number;
  nepaliDate: string;
  nonComplianceCount: number;
  directiveCount: number;
  status: 'sampanna' | 'chalu' | 'pratibedan_pesh' | 'cancelled';
  mahashakhaId: MahashakhaId;
  shakhaId: ShakhaId;
  createdByUid: string;
  dartaNo?: string | null;
  dartaDate?: string | null;
  complainant?: string | null;
  respondent?: string | null;
  relatedAgency?: string | null;
  complaintDetails?: string | null;
  investigationDate?: string | null;
  reportDate?: string | null;
  reportSummary?: string | null;
  attachmentPaths?: string[] | null;
  officeMonitoringDetails?: OfficeMonitoringDetails | null;
  citizenCharterDetails?: CitizenCharterDetails | null;
  serviceSurveyDetails?: ServiceSurveyDetails | null;
  promotionalProgramDetails?: PromotionalProgramDetails | null;
  noticePublicationDetails?: NoticePublicationDetails | null;
  projectMonitoringDetails?: ProjectMonitoringDetails | null;
  technicalAuditDetails?: TechnicalAuditDetails | null;
  labTestDetails?: LabTestDetails | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TechnicalAuditDetails {
  projectName: string;
  relatedAgency: string;
  projectNature: string;
  auditDate: string;
  status: 'chalu' | 'sampanna' | 'pratibedan_pesh';
  nonComplianceDetails: string;
  reportDate: string;
  reportInformationDate: string;
  remarks: string;
  auditorName?: string;
  auditorDesignation?: string;
  contractNo?: string;
  contractAmount?: number;
  consultantName?: string;
  auditStage?: 'pre_construction' | 'during_construction' | 'post_construction';
  qualityRating?: 'उत्कृष्ट' | 'सन्तोषजनक' | 'सुधार आवश्यक' | 'गम्भीर त्रुटि';
  financialRecoveryAmount?: number;
  remedialDirectives?: string;
  checks?: Record<string, { standard: string; status: 'yes' | 'no' | 'na'; remarks: string }>;
}

export interface LabTestDetails {
  sampleCode: string;
  sampleType: 'concrete_core' | 'bitumen' | 'rebar_steel' | 'soil_cbr' | 'aggregate';
  sampleName: string;
  projectName: string;
  locationChainage: string;
  collectionDate: string;
  testedDate: string;
  technicianName: string;
  verifiedBy: string;
  specifiedStandard: string;
  obtainedValue: number;
  requiredValue: number;
  unit: string;
  variancePercentage: number;
  result: 'pass' | 'fail';
  complianceVerdict?: 'PASS' | 'FAIL' | string;
  testStandard?: string;
  remarks?: string;
}

export interface ProjectMonitoringCheck {
  answer: 'yes' | 'no' | 'na' | '';
  remarks: string;
}

export interface ProjectMonitoringTeamMember {
  name: string;
  post: string;
  date: string;
}

export interface ProjectMonitoringDetails {
  projectName: string;
  province: string;
  districtEn: string;
  localLevel: string;
  fullAddress: string;
  wardNo: string;
  implementingAgency: string;
  contractorName: string;
  agreementNo: string;
  agreementDate: string;
  startDate: string;
  expectedCompletionDate: string;
  approvedCost: number;
  paidAmount: number;
  physicalProgress: number;
  inspectionDate: string;
  checks: Record<string, ProjectMonitoringCheck>;
  overallRemarks: string;
  recommendation: string;
  team: ProjectMonitoringTeamMember[];
  status: 'planned' | 'ongoing' | 'completed' | 'delayed';
}

export interface NoticePublicationDetails {
  date: string;
  title: string;
  description: string;
  noticeNo?: string;
  dispatchedBy?: string;
  category?: string;
  targetAudience?: string;
}

export interface PromotionalProgramDetails {
  programName: string;
  plannedFiscalYear: FiscalYear;
  date: string;
  location: string;
  districtEn: string;
  localLevel: string;
  targetGroup: string;
  participantCount: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  chiefGuest?: string;
  objective?: string;
  keyOutcomes?: string;
  budgetAmount?: number;
  coordinatorName?: string;
}

export interface CitizenCharterDetails {
  date: string;
  province: string;
  localLevel: string;
  fullAddress: string;
  officeName: string;
  auditor: string;
  auditorPost: string;
  checks: Record<string, string>;
  facilities: Record<string, string>;
  mainServices: string;
  irregularities: string;
  recommendations: string;
  staffing: {
    sanctioned: number;
    working: number;
    vacant: number;
    equalizationPending: number;
    excess: number;
  };
  auditorRemarks: string;
}

export interface ServiceSurveyDetails {
  province: string;
  districtEn: string;
  localLevel: string;
  fullAddress: string;
  gender: string;
  previousOffices: string[];
  serviceOffice: string;
  improvements: string;
  goodServiceOffices: string;
  weakServiceOffices: string;
  answers: Record<string, string>;
  dissatisfactionReasons: string[];
  surveyDate: string;
}

export interface OfficeMonitoringStaff {
  type: string;
  name: string;
  designation: string;
  signalNo: string;
  remarks: string;
}

export interface OfficeMonitoringDetails {
  date: string;
  province: string;
  localLevel: string;
  officeName: string;
  officePhone: string;
  monitoringTime: string;
  observer: string;
  observerPost: string;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  responsibleOfficer: string;
  responsibleOfficerPost: string;
  staff: OfficeMonitoringStaff[];
  remarks: string;
  timeViolationCount: number;
  dressViolationCount: number;
  lateStaffCount?: number;
  dressViolatorsCount?: number;
  recommendationCount: number;
}

export interface MahashakhaDef {
  id: MahashakhaId;
  code: string;
  nameNe: string;
  shortNe: string;
}

export interface ShakhaDef {
  id: ShakhaId;
  code: string;
  mahashakhaId: MahashakhaId;
  nameNe: string;
  menuGroup: 'a' | 'b' | 'c' | 'd';
}
