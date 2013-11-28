/**
 * a component that displays and allows interaction with test steps for a test case
 */

Ext.define('Rally.technicalservices.TestStepTable',{
    extend: 'Ext.Container',
    alias: 'widget.tsteststeptable',
    config: {
        /**
         * 
         * The test case record (the kind from a wsapi datastore, reponds to a "get")
         * {@TestCase} test_case  
         */
        test_case: null,
        test_steps: [],
        current_index: -1,
        /**
         * 
         * [ @String ] step_vericts  An array of valid verdicts for each step 
         */
        step_verdicts: ['Not Run','Pass','Fail'],
        step_verdict_store: null,
        tester: null
    },
    items: [
        {xtype:'container',itemId:'summary_box'},
        {xtype:'container',itemId:'grid_box', padding: 10, margin: 10},
        {xtype:'container',itemId:'action_box', defaults: { padding: 5, margin: 5 }, layout: { type: 'hbox', pack: 'center' }}
    ],
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
        
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event verdictChosen
             * Fires when user clicks one of the verdict buttons
             * @param {Rally.technicalservices.TestStepTable} this
             * @param {model} test_case 
             * @param {String} verdict
             * @param [{Record}] steps 
             */
            'verdictChosen',
            /**
             * @event stepUpdated
             * Fires when user modifies one of the steps (e.g., to set a verdict to the step)
             * @param {Rally.technicalservices.TestStepTable} this
             * @param {Rally.data.custom.Store} step_store  The data store holding the steps in the table
             * @param {Record} step The step that changed
             * @param [{String}] modified_field_names  The fields that changed on the record 
             */
            'stepUpdated'
        );
        this._defineStepVerdictStore();
        this._setSummary();
        this._makeGrid();
    },
    _defineStepVerdictStore: function() {
        var data = [];
        Ext.Array.each(this.step_verdicts,function(verdict){
            data.push({dataIndex:verdict,text:verdict});
        });
        this.step_verdict_store = Ext.create('Rally.data.custom.Store',{
            data:data
        });
    },
    _setSummary: function() {
        this.down('#summary_box').add({
            xtype:'container',
            html:'Test Case: ' + this.test_case.get('FormattedID') + ": " + this.test_case.get('Name')
        });
    },
    _makeGrid: function() {
        this.down('#grid_box').removeAll();
        var me = this;
        
        if ( this.test_case ) {
            this.test_case.getCollection('Steps').load({
                fetch: ['StepIndex','Input', 'ExpectedResult'],
                scope: this,
                callback: function(steps, operation, success) {
                    this.test_steps = steps;
                    if ( steps.length === 0 ) {
                        this.down('#grid_box').add({
                            xtype:'container',
                            html:'No steps found for ' + this.test_case.get('FormattedID') + ' ' + this.test_case.get('Name')
                        });
                    } else {
                        this.step_store = Ext.create('Rally.data.custom.Store',{
                            data: steps,
                            listeners: {
                                scope: this,
                                load: function(store,records) {
                                    Ext.Array.each(records,function(record){
                                        record.set('Verdict','Not Run')
                                    });
                                },
                                update: function(store,record,operation,modified_field_names){
                                    this.fireEvent('stepUpdated',this,store,record,operation,modified_field_names);
                                    this._enableAllButtons();
                                }
                            }
                        });
                        
                        var addOneRenderer = function(value) {
                            if (Ext.isNumber(value)) {
                                return value + 1;
                            }
                            return value;
                        };
                        this.down('#grid_box').add({
                            xtype:'rallygrid',
                            store: this.step_store,
                            sortableColumns: false,
                            showRowActionsColumn: false,
                            columnCfgs: [
                                { dataIndex:'StepIndex', text:'Step', renderer: addOneRenderer },
                                { dataIndex:'Input', text:'Input', flex: 1},
                                { dataIndex:'ExpectedResult',text:'Expected Result', flex: 1},
                                { dataIndex:'Verdict',text:'Step Verdict', editor: {
                                    xtype:'rallycombobox',
                                    store:me.step_verdict_store,
                                    displayField:'text',
                                    valueField:'dataIndex'
                                }}
                            ]
                        });
    
                        this.down('#action_box').add({
                            xtype: 'rallybutton',
                            itemId: 'reset_button',
                            text: 'All Steps Not Run',
                            disabled: false,
                            scope: this,
                            handler: function() {
                                this._setAllSteps('Not Run');
                            } 
                        }); 
                        this.down('#action_box').add({
                            xtype: 'rallybutton',
                            itemId: 'pass_button',
                            text: 'All Steps Pass',
                            disabled: false,
                            scope: this,
                            handler: function() {
                                this._setAllSteps('Pass');
                            } 
                        });
                    }                    
                    this.down('#action_box').add({
                        xtype: 'rallybutton',
                        itemId: 'save_pass_button',
                        text: 'Pass This Test',
                        disabled: false,
                        scope: this,
                        handler: function() {
                            this._disableAllButtons();
                            this.fireEvent('verdictChosen',this,this.test_case,'Pass',this._getAllSteps());
                        } 
                    });
                    this.down('#action_box').add({
                        xtype: 'rallybutton',
                        itemId: 'save_fail_button',
                        text: 'Fail This Test',
                        disabled: false,
                        scope: this,
                        handler: function() {
                            this._disableAllButtons();
                            this.fireEvent('verdictChosen',this,this.test_case,'Fail',this._getAllSteps());
                        } 
                    });
                }
            });
        }
    },
    _disableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(true);});
    },
    _enableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(false);});
    },
    _setAllSteps: function(verdict){
        var store = this.step_store;
        var step_count = store.getCount();
        for ( var i=0;i<step_count;i++ ) {
            var step = store.getAt(i);
            step.set('Verdict',verdict);
        }
    },
    _getAllSteps: function() {
        var steps = [];
        var store = this.step_store;
        if ( store ) {
            var step_count = store.getCount();
            for ( var i=0;i<step_count;i++ ) {
                var step = store.getAt(i);
                steps.push(step);
            }
        }
        return steps;
    }
});