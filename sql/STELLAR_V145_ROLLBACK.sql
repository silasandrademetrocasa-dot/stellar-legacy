-- No V145 DDL or data mutation exists to reverse.
-- Restore V144.1 application code; do not erase saves, receipts, or IndexedDB.
BEGIN READ ONLY;
SELECT 'V145 sem alterações de esquema; rollback é somente do código da aplicação.' AS rollback;
COMMIT;
