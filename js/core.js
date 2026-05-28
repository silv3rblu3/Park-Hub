// js/core.js

document.addEventListener('DOMContentLoaded', () => { CoreSystem.init(); });

const CoreSystem = {
    activeApp: 'home',

    init: function() {
        this.bindGlobalEvents();
        this.applySavedTheme();
        this.routeToApp('home');
    },

    bindGlobalEvents: function() {
        // 1. Bento Menu Toggle
        const bentoTrigger = document.getElementById('bento-trigger');
        const bentoMenu = document.getElementById('bento-menu');
        
        bentoTrigger.addEventListener('click', (e) => { e.stopPropagation(); bentoMenu.classList.toggle('hidden'); });
        document.addEventListener('click', (e) => {
            if (!bentoMenu.classList.contains('hidden') && !bentoTrigger.contains(e.target) && !bentoMenu.contains(e.target)) bentoMenu.classList.add('hidden');
        });

        document.querySelectorAll('.bento-item').forEach(item => {
            item.addEventListener('click', () => {
                this.routeToApp(item.getAttribute('data-app'));
                bentoMenu.classList.add('hidden');
            });
        });

        // 2. Universal Global Search
        const searchInput = document.getElementById('global-search');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const searchableElements = document.querySelectorAll('#app-container table tbody tr, #app-container .searchable-card');
            
            searchableElements.forEach(el => {
                const text = el.innerText.toLowerCase();
                el.style.display = text.includes(term) ? '' : 'none';
            });
        });

        // 3. Settings Modal & Theme Editor
        const settingsModal = document.getElementById('settings-modal');
        document.getElementById('global-settings-trigger').addEventListener('click', () => { this.populateThemeEditor(); settingsModal.showModal(); });
        document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.close());

        // --- NEW SETTINGS TABS LOGIC ---
        const settingsTabs = document.querySelectorAll('.settings-tab');
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Strip active styling from all tabs
                settingsTabs.forEach(t => { 
                    t.classList.remove('btn-primary'); 
                    t.classList.add('btn-outline'); 
                });
                
                // Forcing display style instead of relying on classes
                document.getElementById('settings-view-theme').style.display = 'none';
                document.getElementById('settings-view-sync').style.display = 'none';
                
                // Add active styling to the clicked tab
                e.target.classList.remove('btn-outline');
                e.target.classList.add('btn-primary');
                
                // Show the targeted content
                const targetId = 'settings-view-' + e.target.getAttribute('data-target');
                document.getElementById(targetId).style.display = 'block';
            });
        });

        document.getElementById('global-theme-select').addEventListener('change', (e) => this.loadThemeIntoEditor(e.target.value));
        
        document.getElementById('new-theme-btn').addEventListener('click', () => {
            document.getElementById('theme-edit-id').value = 'theme_' + Date.now();
            document.getElementById('theme-edit-name').value = '';
            ['bg', 'surface', 'text-main', 'text-muted', 'accent', 'accent-hover', 'border', 'danger'].forEach(id => document.getElementById(`theme-edit-${id}`).value = '#000000');
        });

        document.getElementById('save-theme-btn').addEventListener('click', () => {
            const name = document.getElementById('theme-edit-name').value.trim();
            if(!name) return NotificationSystem.show("Theme requires a name", "error");
            
            const newTheme = {
                id: document.getElementById('theme-edit-id').value || 'theme_' + Date.now(),
                name: name,
                colors: {
                    bgBase: document.getElementById('theme-edit-bg').value,
                    bgSurface: document.getElementById('theme-edit-surface').value,
                    textPrimary: document.getElementById('theme-edit-text-main').value,
                    textSecondary: document.getElementById('theme-edit-text-muted').value,
                    accentPrimary: document.getElementById('theme-edit-accent').value,
                    accentHover: document.getElementById('theme-edit-accent-hover').value,
                    border: document.getElementById('theme-edit-border').value,
                    danger: document.getElementById('theme-edit-danger').value
                }
            };

            let state = StateManager.loadGlobalState();
            const idx = state.themes.findIndex(t => t.id === newTheme.id);
            if (idx > -1) state.themes[idx] = newTheme;
            else state.themes.push(newTheme);
            
            StateManager.saveGlobalState(state);
            this.populateThemeEditor(newTheme.id);
            NotificationSystem.show("Theme Saved", "success");
        });

        document.getElementById('apply-theme-btn').addEventListener('click', () => {
            const id = document.getElementById('global-theme-select').value;
            let state = StateManager.loadGlobalState();
            state.activeThemeId = id;
            StateManager.saveGlobalState(state);
            this.applySavedTheme();
            NotificationSystem.show("Theme Applied", "success");
        });

        document.getElementById('delete-theme-btn').addEventListener('click', () => {
            const id = document.getElementById('theme-edit-id').value;
            let state = StateManager.loadGlobalState();
            if (state.themes.length <= 1) return NotificationSystem.show("Cannot delete last theme", "error");
            if (state.activeThemeId === id) return NotificationSystem.show("Cannot delete active theme. Switch first.", "error");
            
            state.themes = state.themes.filter(t => t.id !== id);
            StateManager.saveGlobalState(state);
            this.populateThemeEditor(state.themes[0].id);
            NotificationSystem.show("Theme Deleted", "success");
        });

        // 4. Advanced Data Sync & Routing
        document.getElementById('btn-export-data').addEventListener('click', () => {
            const target = document.getElementById('sync-target-select').value;
            StateManager.exportData(target);
        });

        const mergeInput = document.getElementById('file-import-merge');
        const replaceInput = document.getElementById('file-import-replace');

        document.getElementById('btn-import-merge').addEventListener('click', () => mergeInput.click());
        document.getElementById('btn-import-replace').addEventListener('click', () => replaceInput.click());

        mergeInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const target = document.getElementById('sync-target-select').value;
                const targetName = document.getElementById('sync-target-select').options[document.getElementById('sync-target-select').selectedIndex].text;
                
                const confirmed = await DialogSystem.confirm("Merge Data?", `This will safely sync the uploaded file with your current ${targetName} data. Existing items will be updated and new items added without creating duplicates. Proceed?`);
                if (confirmed) StateManager.importData(e.target.files[0], target, 'merge');
                e.target.value = ''; // reset the input
            }
        });

        replaceInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const target = document.getElementById('sync-target-select').value;
                const targetName = document.getElementById('sync-target-select').options[document.getElementById('sync-target-select').selectedIndex].text;
                
                const confirmed = await DialogSystem.confirm("⚠️ OVERWRITE Data?", `This will COMPLETELY WIPE AND REPLACE your current ${targetName} data with the uploaded file. This cannot be undone. Proceed?`);
                if (confirmed) StateManager.importData(e.target.files[0], target, 'replace');
                e.target.value = ''; // reset the input
            }
        });
    },

    populateThemeEditor: function(selectId = null) {
        const state = StateManager.loadGlobalState();
        const select = document.getElementById('global-theme-select');
        select.innerHTML = '';
        state.themes.forEach(t => { select.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
        
        const idToLoad = selectId || state.activeThemeId;
        select.value = idToLoad;
        this.loadThemeIntoEditor(idToLoad);
    },

    loadThemeIntoEditor: function(themeId) {
        const theme = StateManager.loadGlobalState().themes.find(t => t.id === themeId);
        if(!theme) return;
        document.getElementById('theme-edit-id').value = theme.id;
        document.getElementById('theme-edit-name').value = theme.name;
        document.getElementById('theme-edit-bg').value = theme.colors.bgBase;
        document.getElementById('theme-edit-surface').value = theme.colors.bgSurface;
        document.getElementById('theme-edit-text-main').value = theme.colors.textPrimary;
        document.getElementById('theme-edit-text-muted').value = theme.colors.textSecondary;
        document.getElementById('theme-edit-accent').value = theme.colors.accentPrimary;
        document.getElementById('theme-edit-accent-hover').value = theme.colors.accentHover;
        document.getElementById('theme-edit-border').value = theme.colors.border;
        document.getElementById('theme-edit-danger').value = theme.colors.danger;
    },

    applySavedTheme: function() {
        const state = StateManager.loadGlobalState();
        const theme = state.themes.find(t => t.id === state.activeThemeId) || state.themes[0];
        const root = document.documentElement;
        
        root.style.setProperty('--bg-base', theme.colors.bgBase);
        root.style.setProperty('--bg-surface', theme.colors.bgSurface);
        root.style.setProperty('--text-primary', theme.colors.textPrimary);
        root.style.setProperty('--text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--accent-primary', theme.colors.accentPrimary);
        root.style.setProperty('--accent-hover', theme.colors.accentHover);
        root.style.setProperty('--border-color', theme.colors.border);
        root.style.setProperty('--danger-color', theme.colors.danger);
    },

    generateHomeDashboard: function() {
        const state = StateManager.loadGlobalState();
        
        // Calculate Inventory Glance
        let lowInvCount = 0;
        if (state.apps.inventory && state.apps.inventory.items) {
            state.apps.inventory.items.forEach(item => {
                let qty = 0;
                (state.apps.inventory.transactions || []).filter(t => t.sku === item.sku).forEach(t => {
                    if(t.type === 'Stock In') qty += Number(t.quantity);
                    else if(t.type === 'Stock Out') qty -= Number(t.quantity);
                    else if(t.type === 'Audit Correction') qty = Number(t.quantity);
                });
                if(qty <= item.reorderLevel) lowInvCount++;
            });
        }

        // Calculate Fleet Glance
        let vehiclesNeedingRepair = 0;
        let vehiclesNeedingInsp = 0;
        let totalVehicles = state.apps.fleet?.vehicles?.length || 0;
        
        if (state.apps.fleet && state.apps.fleet.vehicles) {
            state.apps.fleet.vehicles.forEach(v => {
                const vSrv = (state.apps.fleet.services || []).filter(s => s.vehicleId === v.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                const vInsp = (state.apps.fleet.inspections || []).filter(i => i.vehicleId === v.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                
                let fails = false;
                let needsInsp = true;

                if (vInsp.length > 0) {
                    const lastI = vInsp[0];
                    const dDiff = Math.ceil((new Date(lastI.date).getTime() + 30*24*60*60*1000 - new Date()) / (1000*60*60*24));
                    if (dDiff >= 0) needsInsp = false;

                    if (lastI.needsWork && lastI.results) {
                        for (const [item, res] of Object.entries(lastI.results)) {
                            if (res === 'Fail' && !vSrv.some(s => s.task === item && new Date(s.date) >= new Date(lastI.date))) {
                                fails = true;
                            }
                        }
                    }
                }
                
                if (fails) vehiclesNeedingRepair++;
                if (needsInsp) vehiclesNeedingInsp++;
            });
        }

        // Calculate First Aid Glance
        let firstAidKits = state.apps.firstAid?.categories?.length || 0;

        // Calculate Parts Glance
        let lowParts = 0;
        let criticalOut = 0;
        if (state.apps.parts && state.apps.parts.partsCatalog) {
            state.apps.parts.partsCatalog.forEach(p => {
                if (Number(p.qty) <= Number(p.minQty)) lowParts++;
                if (p.isCritical && Number(p.qty) === 0) criticalOut++;
            });
        }

        return `
            <div style="padding: 2rem;">
                <h1 style="margin-bottom: 20px;">System Overview</h1>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    
                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('inventory')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">📦</span> Inventory</h3>
                        ${lowInvCount > 0 
                            ? `<p><strong style="color: var(--danger-color); font-size: 1.2rem;">${lowInvCount}</strong> items at or below reorder level.</p>`
                            : `<p style="color: var(--text-secondary);">All stock levels are optimal.</p>`}
                    </div>

                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('fleet')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">🛻</span> Fleet Status</h3>
                        <p style="margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;"><strong>${totalVehicles}</strong> Registered Vehicles</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            ${vehiclesNeedingRepair > 0 ? `<p><strong style="color: var(--danger-color); font-size: 1.1rem;">${vehiclesNeedingRepair}</strong> vehicle(s) need repair.</p>` : ''}
                            ${vehiclesNeedingInsp > 0 ? `<p><strong style="color: #f39c12; font-size: 1.1rem;">${vehiclesNeedingInsp}</strong> vehicle(s) need inspection.</p>` : ''}
                            ${(vehiclesNeedingRepair === 0 && vehiclesNeedingInsp === 0) ? `<p style="color: var(--text-secondary);">All vehicles fully operational.</p>` : ''}
                        </div>
                    </div>

                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('winterization')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">❄️</span> Winter Ops</h3>
                        <p style="color: var(--text-secondary);">Manage seasonal facility transitions and generate checklist reports.</p>
                    </div>

                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('firstAid')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">🩹</span> First Aid</h3>
                        <p><strong>${firstAidKits}</strong> Configured Areas/Kits</p>
                        <p style="color: var(--text-secondary);">Click to calculate required supplies or generate reorder lists.</p>
                    </div>

                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('parts')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">⚙️</span> Replacement Parts</h3>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            ${criticalOut > 0 ? `<div style="background: var(--danger-color); color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; margin-bottom: 5px; text-align: center;">⚠️ ${criticalOut} CRITICAL PART(S) AT ZERO STOCK</div>` : ''}
                            ${lowParts > 0 ? `<p><strong style="color: #f39c12; font-size: 1.1rem;">${lowParts}</strong> parts at or below reorder minimum.</p>` : ''}
                            ${(criticalOut === 0 && lowParts === 0) ? `<p style="color: var(--text-secondary);">All shop stock levels are healthy.</p>` : ''}
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    routeToApp: function(appName) {
        this.activeApp = appName;
        const container = document.getElementById('app-container');
        const titleLabel = document.getElementById('app-title');
        
        document.getElementById('global-search').value = '';
        container.innerHTML = '';

        switch(appName) {
            case 'home': 
                titleLabel.innerText = "Home Dashboard"; 
                container.innerHTML = this.generateHomeDashboard(); 
                break;
            case 'inventory': 
                titleLabel.innerText = "Inventory Manager"; 
                if (typeof renderInventoryApp === 'function') { container.innerHTML = renderInventoryApp(); if (typeof initInventoryLogic === 'function') initInventoryLogic(); } else { container.innerHTML = `<p>Error: Inventory modules not loaded.</p>`; } 
                break;
            case 'fleet': 
                titleLabel.innerText = "Fleet Management"; 
                if (typeof renderFleetApp === 'function') { container.innerHTML = renderFleetApp(); if (typeof initFleetLogic === 'function') initFleetLogic(); } else { container.innerHTML = `<p>Error: Fleet modules not loaded.</p>`; } 
                break;
            case 'winterization': 
                titleLabel.innerText = "Winter Ops Tracker"; 
                if (typeof renderWinterizationApp === 'function') { container.innerHTML = renderWinterizationApp(); if (typeof initWinterizationLogic === 'function') initWinterizationLogic(); } else { container.innerHTML = `<p>Error: Winterization modules not loaded.</p>`; } 
                break;
            case 'firstAid': 
                titleLabel.innerText = "First Aid Tracker"; 
                if (typeof renderFirstAidApp === 'function') { container.innerHTML = renderFirstAidApp(); if (typeof initFirstAidLogic === 'function') initFirstAidLogic(); } else { container.innerHTML = `<p>Error: First Aid modules not loaded.</p>`; } 
                break;
            case 'parts': 
                titleLabel.innerText = "Replacement Parts"; 
                if (typeof renderPartsApp === 'function') { container.innerHTML = renderPartsApp(); if (typeof initPartsLogic === 'function') initPartsLogic(); } else { container.innerHTML = `<p>Error: Parts modules not loaded.</p>`; } 
                break;
            default:
                console.warn("Unknown route: " + appName);
                break;
        }
    }
};