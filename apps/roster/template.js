// apps/roster/template.js

function renderRosterApp() {
    return `
    <style>
        /* Container Hardware Acceleration for Mobile Sticky */
        .app-table-container {
            overflow-x: auto;
            overflow-y: auto;
            max-height: 85vh;
            -webkit-overflow-scrolling: touch; 
            position: relative;
        }

        /* Gantt Calendar Styles - THE HOLY GRAIL LAYOUT TRICK */
        .gantt-table {
            border-collapse: separate; 
            border-spacing: 0;
            table-layout: fixed !important; 
            width: max-content !important; /* Lets table grow infinitely if columns demand it */
            min-width: 100% !important; /* Forces table to fill screen if only a few days are selected */
        }
        
        .gantt-table th, .gantt-table td {
            border-bottom: 1px solid var(--border-color);
            border-right: 1px solid var(--border-color);
        }
        
        /* Dynamic Date Columns */
        .gantt-table th:not(.gantt-site-col),
        .gantt-table td:not(.gantt-site-col) {
            width: 250px !important; /* Base width. Will grow evenly if min-width: 100% stretches table */
            min-width: 250px !important; /* THE PC/TABLET SWEET SPOT */
            max-width: none !important;
        }

        .gantt-table th {
            border-top: 1px solid var(--border-color);
            background-color: #2c3e50;
            color: #ffffff;
            padding: 10px;
            text-align: center;
            font-size: 0.9rem;
        }
        .gantt-table th:first-child, .gantt-table td:first-child {
            border-left: 1px solid var(--border-color);
        }
        
        .gantt-table td {
            padding: 0;
            vertical-align: top;
            height: 60px;
            position: relative;
            background-color: var(--bg-surface);
        }

        /* Top Header Sticky Lock */
        #roster-thead th {
            position: -webkit-sticky !important;
            position: sticky !important;
            top: 0;
            z-index: 20;
        }

        /* Site Column Sticky Lock & Capped Width */
        .gantt-site-col {
            position: -webkit-sticky !important;
            position: sticky !important;
            left: 0 !important;
            z-index: 10;
            background-color: var(--bg-base) !important;
            text-align: left !important;
            border-right: 2px solid var(--border-color) !important;
            padding: 10px 15px !important;
            width: 200px !important; 
            min-width: 200px !important; /* Lock this down so max-content math works perfectly */
            max-width: 200px !important;
            white-space: normal !important; 
            word-wrap: break-word !important;
        }
        
        thead .gantt-site-col {
            z-index: 30 !important; 
        }
        
        /* --- DYNAMIC SCROLL ABBREVIATION (Global for PC, Tablet, Mobile) --- */
        .site-short-name {
            display: none;
        }
        
        .app-table-container.is-scrolled .site-full-name {
            display: none !important;
        }
        .app-table-container.is-scrolled .site-short-name {
            display: inline !important;
        }
        .app-table-container.is-scrolled .print-hide-badges {
            display: none !important; 
        }
        .app-table-container.is-scrolled .gantt-site-col {
            width: 80px !important;
            min-width: 80px !important;
            max-width: 80px !important;
            padding: 10px 8px !important; 
        }
        /* ------------------------------------------------------------------ */

        .camper-block {
            background-color: #4b5563;
            color: #ffffff;
            margin: 2px;
            padding: 8px;
            border-radius: 4px;
            height: calc(100% - 4px);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.1s, box-shadow 0.1s;
            overflow: hidden;
            position: relative;
        }
        .camper-block:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            filter: brightness(1.1);
        }
        
        .camper-block.checked-in {
            border: 2px solid #2ecc71;
            background-color: #374151;
            box-shadow: 0 0 8px rgba(46, 204, 113, 0.4);
        }
        .camper-block.departed {
            border: 2px solid #95a5a6;
            background-color: #2c3e50;
            opacity: 0.7;
        }
        .camper-block.trouble {
            border: 2px solid #e74c3c;
            background-color: #7f1d1d;
        }
        .camper-block.closed {
            background-color: #333333;
            border: 1px dashed #777777;
            color: #aaaaaa;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .block-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 0.85rem;
            margin-bottom: 4px;
            position: relative;
            z-index: 2;
        }
        .block-name {
            font-weight: bold;
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
        }
        
        .block-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
            z-index: 2;
        }
        .status-toggle-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .status-toggle-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }
        .note-telltale {
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .note-telltale.has-note {
            opacity: 1;
            filter: drop-shadow(0 0 3px #f1c40f);
        }
        .note-telltale.no-note {
            opacity: 0.3;
            filter: grayscale(100%);
        }
        .note-telltale:hover {
            transform: scale(1.2);
        }

        .empty-cell {
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            padding: 5px !important;
            height: 100%;
            width: 100%;
            color: var(--text-secondary);
            font-size: 0.75rem;
            opacity: 0.5;
            position: relative;
        }
        .empty-cell:hover {
            background-color: rgba(52, 152, 219, 0.1);
            opacity: 1;
        }

        .host-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.8rem;
            opacity: 0.4;
            pointer-events: none;
            z-index: 1;
        }

        /* Site Config Tabs */
        .sc-tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 15px;
        }
        .sc-tab-btn {
            flex: 1;
            padding: 12px 10px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-weight: bold;
            font-size: 1rem;
            color: var(--text-secondary);
            cursor: pointer;
            transition: color 0.2s, border-bottom-color 0.2s;
        }
        .sc-tab-btn:hover {
            color: var(--text-primary);
        }
        .sc-tab-btn.active {
            color: var(--accent-primary);
            border-bottom-color: var(--accent-primary);
        }
        .sc-tab-content {
            display: none;
        }
        .sc-tab-content.active {
            display: block;
        }

        /* Dual-Pane Date Picker Styles */
        .dr-container {
            display: flex;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-surface);
        }
        .dr-sidebar {
            width: 140px;
            background: rgba(0,0,0,0.03);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
        }
        [data-theme="dark"] .dr-sidebar { background: rgba(255,255,255,0.02); }
        .dr-sidebar button {
            padding: 12px 15px;
            text-align: left;
            border: none;
            background: transparent;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 0.9rem;
            transition: background 0.1s;
        }
        .dr-sidebar button:hover, .dr-sidebar button.active {
            background: var(--accent-primary);
            color: white;
        }
        .dr-calendars {
            flex: 1;
            padding: 15px;
        }
        .dr-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .dr-months-wrapper {
            display: flex;
            gap: 20px;
        }
        .dr-month {
            flex: 1;
        }
        .dr-month-name {
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--text-primary);
        }
        .dr-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            text-align: center;
        }
        .dr-day-header {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
            font-weight: bold;
        }
        .dr-day {
            padding: 8px 0;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9rem;
            transition: background 0.1s;
            color: var(--text-primary);
        }
        .dr-day:hover:not(.empty) {
            background: rgba(52, 152, 219, 0.2);
        }
        .dr-day.empty {
            cursor: default;
        }
        .dr-day.selected {
            background: var(--accent-primary) !important;
            color: white !important;
            font-weight: bold;
            border-radius: 4px !important;
        }
        .dr-day.in-range {
            background: rgba(52, 152, 219, 0.15);
            border-radius: 0;
        }
        .dr-day.selected.range-start { border-top-right-radius: 0 !important; border-bottom-right-radius: 0 !important; }
        .dr-day.selected.range-end { border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; }
        
        .bulk-site-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            background: var(--bg-base);
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            cursor: pointer;
            user-select: none;
        }
        .bulk-site-item:hover {
            background: rgba(52, 152, 219, 0.1);
        }

        .print-checkbox {
            display: none;
        }

        /* 📱 MOBILE RESPONSIVE STYLES */
        @media screen and (max-width: 768px) {
            #roster-app-wrapper {
                padding: 10px !important;
            }

            .responsive-header {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 15px;
            }
            .responsive-header .header-btns {
                display: grid !important;
                grid-template-columns: 1fr 1fr;
                width: 100%;
                gap: 8px;
            }
            .responsive-header .header-btns button {
                width: 100%;
                font-size: 0.8rem;
                padding: 10px 5px;
                margin: 0;
            }

            .responsive-controls {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 15px;
            }
            .responsive-controls > div {
                width: 100% !important;
                flex-direction: column !important;
                align-items: stretch !important;
            }
            .responsive-controls button,
            .responsive-controls select {
                width: 100% !important;
                justify-content: center;
            }

            .gantt-table th { 
                font-size: 0.75rem !important; 
                padding: 4px !important; 
            }
            
            /* Mobile Date Columns */
            .gantt-table th:not(.gantt-site-col),
            .gantt-table td:not(.gantt-site-col) { 
                width: 150px !important; 
                min-width: 150px !important; /* THE PHONE SWEET SPOT */
                max-width: none !important; 
            }
            
            .gantt-site-col {
                width: 140px !important;
                min-width: 140px !important;
                max-width: 140px !important;
                padding: 8px 10px !important;
            }
            .gantt-site-col strong {
                font-size: 0.85rem !important;
            }

            .camper-block {
                padding: 2px 4px !important;
                margin: 1px !important;
            }
            .block-name {
                font-size: 0.75rem !important;
            }
            .block-actions {
                font-size: 0.7rem !important;
                gap: 4px !important;
            }
            .status-toggle-btn {
                font-size: 0.7rem !important;
                padding: 1px 3px !important;
            }
            .screen-extras {
                font-size: 0.6rem !important;
                padding: 1px 2px !important;
            }
            .host-watermark { 
                font-size: 1.2rem !important; 
            }

            .print-hide-badges {
                flex-wrap: wrap; 
            }

            .responsive-grid {
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
            }

            .dr-container {
                flex-direction: column;
            }
            .dr-sidebar {
                width: 100%;
                flex-direction: row;
                overflow-x: auto;
                border-right: none;
                border-bottom: 1px solid var(--border-color);
            }
            .dr-sidebar button {
                flex: 0 0 auto;
                border-bottom: none;
                border-right: 1px solid var(--border-color);
            }
            
            #dr-month-2-label, 
            .dr-month:nth-child(2) {
                display: none !important;
            }
            
            .sc-tab-btn {
                font-size: 0.85rem !important;
                padding: 10px 5px !important;
            }
        }

        /* 🖨️ INK-SAVER PRINTING STYLES (SQUISHED/ZOOMED OUT VIEW) */
        @media print {
            @page { size: portrait; margin: 0.3in; }
            
            html, body, #app-container, .app-table-container, #roster-table {
                overflow: visible !important;
                overflow-x: visible !important;
                overflow-y: visible !important;
                height: auto !important;
                max-height: none !important;
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            #roster-app-wrapper {
                padding: 0 !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            
            body { 
                background: #ffffff !important; 
                color: #000000 !important; 
            }
            
            #global-header, #bento-menu, #roster-header, #roster-controls, #sidebar, header, .app-header, dialog, button, select, input { 
                display: none !important; 
            }

            .print-hide-badges {
                display: none !important;
            }
            
            .app-table-container {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .gantt-table { 
                width: 100% !important; 
                border-collapse: collapse !important; 
                min-width: 100% !important; 
                table-layout: fixed !important; 
            }

            /* Un-stick the header and site details column to keep row items aligned on multiple pages */
            #roster-thead th, .gantt-site-col {
                position: static !important;
            }
            
            .gantt-table th:not(.gantt-site-col), 
            .gantt-table td:not(.gantt-site-col) {
                width: auto !important;
                min-width: 0 !important; 
                max-width: none !important;
            }
            
            /* --- Squish Rows & Lock Global 14px Font --- */
            .gantt-table th, .gantt-table td, .gantt-site-col { 
                background: #ffffff !important; 
                color: #000000 !important; 
                border: 1px solid #aaaaaa !important; 
                page-break-inside: avoid;
                height: 55px !important; /* Squished down from 75px */
                max-height: 55px !important; 
                overflow: hidden !important;
                font-size: 14px !important; /* Global 14px font */
            }

            .gantt-table th {
                padding: 4px !important;
                font-weight: bold !important;
                height: auto !important;
            }
            
            .gantt-site-col {
                width: 180px !important; /* Adjust print width */
                min-width: 180px !important;
                max-width: 180px !important;
                white-space: normal !important; 
                word-wrap: break-word !important;
                font-weight: bold !important;
                font-size: 16px !important; /* Site name slightly larger */
                border-right: 2px solid #aaaaaa !important;
                padding: 4px 8px !important;
                overflow: visible !important;
            }
            
            .site-name-wrapper {
                white-space: normal !important;
                word-wrap: break-word !important;
            }
            .site-full-name { 
                display: inline !important; 
                white-space: normal !important;
            }
            .site-short-name { 
                display: none !important; 
            }
            
            .camper-block { 
                background: #ffffff !important; 
                color: #000000 !important; 
                border: 2px solid #000000 !important; 
                border-radius: 6px !important; 
                box-shadow: none !important; 
                margin: 2px !important;
                padding: 2px 4px !important; /* Tighter padding for squished block */
                height: calc(100% - 4px) !important; 
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                font-size: 14px !important;
            }

            .camper-block.departed { 
                background: #f4f4f4 !important; 
                color: #777777 !important; 
                border: 2px solid #aaaaaa !important; 
            }

            .block-header, .block-actions, .block-name, .camper-block div, .camper-block span {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            
            .camper-block.closed { 
                border: 2px dashed #000000 !important; 
                color: #333333 !important; 
                justify-content: center !important;
            }
            
            tr[style*="background-color: var(--accent-primary)"] td,
            tr[style*="var(--accent-primary)"] td {
                background-color: #e5e5e5 !important;
                color: #000000 !important;
                border: 2px solid #aaaaaa !important;
                font-size: 16px !important;
                padding: 4px 12px !important;
                height: 35px !important;
            }
            
            .status-toggle-btn, .note-telltale, .screen-extras { display: none !important; }

            .print-extras {
                display: block !important;
                margin-top: 2px !important;
                font-size: 13px !important;
                color: #000000 !important;
            }

            .print-checkbox {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 14px !important;
                height: 14px !important;
                border: 1px solid #000000 !important;
                margin-right: 6px !important;
                vertical-align: middle !important;
                background: #ffffff !important;
                font-size: 12px !important;
                font-weight: bold !important;
                color: #000000 !important;
            }

            .print-checkbox.is-checked::after {
                content: '✔';
            }
            
            .host-watermark {
                display: block !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                opacity: 0.5 !important;
                filter: grayscale(100%);
                color: #000000 !important;
                font-size: 1.8rem !important;
                z-index: 1 !important;
            }
        }
    </style>

    <div id="roster-app-wrapper" style="padding: 0.5rem;">
        <div id="roster-header" class="responsive-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Camp Roster Calendar</h2>
            <div class="header-btns" style="display: flex; gap: 10px;">
                <button id="btn-roster-scan" class="btn-primary">📲 Sync Roster Stream</button>
                <button id="btn-roster-import-file" class="btn-outline">💾 Import JSON</button>
                <input type="file" id="file-roster-import" accept=".json" style="display: none;">
                <button id="btn-manage-sites" class="btn-outline" style="border-color: #3498db; color: #3498db;">⚙️ Master Site Setup</button>
                <button id="btn-roster-print" class="btn-outline" style="border-color: #9b59b6; color: #9b59b6;">🖨️ Print View</button>
            </div>
        </div>

        <div id="roster-controls" class="responsive-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--bg-surface); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            
            <div style="display: flex; gap: 15px; flex: 1;">
                <div>
                    <label style="font-weight: bold; font-size: 0.85rem; display: block; margin-bottom: 5px;">Filter by Loop</label>
                    <select id="filter-loop" class="app-select" style="margin-bottom: 0; min-width: 200px;">
                        <option value="All">All Loops</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 15px;">
                <button id="btn-open-date-picker" class="btn-outline" style="padding: 10px 20px; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
                    📅 <span id="cal-date-range">Loading Dates...</span>
                </button>
            </div>
        </div>

        <div class="app-table-container" style="overflow-x: auto; max-height: 65vh;">
            <table class="gantt-table" id="roster-table">
                <thead id="roster-thead">
                </thead>
                <tbody id="roster-tbody">
                </tbody>
            </table>
        </div>

        <dialog id="date-range-modal" style="max-width: 700px; width: 95%;">
            <div class="modal-header">
                <h3 id="dr-display-text">Select Dates</h3>
                <button id="btn-dr-close" class="icon-btn">❌</button>
            </div>
            
            <div class="dr-container">
                <div class="dr-sidebar">
                    <button class="dr-quick-btn active" data-range="custom">Custom Range</button>
                    <button class="dr-quick-btn" data-range="this-week">This Week</button>
                    <button class="dr-quick-btn" data-range="next-week">Next Week</button>
                    <button class="dr-quick-btn" data-range="this-month">This Month</button>
                    <button class="dr-quick-btn" data-range="next-month">Next Month</button>
                </div>
                
                <div class="dr-calendars">
                    <div class="dr-header">
                        <button id="dr-prev-month" class="icon-btn" style="border: 1px solid var(--border-color);">◀</button>
                        <div id="dr-month-labels" style="display: flex; gap: 20px; flex: 1; justify-content: space-around;">
                            <span id="dr-month-1-label" class="dr-month-name">Month 1</span>
                            <span id="dr-month-2-label" class="dr-month-name">Month 2</span>
                        </div>
                        <button id="dr-next-month" class="icon-btn" style="border: 1px solid var(--border-color);">▶</button>
                    </div>
                    
                    <div class="dr-months-wrapper">
                        <div class="dr-month">
                            <div class="dr-grid dr-header-grid">
                                <div class="dr-day-header">Su</div><div class="dr-day-header">Mo</div><div class="dr-day-header">Tu</div>
                                <div class="dr-day-header">We</div><div class="dr-day-header">Th</div><div class="dr-day-header">Fr</div><div class="dr-day-header">Sa</div>
                            </div>
                            <div class="dr-grid" id="dr-grid-1"></div>
                        </div>
                        <div class="dr-month">
                            <div class="dr-grid dr-header-grid">
                                <div class="dr-day-header">Su</div><div class="dr-day-header">Mo</div><div class="dr-day-header">Tu</div>
                                <div class="dr-day-header">We</div><div class="dr-day-header">Th</div><div class="dr-day-header">Fr</div><div class="dr-day-header">Sa</div>
                            </div>
                            <div class="dr-grid" id="dr-grid-2"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="padding: 15px; display: flex; justify-content: flex-end; gap: 10px; background: var(--bg-surface);">
                <button id="btn-dr-cancel" class="btn-outline">Cancel</button>
                <button id="btn-dr-apply" class="btn-primary" style="min-width: 120px;">Apply</button>
            </div>
        </dialog>

        <dialog id="empty-site-modal">
            <div class="modal-header">
                <h3>Manage Availability</h3>
                <button id="btn-es-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <p style="font-size: 1.1rem; margin-bottom: 5px;"><strong>Site:</strong> <span id="es-site-name" style="color: var(--accent-primary);"></span></p>
                <p style="font-size: 1.1rem; margin-bottom: 25px;"><strong>Date:</strong> <span id="es-date-str" style="color: var(--accent-primary);"></span></p>
                
                <input type="hidden" id="es-site-val">
                <input type="hidden" id="es-date-val">

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button id="btn-es-walkin" class="btn-primary" style="padding: 15px; font-size: 1.1rem;">🚶‍♂️ Add Walk-In Here</button>
                    <button id="btn-es-close-site" class="btn-danger" style="padding: 15px; font-size: 1.1rem; background-color: #333333; border: 2px solid #555555;">🚫 Mark Closed / Maintenance</button>
                </div>
            </div>
        </dialog>

        <dialog id="quick-note-modal">
            <div class="modal-header">
                <h3>Camper Notes</h3>
                <button id="btn-qn-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="qn-id">
                <p id="qn-name" style="font-weight: bold; font-size: 1.1rem; margin-bottom: 15px; color: var(--accent-primary);"></p>
                
                <textarea id="qn-notes" class="app-input" rows="8" placeholder="Type notes here..."></textarea>
                
                <button id="btn-qn-save" class="btn-primary" style="width: 100%; margin-top: 15px;">Save Notes</button>
            </div>
        </dialog>

        <dialog id="camper-modal">
            <div class="modal-header">
                <h3 id="cm-title">Camper Details</h3>
                <button id="btn-cm-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="cm-id">
                
                <div class="responsive-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Site</label>
                        <p id="cm-site" style="font-size: 1.1rem; font-weight: bold;"></p>
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Loop</label>
                        <p id="cm-loop" style="font-size: 1.1rem; font-weight: bold;"></p>
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Dates</label>
                        <p id="cm-dates"></p>
                    </div>
                </div>

                <hr>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <label style="font-weight: bold;">Check-In Status</label>
                    <select id="cm-status" class="app-select" style="width: auto; margin-bottom: 0;">
                        <option value="Pending">Pending</option>
                        <option value="Checked-In">Checked-In</option>
                        <option value="Departed">Departed</option>
                        <option value="Closed">Closed / Maint.</option>
                    </select>
                </div>

                <div class="responsive-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: rgba(0,0,0,0.02);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-weight: bold; margin: 0; font-size: 0.9rem;">Extra Vehicles</label>
                            <label style="display:flex; align-items:center; gap:4px; font-size: 0.85rem; cursor:pointer;">
                                <strong>P</strong> <input type="checkbox" id="cm-ev-paid" style="margin:0; transform:scale(1.2);">
                            </label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button type="button" id="btn-ev-minus" class="btn-outline" style="width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">-</button>
                            <span id="cm-extra-veh-display" style="width: 25px; text-align: center; font-weight: bold; font-size: 1.1rem;">0</span>
                            <button type="button" id="btn-ev-plus" class="btn-outline" style="width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">+</button>
                        </div>
                        <input type="hidden" id="cm-extra-veh" value="0">
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: rgba(0,0,0,0.02);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-weight: bold; margin: 0; font-size: 0.9rem;">ATV / UTV's</label>
                            <label style="display:flex; align-items:center; gap:4px; font-size: 0.85rem; cursor:pointer;">
                                <strong>P</strong> <input type="checkbox" id="cm-atv-paid" style="margin:0; transform:scale(1.2);">
                            </label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button type="button" id="btn-atv-minus" class="btn-outline" style="width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">-</button>
                            <span id="cm-atv-display" style="width: 25px; text-align: center; font-weight: bold; font-size: 1.1rem;">0</span>
                            <button type="button" id="btn-atv-plus" class="btn-outline" style="width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">+</button>
                        </div>
                        <input type="hidden" id="cm-atv" value="0">
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--danger-color);">
                    <label style="font-weight: bold; color: var(--danger-color);">⚠️ Mark as Trouble Site</label>
                    <input type="checkbox" id="cm-trouble" style="transform: scale(1.5);">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Notes</label>
                    <textarea id="cm-notes" class="app-input" rows="4" placeholder="Enter vehicle descriptions, issues, or general notes here..."></textarea>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 10px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                    <label style="font-weight: bold; color: var(--text-secondary);">🗄️ Archive Record (Prevent Auto-Delete)</label>
                    <input type="checkbox" id="cm-archive" style="transform: scale(1.5);">
                </div>

                <button id="btn-cm-save" class="btn-primary" style="width: 100%;">Save Changes</button>
            </div>
        </dialog>

        <dialog id="site-config-modal" style="max-width: 650px; width: 95%;">
            <div class="modal-header">
                <h3>Master Site Setup</h3>
                <button id="btn-sc-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
                
                <div class="sc-tabs">
                    <button class="sc-tab-btn active" data-target="sc-tab-single">Single Site</button>
                    <button class="sc-tab-btn" data-target="sc-tab-bulk">Bulk Assign</button>
                    <button class="sc-tab-btn" data-target="sc-tab-loops">Manage Loops</button>
                </div>

                <div id="sc-tab-single" class="sc-tab-content active">
                    <div class="responsive-grid flex-stack" style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 2; width: 100%;">
                            <label style="font-weight: bold;">Select Existing Site to Edit</label>
                            <select id="sc-site-select" class="app-select" style="margin-bottom: 0; width: 100%;"></select>
                        </div>
                        <div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">
                            <button id="btn-sc-add-new" class="btn-outline" style="width: 100%; margin-bottom: 0; padding: 10px;">+ New Solo Site</button>
                        </div>
                    </div>

                    <div class="responsive-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold; font-size: 0.9rem;">Loop Assignment</label>
                            <select id="sc-loop" class="app-select"></select>
                        </div>
                        <div>
                            <label style="font-weight: bold; font-size: 0.9rem;">Max Length (ft)</label>
                            <input type="number" id="sc-length" class="app-input" placeholder="e.g. 45">
                        </div>
                    </div>

                    <div class="responsive-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold; font-size: 0.9rem;">Electrical Service</label>
                            <select id="sc-amps" class="app-select">
                                <option value="None">Dry / None</option>
                                <option value="15 Amp">15 Amp</option>
                                <option value="30 Amp">30 Amp</option>
                                <option value="50 Amp">50 Amp</option>
                                <option value="15/30 Amp">15/30 Amp</option>
                                <option value="15/50 Amp">15/50 Amp</option>
                                <option value="15/30/50 Amp">15/30/50 Amp</option>
                            </select>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label style="font-weight: bold; font-size: 0.9rem;">💧 Water Hookup</label>
                                <input type="checkbox" id="sc-water" style="transform: scale(1.3);">
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label style="font-weight: bold; font-size: 0.9rem;">🕳️ Sewer Hookup</label>
                                <input type="checkbox" id="sc-sewer" style="transform: scale(1.3);">
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px; border-radius: var(--radius-md); background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db;">
                        <label style="font-weight: bold; color: #3498db;">♿ ADA Accessible</label>
                        <input type="checkbox" id="sc-ada" style="transform: scale(1.5);">
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding: 10px; border-radius: var(--radius-md); background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71;">
                        <label style="font-weight: bold; color: #2ecc71;">🏕️ Camp Host Site</label>
                        <input type="checkbox" id="sc-host" style="transform: scale(1.5);">
                    </div>

                    <button id="btn-sc-save" class="btn-primary" style="width: 100%;">Save Single Site Config</button>
                    <button id="btn-sc-delete" class="btn-outline" style="width: 100%; margin-top: 10px; border-color: var(--danger-color); color: var(--danger-color);">🗑️ Delete Site</button>
                </div>

                <div id="sc-tab-bulk" class="sc-tab-content">
                    <h4 style="margin-bottom: 5px; color: var(--accent-primary);">Bulk Loop Assignment</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">Select existing sites from the database below to move them into a new loop simultaneously. (Shift-click to select multiple)</p>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button id="btn-sc-sel-all" class="btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">Select All</button>
                        <button id="btn-sc-sel-none" class="btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">Deselect All</button>
                    </div>

                    <div id="sc-bulk-site-list" class="responsive-grid" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.02);">
                    </div>

                    <div class="responsive-grid flex-stack" style="display: flex; gap: 10px; align-items: flex-end;">
                        <div style="flex: 1; width: 100%;">
                            <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 5px;">Assign Selected To:</label>
                            <select id="sc-bulk-loop" class="app-select" style="margin-bottom: 0; width: 100%;"></select>
                        </div>
                        <button id="btn-sc-bulk-apply" class="btn-primary" style="flex: 1; width: 100%; background-color: var(--accent-primary);">Run Bulk Update</button>
                    </div>
                </div>

                <div id="sc-tab-loops" class="sc-tab-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px;">
                        <div>
                            <h4 style="margin-bottom: 5px; color: var(--accent-primary);">Loop Management</h4>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Add, rename, or remove loops.</p>
                        </div>
                        <button id="btn-add-new-loop" class="btn-primary" style="margin: 0; padding: 8px 15px;">+ Add Loop</button>
                    </div>
                    
                    <div id="lm-loop-list" style="max-height: 350px; overflow-y: auto;">
                    </div>
                </div>

            </div>
        </dialog>
    </div>
    `;
}