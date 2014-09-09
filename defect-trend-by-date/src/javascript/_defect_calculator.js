Ext.define("Rally.TechnicalServices.burndown.DefectTrendCalculator", {
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",

    config: {
        closedStateNames: ['Closed']
    },
    
    getDerivedFieldsOnInput: function () {
        var completedStates = this.config.closedStateNames
        
        return [
            {
                "as": "ActiveDefect",
                "f": function (snapshot) {
                    var state = snapshot.State;
                    
                    if (Ext.Array.indexOf(completedStates,state) == -1) {
                        return true;
                    }
                    return false;
                }
            },
            {
                "as": "ClosedDefect",
                "f": function (snapshot) {
                    var state = snapshot.State;
                    
                    if (Ext.Array.indexOf(completedStates,state) > -1) {
                        return true;
                    }
                    return false;
                }
            },
            {
                "as": "ExistingDefect",
                "f": function (snapshot) {  
                    return true;
                }
            }
        ];
    },

    getMetrics: function () {
        return [
            {
                "filterField": "ExistingDefect",
                'as':'Created',
                'f':'filteredCount',
                'filterValues':[true]
            },
            {
                "filterField": "ActiveDefect",
                "as": "Open",
                "f": "filteredCount",
                "filterValues": [true]
            },
            {
                "filterField": "ClosedDefect",
                "as": "Closed",
                "f": "filteredCount",
                "filterValues": [true]
            }
        ];
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
        console.log(chartData);
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