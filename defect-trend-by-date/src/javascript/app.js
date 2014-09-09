Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 5, padding: 5 },
    items: [
        {xtype:'container',itemId:'selector_box'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#selector_box').add({
            xtype:'rallydatefield',
            fieldLabel: 'Start Date:',
            labelWidth: 65,
            stateId: 'rally.technicalservices.trend.defect.date.start',
            stateful: true,
            stateEvents: ['change'],
            listeners: {
                scope: this,
                change: function(box) {
                    var start_date = box.getSubmitValue();
                    this.logger.log("Start Date:",start_date);
                    this._makeChart(this.down('#display_box'),start_date);
                }
            }
        });
    },
    _getUserTimeZone: function() {
        var tz = this.getContext().getUser().UserProfile.TimeZone;
        if (!tz) {
            tz = this.getContext().getWorkspace().WorkspaceConfiguration.TimeZone;
        }
        return tz;
    },
    _makeChart: function(display_box,start_date) {
        this.logger.log("_makeChart",start_date);
        start_date = Rally.util.DateTime.fromIsoString(start_date);
                
        display_box.removeAll();
        display_box.add({
            xtype:'rallychart',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    _TypeHierarchy: 'Defect',
                    _ProjectHierarchy: this.getContext().getProject().ObjectID
                },
                fetch: ['PlanEstimate','State','Release'],
                hydrate: ['State']
            },
            calculatorType: 'Rally.TechnicalServices.burndown.DefectTrendCalculator',
            calculatorConfig: {
                timeZone: this._getUserTimeZone(),
                startDate: start_date,
                granularity: 'day',
                workDays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
            },
            sort: {
                "_ValidFrom": 1
            },
            chartColors: ['#000000','#CC3366','#66FF66'],
            chartConfig: {
                chart: {
                    zoomType: "xy"
                },
                title: { text: 'Defect Trend' },
                xAxis: {
                    tickmarkPlacement: 'on',
                    tickInterval: 14,
                    title: { text: 'Days' },
                    labels: { rotation: -65, align: 'right' }
                },
                yAxis: [{
                    min: 0,
                    title:{text:'Count'}
                }],
                tooltip: {
                    shared: true
                }
            }
        });
    }
});
