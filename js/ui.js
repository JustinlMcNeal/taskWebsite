// ============================================
// UI — Rendering & DOM interactions
// ============================================
const UI = {
    currentView: 'dashboard',

    // ---------- INIT ----------
    init() {
        this.bindNavigation();
        this.bindTaskModal();
        this.bindCategoryModal();
        this.bindFilters();
        this.bindSidebarToggle();
    },

    // ---------- NAVIGATION ----------
    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
                this._closeSidebar();
            });
        });
    },

    switchView(view) {
        this.currentView = view;
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Switch view panels
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`view-${view}`);
        if (viewEl) viewEl.classList.add('active');

        // Update title
        const titles = { dashboard: 'Dashboard', tasks: 'All Tasks', calendar: 'Calendar', tree: 'Category Map' };
        document.getElementById('view-title').textContent = titles[view] || view;

        // Trigger view-specific renders
        if (view === 'calendar') CalendarView.render();
        if (view === 'tree') TreeView.render();
        if (view === 'dashboard') this.renderDashboard();
        if (view === 'tasks') this.renderTasksList();
    },

    // ---------- SIDEBAR TOGGLE ----------
    bindSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            this._toggleSidebar();
        });
        backdrop.addEventListener('click', () => {
            this._closeSidebar();
        });
    },

    _isMobile() {
        return window.innerWidth < 768;
    },

    _toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        const isOpen = sidebar.classList.contains('translate-x-0');
        if (isOpen) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.remove('active');
        } else {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            backdrop.classList.add('active');
        }
    },

    _closeSidebar() {
        if (!this._isMobile()) return;
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.remove('active');
    },

    // ---------- TOAST ----------
    toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    // ---------- RENDER SIDEBAR CATEGORIES ----------
    renderCategoryTree() {
        const tree = document.getElementById('category-tree');
        tree.innerHTML = '';
        this._renderCatLevel(tree, null);
        lucide.createIcons();

        // Also populate filter dropdown & form dropdowns
        this._populateCategorySelects();
    },

    _renderCatLevel(container, parentId) {
        const cats = parentId
            ? Store.getChildren(parentId)
            : Store.getRootCategories();

        cats.forEach(cat => {
            const li = document.createElement('li');
            const item = document.createElement('div');
            item.className = 'cat-item';
            item.innerHTML = `
                <span class="cat-dot" style="background:${cat.color}"></span>
                <span class="cat-name">${this._escapeHtml(cat.name)}</span>
                <span class="cat-count">${Store.getTasksByCategory(cat.id).filter(t => t.status !== 'completed').length}</span>
                <button class="cat-edit" data-cat-id="${cat.id}" title="Edit"><i data-lucide="pencil"></i></button>
            `;
            item.querySelector('.cat-name').addEventListener('click', () => {
                document.getElementById('filter-category').value = cat.id;
                this.switchView('tasks');
                this.renderTasksList();
                this._closeSidebar();
            });
            item.querySelector('.cat-edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCategoryModal(cat);
            });
            li.appendChild(item);

            // Children
            const children = Store.getChildren(cat.id);
            if (children.length > 0) {
                const childUl = document.createElement('ul');
                childUl.className = 'cat-children';
                this._renderCatLevel(childUl, cat.id);
                li.appendChild(childUl);
            }

            container.appendChild(li);
        });
    },

    _populateCategorySelects() {
        const selects = [
            document.getElementById('filter-category'),
            document.getElementById('task-category-input'),
            document.getElementById('cat-parent-input')
        ];

        selects.forEach(select => {
            const currentVal = select.value;
            const firstOpt = select.querySelector('option');
            select.innerHTML = '';
            if (firstOpt) select.appendChild(firstOpt);

            this._addCatOptions(select, null, 0);
            select.value = currentVal;
        });
    },

    _addCatOptions(select, parentId, depth) {
        const cats = parentId ? Store.getChildren(parentId) : Store.getRootCategories();
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = '  '.repeat(depth) + cat.name;
            select.appendChild(opt);
            this._addCatOptions(select, cat.id, depth + 1);
        });
    },

    // ---------- DASHBOARD ----------
    renderDashboard() {
        const overdue = Store.getOverdueTasks();
        const today = Store.getTodayTasks();
        const week = Store.getWeekTasks();
        const active = Store.getActiveTasks();

        document.getElementById('stat-overdue').textContent = overdue.length;
        document.getElementById('stat-today').textContent = today.length;
        document.getElementById('stat-week').textContent = week.length;
        document.getElementById('stat-total').textContent = active.length;

        // Urgent panel
        const urgentEl = document.getElementById('dashboard-urgent');
        const urgentTasks = [...overdue, ...today].filter((t, i, arr) =>
            arr.findIndex(x => x.id === t.id) === i
        );
        urgentEl.innerHTML = urgentTasks.length
            ? urgentTasks.map(t => this._taskCardHTML(t)).join('')
            : '<div class="empty-state"><p>No urgent tasks. Nice!</p></div>';

        // Upcoming panel
        const upcomingEl = document.getElementById('dashboard-upcoming');
        const upcoming = week.filter(t => !urgentTasks.find(u => u.id === t.id));
        upcomingEl.innerHTML = upcoming.length
            ? upcoming.map(t => this._taskCardHTML(t)).join('')
            : '<div class="empty-state"><p>Nothing else this week.</p></div>';

        // Progress panel
        const progressEl = document.getElementById('dashboard-progress');
        const rootCats = Store.getRootCategories();
        progressEl.innerHTML = rootCats.map(cat => {
            const stats = Store.getCategoryStats(cat.id);
            return `
                <div class="progress-item">
                    <span class="progress-dot" style="background:${cat.color}"></span>
                    <div class="progress-info">
                        <div class="progress-label">
                            <span>${this._escapeHtml(cat.name)}</span>
                            <span>${stats.completed}/${stats.total} (${stats.percent}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width:${stats.percent}%;background:${cat.color}"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this._bindTaskCardClicks();
        lucide.createIcons();
    },

    // ---------- TASKS LIST ----------
    renderTasksList() {
        const container = document.getElementById('tasks-list');
        let tasks = [...Store.tasks];

        // Apply filters
        const catFilter = document.getElementById('filter-category').value;
        const prioFilter = document.getElementById('filter-priority').value;
        const statusFilter = document.getElementById('filter-status').value;
        const search = document.getElementById('task-search').value.toLowerCase();

        if (catFilter) {
            const ids = Store._getDescendantIds(catFilter);
            ids.push(catFilter);
            tasks = tasks.filter(t => ids.includes(t.category_id));
        }
        if (prioFilter) tasks = tasks.filter(t => t.priority === prioFilter);
        if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);
        if (search) tasks = tasks.filter(t =>
            t.title.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search))
        );

        // Sort: overdue first, then by due date, then created
        const today = new Date().toISOString().split('T')[0];
        tasks.sort((a, b) => {
            const aOverdue = a.due_date && a.due_date < today && a.status !== 'completed' ? 0 : 1;
            const bOverdue = b.due_date && b.due_date < today && b.status !== 'completed' ? 0 : 1;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;

            const aCompleted = a.status === 'completed' ? 1 : 0;
            const bCompleted = b.status === 'completed' ? 1 : 0;
            if (aCompleted !== bCompleted) return aCompleted - bCompleted;

            const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return (prioOrder[a.priority] || 2) - (prioOrder[b.priority] || 2);
        });

        container.innerHTML = tasks.length
            ? tasks.map(t => this._taskCardHTML(t)).join('')
            : '<div class="empty-state"><p>No tasks match your filters.</p></div>';

        this._bindTaskCardClicks();
        lucide.createIcons();
    },

    // ---------- TASK CARD HTML ----------
    _taskCardHTML(task) {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.due_date && task.due_date < today && task.status !== 'completed';
        const isCompleted = task.status === 'completed';
        const catPath = task.category_id ? Store.getCategoryPath(task.category_id) : '';
        const catColor = task.category_id ? Store.getCategoryColor(task.category_id) : '#6366f1';

        let metaHtml = '';
        if (catPath) {
            metaHtml += `<span class="task-meta-item"><span class="cat-dot" style="background:${catColor};width:8px;height:8px;border-radius:50%;display:inline-block"></span> ${this._escapeHtml(catPath)}</span>`;
        }
        if (task.due_date) {
            metaHtml += `<span class="task-meta-item"><i data-lucide="calendar"></i> ${this._formatDate(task.due_date)}</span>`;
        }
        if (isOverdue) {
            metaHtml += `<span class="badge badge-overdue">OVERDUE</span>`;
        }

        return `
            <div class="task-card ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}" data-priority="${task.priority}">
                <div class="task-checkbox ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}"></div>
                <div class="task-info">
                    <div class="task-name">${this._escapeHtml(task.title)}</div>
                    <div class="task-meta">${metaHtml}</div>
                </div>
                <span class="badge badge-${task.priority}">${task.priority}</span>
            </div>
        `;
    },

    _bindTaskCardClicks() {
        // Checkbox clicks
        document.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = cb.dataset.taskId;
                const task = Store.tasks.find(t => t.id === id);
                if (!task) return;
                const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
                await Store.updateTask(id, { status: newStatus });
                this.refresh();
                this.toast(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
            });
        });

        // Card clicks (open editor)
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.task-checkbox')) return;
                const id = card.dataset.taskId;
                const task = Store.tasks.find(t => t.id === id);
                if (task) this.openTaskModal(task);
            });
        });
    },

    // ---------- TASK MODAL ----------
    bindTaskModal() {
        document.getElementById('btn-add-task').addEventListener('click', () => this.openTaskModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('btn-cancel-task').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeTaskModal();
        });

        // Recurring toggle
        document.getElementById('task-recurring-input').addEventListener('change', (e) => {
            document.getElementById('recurrence-group').classList.toggle('hidden', !e.target.checked);
        });

        // Form submit
        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._saveTask();
        });

        // Delete
        document.getElementById('btn-delete-task').addEventListener('click', async () => {
            const id = document.getElementById('task-id').value;
            if (!id) return;
            if (!confirm('Delete this task?')) return;
            await Store.deleteTask(id);
            this.closeTaskModal();
            this.refresh();
            this.toast('Task deleted');
        });
    },

    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('btn-delete-task');

        if (task) {
            title.textContent = 'Edit Task';
            deleteBtn.classList.remove('hidden');
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title-input').value = task.title;
            document.getElementById('task-desc-input').value = task.description || '';
            document.getElementById('task-category-input').value = task.category_id || '';
            document.getElementById('task-priority-input').value = task.priority;
            document.getElementById('task-status-input').value = task.status;
            document.getElementById('task-due-input').value = task.due_date || '';
            document.getElementById('task-scheduled-input').value = task.scheduled_date || '';
            document.getElementById('task-recurring-input').checked = task.is_recurring;
            document.getElementById('task-recurrence-input').value = task.recurrence || 'daily';
            document.getElementById('recurrence-group').classList.toggle('hidden', !task.is_recurring);
        } else {
            title.textContent = 'New Task';
            deleteBtn.classList.add('hidden');
            document.getElementById('task-form').reset();
            document.getElementById('task-id').value = '';
            document.getElementById('recurrence-group').classList.add('hidden');
        }

        modal.classList.remove('hidden');
        document.getElementById('task-title-input').focus();
    },

    closeTaskModal() {
        document.getElementById('task-modal').classList.add('hidden');
    },

    async _saveTask() {
        const id = document.getElementById('task-id').value;
        const task = {
            title: document.getElementById('task-title-input').value.trim(),
            description: document.getElementById('task-desc-input').value.trim(),
            category_id: document.getElementById('task-category-input').value || null,
            priority: document.getElementById('task-priority-input').value,
            status: document.getElementById('task-status-input').value,
            due_date: document.getElementById('task-due-input').value || null,
            scheduled_date: document.getElementById('task-scheduled-input').value || null,
            is_recurring: document.getElementById('task-recurring-input').checked,
            recurrence: document.getElementById('task-recurring-input').checked
                ? document.getElementById('task-recurrence-input').value
                : null
        };

        if (!task.title) return;

        if (id) {
            await Store.updateTask(id, task);
            this.toast('Task updated');
        } else {
            await Store.createTask(task);
            this.toast('Task created');
        }
        this.closeTaskModal();
        this.refresh();
    },

    // ---------- CATEGORY MODAL ----------
    bindCategoryModal() {
        document.getElementById('btn-add-category').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('cat-modal-close').addEventListener('click', () => this.closeCategoryModal());
        document.getElementById('btn-cancel-cat').addEventListener('click', () => this.closeCategoryModal());
        document.getElementById('category-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeCategoryModal();
        });

        document.getElementById('category-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._saveCategory();
        });

        document.getElementById('btn-delete-cat').addEventListener('click', async () => {
            const id = document.getElementById('cat-id').value;
            if (!id) return;
            if (!confirm('Delete this category and all its subcategories?')) return;
            await Store.deleteCategory(id);
            this.closeCategoryModal();
            await Store.fetchCategories();
            this.refresh();
            this.toast('Category deleted');
        });
    },

    openCategoryModal(cat = null) {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('cat-modal-title');
        const deleteBtn = document.getElementById('btn-delete-cat');

        if (cat) {
            title.textContent = 'Edit Category';
            deleteBtn.classList.remove('hidden');
            document.getElementById('cat-id').value = cat.id;
            document.getElementById('cat-name-input').value = cat.name;
            document.getElementById('cat-parent-input').value = cat.parent_id || '';
            document.getElementById('cat-color-input').value = cat.color || '#6366f1';
        } else {
            title.textContent = 'New Category';
            deleteBtn.classList.add('hidden');
            document.getElementById('category-form').reset();
            document.getElementById('cat-id').value = '';
        }

        modal.classList.remove('hidden');
        document.getElementById('cat-name-input').focus();
    },

    closeCategoryModal() {
        document.getElementById('category-modal').classList.add('hidden');
    },

    async _saveCategory() {
        const id = document.getElementById('cat-id').value;
        const cat = {
            name: document.getElementById('cat-name-input').value.trim(),
            parent_id: document.getElementById('cat-parent-input').value || null,
            color: document.getElementById('cat-color-input').value
        };

        if (!cat.name) return;

        if (id) {
            await Store.updateCategory(id, cat);
            this.toast('Category updated');
        } else {
            await Store.createCategory(cat);
            this.toast('Category created');
        }
        this.closeCategoryModal();
        await Store.fetchCategories();
        this.refresh();
    },

    // ---------- FILTERS ----------
    bindFilters() {
        ['filter-category', 'filter-priority', 'filter-status'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.renderTasksList());
        });
        document.getElementById('task-search').addEventListener('input', () => this.renderTasksList());
    },

    // ---------- REFRESH ----------
    refresh() {
        this.renderCategoryTree();
        if (this.currentView === 'dashboard') this.renderDashboard();
        if (this.currentView === 'tasks') this.renderTasksList();
        if (this.currentView === 'calendar') CalendarView.render();
        if (this.currentView === 'tree') TreeView.render();
    },

    // ---------- HELPERS ----------
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
};
