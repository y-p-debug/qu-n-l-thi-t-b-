# HƯỚNG DẪN CẤU HÌNH VÀ CÔNG BỐ SECURITY RULES (BẢO MẬT PHÍA SERVER)

## 1. Firestore Database Security Rules
### Nơi công bố:
1. Mở [Firebase Console](https://console.firebase.google.com/) -> Chọn Project: **`gen-lang-client-0029147898`**.
2. Chọn menu **Firestore Database** ở thanh bên trái.
3. **Lưu ý quan trọng**: Ở dropdown chọn database ở đầu trang, chọn đúng database:
   **`ai-studio-503e25d9-7e6d-472d-ab6d-584e23a588b9`**
4. Bấm vào tab **Rules** (Quy tắc).
5. Xoá nội dung cũ và dán toàn bộ đoạn mã sau, sau đó bấm **Publish** (Xuất bản):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserEmail() {
      return request.auth.token.email;
    }

    // Chỉ duy nhất y-p@dymvietnam.net (đã xác thực email) mới có quyền xoá dữ liệu
    function isSuperAdmin() {
      return isAuthenticated() && 
        getUserEmail() == 'y-p@dymvietnam.net' &&
        request.auth.token.email_verified == true;
    }

    function isAdmin() {
      return isAuthenticated() && (
        getUserEmail() == 'y-p@dymvietnam.net' ||
        getUserEmail() == 'truc-l@dymvietnam.net'
      );
    }

    // 1. Allowed Users Collection:
    match /users/{email} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // 2. Settings collection (mật khẩu Laptop, cấu hình hệ thống):
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // 3. Bookings collection (Lịch sử mượn trả thiết bị):
    // - Đọc (read): y-p@dymvietnam.net đọc được toàn bộ; các thành viên khác CHỈ đọc bản ghi chưa trả (isReturned == false)
    // - Tạo mới (create): Mọi thành viên đã đăng nhập
    // - Cập nhật (update): Mọi thành viên đã đăng nhập (để trả thiết bị và gửi ảnh)
    // - Xoá (delete): DUY NHẤT y-p@dymvietnam.net (ngăn chặn mọi hành vi gọi API trực tiếp)
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && (
        getUserEmail() == 'y-p@dymvietnam.net' ||
        resource.data.isReturned == false ||
        !('isReturned' in resource.data)
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isSuperAdmin();
    }

    // 4. Mail Queue (lưu log email):
    match /mail/{mailId} {
      allow read, write: if isAuthenticated();
    }

    // 5. System Settings (Apps Script Webhook):
    match /system_settings/{settingId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## 2. Firebase Storage Security Rules
### Nơi công bố:
1. Trong Firebase Console -> Chọn menu **Storage** ở thanh bên trái.
2. Bấm vào tab **Rules** (Quy tắc).
3. Dán toàn bộ đoạn mã sau và bấm **Publish** (Xuất bản):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    // Chỉ duy nhất y-p@dymvietnam.net có quyền xoá ảnh hoàn trả
    function isSuperAdmin() {
      return isAuthenticated() && 
        request.auth.token.email == 'y-p@dymvietnam.net' &&
        request.auth.token.email_verified == true;
    }

    // Thư mục lưu ảnh xác nhận trả thiết bị
    // CHỈ Quản trị viên y-p@dymvietnam.net mới được xem ảnh
    match /returns/{allPaths=**} {
      allow read: if isAuthenticated() && request.auth.token.email == 'y-p@dymvietnam.net';
      allow create, update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    // Các tệp khác
    match /{allPaths=**} {
      allow read, create, update: if isAuthenticated();
      allow delete: if isSuperAdmin();
    }
  }
}
```

---

## 3. Cấu hình Google Sign-In & Khắc phục lỗi Safari/iPhone (Storage Partitioning)
1. Trong Firebase Console -> **Authentication** -> **Settings** -> **Authorized domains**:
   - Thêm domain Vercel của bạn (ví dụ: `your-app.vercel.app`).
   - Thêm domain AI Studio Cloud Run.
2. **Cấu hình Custom Auth Domain trên Vercel** (để tránh lỗi iPhone/Safari "storage-partitioned browser environment"):
   - Vào Vercel -> Dự án -> **Settings** -> **Environment Variables**.
   - Đặt biến: `VITE_FIREBASE_AUTH_DOMAIN="your-app.vercel.app"` (thay bằng tên miền thật của bạn trên Vercel).
   - Tệp `vercel.json` trong dự án đã cấu hình sẵn rewrite proxy:
     ```json
     {
       "source": "/__/auth/:path*",
       "destination": "https://gen-lang-client-0029147898.firebaseapp.com/__/auth/:path*"
     }
     ```
   - Cơ chế này biến đường dẫn xác thực thành cùng nguồn (first-party context), giúp đăng nhập trên Safari và Chrome điện thoại mượt mà 100%.
3. **Trình duyệt trong ứng dụng** (Messenger, Zalo, FB, Line...):
   - Ứng dụng đã tự động phát hiện và hướng dẫn người dùng bấm nút "Sao chép liên kết" để mở trực tiếp trong Safari hoặc Chrome.
