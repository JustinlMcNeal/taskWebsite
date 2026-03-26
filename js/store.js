// ============================================
// DATA STORE — CRUD operations via Supabase
// ============================================
const Store = {
    categories: [],
    tasks: [],

    // ---------- CATEGORIES ----------
    async fetchCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        this.categories = data || [];
        return this.categories;
    },

    async createCategory({ name, parent_id, color, icon }) {
        const maxOrder = this.categories.reduce((m, c) => Math.max(m, c.sort_order), -1);
        const { data, error } = await supabase
            .from('categories')
            .insert({ name, parent_id: parent_id || null, color, icon, sort_order: maxOrder + 1 })
            .select()
            .single();
        if (error) throw error;
        this.categories.push(data);
        return data;
    },

    async updateCategory(id, updates) {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        const idx = this.categories.findIndex(c => c.id === id);
        if (idx !== -1) this.categories[idx] = data;
        return data;
    },

    async deleteCategory(id) {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);
        if (error) throw error;
        this.categories = this.categories.filter(c => c.id !== id);
    },

    getCategoryPath(categoryId) {
        const parts = [];
        let current = this.categories.find(c => c.id === categoryId);
        while (current) {
            parts.unshift(current.name);
            current = current.parent_id
                ? this.categories.find(c => c.id === current.parent_id)
                : null;
        }
        return parts.join(' › ');
    },

    getRootCategories() {
        return this.categories.filter(c => !c.parent_id);
    },

    getChildren(parentId) {
        return this.categories.filter(c => c.parent_id === parentId);
    },

    getCategoryColor(categoryId) {
        let cat = this.categories.find(c => c.id === categoryId);
        while (cat) {
            if (cat.color && cat.color !== '#6366f1') return cat.color;
            if (!cat.parent_id) return cat.color || '#6366f1';
            cat = this.categories.find(c => c.id === cat.parent_id);
        }
        return '#6366f1';
    },

    // ---------- TASKS ----------
    async fetchTasks() {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        this.tasks = data || [];
        return this.tasks;
    },

    async createTask(task) {
        const { data, error } = await supabase
            .from('tasks')
            .insert(task)
            .select()
            .single();
        if (error) throw error;
        this.tasks.unshift(data);
        return data;
    },

    async updateTask(id, updates) {
        if (updates.status === 'completed' && !updates.completed_at) {
            updates.completed_at = new Date().toISOString();
        }
        if (updates.status && updates.status !== 'completed') {
            updates.completed_at = null;
        }
        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx !== -1) this.tasks[idx] = data;
        return data;
    },

    async deleteTask(id) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
        if (error) throw error;
        this.tasks = this.tasks.filter(t => t.id !== id);
    },

    // ---------- COMPUTED ----------
    getActiveTasks() {
        return this.tasks.filter(t => t.status !== 'completed');
    },

    getTasksByCategory(categoryId) {
        // Include tasks from this category and all descendant categories
        const ids = this._getDescendantIds(categoryId);
        ids.push(categoryId);
        return this.tasks.filter(t => ids.includes(t.category_id));
    },

    _getDescendantIds(parentId) {
        const children = this.categories.filter(c => c.parent_id === parentId);
        let ids = children.map(c => c.id);
        children.forEach(c => {
            ids = ids.concat(this._getDescendantIds(c.id));
        });
        return ids;
    },

    getOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.tasks.filter(t =>
            t.status !== 'completed' && t.due_date && t.due_date < today
        );
    },

    getTodayTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.tasks.filter(t =>
            t.status !== 'completed' &&
            (t.due_date === today || t.scheduled_date === today)
        );
    },

    getWeekTasks() {
        const today = new Date();
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        const todayStr = today.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        return this.tasks.filter(t =>
            t.status !== 'completed' &&
            ((t.due_date && t.due_date >= todayStr && t.due_date <= endStr) ||
             (t.scheduled_date && t.scheduled_date >= todayStr && t.scheduled_date <= endStr))
        );
    },

    getCategoryStats(categoryId) {
        const tasks = this.getTasksByCategory(categoryId);
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
    }
};
