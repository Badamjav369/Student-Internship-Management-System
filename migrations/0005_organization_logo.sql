-- Байгууллагын лого: files хүснэгтийн мөр (R2-д хадгална), байгууллагын төлөөлөгч өөрөө оруулна.
ALTER TABLE organizations ADD COLUMN logo_file_id INTEGER REFERENCES files(id);
