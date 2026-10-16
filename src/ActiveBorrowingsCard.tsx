import React from 'react';
import { 
  Laptop, 
  Camera, 
  Clock, 
  RotateCcw, 
  AlertTriangle, 
  Calendar, 
  User, 
  Users, 
  FileText,
  Sparkles
} from 'lucide-react';
import { BookingRecord, ALLOWED_USERS_LIST } from './types';
import { isBookingOverdue, formatDateDisplay } from './utils';

interface ActiveBorrowingsCardProps {
  currentUserEmail: string;
  currentUserName: string;
  bookings: BookingRecord[];
  onOpenReturnModal: (booking: BookingRecord) => void;
}

export const ActiveBorrowingsCard: React.FC<ActiveBorrowingsCardProps> = ({
  currentUserEmail,
  currentUserName,
  bookings,
  onOpenReturnModal
}) => {
  // Find current user object to match name & email reliably
  const userObj = ALLOWED_USERS_LIST.find(
    (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase()
  );

  // Filter unreturned bookings belonging to the currently logged in user
  const userActiveBookings = bookings.filter((b) => {
    if (b.isReturned) return false;

    const emailMatch =
      b.registrantEmail &&
      currentUserEmail &&
      b.registrantEmail.toLowerCase() === currentUserEmail.toLowerCase();

    const nameMatch =
      b.registrantName &&
      currentUserName &&
      b.registrantName.trim().toLowerCase() === currentUserName.trim().toLowerCase();

    const userObjNameMatch =
      userObj &&
      b.registrantName &&
      b.registrantName.trim().toLowerCase() === userObj.name.trim().toLowerCase();

    return emailMatch || nameMatch || userObjNameMatch;
  });

  // Only show if the logged in user has unreturned devices
  if (userActiveBookings.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50/90 via-white to-blue-50/70 border-2 border-amber-300 rounded-2xl shadow-lg shadow-amber-500/10 p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Thiết bị bạn đang mượn</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                {userActiveBookings.length} thiết bị chưa trả
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              貸出中の機器 • Bạn có thể bấm nút "Trả thiết bị" bên dưới để hoàn tất nhanh chóng
            </p>
          </div>
        </div>

        <div className="text-xs text-amber-800 bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Yêu cầu chụp ảnh vị trí khi trả</span>
        </div>
      </div>

      {/* List of active borrowings */}
      <div className="mt-4 space-y-3">
        {userActiveBookings.map((b) => {
          const isOverdue = isBookingOverdue(b);
          const isLaptop = b.device === 'LAPTOP';

          return (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isOverdue
                  ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
              }`}
            >
              {/* Left Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Device Tag */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs shadow-xs ${
                      isLaptop
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {isLaptop ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{b.device}</span>
                  </span>

                  {/* Overdue / In Use status */}
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-xs animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Đang quá giờ trả • 超過</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Đang trong thời gian mượn • 貸出中</span>
                    </span>
                  )}

                  {/* Team badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>{b.team}</span>
                  </span>
                </div>

                {/* Time & Date */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDateDisplay(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Người đăng ký: <strong className="text-slate-800">{b.registrantName}</strong></span>
                  </div>
                </div>

                {/* Purpose */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Mục đích: <span className="font-medium text-slate-800">{b.purpose}</span></span>
                </div>
              </div>

              {/* Right: Quick Return Action Button */}
              <div className="shrink-0 flex items-center md:self-center">
                <button
                  type="button"
                  onClick={() => onOpenReturnModal(b)}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    isOverdue
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Trả thiết bị • 返却する</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
