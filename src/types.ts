export interface AllowedUser {
  name: string;
  email: string;
  team: TeamType;
}

export const TEAM_LIST = [
  '1課',
  '2課-A',
  '2課-B',
  '2課-S',
  '3課',
  'GS',
  '外部',
  'TEAM 1',
  'TEAM 2',
  'TEAM 3'
] as const;

export type TeamType = typeof TEAM_LIST[number];

export const ALLOWED_USERS_LIST: AllowedUser[] = [
  // 外部 (11 members)
  { name: 'LAM THANH TRUC', email: 'truc-l@dymvietnam.net', team: '外部' },
  { name: 'HOANG LE MINH THANH', email: 'thanh-h@dymvietnam.net', team: '外部' },
  { name: 'PHAM BAO THIEN VUONG', email: 'vuong-p@dymvietnam.net', team: '外部' },
  { name: 'LE SONG THAO', email: 'thao-l@dymvietnam.net', team: '外部' },
  { name: 'HUYNH NGUYEN XUAN NHI', email: 'nhi-h@dymvietnam.net', team: '外部' },
  { name: 'PHAN THI YEN NGOC', email: 'ngoc-p@dymvietnam.net', team: '外部' },
  { name: 'NGUYEN NHAT THUY TIEN', email: 'tien-nguyen@dymvietnam.net', team: '外部' },
  { name: 'NGUYEN VO ANH DUY', email: 'duy-nguyen@dymvietnam.net', team: '外部' },
  { name: 'LE LAN VY', email: 'vy-l@dymvietnam.net', team: '外部' },
  { name: 'PHAM PHUONG NHI', email: 'nhi-p@dymvietnam.net', team: '外部' },
  { name: 'NGUYEN THI MY HAN', email: 'han-ng@dymvietnam.net', team: '外部' },

  // 1課 (8 members)
  { name: 'NGUYEN VY THANH TRUC', email: 'truc-n@dymvietnam.net', team: '1課' },
  { name: 'DO MY OANH', email: 'oanh-d@dymvietnam.net', team: '1課' },
  { name: 'LE DO NHAT ANH', email: 'anh-l@dymvietnam.net', team: '1課' },
  { name: 'HOANG THI LUYEN', email: 'luyen-h@dymvietnam.net', team: '1課' },
  { name: 'NGUYEN ANH NGOC', email: 'ngoc-nguyen@dymvietnam.net', team: '1課' },
  { name: 'TRAN NGUYET THI', email: 'thi-t@dymvietnam.net', team: '1課' },
  { name: 'NGUYEN HUYNH THUY AN', email: 'an-n@dymvietnam.net', team: '1課' },
  { name: 'NGUYEN THI NGOC HAN', email: 'han-n@dymvietnam.net', team: '1課' },

  // 2課-A (10 members)
  { name: 'NGUYEN TRA VY', email: 'vy-n@dymvietnam.net', team: '2課-A' },
  { name: 'TRAN NHU NGOC', email: 'ngoc-t@dymvietnam.net', team: '2課-A' },
  { name: 'DUONG CAO QUYNH DUYEN', email: 'duyen-d@dymvietnam.net', team: '2課-A' },
  { name: 'TRINH DUC HUNG', email: 'hung-t@dymvietnam.net', team: '2課-A' },
  { name: 'HUYNH BAO NGAN', email: 'ngan-h@dymvietnam.net', team: '2課-A' },
  { name: 'HUYNH THI NGOC NHI', email: 'nhi-huynh@dymvietnam.net', team: '2課-A' },
  { name: 'TRAN HUU DANH', email: 'danh-t@dymvietnam.net', team: '2課-A' },
  { name: 'DINH NGUYEN HONG HA', email: 'ha-d@dymvietnam.net', team: '2課-A' },
  { name: 'LE BACH HOANG PHUC', email: 'phuc-l@dymvietnam.net', team: '2課-A' },
  { name: 'LO MU MY NHI', email: 'nhi-l@dymvietnam.net', team: '2課-A' },

  // 2課-B (11 members)
  { name: 'NGUYEN DINH QUANG', email: 'quang-n@dymvietnam.net', team: '2課-B' },
  { name: 'PHAN QUANG DAT', email: 'dat-p@dymvietnam.net', team: '2課-B' },
  { name: 'NGUYEN NGOC KHA NGHI', email: 'nghi-n@dymvietnam.net', team: '2課-B' },
  { name: 'NGUYEN THI NGOC NHU', email: 'nhu-n@dymvietnam.net', team: '2課-B' },
  { name: 'TRAN NGOC VY', email: 'vy-t@dymvietnam.net', team: '2課-B' },
  { name: 'HO NGOC MINH', email: 'minh-h@dymvietnam.net', team: '2課-B' },
  { name: 'NGO LE ANH NGOC', email: 'ngoc-ngo@dymvietnam.net', team: '2課-B' },
  { name: 'HUA THUAN PHAT', email: 'phat-h@dymvietnam.net', team: '2課-B' },
  { name: 'NGUYEN THU NGAN', email: 'ngan-nguyen@dymvietnam.net', team: '2課-B' },
  { name: 'TRUONG DAO MINH THU', email: 'thu-truong@dymvietnam.net', team: '2課-B' },
  { name: 'LY THI THANH NGAN', email: 'ngan-ly@dymvietnam.net', team: '2課-B' },

  // 2課-S (6 members)
  { name: 'PHAM PHAN NHU Y', email: 'y-p@dymvietnam.net', team: '2課-S' },
  { name: 'NGO THI THUY HANG', email: 'hang-ngo@dymvietnam.net', team: '2課-S' },
  { name: 'NGUYEN THI THAI HA', email: 'ha-n@dymvietnam.net', team: '2課-S' },
  { name: 'NGUYEN THI LE THU', email: 'thu-n@dymvietnam.net', team: '2課-S' },
  { name: 'HOANG THI LAN ANH', email: 'anh-h@dymvietnam.net', team: '2課-S' },
  { name: 'LUONG PHAN TUAN THAI', email: 'thai-l@dymvietnam.net', team: '2課-S' },

  // 3課 (7 members)
  { name: 'LY TIEU MY', email: 'my-t@dymvietnam.net', team: '3課' },
  { name: 'VO THI MY DUYEN', email: 'duyen-v@dymvietnam.net', team: '3課' },
  { name: 'DUONG THANH HUYEN', email: 'huyen-d@dymvietnam.net', team: '3課' },
  { name: 'NGUYEN MINH PHUONG', email: 'phuong-n@dymvietnam.net', team: '3課' },
  { name: 'HO THI THU YEN', email: 'yen-h@dymvietnam.net', team: '3課' },
  { name: 'HOANG NGOC KHANH VAN', email: 'van-h@dymvietnam.net', team: '3課' },
  { name: 'TRAN YEN NHI', email: 'nhi-t@dymvietnam.net', team: '3課' },

  // GS (3 members)
  { name: 'VU THANH HIEN', email: 'hien-v@dymvietnam.net', team: 'GS' },
  { name: 'TRAN HANH DINH DINH', email: 'dinh-tran@dymvietnam.net', team: 'GS' },
  { name: 'NGUYEN DOAN THUY THUC QUYEN', email: 'quyen-n@dymvietnam.net', team: 'GS' },

  // Leadership / Management
  { name: 'LE QUANG VINH', email: 'le-v@dymvietnam.jp', team: 'GS' },
  { name: 'TRUONG THI HA', email: 'ha-t@dymvietnam.net', team: 'GS' }
];

export const DEVICE_LIST = [
  'CAMERA 1',
  'CAMERA 2',
  'CAMERA 3',
  'CAMERA 4',
  'CAMERA 5',
  'LAPTOP'
] as const;

export type DeviceType = typeof DEVICE_LIST[number];

export const ADMIN_EMAIL = 'y-p@dymvietnam.net';

export interface BookingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  device: DeviceType;
  team: TeamType;
  registrantName: string;
  registrantEmail: string;
  purpose: string;
  isReturned: boolean;
  returnedAt?: string | null;
  returnPhotoUrl?: string | null;
  createdAt: string;
  overdueNotified?: boolean;
}
