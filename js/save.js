// ============================================================
// SaveManager — 5-slot save/load system using localStorage
// ============================================================

export class SaveManager {
    static SLOT_COUNT = 5;
    static KEY_PREFIX = 'mycraft_save_';

    static getSaveKey(slot) {
        return `${SaveManager.KEY_PREFIX}${slot}`;
    }

    /**
     * Save game state to a slot (0-4)
     * @param {number} slot
     * @param {object} gameData - { player, timeOfDay, modifiedBlocks }
     * @returns {boolean} success
     */
    static save(slot, gameData) {
        const saveData = {
            version: 1,
            date: new Date().toISOString(),
            player: {
                x: Math.round(gameData.player.position.x * 100) / 100,
                y: Math.round(gameData.player.position.y * 100) / 100,
                z: Math.round(gameData.player.position.z * 100) / 100,
                yaw: gameData.player.yaw,
                pitch: gameData.player.pitch,
                selectedSlot: gameData.player.selectedSlot,
            },
            timeOfDay: gameData.timeOfDay,
            modifiedBlocks: gameData.modifiedBlocks,
        };

        try {
            const json = JSON.stringify(saveData);
            localStorage.setItem(SaveManager.getSaveKey(slot), json);
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }

    /**
     * Load game state from a slot (0-4)
     * @param {number} slot
     * @returns {object|null} saveData or null if empty
     */
    static load(slot) {
        try {
            const json = localStorage.getItem(SaveManager.getSaveKey(slot));
            if (!json) return null;
            return JSON.parse(json);
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }

    /**
     * Delete a save slot
     * @param {number} slot
     */
    static delete(slot) {
        localStorage.removeItem(SaveManager.getSaveKey(slot));
    }

    /**
     * Get all 5 slots (null for empty)
     * @returns {Array<object|null>}
     */
    static getAllSlots() {
        const slots = [];
        for (let i = 0; i < SaveManager.SLOT_COUNT; i++) {
            slots.push(SaveManager.load(i));
        }
        return slots;
    }

    /**
     * Check if any save exists
     * @returns {boolean}
     */
    static hasAnySave() {
        for (let i = 0; i < SaveManager.SLOT_COUNT; i++) {
            if (localStorage.getItem(SaveManager.getSaveKey(i))) return true;
        }
        return false;
    }

    /**
     * Format a save date for display
     * @param {string} isoDate
     * @returns {string}
     */
    static formatDate(isoDate) {
        try {
            const d = new Date(isoDate);
            return d.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    }
}
