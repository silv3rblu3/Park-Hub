// js/core.js

document.addEventListener('DOMContentLoaded', () => { CoreSystem.init(); });

const CoreSystem = {
    activeApp: 'home',
    activeScanner: null, // Unified central camera registry
    qrExportInterval: null,

    // Universal Bulletproof Camera Teardown
    stopActiveScanner: async function() {
        if (this.activeScanner) {
            try { await this.activeScanner.stop(); } catch (e) { /* Ignore errors if already stopping */ }
            try { this.activeScanner.clear(); } catch (e) { /* Ignore clear errors */ }
            this.activeScanner = null;
        }
    },

    init: function() {
        this.bindGlobalEvents();
        this.applySavedTheme();
        this.routeToApp('home');
    },

    bindGlobalEvents: function() {
        // --- 1. Bento Menu Toggle ---
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

        // --- 2. Universal Global Search & Camera Scanner ---
        const searchInput = document.getElementById('global-search');
        
        const scanSearchBtn = document.createElement('button');
        scanSearchBtn.innerHTML = "📷";
        scanSearchBtn.style = "margin-left: 5px; cursor: pointer; padding: 5px 10px; background: transparent; border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);";
        scanSearchBtn.title = "Scan ID to Search";
        searchInput.parentNode.appendChild(scanSearchBtn);
        
        scanSearchBtn.addEventListener('click', () => {
            if (typeof Html5Qrcode === 'undefined') { 
                alert("Scanner library missing. Check js/html5-qrcode.min.js"); 
                return; 
            }

            // Dynamically create a camera modal for the global search
            const overlay = document.createElement('dialog');
            overlay.id = 'global-scan-modal';
            overlay.style.width = '90%';
            overlay.style.maxWidth = '400px';
            overlay.style.padding = '0';
            overlay.style.border = 'none';
            overlay.style.borderRadius = 'var(--radius-md)';
            overlay.style.backgroundColor = 'var(--bg-surface)';
            overlay.style.color = 'var(--text-primary)';

            overlay.innerHTML = `
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--border-color);">
                    <h3 style="margin: 0;">Scan Item ID</h3>
                    <button id="close-global-scan-btn" class="icon-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">❌</button>
                </div>
                <div class="modal-body" style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                    <div id="global-search-reader-canvas" style="width: 100%; min-height: 250px; background: #000; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--accent-primary);"></div>
                    <p style="color: var(--text-secondary); margin-top: 15px; font-size: 0.9rem; text-align: center;">Scan a barcode or QR code to locate the item in Inventory, Parts, or Fleet.</p>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.showModal();

            // Initialize camera after modal is painted
            setTimeout(() => {
                this.activeScanner = new Html5Qrcode("global-search-reader-canvas");
                
                const cleanup = () => {
                    this.stopActiveScanner().then(() => {
                        overlay.close();
                        overlay.remove();
                    });
                };

                document.getElementById('close-global-scan-btn').addEventListener('click', cleanup);

                this.activeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
                    this.stopActiveScanner().then(() => {
                        overlay.close();
                        overlay.remove();
                        // Send the scanned text directly to the search router
                        this.executeGlobalScanSearch(decodedText.trim());
                    });
                }, undefined).catch(err => {
                    alert("Camera Initialization Error: " + err);
                    cleanup();
                });
            }, 100);
        });

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const searchableElements = document.querySelectorAll('#app-container table tbody tr, #app-container .searchable-card');
            searchableElements.forEach(el => {
                el.style.display = el.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        // --- 3. Settings Modal Tabs ---
        const settingsModal = document.getElementById('settings-modal');
        document.getElementById('global-settings-trigger').addEventListener('click', () => { 
            this.populateThemeEditor(); 
            settingsModal.showModal(); 
        });
        document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.close());

        const settingsTabs = document.querySelectorAll('.settings-tab');
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                settingsTabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
                document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
                
                e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
                document.getElementById('settings-view-' + e.target.getAttribute('data-target')).style.display = 'block';
            });
        });

        // --- 4. Theme Editor Logic ---
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
                    bgBase: document.getElementById('theme-edit-bg').value, bgSurface: document.getElementById('theme-edit-surface').value,
                    textPrimary: document.getElementById('theme-edit-text-main').value, textSecondary: document.getElementById('theme-edit-text-muted').value,
                    accentPrimary: document.getElementById('theme-edit-accent').value, accentHover: document.getElementById('theme-edit-accent-hover').value,
                    border: document.getElementById('theme-edit-border').value, danger: document.getElementById('theme-edit-danger').value
                }
            };

            let state = StateManager.loadGlobalState();
            const idx = state.themes.findIndex(t => t.id === newTheme.id);
            if (idx > -1) state.themes[idx] = newTheme; else state.themes.push(newTheme);
            
            StateManager.saveGlobalState(state);
            this.populateThemeEditor(newTheme.id);
            NotificationSystem.show("Theme Saved", "success");
        });

        document.getElementById('apply-theme-btn').addEventListener('click', () => {
            let state = StateManager.loadGlobalState();
            state.activeThemeId = document.getElementById('global-theme-select').value;
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

        // ---------------------------------------------------------
        // 5. Dedicated Modals: QR Export Stream
        // ---------------------------------------------------------
        const exportModal = document.getElementById('qr-export-modal');
        const exportCanvas = document.getElementById('qr-export-canvas');
        const exportStatus = document.getElementById('qr-export-status');
        const exportProgress = document.getElementById('qr-export-progress');

        document.getElementById('btn-open-export-modal').addEventListener('click', () => {
            if (typeof QRCode === 'undefined') { alert("ERROR: QRCode generation library missing. Check js/qrcode.min.js"); return; }
            const target = document.getElementById('sync-target-select').value;
            const chunks = StateManager.generateQRChunks(target);
            
            if (chunks.length === 0) return NotificationSystem.show("No data to export", "error");

            exportProgress.max = chunks.length;
            exportProgress.value = 0;
            settingsModal.close();
            exportModal.showModal();
            
            let currentFrame = 0;
            
            setTimeout(() => {
                const renderFrame = () => {
                    exportCanvas.innerHTML = ''; 
                    new QRCode(exportCanvas, {
                        text: chunks[currentFrame],
                        width: 200, height: 200,
                        colorDark: "#000000", colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.L
                    });
                    
                    exportStatus.innerText = `Transmitting: Frame ${currentFrame + 1} of ${chunks.length}`;
                    exportProgress.value = currentFrame + 1;
                    
                    currentFrame++;
                    if (currentFrame >= chunks.length) currentFrame = 0; 
                };

                renderFrame();
                this.qrExportInterval = setInterval(renderFrame, 1000); 
            }, 100);
        });

        document.getElementById('close-qr-export-btn').addEventListener('click', () => {
            if (this.qrExportInterval) clearInterval(this.qrExportInterval);
            exportModal.close();
            settingsModal.showModal();
        });

        // ---------------------------------------------------------
        // 6. Dedicated Modals: QR Import Scanner
        // ---------------------------------------------------------
        const importModal = document.getElementById('qr-import-modal');
        const importStatus = document.getElementById('qr-import-status');
        const importProgress = document.getElementById('qr-import-progress');
        const importText = document.getElementById('qr-import-blocks-text');

        document.getElementById('btn-open-import-modal').addEventListener('click', () => {
            if (typeof Html5Qrcode === 'undefined') { alert("ERROR: Html5Qrcode scanner library missing."); return; }
            
            settingsModal.close();
            importModal.showModal();
            importProgress.value = 0;
            importStatus.innerText = "0%";
            importText.innerText = "Initializing camera...";

            setTimeout(() => {
                this.activeScanner = new Html5Qrcode("qr-reader-canvas");
                StateManager.qrBuffer = [];
                let totalExpected = 0;
                let targetApp = "";
                let scannedIndices = new Set();

                this.activeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
                    if (decodedText.startsWith("PMH|")) {
                        const parts = decodedText.split('|');
                        if (parts.length >= 5) {
                            targetApp = parts[1];
                            const idx = parseInt(parts[2]);
                            totalExpected = parseInt(parts[3]);
                            const data = parts.slice(4).join('|');

                            importProgress.max = totalExpected;

                            if (!scannedIndices.has(idx)) {
                                scannedIndices.add(idx);
                                StateManager.qrBuffer[idx - 1] = data; 
                                
                                importProgress.value = scannedIndices.size;
                                const pct = Math.round((scannedIndices.size / totalExpected) * 100);
                                importStatus.innerText = `${pct}%`;
                                importText.innerText = `Captured block ${scannedIndices.size} of ${totalExpected}`;
                            }

                            if (scannedIndices.size === totalExpected) {
                                this.stopActiveScanner().then(() => {
                                    importModal.close();

                                    const assembledString = StateManager.qrBuffer.join('');
                                    StateManager.qrBuffer = [];
                                    scannedIndices.clear();

                                    DialogSystem.confirm(`Syncing ${targetApp}`, `All data chunks captured successfully. Click OK to safely MERGE this data into your device.`).then(proceed => {
                                        if (proceed) StateManager.processStringImport(assembledString, targetApp, 'merge');
                                        else settingsModal.showModal();
                                    });
                                });
                            }
                        }
                    }
                }, undefined).catch((err) => {
                    alert("Camera Start Failed. Ensure permissions are granted. Error: " + err);
                    importModal.close();
                    settingsModal.showModal();
                });
            }, 100);
        });

        document.getElementById('close-qr-import-btn').addEventListener('click', () => {
            this.stopActiveScanner();
            importModal.close();
            settingsModal.showModal();
        });

        // ---------------------------------------------------------
        // 7. App Share QR Link
        // ---------------------------------------------------------
        document.getElementById('btn-generate-share').addEventListener('click', () => {
            if (typeof QRCode === 'undefined') { alert("ERROR: QRCode library missing."); return; }
            
            const container = document.getElementById('qr-share-container');
            container.style.display = 'flex';
            
            setTimeout(() => {
                container.innerHTML = '';
                new QRCode(container, {
                    text: window.location.href.split('?')[0], 
                    width: 200, height: 200,
                    colorDark: "#000000", colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            }, 50);
        });

        // ---------------------------------------------------------
        // 8. File Backup Systems
        // ---------------------------------------------------------
        document.getElementById('btn-export-data').addEventListener('click', () => {
            StateManager.exportData(document.getElementById('sync-target-select').value);
        });

        const mergeInput = document.getElementById('file-import-merge');
        const replaceInput = document.getElementById('file-import-replace');
        document.getElementById('btn-import-merge').addEventListener('click', () => mergeInput.click());
        document.getElementById('btn-import-replace').addEventListener('click', () => replaceInput.click());

        const handleSmartImport = async (e, mode) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            let target = document.getElementById('sync-target-select').value; 
            
            const fileNameParts = file.name.split('_');
            if (fileNameParts.length >= 2 && fileNameParts[1] === 'PMH') {
                const prefix = fileNameParts[0].toLowerCase();
                const targetMap = { 'global': 'global', 'themes': 'themes', 'parkinfo': 'parkInfo', 'inventory': 'inventory', 'fleet': 'fleet', 'winterization': 'winterization', 'firstaid': 'firstAid', 'parts': 'parts', 'projects': 'projects' };
                if (targetMap[prefix]) target = targetMap[prefix];
            }
            if (mode === 'merge') {
                const confirmed = await DialogSystem.confirm(`Merge File?`, `This will safely sync the file. Proceed?`);
                if (confirmed) StateManager.importData(file, target, 'merge');
            } else {
                const confirmed = await DialogSystem.confirm(`⚠️ OVERWRITE?`, `This will COMPLETELY WIPE your current data. Proceed?`);
                if (confirmed) StateManager.importData(file, target, 'replace');
            }
            e.target.value = '';
        };
        mergeInput.addEventListener('change', (e) => handleSmartImport(e, 'merge'));
        replaceInput.addEventListener('change', (e) => handleSmartImport(e, 'replace'));
    },

    executeGlobalScanSearch: function(scannedId) {
        const state = StateManager.loadGlobalState();
        let found = false;

        // Route to Parts Module
        if (state.apps.parts && state.apps.parts.partsCatalog.some(p => p.sku === scannedId || p.id === scannedId)) {
            this.routeToApp('parts');
            setTimeout(() => {
                document.getElementById('global-search').value = scannedId;
                document.getElementById('global-search').dispatchEvent(new Event('input'));
            }, 200);
            found = true;
        }
        // Route to Inventory Module
        else if (state.apps.inventory && state.apps.inventory.items.some(i => i.sku === scannedId || i.id === scannedId)) {
            this.routeToApp('inventory');
            setTimeout(() => {
                document.getElementById('global-search').value = scannedId;
                document.getElementById('global-search').dispatchEvent(new Event('input'));
            }, 200);
            found = true;
        }
        // Route to Fleet Module
        else if (state.apps.fleet && state.apps.fleet.vehicles.some(v => v.id === scannedId)) {
            this.routeToApp('fleet');
            setTimeout(() => {
                document.getElementById('global-search').value = scannedId;
                document.getElementById('global-search').dispatchEvent(new Event('input'));
            }, 200);
            found = true;
        }

        if (!found) DialogSystem.alert("Not Found", `No item found matching ID: ${scannedId}`);
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
        
        let activeProjects = 0;
        let priorityProjects = 0;
        if (state.apps.projects && state.apps.projects.tasks) {
            state.apps.projects.tasks.forEach(t => {
                if (t.status !== 'Completed') {
                    activeProjects++;
                    if (t.priority === 'High') priorityProjects++;
                }
            });
        }

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
                            if (res === 'Fail' && !vSrv.some(s => s.task === item && new Date(s.date) >= new Date(lastI.date))) fails = true;
                        }
                    }
                }
                if (fails) vehiclesNeedingRepair++;
                if (needsInsp) vehiclesNeedingInsp++;
            });
        }

        let firstAidKits = state.apps.firstAid?.categories?.length || 0;
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
                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('parkInfo')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">🌲</span> Park Info</h3>
                        <p style="color: var(--text-secondary); margin-top: 5px;">Access emergency protocols, P.O.S, links, and quick-print resources.</p>
                    </div>
                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('projects')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">📋</span> Projects & Tasks</h3>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <p><strong>${activeProjects}</strong> Active Tasks</p>
                            ${priorityProjects > 0 ? `<p><strong style="color: var(--danger-color); font-size: 1.1rem;">${priorityProjects}</strong> High Priority</p>` : `<p style="color: var(--text-secondary);">No High Priority Tasks.</p>`}
                        </div>
                    </div>
                    <div class="app-card searchable-card" style="cursor: pointer; border-top: 4px solid var(--accent-primary); transition: transform 0.2s;" onclick="CoreSystem.routeToApp('inventory')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;"><span style="font-size: 1.5rem;">📦</span> Inventory</h3>
                        ${lowInvCount > 0 ? `<p><strong style="color: var(--danger-color); font-size: 1.2rem;">${lowInvCount}</strong> items at or below reorder level.</p>` : `<p style="color: var(--text-secondary);">All stock levels are optimal.</p>`}
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
        this.stopActiveScanner(); // Ensure no cameras are left running when switching modules or tabs
        
        this.activeApp = appName;
        const container = document.getElementById('app-container');
        const titleLabel = document.getElementById('app-title');
        
        document.getElementById('global-search').value = '';
        container.innerHTML = '';

        switch(appName) {
            case 'home': titleLabel.innerText = "Home Dashboard"; container.innerHTML = this.generateHomeDashboard(); break;
            case 'parkInfo': titleLabel.innerText = "Park Info & Resources"; if (typeof renderParkInfoApp === 'function') { container.innerHTML = renderParkInfoApp(); if (typeof initParkInfoLogic === 'function') initParkInfoLogic(); } break;
            case 'inventory': titleLabel.innerText = "Inventory Manager"; if (typeof renderInventoryApp === 'function') { container.innerHTML = renderInventoryApp(); if (typeof initInventoryLogic === 'function') initInventoryLogic(); } break;
            case 'fleet': titleLabel.innerText = "Fleet Management"; if (typeof renderFleetApp === 'function') { container.innerHTML = renderFleetApp(); if (typeof initFleetLogic === 'function') initFleetLogic(); } break;
            case 'winterization': titleLabel.innerText = "Winter Ops Tracker"; if (typeof renderWinterizationApp === 'function') { container.innerHTML = renderWinterizationApp(); if (typeof initWinterizationLogic === 'function') initWinterizationLogic(); } break;
            case 'firstAid': titleLabel.innerText = "First Aid Tracker"; if (typeof renderFirstAidApp === 'function') { container.innerHTML = renderFirstAidApp(); if (typeof initFirstAidLogic === 'function') initFirstAidLogic(); } break;
            case 'parts': titleLabel.innerText = "Replacement Parts"; if (typeof renderPartsApp === 'function') { container.innerHTML = renderPartsApp(); if (typeof initPartsLogic === 'function') initPartsLogic(); } break;
            case 'projects': titleLabel.innerText = "Projects & Tasks"; if (typeof renderProjectsApp === 'function') { container.innerHTML = renderProjectsApp(); if (typeof initProjectsLogic === 'function') initProjectsLogic(); } break;
            default: console.warn("Unknown route: " + appName); break;
        }
    }
};