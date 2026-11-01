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
  | 'new_complaint'
  | 'complaints_all'
  | 'hello_sarkar'
  | 'online_complaint'
  | 'hotline_complaint'
  | 'investigation'
  | 'office_monitoring'
  | 'citizen_charter'
  | 'project_monitoring'
  | 'technical_audit'
  | 'new_sample'
  | 'sample_reports'
  | 'promotional_program'
  | 'notice_publication'
  | 'reports'
  | 'calendar'
  | 'change_password'
  | 'user_management'
  | 'settings';

export type ComplaintSource = 'hello_sarkar' | 'online' | 'hotline' | 'kendra_darta';
export type ComplaintStatus = 'chalu' | 'farchhaut' | 'patrachar_baki' | 'chhanbin_ma' | 'kam_baki';
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
  title: string;
  complainant: string;
  source: ComplaintSource;
  ministry: string;
  nature: string;
  status: ComplaintStatus;
  districtEn: string;
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
  status: 'sampanna' | 'chalu' | 'pratibedan_pesh';
  mahashakhaId: MahashakhaId;
  shakhaId: ShakhaId;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
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
