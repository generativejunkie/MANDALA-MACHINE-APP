// Visual Controller (Radar Chart) Logic
export class VisualController {
    constructor(containerId, params, onChange) {
        this.container = document.getElementById(containerId);
        this.params = params; // Array of { name, value, min, max, label }
        this.onChange = onChange;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 240;
        this.height = 240;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = 80;
        this.draggingIndex = -1;

        this.init();
    }

    init() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.maxWidth = '300px';
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        this.canvas.style.touchAction = 'none'; // Prevent scrolling while dragging
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.zIndex = '100'; // Ensure it's on top

        // Integrate logic relies on DOM existence
        this.integrateIntoDOM();

        this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        window.addEventListener('mouseup', this.handleEnd.bind(this));

        this.canvas.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleEnd.bind(this));

        // Initial drawing
        this.draw();
    }

    integrateIntoDOM() {
        const settingsPanel = document.getElementById('settingsPanel');
        const resetBtn = document.getElementById('resetBtn');
        if (settingsPanel && resetBtn) {
            // Cleanup existing sliders
            const controls = settingsPanel.querySelectorAll('.control-group');
            controls.forEach(el => {
                if (el.classList.contains('checkbox-group')) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });

            // Check if canvas already exists and remove it to avoid duplicates
            const existingCanvas = settingsPanel.querySelector('canvas');
            if (existingCanvas) existingCanvas.remove();

            // Insert canvas before the first checkbox group or reset button
            const firstCheckbox = settingsPanel.querySelector('.checkbox-group');
            if (firstCheckbox) {
                settingsPanel.insertBefore(this.canvas, firstCheckbox);
            } else {
                settingsPanel.insertBefore(this.canvas, resetBtn);
            }
        }
    }

    getPointOnCircle(angle, dist) {
        return {
            x: this.centerX + Math.cos(angle - Math.PI / 2) * dist,
            y: this.centerY + Math.sin(angle - Math.PI / 2) * dist
        };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const count = this.params.length;
        const angleStep = (Math.PI * 2) / count;

        // Draw background chart (Axis and outline)
        this.ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const p = this.getPointOnCircle(i * angleStep, this.radius);
            if (i === 0) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = '#e5e5e5';
        this.ctx.stroke();

        // Draw axis lines from center
        this.ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const p = this.getPointOnCircle(i * angleStep, this.radius);
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.stroke();

        // Draw data shape
        this.ctx.beginPath();
        let firstPoint = null;

        this.params.forEach((param, i) => {
            const normalized = (param.value - param.min) / (param.max - param.min);
            const dist = normalized * this.radius;
            const p = this.getPointOnCircle(i * angleStep, dist);

            if (i === 0) {
                this.ctx.moveTo(p.x, p.y);
                firstPoint = p;
            } else {
                this.ctx.lineTo(p.x, p.y);
            }
        });

        if (firstPoint) {
            this.ctx.lineTo(firstPoint.x, firstPoint.y);
        }

        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#0a0a0a';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw handles and labels
        this.params.forEach((param, i) => {
            const normalized = (param.value - param.min) / (param.max - param.min);
            const dist = normalized * this.radius;
            const p = this.getPointOnCircle(i * angleStep, dist);

            // Handle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#0a0a0a';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Label
            const labelDist = this.radius + 25;
            const labelP = this.getPointOnCircle(i * angleStep, labelDist);

            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            let displayVal = param.value;
            if (param.name === 'pillCount') displayVal = Math.round(displayVal);
            else displayVal = displayVal.toFixed(1);

            this.ctx.fillText(param.label, labelP.x, labelP.y - 7);
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.fillText(displayVal, labelP.x, labelP.y + 7);
        });
    }

    handleStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const pos = this.getPos(e);
        this.draggingIndex = this.getClosestHandle(pos);
        if (this.draggingIndex !== -1) {
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMove(e) {
        if (this.draggingIndex === -1) return;
        e.preventDefault();
        e.stopPropagation();

        const pos = this.getPos(e);
        const count = this.params.length;
        const angleStep = (Math.PI * 2) / count;
        const angle = this.draggingIndex * angleStep - Math.PI / 2;

        const dx = pos.x - this.centerX;
        const dy = pos.y - this.centerY;
        const axisX = Math.cos(angle);
        const axisY = Math.sin(angle);

        let dist = dx * axisX + dy * axisY;
        dist = Math.max(0, Math.min(dist, this.radius));

        const normalized = dist / this.radius;
        const param = this.params[this.draggingIndex];
        let newValue = param.min + normalized * (param.max - param.min);

        if (param.name === 'pillCount') {
            newValue = Math.round(newValue);
        }

        if (Math.abs(param.value - newValue) > 0.01) {
            param.value = newValue;
            this.onChange(param.name, newValue);
            this.draw();
        }
    }

    handleEnd(e) {
        if (this.draggingIndex !== -1) {
            this.draggingIndex = -1;
            this.canvas.style.cursor = 'pointer';
        }
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    getClosestHandle(pos) {
        const count = this.params.length;
        const angleStep = (Math.PI * 2) / count;
        let minDist = 40;
        let closestIndex = -1;

        this.params.forEach((param, i) => {
            const normalized = (param.value - param.min) / (param.max - param.min);
            const dist = normalized * this.radius;
            const p = this.getPointOnCircle(i * angleStep, dist);

            const dx = pos.x - p.x;
            const dy = pos.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < minDist) {
                minDist = d;
                closestIndex = i;
            }
        });

        return closestIndex;
    }

    updateParam(name, value) {
        const param = this.params.find(p => p.name === name);
        if (param) {
            param.value = value;
            // GOD SPEED: Trigger callback so external logic (like createPills) fires!
            if (this.onChange) this.onChange(name, value);
            this.draw();
        }
    }
}
