// apps/parts/app.js

function initPartsLogic() {
    let state = StateManager.getAppData('parts');
    let activeMainTab = "database";
    let activeArea = "All Parts";
    
    // Toggles & Modes
    let isAuditMode = false;
    let isPrintMode = false;
    let scannerTarget = 'main'; 
    let pendingNewPartSku = '';

    const todayStr = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    // --- Main Tab Routing ---
    const mainTabs = document.querySelectorAll('.parts-main-tab');
    mainTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            mainTabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
            e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
            
            activeMainTab = e.target.getAttribute('data-target');
            
            // Hide all views initially
            document.getElementById('parts-view-database').style.display = 'none';
            document.getElementById('parts-view-kits').style.display = 'none';
            document.getElementById('parts-view-reports').style.display = 'none';
            
            // Set dynamic mode flags
            isAuditMode = (activeMainTab === 'audit');
            isPrintMode = (activeMainTab === 'print');
            
            if (['database', 'audit', 'print'].includes(activeMainTab)) {
                document.getElementById('parts-view-database').style.display = 'block';
                updatePrintUI();
                renderAreaTabs();
                renderTable();
            } else if (activeMainTab === 'kits') {
                document.getElementById('parts-view-kits').style.display = 'block';
                renderKitsTable();
            } else if (activeMainTab === 'reports') {
                document.getElementById('parts-view-reports').style.display = 'block';
                document.getElementById('parts-report-start').value = lastMonthStr;
                document.getElementById('parts-report-end').value = todayStr;
                document.getElementById('parts-report-results').innerHTML = '';
                document.getElementById('parts-report-print-controls').classList.add('hidden');
            }
        });
    });

    function updatePrintUI() {
        document.getElementById('parts-print-col-header').style.display = isPrintMode ? 'table-cell' : 'none';
        document.getElementById('parts-actions-header').innerText = isPrintMode ? '' : 'Actions';
        document.getElementById('parts-print-action-bar').style.display = isPrintMode ? 'block' : 'none';
    }

    // --- Sub-Area Routing (Only in Database/Audit/Print) ---
    function renderAreaTabs() {
        const container = document.getElementById('parts-area-tabs');
        container.innerHTML = '';
        
        const areas = ["All Parts", ...Object.keys(state.areaTags || {})];
        areas.forEach(area => {
            const btn = document.createElement('button');
            btn.className = area === activeArea ? 'btn-primary' : 'btn-outline';
            btn.innerText = area;
            btn.onclick = () => { activeArea = area; renderAreaTabs(); renderTable(); };
            container.appendChild(btn);
        });
    }

    function renderTable() {
        const tbody = document.getElementById('parts-table-body');
        tbody.innerHTML = '';

        let filteredParts = state.partsCatalog || [];
        if (activeArea !== "All Parts") {
            const allowedIds = state.areaTags[activeArea] || [];
            filteredParts = filteredParts.filter(p => allowedIds.includes(p.id));
        }

        if (filteredParts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No parts found in this area.</td></tr>`;
            return;
        }

        filteredParts.forEach(part => {
            const isCritEmpty = part.isCritical && Number(part.qty) === 0;
            const isLow = Number(part.qty) <= Number(part.minQty) && !isCritEmpty;
            
            const imgHtml = (part.media && part.media[0] && part.media[0].url) 
                ? `<img src="${part.media[0].url}" class="part-media-thumb">` 
                : `<div class="part-media-thumb" style="display:flex; align-items:center; justify-content:center; background:#eee; color:#999; font-size:0.8rem;">No Img</div>`;

            const tr = document.createElement('tr');
            if (isCritEmpty) tr.className = 'critical-row';

            let actionHtml = '';
            if (isAuditMode) {
                actionHtml = `<button class="btn-danger parts-audit-trigger" data-id="${part.id}" style="width: 100%;">Audit Count</button>`;
            } else if (isPrintMode) {
                actionHtml = `<span style="color: var(--text-secondary); font-size: 0.8rem;">Select checkbox</span>`;
            } else {
                actionHtml = `
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn-outline qty-btn deduct-btn" data-id="${part.id}">-</button>
                        <button class="btn-outline qty-btn add-btn" data-id="${part.id}">+</button>
                    </div>`;
            }

            const noteHtml = part.notes ? `<div style="font-size: 0.8rem; color: #888; margin-top: 4px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📝 ${part.notes}</div>` : '';

            tr.innerHTML = `
                <td class="print-checkbox-col" style="display: ${isPrintMode ? 'table-cell' : 'none'}; text-align: center;">
                    <input type="checkbox" class="part-print-cb" value="${part.id}" style="width: 20px; height: 20px;">
                </td>
                <td>${imgHtml}</td>
                <td>
                    <strong style="cursor: pointer; color: var(--accent-primary);" class="edit-part-trigger" data-id="${part.id}">${part.name}</strong><br>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">SKU: ${part.sku}</span>
                    ${noteHtml}
                </td>
                <td>${part.location || 'Unassigned'}</td>
                <td style="text-align: center; font-size: 1.2rem;">
                    <span class="${isLow ? 'low-stock-text' : ''} ${isCritEmpty ? 'low-stock-text' : ''}" style="${isCritEmpty ? 'color: var(--danger-color);' : ''}">${part.qty}</span>
                </td>
                <td style="text-align: center;">${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Adjust Quantity & Transactions ---
    function adjustQty(partId, amount, isAuditOverride = false, auditNote = '') {
        const partIdx = state.partsCatalog.findIndex(p => p.id === partId);
        if (partIdx === -1) return;
        
        let oldQty = Number(state.partsCatalog[partIdx].qty);
        let newQty = isAuditOverride ? amount : oldQty + amount;
        if (newQty < 0) newQty = 0;
        
        state.partsCatalog[partIdx].qty = newQty;
        
        if (!state.transactions) state.transactions = [];
        state.transactions.push({
            id: 'txn_' + Date.now(),
            timestamp: new Date().toISOString(),
            partId: partId,
            type: isAuditOverride ? 'Audit' : (amount > 0 ? 'Add' : 'Deduct'),
            qtyChange: isAuditOverride ? (newQty - oldQty) : amount,
            oldTotal: oldQty,
            newTotal: newQty,
            note: auditNote
        });

        StateManager.setAppData('parts', state);
        renderTable();

        if (newQty === 0 && state.partsCatalog[partIdx].substituteId) {
            const sub = state.partsCatalog.find(p => p.id === state.partsCatalog[partIdx].substituteId);
            if (sub && Number(sub.qty) > 0) NotificationSystem.show(`Out of stock. Substitute available: ${sub.name}`, "error");
        }
    }

    document.getElementById('parts-table-body').addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-id');
        if (e.target.classList.contains('edit-part-trigger')) openEditor(targetId);
        if (e.target.classList.contains('deduct-btn')) adjustQty(targetId, -1);
        if (e.target.classList.contains('add-btn')) adjustQty(targetId, 1);
        if (e.target.classList.contains('parts-audit-trigger')) openAuditKeypad(targetId);
    });

    // --- Part Editor Handlers ---
    const editorModal = document.getElementById('parts-editor-modal');
    document.getElementById('parts-add-btn').onclick = () => openEditor(null);
    document.getElementById('parts-close-editor').onclick = () => editorModal.close();

    document.getElementById('part-edit-add-area-btn').onclick = () => {
        const val = document.getElementById('part-edit-new-area').value.trim();
        if (val && !state.areaTags[val]) {
            state.areaTags[val] = [];
            StateManager.setAppData('parts', state);
            document.getElementById('part-edit-new-area').value = '';
            
            document.getElementById('part-edit-area-tags').innerHTML += `
                <label style="display:flex; align-items:center; gap:5px; padding:5px; background:rgba(0,0,0,0.03); border-radius:4px;">
                    <input type="checkbox" class="area-tag-cb" value="${val}" checked> ${val}
                </label>`;
            renderAreaTabs(); 
        }
    };

    function openEditor(partId) {
        const tagsContainer = document.getElementById('part-edit-area-tags');
        tagsContainer.innerHTML = '';
        Object.keys(state.areaTags || {}).forEach(area => {
            tagsContainer.innerHTML += `<label style="display:flex; align-items:center; gap:5px; padding:5px; background:rgba(0,0,0,0.03); border-radius:4px;"><input type="checkbox" class="area-tag-cb" value="${area}"> ${area}</label>`;
        });

        if (partId) {
            const part = state.partsCatalog.find(p => p.id === partId);
            if (!part) return;
            document.getElementById('parts-editor-title').innerText = "Edit Part";
            document.getElementById('part-edit-id').value = part.id;
            document.getElementById('part-edit-name').value = part.name;
            document.getElementById('part-edit-sku').value = part.sku;
            document.getElementById('part-edit-sub').value = part.substituteId || '';
            document.getElementById('part-edit-qty').value = part.qty;
            document.getElementById('part-edit-min').value = part.minQty;
            document.getElementById('part-edit-loc').value = part.location || '';
            document.getElementById('part-edit-vendor-url').value = part.vendor?.url || '';
            document.getElementById('part-edit-vendor-price').value = part.vendor?.lastPrice || '';
            document.getElementById('part-edit-notes').value = part.notes || '';
            document.getElementById('part-edit-img').value = (part.media && part.media[0]) ? part.media[0].url : '';
            document.getElementById('part-edit-critical').checked = part.isCritical;
            
            document.querySelectorAll('.area-tag-cb').forEach(cb => {
                if (state.areaTags[cb.value] && state.areaTags[cb.value].includes(partId)) cb.checked = true;
            });
            document.getElementById('part-delete-btn').style.display = 'block';
        } else {
            document.getElementById('parts-editor-title').innerText = "Add New Part";
            document.getElementById('part-edit-id').value = 'part_' + Date.now() + Math.random().toString(36).substr(2, 9);
            ['name', 'sku', 'sub', 'qty', 'min', 'loc', 'vendor-url', 'vendor-price', 'notes', 'img'].forEach(id => document.getElementById(`part-edit-${id}`).value = '');
            document.getElementById('part-edit-critical').checked = false;
            document.getElementById('part-delete-btn').style.display = 'none';
        }
        editorModal.showModal();
    }

    document.getElementById('part-save-btn').onclick = () => {
        const id = document.getElementById('part-edit-id').value;
        const name = document.getElementById('part-edit-name').value.trim();
        if(!name) return NotificationSystem.show("Part name required", "error");

        const newPart = {
            id: id,
            name: name,
            sku: document.getElementById('part-edit-sku').value,
            substituteId: document.getElementById('part-edit-sub').value,
            qty: Number(document.getElementById('part-edit-qty').value || 0),
            minQty: Number(document.getElementById('part-edit-min').value || 0),
            location: document.getElementById('part-edit-loc').value,
            notes: document.getElementById('part-edit-notes').value,
            isCritical: document.getElementById('part-edit-critical').checked,
            vendor: { url: document.getElementById('part-edit-vendor-url').value, lastPrice: document.getElementById('part-edit-vendor-price').value },
            media: [{ type: "image", url: document.getElementById('part-edit-img').value }]
        };

        if(!state.partsCatalog) state.partsCatalog = [];
        const idx = state.partsCatalog.findIndex(p => p.id === id);
        const isNew = idx === -1;
        const previousQty = isNew ? 0 : Number(state.partsCatalog[idx].qty);
        const qtyDiff = newPart.qty - previousQty;

        if (isNew) state.partsCatalog.push(newPart); 
        else state.partsCatalog[idx] = newPart;

        if (qtyDiff !== 0) {
            if (!state.transactions) state.transactions = [];
            state.transactions.push({
                id: 'txn_' + Date.now(),
                timestamp: new Date().toISOString(),
                partId: id,
                type: isNew ? 'Add' : 'Audit',
                qtyChange: qtyDiff,
                oldTotal: previousQty,
                newTotal: newPart.qty,
                note: isNew ? 'Initial part creation' : 'Manual stock edit via Part Editor'
            });
        }

        document.querySelectorAll('.area-tag-cb').forEach(cb => {
            const areaName = cb.value;
            if(!state.areaTags[areaName]) state.areaTags[areaName] = [];
            
            const hasId = state.areaTags[areaName].includes(id);
            if(cb.checked && !hasId) state.areaTags[areaName].push(id);
            if(!cb.checked && hasId) state.areaTags[areaName] = state.areaTags[areaName].filter(tagId => tagId !== id);
        });

        StateManager.setAppData('parts', state);
        editorModal.close();
        renderTable();
        NotificationSystem.show("Part Saved");
    };

    document.getElementById('part-delete-btn').onclick = async () => {
        const id = document.getElementById('part-edit-id').value;
        const confirmed = await DialogSystem.confirm("Delete Part", "Are you sure? This deletes the part globally.");
        if (confirmed) {
            state.partsCatalog = state.partsCatalog.filter(p => p.id !== id);
            Object.keys(state.areaTags).forEach(area => {
                state.areaTags[area] = state.areaTags[area].filter(tagId => tagId !== id);
            });
            StateManager.setAppData('parts', state);
            editorModal.close();
            renderTable();
            NotificationSystem.show("Part Deleted");
        }
    };

    // --- Kitting Logic ---
    let currentKitParts = [];
    const kitModal = document.getElementById('parts-kit-modal');
    
    document.getElementById('parts-create-kit-btn').onclick = () => openKitEditor(null);
    document.getElementById('parts-close-kit-editor').onclick = () => kitModal.close();

    function renderKitsTable() {
        const tbody = document.getElementById('parts-kits-body');
        tbody.innerHTML = '';
        (state.kits || []).forEach(kit => {
            const partsListHtml = kit.partsNeeded.map(p => {
                const catalogPart = state.partsCatalog.find(cp => cp.id === p.partId);
                return catalogPart ? `• ${p.qty}x ${catalogPart.name}` : '• Unknown Part';
            }).join('<br>');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${kit.name}</strong><br><button class="btn-outline edit-kit-btn" data-id="${kit.id}" style="font-size: 0.75rem; padding: 2px 6px; margin-top: 5px;">✏️ Edit</button></td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${partsListHtml}</td>
                <td style="text-align: center;"><button class="btn-primary use-kit-btn" data-id="${kit.id}">Execute Kit</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('parts-kits-body').addEventListener('click', async (e) => {
        const targetId = e.target.getAttribute('data-id');
        if (e.target.classList.contains('edit-kit-btn')) openKitEditor(targetId);
        if (e.target.classList.contains('use-kit-btn')) {
            const kit = state.kits.find(k => k.id === targetId);
            const confirmed = await DialogSystem.confirm("Execute Kit", `This will immediately deduct all parts in the [${kit.name}] from inventory. Proceed?`);
            if (confirmed) {
                kit.partsNeeded.forEach(p => adjustQty(p.partId, -p.qty));
                NotificationSystem.show("Kit Executed & Parts Deducted", "success");
            }
        }
    });

    function openKitEditor(kitId) {
        const select = document.getElementById('kit-part-select');
        select.innerHTML = '<option value="">Select a part...</option>';
        state.partsCatalog.forEach(p => { select.innerHTML += `<option value="${p.id}">${p.name} (In Stock: ${p.qty})</option>`; });

        if (kitId) {
            const kit = state.kits.find(k => k.id === kitId);
            document.getElementById('kit-edit-id').value = kit.id;
            document.getElementById('kit-edit-name').value = kit.name;
            currentKitParts = [...kit.partsNeeded];
            document.getElementById('kit-delete-btn').style.display = 'block';
        } else {
            document.getElementById('kit-edit-id').value = 'kit_' + Date.now();
            document.getElementById('kit-edit-name').value = '';
            currentKitParts = [];
            document.getElementById('kit-delete-btn').style.display = 'none';
        }
        refreshKitPartsList();
        kitModal.showModal();
    }

    document.getElementById('kit-add-part-btn').onclick = () => {
        const partId = document.getElementById('kit-part-select').value;
        const qty = Number(document.getElementById('kit-part-qty').value);
        if (!partId || qty <= 0) return;
        
        const existing = currentKitParts.find(p => p.partId === partId);
        if (existing) existing.qty += qty; else currentKitParts.push({ partId, qty });
        document.getElementById('kit-part-qty').value = 1;
        refreshKitPartsList();
    };

    function refreshKitPartsList() {
        const list = document.getElementById('kit-parts-list');
        list.innerHTML = '';
        currentKitParts.forEach((p, index) => {
            const name = state.partsCatalog.find(cp => cp.id === p.partId)?.name || 'Unknown';
            list.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center;"><span>${p.qty}x ${name}</span><button class="btn-danger remove-kit-part-btn" data-index="${index}" style="padding: 2px 6px; font-size: 0.8rem;">X</button></div>`;
        });
        document.querySelectorAll('.remove-kit-part-btn').forEach(btn => {
            btn.onclick = (e) => { currentKitParts.splice(e.target.getAttribute('data-index'), 1); refreshKitPartsList(); };
        });
    }

    document.getElementById('kit-save-btn').onclick = () => {
        const name = document.getElementById('kit-edit-name').value.trim();
        if(!name || currentKitParts.length === 0) return NotificationSystem.show("Name and at least one part required.", "error");
        const id = document.getElementById('kit-edit-id').value;
        const newKit = { id, name, partsNeeded: currentKitParts };
        
        if(!state.kits) state.kits = [];
        const idx = state.kits.findIndex(k => k.id === id);
        if(idx > -1) state.kits[idx] = newKit; else state.kits.push(newKit);

        StateManager.setAppData('parts', state);
        kitModal.close();
        renderKitsTable();
    };

    document.getElementById('kit-delete-btn').onclick = async () => {
        const id = document.getElementById('kit-edit-id').value;
        const confirmed = await DialogSystem.confirm("Delete Kit", "Are you sure?");
        if (confirmed) {
            state.kits = state.kits.filter(k => k.id !== id);
            StateManager.setAppData('parts', state);
            kitModal.close();
            renderKitsTable();
        }
    };

    // --- Audit Keypad Logic ---
    const auditModal = document.getElementById('parts-audit-modal');
    const auditInput = document.getElementById('audit-input-display');

    function openAuditKeypad(partId) {
        const part = state.partsCatalog.find(p => p.id === partId);
        if(!part) return;
        
        document.getElementById('audit-target-id').value = part.id;
        document.getElementById('audit-target-name').innerText = part.name;
        auditInput.value = '';
        document.getElementById('audit-note-input').value = '';
        auditModal.showModal();
    }

    document.querySelectorAll('.audit-key').forEach(btn => {
        btn.onclick = (e) => {
            const val = e.target.getAttribute('data-val');
            if (val === 'C') {
                auditInput.value = '';
            } else if (val === 'E') {
                if (auditInput.value === '') return;
                const note = document.getElementById('audit-note-input').value.trim();
                adjustQty(document.getElementById('audit-target-id').value, Number(auditInput.value), true, note);
                NotificationSystem.show("Stock Level Overwritten");
                auditModal.close();
            } else {
                auditInput.value += val;
            }
        };
    });
    document.getElementById('parts-close-audit').onclick = () => auditModal.close();

    // --- Printing Labels Logic ---
    document.getElementById('parts-execute-print-btn').onclick = () => {
        if (typeof QRCode === 'undefined') return NotificationSystem.show("QR Library not loaded.", "error");
        
        const selectedIds = Array.from(document.querySelectorAll('.part-print-cb:checked')).map(cb => cb.value);
        if (selectedIds.length === 0) return NotificationSystem.show("Select at least one part to print.", "error");

        const printContainer = document.getElementById('parts-print-container');
        document.getElementById('parts-report-print-stage').innerHTML = '';
        printContainer.innerHTML = '';
        
        selectedIds.forEach(id => {
            const part = state.partsCatalog.find(p => p.id === id);
            const labelDiv = document.createElement('div');
            labelDiv.className = 'bin-label';
            labelDiv.innerHTML = `<div class="qr-target" style="margin-bottom: 5px;"></div><div class="bin-label-title">${part.name}</div><div class="bin-label-sku">SKU: ${part.sku}</div>`;
            printContainer.appendChild(labelDiv);
            new QRCode(labelDiv.querySelector('.qr-target'), { text: id, width: 80, height: 80, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
        });
        
        setTimeout(() => window.print(), 300);
    };

    document.getElementById('parts-print-loc-btn').onclick = () => {
        if (typeof QRCode === 'undefined') return NotificationSystem.show("QR Library not loaded.", "error");
        
        const locText = document.getElementById('print-custom-loc-input').value.trim();
        let locationsToPrint = [];

        if (locText) {
            locationsToPrint.push(locText);
        } else {
            const selectedIds = Array.from(document.querySelectorAll('.part-print-cb:checked')).map(cb => cb.value);
            if (selectedIds.length === 0) return NotificationSystem.show("Select parts or manually type a location.", "error");
            
            selectedIds.forEach(id => {
                const part = state.partsCatalog.find(p => p.id === id);
                if (part && part.location && !locationsToPrint.includes(part.location)) {
                    locationsToPrint.push(part.location);
                }
            });
        }

        if (locationsToPrint.length === 0) return NotificationSystem.show("Selected parts have no assigned locations.", "error");

        const printContainer = document.getElementById('parts-print-container');
        document.getElementById('parts-report-print-stage').innerHTML = '';
        printContainer.innerHTML = '';
        
        locationsToPrint.forEach(loc => {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'bin-label';
            labelDiv.innerHTML = `<div class="qr-target" style="margin-bottom: 5px;"></div><div class="bin-label-title">LOCATION</div><div class="bin-label-sku">${loc}</div>`;
            printContainer.appendChild(labelDiv);
            new QRCode(labelDiv.querySelector('.qr-target'), { text: loc, width: 80, height: 80, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
        });

        setTimeout(() => window.print(), 300);
    };


    // --- Reports Engine & Sync ---
    document.getElementById('parts-generate-report-btn').onclick = () => {
        const startStr = document.getElementById('parts-report-start').value;
        const endStr = document.getElementById('parts-report-end').value;
        if(!startStr || !endStr) return NotificationSystem.show("Select dates", "error");
        
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        endDate.setHours(23, 59, 59, 999);

        const usageStats = {};
        state.partsCatalog.forEach(i => {
            usageStats[i.id] = { name: i.name, currentQty: i.qty, added: 0, used: 0, totalSpend: 0, totalUsedValue: 0, cost: Number(i.vendor?.lastPrice) || 0 };
        });

        let logHtml = `<div id="report-section-log"><h4 style="margin-bottom: 10px; color: var(--accent-primary);">Detailed Audit & Transaction Log</h4>
            <table class="app-table">
            <thead><tr><th>Date</th><th>Type</th><th>Part Name</th><th>Change</th><th>Notes</th></tr></thead><tbody>`;
        let hasLogs = false;

        (state.transactions || []).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(txn => {
            const tDate = new Date(txn.timestamp);
            if (tDate >= startDate && tDate <= endDate) {
                hasLogs = true;
                const part = state.partsCatalog.find(p => p.id === txn.partId);
                const pName = part ? part.name : 'Deleted Part';
                
                if (usageStats[txn.partId]) {
                    const cost = usageStats[txn.partId].cost;
                    
                    if (txn.type === 'Add') {
                        usageStats[txn.partId].added += txn.qtyChange;
                        usageStats[txn.partId].totalSpend += (txn.qtyChange * cost);
                    } else if (txn.type === 'Deduct') {
                        usageStats[txn.partId].used += Math.abs(txn.qtyChange);
                        usageStats[txn.partId].totalUsedValue += (Math.abs(txn.qtyChange) * cost);
                    } else if (txn.type === 'Audit') {
                        if (txn.qtyChange < 0) {
                            usageStats[txn.partId].used += Math.abs(txn.qtyChange);
                            usageStats[txn.partId].totalUsedValue += (Math.abs(txn.qtyChange) * cost);
                        } else if (txn.qtyChange > 0) {
                            usageStats[txn.partId].used -= txn.qtyChange; 
                            usageStats[txn.partId].totalUsedValue -= (txn.qtyChange * cost);
                        }
                    }
                }

                const dateFmt = tDate.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                const isAudit = txn.type === 'Audit';
                const rowClass = isAudit ? 'audit-row-danger' : '';
                
                let changeText = '';
                if (isAudit) changeText = `Old: ${txn.oldTotal || '?'} → New: ${txn.newTotal || '?'}`;
                else changeText = txn.qtyChange > 0 ? `+${txn.qtyChange}` : txn.qtyChange;

                logHtml += `<tr class="${rowClass}">
                    <td>${dateFmt}</td>
                    <td>${txn.type}</td>
                    <td>${pName}</td>
                    <td>${changeText}</td>
                    <td style="font-size: 0.85rem;">${txn.note || '--'}</td>
                </tr>`;
            }
        });
        
        if(!hasLogs) logHtml += `<tr><td colspan="5" style="text-align:center;">No activity in this date range.</td></tr>`;
        logHtml += `</tbody></table></div>`;

        let sumHtml = `<div id="report-section-summary"><h4 style="margin-bottom: 10px; color: var(--accent-primary);">Acquisition & Burn Summary</h4>
            <table class="app-table" style="margin-bottom: 30px;">
                <thead><tr><th>Part Name</th><th style="text-align:center;">Used / Missing (-)</th><th style="text-align:right;">Used Value</th><th style="text-align:center;">Acquired (+)</th><th style="text-align:right;">Acquired Spend</th></tr></thead><tbody>`;
        
        let hasSummary = false;
        let grandTotalSpend = 0;
        let grandTotalUsedValue = 0;

        for (const id in usageStats) {
            if (usageStats[id].added !== 0 || usageStats[id].used !== 0) {
                hasSummary = true;
                grandTotalSpend += usageStats[id].totalSpend;
                grandTotalUsedValue += usageStats[id].totalUsedValue;
                sumHtml += `<tr>
                    <td><strong>${usageStats[id].name}</strong></td>
                    <td style="color: var(--danger-color); font-weight: bold; text-align: center;">${usageStats[id].used}</td>
                    <td style="text-align: right;">$${usageStats[id].totalUsedValue.toFixed(2)}</td>
                    <td style="color: var(--accent-primary); font-weight: bold; text-align: center;">${usageStats[id].added}</td>
                    <td style="text-align: right;">$${usageStats[id].totalSpend.toFixed(2)}</td>
                </tr>`;
            }
        }
        
        if(!hasSummary) sumHtml += `<tr><td colspan="5" style="text-align:center;">No direct additions or deductions recorded.</td></tr>`;
        else {
            sumHtml += `
            <tr style="background-color: rgba(0,0,0,0.05); border-top: 2px solid var(--border-color);">
                <td colspan="2" style="text-align: right; font-weight: bold;">Grand Total Used Value:</td>
                <td style="text-align: right; font-weight: bold; color: var(--danger-color);">$${grandTotalUsedValue.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">Grand Total Spend:</td>
                <td style="text-align: right; font-weight: bold; color: var(--accent-primary);">$${grandTotalSpend.toFixed(2)}</td>
            </tr>`;
        }
        sumHtml += `</tbody></table></div>`;

        document.getElementById('parts-report-results').innerHTML = sumHtml + logHtml;
        document.getElementById('parts-report-print-controls').classList.remove('hidden');
    };

    function executeReportPrint(mode) {
        const start = document.getElementById('parts-report-start').value;
        const end = document.getElementById('parts-report-end').value;
        const sumEl = document.getElementById('report-section-summary');
        const logEl = document.getElementById('report-section-log');
        
        if(!sumEl || !logEl) return;
        
        let content = '';
        if (mode === 'summary') content = sumEl.outerHTML;
        else if (mode === 'log') content = logEl.outerHTML;
        else content = sumEl.outerHTML + '<br>' + logEl.outerHTML;

        const printStage = document.getElementById('parts-report-print-stage');
        document.getElementById('parts-print-container').innerHTML = '';
        
        printStage.innerHTML = `
            <div style="margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
                <h2 style="margin-bottom: 5px;">Parts Usage & Spend Report</h2>
                <p style="font-size: 1.1rem;"><strong>Date Range:</strong> ${start} to ${end}</p>
            </div>
            ${content}
        `;
        window.print();
    }

    document.getElementById('btn-print-summary').onclick = () => executeReportPrint('summary');
    document.getElementById('btn-print-log').onclick = () => executeReportPrint('log');
    document.getElementById('btn-print-full').onclick = () => executeReportPrint('full');

    // EXPORT JSON
    document.getElementById('export-parts-json-btn').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr); 
        anchor.setAttribute("download", `PMH_Parts_Sync_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(anchor); 
        anchor.click(); 
        anchor.remove();
        NotificationSystem.show('Parts Sync File Exported', 'success');
    });

    // IMPORT JSON
    document.getElementById('import-parts-json-file').addEventListener('change', async (e) => {
        if(e.target.files.length > 0) {
            const file = e.target.files[0];
            const confirm = await DialogSystem.confirm("Merge Parts Data?", "This will sync the uploaded file with your current data. It updates existing parts, adds new parts, and merges transaction logs and kits. Proceed?");
            
            if (confirm) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const imported = JSON.parse(event.target.result);
                        if (!state.partsCatalog) state.partsCatalog = [];
                        if (!state.transactions) state.transactions = [];
                        if (!state.kits) state.kits = [];
                        if (!state.areaTags) state.areaTags = {};

                        (imported.partsCatalog || []).forEach(impPart => {
                            const idx = state.partsCatalog.findIndex(p => p.id === impPart.id || (p.sku && p.sku === impPart.sku));
                            if (idx > -1) { state.partsCatalog[idx] = { ...state.partsCatalog[idx], ...impPart }; } 
                            else { state.partsCatalog.push(impPart); }
                        });

                        (imported.transactions || []).forEach(impTx => {
                            if (!state.transactions.some(t => t.id === impTx.id)) state.transactions.push(impTx);
                        });

                        (imported.kits || []).forEach(impKit => {
                            const idx = state.kits.findIndex(k => k.id === impKit.id);
                            if (idx > -1) { state.kits[idx] = { ...state.kits[idx], ...impKit }; } 
                            else { state.kits.push(impKit); }
                        });

                        const impAreas = imported.areaTags || {};
                        Object.keys(impAreas).forEach(area => {
                            if (!state.areaTags[area]) state.areaTags[area] = [];
                            impAreas[area].forEach(partId => {
                                if (!state.areaTags[area].includes(partId)) state.areaTags[area].push(partId);
                            });
                        });

                        StateManager.setAppData('parts', state);
                        NotificationSystem.show('Parts Data Merged Successfully', 'success');
                    } catch (err) { NotificationSystem.show('Import Failed: Invalid JSON file', 'error'); }
                }; 
                reader.readAsText(file);
            }
            e.target.value = ''; 
        }
    });

    // IMPORT CSV (PARTS)
    document.getElementById('csv-import-parts').addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: function(results) {
                const newParts = results.data.map(row => { 
                    return {
                        id: row['ID'] || 'part_' + Date.now() + Math.random().toString(36).substr(2, 9),
                        sku: row['SKU'] || '', 
                        name: row['Part Name'] || '', 
                        location: row['Location'] || '', 
                        notes: row['Notes'] || '',
                        substituteId: row['Substitute ID'] || '',
                        isCritical: String(row['Critical']).toLowerCase() === 'true',
                        qty: parseFloat((row['Qty'] || '0').replace(/[^0-9.-]+/g,"")), 
                        minQty: parseFloat((row['Min Qty'] || '0').replace(/[^0-9.-]+/g,"")), 
                        vendor: { url: row['Vendor URL'] || '', lastPrice: parseFloat((row['Cost'] || '0').replace(/[^0-9.-]+/g,"")) },
                        media: [{ type: "image", url: row['Image URL'] || '' }]
                    };
                }).filter(p => p.sku !== '' || p.name !== '');

                if (!state.partsCatalog) state.partsCatalog = [];
                newParts.forEach(np => {
                    const existingIdx = state.partsCatalog.findIndex(p => (p.sku && p.sku === np.sku) || p.id === np.id);
                    if (existingIdx > -1) {
                        np.id = state.partsCatalog[existingIdx].id;
                        state.partsCatalog[existingIdx] = { ...state.partsCatalog[existingIdx], ...np };
                    } else { state.partsCatalog.push(np); }
                });

                StateManager.setAppData('parts', state);
                NotificationSystem.show('Parts Catalog Imported!', 'success'); 
            }});
            e.target.value = ''; 
        }
    });

    // IMPORT CSV (TRANSACTIONS)
    document.getElementById('csv-import-parts-trans').addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: function(results) {
                const newTrans = results.data.map(row => { return {
                    id: row['ID'] || crypto.randomUUID(), 
                    date: row['Date'] ? new Date(row['Date']).toISOString() : new Date().toISOString(), 
                    partId: row['Part ID'] || row['SKU'] || '',
                    type: row['Type'] || 'Stock In',
                    qtyChange: parseFloat(row['Qty Change'] || 0), 
                    oldTotal: parseFloat(row['Old Total'] || 0), 
                    newTotal: parseFloat(row['New Total'] || 0), 
                    note: row['Notes'] || ''
                };}).filter(t => t.partId !== '');
                
                if (!state.transactions) state.transactions = [];
                
                newTrans.forEach(nt => {
                    const part = state.partsCatalog.find(p => p.sku === nt.partId);
                    if (part) nt.partId = part.id;
                    if (!state.transactions.some(t => t.id === nt.id)) state.transactions.push(nt);
                });

                StateManager.setAppData('parts', state);
                NotificationSystem.show('Parts Transactions Imported!', 'success'); 
            }});
            e.target.value = ''; 
        }
    });


    // --- Advanced Scanner Logic (Html5Qrcode) ---
    const scanModal = document.getElementById('parts-scanner-modal');
    let partsHtml5QrCode = null;
    let partsTorchOn = false;

    const startBtn = document.getElementById('parts-start-scanner-btn');
    const camControls = document.getElementById('parts-camera-controls');
    const torchBtn = document.getElementById('parts-toggle-torch-btn');
    const readerDiv = document.getElementById('parts-qr-reader');
    const manualInput = document.getElementById('parts-manual-sku');

    function stopScannerEngine() {
        if (partsHtml5QrCode) {
            partsHtml5QrCode.stop().then(() => {
                partsHtml5QrCode.clear();
                partsHtml5QrCode = null;
                partsTorchOn = false;
            }).catch(e => console.warn(e));
        }
        startBtn.style.display = 'block';
        camControls.classList.add('hidden');
        document.getElementById('parts-skip-loc-btn').classList.add('hidden');
        scanModal.close();
    }

    function processScannedCode(decodedText) {
        stopScannerEngine();
        const val = decodedText.trim();

        if (scannerTarget === 'new_part_location') {
            openEditor(null);
            document.getElementById('part-edit-sku').value = pendingNewPartSku;
            document.getElementById('part-edit-loc').value = val;
            scannerTarget = 'main';
            return;
        }

        if (scannerTarget === 'location') {
            document.getElementById('part-edit-loc').value = val;
            scannerTarget = 'main';
            return;
        }

        const part = state.partsCatalog.find(p => p.id === val || p.sku === val);
        
        if (part) {
            if (isAuditMode) openAuditKeypad(part.id);
            else {
                DialogSystem.confirm("Quick Deduct", `Deduct 1 unit of ${part.name}?`).then(confirmed => {
                    if (confirmed) adjustQty(part.id, -1);
                });
            }
        } else {
            DialogSystem.confirm("Part Not Found", "Barcode not recognized. Add as new part?").then(confirmed => {
                if (confirmed) {
                    pendingNewPartSku = val;
                    scannerTarget = 'new_part_location';
                    document.getElementById('parts-scanner-title').innerText = "Scan Location Label (Optional)";
                    document.getElementById('parts-skip-loc-btn').classList.remove('hidden');
                    scanModal.showModal();
                    startScannerEngine(); 
                }
            });
        }
    }

    document.getElementById('parts-close-scanner').onclick = stopScannerEngine;
    
    document.getElementById('parts-skip-loc-btn').onclick = () => {
        stopScannerEngine();
        openEditor(null);
        document.getElementById('part-edit-sku').value = pendingNewPartSku;
        document.getElementById('part-edit-loc').value = ''; 
        scannerTarget = 'main';
    };

    manualInput.addEventListener('change', (e) => {
        if(e.target.value) {
            processScannedCode(e.target.value);
            e.target.value = '';
        }
    });

    document.getElementById('parts-scan-btn').onclick = () => {
        if (typeof Html5Qrcode === 'undefined') return NotificationSystem.show("Scanner library not loaded", "error");
        scannerTarget = 'main';
        document.getElementById('parts-scanner-title').innerText = "Scan Part Barcode";
        document.getElementById('parts-skip-loc-btn').classList.add('hidden');
        scanModal.showModal();
        manualInput.value = '';
        manualInput.focus();
    };

    document.getElementById('part-scan-loc-btn').onclick = () => {
        if (typeof Html5Qrcode === 'undefined') return NotificationSystem.show("Scanner library not loaded", "error");
        scannerTarget = 'location';
        document.getElementById('parts-scanner-title').innerText = "Scan Location Label";
        document.getElementById('parts-skip-loc-btn').classList.add('hidden');
        scanModal.showModal();
        manualInput.value = '';
        manualInput.focus();
    };

    function startScannerEngine() {
        startBtn.style.display = 'none'; 
        readerDiv.classList.remove('hidden');
        
        partsHtml5QrCode = new Html5Qrcode("parts-qr-reader");
        partsHtml5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => { processScannedCode(decodedText); },
            (err) => {}
        ).then(() => {
            camControls.classList.remove('hidden');
            partsHtml5QrCode.applyVideoConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});

            const zoomSlider = document.getElementById('parts-camera-zoom-slider');
            const zoomVal = document.getElementById('parts-zoom-val');
            zoomSlider.value = 1; zoomVal.innerText = '1.0x';

            zoomSlider.addEventListener('input', async (e) => {
                const z = parseFloat(e.target.value);
                zoomVal.innerText = z.toFixed(1) + 'x';
                try { await partsHtml5QrCode.applyVideoConstraints({ advanced: [{ zoom: z }] }); } catch(err) { }
            });
        }).catch((err) => {
            NotificationSystem.show("Camera access denied or unavailable.", "error");
            startBtn.style.display = 'block';
            readerDiv.classList.add('hidden');
            document.getElementById('parts-skip-loc-btn').classList.add('hidden');
        });
    }

    startBtn.onclick = startScannerEngine;

    torchBtn.onclick = async () => {
        if (partsHtml5QrCode && partsHtml5QrCode.getState() === 2) { 
            partsTorchOn = !partsTorchOn;
            try {
                await partsHtml5QrCode.applyVideoConstraints({ advanced: [{ torch: partsTorchOn }] });
                torchBtn.style.backgroundColor = partsTorchOn ? '#f39c12' : 'transparent';
                torchBtn.style.color = partsTorchOn ? 'white' : '#f39c12';
            } catch (err) {
                NotificationSystem.show("Flashlight not supported.", "error");
                partsTorchOn = false;
            }
        }
    };

    // Boot
    renderAreaTabs();
    renderTable();
}