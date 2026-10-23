import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  googleProvider, 
  checkEmailAllowedLocally, 
  seedInitialFirestoreData, 
  queueNotificationEmail,
  db 
} from './firebase';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { detectInAppBrowser } from './browserUtils';
import { 
  collection, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { generateEmailHtml } from './emailTemplates';
import { 
  BookingRecord, 
  ADMIN_EMAIL, 
  ALLOWED_USERS_LIST 
} from './types';
import { isBookingOverdue } from './utils';
import { BookingForm } from './BookingForm';
import { BookingTable } from './BookingTable';
import { ActiveBorrowingsCard } from './ActiveBorrowingsCard';
import { ReturnDeviceModal } from './ReturnDeviceModal';
import { DeploymentGuideModal } from './DeploymentGuideModal';
import { MailQueueViewerModal } from './MailQueueViewerModal';
import { CabinetMapModal } from './CabinetMapModal';
import { LoginScreen } from './LoginScreen';
import {
  BackgroundEffectsMenu,
  BackgroundEffectsOverlay,
  EffectType,
} from './BackgroundEffects';
import { 
  Laptop, 
  Camera, 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  HelpCircle, 
  Building2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Mail,
  ClipboardList,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { THEME_COLORS } from './theme';

/**
 * BẢNG MÀU XANH DƯƠNG HỆ THỐNG QUẢN LÝ THIẾT BỊ
 * --b1: #03045E
 * --b2: #023E8A
 * --b3: #0077B6
 * --b4: #0096C7
 * --b5: #00B4D8
 * --b6: #48CAE4
 * --b7: #90E0EF
 * --b8: #ADE8F4
 * --b9: #CAF0F8
 * --c-text: #03045E
 * --c-danger: #C0392B
 */
export const APP_THEME = THEME_COLORS;
export const APP_BG = THEME_COLORS.appBg;
export const APP_B1 = THEME_COLORS.b1;
export const APP_B2 = THEME_COLORS.b2;
export const APP_B3 = THEME_COLORS.b3;
export const APP_B4 = THEME_COLORS.b4;
export const APP_B5 = THEME_COLORS.b5;
export const APP_B6 = THEME_COLORS.b6;
export const APP_B7 = THEME_COLORS.b7;
export const APP_B8 = THEME_COLORS.b8;
export const APP_B9 = THEME_COLORS.b9;
export const APP_TEXT = THEME_COLORS.text;
export const APP_DANGER = THEME_COLORS.danger;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active bookings list
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Return modal state
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState<BookingRecord | null>(null);
  const [returnSuccessToast, setReturnSuccessToast] = useState<string | null>(null);

  // Cabinet Map modal state
  const [cabinetModalState, setCabinetModalState] = useState<{
    isOpen: boolean;
    device?: string | null;
    laptopPassword?: string | null;
  }>({ isOpen: false });

  // Tab state with URL hash synchronization: #dang-ky, #lich-su
  const getTabFromHash = (): 'register' | 'history' => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#lich-su' || hash === '#history') return 'history';
      if (hash === '#dang-ky' || hash === '#register') return 'register';
    }
    return 'register';
  };

  const [activeTab, setActiveTabState] = useState<'register' | 'history'>(getTabFromHash);

  const handleTabChange = (tab: 'register' | 'history') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const newHash = tab === 'history' ? '#lich-su' : '#dang-ky';
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }
  };

  // Sync tab with browser hash changes (e.g. back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Deployment guide modal
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showMailQueueModal, setShowMailQueueModal] = useState<boolean>(false);

  // Hiệu ứng nền động (mặc định luôn luôn là 'none' - Tắt hẳn mỗi khi tải trang / đăng nhập)
  const [activeEffect, setActiveEffect] = useState<EffectType>('none');
  const [isEffectsMenuOpen, setIsEffectsMenuOpen] = useState<boolean>(false);
  const dymLogoRef = useRef<HTMLDivElement>(null);

  // Xóa key localStorage cũ liên quan đến hiệu ứng nếu còn
  useEffect(() => {
    try {
      localStorage.removeItem('dym_bg_effect');
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      if (user && user.email) {
        const check = checkEmailAllowedLocally(user.email);
        if (check.allowed) {
          setCurrentUser(user);
          setCurrentUserName(check.name || user.displayName || user.email);
          setAuthError(null);

          // Seed Firestore data (users list & laptop password) in background
          seedInitialFirestoreData().catch(console.error);
        } else {
          // Rule: "Nếu không thì đăng xuất ngay và báo 'Email không được phép'."
          await fbSignOut(auth);
          setCurrentUser(null);
          setCurrentUserName('');
          setAuthError(`Email không được phép (${user.email}). Chỉ các thành viên thuộc danh sách công ty DYM Vietnam mới có quyền truy cập.`);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserName('');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore Bookings realtime (chỉ admin mới thấy bản ghi đã trả)
  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      setIsDataLoading(false);
      return;
    }

    const userIsAdmin = Boolean(
      currentUser.email && currentUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    setIsDataLoading(true);
    const bookingsCol = collection(db, 'bookings');
    // Admin: lấy toàn bộ bản ghi
    // Non-admin: chỉ truy vấn các bản ghi chưa trả where('isReturned', '==', false)
    const q = userIsAdmin
      ? query(bookingsCol, orderBy('date', 'desc'), orderBy('startTime', 'desc'))
      : query(bookingsCol, where('isReturned', '==', false));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: BookingRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as BookingRecord);
        });

        // Với Non-admin: lọc thêm ở tầng state để đảm bảo 100% không chứa bản ghi đã trả
        const filteredList = userIsAdmin
          ? list
          : list.filter((b) => b.isReturned !== true);

        // Sắp xếp ngày giảm dần, giờ giảm dần
        filteredList.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.startTime.localeCompare(a.startTime);
        });

        setBookings(filteredList);
        setIsDataLoading(false);

        // Client-side overdue verification running with active auth credentials
        const now = new Date();
        filteredList.forEach(async (b) => {
          if (b.isReturned || b.overdueNotified || !b.date || !b.endTime) return;
          try {
            const [year, month, day] = b.date.split('-').map(Number);
            const [hour, min] = b.endTime.split(':').map(Number);
            const endDateTime = new Date(year, month - 1, day, hour, min, 0);

            if (now.getTime() > endDateTime.getTime()) {
              // Immediately flag to prevent re-triggering
              await updateDoc(doc(db, 'bookings', b.id), {
                overdueNotified: true,
                overdueNotifiedAt: new Date().toISOString()
              });

              const borrowerEmail = (b.registrantEmail || '').trim();
              const recipients = Array.from(new Set([borrowerEmail, ADMIN_EMAIL].filter(Boolean)));
              const { subject, html } = generateEmailHtml({
                actionType: 'overdue',
                booking: b
              });

              await queueNotificationEmail({
                to: recipients,
                subject,
                html,
                type: 'overdue'
              });
            }
          } catch (e) {
            console.warn('Overdue check handler:', e);
          }
        });
      },
      (err) => {
        console.error('Firestore onSnapshot error:', err);
        setIsDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Xử lý kết quả Redirect khi app khởi động (sau khi quay lại từ signInWithRedirect)
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted || !result || !result.user) return;
        const user = result.user;
        if (user && user.email) {
          const check = checkEmailAllowedLocally(user.email);
          if (!check.allowed) {
            await fbSignOut(auth);
            if (isMounted) {
              setCurrentUser(null);
              setAuthError(`Email không được phép (${user.email}). Chỉ email nhân viên được phân quyền mới có thể đăng nhập.`);
            }
          }
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.warn('getRedirectResult notice:', err?.code, err?.message);

        const code = err?.code || '';
        // Bỏ qua các sự kiện không phải lỗi thực tế
        if (code === 'auth/credential-already-in-use' || code === 'auth/user-cancelled') {
          return;
        }

        // Thông báo rõ nếu gặp lỗi Safari / storage-partitioned browser environment
        if (
          code.includes('missing-initial-state') ||
          (err?.message && err.message.includes('missing initial state'))
        ) {
          setAuthError(
            'Trình duyệt Safari/iOS đã chặn phiên đăng nhập chuyển hướng do cơ chế lưu trữ phân vùng. Vui lòng bấm Đăng nhập lại trực tiếp hoặc mở bằng Chrome.'
          );
          return;
        }

        if (err?.message) {
          setAuthError(`Lỗi đăng nhập chuyển hướng: ${err.message}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Google Login: Gọi trực tiếp signInWithPopup trong sự kiện bấm nút (không await trước)
  const handleGoogleSignIn = () => {
    setAuthError(null);

    // Kiểm tra trình duyệt trong app (Messenger, Facebook, Zalo, Instagram, Line...)
    const inApp = detectInAppBrowser();
    if (inApp.isInApp) {
      setAuthError(
        `Bạn đang mở trang từ ${inApp.appName}. Vui lòng sao chép liên kết và mở bằng Safari hoặc Chrome để đăng nhập.`
      );
      return;
    }

    // 1. Dùng signInWithPopup làm cách đăng nhập chính (gọi đồng bộ ngay tại click)
    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const user = result.user;
        if (user && user.email) {
          const check = checkEmailAllowedLocally(user.email);
          if (!check.allowed) {
            await fbSignOut(auth);
            setCurrentUser(null);
            setAuthError(`Email không được phép (${user.email}). Chỉ email nhân viên được phân quyền mới có thể đăng nhập.`);
          }
        }
      })
      .catch(async (err: any) => {
        const code = err?.code || '';
        console.warn('Google Sign-In Popup failed/blocked:', code, err);

        // Nếu popup bị chặn hoặc không được hỗ trợ trong môi trường này -> Tự động dự phòng sang signInWithRedirect
        const isPopupBlockedOrUnsupported =
          code === 'auth/popup-blocked' ||
          code === 'auth/popup-closed-by-user' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/cancelled-popup-request';

        if (isPopupBlockedOrUnsupported) {
          try {
            console.log('Tự động chuyển tiếp sang signInWithRedirect...');
            await signInWithRedirect(auth, googleProvider);
          } catch (redirectErr: any) {
            console.error('signInWithRedirect fallback error:', redirectErr);
            const redirectMsg = redirectErr?.message || 'Không thể chuyển tiếp đăng nhập';
            setAuthError(`Lỗi đăng nhập: ${redirectMsg}`);
          }
        } else {
          const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công';
          setAuthError(`Lỗi đăng nhập: ${msg}`);
        }
      });
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Count unreturned bookings of current user for Tab 1 badge
  const userActiveBookingsCount = bookings.filter((b) => {
    if (b.isReturned) return false;
    const email = currentUser?.email?.toLowerCase();
    const emailMatch = b.registrantEmail && email && b.registrantEmail.toLowerCase() === email;
    const nameMatch = b.registrantName && currentUserName && b.registrantName.trim().toLowerCase() === currentUserName.trim().toLowerCase();
    const userObj = ALLOWED_USERS_LIST.find((u) => u.email.toLowerCase() === email);
    const userObjNameMatch = userObj && b.registrantName && b.registrantName.trim().toLowerCase() === userObj.name.trim().toLowerCase();
    return emailMatch || nameMatch || userObjNameMatch;
  }).length;

  // Count overdue bookings in the system for Tab 2 red badge
  const overdueCount = bookings.filter((b) => isBookingOverdue(b)).length;

  const isLoginView = !isAuthLoading && !currentUser;

  // Quyền Quản trị viên (ADMIN_EMAIL = y-p@dymvietnam.net, so sánh không phân biệt hoa thường)
  const isAdmin = Boolean(currentUser?.email && currentUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase());

  // Đồng bộ màu nền của body để không có dải trắng/xám khi cuộn trang
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = isLoginView ? '#020617' : APP_BG;
    }
  }, [isLoginView]);

  return (
    <div
      style={!isLoginView ? { backgroundColor: APP_BG } : undefined}
      className={
        isLoginView
          ? 'w-full h-dvh overflow-hidden bg-slate-950 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative'
          : 'min-h-screen text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden'
      }
    >
      {/* Top Navigation Bar */}
      <header
        className={
          isLoginView
            ? 'fixed top-0 left-0 right-0 z-50 bg-slate-950/40 backdrop-blur-md border-b border-white/10'
            : 'sticky top-0 z-40 bg-[#03045E] border-b border-[#023E8A] shadow-xs w-full max-w-full overflow-x-hidden'
        }
      >
        <div
          className={
            isLoginView
              ? 'w-full px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between'
              : 'w-full px-3 py-2 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between flex-nowrap gap-2'
          }
        >
          {/* Logo & App Title: Ẩn trên màn hình đăng nhập, giữ nguyên sau khi đăng nhập */}
          {!isLoginView ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-1">
              <div
                ref={dymLogoRef}
                onClick={() => setIsEffectsMenuOpen((prev) => !prev)}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-[#48CAE4]/40 select-none"
              >
                <img
                  src="/assets/bg_logo.jpg"
                  alt="DYM Logo"
                  className="w-full h-full object-contain rounded-lg pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-extrabold text-xs sm:text-base md:text-lg text-white tracking-tight truncate hidden min-[400px]:inline-block sm:inline-block">
                  Quản lý mượn thiết bị
                </span>
                <span className="hidden sm:inline-block text-[11px] font-bold text-[#03045E] bg-[#CAF0F8] px-2.5 py-0.5 rounded-full border border-[#48CAE4] shadow-2xs shrink-0">
                  DYM Vietnam
                </span>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Right Header: User profile or Sign In */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
            {/* Nút Hàng đợi Email: CHỈ RENDER CHO QUẢN TRỊ VIÊN (y-p@dymvietnam.net) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowMailQueueModal(true)}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl text-[#CAF0F8] bg-transparent hover:bg-[#023E8A] border border-[#48CAE4] transition-colors flex items-center justify-center gap-1.5 font-bold shadow-xs cursor-pointer shrink-0"
                title="Hàng đợi Email"
                aria-label="Hàng đợi Email"
              >
                <Mail className="w-4 h-4 text-[#48CAE4] shrink-0" />
                <span className="hidden sm:inline text-[11px] sm:text-xs font-bold text-[#CAF0F8]">Hàng đợi Email</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className={
                isLoginView
                  ? 'text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer'
                  : 'w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl text-[#CAF0F8] bg-transparent hover:bg-[#023E8A] border border-[#48CAE4] transition-colors flex items-center justify-center gap-1.5 font-bold shadow-xs cursor-pointer shrink-0'
              }
              title="Hướng dẫn & Rules"
              aria-label="Hướng dẫn & Rules"
            >
              <HelpCircle className={isLoginView ? 'w-4 h-4 text-blue-300' : 'w-4 h-4 text-[#48CAE4] shrink-0'} />
              <span className="hidden sm:inline text-[11px] sm:text-xs font-bold text-[#CAF0F8]">Hướng dẫn & Rules</span>
            </button>

            <button
              type="button"
              onClick={() => setCabinetModalState({ isOpen: true })}
              className={
                isLoginView
                  ? 'text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer'
                  : 'w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl text-[#CAF0F8] bg-transparent hover:bg-[#023E8A] border border-[#48CAE4] transition-colors flex items-center justify-center gap-1.5 font-bold shadow-xs cursor-pointer shrink-0'
              }
              title="Sơ đồ tủ"
              aria-label="Sơ đồ tủ"
            >
              <MapPin className={isLoginView ? 'w-4 h-4 text-blue-300' : 'w-4 h-4 text-[#48CAE4] shrink-0'} />
              <span className="hidden sm:inline text-[11px] sm:text-xs font-bold text-[#CAF0F8]">Sơ đồ tủ</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-3 pl-1.5 sm:pl-3 border-l border-[#023E8A] shrink-0 flex-nowrap">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white leading-tight">
                    {currentUserName}
                  </div>
                  <div className="text-[11px] text-[#ADE8F4] font-medium leading-tight">
                    {currentUser.email}
                  </div>
                </div>

                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUserName}
                    className="w-8 h-8 rounded-full ring-2 ring-[#0096C7] object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0096C7] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {currentUserName.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[#ADE8F4] hover:bg-[#023E8A] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Body */}
      {isAuthLoading ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Đang kiểm tra thông tin đăng nhập Google...</p>
          </div>
        </main>
      ) : !currentUser ? (
        /* State 2: Not logged in - Fullscreen login screen with zero outer margins/borders */
        <main className="flex-1 w-full h-full relative overflow-hidden">
          <LoginScreen
            onGoogleSignIn={handleGoogleSignIn}
            authError={authError}
          />
        </main>
      ) : (
        /* State 3: User Authenticated (Full App Access) - Sidebar bên trái + Nội dung bên phải (Full màn hình) */
        <main className="flex-1 w-full max-w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
          {/* Thanh điều hướng dạng tab ngang trên thiết bị di động (< 768px / md:hidden) */}
          <div className="md:hidden w-full mb-4 max-w-full overflow-x-hidden">
            <div className="flex items-center gap-1.5 p-1 bg-[#023E8A] rounded-2xl shadow-sm border border-[#0077B6]/50 w-full">
              {/* Tab 1 Mobile */}
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] truncate ${
                  activeTab === 'register'
                    ? 'bg-white text-[#023E8A] shadow-md font-bold'
                    : 'text-[#CAF0F8] hover:bg-[#0077B6]'
                }`}
              >
                <Laptop className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'register' ? 'text-[#023E8A]' : 'text-white'}`} />
                <span className="truncate">Đăng ký mượn</span>
                {userActiveBookingsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E] shrink-0">
                    {userActiveBookingsCount}
                  </span>
                )}
              </button>

              {/* Tab 2 Mobile */}
              <button
                type="button"
                onClick={() => handleTabChange('history')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] truncate ${
                  activeTab === 'history'
                    ? 'bg-white text-[#023E8A] shadow-md font-bold'
                    : 'text-[#CAF0F8] hover:bg-[#0077B6]'
                }`}
              >
                <ClipboardList className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'history' ? 'text-[#023E8A]' : 'text-white'}`} />
                <span className="truncate">Lịch sử mượn</span>
                {overdueCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C0392B] text-white animate-pulse shrink-0">
                    {overdueCount} quá giờ
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E] shrink-0">
                    {bookings.length} bản ghi
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* SIDEBAR BÊN TRÁI (Hiển thị từ md trở lên, rộng 260px, sticky dưới header) */}
            <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-[80px] self-start">
              <div className="bg-[#023E8A] rounded-2xl border border-[#0077B6]/50 p-3 shadow-md space-y-2.5">
                {/* TAB 1: Đăng ký mượn • 機器貸出登録 */}
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex flex-col gap-2 cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-[#023E8A] shadow-md font-bold scale-[1.01]'
                      : 'bg-transparent hover:bg-[#0077B6] text-[#CAF0F8] font-semibold border border-transparent'
                  }`}
                >
                  {/* Dòng 1: icon + tên tab (cho phép xuống dòng nếu dài, không cắt chữ) */}
                  <div className="flex items-start gap-2.5 w-full">
                    <Laptop className={`w-4 h-4 shrink-0 mt-0.5 ${activeTab === 'register' ? 'text-[#023E8A]' : 'text-white'}`} />
                    <div className={`text-xs leading-snug break-words ${activeTab === 'register' ? 'font-bold text-[#023E8A]' : 'font-semibold text-[#CAF0F8]'}`}>
                      <span>Đăng ký mượn</span>
                      <span className="block text-[11px] opacity-90 font-normal mt-0.5">機器貸出登録</span>
                    </div>
                  </div>

                  {/* Dòng 2: các huy hiệu trạng thái xếp ngang nhau, nằm dưới tên tab, thẳng lề với chữ */}
                  {userActiveBookingsCount > 0 && (
                    <div className="pl-[26px] flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E]">
                        {userActiveBookingsCount} đang giữ
                      </span>
                    </div>
                  )}
                </button>

                {/* TAB 2: Lịch sử mượn • 貸出一覧 */}
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex flex-col gap-2 cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-white text-[#023E8A] shadow-md font-bold scale-[1.01]'
                      : 'bg-transparent hover:bg-[#0077B6] text-[#CAF0F8] font-semibold border border-transparent'
                  }`}
                >
                  {/* Dòng 1: icon + tên tab (cho phép xuống dòng nếu dài, không cắt chữ) */}
                  <div className="flex items-start gap-2.5 w-full">
                    <ClipboardList className={`w-4 h-4 shrink-0 mt-0.5 ${activeTab === 'history' ? 'text-[#023E8A]' : 'text-white'}`} />
                    <div className={`text-xs leading-snug break-words ${activeTab === 'history' ? 'font-bold text-[#023E8A]' : 'font-semibold text-[#CAF0F8]'}`}>
                      <span>Lịch sử mượn</span>
                      <span className="block text-[11px] opacity-90 font-normal mt-0.5">貸出一覧</span>
                    </div>
                  </div>

                  {/* Dòng 2: các huy hiệu trạng thái xếp ngang nhau, nằm dưới tên tab, thẳng lề với chữ */}
                  <div className="pl-[26px] flex flex-wrap items-center gap-1.5 pt-0.5">
                    {overdueCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C0392B] text-white shadow-xs animate-pulse"
                        title={`${overdueCount} lượt mượn quá giờ chưa trả`}
                      >
                        {overdueCount} quá giờ
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E]">
                      {bookings.length} bản ghi
                    </span>
                  </div>
                </button>
              </div>
            </aside>

            {/* KHU VỰC NỘI DUNG BÊN PHẢI SIDEBAR (Chiếm toàn bộ chiều rộng còn lại) */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {/* TAB 1: ĐĂNG KÝ MƯỢN */}
              {activeTab === 'register' && (
                <div className="w-full space-y-6 animate-in fade-in duration-200">
                  {/* Form Đăng ký */}
                  <section>
                    <BookingForm
                      currentUserEmail={currentUser.email || ''}
                      currentUserName={currentUserName}
                      activeBookings={bookings}
                      onBookingSuccess={(dev, pw) => {
                        setCabinetModalState({
                          isOpen: true,
                          device: dev,
                          laptopPassword: pw,
                        });
                      }}
                      onViewHistory={() => handleTabChange('history')}
                    />
                  </section>

                  {/* Khối "Thiết bị bạn đang mượn" (chỉ hiện nếu người đăng nhập đang có thiết bị chưa trả) */}
                  <section>
                    <ActiveBorrowingsCard
                      currentUserEmail={currentUser.email || ''}
                      currentUserName={currentUserName}
                      bookings={bookings}
                      onOpenReturnModal={(b) => setSelectedBookingForReturn(b)}
                      onOpenCabinetMap={(dev) => {
                        setCabinetModalState({
                          isOpen: true,
                          device: dev,
                        });
                      }}
                    />
                  </section>
                </div>
              )}

              {/* TAB 2: LỊCH SỬ MƯỢN */}
              {activeTab === 'history' && (
                <div className="w-full space-y-6 animate-in fade-in duration-200">
                  {isDataLoading ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-[#ADE8F4]">
                      <div className="inline-block w-6 h-6 border-2 border-[#0077B6] border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-[#03045E]">Đang đồng bộ dữ liệu thời gian thực...</p>
                    </div>
                  ) : (
                    <BookingTable
                      bookings={bookings}
                      currentUserEmail={currentUser.email || ''}
                      onOpenReturnModal={(b) => setSelectedBookingForReturn(b)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Return Device Modal */}
      {selectedBookingForReturn && (
        <ReturnDeviceModal
          booking={selectedBookingForReturn}
          onClose={() => setSelectedBookingForReturn(null)}
          onSuccess={() => {
            setSelectedBookingForReturn(null);
            setReturnSuccessToast("Đã trả thiết bị thành công • 返却が完了しました");
            setTimeout(() => {
              setReturnSuccessToast(null);
            }, 5000);
          }}
        />
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <DeploymentGuideModal
          userEmail={currentUser?.email || ''}
          isAdmin={isAdmin}
          onClose={() => setShowGuideModal(false)}
        />
      )}

      {/* Mail Queue Viewer Modal - CHỈ CHO QUẢN TRỊ VIÊN */}
      {isAdmin && showMailQueueModal && (
        <MailQueueViewerModal 
          userEmail={currentUser?.email || ''} 
          onClose={() => setShowMailQueueModal(false)} 
        />
      )}

      {/* Cabinet Map Modal */}
      <CabinetMapModal
        isOpen={cabinetModalState.isOpen}
        onClose={() => setCabinetModalState({ isOpen: false })}
        userEmail={currentUser?.email || ''}
        device={cabinetModalState.device}
        laptopPassword={cabinetModalState.laptopPassword}
      />

      {/* Menu hiệu ứng nền ẩn kích hoạt khi bấm vào logo DYM ở góc trái header */}
      {!isLoginView && currentUser && (
        <BackgroundEffectsMenu
          isOpen={isEffectsMenuOpen}
          onClose={() => setIsEffectsMenuOpen(false)}
          anchorRef={dymLogoRef}
          activeEffect={activeEffect}
          onSelectEffect={setActiveEffect}
        />
      )}

      {/* Hệ thống hiệu ứng nền động sau khi đăng nhập (mặc định tắt hẳn, chỉ render khi được chọn) */}
      {!isLoginView && currentUser && activeEffect !== 'none' && (
        <BackgroundEffectsOverlay activeEffect={activeEffect} />
      )}

      {/* Thông báo trả thiết bị thành công cho người dùng */}
      {returnSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <div className="text-xs sm:text-sm font-bold flex-1">
            {returnSuccessToast}
          </div>
          <button
            type="button"
            onClick={() => setReturnSuccessToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer text-xs"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* Footer (chân trang trong suốt, chữ --b2 #023E8A) */}
      {!isLoginView && (
        <footer className="mt-auto py-5 border-t border-[#ADE8F4] bg-transparent text-center text-xs text-[#023E8A] font-semibold">
          <p>Hệ thống Quản lý mượn thiết bị • DYM Vietnam Co., Ltd.</p>
        </footer>
      )}
    </div>
  );
}
