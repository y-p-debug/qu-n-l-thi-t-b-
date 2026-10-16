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
  ExternalLink,
  Trash2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { BookingRecord, ADMIN_EMAIL, DEVICE_LIST, isUserAdmin } from './types';
import { isBookingOverdue, formatDateDisplay, formatDateTimeDisplay } from './utils';
import { deleteBookingRecord, batchDeleteBookingRecords } from './firebase';

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

  // Admin Delete History state
  const [deletingBooking, setDeletingBooking] = useState<BookingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const isAdmin = isUserAdmin(currentUserEmail);

  // Checkbox selection for batch delete (Admin only)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [batchDeleteType, setBatchDeleteType] = useState<'SELECTED' | 'ALL_RETURNED'>('SELECTED');

  const handleConfirmDelete = async () => {
    if (!deletingBooking || !isAdmin) return;
    setIsDeleting(true);
    setActionFeedback(null);

    const recordToDelete = deletingBooking;
    const res = await deleteBookingRecord(recordToDelete.id, currentUserEmail);
    setIsDeleting(false);

    if (res.ok) {
      setDeletingBooking(null);
      setSelectedIds(prev => prev.filter(id => id !== recordToDelete.id));
      setActionFeedback({
        type: 'success',
        message: `Đã xóa thành công bản ghi mượn ${recordToDelete.device} của ${recordToDelete.registrantName} (${formatDateDisplay(recordToDelete.date)})!`
      });
      setTimeout(() => {
        setActionFeedback(null);
      }, 5000);
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Có lỗi xảy ra khi xóa bản ghi. Vui lòng thử lại.'
      });
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (!isAdmin) return;
    setIsDeleting(true);
    setActionFeedback(null);

    let idsToDelete: string[] = [];
    if (batchDeleteType === 'SELECTED') {
      idsToDelete = selectedIds;
    } else if (batchDeleteType === 'ALL_RETURNED') {
      idsToDelete = bookings.filter(b => b.isReturned).map(b => b.id);
    }

    if (idsToDelete.length === 0) {
      setIsDeleting(false);
      setShowBatchDeleteModal(false);
      return;
    }

    const res = await batchDeleteBookingRecords(idsToDelete, currentUserEmail);
    setIsDeleting(false);
    setShowBatchDeleteModal(false);

    if (res.ok) {
      setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      setActionFeedback({
        type: 'success',
        message: `Đã xóa thành công ${res.count} bản ghi lịch sử khỏi hệ thống!`
      });
      setTimeout(() => {
        setActionFeedback(null);
      }, 5000);
    } else {
      setActionFeedback({
        type: 'error',
        message: res.error || 'Có lỗi xảy ra khi xóa hàng loạt. Vui lòng thử lại.'
      });
    }
  };

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
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Danh sách mượn thiết bị • 貸出一覧
            </h3>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-800 font-bold text-[11px] shadow-2xs" title="Chỉ tài khoản admin y-p@dymvietnam có quyền xóa lịch sử">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                Admin (Có quyền xóa lịch sử)
              </span>
            )}
          </div>

          {/* Quick status summary counts & Admin Batch Delete Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isAdmin && selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBatchDeleteType('SELECTED');
                  setShowBatchDeleteModal(true);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-in fade-in"
                title="Xóa vĩnh viễn các bản ghi đã tích chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedIds.length} bản ghi đã chọn</span>
              </button>
            )}

            {isAdmin && bookings.some(b => b.isReturned) && (
              <button
                type="button"
                onClick={() => {
                  setBatchDeleteType('ALL_RETURNED');
                  setShowBatchDeleteModal(true);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Dọn dẹp nhanh tất cả các lượt mượn đã hoàn tất trả máy"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Xóa các bản ghi đã trả ({bookings.filter(b => b.isReturned).length})</span>
              </button>
            )}

            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Đã trả: {bookings.filter(b => b.isReturned).length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              Quá giờ: {bookings.filter(b => isBookingOverdue(b)).length}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {actionFeedback && (
          <div 
            className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-[11px] underline ml-3 opacity-70 hover:opacity-100 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

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
              {isAdmin && (
                <th className="py-3.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredBookings.length > 0 && filteredBookings.every(b => selectedIds.includes(b.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allFilteredIds = filteredBookings.map(b => b.id);
                        setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                      } else {
                        const filteredSet = new Set(filteredBookings.map(b => b.id));
                        setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    title="Chọn tất cả các bản ghi đang hiển thị"
                  />
                </th>
              )}
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
                <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-slate-400">
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
                  isUserAdmin(currentUserEmail)
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
                    {isAdmin && (
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, b.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== b.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          title={`Chọn bản ghi ${b.device} của ${b.registrantName}`}
                        />
                      </td>
                    )}
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

                    {/* Thao tác (Nút Trả thiết bị & Nút Xóa bản ghi) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canReturn && (
                          <button
                            type="button"
                            onClick={() => onOpenReturnModal(b)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Trả thiết bị</span>
                          </button>
                        )}

                        {!canReturn && b.isReturned && !isAdmin && (
                          <span className="text-slate-400 text-[11px] italic">Hoàn tất</span>
                        )}

                        {!canReturn && !b.isReturned && !isAdmin && (
                          <span className="text-slate-400 text-[11px] italic" title="Chỉ người mượn hoặc y-p@dymvietnam.net mới có quyền bấm">
                            Chờ trả
                          </span>
                        )}

                        {/* Nút Xóa bản ghi - Chỉ duy nhất tài khoản admin y-p@dymvietnam mới thấy và có quyền xóa */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionFeedback(null);
                              setDeletingBooking(b);
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs group"
                            title="Xóa bản ghi này khỏi lịch sử (Chỉ dành cho admin y-p@dymvietnam)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 group-hover:text-white transition-colors" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
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
      {/* Delete Confirmation Modal for Admin (y-p@dymvietnam.net) */}
      {deletingBooking && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!isDeleting) setDeletingBooking(null);
          }}
        >
          <div 
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-rose-950">
                    Xác nhận xóa bản ghi lịch sử
                  </h4>
                  <p className="text-xs text-rose-700">
                    Quyền quản trị viên: <span className="font-semibold">{ADMIN_EMAIL}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBooking(null)}
                className="w-8 h-8 rounded-lg hover:bg-rose-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cảnh báo hành động không thể hoàn tác:</p>
                  <p className="mt-0.5 text-amber-800">
                    Bản ghi này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu Firestore và biến mất khỏi toàn bộ danh sách mượn.
                  </p>
                </div>
              </div>

              {/* Details of booking being deleted */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Thiết bị:</span>
                  <span className="font-bold text-slate-900">{deletingBooking.device}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Người đăng ký:</span>
                  <span className="font-semibold text-slate-900">
                    {deletingBooking.registrantName} ({deletingBooking.registrantEmail})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Team:</span>
                  <span className="font-medium text-slate-800">{deletingBooking.team}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Thời gian mượn:</span>
                  <span className="font-medium text-slate-800">
                    {formatDateDisplay(deletingBooking.date)} ({deletingBooking.startTime} - {deletingBooking.endTime})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Mục đích:</span>
                  <span className="font-medium text-slate-800">{deletingBooking.purpose || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái hiện tại:</span>
                  <span className={`font-bold ${deletingBooking.isReturned ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {deletingBooking.isReturned ? '✓ Đã hoàn trả' : 'Chưa hoàn trả'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBooking(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa vĩnh viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal for Admin */}
      {showBatchDeleteModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!isDeleting) setShowBatchDeleteModal(false);
          }}
        >
          <div 
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-rose-950">
                    Xác nhận xóa hàng loạt lịch sử
                  </h4>
                  <p className="text-xs text-rose-700">
                    Quyền quản trị viên: <span className="font-semibold">{ADMIN_EMAIL}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-rose-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cảnh báo hành động xóa vĩnh viễn:</p>
                  <p className="mt-0.5 text-amber-800">
                    {batchDeleteType === 'SELECTED'
                      ? `Bạn chuẩn bị xóa ${selectedIds.length} bản ghi đã chọn khỏi cơ sở dữ liệu Firestore.`
                      : `Bạn chuẩn bị xóa tất cả ${bookings.filter(b => b.isReturned).length} bản ghi đã trả khỏi cơ sở dữ liệu Firestore.`}
                  </p>
                </div>
              </div>
              <p className="text-slate-600">
                Sau khi xóa, các dữ liệu này sẽ bị xóa hoàn toàn khỏi hệ thống và không thể khôi phục lại.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {batchDeleteType === 'SELECTED' 
                        ? `Xác nhận xóa (${selectedIds.length} bản ghi)` 
                        : 'Xác nhận xóa tất cả bản ghi đã trả'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
