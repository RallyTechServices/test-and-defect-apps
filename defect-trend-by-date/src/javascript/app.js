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
        if (this.isExternal()){
            this.showSettings(this.config);
        } else {
            this.onSettingsUpdate(this.getSettings());  
        }  
    },
    _preProcess: function() {
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

                    this._getAllowedValues().then({
                        scope: this,
                        success:function(results){
                            this._makeChart(this.down('#display_box'),start_date,results);
                        },
                        failure:function(message){
                            this.down('#display_box').add({xtype:'container',html:'message'});
                        }
                    });
                    
                }
            }
        });
    },
    _getAllowedValues:function(){
        var deferred = Ext.create('Deft.Deferred');
        var type_path = 'Defect';
        var group_by_field = 'State';
        
        var allowed_values = [];
        
        Rally.data.ModelFactory.getModel({
            type: type_path,
            success: function(model){
                var field = model.getField(group_by_field);
                var attribute_definition = field.attributeDefinition;
                if ( attribute_definition && attribute_definition.AttributeType == "BOOLEAN" ) {
                    deferred.resolve([true,false]);
                } else {
                    field.getAllowedValueStore().load({
                        callback: function(values,operation,success) {
                            Ext.Array.each(values, function(value){
                                allowed_values.push(value.get('StringValue'));
                            });
                            deferred.resolve(allowed_values);
                        }
                    });
                }
            },
            scope: this
        });
        return deferred.promise;
    },
    _getUserTimeZone: function() {
        var tz = this.getContext().getUser().UserProfile.TimeZone;
        if (!tz) {
            tz = this.getContext().getWorkspace().WorkspaceConfiguration.TimeZone;
        }
        return tz;
    },
    _makeChart: function(display_box,start_date,allowed_values) {
        this.logger.log("_makeChart",start_date,allowed_values);
        start_date = Rally.util.DateTime.fromIsoString(start_date);
        
        var show_states = this.getSetting('allowed_values') || allowed_values;
        var ignore_creation_date = this.getSetting('ignore_creation_date') || false;
        var environment = this.getSetting('environment') || false;
        
        var find = { 
            _TypeHierarchy: 'Defect',
            _ProjectHierarchy: this.getContext().getProject().ObjectID
        };
        if ( ! ignore_creation_date ) {
            find["CreationDate"] = { "$gt": start_date }
        }
        
        if (environment) {
            find["Environment"] = environment;
        }
        
        display_box.removeAll();
        display_box.add({
            xtype:'rallychart',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find:find,
                fetch: ['PlanEstimate','State','Release','CreationDate'],
                hydrate: ['State']
            },
            calculatorType: 'Rally.TechnicalServices.burndown.DefectTrendCalculator',
            calculatorConfig: {
                timeZone: this._getUserTimeZone(),
                startDate: start_date,
                granularity: 'day',
                allowedValues: show_states,
                includeCreatedTotal: this.getSetting('show_created_count') || false,
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
    },
    isExternal: function(){
      return typeof(this.getAppId()) == 'undefined';
    },
    
    _addCountToChoices: function(store){
        store.add({name:'Count',value:'Count',fieldDefinition:{}});
    },
        
    /********************************************
    /* Overrides for App class
    /*
    /********************************************/
    //getSettingsFields:  Override for App    
    getSettingsFields: function() {
        var me = this;
        
        var allowed_values = this.getSetting('allowed_values');
        this.logger.log("getting fields", allowed_values, typeof allowed_values);
        
        if ( typeof allowed_values === 'string' ) {
            allowed_values = allowed_values.split(/,/);
        }
        
        return [   {
            name: 'allowed_values',
            xtype: 'rallyfieldvaluecombobox',
            fieldLabel: 'Show States:',
            field: 'State',
            model: 'Defect',
            labelWidth: 75,
            width: 400,
            margin: 10,
            autoExpand: true,
            alwaysExpanded: true,
            multiSelect: true,
            readyEvent: 'ready'
        },
        {
            name: 'show_created_count',
            xtype:'rallycheckboxfield',
            fieldLabel: 'Show Total:',
            labelWidth: 75,
            margin: 10,
            readyEvent: 'ready'
        },
        {
            name: 'ignore_creation_date',
            xtype:'rallycheckboxfield',
            fieldLabel: 'Ignore Creation Date:',
            labelWidth: 75,
            margin: 10,
            readyEvent: 'ready'
        },
        {
            name: 'environment',
            xtype: 'rallyfieldvaluecombobox',
            fieldLabel: 'Environment',
            field: 'Environment',
            model: 'Defect',
            labelWidth: 75,
            margin: 10,
            readyEvent: 'ready'
        }];
    },
    //showSettings:  Override to add showing when external + scrolling
    showSettings: function(options) {
        this.logger.log("showSettings",options);
        this._appSettings = Ext.create('Rally.app.AppSettings', Ext.apply({
            fields: this.getSettingsFields(),
            settings: this.getSettings(),
            defaultSettings: this.getDefaultSettings(),
            context: this.getContext(),
            settingsScope: this.settingsScope
        }, options));

        this._appSettings.on('cancel', this._hideSettings, this);
        this._appSettings.on('save', this._onSettingsSaved, this);
        
        if (this.isExternal()){
            if (this.down('#display_box').getComponent(this._appSettings.id)==undefined){
                this.down('#display_box').add(this._appSettings);
            }
        } else {
            this.hide();
            this.up().add(this._appSettings);
        }
        return this._appSettings;
    },
    _onSettingsSaved: function(settings){
        this.logger.log('_onSettingsSaved',settings);
        Ext.apply(this.settings, settings);
        this._hideSettings();
        this.onSettingsUpdate(settings);
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        //Build and save column settings...this means that we need to get the display names and multi-list
        this.logger.log('onSettingsUpdate',settings);
        
        var type = this.getSetting('type');
        this._preProcess();
    }
});
