// apps/inventory/template.js

function renderInventoryApp() {
    return `
    <style>
        /* App-Specific Styling */
        #inv-wrapper { max-width: 1200px; margin: 0 auto; }
        #inv-stage { margin-top: 20px; }
        
        /* Mobile-friendly flex column layout */
        .inv-split-layout { display: flex; flex-direction: column; gap: 20px; }
        
        /* Functional States */
        .inv-row-danger { background-color: rgba(231, 76, 60, 0.1) !important; }
        .inv-row-warning { background-color: rgba(243, 156, 18, 0.1) !important; }
        
        /* Thumbnail Styling */
        .inv-media-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; }
        
        .inv-print-only { display: none !important; }
        .inv-no-print { display: block; }
        
        @media print {
            #global-header, #bento-menu, .inv-no-print, .inv-tab-container, #inv-add-item-btn { display: none !important; }
            #app-container { height: auto !important; overflow: visible !important; padding: 0 !important; }
            #inv-wrapper { width: 100%; margin: 0 !important; padding: 0 !important; border: none !important; }
            .inv-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
            table.app-table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px; }
            table.app-table th, table.app-table td { border: 1px solid black !important; padding: 8px !important; color: black !important; font-size: 0.9rem !important; text-align: left; }
        }
    </style>

    <div id="inv-wrapper" class="inv-no-print">
        
        <div class="app-toolbar inv-no-print" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <h2 style="color: var(--accent-primary); margin: 0;">📦 Inventory Manager</h2>
                <button id="inv-add-item-btn" class="btn-primary">+ Add New Item</button>
            </div>
            
            <div class="inv-tab-container" style="display: flex; gap: 10px; flex-wrap: wrap; width: 100%;">
                <button class="inv-tab btn-primary" data-target="dashboard" style="flex: 1; min-width: 130px;">📦 Dashboard</button>
                <button class="inv-tab btn-outline" data-target="transactions" style="flex: 1; min-width: 130px;">📝 Transactions</button>
                <button class="inv-tab btn-outline" data-target="audit" style="flex: 1; min-width: 130px;">🔍 Audit Scanner</button>
                <button class="inv-tab btn-outline" data-target="reports" style="flex: 1; min-width: 130px;">📊 Reports & Data</button>
            </div>
            
        </div>

        <div id="inv-stage">
            </div>

        <dialog id="inv-add-modal">
            <div class="modal-header">
                <h3>Add New Master Item</h3>
                <button id="close-inv-add" class="icon-btn">❌</button>
            </div>
            <form id="inv-add-form" class="modal-body">
                <label>SKU (Barcode Value)</label><input type="text" id="new-sku" class="app-input" placeholder="e.g., 1002345" required>
                <label>Item Name</label><input type="text" id="new-name" class="app-input" placeholder="e.g., General Purpose Rope" required>
                
                <label>Category (Dropdown/Editable)</label>
                <input type="text" id="new-cat" class="app-input" list="inv-master-categories" placeholder="e.g., General Supplies">
                <datalist id="inv-master-categories"></datalist>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: -10px; margin-bottom: 10px;">To manage the master list, go to the 'Reports & Data' tab.</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><label>Storage Location</label><input type="text" id="new-loc" class="app-input" placeholder="e.g., Shed A, Bin 3"></div>
                    <div><label>Vendor Item ID</label><input type="text" id="new-vendor" class="app-input" placeholder="Store ID / MPN"></div>
                </div>
                
                <label>Vendor Web Link (URL)</label>
                <input type="url" id="new-vendor-url" class="app-input" placeholder="https://www.vendor.com/item...">

                <label>Image URL</label>
                <input type="url" id="new-img" class="app-input" placeholder="Optional image link">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; margin-top: 15px;">
                    <div><label>Target Quantity (Pars)</label><input type="number" id="new-target" class="app-input" placeholder="100" required></div>
                    <div><label>Reorder Level (Low Stock)</label><input type="number" id="new-reorder" class="app-input" placeholder="25" required></div>
                </div>
                
                <label>Estimated Unit Cost ($)</label><input type="number" id="new-cost" class="app-input" placeholder="4.50" step="0.01">
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="submit" class="btn-primary" style="width: 100%;">💾 Save to Master List</button>
                </div>
            </form>
        </dialog>

        <dialog id="inv-edit-modal">
            <div class="modal-header">
                <h3>Edit Item Details</h3>
                <button id="close-inv-edit" class="icon-btn">❌</button>
            </div>
            <form id="inv-edit-form" class="modal-body">
                <label>SKU (Barcode Value - Read Only)</label><input type="text" id="edit-sku" class="app-input" readonly style="background-color: rgba(0,0,0,0.1); cursor: not-allowed;">
                <label>Item Name</label><input type="text" id="edit-name" class="app-input" required>
                
                <label>Category</label>
                <input type="text" id="edit-cat" class="app-input" list="inv-master-categories-edit">
                <datalist id="inv-master-categories-edit"></datalist>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><label>Storage Location</label><input type="text" id="edit-loc" class="app-input"></div>
                    <div><label>Vendor Item ID</label><input type="text" id="edit-vendor" class="app-input"></div>
                </div>
                
                <label>Vendor Web Link (URL)</label>
                <input type="url" id="edit-vendor-url" class="app-input" placeholder="https://www.vendor.com/item...">

                <label>Image URL</label>
                <input type="url" id="edit-img" class="app-input" placeholder="Optional image link">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; margin-top: 15px;">
                    <div><label>Target Quantity (Pars)</label><input type="number" id="edit-target" class="app-input" required></div>
                    <div><label>Reorder Level (Low Stock)</label><input type="number" id="edit-reorder" class="app-input" required></div>
                </div>
                
                <label>Estimated Unit Cost ($)</label><input type="number" id="edit-cost" class="app-input" step="0.01">
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" id="delete-inv-item-btn" class="btn-danger" style="flex: 1;">🗑️ Delete Item</button>
                    <button type="submit" class="btn-primary" style="flex: 2;">💾 Update Item</button>
                </div>
            </form>
        </dialog>
    </div>
    
    <div id="inv-print-stage" class="inv-print-only"></div>
    `;
}