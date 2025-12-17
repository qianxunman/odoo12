odoo.define('list_view_field_hidden.ListRenderer', function (require) {
    "use strict";

    var ListRenderer = require('web.ListRenderer');
    var core = require('web.core');

    var qweb = core.qweb;

    /**
     * Patch ListRenderer to:
     *  - add a column chooser dropdown in list headers
     *  - allow users to hide/show columns
     *  - store user preferences in localStorage (per model + view id)
     *
     * This automatically also applies to one2many lists in form views
     * because they use the same ListRenderer.
     */
    ListRenderer.include({
        events: _.extend({}, ListRenderer.prototype.events, {
            'click .o_lvfh_menu .o_lvfh_field_item': '_onToggleColumnVisibility',
            'click .o_lvfh_menu .o_lvfh_field_item input[type="checkbox"]': '_onToggleColumnVisibilityCheckbox',
        }),

        init: function () {
            this._super.apply(this, arguments);
            // Initialize storage key and hidden columns after state is available
            this._lvfh_hiddenColumns = {};
            this._lvfh_storageKey = null;
        },

        // ---------------------------------------------------------------------
        // Internal helpers
        // ---------------------------------------------------------------------

        _lvfh_computeStorageKey: function () {
            // Try to get model from multiple sources
            var model = 'unknown_model';
            if (this.state && this.state.model) {
                model = this.state.model;
            } else if (this.arch && this.arch.attrs && this.arch.attrs.model) {
                model = this.arch.attrs.model;
            } else if (this.modelName) {
                model = this.modelName;
            }
            
            // Try to get view ID from arch only (most stable)
            // arch.view_id is set when the view is loaded from database
            // DO NOT use state.id as it changes on every navigation
            var viewId = null;
            if (this.arch && this.arch.view_id) {
                viewId = String(this.arch.view_id);
            } else if (this.arch && this.arch.attrs && this.arch.attrs.id) {
                viewId = String(this.arch.attrs.id);
            }
            
            // Use model + viewId if available, otherwise just model
            // This ensures same model views share settings when viewId is not available
            var key = 'odoo12_lvfh:' + model;
            if (viewId && viewId !== 'default') {
                key += ':' + viewId;
            }
            
            return key;
        },

        _lvfh_loadHiddenColumns: function () {
            if (!this._lvfh_storageKey) {
                this._lvfh_storageKey = this._lvfh_computeStorageKey();
            }
            var data;
            try {
                data = window.localStorage.getItem(this._lvfh_storageKey);
            } catch (e) {
                console.warn('[list_view_field_hidden] Failed to read localStorage:', e);
                return {};
            }
            
            // If no data found, try to migrate from old keys (with state.id)
            if (!data) {
                data = this._lvfh_tryMigrateFromOldKeys();
            }
            
            if (!data) {
                return {};
            }
            try {
                var parsed = JSON.parse(data);
                return parsed || {};
            } catch (e2) {
                console.warn('[list_view_field_hidden] Failed to parse localStorage data:', e2);
                return {};
            }
        },

        /**
         * Try to migrate data from old storage keys that used state.id
         * This helps clean up localStorage and migrate user settings
         *
         * @private
         */
        _lvfh_tryMigrateFromOldKeys: function () {
            var model = 'unknown_model';
            if (this.state && this.state.model) {
                model = this.state.model;
            } else if (this.arch && this.arch.attrs && this.arch.attrs.model) {
                model = this.arch.attrs.model;
            } else if (this.modelName) {
                model = this.modelName;
            }
            
            // Try to find any old key for this model
            var prefix = 'odoo12_lvfh:' + model + ':';
            var migratedData = null;
            
            try {
                // Check localStorage for old keys
                for (var i = 0; i < window.localStorage.length; i++) {
                    var key = window.localStorage.key(i);
                    if (key && key.startsWith(prefix) && key !== this._lvfh_storageKey) {
                        // Found an old key, try to migrate
                        var oldData = window.localStorage.getItem(key);
                        if (oldData) {
                            try {
                                var parsed = JSON.parse(oldData);
                                if (parsed && Object.keys(parsed).length > 0) {
                                    // Found valid data, migrate it
                                    migratedData = oldData;
                                    // Save to new key
                                    window.localStorage.setItem(this._lvfh_storageKey, oldData);
                                    console.log('[list_view_field_hidden] Migrated data from old key:', key, 'to:', this._lvfh_storageKey);
                                    break;
                                }
                            } catch (e) {
                                // Invalid data, skip
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[list_view_field_hidden] Failed to migrate from old keys:', e);
            }
            
            return migratedData;
        },

        _lvfh_saveHiddenColumns: function () {
            if (!this._lvfh_storageKey) {
                this._lvfh_storageKey = this._lvfh_computeStorageKey();
            }
            try {
                var data = JSON.stringify(this._lvfh_hiddenColumns || {});
                window.localStorage.setItem(this._lvfh_storageKey, data);
                console.log('[list_view_field_hidden] Saved to localStorage:', this._lvfh_storageKey, this._lvfh_hiddenColumns);
                
                // Clean up old keys for the same model (optional, runs occasionally)
                // This helps prevent localStorage from filling up
                if (Math.random() < 0.1) { // 10% chance to clean up
                    this._lvfh_cleanupOldKeys();
                }
            } catch (e) {
                console.warn('[list_view_field_hidden] Failed to save to localStorage:', e);
            }
        },

        /**
         * Clean up old storage keys that used state.id
         * This helps prevent localStorage from filling up
         *
         * @private
         */
        _lvfh_cleanupOldKeys: function () {
            var model = 'unknown_model';
            if (this.state && this.state.model) {
                model = this.state.model;
            } else if (this.arch && this.arch.attrs && this.arch.attrs.model) {
                model = this.arch.attrs.model;
            } else if (this.modelName) {
                model = this.modelName;
            }
            
            var prefix = 'odoo12_lvfh:' + model + ':';
            var keysToRemove = [];
            
            try {
                // Find all old keys for this model
                for (var i = 0; i < window.localStorage.length; i++) {
                    var key = window.localStorage.key(i);
                    if (key && key.startsWith(prefix) && key !== this._lvfh_storageKey) {
                        // Check if this looks like an old key (contains model name pattern like sale.order_123)
                        if (key.match(/_[0-9]+$/)) {
                            keysToRemove.push(key);
                        }
                    }
                }
                
                // Remove old keys (limit to 10 at a time to avoid blocking)
                var removed = 0;
                for (var j = 0; j < Math.min(keysToRemove.length, 10); j++) {
                    window.localStorage.removeItem(keysToRemove[j]);
                    removed++;
                }
                
                if (removed > 0) {
                    console.log('[list_view_field_hidden] Cleaned up', removed, 'old localStorage keys');
                }
            } catch (e) {
                console.warn('[list_view_field_hidden] Failed to cleanup old keys:', e);
            }
        },

        _lvfh_isHidden: function (fieldName) {
            return !!(this._lvfh_hiddenColumns && this._lvfh_hiddenColumns[fieldName]);
        },

        _lvfh_toggleField: function (fieldName) {
            if (!this._lvfh_hiddenColumns) {
                this._lvfh_hiddenColumns = {};
            }
            if (this._lvfh_hiddenColumns[fieldName]) {
                delete this._lvfh_hiddenColumns[fieldName];
            } else {
                this._lvfh_hiddenColumns[fieldName] = true;
            }
            this._lvfh_saveHiddenColumns();
        },

        // ---------------------------------------------------------------------
        // Overrides
        // ---------------------------------------------------------------------

        /**
         * Inject extra header cell with the column chooser dropdown.
         *
         * @override
         */
        _renderHeader: function (isGrouped) {
            var $thead = this._super.apply(this, arguments);

            var self = this;
            var $tr = $thead.find('tr').first();
            if (!$tr.length) {
                return $thead;
            }

            // Initialize storage key and load hidden columns if not already done
            if (!this._lvfh_storageKey) {
                this._lvfh_storageKey = this._lvfh_computeStorageKey();
                this._lvfh_hiddenColumns = this._lvfh_loadHiddenColumns();
            }

            // Only add chooser if we have columns
            if (!this.columns || this.columns.length === 0) {
                return $thead;
            }

            // Filter only field columns for the dropdown
            var fieldColumns = _.filter(this.columns, function(col) {
                return col.tag === 'field' && col.attrs && col.attrs.name;
            });

            if (fieldColumns.length === 0) {
                return $thead;
            }

            var $chooserTh = $('<th>').addClass('o_lvfh_column_chooser').css({
                'width': '1%',
                'white-space': 'nowrap',
                'text-align': 'right',
                'position': 'relative'
            });
            try {
                var templateData = {
                    columns: fieldColumns,
                    fields: this.state && this.state.fields || {},
                    hiddenColumns: this._lvfh_hiddenColumns || {},
                };
                var $chooser = $(qweb.render('list_view_field_hidden.ColumnChooser', templateData));
                $chooserTh.append($chooser);
            } catch (e) {
                console.error('Error rendering column chooser:', e);
                // Fallback: create a simple button
                var $fallbackBtn = $('<button>')
                    .addClass('btn btn-secondary btn-sm')
                    .html('<span class="fa fa-sliders"></span>')
                    .attr('title', 'Column chooser');
                $chooserTh.append($fallbackBtn);
                return $thead;
            }

            // put chooser at the far right to match modern Odoo style
            $tr.append($chooserTh);

            // Initialize Bootstrap dropdown
            if ($.fn.dropdown) {
                var $toggle = $chooserTh.find('.dropdown-toggle');
                var $menu = $chooserTh.find('.dropdown-menu');
                
                // Check if we're in a form view (one2many field)
                var $formView = this.$el.closest('.o_field_x2many, .o_field_one2many, .o_field_x2many_list');
                var isInFormView = $formView.length > 0;
                
                if (isInFormView) {
                    // In form view, ensure dropdown menu can escape overflow containers
                    // Use Bootstrap's dropdown events to adjust positioning
                    $toggle.on('show.bs.dropdown', function(e) {
                        var $btn = $(this);
                        var $dropdown = $menu.parent();
                        
                        // Store original parent for restoration
                        if (!$dropdown.data('original-parent')) {
                            $dropdown.data('original-parent', $dropdown.parent());
                        }
                        
                        // Calculate position after a short delay to ensure menu is rendered
                        setTimeout(function() {
                            var offset = $btn.offset();
                            var btnWidth = $btn.outerWidth();
                            var btnHeight = $btn.outerHeight();
                            var menuWidth = $menu.outerWidth() || 200; // fallback width
                            var windowWidth = $(window).width();
                            var windowHeight = $(window).height();
                            var scrollTop = $(window).scrollTop();
                            var scrollLeft = $(window).scrollLeft();
                            
                            // Calculate max height based on available viewport space
                            var maxMenuHeight = Math.min(400, windowHeight - 100); // Leave 100px margin
                            
                            // Move menu to body to escape overflow containers
                            var $body = $('body');
                            $menu.appendTo($body);
                            
                            // Set max height and ensure scrolling works
                            $menu.css({
                                'max-height': maxMenuHeight + 'px',
                                'overflow-y': 'auto',
                                'overflow-x': 'hidden'
                            });
                            
                            // Calculate position relative to viewport (fixed positioning)
                            var left = offset.left + btnWidth - menuWidth - scrollLeft;
                            var top = offset.top + btnHeight - scrollTop;
                            
                            // Ensure menu doesn't go off screen horizontally
                            if (left < 10) {
                                left = offset.left - scrollLeft + 10;
                            }
                            if (left + menuWidth > windowWidth - 10) {
                                left = windowWidth - menuWidth - 10;
                            }
                            
                            // Ensure menu doesn't go off screen vertically
                            // If not enough space below, show above button
                            var spaceBelow = windowHeight - (top + scrollTop);
                            var spaceAbove = (offset.top - scrollTop);
                            
                            if (spaceBelow < maxMenuHeight && spaceAbove > spaceBelow) {
                                // Show above button
                                top = offset.top - scrollTop - maxMenuHeight;
                                if (top < 10) {
                                    // If still not enough space, show at top with max height
                                    top = 10;
                                    maxMenuHeight = Math.min(maxMenuHeight, windowHeight - 20);
                                    $menu.css('max-height', maxMenuHeight + 'px');
                                }
                            } else if (top + maxMenuHeight > windowHeight - 10) {
                                // Adjust to fit in viewport
                                top = windowHeight - maxMenuHeight - 10;
                                if (top < 10) {
                                    top = 10;
                                }
                            }
                            
                            $menu.css({
                                'position': 'fixed',
                                'z-index': '1051',
                                'left': left + 'px',
                                'top': top + 'px',
                                'right': 'auto',
                                'display': 'block'
                            });
                        }, 10);
                    });
                    
                    $toggle.on('hide.bs.dropdown', function() {
                        // Restore menu to original position
                        var $dropdown = $menu.parent();
                        var originalParent = $dropdown.data('original-parent');
                        if (originalParent && originalParent.length) {
                            $menu.appendTo(originalParent);
                        }
                        $menu.css({
                            'position': '',
                            'left': '',
                            'top': '',
                            'right': '',
                            'display': ''
                        });
                    });
                }
                
                $toggle.dropdown();
            }

            // apply hidden state on existing header cells
            // This ensures columns are hidden immediately during header rendering
            _.each(this.columns, function (node, index) {
                if (node.tag !== 'field') {
                    return;
                }
                if (self._lvfh_isHidden(node.attrs.name)) {
                    // header cells are after optional selector column
                    var headerIndex = index;
                    if (self.hasSelectors) {
                        headerIndex += 1;
                    }
                    var $headerCell = $tr.children('th,td').eq(headerIndex);
                    if ($headerCell.length) {
                        $headerCell.addClass('o_lvfh_col_hidden').hide();
                    }
                }
            });

            return $thead;
        },

        /**
         * Hide body cells for fields configured as hidden.
         *
         * @override
         */
        _renderBodyCell: function (record, node, colIndex, options) {
            var $td = this._super(record, node, colIndex, options);
            if (node.tag === 'field' && this._lvfh_isHidden(node.attrs.name)) {
                $td.addClass('o_lvfh_col_hidden').hide();
            }
            return $td;
        },

        /**
         * When the renderer state is updated (paging, filters...), ensure
         * we still use the same storage key and preferences.
         *
         * @override
         */
        updateState: function (state, params) {
            var res = this._super.apply(this, arguments);
            
            // Recompute storage key and reload hidden columns when state changes
            var oldKey = this._lvfh_storageKey;
            this._lvfh_storageKey = this._lvfh_computeStorageKey();
            
            // Always reload hidden columns to ensure we have the latest settings
            // This is important when navigating via menu, as the view might be reused
            this._lvfh_hiddenColumns = this._lvfh_loadHiddenColumns();
            
            return res;
        },

        /**
         * Override _renderView to ensure dropdown is initialized after rendering
         * and hidden columns are applied.
         *
         * @override
         */
        _renderView: function () {
            var self = this;
            
            // Always ensure storage key is computed and hidden columns are loaded
            // This is critical when navigating via menu
            this._lvfh_storageKey = this._lvfh_computeStorageKey();
            this._lvfh_hiddenColumns = this._lvfh_loadHiddenColumns();
            
            var result = this._super.apply(this, arguments);
            
            // Apply hidden columns after rendering
            var applyHiddenColumns = function() {
                // Apply hidden columns to header and body
                if (self._lvfh_hiddenColumns && self.columns) {
                    _.each(self.columns, function(node, index) {
                        if (node.tag === 'field' && node.attrs && node.attrs.name) {
                            if (self._lvfh_isHidden(node.attrs.name)) {
                                // Calculate header cell index (accounting for selector column)
                                var headerIndex = index;
                                if (self.hasSelectors) {
                                    headerIndex += 1;
                                }
                                
                                // Hide header cell
                                var $headerRow = self.$('thead tr').first();
                                if ($headerRow.length) {
                                    var $headerCell = $headerRow.children('th,td').eq(headerIndex);
                                    if ($headerCell.length && !$headerCell.hasClass('o_lvfh_column_chooser')) {
                                        $headerCell.addClass('o_lvfh_col_hidden').hide();
                                    }
                                }
                                
                                // Hide body cells
                                var bodyCellIndex = headerIndex;
                                self.$('tbody tr').each(function() {
                                    var $row = $(this);
                                    if (!$row.hasClass('o_group_header')) {
                                        var $cells = $row.children('td,th');
                                        if ($cells.length > bodyCellIndex) {
                                            $cells.eq(bodyCellIndex).addClass('o_lvfh_col_hidden').hide();
                                        }
                                    }
                                });
                                
                                // Hide footer cells if exists
                                var $footerRow = self.$('tfoot tr').first();
                                if ($footerRow.length) {
                                    var $footerCells = $footerRow.children('td,th');
                                    if ($footerCells.length > bodyCellIndex) {
                                        $footerCells.eq(bodyCellIndex).addClass('o_lvfh_col_hidden').hide();
                                    }
                                }
                            }
                        }
                    });
                }
                self._lvfh_initDropdown();
            };
            
            // Initialize dropdown after rendering completes
            if (result && result.then) {
                result.then(function() {
                    applyHiddenColumns();
                });
            } else {
                // If not a promise, initialize immediately
                setTimeout(function() {
                    applyHiddenColumns();
                }, 0);
            }
            
            return result;
        },

        /**
         * Initialize Bootstrap dropdown for column chooser.
         *
         * @private
         */
        _lvfh_initDropdown: function () {
            var self = this;
            this.$('.o_lvfh_dropdown .dropdown-toggle').each(function() {
                var $toggle = $(this);
                // Only initialize if not already initialized
                if (!$toggle.data('bs.dropdown') && $.fn.dropdown) {
                    try {
                        $toggle.dropdown();
                    } catch (e) {
                        console.warn('[list_view_field_hidden] Failed to initialize dropdown:', e);
                    }
                }
            });
        },

        // ---------------------------------------------------------------------
        // Handlers
        // ---------------------------------------------------------------------

        /**
         * Handle click on the whole dropdown item.
         */
        _onToggleColumnVisibility: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            
            var $item = $(ev.currentTarget);
            var fieldName = $item.data('name');
            if (!fieldName) {
                return;
            }
            
            // Toggle the field visibility
            this._lvfh_toggleField(fieldName);
            
            // Update checkbox state immediately without closing dropdown
            var $checkbox = $item.find('input[type="checkbox"]');
            $checkbox.prop('checked', !this._lvfh_isHidden(fieldName));
            
            // Update column visibility without full re-render
            this._lvfh_updateColumnVisibility(fieldName);
        },

        /**
         * When clicking directly on the checkbox, we want the same behavior as
         * clicking the item, but avoid two toggles.
         */
        _onToggleColumnVisibilityCheckbox: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            
            // checkbox is inside the .o_lvfh_field_item
            var $item = $(ev.currentTarget).closest('.o_lvfh_field_item');
            var fieldName = $item.data('name');
            if (!fieldName) {
                return;
            }
            
            // Toggle the field visibility
            this._lvfh_toggleField(fieldName);
            
            // Update column visibility without full re-render
            this._lvfh_updateColumnVisibility(fieldName);
        },

        /**
         * Update column visibility without full re-render.
         * This keeps the dropdown menu open.
         *
         * @private
         */
        _lvfh_updateColumnVisibility: function (fieldName) {
            var self = this;
            var isHidden = this._lvfh_isHidden(fieldName);
            
            // Find the column index in this.columns array
            var columnIndex = -1;
            _.each(this.columns, function (node, index) {
                if (node.tag === 'field' && node.attrs && node.attrs.name === fieldName) {
                    columnIndex = index;
                }
            });
            
            if (columnIndex === -1) {
                return;
            }
            
            // Calculate header cell index (accounting for selector column)
            var headerIndex = columnIndex;
            if (this.hasSelectors) {
                headerIndex += 1;
            }
            
            // Update header cell visibility
            var $headerRow = this.$('thead tr').first();
            if ($headerRow.length) {
                var $headerCells = $headerRow.children('th,td');
                if ($headerCells.length > headerIndex) {
                    var $headerCell = $headerCells.eq(headerIndex);
                    if (isHidden) {
                        $headerCell.addClass('o_lvfh_col_hidden').hide();
                    } else {
                        $headerCell.removeClass('o_lvfh_col_hidden').show();
                    }
                }
            }
            
            // Update all body cells for this column
            // Note: body cells are in the same order as columns (selector is prepended)
            this.$('tbody tr').each(function() {
                var $row = $(this);
                // Skip group header rows
                if ($row.hasClass('o_group_header')) {
                    return;
                }
                var $cells = $row.children('td,th');
                // Body cells: selector (if exists) + columns
                var bodyCellIndex = columnIndex + (self.hasSelectors ? 1 : 0);
                if ($cells.length > bodyCellIndex) {
                    var $cell = $cells.eq(bodyCellIndex);
                    if (isHidden) {
                        $cell.addClass('o_lvfh_col_hidden').hide();
                    } else {
                        $cell.removeClass('o_lvfh_col_hidden').show();
                    }
                }
            });
            
            // Also update group rows if grouped
            if (this.isGrouped) {
                this.$('.o_group_header').each(function() {
                    var $groupRow = $(this);
                    var $cells = $groupRow.children('td,th');
                    // Group rows: first cell is group name (colspan may vary), then columns
                    // Skip selector and group name cell
                    var groupCellIndex = columnIndex + (self.hasSelectors ? 1 : 0);
                    if ($cells.length > groupCellIndex) {
                        var $cell = $cells.eq(groupCellIndex);
                        if (isHidden) {
                            $cell.addClass('o_lvfh_col_hidden').hide();
                        } else {
                            $cell.removeClass('o_lvfh_col_hidden').show();
                        }
                    }
                });
            }
            
            // Update footer if exists
            var $footerRow = this.$('tfoot tr').first();
            if ($footerRow.length) {
                var $footerCells = $footerRow.children('td,th');
                var footerCellIndex = columnIndex + (self.hasSelectors ? 1 : 0);
                if ($footerCells.length > footerCellIndex) {
                    var $footerCell = $footerCells.eq(footerCellIndex);
                    if (isHidden) {
                        $footerCell.addClass('o_lvfh_col_hidden').hide();
                    } else {
                        $footerCell.removeClass('o_lvfh_col_hidden').show();
                    }
                }
            }
        },
    });
});


