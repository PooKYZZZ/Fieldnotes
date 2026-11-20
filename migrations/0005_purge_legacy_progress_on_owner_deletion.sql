CREATE TRIGGER purge_legacy_progress_after_owner_deletion
AFTER DELETE ON "user"
WHEN OLD.role = 'admin'
BEGIN
  DELETE FROM legacy_progress;
END;
