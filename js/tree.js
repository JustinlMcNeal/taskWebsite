// ============================================
// TREE VIEW — D3.js zoomable category map
// ============================================
const TreeView = {
    svg: null,
    zoomBehavior: null,

    render() {
        const container = document.getElementById('tree-container');
        container.innerHTML = '';

        const width = container.clientWidth || 900;
        const height = container.clientHeight || 600;

        // Build hierarchy data
        const rootData = this._buildTreeData();

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g');

        // Zoom
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        svg.call(this.zoomBehavior);

        // Create tree layout
        const root = d3.hierarchy(rootData);
        const treeLayout = d3.tree().size([height - 80, width - 300]);
        treeLayout(root);

        // Center the tree
        const initialTransform = d3.zoomIdentity.translate(150, 40);
        svg.call(this.zoomBehavior.transform, initialTransform);

        // Draw links
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            );

        // Draw nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Node circles
        node.append('circle')
            .attr('r', d => d.data.isTask ? 6 : (d.depth === 0 ? 20 : 14))
            .attr('class', d => d.data.isTask ? 'task-dot' : '')
            .style('stroke', d => d.data.color || '#6366f1')
            .style('fill', d => {
                if (d.data.isTask) {
                    const priorityColors = { critical: '#ef4444', high: '#f97316', medium: '#6366f1', low: '#64748b' };
                    return priorityColors[d.data.priority] || '#6366f1';
                }
                return d.depth === 0 ? d.data.color || '#6366f1' : 'var(--bg-elevated)';
            })
            .on('click', (event, d) => {
                if (d.data.isTask && d.data.taskId) {
                    const task = Store.tasks.find(t => t.id === d.data.taskId);
                    if (task) UI.openTaskModal(task);
                }
            });

        // Node labels
        node.append('text')
            .attr('dy', d => d.data.isTask ? -10 : (d.children ? -22 : 4))
            .attr('x', d => d.data.isTask ? 10 : (d.children ? 0 : 20))
            .attr('text-anchor', d => d.data.isTask ? 'start' : (d.children ? 'middle' : 'start'))
            .text(d => {
                const name = d.data.name;
                return name.length > 30 ? name.substring(0, 27) + '...' : name;
            })
            .style('font-size', d => d.data.isTask ? '11px' : (d.depth === 0 ? '14px' : '12px'))
            .style('font-weight', d => d.depth === 0 ? '600' : '400');

        // Task count badges on category nodes
        node.filter(d => !d.data.isTask && d.data.taskCount > 0)
            .append('text')
            .attr('dy', d => d.children ? -8 : 18)
            .attr('x', d => d.children ? 0 : 20)
            .attr('text-anchor', d => d.children ? 'middle' : 'start')
            .text(d => `${d.data.taskCount} tasks`)
            .style('font-size', '10px')
            .style('fill', 'var(--text-dim)');

        this.svg = svg;
        this._bindControls();
    },

    _buildTreeData() {
        const buildNode = (cat) => {
            const children = Store.getChildren(cat.id).map(c => buildNode(c));
            const tasks = Store.tasks
                .filter(t => t.category_id === cat.id && t.status !== 'completed')
                .slice(0, 10)
                .map(t => ({
                    name: t.title,
                    isTask: true,
                    taskId: t.id,
                    priority: t.priority,
                    color: cat.color
                }));

            return {
                name: cat.name,
                color: cat.color,
                categoryId: cat.id,
                taskCount: Store.getTasksByCategory(cat.id).filter(t => t.status !== 'completed').length,
                children: [...children, ...tasks]
            };
        };

        const rootCats = Store.getRootCategories();
        return {
            name: 'My Life',
            color: '#6366f1',
            taskCount: Store.getActiveTasks().length,
            children: rootCats.map(c => buildNode(c))
        };
    },

    _bindControls() {
        document.getElementById('tree-zoom-in').onclick = () => {
            if (this.svg && this.zoomBehavior) {
                this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1.3);
            }
        };
        document.getElementById('tree-zoom-out').onclick = () => {
            if (this.svg && this.zoomBehavior) {
                this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 0.7);
            }
        };
        document.getElementById('tree-reset').onclick = () => {
            if (this.svg && this.zoomBehavior) {
                this.svg.transition().duration(500).call(
                    this.zoomBehavior.transform,
                    d3.zoomIdentity.translate(150, 40)
                );
            }
        };
    }
};
