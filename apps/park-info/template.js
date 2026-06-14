// apps/park-info/template.js

function renderParkInfoApp() {
    return `
    <style>
        #parkinfo-wrapper { max-width: 1200px; margin: 0 auto; }
        .info-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm); }
        .info-link-item { display: flex; flex-direction: column; padding: 15px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 10px; background: rgba(0,0,0,0.02); }
        .info-link-title { font-size: 1.1rem; font-weight: bold; margin-bottom: 5px; color: var(--accent-primary); text-decoration: none; }
        .info-link-title:hover { text-decoration: underline; }
        .info-link-desc { font-size: 0.9rem; color: var(--text-secondary); }
        
        .part-media-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; transition: transform 0.1s; }
        .part-media-thumb:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10; position: relative; }

        .pi-print-only { display: none !important; }
        .pi-no-print { display: block; }
        
        @media print {
            #global-header, #bento-menu, .pi-no-print, .pi-tab-container { display: none !important; }
            #app-container { height: auto !important; overflow: visible !important; padding: 0 !important; }
            .pi-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
            table.app-table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px; }
            table.app-table th, table.app-table td { border: 1px solid black !important; padding: 8px !important; color: black !important; font-size: 0.9rem !important; text-align: left; }
        }
    </style>

    <div id="parkinfo-wrapper" class="pi-no-print">
        
        <div class="app-toolbar" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <h2 style="color: var(--accent-primary); margin: 0;">🌲 Park Info & Resources</h2>
            </div>
            
            <div class="pi-tab-container" style="display: flex; gap: 10px; flex-wrap: wrap; width: 100%;">
                <button class="pi-tab btn-primary" data-target="emergency" style="flex: 1; min-width: 120px;">🚨 Emergency / SOPs</button>
                <button class="pi-tab btn-outline" data-target="forms" style="flex: 1; min-width: 120px;">📄 Forms & Docs</button>
                <button class="pi-tab btn-outline" data-target="links" style="flex: 1; min-width: 120px;">🔗 Park Links</button>
                <button class="pi-tab btn-outline" data-target="parts" style="flex: 1; min-width: 120px;">⚙️ Master Parts List</button>
                <button class="pi-tab btn-outline" data-target="fleet" style="flex: 1; min-width: 120px;">🛻 Park Fleet</button>
            </div>
        </div>

        <div id="pi-stage"></div>

        <!-- Dynamic Universal Forms Modal -->
        <dialog id="pi-form-modal" style="width: 95%; max-width: 500px;">
            <div class="modal-header">
                <h3 id="pi-form-title">Add Blank Form</h3>
                <button id="close-pi-form" class="icon-btn">❌</button>
            </div>
            <form id="pi-form-form" class="modal-body">
                <input type="hidden" id="pi-form-id">
                <input type="hidden" id="pi-form-type" value="forms">
                
                <label>Document / Form Title</label>
                <input type="text" id="pi-form-name" class="app-input" required placeholder="e.g., Incident Report Form">
                
                <label>Description</label>
                <input type="text" id="pi-form-desc" class="app-input" placeholder="When to use this form...">
                
                <label>File Link or URL</label>
                <input type="text" id="pi-form-url" class="app-input" placeholder="assets/incident-report.pdf" required>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: -10px; margin-bottom: 15px;">Point to a local asset or external web address.</p>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button type="submit" class="btn-primary" style="flex: 2;">💾 Save Document</button>
                    <button type="button" id="pi-form-del" class="btn-danger hidden" style="flex: 1;">🗑️ Delete</button>
                </div>
            </form>
        </dialog>

        <!-- Dynamic Universal Links Modal -->
        <dialog id="pi-link-modal" style="width: 95%; max-width: 500px;">
            <div class="modal-header">
                <h3 id="pi-link-title">Add Web Link</h3>
                <button id="close-pi-link" class="icon-btn">❌</button>
            </div>
            <form id="pi-link-form" class="modal-body">
                <input type="hidden" id="pi-link-id">
                <input type="hidden" id="pi-link-type" value="general">
                
                <label id="pi-link-cat-label">Category</label>
                <select id="pi-link-category" class="app-select"></select>

                <label>Link Title</label>
                <input type="text" id="pi-link-name" class="app-input" required placeholder="e.g., State Parks Employee Portal">
                
                <label>URL</label>
                <input type="url" id="pi-link-url" class="app-input" required placeholder="https://...">
                
                <label>Description</label>
                <textarea id="pi-link-desc" class="app-input" rows="3" placeholder="What is this link for?"></textarea>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button type="submit" class="btn-primary" style="flex: 2;">💾 Save Link</button>
                    <button type="button" id="pi-link-del" class="btn-danger hidden" style="flex: 1;">🗑️ Delete</button>
                </div>
            </form>
        </dialog>

        <!-- Part Details Read-Only Modal -->
        <dialog id="pi-part-detail-modal" style="width: 95%; max-width: 450px;">
            <div class="modal-header">
                <h3>Part Details</h3>
                <button id="close-pi-part-detail" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: center;">
                    <div id="pi-pd-img-container" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.02); flex-shrink: 0;"></div>
                    <div>
                        <h2 id="pi-pd-name" style="margin: 0; color: var(--accent-primary); line-height: 1.2;"></h2>
                        <p style="color: var(--text-secondary); margin-top: 5px;">SKU / Part Number: <strong id="pi-pd-sku"></strong></p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div><span style="font-size: 0.85rem; color: var(--text-secondary);">Shop Location</span><br><strong id="pi-pd-loc" style="font-size: 1.1rem;"></strong></div>
                    <div><span style="font-size: 0.85rem; color: var(--text-secondary);">Current Stock</span><br><strong id="pi-pd-qty" style="font-size: 1.1rem;"></strong></div>
                </div>
            </div>
        </dialog>

        <!-- Vehicle Details Read-Only Modal -->
        <dialog id="pi-vehicle-detail-modal" style="width: 95%; max-width: 500px;">
            <div class="modal-header">
                <h3>Vehicle Details</h3>
                <button id="close-pi-vehicle-detail" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <h2 id="pi-vd-id" style="margin: 0; color: var(--accent-primary);"></h2>
                <p id="pi-vd-desc" style="font-size: 1.1rem; font-weight: bold; margin-bottom: 20px;"></p>
                
                <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 15px;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">Current Mileage / Hours</span><br>
                    <strong id="pi-vd-odo" style="font-size: 1.2rem;"></strong>
                </div>

                <div style="margin-bottom: 15px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                    <div style="background: var(--bg-surface); border-bottom: 1px solid var(--border-color); padding: 10px 15px;"><strong>Latest Inspection</strong></div>
                    <div style="padding: 15px; background: rgba(0,0,0,0.02);">
                        <p>Date: <strong id="pi-vd-insp-date"></strong></p>
                        <p style="margin-top: 5px;">Result: <span id="pi-vd-insp-res"></span></p>
                    </div>
                </div>

                <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                    <div style="background: var(--bg-surface); border-bottom: 1px solid var(--border-color); padding: 10px 15px;"><strong>Latest Service</strong></div>
                    <div style="padding: 15px; background: rgba(0,0,0,0.02);">
                        <p>Date: <strong id="pi-vd-srv-date"></strong></p>
                        <p style="margin-top: 5px;">Task: <strong id="pi-vd-srv-task"></strong></p>
                    </div>
                </div>
            </div>
        </dialog>

        <!-- Image Lightbox Modal for Parts Tab -->
        <dialog id="pi-lightbox-modal" style="padding: 0; border: none; background: transparent; overflow: visible; outline: none; margin: auto;">
            <div style="position: relative; display: inline-block;">
                <button id="pi-close-lightbox" class="btn-danger" style="position: absolute; top: -15px; right: -15px; border-radius: 50%; width: 35px; height: 35px; padding: 0; font-weight: bold; border: 2px solid white; z-index: 100; font-size: 1.2rem; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">X</button>
                <img id="pi-lightbox-img" src="" style="max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 5px 25px rgba(0,0,0,0.8); display: block; background: var(--bg-surface);">
            </div>
        </dialog>

    </div>
    
    <div id="pi-print-stage" class="pi-print-only"></div>
    `;
}