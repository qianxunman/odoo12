odoo.define('list_view_field_hidden.FormAutoEdit', function (require) {
    "use strict";

    var FormView = require('web.FormView');
    var FormController = require('web.FormController');
    var core = require('web.core');

    /**
     * Extend FormView to always start in edit mode
     */
    FormView.include({
        /**
         * @override
         * Force form view to always start in edit mode
         */
        init: function (viewInfo, params) {
            this._super.apply(this, arguments);
            
            // Force mode to 'edit' regardless of currentId
            // This makes form views always open in edit mode
            var mode = 'edit';
            this.controllerParams.mode = mode;
            this.rendererParams.mode = mode;
        },
    });

    /**
     * Extend FormController to auto-save before leaving page
     */
    FormController.include({
        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);
            
            // Flag to track if we're currently auto-saving
            this._autoSaving = false;
            
            // Set up auto-save on page unload and navigation
            this._setupAutoSave();
        },

        /**
         * Set up auto-save functionality
         * - Saves when navigating away (willRestore, do_action)
         * - Saves before browser unload (beforeunload)
         *
         * @private
         */
        _setupAutoSave: function () {
            var self = this;
            
            // Save before browser unload (closing tab/window, refreshing page)
            // Note: Modern browsers limit what can be done in beforeunload
            // We'll try to save, but it may not complete
            $(window).on('beforeunload.auto_save_form', function () {
                self._autoSaveBeforeLeave(true); // true = synchronous attempt
            });
        },

        /**
         * Auto-save the record before leaving the page
         * Only saves if the record is dirty (has unsaved changes)
         *
         * @param {boolean} synchronous - if true, try synchronous save (for beforeunload)
         * @private
         */
        _autoSaveBeforeLeave: function (synchronous) {
            var self = this;
            
            // Prevent multiple simultaneous auto-saves
            if (this._autoSaving) {
                return;
            }
            
            // Check if record has unsaved changes
            if (!this.isDirty()) {
                return;
            }
            
            // Check if record can be saved (valid state)
            if (!this.canBeSaved()) {
                // If can't be saved (validation errors), don't try to save
                // User will see validation errors if they try to leave
                return;
            }
            
            // Mark as auto-saving
            this._autoSaving = true;
            
            try {
                // For synchronous saves (beforeunload), we can't wait for async operations
                // So we just trigger the save and hope it completes
                if (synchronous) {
                    // Try to save, but don't wait
                    this.saveRecord().catch(function (error) {
                        console.warn('[form_auto_edit] Auto-save failed:', error);
                    }).always(function () {
                        self._autoSaving = false;
                    });
                } else {
                    // For async saves (navigation), we can wait
                    this.saveRecord().then(function () {
                        self._autoSaving = false;
                    }).catch(function (error) {
                        console.warn('[form_auto_edit] Auto-save failed:', error);
                        self._autoSaving = false;
                    });
                }
            } catch (e) {
                // Silently fail if save throws an error
                console.warn('[form_auto_edit] Auto-save error:', e);
                this._autoSaving = false;
            }
        },

        /**
         * @override
         * Auto-save before restoring (navigating away)
         * Returns a promise that resolves after auto-save completes (if needed)
         */
        willRestore: function () {
            var self = this;
            
            // Check if we need to save
            if (this.isDirty() && this.canBeSaved()) {
                // Save before leaving - wait for save to complete
                return this.saveRecord().then(function () {
                    // After save completes, call parent method
                    self._super.apply(self, arguments);
                }).catch(function (error) {
                    // If save fails, still call parent (user might want to discard)
                    console.warn('[form_auto_edit] Auto-save before restore failed:', error);
                    self._super.apply(self, arguments);
                });
            } else {
                // No unsaved changes, proceed normally
                this._super.apply(this, arguments);
            }
        },

        /**
         * @override
         * Override _confirmSave to ensure form stays in edit mode after discard
         * This allows users to discard changes and continue editing
         */
        _confirmSave: function (id) {
            var self = this;
            
            if (id === this.handle) {
                // In edit mode, instead of switching to readonly after discard,
                // reload the record but keep it in edit mode
                if (this.mode === 'edit') {
                    // Reload the record but stay in edit mode
                    return this.reload().then(function () {
                        // Ensure we're still in edit mode after reload
                        if (self.mode !== 'edit') {
                            return self._setMode('edit');
                        }
                    });
                } else {
                    // In readonly mode, use parent behavior
                    return this._super.apply(this, arguments);
                }
            } else {
                // For subrecords, use parent behavior
                return this._super.apply(this, arguments);
            }
        },


        /**
         * @override
         * Clean up event listeners when controller is destroyed
         */
        destroy: function () {
            // Remove beforeunload listener
            $(window).off('beforeunload.auto_save_form');
            
            this._super.apply(this, arguments);
        },
    });
});

