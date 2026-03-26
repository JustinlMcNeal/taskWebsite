-- TaskTracker Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORIES TABLE (supports unlimited nesting)
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast tree lookups
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed')),
    due_date DATE DEFAULT NULL,
    scheduled_date DATE DEFAULT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for common queries
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ============================================
-- ROW LEVEL SECURITY (public access for now)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (single-user app)
CREATE POLICY "Allow all on categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
INSERT INTO categories (name, parent_id, color, icon, sort_order) VALUES
    ('Work',     NULL, '#3b82f6', 'briefcase', 0),
    ('Business', NULL, '#10b981', 'building',  1),
    ('School',   NULL, '#f59e0b', 'graduation-cap', 2);
