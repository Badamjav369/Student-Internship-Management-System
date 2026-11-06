-- Улирал бүрт: ажлын төлөвлөгөө, дадлагын дэвтэр шаардах эсэх (байгууллагын ачааллыг багасгахын тулд админ улирал үүсгэхдээ сонгоно).
ALTER TABLE semesters ADD COLUMN plan_enabled    INTEGER NOT NULL DEFAULT 1 CHECK (plan_enabled IN (0, 1));
ALTER TABLE semesters ADD COLUMN logbook_enabled INTEGER NOT NULL DEFAULT 1 CHECK (logbook_enabled IN (0, 1));
