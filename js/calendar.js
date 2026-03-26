// ============================================
// CALENDAR VIEW — FullCalendar integration
// ============================================
const CalendarView = {
    calendar: null,

    render() {
        const container = document.getElementById('calendar-container');
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this._getEvents());
            return;
        }

        container.innerHTML = '';
        this.calendar = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            },
            height: '100%',
            events: this._getEvents(),
            editable: true,
            droppable: true,
            eventClick: (info) => {
                const task = Store.tasks.find(t => t.id === info.event.id);
                if (task) UI.openTaskModal(task);
            },
            eventDrop: async (info) => {
                const task = Store.tasks.find(t => t.id === info.event.id);
                if (!task) return;
                const newDate = info.event.start.toISOString().split('T')[0];
                // If task had a scheduled_date, update that; otherwise update due_date
                const field = task.scheduled_date ? 'scheduled_date' : 'due_date';
                await Store.updateTask(task.id, { [field]: newDate });
                UI.toast('Task rescheduled');
                UI.refresh();
            },
            dayMaxEvents: 4,
            nowIndicator: true,
            businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }
        });
        this.calendar.render();
    },

    _getEvents() {
        return Store.tasks
            .filter(t => t.due_date || t.scheduled_date)
            .map(t => {
                const color = t.category_id ? Store.getCategoryColor(t.category_id) : '#6366f1';
                const priorityColors = { critical: '#ef4444', high: '#f97316', medium: color, low: '#64748b' };
                return {
                    id: t.id,
                    title: t.title,
                    start: t.scheduled_date || t.due_date,
                    backgroundColor: priorityColors[t.priority] || color,
                    borderColor: 'transparent',
                    textColor: '#fff',
                    classNames: t.status === 'completed' ? ['fc-event-completed'] : [],
                    extendedProps: { task: t }
                };
            });
    }
};
