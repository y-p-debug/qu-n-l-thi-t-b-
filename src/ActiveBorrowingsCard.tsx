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
  Sparkles,
  MapPin
} from 'lucide-react';
import { BookingRecord, ALLOWED_USERS_LIST } from './types';
import { isBookingOverdue, formatDateDisplay } from './utils';

interface ActiveBorrowingsCardProps {
  currentUserEmail: string;
  currentUserName: string;
  bookings: BookingRecord[];
  onOpenReturnModal: (booking: BookingRecord) => void;
  onOpenCabinetMap?: (device?: string) => void;
}

export const ActiveBorrowingsCard: React.FC<ActiveBorrowingsCardProps> = ({
  currentUserEmail,
  currentUserName,
  bookings,
  onOpenReturnModal,
  onOpenCabinetMap
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
    <div className="bg-white border border-[#ADE8F4] rounded-2xl shadow-sm p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ADE8F4]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0096C7] text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#03045E] flex items-center gap-2">
              <span>Thiết bị bạn đang mượn</span>
              <span className="text-xs font-semibold text-[#03045E] bg-[#CAF0F8] px-2.5 py-0.5 rounded-full border border-[#90E0EF]">
                {userActiveBookings.length} thiết bị chưa trả
              </span>
            </h3>
            <p className="text-xs text-[#023E8A]/80 font-medium">
              貸出中の機器 • Bạn có thể bấm nút "Trả thiết bị" bên dưới để hoàn tất nhanh chóng
            </p>
          </div>
        </div>

        <div className="text-xs text-[#03045E] bg-[#CAF0F8]/50 px-3 py-1.5 rounded-xl border border-[#ADE8F4] font-semibold self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0096C7]" />
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
                  ? 'bg-[#C0392B]/10 border-2 border-[#C0392B] shadow-xs'
                  : 'bg-white border border-[#ADE8F4] hover:border-[#0096C7] shadow-xs'
              }`}
            >
              {/* Left Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Device Tag */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs shadow-xs ${
                      isLaptop
                        ? 'bg-[#CAF0F8] text-[#03045E] border border-[#90E0EF]'
                        : 'bg-[#ADE8F4] text-[#03045E] border border-[#90E0EF]'
                    }`}
                  >
                    {isLaptop ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{b.device}</span>
                  </span>

                  {/* Overdue / In Use status */}
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#C0392B] text-white shadow-xs animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Đang quá giờ trả • 超過</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#CAF0F8]/50 text-[#03045E] border border-[#ADE8F4]">
                      <span className="w-2 h-2 rounded-full bg-[#0096C7] animate-pulse" />
                      <span>Đang trong thời gian mượn • 貸出中</span>
                    </span>
                  )}

                  {/* Team badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-[#03045E] border border-[#ADE8F4]">
                    <Users className="w-3 h-3 text-[#0096C7]" />
                    <span>{b.team}</span>
                  </span>
                </div>

                {/* Time & Date */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#03045E]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#03045E]">
                    <Calendar className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>{formatDateDisplay(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#03045E]">
                    <Clock className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#03045E]/85">
                    <User className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>Người đăng ký: <strong className="text-[#03045E]">{b.registrantName}</strong></span>
                  </div>
                </div>

                {/* Purpose */}
                <div className="text-xs text-[#03045E]/85 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0096C7] shrink-0 mt-0.5" />
                  <span>Mục đích: <span className="font-medium text-[#03045E]">{b.purpose}</span></span>
                </div>
              </div>

              {/* Right: Quick Return Action Button & Map Button */}
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:self-center">
                {onOpenCabinetMap && (
                  <button
                    type="button"
                    onClick={() => onOpenCabinetMap(b.device)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-[#CAF0F8] text-[#023E8A] border border-[#90E0EF] shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Xem vị trí tủ thiết bị trên sơ đồ văn phòng"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>Xem sơ đồ tủ</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenReturnModal(b)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    isOverdue
                      ? 'bg-[#C0392B] hover:bg-[#C0392B]/90 text-white shadow-[#C0392B]/30'
                      : 'bg-[#0077B6] hover:bg-[#023E8A] text-white shadow-xs'
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
