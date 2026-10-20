/**
 * CẤU TRÚC BẢN ĐỒ VĂN PHÒNG DYM VIETNAM
 * Tái hiện 100% tỷ lệ, vị trí tương đối và màu sắc theo ảnh Google Sheet.
 * Grid: 40 cột (0..39) x 22 hàng (0..21)
 */

export interface MapCellConfig {
  id: string;
  label: string;
  subLabel?: string;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  isCabinet?: boolean;
  isSeat?: boolean;
  isHeader?: boolean;
  isWall?: boolean;
  walkable?: boolean;
  verticalText?: boolean;
}

export const MAP_DIMENSIONS = {
  cols: 40,
  rows: 22,
  cellWidth: 76,
  cellHeight: 46,
};

// Vị trí tủ thiết bị: Col 3, Row 7 (ngay bên phải thanh tiêu đề VINH, hàng đầu lối đi)
export const CABINET_LOCATION = {
  id: 'cabinet-tu',
  label: 'TỦ',
  col: 3,
  row: 7,
  colSpan: 1,
  rowSpan: 1,
};

export const OFFICE_CELLS: MapCellConfig[] = [
  // ===================== TIÊU ĐỀ CỬA KÍNH (Row 5) =====================
  {
    id: 'window-side',
    label: '窓ガラス側 • Phía cửa kính (Window side)',
    col: 1,
    row: 5,
    colSpan: 38,
    rowSpan: 1,
    bgColor: '#E0F2FE',
    textColor: '#0369A1',
    borderColor: '#7DD3FC',
    walkable: false,
  },

  // ===================== KHU VỰC TRÊN BÊN PHẢI (Rows 0-4) =====================
  // Cụm 1: THANH, MY HAN, XUAN NHI
  { id: 'seat-thanh', label: 'THANH', col: 30, row: 0, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'seat-my-han', label: 'MY HAN', col: 30, row: 1, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'seat-xuan-nhi', label: 'XUAN NHI', col: 30, row: 2, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'top-green-1-3', label: '', col: 30, row: 3, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },
  { id: 'top-green-1-4', label: '', col: 30, row: 4, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },

  // Cụm 2: 菅野, LAM TRUC, VUONG, SONG THAO, LAN VY
  { id: 'top-sugano', label: '菅野', col: 33, row: 0, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isHeader: true, walkable: false },
  { id: 'seat-lam-truc', label: 'LAM TRUC', col: 33, row: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'seat-vuong', label: 'VUONG', col: 34, row: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'seat-song-thao', label: 'SONG THAO', col: 33, row: 2, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'seat-lan-vy', label: 'LAN VY', col: 34, row: 2, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'top-green-2-3', label: '', col: 33, row: 3, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },
  { id: 'top-green-2-4', label: '', col: 33, row: 4, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },

  // Cụm 3: YEN NGOC, TIEN
  { id: 'seat-yen-ngoc', label: 'YEN NGOC', col: 37, row: 1, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'top-green-3-2', label: '', col: 37, row: 2, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },
  { id: 'seat-tien', label: 'TIEN', col: 37, row: 3, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'top-green-3-4', label: '', col: 37, row: 4, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },

  // ===================== HÀNG GIỮA (Middle Row - Rows 7-12) =====================
  // --- KHỐI VINH ---
  { id: 'header-vinh', label: 'VINH', col: 1, row: 7, colSpan: 2, rowSpan: 1, bgColor: '#546E7A', textColor: '#FFFFFF', isHeader: true, walkable: false },
  { id: 'seat-y', label: 'Y (2課-S)', col: 1, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-dat', label: 'DAT(2課-B)', col: 2, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-lan-anh', label: 'LAN ANH', col: 1, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thuan-phat', label: 'THUAN PHAT', col: 2, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-tuan-thai', label: 'TUAN THAI', col: 1, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-anh-ngoc', label: 'ANH NGOC', col: 2, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thuy-hang', label: 'THUY HANG', col: 1, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-kha-nghi', label: 'KHA NGHI', col: 2, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-vinh-empty-5-1', label: '', col: 1, row: 12, bgColor: '#E2E8F0', walkable: false },
  { id: 'seat-ngoc-nhu', label: 'NGOC NHU', col: 2, row: 12, bgColor: '#D2E3EA', isSeat: true, walkable: false },

  // --- Ô TỦ (Col 3, Row 7) ---
  {
    id: 'cabinet-tu',
    label: 'TỦ',
    subLabel: 'Thiết bị ở đây',
    col: 3,
    row: 7,
    colSpan: 1,
    rowSpan: 1,
    bgColor: '#FEF2F2',
    textColor: '#DC2626',
    borderColor: '#DC2626',
    borderWidth: 2,
    isCabinet: true,
    walkable: false,
  },

  // --- KHỐI HA ---
  { id: 'header-ha', label: 'HA', col: 5, row: 7, colSpan: 2, rowSpan: 1, bgColor: '#546E7A', textColor: '#FFFFFF', isHeader: true, walkable: false },
  { id: 'seat-vy-a', label: 'VY(2課-A)', col: 5, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-truc-1', label: 'TRUC(1課)', col: 6, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-duc-hung', label: 'DUC HUNG', col: 5, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-nguyet-thi', label: 'NGUYET THI', col: 6, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-bao-ngan', label: 'BAO NGAN', col: 5, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-nhat-anh', label: 'NHAT ANH', col: 6, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-my-nhi', label: 'MY NHI', col: 5, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thi-luyen', label: 'THI LUYEN', col: 6, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-nhu-ngoc', label: 'NHU NGOC', col: 5, row: 12, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-anh-ngoc-ha', label: 'ÁNH NGOC', col: 6, row: 12, bgColor: '#D2E3EA', isSeat: true, walkable: false },

  // --- KHỐI KHÔNG TÊN ---
  { id: 'seat-thuy-an', label: 'THUY AN', col: 8, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-khanh-van', label: 'KHANH VAN', col: 9, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-my-oanh', label: 'MY OANH', col: 8, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-my-duyen', label: 'MY DUYEN', col: 9, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-tuyet-nhi', label: 'TUYET NHI', col: 8, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thu-yen', label: 'THU YEN', col: 9, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-ngoc-han', label: 'NGOC HAN', col: 8, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'no-name-empty-1', label: '', col: 9, row: 11, bgColor: '#D2E3EA', walkable: false },
  { id: 'no-name-empty-2', label: '', col: 8, row: 12, bgColor: '#D2E3EA', walkable: false },
  { id: 'no-name-empty-3', label: '', col: 9, row: 12, bgColor: '#D2E3EA', walkable: false },

  // --- KHỐI 松本 ---
  { id: 'header-matsumoto', label: '松本', col: 11, row: 7, colSpan: 2, rowSpan: 1, bgColor: '#546E7A', textColor: '#FFFFFF', isHeader: true, walkable: false },
  { id: 'seat-my-3', label: 'MY (3課)', col: 11, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-dinh-dinh', label: 'DINH DINH', col: 12, row: 8, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-yen-nhi', label: 'YEN NHI', col: 11, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-hien-gs', label: 'HIEN (GS)', col: 12, row: 9, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thanh-huyen', label: 'THANH HUYEN', col: 11, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thuc-quyen', label: 'THUC QUYEN', col: 12, row: 10, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-minh-phuong', label: 'MINH PHUONG', col: 11, row: 11, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-dinh-ha', label: 'DINH HA', col: 12, row: 11, bgColor: '#D2E3EA', textColor: '#03045E', isSeat: true, walkable: false },

  // --- CỘT Ô HỒNG (Col 14, Rows 8-12) ---
  { id: 'pink-col-8', label: '', col: 14, row: 8, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },
  { id: 'pink-col-9', label: '', col: 14, row: 9, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },
  { id: 'pink-col-10', label: '', col: 14, row: 10, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },
  { id: 'pink-col-11', label: '', col: 14, row: 11, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },
  { id: 'pink-col-12', label: '', col: 14, row: 12, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },

  // --- THANH ĐEN TRÊN ĐỈNH (Row 6, Cols 16-28) ---
  { id: 'black-bar-top', label: '', col: 16, row: 6, colSpan: 12, rowSpan: 1, bgColor: '#0F172A', walkable: false },

  // --- CỘT ĐEN VÀ HỒNG (Cols 16-17) ---
  { id: 'block-black-pink-1', label: '', col: 16, row: 7, bgColor: '#0F172A', walkable: false },
  { id: 'block-black-pink-2', label: '', col: 17, row: 7, bgColor: '#94A3B8', walkable: false },
  { id: 'block-black-pink-3', label: '', col: 16, row: 8, rowSpan: 4, bgColor: '#0F172A', walkable: false },
  { id: 'block-black-pink-4', label: '', col: 17, row: 8, rowSpan: 4, bgColor: '#FCE7F3', borderColor: '#F472B6', walkable: false },

  // --- 3 CỤM Ô VÀNG CAM (2x4 mỗi cụm) ---
  // Cụm 1
  { id: 'yellow-cluster-1', label: '', col: 19, row: 8, colSpan: 2, rowSpan: 4, bgColor: '#FDE68A', borderColor: '#F59E0B', walkable: false },
  // Cụm 2
  { id: 'yellow-cluster-2', label: '', col: 22, row: 8, colSpan: 2, rowSpan: 4, bgColor: '#FDE68A', borderColor: '#F59E0B', walkable: false },
  // Cụm 3
  { id: 'yellow-cluster-3', label: '', col: 25, row: 8, colSpan: 2, rowSpan: 4, bgColor: '#FDE68A', borderColor: '#F59E0B', walkable: false },

  // --- CỤM XANH LÁ CÓ 2 THANH ĐEN (Cols 28-29) ---
  { id: 'green-black-top', label: '', col: 28, row: 7, colSpan: 2, rowSpan: 1, bgColor: '#0F172A', walkable: false },
  { id: 'green-black-body', label: '', col: 28, row: 8, colSpan: 2, rowSpan: 3, bgColor: '#DCFCE7', borderColor: '#86EFAC', walkable: false },
  { id: 'green-black-bot', label: '', col: 28, row: 11, colSpan: 2, rowSpan: 1, bgColor: '#0F172A', walkable: false },

  // --- LỐI ĐI RỘNG DẢI KEM (Cols 30-31, Rows 6-21) ---
  // Walkable corridor marked with special soft cream tone
  { id: 'wide-cream-aisle', label: '', col: 30, row: 6, colSpan: 2, rowSpan: 16, bgColor: '#FFFBEB', borderColor: '#FEF3C7', walkable: true },

  // --- CỤM BÀN XANH LÁ GIỮA (Cols 33-34) ---
  { id: 'mid-green-empty-1', label: '', col: 33, row: 7, colSpan: 2, rowSpan: 3, bgColor: '#DCFCE7', borderColor: '#86EFAC', walkable: false },
  { id: 'seat-anh-duy', label: 'ANH DUY', col: 33, row: 10, bgColor: '#DCFCE7', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'mid-green-empty-2', label: '', col: 34, row: 10, bgColor: '#DCFCE7', walkable: false },
  { id: 'mid-green-empty-3', label: '', col: 33, row: 11, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', walkable: false },

  // --- CỤM BÀN XANH LÁ GÓC PHẢI (Cols 37-38) ---
  { id: 'right-green-empty-1', label: '', col: 37, row: 7, colSpan: 2, rowSpan: 1, bgColor: '#DCFCE7', borderColor: '#86EFAC', walkable: false },
  { id: 'right-green-empty-2', label: '', col: 37, row: 8, bgColor: '#DCFCE7', walkable: false },
  { id: 'seat-phuong-nhi', label: 'PHUONG NHI', col: 38, row: 8, bgColor: '#86EFAC', textColor: '#03045E', isSeat: true, walkable: false },
  { id: 'right-green-empty-3', label: '', col: 37, row: 9, colSpan: 2, rowSpan: 3, bgColor: '#DCFCE7', borderColor: '#86EFAC', walkable: false },

  // ===================== HÀNG DƯỚI (Rows 14-21) =====================
  // --- KHỐI NGOC VY / THU NGAN (Cols 1-2) ---
  { id: 'seat-ngoc-vy', label: 'NGOC VY', col: 1, row: 14, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thu-ngan', label: 'THU NGAN', col: 2, row: 14, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thai-ha', label: 'THAI HA', col: 1, row: 15, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-minh-thu', label: 'MINH THU', col: 2, row: 15, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-le-thu', label: 'LE THU', col: 1, row: 16, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-ngoc-minh', label: 'NGOC MINH', col: 2, row: 16, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-thanh-ngan', label: 'THANH NGAN', col: 1, row: 17, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'seat-dinh-quang', label: 'DINH QUANG', col: 2, row: 17, bgColor: '#D2E3EA', isSeat: true, walkable: false },

  // --- KHỐI HOANG PHUC (Cols 3-4) ---
  { id: 'seat-hoang-phuc', label: 'HOANG PHUC', col: 3, row: 14, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'hp-empty-1', label: '', col: 4, row: 14, bgColor: '#D2E3EA', walkable: false },
  { id: 'seat-huu-danh', label: 'HUU DANH', col: 3, row: 15, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'hp-empty-2', label: '', col: 4, row: 15, bgColor: '#D2E3EA', walkable: false },
  { id: 'seat-hong-ha', label: 'HONG HA', col: 3, row: 16, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'hp-empty-3', label: '', col: 4, row: 16, bgColor: '#D2E3EA', walkable: false },
  { id: 'seat-ngoc-nhi', label: 'NGOC NHI', col: 3, row: 17, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'hp-empty-4', label: '', col: 4, row: 17, bgColor: '#D2E3EA', walkable: false },
  { id: 'seat-quynh-duyen', label: 'QUYNH DUYEN', col: 3, row: 18, bgColor: '#D2E3EA', isSeat: true, walkable: false },
  { id: 'hp-empty-5', label: '', col: 4, row: 18, bgColor: '#D2E3EA', walkable: false },
  { id: 'hp-empty-bot-1', label: '', col: 3, row: 19, colSpan: 2, rowSpan: 3, bgColor: '#D2E3EA', walkable: false },

  // --- TIỆN ÍCH & PHÒNG HỌP (Cols 6-10) ---
  // Copy machine & Admin cabinet
  {
    id: 'cabinet-copy',
    label: 'コピー機＆管理部のキャビネット',
    col: 6,
    row: 14,
    colSpan: 5,
    rowSpan: 1,
    bgColor: '#FCE7F3',
    textColor: '#831843',
    borderColor: '#F472B6',
    borderWidth: 1.5,
    walkable: false,
  },
  // Black barrier under copy machine
  { id: 'mtg-black-1', label: '', col: 6, row: 15, colSpan: 2, rowSpan: 1, bgColor: '#0F172A', walkable: false },
  // PANTRY
  {
    id: 'pantry',
    label: 'PANTRY',
    col: 6,
    row: 16,
    colSpan: 2,
    rowSpan: 5,
    bgColor: '#FEF3C7',
    textColor: '#DC2626',
    borderColor: '#F59E0B',
    borderWidth: 2,
    verticalText: true,
    walkable: false,
  },
  // MTG C
  {
    id: 'mtg-c',
    label: 'MTGルーム\n(MTG C)',
    col: 8,
    row: 15,
    colSpan: 3,
    rowSpan: 2,
    bgColor: '#DBEAFE',
    textColor: '#1E3A8A',
    borderColor: '#3B82F6',
    borderWidth: 2,
    walkable: false,
  },
  // Server room
  {
    id: 'server-room',
    label: 'サーバールーム\nSERVER',
    col: 8,
    row: 17,
    colSpan: 3,
    rowSpan: 1,
    bgColor: '#F8FAFC',
    textColor: '#0F172A',
    borderColor: '#64748B',
    borderWidth: 1.5,
    walkable: false,
  },
  // MTG B
  {
    id: 'mtg-b',
    label: 'MTGルーム\n(MTG B)',
    col: 8,
    row: 18,
    colSpan: 3,
    rowSpan: 3,
    bgColor: '#DBEAFE',
    textColor: '#1E3A8A',
    borderColor: '#3B82F6',
    borderWidth: 2,
    walkable: false,
  },
  // Exit cạnh MTG
  {
    id: 'exit-left',
    label: '入口-EXIT',
    col: 11,
    row: 15,
    colSpan: 2,
    rowSpan: 2,
    bgColor: '#DCFCE7',
    textColor: '#DC2626',
    borderColor: '#15803D',
    borderWidth: 2,
    verticalText: true,
    walkable: false,
  },

  // --- PHÒNG PHỎNG VẤN, GHẾ, CỬA CHÍNH (Rows 14-15) ---
  { id: 'booth-pv4', label: '面接ブース\n(PV4)', col: 14, row: 14, colSpan: 1, rowSpan: 2, bgColor: '#DBEAFE', textColor: '#1E3A8A', borderColor: '#3B82F6', borderWidth: 2, walkable: false },
  { id: 'chair-left', label: '椅子', col: 15, row: 15, colSpan: 2, rowSpan: 1, bgColor: '#F1F5F9', textColor: '#64748B', walkable: false },
  { id: 'logo-box', label: 'LOGO', col: 18, row: 13, colSpan: 3, rowSpan: 1, bgColor: '#DCFCE7', textColor: '#15803D', borderColor: '#22C55E', borderWidth: 1.5, walkable: false },
  { id: 'main-entrance', label: '入口-EXIT', col: 18, row: 15, colSpan: 3, rowSpan: 1, bgColor: '#FFFFFF', textColor: '#DC2626', borderColor: '#000000', borderWidth: 2, walkable: false },
  { id: 'chair-right', label: '椅子', col: 22, row: 15, colSpan: 2, rowSpan: 1, bgColor: '#F1F5F9', textColor: '#64748B', walkable: false },
  { id: 'booth-pv3', label: '面接ブース\n(PV3)', col: 25, row: 14, colSpan: 3, rowSpan: 2, bgColor: '#DBEAFE', textColor: '#1E3A8A', borderColor: '#3B82F6', borderWidth: 2, walkable: false },
  { id: 'booth-pv2', label: '面接ブース\n(PV2)', col: 28, row: 14, colSpan: 3, rowSpan: 2, bgColor: '#DBEAFE', textColor: '#1E3A8A', borderColor: '#3B82F6', borderWidth: 2, walkable: false },
  { id: 'booth-pv1', label: '面接ブース\n(PV1)', col: 31, row: 14, colSpan: 3, rowSpan: 2, bgColor: '#DBEAFE', textColor: '#1E3A8A', borderColor: '#3B82F6', borderWidth: 2, walkable: false },

  // Cửa Exit bên phải
  { id: 'exit-right', label: '入口-EXIT', col: 35, row: 16, colSpan: 1, rowSpan: 2, bgColor: '#DCFCE7', textColor: '#DC2626', borderColor: '#15803D', borderWidth: 2, verticalText: true, walkable: false },

  // Góc dưới phải: Khối đen + Phòng nghỉ 休憩室
  { id: 'bot-right-black', label: '', col: 36, row: 18, colSpan: 3, rowSpan: 2, bgColor: '#0F172A', walkable: false },
  { id: 'rest-room', label: '休憩室', col: 36, row: 20, colSpan: 3, rowSpan: 2, bgColor: '#FCE7F3', textColor: '#831843', borderColor: '#F472B6', borderWidth: 2, walkable: false },
];
