-- Файлын агуулга D1-д (R2 идэвхжүүлээгүй үед). Файлыг 1 МБ-ийн хэсэг болгон хадгална (D1 нэг мөрөнд ≤2 МБ).
CREATE TABLE file_chunks (
  storage_key TEXT NOT NULL,
  idx         INTEGER NOT NULL,
  data        BLOB NOT NULL,
  PRIMARY KEY (storage_key, idx)
);
