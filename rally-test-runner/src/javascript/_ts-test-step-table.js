/**
 * a component that displays and allows interaction with test steps for a test case
 */

Ext.define('Rally.technicalservices.TestStepTable',{
    extend: 'Ext.Container',
    alias: 'widget.tsteststeptable',
    logger: new Rally.technicalservices.Logger(),
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
        step_verdicts: ['None','Pass','Fail'],
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
        this.logger.log("  TestStepTable.initComponent");
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
        this._setSummary(this.test_case);
        this._makeGrid();
    },
    refreshDisplay: function(test_case) {
        this._setSummary(test_case);
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
    _setSummary: function(test_case) {
        var verdict = test_case.get('LastVerdict') || "None";
       
        var verdict_date = test_case.get('LastRun');
        if ( verdict_date ) {
            verdict = verdict + "/" + verdict_date;
        }
        this.down('#summary_box').removeAll();
        this.down('#summary_box').add({
            xtype:'container',
            cls: 'title',
            html: Rally.nav.DetailLink.getLink({
                record: test_case.getData(),
                subPage: 'testcaseresults',
                text: test_case.get('FormattedID') }) + ": " + test_case.get('Name') + " (" + verdict + ")"
        });
    },
    _makeGrid: function() {
        this.logger.log("  TestStepTable._makeGrid ");
        this.down('#grid_box').removeAll();
        var me = this;
        
        if ( this.test_case ) {
            var steps = this.test_case.get("_steps");
            
            if ( steps.length === 0 ) {
                this.down('#grid_box').add({
                    xtype:'container',
                    html:'No steps found for ' + this.test_case.get('FormattedID') + ' ' + this.test_case.get('Name')
                });
            } else {
                this.logger.log("    Found steps: ", steps.length);
                Ext.Array.each(steps,function(step){
                    step.set('Verdict','None'),
                    step.set('ActualResult','')
                });
                          
                this.step_store = Ext.create('Rally.data.custom.Store',{
                    data: steps,
                    listeners: {
                        scope: this,
                        load: function(store,records) {
                            store.on(
                                'update',
                                function(store,record,operation,modified_field_names){
                                    this.fireEvent('stepUpdated',this,store,record,operation,modified_field_names);
                                    this._enableAllButtons();
                                },
                                this
                            );
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
                    showPagingToolbar: false,
                    columnCfgs: [
                        { dataIndex:'StepIndex', text:'Step', renderer: addOneRenderer },
                        { dataIndex:'Input', text:'Input', flex: 1},
                        { dataIndex:'ExpectedResult',text:'Expected Result', flex: 1},
                        { dataIndex:'ActualResult',text:'Actual Result', editor: 'rallytextfield', flex: 1},
                        { dataIndex:'Verdict',text:'Step Verdict', editor: {
                            xtype:'rallycombobox',
                            store:me.step_verdict_store,
                            displayField:'text',
                            valueField:'dataIndex'
                        }}
                    ]
                });

                this.down('#action_box').add({
                    xtype:'rallycombobox',
                    itemId:'verdict_combo',
                    displayField:'text',
                    valueField:'dataIndex',
                    store: me.step_verdict_store,
                    fieldLabel: 'Verdict',
                    labelWidth: 45
                });
                this.down('#action_box').add({
                    xtype: 'rallybutton',
                    itemId: 'pass_button',
                    text: 'Set All Steps to Verdict',
                    disabled: false,
                    scope: this,
                    handler: function() {
                        this.setAllSteps(me.down('#verdict_combo').getValue());
                    } 
                });
                
            }       
        }
        this.down('#action_box').add({
            xtype: 'rallybutton',
            itemId: 'save_verdict_button',
            text: 'Set Test Case to Verdict',
            disabled: false,
            scope: this,
            handler: function() {
                //this._disableAllButtons();
                var value = me.down('#verdict_combo').getValue();
                if ( value === "None" ) {
                    alert("Choose a verdict other than 'None'");
                } else {
                    this.fireEvent('verdictChosen',this,this.test_case,value,this._getAllSteps());
                }
            } 
        });
//        this.down('#action_box').add({
//            xtype: 'rallybutton',
//            itemId: 'save_fail_button',
//            text: 'Fail This Test',
//            disabled: false,
//            scope: this,
//            handler: function() {
//                //this._disableAllButtons();
//                this.fireEvent('verdictChosen',this,this.test_case,'Fail',this._getAllSteps());
//            } 
//        });
    },
    _disableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(true);});
    },
    _enableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(false);});
    },
    setAllSteps: function(verdict){
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