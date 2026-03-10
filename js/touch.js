// ============================================================
// Touch Controls — Virtual joystick, look area, action buttons
// Enables full gameplay on smartphones & tablets
// ============================================================

const TOUCH_SENSITIVITY = 0.004;

export class TouchControls {
    constructor(player) {
        this.player = player;
        this.enabled = false;
        this.isMobile = this._detectMobile();

        // Joystick state
        this.joystickActive = false;
        this.joystickStartX = 0;
        this.joystickStartY = 0;
        this.joystickDeltaX = 0;
        this.joystickDeltaY = 0;
        this.joystickTouchId = null;

        // Look state
        this.lookTouchId = null;
        this.lookLastX = 0;
        this.lookLastY = 0;

        // Action state
        this.breakHeld = false;
        this.placeHeld = false;
        this.jumpHeld = false;

        // Auto-break timer
        this.breakTimer = 0;

        if (this.isMobile) {
            this.enable();
        }
    }

    _detectMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || ('ontouchstart' in window && window.innerWidth < 1024);
    }

    enable() {
        this.enabled = true;
        this._createUI();
        this._bindTouchEvents();
        // On mobile, we bypass pointer lock — mark player as always locked
        this.player.isLocked = true;
    }

    _createUI() {
        // Container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        document.body.appendChild(this.container);

        // ── Left: Joystick Zone ──
        this.joystickZone = document.createElement('div');
        this.joystickZone.className = 'touch-joystick-zone';
        this.container.appendChild(this.joystickZone);

        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'touch-joystick-base';
        this.joystickBase.style.display = 'none';
        this.joystickZone.appendChild(this.joystickBase);

        this.joystickKnob = document.createElement('div');
        this.joystickKnob.className = 'touch-joystick-knob';
        this.joystickBase.appendChild(this.joystickKnob);

        // ── Right: Look Zone ──
        this.lookZone = document.createElement('div');
        this.lookZone.className = 'touch-look-zone';
        this.container.appendChild(this.lookZone);

        // ── Action Buttons ──
        const btnContainer = document.createElement('div');
        btnContainer.className = 'touch-buttons';
        this.container.appendChild(btnContainer);

        // Jump button
        this.jumpBtn = this._createButton(btnContainer, 'touch-btn-jump', '⬆');
        // Break button
        this.breakBtn = this._createButton(btnContainer, 'touch-btn-break', '⛏');
        // Place button
        this.placeBtn = this._createButton(btnContainer, 'touch-btn-place', '🧱');

        // ── Hotbar navigation arrows ──
        const hotbarNav = document.createElement('div');
        hotbarNav.className = 'touch-hotbar-nav';
        this.container.appendChild(hotbarNav);

        this.prevSlotBtn = this._createButton(hotbarNav, 'touch-btn-prev', '◀');
        this.nextSlotBtn = this._createButton(hotbarNav, 'touch-btn-next', '▶');
    }

    _createButton(parent, className, text) {
        const btn = document.createElement('div');
        btn.className = `touch-btn ${className}`;
        btn.textContent = text;
        parent.appendChild(btn);
        return btn;
    }

    _bindTouchEvents() {
        // Prevent default on the entire game area
        document.addEventListener('touchmove', (e) => {
            if (this.enabled) e.preventDefault();
        }, { passive: false });

        // ── Joystick ──
        this.joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            this.joystickActive = true;
            this.joystickStartX = touch.clientX;
            this.joystickStartY = touch.clientY;
            this.joystickDeltaX = 0;
            this.joystickDeltaY = 0;

            // Show joystick at touch position
            this.joystickBase.style.display = 'block';
            this.joystickBase.style.left = `${touch.clientX - 50}px`;
            this.joystickBase.style.top = `${touch.clientY - 50}px`;
            this.joystickKnob.style.transform = 'translate(0, 0)';
        }, { passive: false });

        this.joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    let dx = touch.clientX - this.joystickStartX;
                    let dy = touch.clientY - this.joystickStartY;

                    // Clamp to max radius
                    const maxR = 45;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxR) {
                        dx = (dx / dist) * maxR;
                        dy = (dy / dist) * maxR;
                    }

                    this.joystickDeltaX = dx / maxR; // -1 to 1
                    this.joystickDeltaY = dy / maxR;

                    this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
                }
            }
        }, { passive: false });

        const joystickEnd = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    this.joystickActive = false;
                    this.joystickTouchId = null;
                    this.joystickDeltaX = 0;
                    this.joystickDeltaY = 0;
                    this.joystickBase.style.display = 'none';
                }
            }
        };
        this.joystickZone.addEventListener('touchend', joystickEnd, { passive: false });
        this.joystickZone.addEventListener('touchcancel', joystickEnd, { passive: false });

        // ── Look Zone ──
        this.lookZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.lookTouchId = touch.identifier;
            this.lookLastX = touch.clientX;
            this.lookLastY = touch.clientY;
        }, { passive: false });

        this.lookZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.lookTouchId) {
                    const dx = touch.clientX - this.lookLastX;
                    const dy = touch.clientY - this.lookLastY;
                    this.lookLastX = touch.clientX;
                    this.lookLastY = touch.clientY;

                    this.player.yaw -= dx * TOUCH_SENSITIVITY;
                    this.player.pitch -= dy * TOUCH_SENSITIVITY;
                    this.player.pitch = Math.max(
                        -Math.PI / 2 + 0.01,
                        Math.min(Math.PI / 2 - 0.01, this.player.pitch)
                    );
                }
            }
        }, { passive: false });

        const lookEnd = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.lookTouchId) {
                    this.lookTouchId = null;
                }
            }
        };
        this.lookZone.addEventListener('touchend', lookEnd, { passive: false });
        this.lookZone.addEventListener('touchcancel', lookEnd, { passive: false });

        // ── Action Buttons ──
        this._bindButton(this.jumpBtn, () => { this.jumpHeld = true; }, () => { this.jumpHeld = false; });
        this._bindButton(this.breakBtn, () => { this.breakHeld = true; }, () => { this.breakHeld = false; });
        this._bindButton(this.placeBtn,
            () => { this.player._placeBlock(); },
            () => {}
        );

        // ── Hotbar Nav ──
        this._bindButton(this.prevSlotBtn, () => {
            this.player.selectedSlot = (this.player.selectedSlot - 1 + 9) % 9;
        }, () => {});
        this._bindButton(this.nextSlotBtn, () => {
            this.player.selectedSlot = (this.player.selectedSlot + 1) % 9;
        }, () => {});
    }

    _bindButton(el, onStart, onEnd) {
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('active');
            onStart();
        }, { passive: false });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('active');
            onEnd();
        }, { passive: false });
        el.addEventListener('touchcancel', (e) => {
            el.classList.remove('active');
            onEnd();
        }, { passive: false });
    }

    // Called every frame from main loop
    update(dt) {
        if (!this.enabled) return;

        // Apply joystick to player keys
        const deadzone = 0.15;
        this.player.keys['KeyW'] = this.joystickDeltaY < -deadzone;
        this.player.keys['KeyS'] = this.joystickDeltaY > deadzone;
        this.player.keys['KeyA'] = this.joystickDeltaX < -deadzone;
        this.player.keys['KeyD'] = this.joystickDeltaX > deadzone;

        // Sprint when joystick is pushed far
        const joyMag = Math.sqrt(this.joystickDeltaX ** 2 + this.joystickDeltaY ** 2);
        this.player.keys['ShiftLeft'] = joyMag > 0.85;

        // Jump
        this.player.keys['Space'] = this.jumpHeld;

        // Continuous breaking
        if (this.breakHeld) {
            this.breakTimer += dt;
            if (this.breakTimer >= 0.25) {
                this.player._breakBlock();
                this.breakTimer = 0;
            }
        } else {
            this.breakTimer = 0;
        }
    }

    dispose() {
        if (this.container) {
            this.container.remove();
        }
        this.enabled = false;
    }
}
