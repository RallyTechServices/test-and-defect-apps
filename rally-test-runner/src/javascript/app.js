Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'test_run', defaults: { padding: 5, margin: 5 }, layout: {type:'hbox'}, items: [
            {
                xtype:'rallytextfield',
                itemId:'build_box',
                fieldLabel:'Build used for this test run'
            }
        ]},
        {xtype:'container',itemId:'test_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this._addSettingsButton();
    },
    _addSettingsButton: function() {
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
                            this._makeParentBoxes(parents);
                        }
                    }
                });
                
                this.dialog.show();
                
            } 
        });
    },
    _makeParentBoxes: function(parents){
        var me = this;
        this.down('#test_box').removeAll();
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
        var me = this;
        parent.getCollection('TestCases').load({
            fetch: ['Name','FormattedID','Steps','WorkProduct'],
            scope: this,
            callback: function(cases,operation,success){
                Ext.Array.each(cases, function(tc){
                    container.add({
                        xtype: 'tsteststeptable',
                        margin: 10,
                        test_case: tc,
                        tester: me.getContext().getUser(),
                        listeners: {
                            scope: me,
                            verdictChosen: function(table, test_case, verdict, steps) {
                                this._makeTestCaseResult(test_case,verdict,steps);
                                table.setAllSteps("Not Run");
                            },
                            stepUpdated: function(table,store,step,operation,modified_field_names){
                                this.logger.log("Step Changed",step,modified_field_names);
                                if ( Ext.Array.indexOf(modified_field_names, 'Verdict') > -1 ){
                                    var verdict = step.get('Verdict');
                                    if ( verdict === "Not Run" ) {
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
                });
            }
        });
    },
    _getTestCases: function(parent,container) {
        Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model: 'TestCase',
            fetch: ['Name','FormattedID','Steps','WorkProduct'],
            title: 'Test Step Runner',
            listeners: {
                scope: this,
                load: function(store,cases) {
                    Ext.Array.each(cases, function(tc){
                        container.add({
                            xtype: 'tsteststeptable',
                            margin: 10,
                            test_case: tc,
                            tester: this.getContext().getUser(),
                            listeners: {
                                scope: this,
                                verdictChosen: function(table, test_case, verdict, steps) {
                                    this._makeTestCaseResult(test_case,verdict,steps);
                                },
                                stepUpdated: function(table,store,step,operation,modified_field_names){
                                    this.logger.log("Step Changed",step,modified_field_names);
                                    if ( Ext.Array.indexOf(modified_field_names, 'Verdict') > -1 ){
                                        var verdict = step.get('Verdict');
                                        if ( verdict === "Not Run" ) {
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
                    }, this);
                }
            }
        });
    },
    _makeTestCaseResult: function(test_case,verdict,steps){
        var me = this;
        this.logger.log("_makeTestCaseResult");
        this.getEl().mask("Saving Test Case Result");
        
        var build = this.down('#build_box').getValue();
        if ( !build ) { build = 'unknown'; }
        
        var step_array = ["Step|Verdict|Tester|Timestamp"];
        Ext.Array.each(steps, function(step){
            var display_index = step.get('StepIndex') + 1;
            
            step_array.push(
                display_index + "|" +
                step.get('Verdict') + "|" + 
                step.get('Tester') + "|" + 
                Rally.util.DateTime.toIsoString(step.get('TestDate'))
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
                        Rally.nav.Manager.edit(result);
                    }
                });
            }
        });
    }
});
