Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'test_run', margin: 5, items: [
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
        //this.down('#message_box').update(this.getContext().getUser());

        Ext.create('Rally.data.WsapiDataStore',{
            autoLoad: true,
            model: 'TestCase',
            fetch: ['Name','FormattedID','Steps'],
            title: 'Test Step Runner',
            listeners: {
                scope: this,
                load: function(store,cases) {
                    if (cases.length > 1 ) {
                        this.down('#test_box').add({
                            xtype: 'tsteststeptable',
                            margin: 5,
                            test_case: cases[0],
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
                        this.down('#test_box').add({
                            xtype: 'tsteststeptable',
                            margin: 5,
                            tester: this.getContext().getUser(),
                            test_case: cases[1]
                        });                        
                    }
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
                        me.getEl().unmask();
                    }
                });
            }
        });
        
    }
});
