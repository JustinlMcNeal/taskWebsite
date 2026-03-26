// ============================================
// APP ENTRY POINT — Bootstrap everything
// ============================================
(async function init() {
    try {
        // Load data from Supabase
        await Promise.all([
            Store.fetchCategories(),
            Store.fetchTasks()
        ]);

        // Initialize UI
        UI.init();
        UI.renderCategoryTree();
        UI.renderDashboard();

        // Initialize icons
        lucide.createIcons();

    } catch (err) {
        console.error('Failed to initialize TaskTracker:', err);
        UI.toast('Failed to connect to database. Check console.', 'error');
    }
})();
