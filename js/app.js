// ============================================
// APP ENTRY POINT — Bootstrap everything
// ============================================
(async function init() {
    // Register service worker (PWA + push notifications)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
        });
    }

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

        // Initialize push notifications UI
        Notifications.init();

        // Initialize icons
        lucide.createIcons();

    } catch (err) {
        console.error('Failed to initialize TaskTracker:', err);
        UI.toast('Failed to connect to database. Check console.', 'error');
    }
})();
