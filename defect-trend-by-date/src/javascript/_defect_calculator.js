Ext.define("Rally.TechnicalServices.burndown.DefectTrendCalculator", {
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",

    allowedValues: [],
    includeCreatedTotal: false,
    
    config: {
        closedStateNames: ['Closed']
    },
    
    getDerivedFieldsOnInput: function () {
        var completedStates = this.config.closedStateNames
        var oid_cutline = 20631303804;
        var allowed_values = this.allowedValues || [];
        
        if ( typeof allowed_values === 'string' ) {
            allowed_values = allowed_values.split(/,/);
        }
        var derived_fields = [];
        if ( this.includeCreatedTotal ) {
            derived_fields.push({
                "as": "ExistingDefect",
                "f": function (snapshot) {  
                    if (snapshot.ObjectID > oid_cutline) {
                        return true;
                    } 
                    return false;
                }
            });
        }
        if ( allowed_values.length === 0 ) {
            derived_fields.push({
                "as": "ActiveDefect",
                "f": function (snapshot) {
                    var state = snapshot.State;
                    
                    if (snapshot.ObjectID > 20631303804 && Ext.Array.indexOf(completedStates,state) == -1) {
                        return true;
                    }
                    return false;
                }
            });
            derived_fields.push({
                "as": "ClosedDefect",
                "f": function (snapshot) {
                    var state = snapshot.State;
                    
                    if (snapshot.ObjectID > 20631303804 && Ext.Array.indexOf(completedStates,state) > -1) {
                        return true;
                    }
                    return false;
                }
            });
        } else {
            Ext.Array.each(allowed_values, function(allowed_value){
                derived_fields.push({
                    "as": allowed_value,
                    "f": function (snapshot) {
                        var state = snapshot.State;
                        
                        if (snapshot.ObjectID > 20631303804 && state == allowed_value ) {
                            return true;
                        }
                        return false;
                    }
                });
            });
        }
        
        return derived_fields;
    },

    getMetrics: function () {
        var allowed_values = this.allowedValues || [];
        if ( typeof allowed_values === 'string' ) {
            allowed_values = allowed_values.split(/,/);
        }
        var metrics = [];
        if ( this.includeCreatedTotal ) {
            metrics.push({
                "filterField": "ExistingDefect",
                'as':'Created',
                'f':'filteredCount',
                'filterValues':[true]
            });
        }
        
        if ( allowed_values.length === 0 ) {
            metrics.push({
                "filterField": "ActiveDefect",
                "as": "Open",
                "f": "filteredCount",
                "filterValues": [true]
            });
            metrics.push({
                "filterField": "ClosedDefect",
                "as": "Closed",
                "f": "filteredCount",
                "filterValues": [true]
            });
        } else {
            Ext.Array.each(allowed_values, function(allowed_value){
                metrics.push({
                    "filterField": allowed_value,
                    "as": allowed_value,
                    "f": "filteredCount",
                    "filterValues": [true]
                });
            });
        }
        
        return metrics;
    },

    getSummaryMetricsConfig: function () {
        return [];
    },

    getDerivedFieldsAfterSummary: function () {
        return  [];
    },

    runCalculation: function (snapshots) {
        var chartData = this.callParent(arguments);

        this._formatCategories(chartData);
        return chartData;
    },
    
    _formatCategories:function(chartData){
        var categories = [];
        Ext.Array.each(chartData.categories,function(category) {
            var date_array = category.split('-');
            categories.push(date_array[1] + "/" + date_array[2]);
        });
        
        chartData.categories = categories;
        
    }
});