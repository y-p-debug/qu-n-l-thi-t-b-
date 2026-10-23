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
  Download,
  CheckSquare,
  Square,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { BookingRecord, DEVICE_LIST } from './types';
import { deleteMultipleBookingRecords } from './firebase';
import { isBookingOverdue, formatDateDisplay, formatDateTimeDisplay } from './utils';

/**
 * HẰNG SỐ EMAIL QUẢN TRỊ VIÊN CÓ QUYỀN XOÁ LỊCH SỬ VÀ XUẤT CSV
 * Thay đổi tại đây nếu muốn phân quyền cho tài khoản khác
 */
export const ADMIN_EMAIL = 'y-p@dymvietnam.net';

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

  // Multi-select & Delete state (chỉ dành cho ADMIN_EMAIL: y-p@dymvietnam.net)
  const isAdmin = currentUserEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<BookingRecord[] | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bản ghi hiển thị theo phân quyền:
  // Admin (y-p@dymvietnam.net): thấy tất cả (kể cả đã trả)
  // Non-admin: KHÔNG THẤY bất kỳ bản ghi nào có trạng thái "Đã trả" (isReturned == true)
  const visibleBookings = isAdmin 
    ? bookings 
    : bookings.filter((b) => b.isReturned !== true);

  // Apply filters trên tập bản ghi được phép thấy
  const filteredBookings = visibleBookings.filter((b) => {
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

  // Toggle selection for a single row
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all in current filtered view
  const isAllSelected = 
    filteredBookings.length > 0 && 
    filteredBookings.every((b) => selectedIds.has(b.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredBookings.forEach((b) => next.add(b.id));
      setSelectedIds(next);
    }
  };

  // Open delete confirmation for multiple selected bookings
  const handleOpenDeleteSelected = () => {
    const targets = bookings.filter((b) => selectedIds.has(b.id));
    if (targets.length === 0) return;
    setDeleteTarget(targets);
  };

  // Confirm delete handler (Firestore + Storage)
  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.length === 0) return;
    setIsDeleting(true);

    try {
      const count = deleteTarget.length;
      const { successCount, errors } = await deleteMultipleBookingRecords(deleteTarget);

      // Remove deleted IDs from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteTarget.forEach((b) => next.delete(b.id));
        return next;
      });

      setDeleteTarget(null);

      if (errors.length > 0) {
        setToastMessage(`Đã xoá ${successCount}/${count} bản ghi. Một số lỗi: ${errors.join(', ')}`);
      } else {
        setToastMessage(`Đã xoá thành công ${count} bản ghi lịch sử mượn.`);
      }

      // Auto hide toast after 4s
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Delete error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi khi xoá: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV handler
  const handleExportCsv = () => {
    const listToExport = selectedIds.size > 0
      ? bookings.filter((b) => selectedIds.has(b.id))
      : filteredBookings;

    if (listToExport.length === 0) {
      alert('Không có bản ghi nào để xuất CSV.');
      return;
    }

    const headers = [
      'ID',
      'Ngày',
      'Bắt đầu',
      'Kết thúc',
      'Thiết bị',
      'Team',
      'Người đăng ký',
      'Email',
      'Mục đích',
      'Trạng thái',
      'Thời gian trả',
      'Link ảnh hoàn trả',
      'Thời điểm tạo'
    ];

    const rows = listToExport.map((b) => {
      const isOverdue = isBookingOverdue(b);
      const status = b.isReturned ? 'Đã trả' : isOverdue ? 'Quá giờ chưa trả' : 'Đang mượn';
      return [
        `"${b.id}"`,
        `"${b.date}"`,
        `"${b.startTime}"`,
        `"${b.endTime}"`,
        `"${b.device}"`,
        `"${b.team}"`,
        `"${(b.registrantName || '').replace(/"/g, '""')}"`,
        `"${b.registrantEmail || ''}"`,
        `"${(b.purpose || '').replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${b.returnedAt || ''}"`,
        `"${b.returnPhotoUrl || ''}"`,
        `"${b.createdAt || ''}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `lich_su_muon_thiet_bi_dym_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#ADE8F4] overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 right-3 z-50 bg-[#03045E] text-white px-4 py-2.5 rounded-xl shadow-xl border border-[#48CAE4] flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#48CAE4] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 p-0.5 hover:bg-white/20 rounded text-[#CAF0F8]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-[#ADE8F4] bg-[#CAF0F8]/40 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-bold text-[#03045E]">
            Danh sách mượn thiết bị • 貸出一覧
          </h3>

          {/* Quick status summary counts */}
          <div className="flex items-center gap-2 text-xs">
            {isAdmin && (
              <span className="px-2.5 py-1 rounded-lg bg-white text-[#03045E] border border-[#90E0EF] font-medium">
                Đã trả: {bookings.filter(b => b.isReturned).length}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-[#C0392B] text-white font-bold shadow-xs">
              Quá giờ: {visibleBookings.filter(b => isBookingOverdue(b)).length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#CAF0F8] text-[#03045E] font-bold border border-[#ADE8F4]">
              Tổng: {visibleBookings.length}
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

          {/* Status Filter (Chỉ hiện 'Đã trả' cho Admin y-p@dymvietnam.net) */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#90E0EF] rounded-xl text-xs font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái (All Status)</option>
              <option value="IN_USE">Đang mượn (Trong giờ)</option>
              <option value="OVERDUE">⚠️ Quá giờ chưa trả (Overdue)</option>
              {isAdmin && <option value="RETURNED">✓ Đã trả (Returned)</option>}
            </select>
          </div>
        </div>

        {/* Admin Action Toolbar (Chỉ hiển thị cho y-p@dymvietnam.net) */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#ADE8F4]/80">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Delete Selected Button */}
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleOpenDeleteSelected}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                  selectedIds.size > 0
                    ? 'bg-[#C0392B] hover:bg-red-800 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title="Xoá các mục đã chọn trong lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá các mục đã chọn ({selectedIds.size}) • 削除</span>
              </button>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-white text-[#023E8A] border border-[#0096C7] hover:bg-[#CAF0F8] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Tải về file CSV dữ liệu lịch sử mượn"
              >
                <Download className="w-3.5 h-3.5 text-[#0077B6]" />
                <span>Xuất CSV • CSV出力</span>
              </button>

              {selectedIds.size > 0 && (
                <span className="text-[11px] text-[#023E8A] font-medium hidden sm:inline">
                  Đã chọn {selectedIds.size} / {filteredBookings.length} bản ghi
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#03045E] font-bold bg-[#CAF0F8] px-2.5 py-0.5 rounded-full border border-[#90E0EF]">
                Quản trị viên ({ADMIN_EMAIL})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Table Content (Desktop / Tablet: cuộn trong khung bảng) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[840px]">
          <thead>
            <tr className="bg-[#023E8A] text-white font-bold uppercase tracking-wider border-b border-[#0077B6]">
              {isAdmin && (
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#0077B6] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0096C7]"
                    title="Chọn tất cả"
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
          <tbody className="divide-y divide-[#ADE8F4]/60">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-[#03045E]/70">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-[#0096C7] stroke-[1.5]" />
                    <p className="text-sm font-semibold text-[#03045E]">
                      {!isAdmin || visibleBookings.length === 0 
                        ? 'Không có thiết bị đang mượn • 貸出中の機器はありません'
                        : 'Không tìm thấy lượt mượn nào phù hợp với bộ lọc.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => {
                const isOverdue = isBookingOverdue(b);
                const isSelected = selectedIds.has(b.id);
                const canReturn = !b.isReturned && (
                  b.registrantEmail.toLowerCase() === currentUserEmail.toLowerCase() ||
                  isAdmin
                );

                return (
                  <tr
                    key={b.id}
                    className={`transition-colors duration-150 hover:bg-[#CAF0F8]/30 ${
                      isSelected
                        ? 'bg-[#CAF0F8]/60 font-semibold'
                        : isOverdue 
                        ? 'bg-[#C0392B]/10 text-[#03045E] font-medium' 
                        : b.isReturned 
                        ? 'bg-white text-[#03045E]/85' 
                        : 'bg-[#CAF0F8]/20 text-[#03045E]'
                    }`}
                  >
                    {/* Checkbox (Admin only) */}
                    {isAdmin && (
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(b.id)}
                          className="w-4 h-4 rounded text-[#0077B6] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0096C7]"
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

                          {/* Thumbnail button hoặc chữ "Không có ảnh" */}
                          {b.returnPhotoUrl ? (
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
                          ) : (
                            <span className="text-[10px] text-[#023E8A]/50 italic">Không có ảnh</span>
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

                    {/* Thao tác (Nút Trả thiết bị & Nút Xoá) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canReturn ? (
                          <button
                            type="button"
                            onClick={() => onOpenReturnModal(b)}
                            className="px-3 py-1.5 bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Trả thiết bị</span>
                          </button>
                        ) : b.isReturned ? (
                          <span className="text-[#03045E]/50 text-[11px] italic">Hoàn tất</span>
                        ) : (
                          <span className="text-[#03045E]/50 text-[11px] italic" title="Chờ người mượn hoặc quản trị viên xác nhận trả">
                            Chờ trả
                          </span>
                        )}

                        {/* Nút Xoá (Chỉ dành cho admin y-p@dymvietnam.net) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget([b])}
                            className="p-1.5 bg-rose-50 hover:bg-[#C0392B] text-[#C0392B] hover:text-white border border-rose-200 hover:border-[#C0392B] rounded-xl transition-all cursor-pointer shadow-2xs active:scale-90"
                            title="Xoá bản ghi mượn này (Chỉ y-p@dymvietnam.net)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Mobile Card List (Hiển thị thẻ dễ đọc trên điện thoại) */}
      <div className="md:hidden divide-y divide-[#ADE8F4]/60">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-[#03045E]/70">
            <Filter className="w-8 h-8 mx-auto text-[#0096C7] stroke-[1.5] mb-2" />
            <p className="text-sm font-semibold text-[#03045E]">
              {!isAdmin || visibleBookings.length === 0 
                ? 'Không có thiết bị đang mượn • 貸出中の機器はありません'
                : 'Không tìm thấy lượt mượn nào phù hợp với bộ lọc.'}
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isOverdue = isBookingOverdue(b);
            const isSelected = selectedIds.has(b.id);
            const canReturn = !b.isReturned && (
              b.registrantEmail.toLowerCase() === currentUserEmail.toLowerCase() ||
              isAdmin
            );

            return (
              <div 
                key={b.id} 
                className={`p-4 space-y-3 transition-colors ${
                  isSelected
                    ? 'bg-[#CAF0F8]/50 border-l-4 border-l-[#0096C7]'
                    : isOverdue 
                    ? 'bg-[#C0392B]/10 border-l-4 border-l-[#C0392B]' 
                    : b.isReturned 
                    ? 'bg-white' 
                    : 'bg-[#CAF0F8]/20'
                }`}
              >
                {/* Header thẻ: Checkbox (Admin) + Thiết bị + Trạng thái */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(b.id)}
                        className="w-4 h-4 rounded text-[#0077B6] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0096C7]"
                      />
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      b.device === 'LAPTOP'
                        ? 'bg-[#CAF0F8] text-[#03045E] border border-[#90E0EF]'
                        : 'bg-[#ADE8F4] text-[#03045E] border border-[#90E0EF]'
                    }`}>
                      {b.device === 'LAPTOP' ? <Laptop className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                      {b.device}
                    </span>
                  </div>

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
                      {b.returnPhotoUrl ? (
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
                      ) : (
                        <span className="text-[10px] text-[#023E8A]/50 italic">Không có ảnh</span>
                      )}
                      <span className="text-[10px] text-[#023E8A]/70">
                        {formatDateTimeDisplay(b.returnedAt)}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {canReturn && (
                      <button
                        type="button"
                        onClick={() => onOpenReturnModal(b)}
                        className="px-3 py-1.5 bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold rounded-xl shadow-xs active:scale-95 flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Trả thiết bị</span>
                      </button>
                    )}

                    {/* Nút Xoá Mobile */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget([b])}
                        className="p-2 bg-rose-50 hover:bg-[#C0392B] text-[#C0392B] hover:text-white border border-rose-200 hover:border-[#C0392B] rounded-xl transition-all cursor-pointer shadow-2xs active:scale-90"
                        title="Xoá bản ghi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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

      {/* Delete Confirmation Modal (Chỉ dành cho admin y-p@dymvietnam.net) */}
      {deleteTarget && deleteTarget.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#90E0EF] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#C0392B] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    Xác nhận xoá lịch sử mượn • 貸出記録の削除確認
                  </h3>
                  <p className="text-[11px] text-rose-100 font-medium">
                    Hành động này sẽ xoá dữ liệu vĩnh viễn khỏi Firestore & Storage
                  </p>
                </div>
              </div>
              {!isDeleting && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                Bạn đang chuẩn bị xoá <strong className="text-red-700">{deleteTarget.length} bản ghi</strong> lịch sử mượn thiết bị:
              </p>

              {/* Cảnh báo đặc biệt nếu có thiết bị chưa trả */}
              {deleteTarget.some((b) => !b.isReturned) && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl text-xs text-amber-950 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-black text-amber-900 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                    <span>Thiết bị này chưa được trả, vẫn xoá?</span>
                  </div>
                  <p className="leading-relaxed text-amber-900/90 text-[11px] sm:text-xs">
                    Trong danh sách có thiết bị <strong>chưa được trả</strong>. Nếu xoá bản ghi này, thiết bị sẽ tự động trở lại trạng thái <strong>TRỐNG (SẴN SÀNG)</strong> trên hệ thống vì không còn bản ghi chiếm giữ.
                  </p>
                </div>
              )}

              {/* Danh sách bản ghi cần xoá */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50 text-xs">
                {deleteTarget.map((b) => (
                  <div key={b.id} className="p-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#03045E] bg-white px-2 py-0.5 rounded border border-slate-200">
                          {b.device}
                        </span>
                        <span className="font-bold text-slate-800">
                          {b.registrantName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({b.team})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {formatDateDisplay(b.date)} • {b.startTime} - {b.endTime}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate" title={b.purpose}>
                        Mục đích: {b.purpose}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {b.isReturned ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                          Đã trả
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full inline-block">
                          Chưa trả
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                <span>
                  Các hình ảnh xác nhận trả thiết bị trên <strong>Firebase Storage</strong> tương ứng (nếu có) sẽ được dọn dẹp và xoá đồng thời.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Huỷ bỏ • キャンセル
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-[#C0392B] hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xoá...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xoá vĩnh viễn ({deleteTarget.length})</span>
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
