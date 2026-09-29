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
import { BookingForm } from './BookingForm';
import { BookingTable } from './BookingTable';
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
  Mail
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
              if (borrowerEmail) {
                const { subject, html } = generateEmailHtml({
                  actionType: 'overdue',
                  booking: b
                });

                await queueNotificationEmail({
                  to: [borrowerEmail],
                  subject,
                  html,
                  type: 'overdue'
                });
              }
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

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
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

          {/* Right Header: User profile or Sign In */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowMailQueueModal(true)}
              className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 font-medium"
              title="Xem danh sách email đã tạo và gửi tới y-p@dymvietnam.net"
            >
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">Hàng đợi Email</span>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
              title="Hướng dẫn cấu hình Firebase & Rules"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline font-medium">Hướng dẫn & Rules</span>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* State 1: Loading Auth */}
        {isAuthLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Đang kiểm tra thông tin đăng nhập Google...</p>
          </div>
        ) : !currentUser ? (
          /* State 2: Not logged in - Redesigned login screen with blurred background, left login frame, and right dynamic media regions */
          <LoginScreen
            onGoogleSignIn={handleGoogleSignIn}
            authError={authError}
          />
        ) : (
          /* State 3: User Authenticated (Full App Access) */
          <>
            {/* Form Section */}
            <section>
              <BookingForm
                currentUserEmail={currentUser.email || ''}
                currentUserName={currentUserName}
                activeBookings={bookings}
                onBookingSuccess={() => {
                  // Realtime listener automatically updates
                }}
              />
            </section>

            {/* List & Table Section */}
            <section>
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
            </section>
          </>
        )}
      </main>

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

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white/70 text-center text-xs text-slate-500">
        <p>Hệ thống Quản lý mượn thiết bị • DYM Vietnam Co., Ltd.</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Hỗ trợ: CAMERA 1 - CAMERA 5 & LAPTOP • Tự động quét quá giờ & Chống mượn trùng Firestore Transaction
        </p>
      </footer>
    </div>
  );
}
