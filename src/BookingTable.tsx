import React, { useState } from 'react';
import { 
  Filter, 
  Calendar, 
  Clock, 
  Camera, 
  Laptop, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { BookingRecord, ADMIN_EMAIL, DEVICE_LIST } from './types';
import { isBookingOverdue, formatDateDisplay, formatDateTimeDisplay } from './utils';

interface BookingTableProps {
  bookings: BookingRecord[];
  currentUserEmail: string;
  onOpenReturnModal: (booking: BookingRecord) => void;
}

export const BookingTable: React.FC<BookingTableProps> = ({
  bookings,
  currentUserEmail,
  onOpenReturnModal
}) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDevice, setFilterDevice] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, IN_USE, RETURNED, OVERDUE
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Image lightbox preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Apply filters
  const filteredBookings = bookings.filter((b) => {
    // Date filter
    if (filterDate && b.date !== filterDate) return false;

    // Device filter
    if (filterDevice !== 'ALL' && b.device !== filterDevice) return false;

    // Status filter
    const isOverdue = isBookingOverdue(b);
    if (filterStatus === 'RETURNED' && !b.isReturned) return false;
    if (filterStatus === 'IN_USE' && (b.isReturned || isOverdue)) return false;
    if (filterStatus === 'OVERDUE' && (!isOverdue || b.isReturned)) return false;

    // Search query (registrant, purpose, team)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        b.registrantName.toLowerCase().includes(q) ||
        b.registrantEmail.toLowerCase().includes(q) ||
        b.purpose.toLowerCase().includes(q) ||
        b.team.toLowerCase().includes(q) ||
        b.device.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#ADE8F4] overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-[#ADE8F4] bg-[#CAF0F8]/40 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-bold text-[#03045E]">
            Danh sách mượn thiết bị • 貸出一覧
          </h3>

          {/* Quick status summary counts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white text-[#03045E] border border-[#90E0EF] font-medium">
              Đã trả: {bookings.filter(b => b.isReturned).length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#C0392B] text-white font-bold shadow-xs">
              Quá giờ: {bookings.filter(b => isBookingOverdue(b)).length}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Search query */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#0096C7] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#90E0EF] rounded-xl text-xs text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7]"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#90E0EF] rounded-xl text-xs text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] cursor-pointer"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-[#0077B6]/15 hover:bg-[#0077B6] hover:text-white px-1.5 py-0.5 rounded text-[#0077B6] font-semibold"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Device Filter */}
          <div>
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#90E0EF] rounded-xl text-xs font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] cursor-pointer"
            >
              <option value="ALL">Tất cả thiết bị (All Devices)</option>
              {DEVICE_LIST.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#90E0EF] rounded-xl text-xs font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái (All Status)</option>
              <option value="IN_USE">Đang mượn (Trong giờ)</option>
              <option value="OVERDUE">⚠️ Quá giờ chưa trả (Overdue)</option>
              <option value="RETURNED">✓ Đã trả (Returned)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content (Desktop / Tablet: cuộn trong khung bảng) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[780px]">
          <thead>
            <tr className="bg-[#023E8A] text-white font-bold uppercase tracking-wider border-b border-[#0077B6]">
              <th className="py-3.5 px-4">Ngày 日付</th>
              <th className="py-3.5 px-3">Bắt đầu 開始</th>
              <th className="py-3.5 px-3">Kết thúc 終了</th>
              <th className="py-3.5 px-4">Thiết bị 機器</th>
              <th className="py-3.5 px-3">Team チーム</th>
              <th className="py-3.5 px-4">Người đăng ký 登録者</th>
              <th className="py-3.5 px-4">Mục đích 目的</th>
              <th className="py-3.5 px-4 text-center">Trả lại 返却 (+ Ảnh)</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ADE8F4]/60">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#03045E]/60">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-[#0096C7] stroke-[1.5]" />
                    <p className="text-sm font-medium">Không tìm thấy lượt mượn nào phù hợp với bộ lọc.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => {
                const isOverdue = isBookingOverdue(b);
                const canReturn = !b.isReturned && (
                  b.registrantEmail.toLowerCase() === currentUserEmail.toLowerCase() ||
                  currentUserEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                );

                return (
                  <tr
                    key={b.id}
                    className={`transition-colors duration-150 hover:bg-[#CAF0F8]/30 ${
                      isOverdue 
                        ? 'bg-[#C0392B]/10 text-[#03045E] font-medium' 
                        : b.isReturned 
                        ? 'bg-white text-[#03045E]/85' 
                        : 'bg-[#CAF0F8]/20 text-[#03045E]'
                    }`}
                  >
                    {/* Ngày */}
                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      {formatDateDisplay(b.date)}
                    </td>

                    {/* Bắt đầu */}
                    <td className="py-3 px-3 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0096C7]" />
                        {b.startTime}
                      </span>
                    </td>

                    {/* Kết thúc */}
                    <td className="py-3 px-3 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0096C7]" />
                        {b.endTime}
                      </span>
                    </td>

                    {/* Thiết bị */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        b.device === 'LAPTOP'
                          ? 'bg-[#CAF0F8] text-[#03045E] border border-[#90E0EF]'
                          : 'bg-[#ADE8F4] text-[#03045E] border border-[#90E0EF]'
                      }`}>
                        {b.device === 'LAPTOP' ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                        {b.device}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-white text-[#03045E] font-medium border border-[#ADE8F4]">
                        {b.team}
                      </span>
                    </td>

                    {/* Người đăng ký */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#03045E] leading-tight">
                        {b.registrantName}
                      </div>
                      <div className="text-[11px] text-[#023E8A]/70 truncate max-w-[200px] xl:max-w-none">
                        {b.registrantEmail}
                      </div>
                    </td>

                    {/* Mục đích */}
                    <td className="py-3 px-4 max-w-[240px] lg:max-w-[360px] xl:max-w-[500px]">
                      <p className="line-clamp-2 text-[#03045E]/85" title={b.purpose}>
                        {b.purpose}
                      </p>
                    </td>

                    {/* Trả lại (+ Ảnh) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.isReturned ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#03045E] border border-[#90E0EF] text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0096C7]" />
                            Đã trả
                          </span>

                          {/* Thumbnail button */}
                          {b.returnPhotoUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(b.returnPhotoUrl || null)}
                              className="group relative block w-10 h-10 rounded-lg overflow-hidden border border-[#0096C7] shadow-xs hover:ring-2 hover:ring-[#0096C7] transition-all cursor-pointer"
                              title="Bấm để xem ảnh phóng to"
                            >
                              <img
                                src={b.returnPhotoUrl}
                                alt="Ảnh trả"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          )}
                          <span className="text-[10px] text-[#023E8A]/70">
                            {formatDateTimeDisplay(b.returnedAt)}
                          </span>
                        </div>
                      ) : isOverdue ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C0392B] text-white text-[11px] font-extrabold animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            QUÁ GIỜ CHƯA TRẢ
                          </span>
                          <span className="text-[10px] text-[#C0392B] font-bold">
                            Cần trả ngay
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#CAF0F8] text-[#03045E] border border-[#ADE8F4] text-[11px] font-semibold">
                          Đang mượn
                        </span>
                      )}
                    </td>

                    {/* Thao tác (Nút Trả thiết bị) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canReturn ? (
                        <button
                          type="button"
                          onClick={() => onOpenReturnModal(b)}
                          className="px-3 py-1.5 bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 ml-auto text-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Trả thiết bị</span>
                        </button>
                      ) : b.isReturned ? (
                        <span className="text-[#03045E]/50 text-[11px] italic">Hoàn tất</span>
                      ) : (
                        <span className="text-[#03045E]/50 text-[11px] italic" title="Chỉ người mượn hoặc y-p@dymvietnam.net mới có quyền bấm">
                          Chờ trả
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Hiển thị thẻ dễ đọc trên điện thoại) */}
      <div className="md:hidden divide-y divide-[#ADE8F4]/60">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-[#03045E]/60">
            <Filter className="w-8 h-8 mx-auto text-[#0096C7] stroke-[1.5] mb-2" />
            <p className="text-sm font-medium">Không tìm thấy lượt mượn nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isOverdue = isBookingOverdue(b);
            const canReturn = !b.isReturned && (
              b.registrantEmail.toLowerCase() === currentUserEmail.toLowerCase() ||
              currentUserEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
            );

            return (
              <div 
                key={b.id} 
                className={`p-4 space-y-3 transition-colors ${
                  isOverdue 
                    ? 'bg-[#C0392B]/10 border-l-4 border-l-[#C0392B]' 
                    : b.isReturned 
                    ? 'bg-white' 
                    : 'bg-[#CAF0F8]/20'
                }`}
              >
                {/* Header thẻ: Thiết bị + Trạng thái */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    b.device === 'LAPTOP'
                      ? 'bg-[#CAF0F8] text-[#03045E] border border-[#90E0EF]'
                      : 'bg-[#ADE8F4] text-[#03045E] border border-[#90E0EF]'
                  }`}>
                    {b.device === 'LAPTOP' ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    {b.device}
                  </span>

                  {b.isReturned ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#03045E] border border-[#90E0EF] text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0096C7]" />
                      Đã trả
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C0392B] text-white text-[11px] font-extrabold animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      QUÁ GIỜ CHƯA TRẢ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#CAF0F8] text-[#03045E] border border-[#ADE8F4] text-[11px] font-semibold">
                      Đang mượn
                    </span>
                  )}
                </div>

                {/* Ngày & Khung giờ */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#03045E]">
                    <Calendar className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>{formatDateDisplay(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#023E8A]/75 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#0096C7]" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                </div>

                {/* Người đăng ký & Team */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-[#03045E]">{b.registrantName}</span>
                    <span className="text-[#023E8A]/60 text-[11px] ml-1.5 truncate inline-block max-w-[140px] align-bottom">({b.registrantEmail})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white text-[#03045E] font-bold border border-[#ADE8F4] shrink-0 text-[11px]">
                    {b.team}
                  </span>
                </div>

                {/* Mục đích */}
                <div className="text-xs text-[#03045E]/85 bg-[#CAF0F8]/40 p-2.5 rounded-xl border border-[#ADE8F4]">
                  <span className="font-semibold text-[#03045E]">Mục đích: </span>
                  {b.purpose}
                </div>

                {/* Ảnh hoàn trả & Nút thao tác */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  {b.isReturned ? (
                    <div className="flex items-center gap-2">
                      {b.returnPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(b.returnPhotoUrl || null)}
                          className="group relative block w-9 h-9 rounded-lg overflow-hidden border border-[#0096C7] shadow-xs hover:ring-2 hover:ring-[#0096C7] transition-all cursor-pointer"
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img
                            src={b.returnPhotoUrl}
                            alt="Ảnh trả"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                            <Eye className="w-3 h-3" />
                          </div>
                        </button>
                      )}
                      <span className="text-[10px] text-[#023E8A]/70">
                        {formatDateTimeDisplay(b.returnedAt)}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {canReturn ? (
                    <button
                      type="button"
                      onClick={() => onOpenReturnModal(b)}
                      className="px-3 py-1.5 bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold rounded-xl shadow-xs active:scale-95 flex items-center gap-1.5 text-xs ml-auto cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Trả thiết bị</span>
                    </button>
                  ) : b.isReturned ? (
                    <span className="text-[#03045E]/50 text-[11px] italic">Hoàn tất</span>
                  ) : (
                    <span className="text-[#03045E]/50 text-[11px] italic">Chờ trả</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal for Photo Preview */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 text-white border-b border-white/10">
              <span className="text-xs font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Hình ảnh vị trí thiết bị khi hoàn trả
              </span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                Đóng ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40 min-h-[300px] max-h-[70vh]">
              <img
                src={previewImageUrl}
                alt="Ảnh hoàn trả đầy đủ"
                className="max-h-[68vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-2 text-center text-xs text-slate-400">
              Chụp và tải lên lúc xác nhận hoàn trả thiết bị
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
