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
        this._setSummary(this.test_case);
        this._addButtons();
        //this._makeGrid();
        this._makeOldTable();
    },
    refreshDisplay: function(test_case) {
        this._setSummary(test_case);
    },
    _addButtons: function() {
        var me = this;
        this.down('#action_box').add({
            xtype:'rallycombobox',
            itemId:'verdict_combo',
            displayField:'text',
            valueField:'dataIndex',
            store: me.step_verdict_store,
            value: 'None',
            fieldLabel: 'Verdict',
            labelWidth: 45
        });
        this.down('#action_box').add({
            xtype: 'rallybutton',
            itemId: 'set_step_button',
            disabled: true,
            text: 'Set All Steps to Verdict',
            disabled: true,
            scope: this,
            handler: function() {
                this.setAllSteps(me.down('#verdict_combo').getValue());
            } 
        });
        this.down('#action_box').add({
            xtype: 'rallybutton',
            itemId: 'save_verdict_button',
            text: 'Set Test Case to Verdict',
            disabled: true,
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
            this.down('#save_verdict_button').setDisabled(false);
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
                this.down('#set_step_button').setDisabled(false);
            }       
        }

    },
    _makeOldTable: function() {
        this.logger.log("  TestStepTable._makeOldTable ");
        this.down('#grid_box').removeAll();
        var me = this;
        
        if ( this.test_case ) {
            this.down('#save_verdict_button').setDisabled(false);
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
                        
                var addOneRenderer = function(value) {
                    if (Ext.isNumber(value)) {
                        return value + 1;
                    }
                    return value;
                };
                
                this.step_store = Ext.create('Rally.data.custom.Store',{
                    data: steps,
                    autoLoad: true
                });
                
                var text_box = "<input class='actual_" + this.test_case.get('FormattedID') + "' type='text' size=50/>";

                var verdict_box = this._getVerdictBox(this.test_case.get('FormattedID'));
                
                var columns = [
                    { dataIndex:'StepIndex', text:'Step', renderer: addOneRenderer },
                    { dataIndex:'Input', text:'Input' },
                    { dataIndex:'ExpectedResult',text:'Expected Result'},
                    { dataIndex:'ActualResult',text:'Actual Result', editor: text_box},
                    { dataIndex:'Verdict',text:'Step Verdict', editor: verdict_box }
                ];
                
                var html = "<table>";
                html += "<tr class='ts-grid-header'>";
                Ext.Array.each(columns,function(column){
                    html += "<th class='ts-grid-header'>" + column.text + "</th>";
                });
                html += "</tr>";
                
                Ext.Array.each(steps,function(step){
                    html += "<tr class='ts-grid-row'>";
                    Ext.Array.each(columns,function(column){
                        var display_value = step.get(column.dataIndex);
                        if ( typeof(column.renderer) === 'function' ) {
                            display_value = column.renderer(display_value,step);
                        }
                        if ( typeof(column.editor) === 'string' ) {
                            display_value = column.editor;
                        }
                        html += "<td class='ts-grid-cell'>" + display_value + "</td>";
                    });
                    html += "</tr>";
                });
                html += "</table>";
//              
                this.down('#grid_box').update(html);
                this.down('#set_step_button').setDisabled(false);
            }       
        }

    },
    _getVerdictBox: function(id) {
        var html = "<SELECT class='verdict_" + id +  "'>";
        this.step_verdict_store.each(function(verdict){
            html += "<OPTION value='" + verdict.get('dataIndex') + "'>" + verdict.get('text') + "</OPTION>";
        });
        html += "</SELECT>";
        return html;
    },
    _disableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(true);});
    },
    _enableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(false);});
    },
    _setVerdictListeners: function(){
        var me = this;
        var select_class = "verdict_" + this.test_case.get('FormattedID');
        var comboboxes = Ext.query('.' + select_class,this.down('#grid_box').getEl().getHTML());
        Ext.Array.each(comboboxes, function(combobox,idx){
            Ext.get(combobox).addListener('change',function(evt,el,o){ 
                me.step_store.getAt(idx).set('Verdict',el.value);
                me.fireEvent('stepUpdated',me,me.step_store,me.step_store.getAt(idx),"Verdict");
            });
        });
    },
    _setActualListeners: function(){
        var me = this;
        var select_class = "actual_" + this.test_case.get('FormattedID');
        var textboxes = Ext.query('.' + select_class,this.down('#grid_box').getEl().getHTML());
        Ext.Array.each(textboxes, function(textbox,idx){
            Ext.get(textbox).addListener('blur',function(evt,el,o){ 
                me.step_store.getAt(idx).set('ActualResult',el.value);
                me.fireEvent('stepUpdated',me,me.step_store,me.step_store.getAt(idx),"ActualResult");
            });
        });
    },
    setAllSteps: function(verdict){
        var me = this;
        var select_class = "verdict_" + this.test_case.get('FormattedID');
        var comboboxes = Ext.query('.' + select_class,this.down('#grid_box').getEl().getHTML());
        Ext.Array.each(comboboxes, function(combobox,idx){
            Ext.getDom(combobox).value = verdict;
            me.step_store.getAt(idx).set('Verdict',verdict);
            me.fireEvent('stepUpdated',me,me.step_store,me.step_store.getAt(idx),"Verdict");
        });
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
    },
    _clearActualResults: function() {
        var me = this;
        var select_class = "actual_" + this.test_case.get('FormattedID');
        var textboxes = Ext.query('.' + select_class,this.down('#grid_box').getEl().getHTML());
        Ext.Array.each(textboxes, function(textbox,idx){
            me.step_store.getAt(idx).set('ActualResult','');
            textbox.value = '';
        });
    },
    clearResults: function() {
        this.setAllSteps('None');
        this._clearActualResults();
    },
    render: function() {
        this.callParent(arguments);
        this._setVerdictListeners();
        this._setActualListeners();
    }
});