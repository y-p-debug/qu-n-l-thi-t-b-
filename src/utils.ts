import { BookingRecord } from './types';

/**
 * Checks whether two time windows on the same date overlap.
 * Condition:
 * start_mới < end_cũ VÀ end_mới > start_cũ
 */
export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Strings in "HH:mm" compare alphabetically correctly (e.g. "09:30" < "14:00")
  return start1 < end2 && end1 > start2;
}

/**
 * Determines if a booking is currently overdue (current time is past endTime and item is not returned)
 */
export function isBookingOverdue(booking: BookingRecord): boolean {
  if (booking.isReturned) return false;
  
  const now = new Date();
  const [bYear, bMonth, bDay] = booking.date.split('-').map(Number);
  const [bHour, bMin] = booking.endTime.split(':').map(Number);
  
  if (!bYear || !bMonth || !bDay || isNaN(bHour) || isNaN(bMin)) {
    return false;
  }
  
  const endDateTime = new Date(bYear, bMonth - 1, bDay, bHour, bMin, 0);
  return now.getTime() > endDateTime.getTime();
}

/**
 * Check if a device is available during the given interval on a specific date,
 * considering all existing active bookings.
 * 
 * Rules:
 * 1. An existing booking on the same date that is NOT returned:
 *    - If overlap: start_new < end_old AND end_new > start_old -> CONFLICT.
 * 2. Rule: "Thiết bị quá giờ mà chưa trả vẫn được coi là đang bận cho đến khi trả."
 *    - If an unreturned booking is overdue, or its date is in the past / today,
 *      the physical device is not back yet.
 */
export function isDeviceAvailable(
  deviceName: string,
  targetDate: string,
  targetStart: string,
  targetEnd: string,
  activeBookings: BookingRecord[],
  excludeBookingId?: string
): { available: boolean; conflictReason?: string; conflictingBooking?: BookingRecord } {
  // If targetStart >= targetEnd, invalid range
  if (targetStart >= targetEnd) {
    return { available: false, conflictReason: 'Thời gian kết thúc phải sau thời gian bắt đầu' };
  }

  for (const b of activeBookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.device !== deviceName) continue;
    if (b.isReturned) continue;

    // Check overdue on past dates or today
    const overdue = isBookingOverdue(b);
    if (overdue) {
      return {
        available: false,
        conflictReason: `Thiết bị đang bị giữ quá giờ bởi ${b.registrantName} (${b.date} ${b.startTime}-${b.endTime}) và chưa trả`,
        conflictingBooking: b
      };
    }

    // Check same date overlap
    if (b.date === targetDate) {
      if (isTimeOverlapping(targetStart, targetEnd, b.startTime, b.endTime)) {
        return {
          available: false,
          conflictReason: `Đã có lịch mượn từ ${b.startTime} đến ${b.endTime} bởi ${b.registrantName} (${b.team})`,
          conflictingBooking: b
        };
      }
    }
  }

  return { available: true };
}

/**
 * Format date string YYYY-MM-DD into display friendly format
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Format timestamp into display friendly format
 */
export function formatDateTimeDisplay(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}
