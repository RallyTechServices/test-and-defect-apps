Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    case_containers: {},
    all_cases: {},
    items: [
        {xtype:'container',itemId:'test_run', defaults: { padding: 5, margin: 5 }, layout: {type:'hbox'}, items: [
            {
                xtype:'rallytextfield',
                itemId:'build_box',
                fieldLabel:'Build used for this test run'
            }
        ]},
        {xtype:'container',itemId:'test_checks', defaults: { padding: 5, margin: 5 }, layout: {type:'hbox'}},
        {xtype:'container',itemId:'test_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._getCaseVerdicts().then({
            scope: this,
            success: function(verdicts) {
                this.logger.log("Verdicts:",verdicts);
                this.verdicts = verdicts;
                this.verdict_store = this._defineStepVerdictStore(this.verdicts);
                this._addSettingsButton();
                this._addCheckboxes(verdicts);
            },
            failure: function(error) {
                me.down('#message_box').update(error);
            }
        });

    },
    _addSettingsButton: function() {
        this.logger.log("_addSettingsButton");
        this.down('#test_run').add( {
            xtype:'rallybutton',
            text: 'Choose Test Parents',
            disabled: false,
            scope: this,
            handler: function() {
                if ( this.dialog ) { this.dialog.destroy(); }
                this.dialog = Ext.create('Rally.technicalservices.TestCaseChooser',{
                    listeners: {
                        scope: this,
                        selectionMade: function(dialog, parents) {
                            this._setAllChecked();
                            this._makeParentBoxes(parents);
                        }
                    }
                });
                this.dialog.show();
            } 
        });
    },
    _getCaseVerdicts: function() {
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log("_getCaseVerdicts");
        
        Rally.data.ModelFactory.getModel({
            type: 'TestCase',
            scope: this,
            success: function(model) {
                this.logger.log("got model");
                 model.getField('LastVerdict').getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        var verdicts = ["None"];
                        Ext.Array.each(records, function(allowedValue) {
                            //each record is an instance of the AllowedAttributeValue model 
                            verdicts.push(allowedValue.get('StringValue'));
                        });
                        deferred.resolve(verdicts);
                    }
                });
            }
        });
        return deferred.promise;
    },
    _addCheckboxes: function(verdicts) {
        var me = this;
        var boxes = [];
        Ext.Array.each(verdicts, function(verdict){
            boxes.push({
                boxLabel: verdict, 
                name: 'rb', 
                inputValue: verdict, 
                checked: true
            });
        });
        this.down('#test_checks').add({
            xtype: 'checkboxgroup',
            itemId: 'verdict_checks',
            fieldLabel: 'Show Cases with Last Verdict of',
            vertical: false,
            labelWidth: 100,
            width: 660,
            items:boxes
        });
        this.down('#verdict_checks').on('change',this._revealContainers, this);
    },
    _makeParentBoxes: function(parents){
        this.logger.log("_makeParentBoxes");
        var me = this;
        this.down('#test_box').removeAll();
        this.case_containers = {};
        this.all_cases = {};
        
        Ext.Array.each(parents,function(parent){
            var container = this.down('#test_box').add({
                xtype:'container',
                margin: 10,
                items: [{xtype:'container',cls:'title',html:parent.get('FormattedID') + ": " + parent.get('Name')}]
            });
            Rally.data.ModelFactory.getModel({
                type:parent.get('_type'),
                success:function(model){
                    model.load(parent.get('ObjectID'),{
                        fetch:['TestCases'],
                        callback:function(result,operation){
                            me._getTestCasesForParent(result,container);
                        }
                    });
                }
            });
        },this);
    },
    _getTestCasesForParent: function(parent,container) {
        this.logger.log("_getTestCasesForParent");
        this._mask("Loading test cases...");
        var me = this;
        parent.getCollection('TestCases').load({
            fetch: ['Name','FormattedID','Steps','WorkProduct','LastVerdict'],
            scope: this,
            sorters: [{property:'Rank'}],
            callback: function(cases,operation,success){
                this.logger.log("  _getTestCasesForParent callback", cases.length);
                this._getTestStepsForCases(container,cases);
            }
        });
    },
    _hashToArray: function(hash) {
        var result = [];
        Ext.Object.each(hash,function(key,value){
            result.push(value);
        });
        return result;
    },
    _mask: function(text) {
        var me = this;
        me.setLoading(text);
//        setTimeout(function(){
//           me.setLoading(text);
//        },10);
    },
    _unmask: function() {
        this.setLoading(false);
    },
    _getTestStepsForCases: function(container,cases) {
        this.logger.log("_getTestStepsForCases ",cases.length);
        this._mask("Loading test steps...");
        var case_filters = [];
        var case_hash = {};

        Ext.Array.each(cases,function(tc){ 
            case_filters.push({property:'TestCase.ObjectID',value:tc.get('ObjectID')});
            tc.set('_steps',[]);
            case_hash[tc.get('ObjectID')] = tc;
        });
        
        var filters = Ext.create('Rally.data.wsapi.Filter',case_filters[0]);
        for ( var i=1;i<case_filters.length;i++){
            filters = filters.or(Ext.create('Rally.data.wsapi.Filter',case_filters[i]));
        }
        
        Ext.create('Rally.data.wsapi.Store',{
            model:'TestCaseStep',
            filters:filters,
            autoLoad: true,
            limit: 'Infinity',
            fetch: ['StepIndex','Input', 'ExpectedResult', 'TestCase', 'ObjectID'],
            sorters: [{property:'StepIndex'}],
            listeners: {
                scope: this,
                load: function(store,steps) {
                    this.logger.log("found steps: ", steps.length);
                    Ext.Array.each(steps,function(step){
                        var tc_oid = step.get('TestCase').ObjectID
                        if ( case_hash[tc_oid] ) {
                            var tc_steps = case_hash[tc_oid].get('_steps');
                            tc_steps.push(step);
                            case_hash[tc_oid].set('_steps',tc_steps);
                        }
                    });
                    this._displayTestCasesForContainer(container,this._hashToArray(case_hash));
                }
            }
        });        
    },
    _defineStepVerdictStore: function(step_verdicts) {
        var data = [];
        Ext.Array.each(step_verdicts,function(verdict){
            data.push({dataIndex:verdict,text:verdict});
        });
        
        return Ext.create('Rally.data.custom.Store',{
            data:data
        });
    },
    _displayTestCasesForContainer: function(container,cases) {
        this.logger.log("_displayTestCasesForContainer",cases.length);
        this._mask("Creating display...");
        
        var me = this;
        Ext.suspendLayouts();
        
        Ext.Array.each(cases, function(tc){
            me.logger.log("starting ", tc.get('FormattedID'));
            me.all_cases[tc.get('ObjectID')] = tc;
            me.case_containers[tc.get('ObjectID')] = container.add({
                xtype: 'tsteststeptable',
                margin: 10,
                test_case: tc,
                tester: me.getContext().getUser(),
                step_verdict_store: me.verdict_store,
                listeners: {
                    scope: me,
                    verdictChosen: function(table, test_case, verdict, steps) {
                        this._makeTestCaseResult(test_case,verdict,steps);
                        table.clearResults();
                    },
                    stepUpdated: function(table,store,step,modified_field_names){
                        if ( Ext.Array.indexOf(modified_field_names, 'Verdict') > -1 ){
                            var verdict = step.get('Verdict');
                            if ( verdict === "None" ) {
                                step.set('Tester',null);
                                step.set('TestDate',null);
                            } else {
                                step.set('Tester',this.getContext().getUser().UserName);
                                step.set('TestDate',new Date());
                            }
                        }
                    }
                }
            });
            
            var selected_verdicts = me.down('#verdict_checks').getValue().rb;            
            var verdict = tc.get('LastVerdict') || "None";
        
            if ( Ext.Array.indexOf(selected_verdicts,verdict) == -1 ) {
                me.logger.log("Hiding ", tc.get("Name"), " (",tc.get("LastVerdict"),")");
                me.case_containers[tc.get('ObjectID')].hide();
            }
            me.logger.log("done ", tc.get('FormattedID'));
            me._unmask();
        });
        Ext.resumeLayouts(true);
        me._unmask();
        
        me.logger.log("--ready--");
    },
    _revealContainers: function(cbg) {
        var me = this;
        var selected_verdicts = cbg.getValue().rb;
        me.logger.log("show ", selected_verdicts );
        
        Ext.Object.each( this.case_containers, function(tc_oid,container){
            var tc = me.all_cases[tc_oid]
            var verdict = tc.get('LastVerdict') || "None";
            var container = me.case_containers[tc.get('ObjectID')];
            if ( Ext.Array.indexOf(selected_verdicts,verdict) == -1 ) {
                me.logger.log("Hiding ", tc.get("Name"), " (",tc.get("LastVerdict"),")");
                container.hide();
            } else {
                container.show();
            }
        });
    },
    _makeTestCaseResult: function(test_case,verdict,steps){
        this.logger.log("_makeTestCaseResult");
        var me = this;
        this.logger.log("_makeTestCaseResult");
        this.getEl().mask("Saving Test Case Result");
        
        var build = this.down('#build_box').getValue();
        if ( !build ) { build = 'unknown'; }
        
        var step_array = ["Step|Verdict|Expected|Actual|Tester|Timestamp"];
        Ext.Array.each(steps, function(step){
            var display_index = step.get('StepIndex') + 1;
            
            var tester = step.get('Tester') || "N/A";
            var test_date = step.get('TestDate') || "N/A";
            if ( test_date !== "N/A" ) {
                test_date = Rally.util.DateTime.toIsoString(test_date)
            }
            step_array.push(
                display_index + "|" +
                step.get('Verdict') + "|" + 
                step.get('ExpectedResult') + "|" +
                step.get('ActualResult') + "|" + 
                tester + "|" + 
                test_date
            );
        });
        
        var notes = step_array.join('<br/>');
        
        if ( steps.length === 0 ) { notes = "No test steps were defined"; }
        
        Rally.data.ModelFactory.getModel({
            type: 'TestCaseResult',
            success: function(model) {
                me.logger.log("Got Model");
                var tcr = Ext.create(model,{
                    Build: build,
                    Verdict: verdict,
                    Date: Rally.util.DateTime.toIsoString(new Date()),
                    TestCase: test_case.get('_ref'),
                    Tester: me.getContext().getUser()._ref,
                    Notes: notes
                });
                me.logger.log("Saving TCR");
                tcr.save({
                    callback: function(result,operation){
                        me.logger.log("SAVED TCR:",result.get("ObjectID"));
                        Rally.data.ModelFactory.getModel({
                            type: 'TestCase',
                            success: function(tcmodel){
                                tcmodel.load(test_case.get('ObjectID'),{
                                    callback:function(tc,operation){
                                        me.case_containers[test_case.get('ObjectID')].refreshDisplay(tc);
                                    }
                                });
                            },
                            scope: this
                        });
                        if ( verdict === "Fail" ) {
                            me._askToCreateADefect(result,test_case,notes);
                        } else {
                            
                        }
                        me.getEl().unmask();
                    }
                });
            }
        });
    },
    _askToCreateADefect:function(tcr,test_case,notes){
        Ext.create('Rally.ui.dialog.ConfirmDialog', {
            message: 'Create A Defect?',
            confirmLabel: 'Yes',
            cancelLabel: 'No',
            listeners: {
                scope: this,
                confirm: function(){
                    this._createADefect(tcr,test_case,notes);
                }
            }
        })
    },
    _createADefect: function(tcr,test_case,notes){
        var me = this;
        var work_product = null;
        if ( test_case.get('WorkProduct') && test_case.get('WorkProduct')._type == "HierarchicalRequirement" ) {
            work_product = test_case.get('WorkProduct')._ref;
        }
        Rally.data.ModelFactory.getModel({
            type:'Defect',
            success: function(model){
                var defect = Ext.create(model,{
                    Name: "Problem found while testing " + test_case.get("FormattedID"),
                    Notes: notes,
                    TestCase: test_case.get('_ref'),
                    Requirement: work_product,
                    TestCaseResult: tcr.get('_ref')
                });
                
                defect.save({
                    callback: function(result,operation) {
                        me.logger.log("CREATED DEFECT: ", result.get("FormattedID"), "/", result.get("ObjectID"));
                        Rally.nav.Manager.edit(result);
                    }
                });
            }
        });
    },
    _setAllChecked: function() {
        this.down('#verdict_checks').setValue({rb:true});
    }
});
