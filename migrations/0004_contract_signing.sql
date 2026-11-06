-- Гуравласан гэрээг системд гарын үсэг зурж байгуулах (горим: paper — цаасан+скан, touch — дэлгэцэнд зурах, digital — тоон/цахим).
ALTER TABLE contracts ADD COLUMN mode TEXT CHECK (mode IN ('paper', 'touch', 'digital'));
ALTER TABLE contracts ADD COLUMN doc_hash TEXT;            -- гарын үсэг зурсан агуулгын SHA-256 (өөрчлөгдсөнийг илрүүлнэ)
ALTER TABLE organizations ADD COLUMN seal TEXT;            -- байгууллагын тамгын зураг (data URL), дадлага удирдагч оруулна

-- Тал бүрийн гарын үсэг (нэг тал нэг л удаа). proof = HMAC-SHA256(SIGNING_SECRET, doc_hash|party|user|signed_at|method).
CREATE TABLE contract_signatures (
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  party         TEXT NOT NULL CHECK (party IN ('student', 'mentor', 'head')),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  method        TEXT NOT NULL CHECK (method IN ('touch', 'digital')),
  image         TEXT,                                       -- touch: гарын үсгийн PNG (data URL)
  doc_hash      TEXT NOT NULL,
  signed_at     TEXT NOT NULL,
  ip            TEXT,
  user_agent    TEXT,
  proof         TEXT NOT NULL,
  PRIMARY KEY (internship_id, party)
);

-- Тоон гарын үсгийн нэг удаагийн код (и-мэйлээр).
CREATE TABLE sign_codes (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  code_hash     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, internship_id)
);
