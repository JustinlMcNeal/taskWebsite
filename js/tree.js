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
        const isMobile = width < 600;

        // Build hierarchy data
        const rootData = this._buildTreeData();

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g');

        // Zoom (supports pinch-to-zoom and touch panning natively)
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                this._updateLabels(event.transform.k);
            });
        svg.call(this.zoomBehavior);

        // Create tree layout — vertical on mobile, horizontal on desktop
        const root = d3.hierarchy(rootData);
        let treeLayout, linkFn, nodeTransform, initialTransform;

        if (isMobile) {
            // nodeSize guarantees fixed px between siblings — tree can be wider than screen (user pans)
            treeLayout = d3.tree().nodeSize([55, 90]);
            treeLayout(root);
            linkFn = d3.linkVertical().x(d => d.x).y(d => d.y);
            nodeTransform = d => `translate(${d.x},${d.y})`;
            // Center root horizontally
            initialTransform = d3.zoomIdentity.translate(width / 2, 40);
        } else {
            treeLayout = d3.tree().size([height - 80, width - 300]);
            treeLayout(root);
            linkFn = d3.linkHorizontal().x(d => d.y).y(d => d.x);
            nodeTransform = d => `translate(${d.y},${d.x})`;
            initialTransform = d3.zoomIdentity.translate(150, 40);
        }

        svg.call(this.zoomBehavior.transform, initialTransform);

        // Draw links
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', linkFn);

        // Draw nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', nodeTransform);

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

        // Node labels — on mobile: centered above every node, task dots have no label
        node.filter(d => !(isMobile && d.data.isTask))
            .append('text')
            .attr('dy', d => {
                if (isMobile) return -16;
                return d.data.isTask ? -10 : (d.children ? -22 : 4);
            })
            .attr('x', d => {
                if (isMobile) return 0;
                return d.data.isTask ? 10 : (d.children ? 0 : 20);
            })
            .attr('text-anchor', d => {
                if (isMobile) return 'middle';
                return d.data.isTask ? 'start' : (d.children ? 'middle' : 'start');
            })
            // Initial text at scale=1; zoom handler will update dynamically
            .text(d => this._labelText(d.data.name || '', 1))
            .style('font-size', d => d.data.isTask ? '11px' : (d.depth === 0 ? '14px' : '12px'))
            .style('font-weight', d => d.depth === 0 ? '600' : '400');

        // Task count badges on category nodes — hide on mobile (label is already truncated)
        if (!isMobile) {
            node.filter(d => !d.data.isTask && d.data.taskCount > 0)
                .append('text')
                .attr('dy', d => d.children ? -8 : 18)
                .attr('x', d => d.children ? 0 : 20)
                .attr('text-anchor', d => d.children ? 'middle' : 'start')
                .text(d => `${d.data.taskCount} tasks`)
                .style('font-size', '10px')
                .style('fill', 'var(--text-dim)');
        }

        this.svg = svg;
        this._updateLabels(1);
        this._bindControls();
    },

    // Returns display text for a node name given the current zoom scale
    _labelText(name, scale) {
        if (scale < 0.5) return '';
        if (scale < 0.8) return name.length > 5  ? name.substring(0, 4)  + '…' : name;
        if (scale < 1.2) return name.length > 12 ? name.substring(0, 11) + '…' : name;
        if (scale < 1.8) return name.length > 22 ? name.substring(0, 21) + '…' : name;
        return name; // fully zoomed in — show everything
    },

    // Re-labels every visible node text element based on current scale
    _updateLabels(scale) {
        if (!this.svg) return;
        this.svg.selectAll('.node text').each(function(d) {
            if (!d || !d.data) return;
            const name = d.data.name || '';
            const el = d3.select(this);
            // Nodes that were intentionally hidden (task dots on mobile) keep empty text
            if (el.attr('data-hidden') === 'true') return;
            el.text(scale < 0.5 ? '' : TreeView._labelText(name, scale));
        });
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
                const container = document.getElementById('tree-container');
                const w = container.clientWidth || 900;
                const isMob = w < 600;
                const resetTransform = isMob
                    ? d3.zoomIdentity.translate(w / 2, 40)
                    : d3.zoomIdentity.translate(150, 40);
                this.svg.transition().duration(500).call(
                    this.zoomBehavior.transform,
                    resetTransform
                );
            }
        };
    }
};
