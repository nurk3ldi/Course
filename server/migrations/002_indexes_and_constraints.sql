CREATE INDEX IF NOT EXISTS idx_orders_user_course ON orders(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student ON student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'student_assignments_status_chk'
    ) THEN
        ALTER TABLE student_assignments
            ADD CONSTRAINT student_assignments_status_chk
            CHECK (status IN ('submitted', 'checking', 'accepted', 'revision', 'rejected'));
    END IF;
END $$;
