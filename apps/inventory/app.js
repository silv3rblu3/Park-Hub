// apps/inventory/app.js

function initInventoryLogic() {
    let invData = StateManager.getAppData('inventory');
    
    if (!invData.items || !invData.categories) {
        invData = { 
            items: [], 
            transactions: [],
            categories: [
                "General Supplies",
                "Plumbing",
                "Electrical",
                "Camping Gear",
                "Medical",
                "Fishing Gear",
                "Kitchen"
            ],
            shoppingState: {}
        };
        StateManager.setAppData('inventory', invData);
    }
    
    // Ensure shopping state object exists for legacy data
    if (!invData.shoppingState) invData.shoppingState = {};

    const safeSave = () => { StateManager.setAppData('inventory', invData); };

    // --- Core Logic ---
    const getCurrentQty = (sku) => {
        let qty = 0;
        const itemTrans = invData.transactions.filter(t => t.sku === sku);
        itemTrans.forEach(t => {
            if (t.type === 'Stock In') qty += parseFloat(t.quantity);
            else if (t.type === 'Stock Out') qty -= parseFloat(t.quantity);
            else if (t.type === 'Audit Correction') qty = parseFloat(t.quantity); 
        });
        return qty;
    };

    const addTransaction = (type, sku, quantity, notes) => {
        const item = invData.items.find(i => i.sku === sku);
        if (!item) return false;
        
        const currentQty = getCurrentQty(sku);
        const qtyNum = parseFloat(quantity);
        let newTotal = currentQty;
        
        if (type === 'Stock In') {
            newTotal += qtyNum;
            if (invData.shoppingState[sku]) invData.shoppingState[sku] = false;
        }
        else if (type === 'Stock Out') newTotal -= qtyNum;
        else if (type === 'Audit Correction') {
            newTotal = qtyNum;
            if (newTotal >= Number(item.targetQty) && invData.shoppingState[sku]) {
                invData.shoppingState[sku] = false;
            }
        }

        invData.transactions.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            sku: sku, 
            type: type,
            quantity: qtyNum,
            newTotal: newTotal,
            actualUnitCost: Number(item.unitCost) || 0,
            notes: notes || ''
        });
        safeSave(); return true;
    };

    // --- Image Lightbox Listener ---
    document.getElementById('inv-stage').addEventListener('click', (e) => {
        if (e.target.classList.contains('inv-media-thumb') && e.target.tagName === 'IMG') {
            document.getElementById('inv-lightbox-img').src = e.target.src;
            document.getElementById('inv-lightbox-modal').showModal();
        }
    });
    
    document.getElementById('inv-close-lightbox').addEventListener('click', () => {
        document.getElementById('inv-lightbox-modal').close();
    });

    // --- Tab Routing ---
    const tabs = document.querySelectorAll('.inv-tab');
    const stage = document.getElementById('inv-stage');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
            e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
            renderInvView(e.target.getAttribute('data-target'));
        });
    });

    populateCategoryDatalist();

    function populateCategoryDatalist() {
        ['inv-master-categories', 'inv-master-categories-edit'].forEach(id => {
            const dl = document.getElementById(id);
            if (dl) {
                dl.innerHTML = '';
                invData.categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    dl.appendChild(option);
                });
            }
        });
    }

    // State trackers for specific tools
    let pendingAuditSku = null;
    let html5QrCode = null;
    let qrExportTimer = null;
    let isExportingQR = false;
    let torchOn = false;

    function renderInvView(viewName) {
        stage.innerHTML = '';
        
        // Clean up scanners/timers universally on view swap
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
            }).catch(err => console.error("Scanner clear failed", err));
        }
        if (qrExportTimer) {
            clearTimeout(qrExportTimer);
            qrExportTimer = null;
        }
        isExportingQR = false; // Kill switch for QR generation

        if (viewName !== 'reports') populateCategoryDatalist();

        if (viewName === 'dashboard') {
            let html = `
            <div class="app-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">Main Dashboard</h3>
                    <input type="text" id="inv-search" class="app-input" placeholder="Search SKU or Name..." style="max-width: 300px; margin: 0;">
                </div>
                <div class="app-table-container">
                    <table class="app-table">
                        <thead><tr><th>Actions</th><th style="width: 70px; text-align: center;">Img</th><th>SKU</th><th>Vendor Item ID</th><th>Item Name</th><th>Category</th><th>Location</th><th>Qty on Hand</th><th>Reorder Level</th><th>Target Qty</th></tr></thead>
                        <tbody id="inv-dash-body">`;
            
            if (invData.items.length === 0) { 
                html += `<tr><td colspan="10" style="text-align:center;">No items found. Import a CSV or add manually.</td></tr>`; 
            } else {
                // Sort array by Category first, then by SKU
                let sortedItems = [...invData.items].sort((a, b) => {
                    const catA = (a.category || 'Uncategorized').toLowerCase();
                    const catB = (b.category || 'Uncategorized').toLowerCase();
                    
                    if (catA < catB) return -1;
                    if (catA > catB) return 1;
                    
                    const skuA = String(a.sku || '').toLowerCase();
                    const skuB = String(b.sku || '').toLowerCase();
                    
                    if (skuA < skuB) return -1;
                    if (skuA > skuB) return 1;
                    return 0;
                });

                sortedItems.forEach(item => {
                    const qty = getCurrentQty(item.sku);
                    const target = Number(item.targetQty) || 0;
                    const reorder = Number(item.reorderLevel) || 0;
                    
                    let rowClass = '';
                    if (qty <= 0) rowClass = 'inv-row-danger';
                    else if (qty <= reorder) rowClass = 'inv-row-warning';

                    let vUrl = item.vendorUrl || '';
                    if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                    const vendorHtml = vUrl 
                        ? `<a href="${vUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: underline; font-weight: bold;">${item.vendorId || 'Web Link'}</a>` 
                        : `<span style="color: var(--text-secondary);">${item.vendorId || '--'}</span>`;

                    const imgHtml = item.imageUrl 
                        ? `<img src="${item.imageUrl}" class="inv-media-thumb">` 
                        : `<div class="inv-media-thumb" style="display:flex; align-items:center; justify-content:center; background:#eee; color:#999; font-size:0.8rem;">No Img</div>`;

                    html += `<tr class="${rowClass}">
                                <td><button class="btn-outline inv-edit-btn" data-sku="${item.sku}" style="padding: 4px 8px; font-size: 0.8rem;">✏️ Edit</button></td>
                                <td>${imgHtml}</td>
                                <td><strong>${item.sku}</strong></td>
                                <td style="font-size: 0.85rem;">${vendorHtml}</td>
                                <td>${item.name}</td><td>${item.category || ''}</td><td>${item.location || ''}</td>
                                <td style="font-size: 1.1rem; font-weight: bold;">${qty}</td><td>${reorder}</td><td>${target}</td>
                             </tr>`;
                });
            }
            html += `</tbody></table></div></div>`;
            stage.innerHTML = html;

            document.getElementById('inv-search').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#inv-dash-body tr');
                rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
            });

            document.querySelectorAll('.inv-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sku = e.target.getAttribute('data-sku');
                    const item = invData.items.find(i => i.sku === sku);
                    if (!item) return;

                    document.getElementById('edit-sku').value = item.sku;
                    document.getElementById('edit-name').value = item.name;
                    document.getElementById('edit-cat').value = item.category || '';
                    document.getElementById('edit-loc').value = item.location || '';
                    document.getElementById('edit-vendor').value = item.vendorId || '';
                    document.getElementById('edit-vendor-url').value = item.vendorUrl || '';
                    document.getElementById('edit-img').value = item.imageUrl || '';
                    document.getElementById('edit-reorder').value = item.reorderLevel;
                    document.getElementById('edit-target').value = item.targetQty;
                    document.getElementById('edit-cost').value = item.unitCost || 0;

                    document.getElementById('inv-edit-modal').showModal();
                });
            });
        }
        else if (viewName === 'shopping') {
            const itemsToOrder = invData.items.filter(i => {
                const target = Number(i.targetQty) || 0;
                const currentQty = getCurrentQty(i.sku);
                return target > 0 && currentQty < target;
            });

            let html = `
            <div class="app-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; color: var(--accent-primary);">🛒 Automated Shopping List</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">Items below Target Qty are listed automatically. Mark as 'Ordered' when purchased.</p>
                    </div>
                    <button id="inv-print-shopping-btn" class="btn-outline">🖨️ Print Shopping List</button>
                </div>
                
                <div class="app-table-container">
                    <table class="app-table" id="inv-shopping-table">
                        <thead><tr>
                            <th style="width: 80px; text-align: center;">Ordered?</th>
                            <th style="width: 70px; text-align: center;">Img</th>
                            <th>SKU</th>
                            <th>Item Name</th>
                            <th>Vendor Link</th>
                            <th style="text-align: center;">Current Qty</th>
                            <th style="text-align: center;">Target Qty</th>
                            <th style="text-align: center; color: var(--danger-color);">Qty to Order</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Total Price</th>
                        </tr></thead>
                        <tbody>`;
            
            if (itemsToOrder.length === 0) {
                html += `<tr><td colspan="10" style="text-align:center; padding: 20px;">All items are at or above Target Qty!</td></tr>`;
                html += `</tbody></table></div></div>`;
            } else {
                let grandTotal = 0;
                itemsToOrder.forEach(item => {
                    const targetQty = Number(item.targetQty) || 0;
                    const currentQty = getCurrentQty(item.sku);
                    const qtyToOrder = targetQty - currentQty;
                    const isOrdered = invData.shoppingState[item.sku] === true;
                    
                    const unitPrice = Number(item.unitCost) || 0;
                    const totalPrice = qtyToOrder * unitPrice;
                    grandTotal += totalPrice;
                    
                    const imgHtml = item.imageUrl 
                        ? `<img src="${item.imageUrl}" class="inv-media-thumb">` 
                        : `<div class="inv-media-thumb" style="display:flex; align-items:center; justify-content:center; background:#eee; color:#999; font-size:0.8rem;">No Img</div>`;

                    let vUrl = item.vendorUrl || '';
                    if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                    const vendorHtml = vUrl 
                        ? `<a href="${vUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: underline; font-weight: bold;">${item.vendorId || 'Buy Link'}</a>` 
                        : `<span style="color: var(--text-secondary);">${item.vendorId || '--'}</span>`;

                    html += `<tr class="${isOrdered ? 'row-ordered' : ''}">
                                <td style="text-align: center;">
                                    <input type="checkbox" class="inv-shopping-cb" data-sku="${item.sku}" style="width: 25px; height: 25px; cursor: pointer;" ${isOrdered ? 'checked' : ''}>
                                </td>
                                <td>${imgHtml}</td>
                                <td><strong>${item.sku}</strong></td>
                                <td>${item.name}</td>
                                <td>${vendorHtml}</td>
                                <td style="text-align: center; font-size: 1.1rem;">${currentQty}</td>
                                <td style="text-align: center; color: var(--text-secondary);">${targetQty}</td>
                                <td style="text-align: center; font-size: 1.2rem; font-weight: bold; color: var(--danger-color);">${qtyToOrder}</td>
                                <td style="text-align: right;">$${unitPrice.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: bold;">$${totalPrice.toFixed(2)}</td>
                             </tr>`;
                });
                html += `</tbody>
                <tfoot>
                    <tr style="background-color: rgba(0,0,0,0.05); border-top: 2px solid var(--border-color);">
                        <td colspan="9" style="text-align: right; font-weight: bold; font-size: 1.1rem; padding: 15px;">Estimated Shopping Total:</td>
                        <td style="text-align: right; font-weight: bold; color: var(--danger-color); font-size: 1.1rem; padding: 15px;">$${grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
                </table></div></div>`;
            }
            stage.innerHTML = html;

            document.querySelectorAll('.inv-shopping-cb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const sku = e.target.getAttribute('data-sku');
                    invData.shoppingState[sku] = e.target.checked;
                    safeSave();
                    
                    const row = e.target.closest('tr');
                    if (e.target.checked) row.classList.add('row-ordered');
                    else row.classList.remove('row-ordered');
                });
            });

            const printBtn = document.getElementById('inv-print-shopping-btn');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    const printStage = document.getElementById('inv-print-stage');
                    
                    let cleanTableHtml = `<table class="app-table">
                        <thead><tr><th>SKU</th><th>Img</th><th>Item Name</th><th>Vendor Link</th><th style="text-align:center;">Current Qty</th><th style="text-align:center;">Target Qty</th><th style="text-align:center;">Qty to Order</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total Price</th></tr></thead><tbody>`;
                    
                    let pGrandTotal = 0;
                    itemsToOrder.forEach(item => {
                        const targetQty = Number(item.targetQty) || 0;
                        const currentQty = getCurrentQty(item.sku);
                        const qtyToOrder = targetQty - currentQty;
                        const isOrdered = invData.shoppingState[item.sku] === true;
                        
                        const unitPrice = Number(item.unitCost) || 0;
                        const totalPrice = qtyToOrder * unitPrice;
                        pGrandTotal += totalPrice;
                        
                        const orderMarker = isOrdered ? ` <strong style="color: green;">[ORDERED]</strong>` : '';
                        const printImgHtml = item.imageUrl ? `<img src="${item.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 'No Img';
                        
                        let vUrl = item.vendorUrl || '';
                        if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                        const printVendorHtml = vUrl ? `<a href="${vUrl}" target="_blank" rel="noopener noreferrer" style="color: blue; text-decoration: underline;">${item.vendorId || 'Buy Link'}</a>` : (item.vendorId || '--');

                        cleanTableHtml += `
                            <tr>
                                <td><strong>${item.sku}</strong></td>
                                <td>${printImgHtml}</td>
                                <td>${item.name}${orderMarker}</td>
                                <td>${printVendorHtml}</td>
                                <td style="text-align: center;">${currentQty}</td>
                                <td style="text-align: center;">${targetQty}</td>
                                <td style="text-align: center; font-weight: bold;">${qtyToOrder}</td>
                                <td style="text-align: right;">$${unitPrice.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: bold;">$${totalPrice.toFixed(2)}</td>
                            </tr>`;
                    });
                    
                    cleanTableHtml += `</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="8" style="text-align: right; font-weight: bold; font-size: 1.1rem; padding: 10px;">Estimated Shopping Total:</td>
                            <td style="text-align: right; font-weight: bold; font-size: 1.1rem; padding: 10px;">$${pGrandTotal.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                    </table>`;

                    printStage.innerHTML = `
                        <div style="margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
                            <h2 style="margin-bottom: 5px;">Inventory Shopping List</h2>
                            <p style="font-size: 1.1rem;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        ${cleanTableHtml}
                    `;
                    window.print();
                });
            }
        }
        else if (viewName === 'transactions') {
            let html = `
            <div class="inv-split-layout">
                <div class="app-card">
                    <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Log New Transaction</h3>
                    <form id="inv-trans-form">
                        <div style="display: flex; gap: 15px; margin-bottom: 15px; font-weight: bold;">
                            <label><input type="radio" name="t-type" value="Stock In" checked> Stock In (+)</label>
                            <label><input type="radio" name="t-type" value="Stock Out"> Stock Out (-)</label>
                        </div>
                        <label>Item (SKU)</label>
                        <select id="t-sku" class="app-select" required><option value="">Select an Item...</option>
                            ${invData.items.map(i => `<option value="${i.sku}">[${i.sku}] ${i.name}</option>`).join('')}
                        </select>
                        <label>Quantity</label><input type="number" id="t-qty" class="app-input" min="1" required>
                        <label>Notes</label><textarea id="t-notes" class="app-input" rows="2"></textarea>
                        <button type="submit" class="btn-primary" style="width: 100%;">Submit Transaction</button>
                    </form>
                </div>
                
                <div class="app-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="margin: 0;">Transaction Log</h3>
                        <input type="text" id="inv-trans-search" class="app-input" placeholder="Search Item, SKU, Category..." style="max-width: 300px; margin: 0;">
                    </div>
                    <div class="app-table-container" style="max-height: 500px; overflow-y: auto;">
                        <table class="app-table">
                            <thead><tr><th>Date</th><th>Type</th><th>SKU</th><th>Item Name</th><th>Category</th><th style="text-align: right;">Change</th><th style="text-align: right;">Total Stock</th></tr></thead>
                            <tbody id="inv-trans-body">`;
            
            const recent = [...invData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 300);
            if (recent.length === 0) { html += `<tr><td colspan="7" style="text-align:center;">No recent transactions.</td></tr>`; } 
            else {
                recent.forEach(t => {
                    const item = invData.items.find(i => i.sku === t.sku) || {};
                    const iName = item.name || 'Unknown';
                    const iCat = item.category || '--';
                    
                    let qtyStyle = '';
                    if (t.type === 'Stock Out') qtyStyle = 'color: var(--danger-color);';
                    else if (t.type === 'Stock In') qtyStyle = 'color: var(--accent-primary);';

                    let qtyPrefix = t.type === 'Audit Correction' ? 'To ' : (t.type === 'Stock In' ? '+' : '-');

                    html += `<tr>
                                <td>${new Date(t.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                                <td>${t.type}</td>
                                <td><strong>${t.sku}</strong></td>
                                <td>${iName}</td>
                                <td style="font-size: 0.85rem; color: var(--text-secondary);">${iCat}</td>
                                <td style="text-align: right;"><strong style="${qtyStyle}">${qtyPrefix}${t.quantity}</strong></td>
                                <td style="text-align: right; font-weight: bold; font-size: 1.1rem;">${t.newTotal !== undefined ? t.newTotal : '--'}</td>
                             </tr>`;
                });
            }
            html += `</tbody></table></div></div></div>`;
            stage.innerHTML = html;

            document.getElementById('inv-trans-search').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#inv-trans-body tr');
                rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
            });

            document.getElementById('inv-trans-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const type = document.querySelector('input[name="t-type"]:checked').value;
                if (addTransaction(type, document.getElementById('t-sku').value, document.getElementById('t-qty').value, document.getElementById('t-notes').value)) {
                    NotificationSystem.show('Transaction Saved', 'success'); renderInvView('transactions');
                }
            });
        }
        else if (viewName === 'audit') {
            stage.innerHTML = `
            <div class="app-card" style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h3 style="margin-bottom: 15px;">Inventory Audit Scanner</h3>
                <input type="text" id="audit-manual-sku" class="app-input" placeholder="Type SKU manually and hit Enter..." style="font-size: 1.2rem; text-align: center; margin-bottom: 20px;">
                
                <div id="camera-controls" style="display: none; margin-bottom: 15px; padding: 15px; background: rgba(0,0,0,0.02); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <button type="button" id="toggle-torch-btn" class="btn-outline" style="width: 100%; margin-bottom: 15px; border-color: #f39c12; color: #f39c12;">🔦 Toggle Flashlight</button>
                    
                    <label style="display:flex; justify-content: space-between; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">Camera Zoom: <span id="zoom-val">1x</span></label>
                    <input type="range" id="camera-zoom-slider" min="1" max="5" step="0.1" value="1" style="width: 100%; cursor: pointer;">
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px;">Use zoom if the camera won't focus closely on the barcode.</p>
                </div>
                
                <div id="reader" style="width: 100%; margin: 0 auto 20px auto;"></div>
                <button id="start-scanner" class="btn-outline" style="width: 100%; margin-bottom: 20px;">📷 Start Camera Scanner</button>
                
                <div id="audit-form-area" style="display: none; background: rgba(0,0,0,0.03); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--accent-primary);">
                    <h2 id="audit-item-name" style="color: var(--accent-primary); margin-bottom: 10px;">Item Name</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 5px;">SKU: <strong id="audit-sku-lbl"></strong></p>
                    <p style="font-size: 1.1rem; margin-bottom: 15px;">System Qty: <strong id="audit-sys-qty"></strong></p>
                    <form id="audit-process-form">
                        <input type="hidden" id="audit-hidden-sku">
                        <label style="font-weight: bold;">Actual Physical Count:</label>
                        <input type="number" id="audit-phys-qty" class="app-input" style="font-size: 1.5rem; text-align: center; width: 60%; margin: 10px auto;" required>
                        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                            <button type="button" id="cancel-audit-btn" class="btn-outline">Cancel</button>
                            <button type="submit" class="btn-primary">Save Correction</button>
                        </div>
                    </form>
                </div>
            </div>`;

            const startBtn = document.getElementById('start-scanner');
            const camControls = document.getElementById('camera-controls');
            const torchBtn = document.getElementById('toggle-torch-btn');
            const formArea = document.getElementById('audit-form-area');
            const readerDiv = document.getElementById('reader');

            const loadAuditItem = (sku) => {
                const item = invData.items.find(i => i.sku === sku);
                
                if (!item) {
                    if (html5QrCode) { 
                        html5QrCode.stop().then(() => {
                            html5QrCode.clear(); 
                            html5QrCode = null;
                            torchOn = false;
                        }).catch(err => console.log(err)); 
                        startBtn.style.display = 'block'; 
                    }
                    readerDiv.style.display = 'none';
                    startBtn.style.display = 'none';
                    camControls.style.display = 'none';
                    
                    DialogSystem.confirm("Barcode Not Found", `The SKU [${sku}] isn't in your master list. Do you want to add it now?`)
                    .then(confirm => {
                        if (confirm) {
                            document.getElementById('new-sku').value = sku;
                            document.getElementById('inv-add-modal').showModal();
                        } else {
                            document.getElementById('audit-manual-sku').value = '';
                            startBtn.style.display = 'block';
                        }
                    });
                    return;
                }
                
                if (html5QrCode) { 
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear(); 
                        html5QrCode = null;
                        torchOn = false;
                    }).catch(err => console.log(err)); 
                    startBtn.style.display = 'block'; 
                }
                
                document.getElementById('audit-item-name').innerText = item.name;
                document.getElementById('audit-sku-lbl').innerText = item.sku;
                document.getElementById('audit-sys-qty').innerText = getCurrentQty(sku);
                document.getElementById('audit-hidden-sku').value = item.sku;
                document.getElementById('audit-phys-qty').value = '';
                
                readerDiv.style.display = 'none'; 
                startBtn.style.display = 'none';
                camControls.style.display = 'none';
                formArea.style.display = 'block';
                document.getElementById('audit-phys-qty').focus();
            };

            document.getElementById('audit-manual-sku').addEventListener('change', (e) => loadAuditItem(e.target.value.toUpperCase()));

            startBtn.addEventListener('click', () => {
                startBtn.style.display = 'none'; 
                readerDiv.style.display = 'block';
                
                html5QrCode = new Html5Qrcode("reader");
                html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => { loadAuditItem(decodedText.trim().toUpperCase()); },
                    (err) => {}
                ).then(() => {
                    camControls.style.display = 'block';
                    html5QrCode.applyVideoConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});

                    const zoomSlider = document.getElementById('camera-zoom-slider');
                    const zoomVal = document.getElementById('zoom-val');
                    zoomSlider.addEventListener('input', async (e) => {
                        const z = parseFloat(e.target.value);
                        zoomVal.innerText = z.toFixed(1) + 'x';
                        try {
                            await html5QrCode.applyVideoConstraints({ advanced: [{ zoom: z }] });
                        } catch(err) { }
                    });

                }).catch((err) => {
                    NotificationSystem.show("Camera access denied or rear camera unavailable.", "error");
                    startBtn.style.display = 'block';
                    readerDiv.style.display = 'none';
                });
            });

            torchBtn.addEventListener('click', async () => {
                if (html5QrCode) { 
                    torchOn = !torchOn;
                    try {
                        await html5QrCode.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
                        torchBtn.style.backgroundColor = torchOn ? '#f39c12' : 'transparent';
                        torchBtn.style.color = torchOn ? 'white' : '#f39c12';
                    } catch (err) {
                        try {
                            await html5QrCode.applyVideoConstraints({ torch: torchOn });
                            torchBtn.style.backgroundColor = torchOn ? '#f39c12' : 'transparent';
                            torchBtn.style.color = torchOn ? 'white' : '#f39c12';
                        } catch (err2) {
                            NotificationSystem.show("Flashlight not supported by this camera/browser.", "error");
                            torchOn = false;
                        }
                    }
                }
            });

            document.getElementById('cancel-audit-btn').addEventListener('click', () => {
                formArea.style.display = 'none'; 
                readerDiv.style.display = 'block'; 
                startBtn.style.display = 'block';
                document.getElementById('audit-manual-sku').value = '';
            });

            document.getElementById('audit-process-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const sku = document.getElementById('audit-hidden-sku').value;
                const physical = parseFloat(document.getElementById('audit-phys-qty').value);
                const sysQty = getCurrentQty(sku);
                const discrepancy = physical - sysQty;

                if (discrepancy > 0) {
                    addTransaction('Stock In', sku, discrepancy, `Audit scan (System said ${sysQty}, Physical was ${physical})`);
                    NotificationSystem.show('Audit: Stock In Logged', 'success');
                } else if (discrepancy < 0) {
                    addTransaction('Stock Out', sku, Math.abs(discrepancy), `Audit scan (System said ${sysQty}, Physical was ${physical})`);
                    NotificationSystem.show('Audit: Stock Out Logged', 'success');
                } else if (discrepancy === 0) {
                    addTransaction('Audit Correction', sku, physical, `Verified Count: Matched expected system stock.`);
                    NotificationSystem.show('Count verified and logged.', 'success');
                }
                
                formArea.style.display = 'none'; 
                readerDiv.style.display = 'block'; 
                startBtn.style.display = 'block'; 
                document.getElementById('audit-manual-sku').value = '';
            });

            if (pendingAuditSku) {
                const skuToLoad = pendingAuditSku;
                pendingAuditSku = null;
                setTimeout(() => loadAuditItem(skuToLoad), 100); 
            }
        }
        else if (viewName === 'reports') {
            
            const todayStr = new Date().toISOString().split('T')[0];
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            const lastYearStr = lastYear.toISOString().split('T')[0];

            stage.innerHTML = `
            <div class="inv-split-layout">
                
                <div class="app-card inv-no-print" style="padding: 0; overflow: hidden; border-left: 4px solid var(--accent-primary);">
                    <div class="accordion-header" style="padding: 15px; cursor: pointer; background: var(--bg-surface); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">📊 Yearly Usage & Spend Report</h3>
                        <span class="acc-icon" style="font-weight: bold; font-size: 1.2rem;">▼</span>
                    </div>
                    <div class="accordion-content" style="display: none; padding: 15px; border-top: 1px solid var(--border-color);">
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">Define a date range to calculate total item usage and financial restocking cost.</p>
                        
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; align-items: flex-end;">
                            <div style="flex: 1; min-width: 150px;">
                                <label style="font-weight: bold; font-size: 0.9rem;">Start Date</label>
                                <input type="date" id="report-start" class="app-input" value="${lastYearStr}" style="margin-bottom: 0;">
                            </div>
                            <div style="flex: 1; min-width: 150px;">
                                <label style="font-weight: bold; font-size: 0.9rem;">End Date</label>
                                <input type="date" id="report-end" class="app-input" value="${todayStr}" style="margin-bottom: 0;">
                            </div>
                            <button id="generate-report-btn" class="btn-primary" style="flex: 1; min-width: 150px; padding: 11px;">📊 Generate Report</button>
                        </div>
                        
                        <div id="inv-report-print-controls" style="display: none; gap: 10px; margin-bottom: 20px; background: rgba(0,0,0,0.03); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                            <button id="btn-inv-print-summary" class="btn-outline" style="flex: 1;">🖨️ Print Summary Only</button>
                            <button id="btn-inv-print-log" class="btn-outline" style="flex: 1;">🖨️ Print Details Only</button>
                            <button id="btn-inv-print-full" class="btn-primary" style="flex: 1;">🖨️ Print Full Report</button>
                        </div>

                        <div id="report-results-container" class="app-table-container" style="display: none; margin-top: 20px; max-height: 500px; overflow-y: auto; padding-right: 5px;"></div>
                    </div>
                </div>

                <div class="app-card inv-no-print" style="padding: 0; overflow: hidden; border-left: 4px solid var(--accent-primary);">
                    <div class="accordion-header" style="padding: 15px; cursor: pointer; background: var(--bg-surface); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">🔄 Database Sync & Backup</h3>
                        <span class="acc-icon" style="font-weight: bold; font-size: 1.2rem;">▼</span>
                    </div>
                    <div class="accordion-content" style="display: none; padding: 15px; border-top: 1px solid var(--border-color);">
                        
                        <h4 style="margin-bottom: 10px;">Import / Export CSV</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                            <input type="file" id="csv-import-items" accept=".csv" style="display:none;">
                            <button class="btn-outline" style="flex: 1; min-width: 200px;" onclick="document.getElementById('csv-import-items').click()">📥 Import Items (CSV)</button>
                            
                            <input type="file" id="csv-import-trans" accept=".csv" style="display:none;">
                            <button class="btn-outline" style="flex: 1; min-width: 200px;" onclick="document.getElementById('csv-import-trans').click()">📥 Import Trans (CSV)</button>
                        </div>

                        <h4 style="margin-top: 20px; margin-bottom: 10px;">QR Code Data Transfer</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.85rem;">Use a second device to scan and transfer your inventory database completely offline.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                            <button id="inv-export-qr-btn" class="btn-primary" style="padding: 12px; font-size: 1.05rem;">📲 Generate QR Sync Stream</button>
                            <div id="inv-qr-export-container" style="display: none; flex-direction: column; align-items: center; padding: 15px; background: white; border-radius: var(--radius-md); border: 2px solid var(--accent-primary);">
                                <div id="inv-qr-canvas" style="width: 200px; height: 200px; display: flex; justify-content: center; align-items: center;"></div>
                                <p id="inv-qr-export-status" style="margin-top: 15px; font-weight: bold; color: var(--accent-primary);">Initializing...</p>
                                <button id="inv-qr-export-stop" class="btn-danger" style="margin-top: 10px; width: 100%;">Stop Transmission</button>
                            </div>

                            <button id="inv-import-qr-btn" class="btn-primary" style="padding: 12px; font-size: 1.05rem;">📷 Scan QR to Import</button>
                            <div id="inv-qr-import-container" style="display: none; flex-direction: column; gap: 10px;">
                                <div id="inv-qr-reader" style="width: 100%; min-height: 250px; background: #000; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--accent-primary);"></div>
                                <div style="text-align: center; font-weight: bold; color: var(--accent-primary);">
                                    <span id="inv-qr-import-status">Waiting for stream...</span>
                                    <progress id="inv-qr-import-progress" value="0" max="100" style="width: 100%; height: 10px; margin-top: 5px;"></progress>
                                </div>
                                <button id="inv-qr-import-stop" class="btn-danger" style="width: 100%;">Stop Scanner</button>
                            </div>
                        </div>

                        <h4 style="margin-top: 20px; margin-bottom: 10px;">Full Inventory Sync (JSON)</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.85rem;">Export or merge complete inventory state (items, categories, and transactions) using a physical file.</p>
                        
                        <button id="export-inv-json-btn" class="btn-outline" style="width: 100%; margin-bottom: 10px;">⬇️ Export Inventory Sync File (.json)</button>
                        
                        <input type="file" id="import-inv-json-file" accept=".json" style="display:none;">
                        <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: var(--accent-primary); color: var(--accent-primary);" onclick="document.getElementById('import-inv-json-file').click()">🔄 Merge Sync File (.json)</button>
                    </div>
                </div>
                
                <div class="app-card inv-no-print" style="padding: 0; overflow: hidden; border-left: 4px solid var(--accent-primary);">
                    <div class="accordion-header" style="padding: 15px; cursor: pointer; background: var(--bg-surface); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">⚙️ Category Manager</h3>
                        <span class="acc-icon" style="font-weight: bold; font-size: 1.2rem;">▼</span>
                    </div>
                    <div class="accordion-content" style="display: none; padding: 15px; border-top: 1px solid var(--border-color);">
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">Add or soft-delete categories in the master list. Soft-deleted categories won't appear in the dropdown but existing items are unaffected.</p>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                            <input type="text" id="new-master-cat" class="app-input" placeholder="New category name..." style="flex: 2; min-width: 200px; margin-bottom: 0;">
                            <button id="add-master-cat" class="btn-primary" style="flex: 1; min-width: 150px;">+ Add to Master</button>
                        </div>
                        
                        <div class="app-table-container" style="max-height: 250px; overflow-y: auto;">
                            <table class="app-table">
                                <thead><tr><th>Active Master Categories</th><th style="width: 50px; text-align: center;">⚙️</th></tr></thead>
                                <tbody>
                                    ${invData.categories.map((cat, index) => `
                                        <tr>
                                            <td>${cat}</td>
                                            <td style="text-align: center;">
                                                <button class="btn-danger delete-master-cat" data-index="${index}" style="padding: 2px 6px; font-size: 0.8rem;">X</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;

            // Accordion Logic
            document.querySelectorAll('.accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const content = header.nextElementSibling;
                    const icon = header.querySelector('.acc-icon');
                    if (content.style.display === 'none' || content.style.display === '') {
                        content.style.display = 'block';
                        icon.innerText = '▲';
                    } else {
                        content.style.display = 'none';
                        icon.innerText = '▼';
                    }
                });
            });

            // Report Generator Logic
            document.getElementById('generate-report-btn').addEventListener('click', () => {
                const startStr = document.getElementById('report-start').value;
                const endStr = document.getElementById('report-end').value;
                
                if(!startStr || !endStr) return NotificationSystem.show("Please select both dates", "error");
                
                const startDate = new Date(startStr);
                const endDate = new Date(endStr);
                endDate.setHours(23, 59, 59, 999); 

                const usageStats = {};
                invData.items.forEach(i => {
                    usageStats[i.sku] = { 
                        name: i.name, 
                        category: i.category || 'Uncategorized',
                        currentQty: getCurrentQty(i.sku),
                        added: 0, 
                        used: 0,
                        totalSpend: 0 
                    };
                });

                let hasLogs = false;
                const groupedTxns = {};

                invData.transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= startDate && tDate <= endDate && usageStats[t.sku]) {
                        hasLogs = true;
                        if (!groupedTxns[t.sku]) groupedTxns[t.sku] = [];
                        groupedTxns[t.sku].push(t);
                        
                        if (usageStats[t.sku]) {
                            const qty = parseFloat(t.quantity);
                            if (t.type === 'Stock In') {
                                usageStats[t.sku].added += qty;
                                const cost = t.actualUnitCost || invData.items.find(i => i.sku === t.sku)?.unitCost || 0;
                                usageStats[t.sku].totalSpend += (qty * cost);
                            }
                            if (t.type === 'Stock Out') {
                                usageStats[t.sku].used += qty;
                            }
                        }
                    }
                });

                let summaryHtml = `
                <div id="inv-report-section-summary">
                    <h4 style="margin-bottom: 10px; color: var(--accent-primary);">Acquisition & Burn Summary</h4>
                    <table class="app-table" style="margin-bottom: 30px;">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th style="text-align: center;">Used (-)</th>
                                <th style="text-align: center;">Added (+)</th>
                                <th style="text-align: right;">Total Spend</th>
                                <th style="text-align: center;">Current Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                let hasSummary = false;
                let grandTotalSpend = 0;

                for (const sku in usageStats) {
                    if (usageStats[sku].added > 0 || usageStats[sku].used > 0) {
                        hasSummary = true;
                        grandTotalSpend += usageStats[sku].totalSpend;
                        
                        summaryHtml += `
                            <tr>
                                <td><strong>${sku}</strong></td>
                                <td>${usageStats[sku].name}</td>
                                <td style="font-size: 0.85rem; color: var(--text-secondary);">${usageStats[sku].category}</td>
                                <td style="color: var(--danger-color); font-weight: bold; text-align: center;">${usageStats[sku].used > 0 ? '-' + usageStats[sku].used : 0}</td>
                                <td style="color: var(--accent-primary); font-weight: bold; text-align: center;">${usageStats[sku].added > 0 ? '+' + usageStats[sku].added : 0}</td>
                                <td style="text-align: right;">$${usageStats[sku].totalSpend.toFixed(2)}</td>
                                <td style="text-align: center; font-weight: bold;">${usageStats[sku].currentQty}</td>
                            </tr>
                        `;
                    }
                }

                if (!hasSummary) {
                    summaryHtml += `<tr><td colspan="7" style="text-align: center;">No inventory activity found in this date range.</td></tr>`;
                }
                
                summaryHtml += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: rgba(0,0,0,0.05); border-top: 2px solid var(--border-color);">
                                <td colspan="5" style="text-align: right; font-weight: bold; font-size: 1.1rem;">Grand Total Spend:</td>
                                <td style="text-align: right; font-weight: bold; color: var(--danger-color); font-size: 1.1rem;">$${grandTotalSpend.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>`;


                let logHtml = `<div id="inv-report-section-log"><h4 style="margin-bottom: 10px; color: var(--accent-primary);">Detailed Audit & Transaction Log</h4>`;
                
                if (!hasLogs) {
                    logHtml += `<p style="text-align:center;">No activity in this date range.</p></div>`;
                } else {
                    for (const sku in groupedTxns) {
                        const item = invData.items.find(i => i.sku === sku);
                        const iName = item ? item.name : 'Deleted Item';
                        const iCat = item ? (item.category || 'Uncategorized') : '--';
                        const currentQty = getCurrentQty(sku);
                        
                        logHtml += `
                        <div style="margin-bottom: 20px; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                            <div style="background: var(--bg-surface); padding: 10px; border-bottom: 2px solid var(--accent-primary); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="font-size: 1.1rem;">${iName}</strong><br>
                                    <span style="font-size: 0.85rem; color: var(--text-secondary);">SKU: ${sku} | Category: ${iCat}</span>
                                </div>
                            </div>
                            <table class="app-table" style="margin: 0; border: none; border-radius: 0;">
                                <thead><tr><th>Date</th><th>Type</th><th style="text-align:center;">Change</th><th style="text-align:center;">Stock at Time</th><th>Notes</th></tr></thead>
                                <tbody>
                        `;
                        
                        groupedTxns[sku].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(txn => {
                            const dateFmt = new Date(txn.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                            const isAudit = txn.type === 'Audit Correction';
                            const rowClass = isAudit ? 'inv-row-danger' : '';
                            let changeText = isAudit ? `To ${txn.quantity}` : (txn.type === 'Stock In' ? `+${txn.quantity}` : `-${txn.quantity}`);
                            
                            logHtml += `<tr class="${rowClass}">
                                <td>${dateFmt}</td>
                                <td>${txn.type}</td>
                                <td style="text-align:center; font-weight:bold;">${changeText}</td>
                                <td style="text-align:center; font-size: 1.1rem;"><strong>${txn.newTotal !== undefined ? txn.newTotal : '--'}</strong></td>
                                <td style="font-size: 0.85rem;">${txn.notes || '--'}</td>
                            </tr>`;
                        });
                        
                        logHtml += `
                                </tbody>
                                <tfoot>
                                    <tr style="background-color: rgba(0,0,0,0.02);">
                                        <td colspan="5" style="text-align: right; padding: 10px;">
                                            <strong>Current Stock for ${iName}: <span style="color: var(--accent-primary); font-size: 1.2rem; margin-left: 10px;">${currentQty}</span></strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>`;
                    }
                    logHtml += `</div>`;
                }

                const resultsContainer = document.getElementById('report-results-container');
                resultsContainer.innerHTML = summaryHtml + logHtml;
                resultsContainer.style.display = 'block';
                document.getElementById('inv-report-print-controls').style.display = 'flex';
            });

            // Target Printing Logic
            function executeInvReportPrint(mode) {
                const start = document.getElementById('report-start').value;
                const end = document.getElementById('report-end').value;
                const sumEl = document.getElementById('inv-report-section-summary');
                const logEl = document.getElementById('inv-report-section-log');
                
                if(!sumEl || !logEl) return;
                
                let content = '';
                if (mode === 'summary') content = sumEl.outerHTML;
                else if (mode === 'log') content = logEl.outerHTML;
                else content = sumEl.outerHTML + '<br>' + logEl.outerHTML;

                const printStage = document.getElementById('inv-print-stage');
                printStage.innerHTML = `
                    <div style="margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
                        <h2 style="margin-bottom: 5px;">Inventory Usage & Spend Report</h2>
                        <p style="font-size: 1.1rem;"><strong>Date Range:</strong> ${start} to ${end}</p>
                    </div>
                    ${content}
                `;
                window.print();
            }

            document.getElementById('btn-inv-print-summary').onclick = () => executeInvReportPrint('summary');
            document.getElementById('btn-inv-print-log').onclick = () => executeInvReportPrint('log');
            document.getElementById('btn-inv-print-full').onclick = () => executeInvReportPrint('full');

            // --- QR EXPORT LOGIC ---
            const exportBtn = document.getElementById('inv-export-qr-btn');
            const exportContainer = document.getElementById('inv-qr-export-container');
            const exportCanvas = document.getElementById('inv-qr-canvas');
            const exportStatus = document.getElementById('inv-qr-export-status');
            const exportStop = document.getElementById('inv-qr-export-stop');

            exportBtn.addEventListener('click', () => {
                if (typeof QRCode === 'undefined') { alert("ERROR: QRCode generation library missing."); return; }
                
                const chunks = StateManager.generateQRChunks('inventory');
                if (chunks.length === 0) return NotificationSystem.show("No data to export", "error");

                exportBtn.style.display = 'none';
                exportContainer.style.display = 'flex';
                
                let currentFrame = 0;
                isExportingQR = true; // Engage kill switch variable
                
                setTimeout(() => {
                    const renderFrame = () => {
                        // Bail out immediately if user clicked Stop
                        if (!isExportingQR) return; 

                        exportCanvas.innerHTML = ''; 
                        new QRCode(exportCanvas, {
                            text: chunks[currentFrame],
                            width: 200, height: 200,
                            colorDark: "#000000", colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.L
                        });
                        
                        exportStatus.innerText = `Transmitting: Frame ${currentFrame + 1} of ${chunks.length}`;
                        
                        currentFrame++;
                        if (currentFrame >= chunks.length) currentFrame = 0; 
                        
                        // Recursive Timeout: Wait 800ms AFTER generation finishes
                        qrExportTimer = setTimeout(renderFrame, 800); 
                    };

                    renderFrame();
                }, 100); 
            });

            exportStop.addEventListener('click', () => {
                isExportingQR = false; // Trigger kill switch
                if (qrExportTimer) clearTimeout(qrExportTimer);
                exportContainer.style.display = 'none';
                exportBtn.style.display = 'block';
            });

            // --- QR IMPORT LOGIC ---
            const importBtn = document.getElementById('inv-import-qr-btn');
            const importContainer = document.getElementById('inv-qr-import-container');
            const importStatus = document.getElementById('inv-qr-import-status');
            const importProgress = document.getElementById('inv-qr-import-progress');
            const importStop = document.getElementById('inv-qr-import-stop');

            const stopImport = () => {
                if (html5QrCode) {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        html5QrCode = null;
                    }).catch(e => console.log(e));
                }
                importContainer.style.display = 'none';
                importBtn.style.display = 'block';
            };

            importStop.addEventListener('click', stopImport);

            importBtn.addEventListener('click', () => {
                if (typeof Html5Qrcode === 'undefined') { alert("ERROR: Html5Qrcode scanner library missing."); return; }
                
                importBtn.style.display = 'none';
                importContainer.style.display = 'flex';
                importProgress.value = 0;
                importStatus.innerText = "Initializing camera...";

                setTimeout(() => {
                    html5QrCode = new Html5Qrcode("inv-qr-reader");
                    let localBuffer = [];
                    let totalExpected = 0;
                    let scannedIndices = new Set();

                    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
                        if (decodedText.startsWith("PMH|inventory|")) {
                            const parts = decodedText.split('|');
                            if (parts.length >= 5) {
                                const idx = parseInt(parts[2]);
                                totalExpected = parseInt(parts[3]);
                                const data = parts.slice(4).join('|');

                                importProgress.max = totalExpected;

                                if (!scannedIndices.has(idx)) {
                                    scannedIndices.add(idx);
                                    localBuffer[idx - 1] = data; 
                                    
                                    importProgress.value = scannedIndices.size;
                                    const pct = Math.round((scannedIndices.size / totalExpected) * 100);
                                    importStatus.innerText = `Captured: ${pct}%`;
                                }

                                if (scannedIndices.size === totalExpected) {
                                    html5QrCode.stop().then(() => {
                                        html5QrCode.clear();
                                        html5QrCode = null;
                                        importContainer.style.display = 'none';
                                        importBtn.style.display = 'block';

                                        const assembledString = localBuffer.join('');
                                        localBuffer = [];
                                        scannedIndices.clear();

                                        DialogSystem.confirm(`Merge Inventory Data?`, `All data chunks captured successfully. Click OK to safely MERGE this data into your device.`).then(proceed => {
                                            if (proceed) {
                                                try {
                                                    const importedData = JSON.parse(assembledString);
                                                    if (!importedData.items || !importedData.transactions || !importedData.categories) throw new Error("Invalid inventory sync format.");

                                                    importedData.categories.forEach(cat => { if (!invData.categories.includes(cat)) invData.categories.push(cat); });
                                                    importedData.items.forEach(importedItem => {
                                                        const existingIndex = invData.items.findIndex(i => i.sku === importedItem.sku);
                                                        if (existingIndex > -1) invData.items[existingIndex] = { ...invData.items[existingIndex], ...importedItem };
                                                        else invData.items.push(importedItem);
                                                    });
                                                    importedData.transactions.forEach(importedTx => {
                                                        if (!invData.transactions.some(t => t.id === importedTx.id)) invData.transactions.push(importedTx);
                                                    });
                                                    safeSave();
                                                    NotificationSystem.show('Inventory Data Merged Successfully', 'success');
                                                    renderInvView('reports'); 
                                                } catch (err) { 
                                                    NotificationSystem.show('Import Failed: Invalid Data', 'error'); 
                                                }
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    }, undefined).catch((err) => {
                        alert("Camera access denied or unavailable.");
                        stopImport();
                    });
                }, 100);
            });


            document.getElementById('export-inv-json-btn').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(invData, null, 2));
                const anchor = document.createElement('a');
                anchor.setAttribute("href", dataStr); 
                anchor.setAttribute("download", `PMH_Inventory_Sync_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(anchor); 
                anchor.click(); 
                anchor.remove();
                NotificationSystem.show('Inventory Sync File Exported', 'success');
            });

            document.getElementById('import-inv-json-file').addEventListener('change', async (e) => {
                if(e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const confirm = await DialogSystem.confirm("Merge Inventory Data?", "This will sync the uploaded file with your current data. It updates existing items, adds new items, and merges transaction logs without creating duplicates. Proceed?");
                    
                    if (confirm) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const importedData = JSON.parse(event.target.result);
                                if (!importedData.items || !importedData.transactions || !importedData.categories) {
                                    throw new Error("Invalid inventory sync format.");
                                }

                                importedData.categories.forEach(cat => {
                                    if (!invData.categories.includes(cat)) {
                                        invData.categories.push(cat);
                                    }
                                });

                                importedData.items.forEach(importedItem => {
                                    const existingIndex = invData.items.findIndex(i => i.sku === importedItem.sku);
                                    if (existingIndex > -1) {
                                        invData.items[existingIndex] = { ...invData.items[existingIndex], ...importedItem };
                                    } else {
                                        invData.items.push(importedItem);
                                    }
                                });

                                importedData.transactions.forEach(importedTx => {
                                    if (!invData.transactions.some(t => t.id === importedTx.id)) {
                                        invData.transactions.push(importedTx);
                                    }
                                });

                                safeSave();
                                NotificationSystem.show('Inventory Data Merged Successfully', 'success');
                                renderInvView('reports'); 
                            } catch (err) { 
                                NotificationSystem.show('Import Failed: Invalid JSON file', 'error'); 
                            }
                        }; 
                        reader.readAsText(file);
                    }
                    e.target.value = ''; 
                }
            });

            document.getElementById('csv-import-items').addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: function(results) {
                        const newItems = results.data.map(row => { return {
                            sku: row['SKU'] || '', name: row['Item Name'] || '', vendor: row['Vendor'] || '', desc: row['Description'] || '', category: row['Category'] || '', location: row['Location'] || '', vendorId: row['Vendor Item ID'] || '', vendorUrl: row['Vendor URL'] || '', imageUrl: row['Image URL'] || '',
                            unitCost: parseFloat((row['Unit Cost'] || '0').replace(/[^0-9.-]+/g,"")), reorderLevel: parseInt(row['Reorder Level'] || 0), targetQty: parseInt(row['Target Qty'] || 0)
                        };}).filter(i => i.sku !== '');
                        invData.items = newItems; safeSave();
                        NotificationSystem.show('Master Items Imported!', 'success'); renderInvView('reports');
                    }});
                    e.target.value = ''; 
                }
            });

            document.getElementById('csv-import-trans').addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: function(results) {
                        const newTrans = results.data.map(row => { return {
                            id: crypto.randomUUID(), date: row['Date'] ? new Date(row['Date']).toISOString() : new Date().toISOString(), sku: row['SKU'] || '', type: row['Type'] || 'Stock In',
                            quantity: parseFloat(row['Quantity'] || 0), actualUnitCost: parseFloat((row['Unit Cost (Actual)'] || '0').replace(/[^0-9.-]+/g,"")), notes: row['Notes'] || ''
                        };}).filter(t => t.sku !== '');
                        invData.transactions = newTrans; safeSave();
                        NotificationSystem.show('Transactions Imported!', 'success'); renderInvView('reports');
                    }});
                    e.target.value = ''; 
                }
            });

            document.getElementById('add-master-cat').addEventListener('click', () => {
                const name = document.getElementById('new-master-cat').value.trim();
                if (name && !invData.categories.includes(name)) {
                    invData.categories.push(name);
                    safeSave();
                    NotificationSystem.show(`'${name}' added to master list.`, 'success');
                    renderInvView('reports');
                } else if (name) {
                    NotificationSystem.show(`Category '${name}' already exists.`, 'error');
                }
            });

            document.querySelectorAll('.delete-master-cat').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    DialogSystem.confirm("Confirm Soft-Delete", `Are you sure you want to remove '${invData.categories[index]}' from the master list? Existing items will keep this category staticly, but it won't appear in the 'Add Item' dropdown.`)
                    .then(confirm => {
                        if (confirm) {
                            invData.categories.splice(index, 1);
                            safeSave();
                            renderInvView('reports');
                        }
                    });
                });
            });
        }
    }

    // --- Modal Logic (Add & Edit & Delete) ---
    const addModal = document.getElementById('inv-add-modal');
    document.getElementById('inv-add-item-btn').addEventListener('click', () => addModal.showModal());
    document.getElementById('close-inv-add').addEventListener('click', () => addModal.close());
    
    document.getElementById('inv-add-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const sku = document.getElementById('new-sku').value.toUpperCase();
        if(invData.items.find(i => i.sku === sku)) return NotificationSystem.show('SKU already exists!', 'error');
        
        invData.items.push({
            sku: sku, name: document.getElementById('new-name').value, category: document.getElementById('new-cat').value, location: document.getElementById('new-loc').value, vendorId: document.getElementById('new-vendor').value, vendorUrl: document.getElementById('new-vendor-url').value, imageUrl: document.getElementById('new-img').value,
            reorderLevel: parseFloat(document.getElementById('new-reorder').value), targetQty: parseFloat(document.getElementById('new-target').value), unitCost: parseFloat(document.getElementById('new-cost').value)
        });
        
        safeSave(); 
        e.target.reset(); 
        addModal.close(); 
        NotificationSystem.show('Item Added to Master List', 'success');
        
        const activeTab = document.querySelector('.inv-tab.btn-primary').getAttribute('data-target');
        if (activeTab === 'audit') {
            pendingAuditSku = sku;
            renderInvView('audit'); 
        } else {
            renderInvView(activeTab); 
        }
    });

    const editModal = document.getElementById('inv-edit-modal');
    document.getElementById('close-inv-edit').addEventListener('click', () => editModal.close());

    document.getElementById('inv-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const sku = document.getElementById('edit-sku').value; 
        
        const existingIndex = invData.items.findIndex(i => i.sku === sku);
        if (existingIndex > -1) {
            invData.items[existingIndex] = {
                ...invData.items[existingIndex], 
                name: document.getElementById('edit-name').value, 
                category: document.getElementById('edit-cat').value, 
                location: document.getElementById('edit-loc').value, 
                vendorId: document.getElementById('edit-vendor').value,
                vendorUrl: document.getElementById('edit-vendor-url').value,
                imageUrl: document.getElementById('edit-img').value,
                reorderLevel: parseFloat(document.getElementById('edit-reorder').value), 
                targetQty: parseFloat(document.getElementById('edit-target').value), 
                unitCost: parseFloat(document.getElementById('edit-cost').value)
            };
            
            safeSave(); 
            editModal.close(); 
            NotificationSystem.show('Item Details Updated', 'success');
            
            const activeTab = document.querySelector('.inv-tab.btn-primary').getAttribute('data-target');
            renderInvView(activeTab); 
        } else {
            NotificationSystem.show('Critical Error: SKU not found for update.', 'error');
        }
    });

    document.getElementById('delete-inv-item-btn').addEventListener('click', async () => {
        const sku = document.getElementById('edit-sku').value;
        const confirmed = await DialogSystem.confirm("Delete Item", `Are you sure you want to completely remove [${sku}] from the master list? This cannot be undone.`);
        if (confirmed) {
            const existingIndex = invData.items.findIndex(i => i.sku === sku);
            if (existingIndex > -1) {
                invData.items.splice(existingIndex, 1);
                safeSave();
                editModal.close();
                NotificationSystem.show('Item Deleted', 'success');
                const activeTab = document.querySelector('.inv-tab.btn-primary').getAttribute('data-target');
                renderInvView(activeTab);
            }
        }
    });

    // Boot
    renderInvView('dashboard');
}