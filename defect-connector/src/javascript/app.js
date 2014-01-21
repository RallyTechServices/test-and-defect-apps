Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    connector_field: 'LinkedDefects',
    logger: new Rally.technicalservices.Logger(),
    defaults: { padding: 5 },
    items: [
        {xtype:'container', defaults: {padding: 5 }, layout: { type: 'hbox' }, items: [
            {xtype:'container',html:'<h1>Defect Connector</h1>'},
            {xtype:'container',itemId:'message_box',tpl:'<tpl>{message}</tpl>'}
        ]},
        {xtype:'container', defaults: {padding: 5 }, layout: { type: 'hbox' }, items: [
            {xtype:'container',itemId:'select_button_box'},
            {xtype:'container',itemId:'selection_message_box',tpl:'<tpl>{message}</tpl>'}
        ]},
        {xtype:'container',itemId:'source_defect_box'},
        {xtype:'container',itemId:'target_button_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        var me = this;
        this._checkFields().then(
        {
            success: function(result) {
                me.down('#select_button_box').add({
                    xtype:'rallybutton',
                    text:'Select Defect',
                    handler: function() {
                        this.down('#message_box').update({});
                        this._showSourceSelector();
                    },
                    scope: me
                });
            },
            failure: function(error) {
                me.down('#message_box').update(error);
            }
        });
        
    },
    _checkFields: function() {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        Rally.data.ModelFactory.getModel({
            type: 'Defect',
            success: function(model) {
                if ( model.getField(me.connector_field) ) {
                    deferred.resolve([]);
                } else {
                    deferred.reject("Contact your administrator: This app " +
                        "requires that the Defect record type have a custom field called <b>" + 
                        me.connector_field + "</b>.  The field should be of type <i>Text</i>");
                }
            }
        });
        return deferred.promise;
    },
    _showSourceSelector: function() {
        var me = this;
        this.down('#source_defect_box').removeAll();
        this.down('#target_button_box').removeAll();
        if ( this.dialog ) { this.dialog.destroy(); }
        
        this.dialog = Ext.create('Rally.ui.dialog.ChooserDialog',{
            artifactTypes:['defect'],
            autoShow: true,
            title: 'Choose Defect',
            filterableFields:[
                {displayName: 'Formatted ID', attributeName: 'FormattedID'}, 
                {displayName: 'Name', attributeName: 'Name'},
                {displayName: 'State', attributeName: 'State'},
                {displayName: 'Schedule State', attributeName: 'ScheduleState'}
            ],
            storeConfig: {
                context: { project: null },
                /*filters: [
                    {property:"State",operator:"!=",value:"Fixed"},
                    {property:"State",operator:"!=",value:"Closed"}
                ],*/
                fetch: ['FormattedID','Name',me.connector_field,'Severity']
            },
            listeners: {
                scope: this,
                artifactChosen: function(item) {
                    if ( item ) {
                        this._displaySource(item);
                    }
                }
            }
        });
    },
    _displaySource: function(source_defect) {
        this.logger.log(source_defect);
        var source_box = this.down('#source_defect_box');
        this.down('#selection_message_box').update({
            message:source_defect.get('FormattedID') + ': ' + source_defect.get('Name')
        });
        source_box.add({
            xtype:'tsconnectioncontainer',
            record:source_defect,
            connector_field:this.connector_field
        });
    }
});
