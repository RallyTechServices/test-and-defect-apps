Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'test_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#message_box').update(this.getContext().getUser());
        Ext.create('Rally.data.WsapiDataStore',{
            autoLoad: true,
            model: 'TestCase',
            fetch: ['Name','FormattedID','Steps'],
            title: 'Test Step Runner',
            listeners: {
                scope: this,
                load: function(store,cases) {
                    if (cases.length > 1 ) {
                        this.add({
                            xtype: 'tsteststeptable',
                            margin: 5,
                            test_case: cases[0]
                        });
                        this.down('#test_box').add({
                            xtype: 'tsteststeptable',
                            margin: 5,
                            test_case: cases[1]
                        });                        
                    }
                }
            }
        });
    }
});
