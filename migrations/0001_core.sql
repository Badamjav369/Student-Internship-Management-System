-- Үндсэн бүтэц (Cloudflare D1 = SQLite). Огноо 'YYYY-MM-DD', цаг ISO 8601 (UTC) текстээр, JSON нь текстээр.
-- Production-д байршуулсны дараах өөрчлөлт бүр 0002_*.sql гэх мэт шинэ файлаар нэмэгдэнэ (энэ файлыг засахгүй).

CREATE TABLE users (
  id              INTEGER PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash   TEXT,                                  -- урилгатай (нууц үг тохируулаагүй) бол NULL
  last_name       TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  phone           TEXT,
  student_code    TEXT UNIQUE,
  program         TEXT,
  organization_id INTEGER REFERENCES organizations(id),
  position        TEXT,
  status          TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  consent_at      TEXT,
  failed_logins   INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Нэг хэрэглэгч олон дүртэй; комиссын гишүүн улирлаар.
CREATE TABLE user_roles (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('student', 'supervisor', 'mentor', 'committee', 'org_rep', 'head', 'admin')),
  semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
  CHECK (role <> 'committee' OR semester_id IS NOT NULL)
);
CREATE UNIQUE INDEX user_roles_key ON user_roles (user_id, role, ifnull(semester_id, 0));

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,                          -- cookie-ийн токены SHA-256
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE password_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);

-- R2-д хадгалсан файлын бүртгэл.
CREATE TABLE files (
  id          INTEGER PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL CHECK (size > 0),
  uploaded_by INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE organizations (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  register_no TEXT NOT NULL UNIQUE,
  field       TEXT,
  address     TEXT,
  email       TEXT,
  phone       TEXT,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE semesters (
  id                 INTEGER PRIMARY KEY,
  academic_year      TEXT NOT NULL CHECK (academic_year GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'),
  season             TEXT NOT NULL CHECK (season IN ('summer', 'winter')),
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  register_from TEXT, register_to TEXT, work_from TEXT, work_to TEXT,
  report_from   TEXT, report_to   TEXT, defense_from TEXT, defense_to TEXT,
  holidays           TEXT NOT NULL DEFAULT '[]',
  reminder_time      TEXT NOT NULL DEFAULT '17:00',
  report_remind_days INTEGER NOT NULL DEFAULT 3 CHECK (report_remind_days >= 0),
  max_missing_days   INTEGER NOT NULL DEFAULT 2 CHECK (max_missing_days >= 0),
  max_file_mb        INTEGER NOT NULL DEFAULT 20 CHECK (max_file_mb > 0),
  committee_method   TEXT NOT NULL DEFAULT 'average' CHECK (committee_method IN ('average', 'consensus')),
  UNIQUE (academic_year, season)
);
-- Нэг л идэвхтэй улирал.
CREATE UNIQUE INDEX semesters_one_active ON semesters (status) WHERE status = 'active';

CREATE TABLE criteria (
  id          INTEGER PRIMARY KEY,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  component   TEXT NOT NULL CHECK (component IN ('org', 'committee')),
  name        TEXT NOT NULL,
  max_score   REAL NOT NULL CHECK (max_score > 0),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE templates (
  id             INTEGER PRIMARY KEY,
  semester_id    INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('guide', 'plan', 'report', 'form')),
  file_id        INTEGER REFERENCES files(id),
  plan_fields    TEXT,                                   -- JSON: [{ key, label, type, required }]
  required_files TEXT                                    -- JSON: [{ key, label, types }]
);
-- Удирдамж, төлөвлөгөө, тайлангийн загвар улиралд нэг л байна; маягт (form) олон байж болно.
CREATE UNIQUE INDEX templates_single ON templates (semester_id, kind) WHERE kind <> 'form';

-- Улирлын оюутан = нэг дадлага.
CREATE TABLE internships (
  id              INTEGER PRIMARY KEY,
  semester_id     INTEGER NOT NULL REFERENCES semesters(id),
  student_id      INTEGER NOT NULL REFERENCES users(id),
  supervisor_id   INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  mentor_id       INTEGER REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'applied', 'contracting', 'planning', 'in_progress',
                    'reporting', 'ready', 'evaluating', 'deferred', 'failed', 'stopped', 'completed')),
  place_status    TEXT CHECK (place_status IN ('unconfirmed', 'confirmed')),
  start_date      TEXT,
  end_date        TEXT,
  days_done       INTEGER NOT NULL DEFAULT 0,
  hours_done      REAL NOT NULL DEFAULT 0,
  missing_days    INTEGER NOT NULL DEFAULT 0,
  late_logbook    INTEGER NOT NULL DEFAULT 0,
  late_report     INTEGER NOT NULL DEFAULT 0,
  grade_total     REAL,                                  -- эцсийн оноо
  grade_mark      TEXT CHECK (grade_mark IN ('0', 'W')), -- хамгаалаагүй бол
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);
CREATE UNIQUE INDEX internships_one_per_semester ON internships (semester_id, student_id);
CREATE INDEX internships_supervisor ON internships (supervisor_id);
CREATE INDEX internships_organization ON internships (organization_id);

-- Байгууллагын дадлагын зар, оюутны өргөдөл.
CREATE TABLE postings (
  id              INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  title           TEXT NOT NULL,
  field           TEXT NOT NULL,
  programs        TEXT NOT NULL DEFAULT '[]',            -- JSON: хөтөлбөрүүд; хоосон бол бүгдэд
  positions       INTEGER NOT NULL CHECK (positions > 0),
  requirements    TEXT NOT NULL,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  apply_deadline  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK (start_date <= end_date)
);
CREATE TABLE applications (
  id            INTEGER PRIMARY KEY,
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  posting_id    INTEGER NOT NULL REFERENCES postings(id),
  cover_letter  TEXT,
  cv_file_id    INTEGER REFERENCES files(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  submitted_at  TEXT NOT NULL,
  decided_at    TEXT
);
CREATE UNIQUE INDEX applications_active ON applications (internship_id, posting_id) WHERE status <> 'cancelled';

-- Оюутны санал болгосон газар / гадаадад хийх дадлагын хүсэлт (нэг үед нэг хүлээгдэж буй).
CREATE TABLE placement_requests (
  id                INTEGER PRIMARY KEY,
  internship_id     INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('own', 'abroad')),
  organization_name TEXT NOT NULL,
  country           TEXT,
  contact           TEXT,
  description       TEXT,
  document_file_id  INTEGER REFERENCES files(id),
  start_date        TEXT,
  end_date          TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'registered', 'cancelled')),
  decision_reason   TEXT,
  decided_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX placement_requests_internship ON placement_requests (internship_id);
CREATE UNIQUE INDEX placement_requests_one_pending ON placement_requests (internship_id) WHERE status = 'pending';

-- Гуравласан гэрээ (дадлага бүрт нэг; оюутан, тэнхмийн эрхлэгч харна): газар тогтмогц 'filled' (системийн загвараар татна), оюутан гарын үсэг тамгатай
-- скан байршуулмагц 'scanned', тэнхмийн эрхлэгч эцсийн баталгаа гаргавал 'approved' (оюутан төлөвлөгөөний шатанд орно) эсвэл шалтгаантай 'returned'.
-- Гурван талын (оюутан, дадлага удирдагч, эрхлэгч) гарын үсэг системээс гадуур (цаасаар). Ирээдүйд тал бүрийн гарын үсгийг ЭНД БИШ тусдаа
-- хүснэгтээр (жишээ нь contract_signatures) нэмнэ — README «Гуравласан гэрээ» хэсгийг үз.
CREATE TABLE contracts (
  internship_id INTEGER PRIMARY KEY REFERENCES internships(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'filled' CHECK (status IN ('filled', 'scanned', 'approved', 'returned')),
  scan_file_id  INTEGER REFERENCES files(id),            -- оюутан байршуулсны дараа л бий болно
  return_reason TEXT,
  voided        INTEGER NOT NULL DEFAULT 0,             -- газар солигдож хүчингүй болсон өмнөх гэрээний тоо
  uploaded_at   TEXT,
  approved_at   TEXT
);

-- Ажлын төлөвлөгөө (нэг үед нэг): fields = {"values": {...}, "tasks": [{from, to, task}]}.
CREATE TABLE work_plans (
  internship_id   INTEGER PRIMARY KEY REFERENCES internships(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'returned')),
  version         INTEGER NOT NULL DEFAULT 1,
  fields          TEXT NOT NULL DEFAULT '{"values":{},"tasks":[]}',
  mentor_comment  TEXT,
  teacher_comment TEXT,
  submitted_at    TEXT,
  decided_at      TEXT
);

-- Дадлагын дэвтэр: өдөр бүр нэг тэмдэглэл; дадлага удирдагч хянасны дараа засахгүй.
CREATE TABLE log_entries (
  internship_id  INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  hours          REAL NOT NULL CHECK (hours >= 0 AND hours <= 24),
  work_done      TEXT NOT NULL,
  saved_at       TEXT NOT NULL,
  reviewed_at    TEXT,
  mentor_comment TEXT,
  PRIMARY KEY (internship_id, date)
);
CREATE TABLE log_files (
  internship_id INTEGER NOT NULL,
  date          TEXT NOT NULL,
  file_id       INTEGER NOT NULL REFERENCES files(id),
  PRIMARY KEY (internship_id, date, file_id),
  FOREIGN KEY (internship_id, date) REFERENCES log_entries(internship_id, date) ON DELETE CASCADE
);

CREATE TABLE reports (
  internship_id INTEGER PRIMARY KEY REFERENCES internships(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted', 'submitted', 'revision', 'accepted', 'overdue')),
  is_open       INTEGER NOT NULL DEFAULT 1,
  deadline      TEXT,
  comment       TEXT,                                    -- удирдагч багшийн санал
  submitted_at  TEXT,
  reviewed_at   TEXT
);
-- Тайлангийн файл: ноорог (draft) ба илгээсэн (submitted) тусдаа.
CREATE TABLE report_files (
  internship_id INTEGER NOT NULL REFERENCES reports(internship_id) ON DELETE CASCADE,
  stage         TEXT NOT NULL DEFAULT 'submitted' CHECK (stage IN ('draft', 'submitted')),
  requirement   TEXT NOT NULL,
  file_id       INTEGER NOT NULL REFERENCES files(id),
  uploaded_at   TEXT NOT NULL,
  PRIMARY KEY (internship_id, stage, requirement)
);

-- Тэнхмийн шийдвэрийн түүх (шалтгаантай).
CREATE TABLE internship_changes (
  id               INTEGER PRIMARY KEY,
  internship_id    INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('direct_placement', 'change_place', 'change_supervisor', 'extend', 'stop', 'expire')),
  reason           TEXT NOT NULL,
  details          TEXT NOT NULL DEFAULT '{}',
  document_file_id INTEGER REFERENCES files(id),
  created_by       INTEGER REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE committees (
  id           INTEGER PRIMARY KEY,
  semester_id  INTEGER NOT NULL REFERENCES semesters(id),
  name         TEXT NOT NULL,
  defense_date TEXT,
  start_time   TEXT,
  format       TEXT NOT NULL DEFAULT 'onsite' CHECK (format IN ('onsite', 'online')),
  location     TEXT,
  online_url   TEXT,
  published_at TEXT,
  UNIQUE (semester_id, name)
);
CREATE TABLE committee_members (
  committee_id INTEGER NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  is_chair     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (committee_id, user_id)
);
CREATE TABLE defense_slots (
  committee_id  INTEGER NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  internship_id INTEGER NOT NULL UNIQUE REFERENCES internships(id) ON DELETE CASCADE,
  order_no      INTEGER NOT NULL CHECK (order_no >= 1),
  slot_time     TEXT,
  PRIMARY KEY (committee_id, order_no)
);

-- Оноо: байгууллагын (дадлага удирдагч оруулна) ба комиссын (гишүүн бүр) оноо шалгуур бүрээр; бүртгэлийн төлөв.
CREATE TABLE score_records (
  internship_id     INTEGER PRIMARY KEY REFERENCES internships(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'finalized', 'closed')),
  org_status        TEXT NOT NULL DEFAULT 'none' CHECK (org_status IN ('none', 'unconfirmed', 'confirmed')),
  committee_status  TEXT NOT NULL DEFAULT 'none' CHECK (committee_status IN ('none', 'unconfirmed', 'confirmed', 'marked')),
  org_letter_file_id INTEGER REFERENCES files(id),
  org_return_reason TEXT,
  mark              TEXT CHECK (mark IN ('0', 'W')),
  mark_reason       TEXT
);
CREATE TABLE org_scores (
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  criterion_id  INTEGER NOT NULL REFERENCES criteria(id),
  value         REAL NOT NULL CHECK (value >= 0),
  PRIMARY KEY (internship_id, criterion_id)
);
CREATE TABLE committee_scores (
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  criterion_id  INTEGER NOT NULL REFERENCES criteria(id),
  member_id     INTEGER NOT NULL REFERENCES users(id),
  value         REAL NOT NULL CHECK (value >= 0),
  PRIMARY KEY (internship_id, criterion_id, member_id)
);

-- Удирдагч багшийн зарлал (улирлын бүх оюутанд).
CREATE TABLE announcements (
  id          INTEGER PRIMARY KEY,
  semester_id INTEGER NOT NULL REFERENCES semesters(id),
  author_id   INTEGER REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  file_id     INTEGER REFERENCES files(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE notifications (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                              -- аль дүрийн мэдэгдэл
  text       TEXT NOT NULL,
  link       TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX notifications_user ON notifications (user_id, role, created_at DESC);
