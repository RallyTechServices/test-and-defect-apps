Ext.define('Rally.technicalservices.TestCaseChooser',{
    extend:'Rally.ui.dialog.Dialog',
    alias:'widget.tstestcasechooser',
    logger: new Rally.technicalservices.Logger(),
    config: {
        title:'Choose Parents of Test Cases',
        width: 300,
        height: 300,
        multiple: 'MULTI'
    },
    items: [{
        xtype: 'panel',
        border: false,
        defaults: {
            padding: 5,
            margin: 5
        },
        items: [        
            {xtype:'container',itemId:'iteration_selector_box'},
            {xtype:'container',itemId:'grid_box'}
        ]
    }],
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event selectionMade
             * Fires when user clicks done after making choices
             * @param {Rally.technicalservices.TestCaseChooser} this
             * @param [{model}] array of chosen test cases
             */
            'selectionMade',
            /**
             * @event cancelChosen
             * Fires when user clicks the cancel button
             */
            'cancelChosen'
        );
        this._buildButtons();
        this._addIterationChooser();
    },
    _addIterationChooser: function() {
        this.down('#iteration_selector_box').add({
            xtype:'rallyiterationcombobox',
            fieldLabel:'Iteration',
            labelWidth: 50,
            listeners: {
                scope: this,
                change: function(ib,new_value){
                    this._getItemsAndMakeGrid(ib.getQueryFromSelected());
                }
            }
        });
    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    itemId:'run_button',
                    text: 'Run',
                    disabled: true,
                    scope: this,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        this.fireEvent('selectionMade', this, this._getTestCaseList());
                        this.close();
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    handler: function() {
                        this.fireEvent('cancelChosen');
                        this.close()
                    },
                    scope: this
                }
            ]
        });
    },
    _getTestCaseList: function() {
        return this.selectionModel.getSelection();
    },
    _getItemsAndMakeGrid: function(filter){
        var me = this;
                
        Deft.Promise.all([
            me._getItems("TestSet",filter), 
            me._getItems("HierarchicalRequirement",filter), 
            me._getItems("Defect",filter),
            me._getItems("TestFolder",filter)
        ]).then({
            success: function(records_by_type){
                var records = [];
                Ext.Array.each(records_by_type, function(records_for_type){
                    me.logger.log("Found ",records_for_type.length);
                    records = Ext.Array.push(records,records_for_type);
                });
                me._addGrid(records);
            }
        });
    },
    _getItems: function(model,filter) {
        var fetch = ['ObjectID','Name','FormattedID','TestCases'];
        this.logger.log(model,filter.toString());
        var deferred = Ext.create('Deft.Deferred');
        if ( model == "TestFolder" ) {
            filter = [{property:'ObjectID',operator:'>',value:1}];
        }
        Ext.create('Rally.data.wsapi.Store',{
            model:model,
            filters: filter,
            fetch: fetch,
            autoLoad: true,
            /*context: {
                projectScopeDown: false,
                projectScopeUp: false
            },*/
            listeners: {
                scope: this,
                load: function(store,items){
                    var records = [];
                    Ext.Array.each(items, function(item){
                        if (item.get('TestCases') && item.get('TestCases').Count > 0 ) {
                            records.push({
                                FormattedID:item.get('FormattedID'),
                                ObjectID:item.get('ObjectID'),
                                Name:item.get('Name'),
                                TestCases:item.get('TestCases'),
                                _type:item.get('_type')
                            });
                        }
                    });
                    deferred.resolve(records);
                }
            }
        });
        return deferred.promise;
    },
    _addGrid: function(records){
        this.logger.log("Making a grid with this many records: ", records.length);
        
        var store = Ext.create('Rally.data.custom.Store',{ 
            data: records,
            limit: 200,
            pageSize: 200
        });
        this.down('#grid_box').removeAll();
        
        var mode = this.multiple ? 'MULTI' : 'SINGLE';
        this.selectionModel = Ext.create('Rally.ui.selection.CheckboxModel', {
            mode: mode,
            allowDeselect: true
        });
            
        this.down('#grid_box').add({
            xtype:'rallygrid',
            store:store,
            height: 150,
            selModel:this.selectionModel,
            showPagingToolbar: false,
            columnCfgs:  [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Name',dataIndex:'Name', flex: 1}
            ]
        });
        
        this.down('#run_button').setDisabled(false);
    }
    
});