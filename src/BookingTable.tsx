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
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Danh sách mượn thiết bị • 貸出一覧</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {filteredBookings.length} bản ghi
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật tức thời thời gian thực (Realtime Firestore onSnapshot)
            </p>
          </div>

          {/* Quick status summary counts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Đã trả: {bookings.filter(b => b.isReturned).length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              Quá giờ: {bookings.filter(b => isBookingOverdue(b)).length}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Search query */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded text-slate-600"
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái (All Status)</option>
              <option value="IN_USE">Đang mượn (Trong giờ)</option>
              <option value="OVERDUE">⚠️ Quá giờ chưa trả (Overdue)</option>
              <option value="RETURNED">✓ Đã trả (Returned)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
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
          <tbody className="divide-y divide-slate-200">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-300 stroke-[1.5]" />
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
                    className={`transition-colors duration-150 hover:bg-slate-50/90 ${
                      isOverdue 
                        ? 'bg-rose-50/80 text-rose-950 font-medium' 
                        : b.isReturned 
                        ? 'bg-white text-slate-700' 
                        : 'bg-blue-50/30 text-slate-800'
                    }`}
                  >
                    {/* Ngày */}
                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      {formatDateDisplay(b.date)}
                    </td>

                    {/* Bắt đầu */}
                    <td className="py-3 px-3 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {b.startTime}
                      </span>
                    </td>

                    {/* Kết thúc */}
                    <td className="py-3 px-3 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {b.endTime}
                      </span>
                    </td>

                    {/* Thiết bị */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        b.device === 'LAPTOP'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {b.device === 'LAPTOP' ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                        {b.device}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {b.team}
                      </span>
                    </td>

                    {/* Người đăng ký */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {b.registrantName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {b.registrantEmail}
                      </div>
                    </td>

                    {/* Mục đích */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <p className="line-clamp-2 text-slate-600" title={b.purpose}>
                        {b.purpose}
                      </p>
                    </td>

                    {/* Trả lại (+ Ảnh) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.isReturned ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã trả
                          </span>

                          {/* Thumbnail button */}
                          {b.returnPhotoUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(b.returnPhotoUrl || null)}
                              className="group relative block w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 shadow-xs hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer"
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
                          <span className="text-[10px] text-slate-400">
                            {formatDateTimeDisplay(b.returnedAt)}
                          </span>
                        </div>
                      ) : isOverdue ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-bold animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            QUÁ GIỜ CHƯA TRẢ
                          </span>
                          <span className="text-[10px] text-rose-600 font-semibold">
                            Cần trả ngay
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">
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
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 ml-auto text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Trả thiết bị</span>
                        </button>
                      ) : b.isReturned ? (
                        <span className="text-slate-400 text-[11px] italic">Hoàn tất</span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic" title="Chỉ người mượn hoặc y-p@dymvietnam.net mới có quyền bấm">
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
