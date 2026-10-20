import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Laptop, 
  Camera, 
  Users, 
  UserCheck, 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle,
  KeyRound,
  ShieldCheck,
  Info,
  Search,
  ChevronDown,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  DEVICE_LIST, 
  TEAM_LIST, 
  ALLOWED_USERS_LIST, 
  BookingRecord, 
  ADMIN_EMAIL,
  DeviceType,
  TeamType 
} from './types';
import { isDeviceAvailable } from './utils';
import { db, getLaptopPasswordFromFirestore, queueNotificationEmail } from './firebase';
import { generateEmailHtml } from './emailTemplates';
import { collection, runTransaction, doc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface BookingFormProps {
  currentUserEmail: string;
  currentUserName: string;
  activeBookings: BookingRecord[];
  onBookingSuccess: (device?: DeviceType, laptopPassword?: string | null) => void;
  onViewHistory?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  currentUserEmail,
  currentUserName,
  activeBookings,
  onBookingSuccess,
  onViewHistory
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const getInitialTimes = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    const startH = String(d.getHours()).padStart(2, '0');
    const endH = String(Math.min(23, d.getHours() + 1)).padStart(2, '0');
    return {
      start: `${startH}:00`,
      end: `${endH}:00`
    };
  };

  const initialTimes = getInitialTimes();

  // Find initial user & their team
  const initialUser = ALLOWED_USERS_LIST.find(
    (u) => u.name === currentUserName || u.email.toLowerCase() === currentUserEmail.toLowerCase()
  );

  const [date, setDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>(initialTimes.start);
  const [endTime, setEndTime] = useState<string>(initialTimes.end);
  const [device, setDevice] = useState<DeviceType | ''>('');
  const [team, setTeam] = useState<TeamType>(initialUser ? initialUser.team : '1課');
  const [registrantName, setRegistrantName] = useState<string>(initialUser ? initialUser.name : currentUserName);
  const [purpose, setPurpose] = useState<string>('');

  // Searchable registrant dropdown state
  const [isRegistrantDropdownOpen, setIsRegistrantDropdownOpen] = useState(false);
  const [registrantSearchText, setRegistrantSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [laptopPassword, setLaptopPassword] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync registrant and team when currentUserName or currentUserEmail updates on login
  useEffect(() => {
    if (currentUserEmail || currentUserName) {
      const found = ALLOWED_USERS_LIST.find(
        (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase() || u.name === currentUserName
      );
      if (found) {
        setRegistrantName(found.name);
        setTeam(found.team);
      } else if (currentUserName) {
        setRegistrantName(currentUserName);
      }
    }
  }, [currentUserName, currentUserEmail]);

  // Close registrant dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRegistrantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch laptop password if LAPTOP is selected
  useEffect(() => {
    let isMounted = true;
    if (device === 'LAPTOP') {
      getLaptopPasswordFromFirestore().then((pw) => {
        if (isMounted) setLaptopPassword(pw);
      });
    } else {
      setLaptopPassword(null);
    }
    return () => {
      isMounted = false;
    };
  }, [device]);

  // Filter available devices dynamically based on date, startTime, endTime
  const availableDevices = DEVICE_LIST.filter((dev) => {
    if (!date || !startTime || !endTime || startTime >= endTime) {
      return true;
    }
    const check = isDeviceAvailable(dev, date, startTime, endTime, activeBookings);
    return check.available;
  });

  // If currently selected device is not available anymore, reset device selection
  useEffect(() => {
    if (device && !availableDevices.includes(device)) {
      setDevice('');
    }
  }, [date, startTime, endTime, activeBookings]);

  // LOGIC 1: Khi chọn Team -> tự động cập nhật danh sách thành viên thuộc team đó
  // Nếu người đăng ký hiện tại không thuộc team mới chọn -> tự động chọn thành viên đầu tiên của team
  const handleTeamChange = (newTeam: TeamType) => {
    setTeam(newTeam);
    const membersInNewTeam = ALLOWED_USERS_LIST.filter((u) => u.team === newTeam);
    const isCurrentInTeam = membersInNewTeam.some((u) => u.name === registrantName);
    if (!isCurrentInTeam && membersInNewTeam.length > 0) {
      setRegistrantName(membersInNewTeam[0].name);
    }
    setRegistrantSearchText('');
  };

  // LOGIC 2: Khi chọn Member -> tự động cập nhật Team tương ứng
  const handleSelectMember = (member: typeof ALLOWED_USERS_LIST[number]) => {
    setRegistrantName(member.name);
    setTeam(member.team);
    setIsRegistrantDropdownOpen(false);
    setRegistrantSearchText('');
  };

  // Filter members for dropdown:
  // Shows members belonging to current team first, or all matching search
  const filteredMembers = ALLOWED_USERS_LIST.filter((u) => {
    // If user typed search text, search across name, email, or team
    if (registrantSearchText.trim()) {
      const q = registrantSearchText.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.team.toLowerCase().includes(q)
      );
    }
    // If not searching, prioritize members of the currently selected team
    return u.team === team;
  });

  // All other members when not searching (so user can still pick anyone)
  const otherTeamMembers = !registrantSearchText.trim()
    ? ALLOWED_USERS_LIST.filter((u) => u.team !== team)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!date) {
      setErrorMessage('Vui lòng chọn ngày mượn (日付).');
      return;
    }
    if (date < todayStr) {
      setErrorMessage('Không được chọn ngày đã qua trong quá khứ.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    if (startTime >= endTime) {
      setErrorMessage('終了時刻 Thời gian kết thúc phải sau 開始時刻 Thời gian bắt đầu.');
      return;
    }
    if (!device) {
      setErrorMessage('Vui lòng chọn thiết bị còn trống trong danh sách.');
      return;
    }
    if (!team) {
      setErrorMessage('Vui lòng chọn チーム Team.');
      return;
    }
    if (!registrantName) {
      setErrorMessage('Vui lòng chọn 登録者名 Người đăng ký.');
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage('Vui lòng nhập 目的 Mục đích sử dụng thiết bị.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find corresponding email for the selected registrant
      const registrantObj = ALLOWED_USERS_LIST.find((u) => u.name === registrantName);
      const registrantEmail = registrantObj ? registrantObj.email : currentUserEmail;

      const newBookingId = doc(collection(db, 'bookings')).id;

      await runTransaction(db, async (transaction) => {
        const availability = isDeviceAvailable(
          device,
          date,
          startTime,
          endTime,
          activeBookings
        );

        if (!availability.available) {
          throw new Error(availability.conflictReason || 'Thiết bị vừa được đặt bởi người khác hoặc đang bận! Vui lòng chọn khung giờ khác.');
        }

        const newDocRef = doc(db, 'bookings', newBookingId);
        transaction.set(newDocRef, {
          id: newBookingId,
          date,
          startTime,
          endTime,
          device,
          team,
          registrantName,
          registrantEmail,
          purpose: purpose.trim(),
          isReturned: false,
          returnedAt: null,
          returnPhotoUrl: null,
          createdAt: new Date().toISOString(),
          overdueNotified: false
        });
      });

      // Send Email Notification to registrant & admin
      const emailContent = generateEmailHtml({
        actionType: 'borrow',
        booking: {
          id: newBookingId,
          date,
          startTime,
          endTime,
          device,
          team,
          registrantName,
          registrantEmail,
          purpose: purpose.trim(),
          isReturned: false,
          createdAt: new Date().toISOString()
        },
        laptopPassword: laptopPassword || '976431'
      });

      // Send notification to borrower, current user, and admin y-p@dymvietnam.net
      const borrowerEmail = (registrantEmail || currentUserEmail || '').trim();
      const recipients = Array.from(new Set([borrowerEmail, currentUserEmail, 'y-p@dymvietnam.net'].filter(Boolean)));

      const mailResult = await queueNotificationEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        type: 'borrow'
      });

      if (mailResult && mailResult.ok === false) {
        setSuccessMessage(`Đăng ký mượn ${device} thành công! (Lưu ý: Chưa gửi được email: ${mailResult.error || 'Vui lòng kiểm tra Webhook'})`);
      } else {
        setSuccessMessage(`Đăng ký mượn ${device} thành công! Email thông báo đã được gửi.`);
      }

      const bookedDevice = device;
      const bookedPassword = laptopPassword || '976431';

      setPurpose('');
      setDevice('');

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      onBookingSuccess(bookedDevice, bookedPassword);
    } catch (err: unknown) {
      console.error('Booking submission error:', err);
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full bg-white rounded-2xl shadow-sm border border-[#ADE8F4] overflow-hidden">
      {/* Header: gradient ngang từ --b2 sang --b3, chữ trắng đậm */}
      <div className="bg-gradient-to-r from-[#023E8A] to-[#0077B6] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#ADE8F4] shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
            Đăng ký mượn thiết bị • 機器貸出登録
          </span>
        </div>
        <p className="text-xs text-[#CAF0F8] hidden sm:block font-medium shrink-0">
          DYM Vietnam Co., Ltd.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 w-full max-w-full overflow-x-hidden box-border">
        {/* Form Fields Responsive Grid: 1 col mobile, 2 cols sm, 3 cols md, 4 cols xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-full">
          {/* 日付 Ngày */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <Calendar className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">日付 Ngày (Date) <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs [appearance:none] [-webkit-appearance:none]"
            />
          </div>

          {/* 開始時刻 Thời gian bắt đầu */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <Clock className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">開始時刻 Bắt đầu <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs [appearance:none] [-webkit-appearance:none]"
            />
          </div>

          {/* 終了時刻 Thời gian kết thúc */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <Clock className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">終了時刻 Kết thúc <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm font-medium text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs [appearance:none] [-webkit-appearance:none]"
            />
          </div>

          {/* Thiết bị (Select) */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center justify-between min-h-[22px]">
              <span className="flex items-center gap-1.5 truncate">
                <Laptop className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
                Thiết bị (機器) <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-[#03045E] bg-[#ADE8F4] px-2 py-0.5 rounded-full font-bold border border-[#90E0EF] shrink-0">
                {availableDevices.length} SẴN SÀNG
              </span>
            </label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceType)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm font-semibold text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs cursor-pointer"
            >
              <option value="">-- Chọn thiết bị còn trống --</option>
              {DEVICE_LIST.map((d) => {
                const isAvail = availableDevices.includes(d);
                return (
                  <option key={d} value={d} disabled={!isAvail} className={!isAvail ? 'text-slate-400 bg-slate-100' : 'text-[#03045E] font-medium'}>
                    {d} {isAvail ? '(Còn trống ✓)' : '(Đã có người mượn / Bận)'}
                  </option>
                );
              })}
            </select>
            {availableDevices.length === 0 && (
              <p className="text-[11px] text-[#C0392B] font-semibold mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Khung giờ này tất cả thiết bị đã được mượn hoặc đang bận.
              </p>
            )}
          </div>

          {/* チーム Team */}
          <div className="w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <Users className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">チーム Team <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={team}
              onChange={(e) => handleTeamChange(e.target.value as TeamType)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm font-semibold text-[#03045E] focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs cursor-pointer"
            >
              {TEAM_LIST.map((t) => (
                <option key={t} value={t}>
                  {t} ({ALLOWED_USERS_LIST.filter(u => u.team === t).length} thành viên)
                </option>
              ))}
            </select>
          </div>

          {/* 登録者名 Người đăng ký (Có ô tìm kiếm đánh chữ + liên kết 2 chiều với Team) */}
          <div className="relative w-full max-w-full min-w-0" ref={dropdownRef}>
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <UserCheck className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">登録者名 Người đăng ký <span className="text-rose-500">*</span></span>
            </label>

            {/* Custom Searchable Dropdown Trigger */}
            <div
              onClick={() => setIsRegistrantDropdownOpen(!isRegistrantDropdownOpen)}
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] hover:border-[#0096C7] rounded-xl text-sm font-semibold text-[#03045E] flex items-center justify-between cursor-pointer transition-all shadow-xs"
            >
              <span className="truncate">
                {registrantName || '-- Chọn hoặc tìm người đăng ký --'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#0096C7] transition-transform ${isRegistrantDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu Popup - ENLARGED */}
            {isRegistrantDropdownOpen && (
              <div className="absolute left-0 right-0 sm:-left-24 sm:right-auto sm:w-[480px] max-w-[calc(100vw-24px)] top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#90E0EF] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
                {/* Search Input Box */}
                <div className="p-3.5 border-b border-[#90E0EF]/60 bg-[#CAF0F8]/30 flex items-center gap-2.5">
                  <Search className="w-5 h-5 text-[#0096C7] shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="Gõ tên hoặc email để tìm kiếm nhanh..."
                    value={registrantSearchText}
                    onChange={(e) => setRegistrantSearchText(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium text-[#03045E] bg-transparent focus:outline-none placeholder:text-slate-400"
                  />
                  {registrantSearchText && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRegistrantSearchText('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#03045E] rounded-full hover:bg-[#CAF0F8] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Items List - Expanded Height & Roomier Spacing */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-[#CAF0F8] p-2 text-sm">
                  {/* When searching, show all matched */}
                  {registrantSearchText.trim() ? (
                    filteredMembers.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        Không tìm thấy thành viên nào khớp "{registrantSearchText}"
                      </div>
                    ) : (
                      filteredMembers.map((u) => {
                        const isSelected = u.name === registrantName;
                        return (
                          <div
                            key={u.email}
                            onClick={() => handleSelectMember(u)}
                            className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-[#CAF0F8] text-[#03045E] font-bold border border-[#0096C7]' : 'hover:bg-[#CAF0F8]/40 text-[#03045E]'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#03045E]">{u.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded-md bg-[#ADE8F4] text-[#03045E] font-bold">
                                  {u.team}
                                </span>
                              </div>
                              <div className="text-xs text-[#03045E]/70 font-normal">{u.email}</div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-[#0096C7] shrink-0" />}
                          </div>
                        );
                      })
                    )
                  ) : (
                    <>
                      {/* Priority: Members of the currently selected team */}
                      <div className="px-3 py-2 text-xs font-bold text-[#03045E] uppercase tracking-wider bg-[#CAF0F8] rounded-lg my-1 flex items-center justify-between">
                        <span>Thành viên {team}</span>
                        <span className="text-[11px] bg-white text-[#03045E] px-2 py-0.5 rounded-full font-bold border border-[#90E0EF]">
                          {filteredMembers.length} người
                        </span>
                      </div>
                      {filteredMembers.map((u) => {
                        const isSelected = u.name === registrantName;
                        return (
                          <div
                            key={u.email}
                            onClick={() => handleSelectMember(u)}
                            className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-[#CAF0F8] text-[#03045E] font-bold border border-[#0096C7]' : 'hover:bg-[#CAF0F8]/40 text-[#03045E]'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-sm font-semibold text-[#03045E]">{u.name}</div>
                              <div className="text-xs text-[#03045E]/70 font-normal">{u.email}</div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-[#0096C7] shrink-0" />}
                          </div>
                        );
                      })}

                      {/* Other teams members */}
                      {otherTeamMembers.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-bold text-[#03045E] uppercase tracking-wider bg-slate-100 rounded-lg mt-3 mb-1 flex items-center justify-between">
                            <span>Thành viên các team khác (Bấm để tự đổi team)</span>
                            <span className="text-[11px] bg-white text-[#03045E] px-2 py-0.5 rounded-full font-bold border border-[#90E0EF]">
                              {otherTeamMembers.length} người
                            </span>
                          </div>
                          {otherTeamMembers.map((u) => {
                            const isSelected = u.name === registrantName;
                            return (
                              <div
                                key={u.email}
                                onClick={() => handleSelectMember(u)}
                                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                                  isSelected ? 'bg-[#CAF0F8] text-[#03045E] font-bold border border-[#0096C7]' : 'hover:bg-[#CAF0F8]/40 text-[#03045E]'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[#03045E]">{u.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#ADE8F4] text-[#03045E] font-semibold">
                                      {u.team}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#03045E]/70 font-normal">{u.email}</div>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-[#0096C7] shrink-0" />}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. 目的 Mục đích (Chiếm 2 cột trên màn hình rộng xl:col-span-2) */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-2 w-full max-w-full min-w-0">
            <label className="block text-xs font-bold text-[#03045E] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 min-h-[22px]">
              <FileText className="w-3.5 h-3.5 text-[#0096C7] shrink-0" />
              <span className="truncate">目的 Mục đích sử dụng <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Họp khách hàng, quay video dự án, training nội bộ..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-white border border-[#90E0EF] rounded-xl text-sm text-[#03045E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ADE8F4] focus:border-[#0096C7] transition-all shadow-xs"
            />
          </div>
        </div>

        {/* LAPTOP Password Alert Highlight */}
        {device === 'LAPTOP' && (
          <div className="p-4 bg-[#CAF0F8]/40 border-2 border-[#0096C7] rounded-2xl flex items-start gap-3.5 text-[#03045E] animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#0096C7] text-white flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-[#03045E]">Mật khẩu LAPTOP:</span>
                <span className="px-3 py-1 bg-white font-mono font-extrabold text-base tracking-widest text-[#03045E] border border-[#0096C7] rounded-lg shadow-inner select-all">
                  {laptopPassword || '976431'}
                </span>
                <span className="text-[11px] font-semibold text-[#03045E] bg-[#ADE8F4] px-2 py-0.5 rounded-md border border-[#90E0EF]">
                  Firestore Secure
                </span>
              </div>
              <p className="text-xs text-[#03045E]/80 leading-relaxed font-medium">
                Mật khẩu được lưu trữ bảo mật trên Firestore collection <code>settings/laptop</code>. Vui lòng ghi nhớ để đăng nhập máy.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 animate-in shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Không thể đăng ký:</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Thành công:</p>
                <p>{successMessage}</p>
              </div>
            </div>
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="shrink-0 px-3.5 py-1.5 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl font-bold transition-colors cursor-pointer self-start sm:self-center shadow-xs"
              >
                Xem trong Lịch sử mượn →
              </button>
            )}
          </div>
        )}

        {/* Submit button: nền --b3, chữ trắng đậm, hover --b2. Bị vô hiệu: nền --b7, chữ --b2 */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !device}
            className="w-full sm:w-auto px-8 py-3 bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:bg-[#90E0EF] disabled:text-[#023E8A] disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang kiểm tra & ghi nhận...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Đăng ký mượn • 登録する</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
