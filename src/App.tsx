import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  ActivityRecord,
  ComplaintRecord,
  FiscalYear,
  MahashakhaId,
  MenuId,
  RoleLevel,
  ShakhaId,
  UserProfile,
} from './types/nvc';
import {
  CURRENT_NEPALI_DATE_DISPLAY,
  FISCAL_YEARS,
  getMahashakhaName,
  getShakhaName,
  getSidebarMenuForRole,
  hasExtraTechnicalStatCards,
  MAHASHAKHAS,
  SHAKHAS,
  toNepaliDigits,
} from './data/nvcStructure';
import { ensureInitialNvcSeedData } from './data/seedData';
import { DashboardOverview } from './components/DashboardOverview';
import { UserManagementView } from './components/UserManagementView';
import { ModuleWorkspaceView } from './components/ModuleWorkspaceView';
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  PhoneCall,
  Globe,
  Headphones,
  SearchCheck,
  Building2,
  ScrollText,
  HardHat,
  Compass,
  FlaskConical,
  Megaphone,
  Newspaper,
  BarChart3,
  Calendar,
  KeyRound,
  Users,
  Settings,
  Search,
  ChevronDown,
  LogOut,
  Shield,
  Menu,
  X,
  Eye,
} from 'lucide-react';

const MENU_ICONS: Record<MenuId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  complaints_all: Files,
  new_complaint: FilePlus2,
  hello_sarkar: PhoneCall,
  online_complaint: Globe,
  hotline_complaint: Headphones,
  investigation: SearchCheck,
  office_monitoring: Building2,
  citizen_charter: ScrollText,
  project_monitoring: HardHat,
  technical_audit: Compass,
  new_sample: FlaskConical,
  promotional_program: Megaphone,
  notice_publication: Newspaper,
  reports: BarChart3,
  calendar: Calendar,
  change_password: KeyRound,
  user_management: Users,
  settings: Settings,
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin Perspective Preview Switcher (Allows Admin to inspect any of the 3 Mahashakhas or 13 Shakhas live)
  const [previewMode, setPreviewMode] = useState<{
    enabled: boolean;
    role: RoleLevel;
    mahashakhaId: MahashakhaId;
    shakhaId: ShakhaId;
  }>({
    enabled: false,
    role: 'mahashakha',
    mahashakhaId: 'maha_tech',
    shakhaId: 'shakha_tech_audit',
  });

  // Navigation & Global Filters
  const [activeMenu, setActiveMenu] = useState<MenuId>('dashboard');
  const [selectedFiscalYear, setSelectedFiscalYear] =
    useState<FiscalYear>('2083/84');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Firestore Collections State
  const [allComplaints, setAllComplaints] = useState<ComplaintRecord[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 1. Listen to Firebase Authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setAuthReady(true);

      if (!u) {
        setUserProfile(null);
        setAllComplaints([]);
        setAllActivities([]);
        setAllUsers([]);
        return;
      }

      setProfileLoading(true);
      try {
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);
        const isPrimaryBootstrappedAdmin =
          u.email?.toLowerCase() === 'vigilancenepal@gmail.com';

        if (!snap.exists()) {
          // Check if an admin pre-registered a record matching this email
          let initialRole: RoleLevel = isPrimaryBootstrappedAdmin
            ? 'admin'
            : 'shakha';
          let initialMaha = isPrimaryBootstrappedAdmin ? 'all' : 'maha_admin';
          let initialShakha = isPrimaryBootstrappedAdmin
            ? 'all'
            : 'shakha_admin_plan';
          let initialDesignation = isPrimaryBootstrappedAdmin
            ? 'मुख्य प्रणाली प्रशासक (Admin)'
            : 'शाखा अधिकृत';

          const newProfileData = {
            uid: u.uid,
            email: (u.email || 'user@nvc.gov.np').toLowerCase(),
            fullName: u.displayName || 'राष्ट्रिय सतर्कता केन्द्र अधिकारी',
            designation: initialDesignation,
            role: initialRole,
            mahashakhaId: initialMaha,
            shakhaId: initialShakha,
            status: 'active' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfileData);

          if (isPrimaryBootstrappedAdmin) {
            await ensureInitialNvcSeedData(u.uid);
          }
        } else if (isPrimaryBootstrappedAdmin) {
          await ensureInitialNvcSeedData(u.uid);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
      } finally {
        setProfileLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // 2. Real-time listener on current user's profile
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile({
            id: snap.id,
            uid: d.uid,
            email: d.email,
            fullName: d.fullName,
            designation: d.designation,
            role: d.role,
            mahashakhaId: d.mahashakhaId,
            shakhaId: d.shakhaId,
            status: d.status,
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`)
    );
    return () => unsub();
  }, [authReady, firebaseUser]);

  // 3. Real-time RBAC-enforced listeners for Complaints, Activities, and Users
  useEffect(() => {
    if (!authReady || !firebaseUser || !userProfile) return;
    if (userProfile.status !== 'active') return;

    setDataLoading(true);

    // Build RBAC-scoped query based on user's actual role
    const complaintsCol = collection(db, 'complaints');
    const activitiesCol = collection(db, 'activities');

    const complaintsQuery =
      userProfile.role === 'admin'
        ? query(complaintsCol)
        : userProfile.role === 'mahashakha'
        ? query(complaintsCol, where('mahashakhaId', '==', userProfile.mahashakhaId))
        : query(complaintsCol, where('shakhaId', '==', userProfile.shakhaId));

    const activitiesQuery =
      userProfile.role === 'admin'
        ? query(activitiesCol)
        : userProfile.role === 'mahashakha'
        ? query(activitiesCol, where('mahashakhaId', '==', userProfile.mahashakhaId))
        : query(activitiesCol, where('shakhaId', '==', userProfile.shakhaId));

    const unsubComplaints = onSnapshot(
      complaintsQuery,
      (snap) => {
        const list: ComplaintRecord[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ComplaintRecord, 'id'>),
        }));
        setAllComplaints(list);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'complaints')
    );

    const unsubActivities = onSnapshot(
      activitiesQuery,
      (snap) => {
        const list: ActivityRecord[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ActivityRecord, 'id'>),
        }));
        setAllActivities(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activities')
    );

    let unsubUsers: (() => void) | undefined;
    if (userProfile.role === 'admin') {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list: UserProfile[] = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<UserProfile, 'id'>),
          }));
          setAllUsers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );
    }

    return () => {
      unsubComplaints();
      unsubActivities();
      if (unsubUsers) unsubUsers();
    };
  }, [authReady, firebaseUser, userProfile]);

  // Effective Role & Unit (supports Admin inspecting Mahashakha/Shakha views)
  const effectiveRole: RoleLevel =
    userProfile?.role === 'admin' && previewMode.enabled
      ? previewMode.role
      : userProfile?.role || 'shakha';

  const effectiveMahashakhaId: string =
    userProfile?.role === 'admin' && previewMode.enabled
      ? previewMode.mahashakhaId
      : userProfile?.mahashakhaId || 'maha_admin';

  const effectiveShakhaId: string =
    userProfile?.role === 'admin' && previewMode.enabled
      ? previewMode.role === 'shakha'
        ? previewMode.shakhaId
        : 'all'
      : userProfile?.shakhaId || 'shakha_admin_plan';

  // Sidebar Menu Items strictly derived from Specification (a - g)
  const sidebarMenus = useMemo(
    () =>
      getSidebarMenuForRole(
        effectiveRole,
        effectiveMahashakhaId,
        effectiveShakhaId
      ),
    [effectiveRole, effectiveMahashakhaId, effectiveShakhaId]
  );

  // Ensure activeMenu stays valid when switching role perspective
  useEffect(() => {
    if (!sidebarMenus.some((m) => m.id === activeMenu)) {
      setActiveMenu('dashboard');
    }
  }, [sidebarMenus, activeMenu]);

  // Scope data according to effective role (enforces exact 3-level RBAC even when Admin previews a Mahashakha or Shakha)
  const scopedComplaints = useMemo(() => {
    if (effectiveRole === 'admin') return allComplaints;
    if (effectiveRole === 'mahashakha') {
      return allComplaints.filter(
        (c) => c.mahashakhaId === effectiveMahashakhaId
      );
    }
    return allComplaints.filter(
      (c) =>
        c.shakhaId === effectiveShakhaId ||
        c.createdByUid === firebaseUser?.uid
    );
  }, [
    allComplaints,
    effectiveRole,
    effectiveMahashakhaId,
    effectiveShakhaId,
    firebaseUser?.uid,
  ]);

  const scopedActivities = useMemo(() => {
    if (effectiveRole === 'admin') return allActivities;
    if (effectiveRole === 'mahashakha') {
      return allActivities.filter(
        (a) => a.mahashakhaId === effectiveMahashakhaId
      );
    }
    return allActivities.filter(
      (a) =>
        a.shakhaId === effectiveShakhaId ||
        a.createdByUid === firebaseUser?.uid
    );
  }, [
    allActivities,
    effectiveRole,
    effectiveMahashakhaId,
    effectiveShakhaId,
    firebaseUser?.uid,
  ]);

  const showExtraTechStats = useMemo(
    () =>
      hasExtraTechnicalStatCards(
        effectiveRole,
        effectiveMahashakhaId,
        effectiveShakhaId
      ),
    [effectiveRole, effectiveMahashakhaId, effectiveShakhaId]
  );

  const roleLoginDisplayName = useMemo(() => {
    if (!userProfile) return '';
    if (effectiveRole === 'admin') {
      return `${userProfile.fullName} (एडमिन)`;
    }
    if (effectiveRole === 'mahashakha') {
      return `${getMahashakhaName(effectiveMahashakhaId)} प्रमुख`;
    }
    return `${getShakhaName(effectiveShakhaId)}`;
  }, [userProfile, effectiveRole, effectiveMahashakhaId, effectiveShakhaId]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setAuthError(
        err?.message || 'प्रणालीमा लगइन गर्दा समस्या देखियो। पुन: प्रयास गर्नुहोस्।'
      );
    }
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await signOut(auth);
  };

  // ---------------- AUTHENTICATION GATE ----------------
  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-950 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            राष्ट्रिय सतर्कता केन्द्र प्रणाली लोड हुँदैछ...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
        {/* Top Official Sovereign Strip */}
        <div className="bg-blue-950 text-white border-b-2 border-red-700 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
            <span>नेपाल सरकार · प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय</span>
            <span>सिंहदरबार, काठमाडौँ · मिति: {CURRENT_NEPALI_DATE_DISPLAY}</span>
          </div>
        </div>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-sm">
            {/* Left Institutional Identity */}
            <div className="md:col-span-7 bg-blue-950 text-white p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-red-700 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-200">नेपाल सरकार</p>
                    <h1 className="text-xl font-bold tracking-tight">
                      राष्ट्रिय सतर्कता केन्द्र
                    </h1>
                  </div>
                </div>

                <h2 className="mt-6 text-2xl font-bold leading-snug">
                  एकीकृत उजुरी व्यवस्थापन, प्राविधिक परीक्षण तथा अनुगमन प्रणाली (NVC-IMS)
                </h2>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  भ्रष्टाचार निवारण ऐन, २०५९ बमोजिम सार्वजनिक निकायहरूमा हुने अनियमितता नियन्त्रण, उजुरी छानविन, छड्के कार्यालय अनुगमन, नागरिक बडापत्र सुपरीवेक्षण तथा विकास आयोजनाहरूको प्राविधिक परीक्षण व्यवस्थापन गर्ने आधिकारिक प्लेटफर्म।
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-blue-900 space-y-2 text-xs text-blue-200">
                <div className="font-semibold text-white">संगठनात्मक संरचना (३ महाशाखा · १३ शाखा):</div>
                <div>१. प्रशासन तथा सूचना सङ्कलन महाशाखा (७ शाखाहरू)</div>
                <div>२. प्राविधिक परीक्षण तथा अनुगमन महाशाखा (५ शाखाहरू)</div>
                <div>३. प्रहरी महाशाखा (प्रहरी शाखा)</div>
              </div>
            </div>

            {/* Right Login Form */}
            <div className="md:col-span-5 p-8 flex flex-col justify-center bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-900">प्रणालीमा प्रवेश गर्नुहोस्</h3>
                <p className="text-xs text-slate-500 mt-1">
                  आफ्नो आधिकारिक Google खातामार्फत लगइन गरी तोकिएको महाशाखा वा शाखाको कार्यसम्पादन ड्यासबोर्ड प्रयोग गर्नुहोस्।
                </p>

                {authError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    {authError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-6 w-full py-2.5 px-4 bg-blue-950 hover:bg-blue-900 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  आधिकारिक खाताबाट लगइन गर्नुहोस् (Google SSO)
                </button>

                <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-700">
                    बहु-स्तरीय पहुँच नियन्त्रण (3-Level RBAC):
                  </div>
                  <p>
                    · <strong className="text-slate-700">Admin:</strong> सबै महाशाखा र शाखाको डेटा तथा प्रयोगकर्ता व्यवस्थापन
                  </p>
                  <p>
                    · <strong className="text-slate-700">Division/महाशाखा:</strong> आफ्नो मातहतका शाखाहरूको मात्र डेटा र अनुगमन
                  </p>
                  <p>
                    · <strong className="text-slate-700">Shakha/शाखा:</strong> आफ्नो शाखामा दर्ता वा तोकिएका कार्यहरूको मात्र पहुँच
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-3 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
          © २०८३ राष्ट्रिय सतर्कता केन्द्र, सिंहदरबार, काठमाडौँ · सर्वाधिकार सुरक्षित
        </footer>
      </div>
    );
  }

  // Blocked / Inactive Account Check
  if (userProfile.status !== 'active') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 text-center space-y-4">
          <h2 className="text-base font-bold text-red-800">खाता निष्क्रिय गरिएको छ</h2>
          <p className="text-xs text-slate-600">
            तपाईंको प्रयोगकर्ता खाता हाल निष्क्रिय (Inactive) अवस्थामा छ। कृपया राष्ट्रिय सतर्कता केन्द्रको प्रणाली प्रशासक (Admin) सँग सम्पर्क गर्नुहोस्।
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
          >
            लगआउट गर्नुहोस्
          </button>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED WORKSPACE ----------------
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (264px width) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-66 bg-blue-950 text-slate-100 flex flex-col border-r border-blue-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-blue-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-red-700 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-blue-300 truncate">नेपाल सरकार</div>
              <div className="text-sm font-bold text-white truncate">
                राष्ट्रिय सतर्कता केन्द्र
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-blue-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Unit Context Banner */}
        <div className="px-4 py-2.5 bg-blue-900/50 border-b border-blue-900 text-[11px]">
          <div className="text-blue-300">सक्रिय कार्यक्षेत्र:</div>
          <div className="font-semibold text-white leading-snug mt-0.5">
            {effectiveRole === 'admin'
              ? 'केन्द्रीय एडमिन (सबै महाशाखा/शाखा)'
              : effectiveRole === 'mahashakha'
              ? getMahashakhaName(effectiveMahashakhaId)
              : getShakhaName(effectiveShakhaId)}
          </div>
        </div>

        {/* Dynamic Role-Specific Menu List (Exact Specification a-g) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5" aria-label="साइडबार मेनु">
          {sidebarMenus.map((item) => {
            const IconComp = MENU_ICONS[item.id] || LayoutDashboard;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveMenu(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-red-700 text-white font-semibold'
                    : 'text-blue-100 hover:bg-blue-900/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.labelNe}</span>
                </span>
                {item.id === 'complaints_all' && (
                  <span
                    className={`font-mono-num text-[11px] shrink-0 ${
                      isActive ? 'text-white' : 'text-red-300 font-semibold'
                    }`}
                  >
                    {toNepaliDigits(scopedComplaints.length)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Institutional Note */}
        <div className="p-3 border-t border-blue-900 text-[11px] text-blue-300">
          सिंहदरबार, काठमाडौँ · टोल फ्री: ११११ / १०३
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar per Requirement h:
            राष्ट्रिय सतर्कता केन्द्र, search bar, आ.व select dropdown, नेपाली मिति, role अनुसारको login को नाम र क्लिक गर्दा लगआउट option */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand Title + Mobile Menu Trigger */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                aria-label="मेनु खोल्नुहोस्"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-base sm:text-lg font-bold tracking-tight text-blue-950 whitespace-nowrap">
                राष्ट्रिय सतर्कता केन्द्र
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="उजुरी दर्ता नं., विषय, मन्त्रालय वा जिल्ला खोज्नुहोस्..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition-colors"
              />
            </div>

            {/* Right Controls: Fiscal Year Dropdown, Nepali Date, Role Login Name + Click Logout */}
            <div className="flex items-center gap-3 shrink-0">
              {/* आ.व. Select Dropdown */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="fy-select" className="text-xs font-medium text-slate-600 hidden sm:inline">
                  आ.व.:
                </label>
                <select
                  id="fy-select"
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value as FiscalYear)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-900 cursor-pointer"
                >
                  {FISCAL_YEARS.map((fy) => (
                    <option key={fy.value} value={fy.value}>
                      {fy.labelNe}
                    </option>
                  ))}
                </select>
              </div>

              {/* नेपाली मिति */}
              <div className="hidden xl:block text-xs text-slate-600 font-medium whitespace-nowrap border-l border-slate-200 pl-3">
                मिति: {CURRENT_NEPALI_DATE_DISPLAY}
              </div>

              {/* Role अनुसारको Login को नाम र क्लिक गर्दा लगआउट Option */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors max-w-[260px] cursor-pointer"
                >
                  <span className="truncate">{roleLoginDisplayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900">{userProfile.fullName}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {userProfile.designation}
                      </div>
                      <div className="text-slate-400 font-mono-num text-[11px] truncate">
                        {userProfile.email}
                      </div>
                    </div>

                    {userProfile.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setPreviewMode((p) => ({ ...p, enabled: false }));
                          setActiveMenu('user_management');
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-900" />
                        प्रयोगकर्ता व्यवस्थापन (RBAC)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2 text-left text-red-700 hover:bg-red-50 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      लगआउट गर्नुहोस् (Logout)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Admin Interactive Role/Division/Branch Inspector Toolbar
            Lets Admin seamlessly inspect any of the 3 Mahashakhas or 13 Shakhas to verify exact sidebar menus (a-g),
            extra technical stat cards (i), and 3-tier RBAC data scoping */}
        {userProfile.role === 'admin' && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Eye className="w-3.5 h-3.5 text-blue-900 shrink-0" />
              <span className="font-semibold">एडमिन दृश्य परीक्षण (Role & महाशाखा/शाखा स्विचर):</span>
              <span className="text-slate-500 hidden md:inline">
                प्रत्येक महाशाखा र शाखाको विशिष्ट साइडबार मेनु र डेटा पहुँच जाँच गर्नुहोस्
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={previewMode.enabled ? previewMode.role : 'admin'}
                onChange={(e) => {
                  const val = e.target.value as RoleLevel;
                  if (val === 'admin') {
                    setPreviewMode((p) => ({ ...p, enabled: false }));
                  } else {
                    setPreviewMode((p) => ({
                      ...p,
                      enabled: true,
                      role: val,
                    }));
                  }
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800"
              >
                <option value="admin">१. एडमिन ड्यासबोर्ड (सबै तह)</option>
                <option value="mahashakha">२. महाशाखा ड्यासबोर्ड (Division View)</option>
                <option value="shakha">३. शाखा ड्यासबोर्ड (Shakha View)</option>
              </select>

              {previewMode.enabled && (
                <select
                  value={previewMode.mahashakhaId}
                  onChange={(e) => {
                    const mId = e.target.value as MahashakhaId;
                    const firstShakha =
                      SHAKHAS.find((s) => s.mahashakhaId === mId)?.id ||
                      'shakha_admin_plan';
                    setPreviewMode((p) => ({
                      ...p,
                      mahashakhaId: mId,
                      shakhaId: firstShakha,
                    }));
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                >
                  {MAHASHAKHAS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code}. {m.nameNe}
                    </option>
                  ))}
                </select>
              )}

              {previewMode.enabled && previewMode.role === 'shakha' && (
                <select
                  value={previewMode.shakhaId}
                  onChange={(e) =>
                    setPreviewMode((p) => ({
                      ...p,
                      shakhaId: e.target.value as ShakhaId,
                    }))
                  }
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                >
                  {SHAKHAS.filter(
                    (s) => s.mahashakhaId === previewMode.mahashakhaId
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.nameNe}
                    </option>
                  ))}
                </select>
              )}

              {previewMode.enabled && (
                <button
                  type="button"
                  onClick={() => setPreviewMode((p) => ({ ...p, enabled: false }))}
                  className="px-2.5 py-1 bg-blue-950 text-white rounded text-xs font-medium cursor-pointer"
                >
                  एडमिनमा फर्कनुहोस्
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-4 lg:p-6 w-full min-w-0">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-20 bg-white border border-slate-200 rounded-lg animate-pulse"
                  />
                ))}
              </div>
              <div className="h-80 bg-white border border-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : activeMenu === 'dashboard' ? (
            <DashboardOverview
              complaints={scopedComplaints}
              activities={scopedActivities}
              selectedFiscalYear={selectedFiscalYear}
              showExtraTechStats={showExtraTechStats}
              searchQuery={searchQuery}
              onNavigateMenu={setActiveMenu}
            />
          ) : activeMenu === 'user_management' && effectiveRole === 'admin' ? (
            <UserManagementView
              users={allUsers}
              currentAdminUid={firebaseUser.uid}
            />
          ) : (
            <ModuleWorkspaceView
              activeMenu={activeMenu}
              complaints={scopedComplaints}
              activities={scopedActivities}
              currentUid={firebaseUser.uid}
              effectiveRole={effectiveRole}
              effectiveMahashakhaId={effectiveMahashakhaId}
              effectiveShakhaId={effectiveShakhaId}
              selectedFiscalYear={selectedFiscalYear}
              searchQuery={searchQuery}
              onNavigateDashboard={() => setActiveMenu('dashboard')}
              onSelectMenu={(m) => setActiveMenu(m)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
