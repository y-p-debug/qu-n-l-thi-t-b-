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
  Check
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
  onBookingSuccess: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  currentUserEmail,
  currentUserName,
  activeBookings,
  onBookingSuccess
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
      setPurpose('');
      setDevice('');

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      onBookingSuccess();
    } catch (err: unknown) {
      console.error('Booking submission error:', err);
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 px-6 py-5 text-white flex items-center justify-between rounded-t-2xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <Calendar className="w-5 h-5 text-blue-200" />
            Đăng ký mượn thiết bị • 機器貸出登録
          </h2>
          <p className="text-xs text-blue-100/90 mt-1">
            Vui lòng điền đầy đủ các thông tin mượn bên dưới (DYM Vietnam)
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-blue-100 border border-white/15">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Chống trùng lịch tự động</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Date and Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 日付 Ngày */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>日付 Ngày (Date) <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* 開始時刻 Thời gian bắt đầu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>開始時刻 Thời gian bắt đầu <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* 終了時刻 Thời gian kết thúc */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>終了時刻 Thời gian kết thúc <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Device, Team, and Searchable Registrant Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Thiết bị (Select) */}
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-blue-600" />
                Thiết bị (機器) <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                {availableDevices.length} thiết bị sẵn sàng
              </span>
            </label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceType)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs cursor-pointer"
            >
              <option value="">-- Chọn thiết bị còn trống --</option>
              {DEVICE_LIST.map((d) => {
                const isAvail = availableDevices.includes(d);
                return (
                  <option key={d} value={d} disabled={!isAvail} className={!isAvail ? 'text-slate-400 bg-slate-100' : 'text-slate-900 font-medium'}>
                    {d} {isAvail ? '(Còn trống ✓)' : '(Đã có người mượn / Bận)'}
                  </option>
                );
              })}
            </select>
            {availableDevices.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Khung giờ này tất cả thiết bị đã được mượn hoặc đang bận.
              </p>
            )}
          </div>

          {/* チーム Team */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>チーム Team <span className="text-rose-500">*</span></span>
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                Tự lọc mem
              </span>
            </label>
            <select
              value={team}
              onChange={(e) => handleTeamChange(e.target.value as TeamType)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs cursor-pointer"
            >
              {TEAM_LIST.map((t) => (
                <option key={t} value={t}>
                  {t} ({ALLOWED_USERS_LIST.filter(u => u.team === t).length} thành viên)
                </option>
              ))}
            </select>
          </div>

          {/* 登録者名 Người đăng ký (Có ô tìm kiếm đánh chữ + liên kết 2 chiều với Team) */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>登録者名 Người đăng ký <span className="text-rose-500">*</span></span>
              </span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                Gõ chữ tìm nhanh
              </span>
            </label>

            {/* Custom Searchable Dropdown Trigger */}
            <div
              onClick={() => setIsRegistrantDropdownOpen(!isRegistrantDropdownOpen)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 hover:border-blue-500 rounded-xl text-sm font-semibold text-blue-900 flex items-center justify-between cursor-pointer transition-all shadow-xs"
            >
              <span className="truncate">
                {registrantName || '-- Chọn hoặc tìm người đăng ký --'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isRegistrantDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu Popup - ENLARGED */}
            {isRegistrantDropdownOpen && (
              <div className="absolute right-0 left-0 sm:-left-24 sm:right-0 sm:w-[480px] top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
                {/* Search Input Box */}
                <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5">
                  <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="Gõ tên hoặc email để tìm kiếm nhanh..."
                    value={registrantSearchText}
                    onChange={(e) => setRegistrantSearchText(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                  />
                  {registrantSearchText && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRegistrantSearchText('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Items List - Expanded Height & Roomier Spacing */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 text-sm">
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
                              isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{u.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                                  {u.team}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-normal">{u.email}</div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })
                    )
                  ) : (
                    <>
                      {/* Priority: Members of the currently selected team */}
                      <div className="px-3 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50/80 rounded-lg my-1 flex items-center justify-between">
                        <span>Thành viên {team}</span>
                        <span className="text-[11px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full font-bold">
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
                              isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-sm font-semibold">{u.name}</div>
                              <div className="text-xs text-slate-500 font-normal">{u.email}</div>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })}

                      {/* Other teams members */}
                      {otherTeamMembers.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 rounded-lg mt-3 mb-1 flex items-center justify-between">
                            <span>Thành viên các team khác (Bấm để tự đổi team)</span>
                            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
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
                                  isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{u.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-medium">
                                      {u.team}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 font-normal">{u.email}</div>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
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
        </div>

        {/* LAPTOP Password Alert Highlight */}
        {device === 'LAPTOP' && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start gap-3.5 text-amber-900 animate-in fade-in slide-in-from-top-2 duration-300 shadow-md shadow-amber-500/5">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">Mật khẩu LAPTOP:</span>
                <span className="px-3 py-1 bg-white font-mono font-extrabold text-base tracking-widest text-amber-950 border border-amber-300 rounded-lg shadow-inner select-all">
                  {laptopPassword || '976431'}
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                  Firestore Secure
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Mật khẩu được lưu trữ bảo mật trên Firestore collection <code>settings/laptop</code>. Vui lòng ghi nhớ để đăng nhập máy.
              </p>
            </div>
          </div>
        )}

        {/* 目的 Mục đích */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>目的 Mục đích sử dụng <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Họp khách hàng, quay video dự án, training nội bộ..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-xs"
          />
        </div>

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
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Thành công:</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !device}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang kiểm tra & ghi nhận...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Đăng ký mượn • 登録する</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
