// apps/parts/template.js

function renderPartsApp() {
    return `
    <style>
        .part-media-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; }
        .critical-row { background-color: rgba(231, 76, 60, 0.1) !important; border-left: 4px solid var(--danger-color); }
        .audit-row-danger { color: var(--danger-color); font-weight: bold; }
        .low-stock-text { color: #f39c12; font-weight: bold; }
        .qty-btn { padding: 4px 10px; font-size: 1.1rem; font-weight: bold; border-radius: 4px; }
        
        #parts-scanner-modal::backdrop { background: rgba(0,0,0,0.85); }
        .audit-key { font-size: 1.5rem; padding: 15px; font-weight: bold; border-radius: var(--radius-md); background: var(--bg-base); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; }
        .audit-key:active { background: var(--accent-primary); color: white; }
        
        /* Print Styles */
        .parts-print-only { display: none !important; }
        .parts-no-print { display: block; }
        
        @media print {
            #global-header, #bento-menu, .parts-no-print { display: none !important; }
            #app-container { height: auto !important; overflow: visible !important; padding: 0 !important; }
            
            .parts-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
            
            /* QR Label Specific Print */
            #parts-print-container { display: flex !important; flex-wrap: wrap; gap: 20px; }
            .bin-label { width: 2in; height: 2in; border: 2px dashed #000; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-inside: avoid; }
            .bin-label img { max-width: 1.2in; max-height: 1.2in; margin-bottom: 5px; }
            .bin-label-title { font-size: 0.8rem; font-weight: bold; overflow: hidden; max-height: 2.4em; }
            .bin-label-sku { font-size: 0.7rem; color: #333; }

            /* Report Table Specific Print */
            table.app-table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px; }
            table.app-table th, table.app-table td { border: 1px solid black !important; padding: 8px !important; color: black !important; text-align: left; }
        }
    </style>

    <div id="parts-wrapper" style="max-width: 1200px; margin: 0 auto;" class="parts-no-print">
        
        <div class="app-toolbar" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
                <h2 style="color: var(--accent-primary); margin: 0;">⚙️ Parts Database</h2>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="parts-scan-btn" class="btn-primary">📷 Quick Scan</button>
                    <button id="parts-add-btn" class="btn-outline">+ Add Part</button>
                    <button id="parts-manage-areas-btn" class="btn-outline">⚙️ Manage Areas</button>
                </div>
            </div>

            <div class="parts-tab-container" style="display: flex; gap: 10px; flex-wrap: wrap; width: 100%;">
                <button class="parts-main-tab btn-primary" data-target="database" style="flex: 1; min-width: 110px;">📦 Database</button>
                <button class="parts-main-tab btn-outline" data-target="audit" style="flex: 1; min-width: 110px;">📋 Audit Mode</button>
                <button class="parts-main-tab btn-outline" data-target="print" style="flex: 1; min-width: 110px;">🖨️ Print Labels</button>
                <button class="parts-main-tab btn-outline" data-target="kits" style="flex: 1; min-width: 110px;">🧰 Kits</button>
                <button class="parts-main-tab btn-outline" data-target="reports" style="flex: 1; min-width: 110px;">📊 Reports & Data</button>
            </div>
        </div>

        <div id="parts-view-database" class="app-card parts-no-print">
            <div id="parts-area-tabs" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--accent-primary);"></div>
            
            <div id="parts-table-container" class="app-table-container">
                <table class="app-table">
                    <thead>
                        <tr>
                            <th id="parts-print-col-header" style="width: 40px; display: none; text-align: center;"></th>
                            <th style="width: 70px;">Img</th>
                            <th>Part Info</th>
                            <th>Location</th>
                            <th style="text-align: center;">Stock</th>
                            <th id="parts-actions-header" style="text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="parts-table-body"></tbody>
                </table>
            </div>

            <div id="parts-print-action-bar" style="display: none; background: rgba(0,0,0,0.05); padding: 15px; border-radius: var(--radius-md); margin-top: 15px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 300px;">
                        <input type="text" id="print-custom-loc-input" class="app-input" placeholder="e.g. Shop, Shelf 1, Bin 3" style="margin: 0;">
                        <button id="parts-print-loc-btn" class="btn-outline" style="white-space: nowrap;">🖨️ Print Location Label</button>
                    </div>
                    <button id="parts-execute-print-btn" class="btn-primary">🖨️ Generate Selected Part Labels</button>
                </div>
            </div>
        </div>

        <div id="parts-view-kits" class="app-card parts-no-print" style="display: none;">
            <div style="padding: 15px; border-bottom: 1px solid var(--border-color); text-align: right;">
                <button id="parts-create-kit-btn" class="btn-primary">+ Create New Kit</button>
            </div>
            <div class="app-table-container">
                <table class="app-table">
                    <thead><tr><th>Kit Name</th><th>Parts Included</th><th style="text-align: center;">Action</th></tr></thead>
                    <tbody id="parts-kits-body"></tbody>
                </table>
            </div>
        </div>

        <div id="parts-view-reports" class="parts-no-print" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div class="app-card">
                    <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Parts Usage & Audit Report</h3>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; align-items: flex-end;">
                        <div style="flex: 1; min-width: 150px;">
                            <label>Start Date</label>
                            <input type="date" id="parts-report-start" class="app-input" style="margin-bottom: 0;">
                        </div>
                        <div style="flex: 1; min-width: 150px;">
                            <label>End Date</label>
                            <input type="date" id="parts-report-end" class="app-input" style="margin-bottom: 0;">
                        </div>
                        <button id="parts-generate-report-btn" class="btn-primary" style="flex: 1; min-width: 150px; padding: 11px;">📊 Generate Report</button>
                    </div>
                    
                    <div id="parts-report-print-controls" class="hidden" style="display: flex; gap: 10px; margin-bottom: 20px; background: rgba(0,0,0,0.03); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                        <button id="btn-print-summary" class="btn-outline" style="flex: 1;">🖨️ Print Summary Only</button>
                        <button id="btn-print-log" class="btn-outline" style="flex: 1;">🖨️ Print Details Only</button>
                        <button id="btn-print-full" class="btn-primary" style="flex: 1;">🖨️ Print Full Report</button>
                    </div>

                    <div id="parts-report-results"></div>
                </div>

                <div class="app-card">
                    <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Database Sync & Backup</h3>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                        <input type="file" id="csv-import-parts" accept=".csv" class="hidden">
                        <button class="btn-outline" style="flex: 1; min-width: 200px;" onclick="document.getElementById('csv-import-parts').click()">📥 Import Parts (CSV)</button>
                        
                        <input type="file" id="csv-import-parts-trans" accept=".csv" class="hidden">
                        <button class="btn-outline" style="flex: 1; min-width: 200px;" onclick="document.getElementById('csv-import-parts-trans').click()">📥 Import Trans (CSV)</button>
                    </div>

                    <h4 style="margin-top: 20px; margin-bottom: 10px;">Full Parts Sync (JSON)</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.85rem;">Export or merge complete parts state (catalog, areas, kits, and transactions) to sync across devices.</p>
                    
                    <button id="export-parts-json-btn" class="btn-primary" style="width: 100%; margin-bottom: 10px;">⬇️ Export Parts Sync File (.json)</button>
                    
                    <input type="file" id="import-parts-json-file" accept=".json" class="hidden">
                    <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: var(--accent-primary); color: var(--accent-primary);" onclick="document.getElementById('import-parts-json-file').click()">🔄 Merge Sync File (.json)</button>
                </div>
            </div>
        </div>

        <dialog id="parts-editor-modal" style="width: 95%; max-width: 600px;">
            <div class="modal-header"><h3 id="parts-editor-title">Add / Edit Part</h3><button id="parts-close-editor" class="icon-btn">❌</button></div>
            <div class="modal-body">
                <input type="hidden" id="part-edit-id">
                <label>Part Name</label><input type="text" id="part-edit-name" class="app-input" placeholder="e.g., Sloan Valve Rebuild Kit">
                
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;"><label>Vendor SKU / Barcode</label><input type="text" id="part-edit-sku" class="app-input"></div>
                    <div style="flex: 1;"><label>Substitute Part ID</label><input type="text" id="part-edit-sub" class="app-input" placeholder="Leave blank if none"></div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;"><label>Current Qty</label><input type="number" id="part-edit-qty" class="app-input"></div>
                    <div style="flex: 1;"><label>Min Reorder Qty</label><input type="number" id="part-edit-min" class="app-input"></div>
                </div>

                <label>Shop Location (Shelf/Bin)</label>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="part-edit-loc" class="app-input" placeholder="e.g., Shop, Shelf 1, Bin 3" style="margin-bottom: 0;">
                    <button type="button" id="part-scan-loc-btn" class="btn-outline">📷 Scan</button>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 2;"><label>Vendor URL</label><input type="text" id="part-edit-vendor-url" class="app-input" placeholder="https://..."></div>
                    <div style="flex: 1;"><label>Last Price ($)</label><input type="number" step="0.01" id="part-edit-vendor-price" class="app-input"></div>
                </div>

                <label>Part Notes / Description</label>
                <textarea id="part-edit-notes" class="app-input" rows="2" placeholder="Where it goes, what it connects to, or kit associations..."></textarea>

                <label>Image URL</label>
                <input type="text" id="part-edit-img" class="app-input" placeholder="Optional image link">

                <div style="margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.03); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <label style="font-weight: bold; color: var(--danger-color); display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="part-edit-critical" style="width: 20px; height: 20px;"> 
                        CRITICAL PART (Triggers dashboard warning at 0 qty)
                    </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
                    <h4 style="margin: 0;">Tag to Areas</h4>
                    <div style="display: flex; gap: 5px;">
                        <input type="text" id="part-edit-new-area" class="app-input" placeholder="Quick Add Area" style="margin: 0; width: 150px; font-size: 0.85rem; padding: 5px;">
                        <button type="button" id="part-edit-add-area-btn" class="btn-outline" style="padding: 5px 10px; font-size: 0.85rem;">+</button>
                    </div>
                </div>
                
                <div id="part-edit-area-tags" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; max-height: 150px; overflow-y: auto; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;"></div>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="part-save-btn" class="btn-primary" style="flex: 2;">💾 Save Part</button>
                    <button id="part-delete-btn" class="btn-danger" style="flex: 1;">🗑️ Delete</button>
                </div>
            </div>
        </dialog>

        <dialog id="parts-kit-modal" style="width: 95%; max-width: 500px;">
            <div class="modal-header"><h3>Build Kit</h3><button id="parts-close-kit-editor" class="icon-btn">❌</button></div>
            <div class="modal-body">
                <input type="hidden" id="kit-edit-id">
                <label>Kit Name</label><input type="text" id="kit-edit-name" class="app-input" placeholder="e.g., Toilet Rebuild Kit">
                <div style="margin-top: 15px; border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: 10px;">Add Part to Kit</h4>
                    <div style="display: flex; gap: 10px;">
                        <select id="kit-part-select" class="app-select" style="flex: 2; margin-bottom: 0;"></select>
                        <input type="number" id="kit-part-qty" class="app-input" value="1" style="flex: 1; margin-bottom: 0;">
                        <button id="kit-add-part-btn" class="btn-outline">+</button>
                    </div>
                </div>
                <h4 style="margin-top: 20px;">Parts Included:</h4>
                <div id="kit-parts-list" style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 20px; background: rgba(0,0,0,0.02); padding: 10px; border-radius: 4px;"></div>
                <div style="display: flex; gap: 10px;">
                    <button id="kit-save-btn" class="btn-primary" style="flex: 2;">💾 Save Kit</button>
                    <button id="kit-delete-btn" class="btn-danger" style="flex: 1;">🗑️ Delete</button>
                </div>
            </div>
        </dialog>

        <dialog id="parts-audit-modal" style="width: 90%; max-width: 350px; text-align: center;">
            <div class="modal-header"><h3>Audit Mode</h3><button id="parts-close-audit" class="icon-btn">❌</button></div>
            <div class="modal-body">
                <h4 id="audit-target-name" style="margin-bottom: 5px; color: var(--accent-primary);"></h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Enter exact physical stock in bin</p>
                <input type="hidden" id="audit-target-id">
                <input type="text" id="audit-input-display" class="app-input" readonly style="font-size: 2rem; text-align: center; height: 60px; margin-bottom: 15px;">
                <input type="text" id="audit-note-input" class="app-input" placeholder="Reason for discrepancy (Optional)" style="margin-bottom: 15px;">
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <button class="audit-key" data-val="1">1</button><button class="audit-key" data-val="2">2</button><button class="audit-key" data-val="3">3</button>
                    <button class="audit-key" data-val="4">4</button><button class="audit-key" data-val="5">5</button><button class="audit-key" data-val="6">6</button>
                    <button class="audit-key" data-val="7">7</button><button class="audit-key" data-val="8">8</button><button class="audit-key" data-val="9">9</button>
                    <button class="audit-key" data-val="C" style="background: var(--danger-color); color: white; border-color: var(--danger-color);">C</button>
                    <button class="audit-key" data-val="0">0</button>
                    <button class="audit-key" data-val="E" style="background: var(--accent-primary); color: white; border-color: var(--accent-primary);">ENT</button>
                </div>
            </div>
        </dialog>

        <dialog id="parts-area-modal">
            <div class="modal-header"><h3>Manage Park Areas</h3><button id="parts-close-area" class="icon-btn">❌</button></div>
            <div class="modal-body">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="parts-new-area-name" class="app-input" placeholder="New Area Name" style="margin:0;">
                    <button id="parts-add-area-btn" class="btn-primary">+ Add</button>
                </div>
                <div id="parts-area-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        </dialog>

        <dialog id="parts-scanner-modal" style="width: 95%; max-width: 500px; padding: 0; border: 1px solid var(--border-color);">
            <div class="modal-header" style="border-radius: 12px 12px 0 0; padding: 15px 20px;">
                <h3 style="margin: 0;" id="parts-scanner-title">Scan Barcode</h3>
                <button id="parts-close-scanner" class="btn-danger" style="padding: 5px 12px; font-size: 1rem;">X</button>
            </div>
            <div class="modal-body" style="padding: 20px; text-align: center;">
                <input type="text" id="parts-manual-sku" class="app-input" placeholder="Type data manually and hit Enter..." style="font-size: 1.1rem; text-align: center; margin-bottom: 20px;">
                <div id="parts-camera-controls" class="hidden" style="margin-bottom: 15px; padding: 15px; background: rgba(0,0,0,0.02); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <button type="button" id="parts-toggle-torch-btn" class="btn-outline" style="width: 100%; margin-bottom: 15px; border-color: #f39c12; color: #f39c12;">🔦 Toggle Flashlight</button>
                    <label style="display:flex; justify-content: space-between; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">Camera Zoom: <span id="parts-zoom-val">1.0x</span></label>
                    <input type="range" id="parts-camera-zoom-slider" min="1" max="5" step="0.1" value="1" style="width: 100%; cursor: pointer;">
                </div>
                <div id="parts-qr-reader" style="width: 100%; margin: 0 auto 10px auto;"></div>
                
                <button id="parts-start-scanner-btn" class="btn-outline" style="width: 100%; margin-bottom: 10px;">📷 Start Camera Scanner</button>
                <button id="parts-skip-loc-btn" class="btn-outline hidden" style="width: 100%; margin-bottom: 10px;">⏭️ Skip Location Scan</button>
            </div>
        </dialog>

    </div>

    <div id="parts-print-container" class="parts-print-only"></div>
    <div id="parts-report-print-stage" class="parts-print-only"></div>
    `;
}