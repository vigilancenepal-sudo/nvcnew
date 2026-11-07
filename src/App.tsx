import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
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
  MessageSquareText,
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  ShieldCheck,
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
  service_survey: MessageSquareText,
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
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

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
  const [startupNoticeDismissed, setStartupNoticeDismissed] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] =
    useState<FiscalYear>('2083/84');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const quickActionRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Supabase collections state
  const [allComplaints, setAllComplaints] = useState<ComplaintRecord[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Close profile and quick-action dropdowns on outside click
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        quickActionRef.current &&
        !quickActionRef.current.contains(ev.target as Node)
      ) {
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global Ctrl+K / Cmd+K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Listen to Supabase Authentication
  useEffect(() => {
    let active = true;

    const loadProfile = async (user: User | null) => {
      setAuthenticatedUser(user);
      setAuthReady(true);

      if (!user) {
        setUserProfile(null);
        setAllComplaints([]);
        setAllActivities([]);
        setAllUsers([]);
        setDataLoading(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setAuthError(null);
      try {
        const { error: ensureProfileError } = await supabase.rpc('ensure_current_profile');
        if (ensureProfileError) throw ensureProfileError;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('authUserId', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error('प्रयोगकर्ता प्रोफाइल भेटिएन। Supabase SQL schema लागू भएको जाँच गर्नुहोस्।');
        }

        if (!active) return;
        setUserProfile(data as UserProfile);
        if (
          data.role === 'admin' &&
          data.status === 'active' &&
          data.email.toLowerCase() === 'vigilancenepal@gmail.com'
        ) {
          await ensureInitialNvcSeedData(user.id);
        }
      } catch (err) {
        if (active) {
          setAuthError(err instanceof Error ? err.message : String(err));
          console.error('Unable to load Supabase profile:', err);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message);
        setAuthReady(true);
        return;
      }
      void loadProfile(data.session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadProfile(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Listen for changes to the current user's profile
  useEffect(() => {
    if (!authReady || !authenticatedUser) return;
    const channel = supabase
      .channel(`profile-${authenticatedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `authUserId=eq.${authenticatedUser.id}`,
        },
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('authUserId', authenticatedUser.id)
            .maybeSingle();
          if (error) {
            setAuthError(error.message);
            return;
          }
          setUserProfile(data as UserProfile | null);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authReady, authenticatedUser]);

  // 3. Realtime listeners; row-level security enforces role and unit access.
  useEffect(() => {
    if (!authReady || !authenticatedUser || !userProfile) return;
    if (userProfile.status !== 'active') {
      setAllComplaints([]);
      setAllActivities([]);
      setAllUsers([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setDataError(null);
    let active = true;

    const refreshData = async () => {
      const [complaintsResult, activitiesResult] = await Promise.all([
        supabase.from('complaints').select('*'),
        supabase.from('activities').select('*'),
      ]);
      if (complaintsResult.error) throw complaintsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (!active) return;
      setAllComplaints(complaintsResult.data as ComplaintRecord[]);
      setAllActivities(activitiesResult.data as ActivityRecord[]);
      if (userProfile.role === 'admin') {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (!active) return;
        setAllUsers(data as UserProfile[]);
      } else {
        setAllUsers([]);
      }
      setDataLoading(false);
    };

    const loadError = (error: unknown) => {
      if (!active) return;
      setDataError(error instanceof Error ? error.message : String(error));
      setDataLoading(false);
      console.error('Unable to load Supabase data:', error);
    };
    void refreshData().catch(loadError);

    const channel = supabase
      .channel(`nvc-data-${authenticatedUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        void refreshData().catch(loadError);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        void refreshData().catch(loadError);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void refreshData().catch(loadError);
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          loadError(error ?? new Error(`Realtime subscription ${status.toLowerCase()}`));
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authReady, authenticatedUser, userProfile]);

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
        c.createdByUid === authenticatedUser?.id
    );
  }, [
    allComplaints,
    effectiveRole,
    effectiveMahashakhaId,
    effectiveShakhaId,
    authenticatedUser?.id,
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
        a.createdByUid === authenticatedUser?.id
    );
  }, [
    allActivities,
    effectiveRole,
    effectiveMahashakhaId,
    effectiveShakhaId,
    authenticatedUser?.id,
  ]);

  const startupNotice = useMemo(
    () =>
      scopedActivities
        .filter((activity) => activity.activityType === 'suchana_prakashan')
        .sort((a, b) => {
          const dateA =
            a.noticePublicationDetails?.date ?? a.nepaliDate ?? '';
          const dateB =
            b.noticePublicationDetails?.date ?? b.nepaliDate ?? '';
          return dateB.localeCompare(dateA);
        })[0] ?? null,
    [scopedActivities]
  );

  useEffect(() => {
    setStartupNoticeDismissed(false);
  }, [authenticatedUser?.id]);

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
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

  if (!authenticatedUser || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
        {/* Top Official Sovereign Strip */}
        <div className="bg-blue-950 text-white border-b-2 border-red-700 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
            <span>नेपाल सरकार · राष्ट्रिय सतर्कता केन्द्र</span>
            <span>सिंहदरबार, काठमाडौँ · मिति: {CURRENT_NEPALI_DATE_DISPLAY}</span>
          </div>
        </div>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-sm">
            {/* Left Institutional Identity */}
            <div className="md:col-span-7 bg-blue-950 text-white p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src="/coa.png"
                    alt="नेपालको राष्ट्रिय चिन्ह"
                    className="w-11 h-11 rounded-lg object-contain shrink-0"
                  />
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
                  भ्रष्टाचार निवारण ऐन, २०५९ बमोजिम सार्वजनिक निकायहरूमा हुने अनियमितता नियन्त्रण, उजुरी छानविन, नियमित र आकस्मिक अनुगमन, नागरिक बडापत्र कार्यान्वयन अनुगमन तथा विकास आयोजनाहरूको अनुगमन एवम् प्राविधिक परीक्षण।
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-blue-900 space-y-2 text-xs text-blue-200">
                <div className="font-semibold text-white">संगठनात्मक संरचना (३ महाशाखा · १३ शाखा):</div>
                <div>प्रशासन तथा सूचना सङ्कलन महाशाखा (७ शाखाहरू)</div>
                <div>प्राविधिक परीक्षण तथा अनुगमन महाशाखा (५ शाखाहरू)</div>
                <div>प्रहरी महाशाखा (प्रहरी शाखा)</div>
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
        className={`fixed inset-y-0 left-0 z-50 w-66 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-66'
          } bg-gradient-to-b from-[#07172c] via-[#0b213f] to-[#061222] text-slate-100 flex flex-col border-r border-blue-900/80 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } shadow-xl`}
      >
        {/* Sidebar Header */}
        <div className={`border-b border-blue-900/80 flex items-center justify-between gap-2 px-3.5 py-3.5 ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-2' : ''
          }`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${sidebarCollapsed ? 'lg:justify-center lg:gap-0' : ''
            }`}>
            <div className="w-8 h-8 rounded-lg bg-white/95 p-0.5 border border-white/30 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/coa.png"
                alt="नेपालको राष्ट्रिय निशान छाप"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <div className="text-[10px] uppercase font-bold text-red-300 tracking-wider">नेपाल सरकार</div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                राष्ट्रिय सतर्कता केन्द्र
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="hidden lg:flex items-center justify-center rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            aria-label={sidebarCollapsed ? 'साइडबार विस्तार गर्नुहोस्' : 'साइडबार संकुचित गर्नुहोस्'}
            title={sidebarCollapsed ? 'साइडबार विस्तार गर्नुहोस्' : 'साइडबार संकुचित गर्नुहोस्'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-blue-200 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Unit Context Banner */}
        <div className={`px-3.5 py-2.5 bg-blue-900/40 border-b border-blue-900/80 text-[11px] ${sidebarCollapsed ? 'lg:hidden' : ''
          }`}>
          <div className="text-blue-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            सक्रिय कार्यक्षेत्र:
          </div>
          <div className="font-semibold text-white leading-snug mt-0.5">
            {effectiveRole === 'admin'
              ? 'केन्द्रीय प्रशासक (सबै महाशाखा/शाखा)'
              : effectiveRole === 'mahashakha'
                ? getMahashakhaName(effectiveMahashakhaId)
                : getShakhaName(effectiveShakhaId)}
          </div>
        </div>

        {/* Dynamic Role-Specific Menu List (Exact Specification a-g) */}
        <nav className={`sidebar-menu-scroll flex-1 overflow-y-auto py-3 space-y-0.5 ${sidebarCollapsed ? 'px-2' : 'px-2.5'
          }`} aria-label="साइडबार मेनु">
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
                title={sidebarCollapsed ? item.labelNe : undefined}
                aria-label={item.labelNe}
                className={`w-full flex items-center justify-between px-3 gap-2 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${isActive
                    ? 'bg-red-700 text-white font-semibold shadow-xs'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className={`flex items-center gap-2.5 min-w-0 ${sidebarCollapsed ? 'lg:justify-center lg:gap-0' : ''
                  }`}>
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.labelNe}</span>
                </span>
                {item.id === 'complaints_all' && (
                  <span
                    className={`font-mono-num text-[11px] px-1.5 py-0.2 rounded shrink-0 ${sidebarCollapsed ? 'lg:hidden' : ''
                      } ${isActive ? 'bg-white/20 text-white' : 'bg-red-950/70 text-red-300 font-semibold'
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
        <div className={`p-3 border-t border-blue-900/80 text-[11px] text-blue-300/80 flex items-center justify-between ${sidebarCollapsed ? 'lg:hidden' : ''
          }`}>
          <span>सिंहदरबार, काठमाडौँ</span>
          <span className="text-[10px] font-mono text-blue-300/60">v2.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Official Sovereign Government Strip (नेपाल सरकारको आधिकारिक रिबन) */}
        <div className="bg-gradient-to-r from-[#001f35] via-[#002b49] to-[#081b2e] text-slate-200 border-b-2 border-red-700 px-4 lg:px-6 py-1.5 text-[11px] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-full">
            <div className="flex items-center gap-2">
              <img
                src="/coa.png"
                alt="नेपालको राष्ट्रिय निशान छाप"
                className="w-4 h-4 object-contain shrink-0"
              />
              <span className="font-semibold text-white tracking-wide">
                नेपाल सरकार
              </span>
              <span className="text-blue-300 hidden md:inline">|</span>
              <span className="text-slate-300 hidden md:inline">
                राष्ट्रिय सतर्कता केन्द्र (National Vigilance Centre)
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300 text-[11px]">
              <span className="hidden sm:inline">सिंहदरबार, काठमाडौँ</span>
              <span className="text-blue-300 hidden sm:inline">·</span>
              <span className="text-amber-300 font-semibold">हटलाइन: ४२००३४५</span>
              <span className="text-blue-300">·</span>
              <span className="text-slate-200 font-medium">मिति: {CURRENT_NEPALI_DATE_DISPLAY}</span>
            </div>
          </div>
        </div>

        {/* Modern Glassmorphic Appbar Header */}
        <header className="sticky top-0 z-30 glass-header px-4 lg:px-6 py-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand Title + Mobile Menu Trigger */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="मेनु खोल्नुहोस्"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Official Coat of Arms & Title (No NVC custom logo per instruction) */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/95 p-1 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                  <img
                    src="/coa.png"
                    alt="नेपालको निशान छाप"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 leading-tight">
                    नेपाल सरकार
                  </div>
                  <div className="text-base sm:text-lg font-black tracking-tight text-blue-950 leading-tight">
                    राष्ट्रिय सतर्कता केन्द्र
                  </div>
                </div>
              </div>
            </div>

            {/* Global Command / Quick Search Input */}
            <div className="relative flex-1 max-w-md min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="उजुरी दर्ता नं., विषय, मन्त्रालय वा जिल्ला खोज्नुहोस्..."
                className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-100/70 hover:bg-white focus:bg-white border border-slate-200/90 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900/20 transition-all shadow-2xs"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 rounded border border-slate-300/60 pointer-events-none">
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Right Controls: Quick Action, Fiscal Year, Profile Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Quick Action Button & Glass Dropdown */}
              <div className="relative" ref={quickActionRef}>
                <button
                  type="button"
                  onClick={() => setQuickActionOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">नयाँ प्रविष्टि</span>
                  <ChevronDown className="w-3 h-3 text-red-200" />
                </button>

                {quickActionOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 glass-dropdown rounded-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      शीघ्र प्रविष्टि (Quick Entry)
                    </div>
                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('new_complaint');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <FilePlus2 className="w-3.5 h-3.5 text-red-600" />
                        नयाँ उजुरी दर्ता
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('office_monitoring');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-700" />
                        कार्यालय अनुगमन फारम
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('technical_audit');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5 text-indigo-700" />
                        प्राविधिक परीक्षण विवरण
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('project_monitoring');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <HardHat className="w-3.5 h-3.5 text-emerald-700" />
                        आयोजना अनुगमन फारम
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('new_sample');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-cyan-700" />
                        प्रयोगशाला नमूना परीक्षण
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('promotional_program');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                        प्रवर्द्धनात्मक कार्यक्रम
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('citizen_charter');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <ScrollText className="w-3.5 h-3.5 text-teal-700" />
                        नागरिक बडापत्र अनुगमन
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionOpen(false);
                          setActiveMenu('reports');
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-950 font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 pt-1.5 mt-1"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-900" />
                        कार्यकारी आवधिक प्रतिवेदन
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiscal Year Glass Pill */}
              <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-blue-900 hidden sm:inline" />
                <label htmlFor="fy-select" className="text-xs font-semibold text-slate-600 hidden md:inline">
                  आ.व.:
                </label>
                <select
                  id="fy-select"
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value as FiscalYear)}
                  className="text-xs font-bold bg-transparent text-blue-950 focus:outline-none cursor-pointer"
                >
                  {FISCAL_YEARS.map((fy) => (
                    <option key={fy.value} value={fy.value}>
                      {fy.labelNe}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role अनुसारको Login Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200/80 transition-all max-w-[240px] cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {userProfile.fullName ? userProfile.fullName.charAt(0) : 'U'}
                  </div>
                  <span className="truncate hidden sm:inline">{roleLoginDisplayName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 glass-dropdown rounded-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 text-sm">{userProfile.fullName}</div>
                      <div className="text-slate-600 text-[11px] mt-0.5 font-medium">
                        {userProfile.designation}
                      </div>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200/60">
                        {effectiveRole === 'admin'
                          ? 'सुपर एडमिन (Super Admin)'
                          : effectiveRole === 'mahashakha'
                            ? 'महाशाखा प्रमुख'
                            : 'शाखा अधिकृत'}
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
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-950 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-900" />
                        प्रयोगकर्ता व्यवस्थापन (RBAC)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2 text-left text-red-700 hover:bg-red-50 font-semibold flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 mt-1"
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

        {/* Admin Interactive Role/Division/Branch Inspector Toolbar */}
        {userProfile.role === 'admin' && (
          <div className="glass-panel border-b border-slate-200/90 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <Eye className="w-3.5 h-3.5 text-blue-900 shrink-0" />
              <span className="font-bold text-slate-900">(भूमिका तथा महाशाखा/शाखा स्विचर):</span>
              <span className="text-slate-500 hidden md:inline">
                विशिष्ट मेनु तथा ३-तहको RBAC डेटा पहुँच सिमुलेशन
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
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer"
              >
                <option value="admin">एडमिन ड्यासबोर्ड</option>
                <option value="mahashakha">महाशाखा ड्यासबोर्ड (Division View)</option>
                <option value="shakha">शाखा ड्यासबोर्ड (Shakha View)</option>
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
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
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
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
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
                  className="px-2.5 py-1 bg-blue-950 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-900 transition-colors"
                >
                  एडमिनमा फर्कनुहोस्
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-4 lg:p-6 w-full min-w-0">
          {dataError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <p>{dataError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 px-3 py-1.5 bg-red-800 text-white rounded text-xs font-semibold"
              >
                पुन: प्रयास गर्नुहोस्
              </button>
            </div>
          ) : dataLoading ? (
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
              userRoleName={roleLoginDisplayName}
              userFullName={userProfile.fullName}
            />
          ) : activeMenu === 'user_management' && effectiveRole === 'admin' ? (
            <UserManagementView
              users={allUsers}
              currentAdminUid={authenticatedUser.id}
            />
          ) : (
            <ModuleWorkspaceView
              activeMenu={activeMenu}
              complaints={scopedComplaints}
              activities={scopedActivities}
              currentUid={authenticatedUser.id}
              effectiveRole={effectiveRole}
              effectiveMahashakhaId={effectiveMahashakhaId}
              effectiveShakhaId={effectiveShakhaId}
              selectedFiscalYear={selectedFiscalYear}
              searchQuery={searchQuery}
              onActivitySaved={(record) =>
                setAllActivities((current) => {
                  const exists = current.some((activity) => activity.id === record.id);
                  return exists
                    ? current.map((activity) => (activity.id === record.id ? record : activity))
                    : [record, ...current];
                })
              }
              onActivityDeleted={(id) =>
                setAllActivities((current) =>
                  current.filter((activity) => activity.id !== id)
                )
              }
              onNavigateDashboard={() => setActiveMenu('dashboard')}
              onSelectMenu={(m) => setActiveMenu(m)}
            />
          )}
        </main>
      </div>
      {!dataLoading &&
        activeMenu === 'dashboard' &&
        startupNotice &&
        !startupNoticeDismissed && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-950/60 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="startup-notice-title"
              className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between bg-blue-950 px-5 py-4 text-white">
                <div>
                  <p className="text-[11px] text-blue-200">राष्ट्रिय सतर्कता केन्द्र · सूचना</p>
                  <h2 id="startup-notice-title" className="mt-1 text-base font-bold">
                    {startupNotice.noticePublicationDetails?.title ?? startupNotice.title}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="सूचना बन्द गर्नुहोस्"
                  onClick={() => setStartupNoticeDismissed(true)}
                  className="rounded-md p-1.5 text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="space-y-4 p-5">
                <p className="text-xs text-slate-500">
                  मिति: {toNepaliDigits(
                    startupNotice.noticePublicationDetails?.date ??
                    startupNotice.nepaliDate
                  )}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {startupNotice.noticePublicationDetails?.description ??
                    startupNotice.reportSummary ??
                    startupNotice.complaintDetails ??
                    'सूचनाको विवरण उपलब्ध छैन।'}
                </p>
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setStartupNoticeDismissed(true)}
                    className="rounded-md bg-blue-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                  >
                    सूचना बन्द गर्नुहोस्
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
    </div>
  );
}
