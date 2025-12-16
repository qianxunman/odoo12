odoo.define('web.TimeRangeMenu', function (require) {
"use strict";

var config = require('web.config');
var core = require('web.core');
var Domain = require('web.Domain');
var TimeRangeMenuOptions = require('web.TimeRangeMenuOptions');
var Widget = require('web.Widget');

var _t = core._t;
var ComparisonOptions = TimeRangeMenuOptions.ComparisonOptions;
var PeriodOptions = TimeRangeMenuOptions.PeriodOptions;

var TimeRangeMenu = Widget.extend({
    template: 'web.TimeRangeMenu',
    events: {
        'click .o_apply_range': '_onApplyButtonClick',
        'click .o_comparison_checkbox': '_onCheckBoxClick',
        'change .o_time_range_selector': '_onTimeRangeSelectorChange',
        'change .o_comparison_time_range_selector': '_onComparisonTimeRangeSelectorChange',
    },

    /**
     * override
     * @param {Widget} parent
     * @param {Object} fields
     * @param {Object} configuration
     *
     */
    init: function(parent, fields, configuration) {
        var self = this;
        this.isMobile = config.device.isMobile;
        this.symbol = this.isMobile ? 'fa fa-chevron-right float-right mt4' : 'caret';
        this._super(parent);
        this.dateFields = [];
        _.each(fields, function (field, name) {
            if (field.sortable && _.contains(['date', 'datetime'], field.type)) {
                self.dateFields.push(_.extend({}, field, {
                    name: name,
                }));
            }
        });
        this.periodOptions = PeriodOptions;
        this.periodGroups = PeriodOptions.reduce(
            function (acc, option) {
                if (!_.contains(acc, option.groupId)) {
                    acc.push(option.groupId);
                }
                return acc;
            },
            []
        );

        this.comparisonOptions = ComparisonOptions;

        // Following steps determine initial configuration
        this.isActive = false;
        this.timeRangeId = undefined;
        this.comparisonIsSelected = false;
        this.comparisonTimeRangeId = undefined;
        this.dateField = {};
        this.customStartDate = undefined;
        this.customEndDate = undefined;
        this.customComparisonStartDate = undefined;
        this.customComparisonEndDate = undefined;
        if (configuration && configuration.field && configuration.range) {
            this.isActive = true;
            var dateField = _.findWhere(this.dateFields, {name: configuration.field});
            this.dateField = {
                name: dateField.name,
                description: dateField.string,
                type: dateField.type,
            };
            this.timeRangeId = configuration.range;
            if (configuration.comparison_range) {
                this.comparisonIsSelected = true;
                this.comparisonTimeRangeId = configuration.comparison_range;
            }
            if (configuration.range === 'custom') {
                this.customStartDate = configuration.custom_start_date;
                this.customEndDate = configuration.custom_end_date;
            }
            if (configuration.comparison_range === 'custom') {
                this.customComparisonStartDate = configuration.custom_comparison_start_date;
                this.customComparisonEndDate = configuration.custom_comparison_end_date;
            }
        }
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    start: function () {
        var result = this._super.apply(this, arguments);
        // Initialize custom date range visibility
        if (this.timeRangeId === 'custom') {
            this.$('.o_custom_date_range_container').removeClass('o_hidden');
        } else {
            this.$('.o_custom_date_range_container').addClass('o_hidden');
        }
        // Initialize custom comparison date range visibility
        if (this.comparisonIsSelected && this.comparisonTimeRangeId === 'custom') {
            this.$('.o_custom_comparison_date_range_container').removeClass('o_hidden');
        } else {
            this.$('.o_custom_comparison_date_range_container').addClass('o_hidden');
        }
        return result;
    },

    deactivate: function () {
        this.isActive = false;
        this.comparisonIsSelected = false;
        this.renderElement();
    },
    /**
     * Generates a :js:class:`~instance.web.search.Facet` descriptor from a
     * filter descriptor
     *
     * @returns {Object}
     */
    facetFor: function () {
        var fieldDescription;
        var timeRange = "[]";
        var timeRangeDescription;
        var comparisonTimeRange = "[]";
        var comparisonTimeRangeDescription;

        if (this.isActive) {
            fieldDescription = this.dateField.description;
            if (this.timeRangeId !== 'custom') {
                timeRange = Domain.prototype.constructDomain(
                    this.dateField.name,
                    this.timeRangeId,
                    this.dateField.type
                );
                var rawDescriptionRange = _.findWhere(
                    this.periodOptions,
                    {optionId: this.timeRangeId}
                ).description;
                // the attribute is a lazy loaded translation
                timeRangeDescription = rawDescriptionRange.toString ? rawDescriptionRange.toString() : rawDescriptionRange;
            } else {
                // Custom date range
                if (this.customStartDate && this.customEndDate) {
                    var fieldName = this.dateField.name;
                    var fieldType = this.dateField.type;
                    if (fieldType === 'date') {
                        timeRange = "['&'," +
                            "('" + fieldName + "', '>=', '" + this.customStartDate + "')," +
                            "('" + fieldName + "', '<=', '" + this.customEndDate + "')" +
                            "]";
                    } else {
                        // datetime field
                        timeRange = "['&'," +
                            "('" + fieldName + "', '>=', '" + this.customStartDate + " 00:00:00')," +
                            "('" + fieldName + "', '<=', '" + this.customEndDate + " 23:59:59')" +
                            "]";
                    }
                    timeRangeDescription = this.customStartDate + ' - ' + this.customEndDate;
                }
            }
            if (this.comparisonIsSelected) {
                if (this.comparisonTimeRangeId === 'custom' && this.customComparisonStartDate && this.customComparisonEndDate) {
                    // Custom comparison date range
                    var comparisonFieldName = this.dateField.name;
                    var comparisonFieldType = this.dateField.type;
                    if (comparisonFieldType === 'date') {
                        comparisonTimeRange = "['&'," +
                            "('" + comparisonFieldName + "', '>=', '" + this.customComparisonStartDate + "')," +
                            "('" + comparisonFieldName + "', '<=', '" + this.customComparisonEndDate + "')" +
                            "]";
                    } else {
                        // datetime field
                        comparisonTimeRange = "['&'," +
                            "('" + comparisonFieldName + "', '>=', '" + this.customComparisonStartDate + " 00:00:00')," +
                            "('" + comparisonFieldName + "', '<=', '" + this.customComparisonEndDate + " 23:59:59')" +
                            "]";
                    }
                    comparisonTimeRangeDescription = this.customComparisonStartDate + ' - ' + this.customComparisonEndDate;
                } else {
                    comparisonTimeRange = Domain.prototype.constructDomain(
                        this.dateField.name,
                        this.timeRangeId,
                        this.dateField.type,
                        null,
                        this.comparisonTimeRangeId
                    );
                    var rawDescriptionCompare = _.findWhere(
                        this.comparisonOptions,
                        {optionId: this.comparisonTimeRangeId}
                    ).description;
                    // the attribute is a lazy loaded translation
                    comparisonTimeRangeDescription = rawDescriptionCompare.toString ? rawDescriptionCompare.toString() : rawDescriptionCompare;
                }
            }
        }

        return {
            cat: 'timeRangeCategory',
            category: _t("Time Range"),
            icon: 'fa fa-calendar',
            field: {
                get_context: function (facet, noDomainEvaluation) {
                    if (!noDomainEvaluation) {
                            timeRange = Domain.prototype.stringToArray(timeRange);
                            comparisonTimeRange = Domain.prototype.stringToArray(comparisonTimeRange);
                    }
                    return {
                        timeRangeMenuData: {
                            timeRange: timeRange,
                            timeRangeDescription: timeRangeDescription,
                            comparisonTimeRange: comparisonTimeRange,
                            comparisonTimeRangeDescription: comparisonTimeRangeDescription,
                        }
                    };
                },
                get_groupby: function () {},
                get_domain: function () {}
            },
            isRange: true,
            values: [{
                label: fieldDescription + ': ' + timeRangeDescription +
                    (
                        comparisonTimeRangeDescription ?
                            (' / ' + comparisonTimeRangeDescription) :
                            ''
                    ),
                value: null,
            }],
        };
    },
    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onApplyButtonClick: function () {
        this.isActive = true;
        var dateFieldName = this.$('.o_date_field_selector').val();
        this.timeRangeId = this.$('.o_time_range_selector').val();
        if (this.comparisonIsSelected) {
            this.comparisonTimeRangeId = this.$('.o_comparison_time_range_selector').val();
        }
        this.dateField = {
            name: dateFieldName,
            type: _.findWhere(this.dateFields, {name: dateFieldName}).type,
            description: _.findWhere(this.dateFields, {name: dateFieldName}).string,
        };
        
        // Handle custom date range
        if (this.timeRangeId === 'custom') {
            this.customStartDate = this.$('.o_custom_start_date').val();
            this.customEndDate = this.$('.o_custom_end_date').val();
        }
        
        // Handle custom comparison date range
        if (this.comparisonIsSelected && this.comparisonTimeRangeId === 'custom') {
            this.customComparisonStartDate = this.$('.o_custom_comparison_start_date').val();
            this.customComparisonEndDate = this.$('.o_custom_comparison_end_date').val();
        }

        this.renderElement();
        this.trigger_up('time_range_modified');
    },
    /**
     * @private
     * Handle time range selector change to show/hide custom date inputs
     */
    _onTimeRangeSelectorChange: function () {
        var selectedRange = this.$('.o_time_range_selector').val();
        if (selectedRange === 'custom') {
            this.$('.o_custom_date_range_container').removeClass('o_hidden');
        } else {
            this.$('.o_custom_date_range_container').addClass('o_hidden');
        }
        this.$el.addClass('open');
    },
    /**
     * @private
     * Handle comparison time range selector change to show/hide custom comparison date inputs
     */
    _onComparisonTimeRangeSelectorChange: function () {
        var selectedComparisonRange = this.$('.o_comparison_time_range_selector').val();
        if (selectedComparisonRange === 'custom') {
            this.$('.o_custom_comparison_date_range_container').removeClass('o_hidden');
        } else {
            this.$('.o_custom_comparison_date_range_container').addClass('o_hidden');
        }
        this.$el.addClass('open');
    },
    /**
     * @private
     *
     * @param {JQueryEvent} ev
     */
    _onCheckBoxClick: function (ev) {
        ev.stopPropagation();
        this.comparisonIsSelected = this.$('.o_comparison_checkbox').prop('checked');
        this.$('.o_comparison_time_range_selector').toggleClass('o_hidden');
        // Update custom comparison date range visibility
        var selectedComparisonRange = this.$('.o_comparison_time_range_selector').val();
        if (this.comparisonIsSelected && selectedComparisonRange === 'custom') {
            this.$('.o_custom_comparison_date_range_container').removeClass('o_hidden');
        } else {
            this.$('.o_custom_comparison_date_range_container').addClass('o_hidden');
        }
        this.$el.addClass('open');
    }
});

return TimeRangeMenu;

});
