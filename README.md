# Gym Tracker (Simple)

Một ứng dụng web đơn giản để theo dõi bài tập và ghi lại các set được xây dựng với HTML, CSS, JavaScript và Bootstrap.

Files:
- `index.html` - entry single-page app
- `css/styles.css` - custom styles
- `js/app.js` - app logic and localStorage persistence

Mở và chạy:

1. Mở `index.html` trong trình duyệt (kéo thả hoặc mở bằng File > Open).
2. Thêm bài tập ở cột trái.
3. Chọn bài tập để xem chi tiết và dùng "Ghi set" để lưu một set.

Lưu ý:
- Dữ liệu được lưu trong `localStorage` của trình duyệt (không đồng bộ giữa các trình duyệt).
- Ứng dụng hoạt động offline vì chỉ dùng file tĩnh.

Local-only app (no Firebase):

This workspace contains a local-only Gym Tracker. All authentication and storage are stored in the browser's localStorage. There is no backend or cloud sync.

- User accounts: a simple username/password mechanism exists for testing and stores credentials in localStorage under `simple-users` and the active user in `simple-user`.
- Per-user data: exercises are stored per user using key `gym-tracker-data-v1-{username}`.

IndexedDB storage:

- The app now uses IndexedDB (via `js/db.js`) to persist per-user data in a small client database. This is more robust than localStorage and supports larger data.
- On first run the app will attempt to migrate data from the previous localStorage key into IndexedDB automatically.

Security note: this local auth is not secure and is intended for prototyping only. Do not use it for production or sensitive data.

Muốn mình mở rộng thêm tính năng nào? Ví dụ: export/import CSV, biểu đồ tiến bộ, hay multi-day workout templates.
