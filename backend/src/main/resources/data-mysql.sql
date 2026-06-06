INSERT IGNORE INTO users (id, email, full_name, password_hash, role) VALUES
  (1, 'admin@kindergarten.test', 'Admin User', '{noop}password', 'ADMIN'),
  (2, 'teacher@kindergarten.test', 'Ms Lim', '{noop}password', 'TEACHER'),
  (3, 'teacher2@kindergarten.test', 'Mr Kumar', '{noop}password', 'TEACHER'),
  (4, 'teacher3@kindergarten.test', 'Ms Aisyah', '{noop}password', 'TEACHER'),
  (5, 'parent@kindergarten.test', 'Tan Wei Ming', '{noop}password', 'PARENT'),
  (6, 'parent2@kindergarten.test', 'Nur Farah', '{noop}password', 'PARENT'),
  (7, 'parent3@kindergarten.test', 'Lee Mei Ling', '{noop}password', 'PARENT'),
  (8, 'parent4@kindergarten.test', 'Rajesh Nair', '{noop}password', 'PARENT'),
  (9, 'parent5@kindergarten.test', 'Chong Kai Wen', '{noop}password', 'PARENT');

INSERT IGNORE INTO classes (id, name, age_group, teacher_id) VALUES
  (1, 'K1 Sunflower', '4 years old', 2),
  (2, 'K2 Daisy', '5 years old', 3),
  (3, 'K3 Orchid', '6 years old', 4);

INSERT IGNORE INTO parents (id, full_name, phone, email, user_id) VALUES
  (1, 'Tan Wei Ming', '+60123456789', 'parent@kindergarten.test', 5),
  (2, 'Nur Farah', '+60129876543', 'parent2@kindergarten.test', 6),
  (3, 'Lee Mei Ling', '+60175551234', 'parent3@kindergarten.test', 7),
  (4, 'Rajesh Nair', '+60176667890', 'parent4@kindergarten.test', 8),
  (5, 'Chong Kai Wen', '+60173334444', 'parent5@kindergarten.test', 9),
  (6, 'Siti Hajar', '+60192223333', 'siti.hajar@example.com', 6),
  (7, 'Michelle Wong', '+60138889999', 'michelle.wong@example.com', 7);

INSERT IGNORE INTO students (id, full_name, date_of_birth, status, kindergarten_class_id) VALUES
  (1, 'Tan Jia En', '2021-03-18', 'ACTIVE', 2),
  (2, 'Nur Adam', '2022-01-09', 'ACTIVE', 1),
  (3, 'Lee Xin Yi', '2020-11-22', 'ACTIVE', 3),
  (4, 'Aarav Nair', '2021-07-02', 'ACTIVE', 2),
  (5, 'Chong Zi Han', '2022-05-14', 'ACTIVE', 1),
  (6, 'Sofia Farah', '2020-09-30', 'ACTIVE', 3),
  (7, 'Wong Jia Le', '2021-12-05', 'ACTIVE', 2),
  (8, 'Mika Tan', '2022-08-19', 'ACTIVE', 1),
  (9, 'Priya Nair', '2020-04-25', 'ACTIVE', 3),
  (10, 'Lim Yu Xuan', '2021-02-11', 'WITHDRAWN', 2);

INSERT IGNORE INTO student_parent (student_id, parent_id) VALUES
  (1, 1), (2, 2), (2, 6), (3, 3), (3, 7), (4, 4), (5, 5),
  (6, 2), (6, 6), (7, 3), (7, 7), (8, 1), (9, 4), (10, 5);

INSERT IGNORE INTO attendance_records (id, student_id, attendance_date, status, check_in_time, remark) VALUES
  (1, 1, '2026-06-01', 'PRESENT', '08:05:00', ''),
  (2, 2, '2026-06-01', 'LATE', '08:32:00', 'Traffic jam'),
  (3, 3, '2026-06-01', 'ABSENT', NULL, 'Medical leave'),
  (4, 4, '2026-06-01', 'PRESENT', '08:00:00', ''),
  (5, 5, '2026-06-01', 'PRESENT', '07:58:00', ''),
  (6, 6, '2026-06-01', 'PRESENT', '08:10:00', ''),
  (7, 7, '2026-06-01', 'LATE', '08:28:00', ''),
  (8, 8, '2026-06-01', 'PRESENT', '08:02:00', ''),
  (9, 9, '2026-06-01', 'PRESENT', '08:12:00', ''),
  (10, 1, '2026-06-02', 'PRESENT', '08:03:00', ''),
  (11, 2, '2026-06-02', 'PRESENT', '08:08:00', ''),
  (12, 3, '2026-06-02', 'PRESENT', '08:01:00', ''),
  (13, 4, '2026-06-02', 'ABSENT', NULL, 'Family matter'),
  (14, 5, '2026-06-02', 'PRESENT', '08:14:00', ''),
  (15, 6, '2026-06-02', 'LATE', '08:35:00', ''),
  (16, 7, '2026-06-02', 'PRESENT', '08:05:00', ''),
  (17, 8, '2026-06-02', 'PRESENT', '08:04:00', ''),
  (18, 9, '2026-06-02', 'PRESENT', '07:55:00', '');

INSERT IGNORE INTO invoices (id, student_id, billing_month, amount, due_date, status) VALUES
  (1, 1, '2026-06', 650.00, '2026-06-10', 'PENDING'),
  (2, 2, '2026-06', 580.00, '2026-06-10', 'PAID'),
  (3, 3, '2026-06', 720.00, '2026-06-10', 'PENDING'),
  (4, 4, '2026-06', 650.00, '2026-06-10', 'FAILED'),
  (5, 5, '2026-06', 580.00, '2026-06-10', 'PAID'),
  (6, 6, '2026-06', 720.00, '2026-06-10', 'PAID'),
  (7, 7, '2026-06', 650.00, '2026-06-10', 'PENDING'),
  (8, 8, '2026-06', 580.00, '2026-06-10', 'PENDING'),
  (9, 9, '2026-06', 720.00, '2026-06-10', 'PAID'),
  (10, 1, '2026-05', 650.00, '2026-05-10', 'PAID'),
  (11, 2, '2026-05', 580.00, '2026-05-10', 'PAID'),
  (12, 3, '2026-05', 720.00, '2026-05-10', 'PAID'),
  (13, 4, '2026-05', 650.00, '2026-05-10', 'PAID'),
  (14, 7, '2026-05', 650.00, '2026-05-10', 'FAILED');

INSERT IGNORE INTO payments (id, invoice_id, stripe_session_id, amount, status, paid_at) VALUES
  (1, 2, 'seed_paid_session_2', 580.00, 'PAID', '2026-06-03 10:30:00'),
  (2, 5, 'seed_paid_session_5', 580.00, 'PAID', '2026-06-04 09:15:00'),
  (3, 6, 'seed_paid_session_6', 720.00, 'PAID', '2026-06-02 16:45:00'),
  (4, 9, 'seed_paid_session_9', 720.00, 'PAID', '2026-06-01 12:20:00'),
  (5, 4, 'seed_failed_session_4', 650.00, 'FAILED', NULL);
