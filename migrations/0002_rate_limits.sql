-- Нийтэд нээлттэй endpoint-ийн (нэвтрэх, бүртгүүлэх, нууц үг сэргээх) хүсэлтийн давтамжийн хязгаар.
CREATE TABLE rate_limits (
  key      TEXT PRIMARY KEY,
  hits     INTEGER NOT NULL,
  reset_at TEXT NOT NULL
);
