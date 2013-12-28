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
        this.logger.log("_showConnections");
        this.down('#cc_details').add({
            xtype:'container',
            html: this.record.get(this.connector_field)
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
                fetch: ['FormattedID','Name',this.connector_field,'Severity']
            },
            multiple: true,
            listeners: {
                scope: this,
                artifactChosen: function(items) {
                    var me = this;
                    var new_html = me.getConnectionHtml(items);
                    this.down('#cc_details').removeAll();
                    me.down('#cc_details').add({
                        xtype:'container',
                        html: new_html
                    });
                    this._updateRecord(new_html);
                }
            }
        });
    },
    _updateRecord: function(new_html) {
        this.record.set(this.connector_field,new_html);
        this.record.save({
            callback: function(result,operation){
                if (!operation.wasSuccessful()) {
                    alert("Problem. " + operation.getError());
                }
            }
        });
    },
    _getConnectionHtmlForOne: function(defect){
        var object_id = defect.get('ObjectID');
        var url = "/#/detail/defect/" + object_id;
        var innerText = defect.get('FormattedID') + " " + defect.get('Name');
        var severity = defect.get('Severity');
        if (Ext.String.trim(severity) != "") {
            innerText += " (" + severity + ")";
        }
        return "<div><a target='_blank' href='" + url + "'>" + innerText + "</a></div>";
    },
    getConnectionHtml: function(defects) {
        var me = this;
        var html = [];
        var previously_selected_oids = this.getConnectedObjectIDs(this.record);
        if ( Ext.String.trim(this.record.get(this.connector_field)) != "" ) {
            html.push(this.record.get(this.connector_field));
        }
        Ext.Array.each(defects,function(defect){
            var object_id = defect.get('ObjectID');
            if ( Ext.Array.indexOf(previously_selected_oids, object_id) === -1 ) {
                html.push(me._getConnectionHtmlForOne(defect));
            }
        });
        return html.join('\r\n');
    },
    getConnectedObjectIDs: function(defect) {
        var me = this;
        var oids = [];
        var connected_html = document.createElement('div');
        connected_html.innerHTML = "<div>" + defect.get(this.connector_field) + "</div>";
        
        var anchors = Ext.dom.Query.select('a',connected_html);
        Ext.Array.each(anchors, function(anchor){
            var href = anchor.href.replace(/.*\//,"");
            var href_int = parseInt(href,10);
            if ( href_int > 0 ) {
                oids.push(href_int);
            }
        });
        me.logger.log(anchors); 
        return oids;
    },
    onDestroy: function() {
        this.callParent(arguments);
        if ( this.dialog ){this.dialog.destroy();}
    }
    
});