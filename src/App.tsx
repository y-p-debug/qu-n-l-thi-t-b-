import React, { useState, useEffect } from 'react';
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
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
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
import { LoginScreen } from './LoginScreen';
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
  ClipboardList
} from 'lucide-react';

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

  // Listen to Firestore Bookings realtime
  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    const bookingsCol = collection(db, 'bookings');
    // Order by date descending, then startTime descending
    const q = query(bookingsCol, orderBy('date', 'desc'), orderBy('startTime', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: BookingRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as BookingRecord);
        });
        setBookings(list);
        setIsDataLoading(false);

        // Client-side overdue verification running with active auth credentials
        const now = new Date();
        list.forEach(async (b) => {
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
              const recipients = Array.from(new Set([borrowerEmail, 'y-p@dymvietnam.net'].filter(Boolean)));
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

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user && user.email) {
        const check = checkEmailAllowedLocally(user.email);
        if (!check.allowed) {
          await fbSignOut(auth);
          setCurrentUser(null);
          setAuthError(`Email không được phép (${user.email}). Chỉ email nhân viên được phân quyền mới có thể đăng nhập.`);
        }
      }
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setAuthError(`Lỗi đăng nhập: ${msg}`);
    }
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

  return (
    <div
      className={
        isLoginView
          ? 'w-full h-dvh overflow-hidden bg-slate-950 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative'
          : 'min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white'
      }
    >
      {/* Top Navigation Bar */}
      <header
        className={
          isLoginView
            ? 'fixed top-0 left-0 right-0 z-50 bg-slate-950/40 backdrop-blur-md border-b border-white/10'
            : 'sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
        }
      >
        <div
          className={
            isLoginView
              ? 'w-full px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between'
              : 'w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'
          }
        >
          {/* Logo & App Title: Ẩn trên màn hình đăng nhập, giữ nguyên sau khi đăng nhập */}
          {!isLoginView ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                    Quản lý mượn thiết bị
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/70">
                    DYM Vietnam
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  機器貸出管理システム (Song ngữ Việt – Nhật)
                </p>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Right Header: User profile or Sign In */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowMailQueueModal(true)}
              className={
                isLoginView
                  ? 'text-xs text-blue-200 bg-blue-500/20 hover:bg-blue-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-400/30 transition-colors flex items-center gap-1.5 font-medium cursor-pointer'
                  : 'text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 font-medium'
              }
              title="Xem danh sách email đã tạo và gửi tới y-p@dymvietnam.net"
            >
              <Mail className={isLoginView ? 'w-4 h-4 text-blue-300' : 'w-4 h-4 text-blue-600'} />
              <span className="text-[11px] sm:text-xs font-medium">Hàng đợi Email</span>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className={
                isLoginView
                  ? 'text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer'
                  : 'text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5'
              }
              title="Hướng dẫn cấu hình Firebase & Rules"
            >
              <HelpCircle className={isLoginView ? 'w-4 h-4 text-blue-300' : 'w-4 h-4 text-blue-600'} />
              <span className="text-[11px] sm:text-xs font-medium">Hướng dẫn & Rules</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUserName}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {currentUser.email}
                  </div>
                </div>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUserName}
                    className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentUserName.charAt(0)}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
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
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Thanh điều hướng dạng tab ngang trên thiết bị di động (< 768px / md:hidden) */}
          <div className="md:hidden w-full mb-5">
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 backdrop-blur-xs rounded-2xl shadow-inner">
              {/* Tab 1 Mobile */}
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Laptop className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'register' ? 'text-white' : 'text-blue-600'}`} />
                <span className="truncate">Đăng ký mượn</span>
                {userActiveBookingsCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'register' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {userActiveBookingsCount}
                  </span>
                )}
              </button>

              {/* Tab 2 Mobile */}
              <button
                type="button"
                onClick={() => handleTabChange('history')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <ClipboardList className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'history' ? 'text-white' : 'text-indigo-600'}`} />
                <span className="truncate">Lịch sử mượn</span>
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                    {overdueCount}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-300 text-slate-700'
                }`}>
                  {bookings.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* SIDEBAR BÊN TRÁI (Hiển thị từ md trở lên, rộng 250px, sticky dưới header) */}
            <aside className="hidden md:flex flex-col w-[250px] shrink-0 sticky top-[80px] self-start">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-2.5">
                {/* TAB 1: Đăng ký mượn • 機器貸出登録 */}
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold scale-[1.01]'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Laptop className={`w-4 h-4 shrink-0 ${activeTab === 'register' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="text-xs truncate">Đăng ký mượn • 機器貸出登録</span>
                  </div>
                  {userActiveBookingsCount > 0 && (
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === 'register'
                        ? 'bg-amber-300 text-amber-950 shadow-xs'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    } animate-pulse`}>
                      {userActiveBookingsCount} đang giữ
                    </span>
                  )}
                </button>

                {/* TAB 2: Lịch sử mượn • 貸出一覧 */}
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold scale-[1.01]'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === 'history' ? 'text-white' : 'text-indigo-600'}`} />
                    <span className="text-xs truncate">Lịch sử mượn • 貸出一覧</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {overdueCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse"
                        title={`${overdueCount} lượt mượn quá giờ chưa trả`}
                      >
                        {overdueCount} quá giờ
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeTab === 'history'
                          ? 'bg-blue-700 text-white border border-blue-400/30'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {bookings.length}
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
                      onBookingSuccess={() => {
                        // Realtime listener automatically updates
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
                    />
                  </section>
                </div>
              )}

              {/* TAB 2: LỊCH SỬ MƯỢN */}
              {activeTab === 'history' && (
                <div className="w-full space-y-6 animate-in fade-in duration-200">
                  {isDataLoading ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-slate-500">Đang đồng bộ dữ liệu thời gian thực...</p>
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

      {/* Return Device Modal with camera capture requirement */}
      {selectedBookingForReturn && (
        <ReturnDeviceModal
          booking={selectedBookingForReturn}
          onClose={() => setSelectedBookingForReturn(null)}
          onSuccess={() => setSelectedBookingForReturn(null)}
        />
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <DeploymentGuideModal onClose={() => setShowGuideModal(false)} />
      )}

      {/* Mail Queue Viewer Modal */}
      {showMailQueueModal && (
        <MailQueueViewerModal 
          userEmail={currentUser?.email || 'y-p@dymvietnam.net'} 
          onClose={() => setShowMailQueueModal(false)} 
        />
      )}

      {/* Footer (only shown when not on fullscreen LoginScreen) */}
      {!isLoginView && (
        <footer className="mt-auto py-4 border-t border-slate-200 bg-white/70 text-center text-xs text-slate-500">
          <p>Hệ thống Quản lý mượn thiết bị • DYM Vietnam Co., Ltd.</p>
        </footer>
      )}
    </div>
  );
}
