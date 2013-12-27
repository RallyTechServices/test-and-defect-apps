Ext.define('Rally.technicalservices.ui.ConnectionContainer',{
    requires: [
        'Rally.ui.Button',
        'Rally.technicalservices.Logger'
    ],
    extend: 'Ext.Container',
    alias: 'widget.tsconnectioncontainer',
    config: {
        /**
         * 
         * @cfg {Rally.data.model} (required)
         * The source record that has a connection with other records
         */
        record: null,
        /**
         * 
         * @cfg {String} (required)
         * The name of the text field that holds the connection information
         */
        connector_field: 'Notes',
        /**
         * @cfg {Rally.technicalservices.Logger} 
         * A convenient way to print to the console
         */
        logger: new Rally.technicalservices.Logger()
    },
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    defaults: { padding: 5 },
    items: [
        { xtype:'container',itemId:'cc_header', html: '<h2>Connections</h2>' },
        { xtype:'container',itemId:'cc_button' },
        { xtype:'container',itemId:'cc_details' }
    ],
    initComponent: function() {
        this.callParent(arguments);
        this.down('#cc_button').add({
            xtype:'rallybutton',
            text:'+',
            handler: function() {
                this._showTargetSelector();
            },
            scope: this
            
        });
        this._showConnections();
    },
    _showConnections: function() {
        this.down('#cc_details').add({
            xtype:'container',
            text: this.record.get(this.connector_field)
        });
    },
    _showTargetSelector: function() {
        if ( this.dialog ) { this.dialog.destroy(); }
        
        this.dialog = Ext.create('Rally.ui.dialog.ChooserDialog',{
            artifactTypes:['defect'],
            autoShow: true,
            title: 'Choose Defect',
            storeConfig: {
                context: { project: null },
                filters: [{ property:'FormattedID', operator:'!=', value: this.record.get('FormattedID')}],
                fetch: ['FormattedID','Name',this.connector_field]
            },
            multiple: true,
            listeners: {
                scope: this,
                artifactChosen: function(items) {
                    var me = this;
                    me.down('#cc_details').add({
                        xtype:'container',
                        html:me.getConnectionHtml(items)
                    });
                }
            }
        });
    },
    getConnectionHtml: function(defects) {
        var html = [];
        Ext.Array.each(defects,function(defect){
            var url = "/#/detail/defect/" + defect.get('ObjectID');
            var innerText = defect.get('FormattedID');
            html.push("<div><a target='_blank' href='" + url + "'>" + innerText + "</a></div>");
        });
        return html.join('\r\n');
    },
    onDestroy: function() {
        this.callParent(arguments);
        if ( this.dialog ){this.dialog.destroy();}
    }
    
});