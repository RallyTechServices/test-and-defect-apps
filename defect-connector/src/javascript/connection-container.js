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
        if ( this.down('#detail_grid') ) { this.down('#detail_grid').destroy(); }
        
        Ext.create('Rally.data.wsapi.Store',{
            model:'Defect',
            context: { project:null },
            autoLoad: true,
            filters: this._getFilterForCurrentItems(this.record),
            fetch:['FormattedID','Name','Severity',this.connector_field],
            listeners: {
                scope: this,
                load: function(store,records){
                    if ( this.down('#detail_grid') ) { this.down('#detail_grid').destroy(); }
                    this.down('#cc_details').add({
                        xtype:'rallygrid',
                        store: store,
                        itemId: 'detail_grid',
                        showPagingToolbar: false,
                        enableEditing: false,
                        enableRanking: false,
                        enableColumnMove: false,
                        showRowActionsColumn: false,
                        columnCfgs: [
                            { text:'id', dataIndex:'FormattedID' },
                            { text:'Name', dataIndex:'Name', flex: 1 },
                            { text:'Severity', dataIndex:'Severity' },
                            { text:'Remove', xtype:'templatecolumn', tpl:'<div class="ts-action-remove"> </div>' }
                        ],
                        listeners: {
                            scope: this,
                            cellclick: function(grid,cell,index,item) {
                                if ( index == 3 ) {
                                    this._disconnectFrom(item);
                                }
                            }
                        }
                    });  
                }
            }
        });
    },
    _showTargetSelector: function() {
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
                filters: [
                    { property:'FormattedID', operator:'!=', value: this.record.get('FormattedID')}/*,
                    {property:"State",operator:"!=",value:"Fixed"},
                    {property:"State",operator:"!=",value:"Closed"}*/
                ],
                fetch: ['FormattedID','Name',this.connector_field,'Severity']
            },
            multiple: true,
            listeners: {
                scope: this,
                artifactChosen: function(items) {
                    var me = this;
                    var new_html = me.getConnectionHtml(items);
                    this.down('#cc_details').removeAll();
                    this._updateRecord(this.record,new_html,true);
                    this._updateOtherRecords(items);
                }
            }
        });
    },
    _updateRecord: function(record,new_html,refresh) {
        var me = this;
        //alert(new_html);
        record.set(this.connector_field,new_html);
        record.save({
            callback: function(result,operation){
                if (!operation.wasSuccessful()) {
                    var message = "Problem. ";
                    if ( typeof(operation.getError()) == 'string' ) {
                        message += "Problem. ";
                    } else {
                        message += Ext.JSON.encode(operation.getError());
                    }
                    //alert(message);
                } else {
                    if ( refresh ) {
                        me. _showConnections();
                    }
                }
            }
        });
    },
    _updateOtherRecords: function(items) {
        var me = this;
        Ext.Array.each(items, function(item){
            var object_id = me.record.get('ObjectID');
            var previously_selected_oids = me.getConnectedObjectIDs(item);
            if ( Ext.Array.indexOf(previously_selected_oids, object_id) === -1 ) {
                var html = [];
                if ( Ext.String.trim(item.get(me.connector_field)) != "" ) {
                    html.push(item.get(me.connector_field));
                }
                html.push( me._getConnectionHtmlForOne(me.record) );
                me._updateRecord(item,html.join('\r\n'),false);
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
    _getFilterForCurrentItems: function(defect){
        this.logger.log("_getFilterForCurrentItems");
        var oids = this.getConnectedObjectIDs(defect);
        var filters;
        
        if ( oids.length === 0 ) {
            filters = Ext.create('Rally.data.wsapi.Filter',{
                property:'ObjectID',
                value: -1
            });
        } else {
            filters = Ext.create('Rally.data.wsapi.Filter',{
                property:'ObjectID',
                operator:'=',
                value:oids[0]
            });
            
            for ( var i=1;i<oids.length;i++ ) {
                filters = filters.or(Ext.create('Rally.data.wsapi.Filter',{
                    property:'ObjectID',
                    operator:'=',
                    value:oids[i]
                }));
            }
        }
        this.logger.log(filters.toString());
        return filters;
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
    getHtmlAfterRemove:function(defect,remove_oid) {
        var connected_html = document.createElement('div');
        connected_html.innerHTML = defect.get(this.connector_field);
        var anchors = Ext.dom.Query.select('a',connected_html);
        Ext.Array.each(anchors, function(anchor){
            var href = anchor.href.replace(/.*\//,"");
            var href_int = parseInt(href,10);
            if ( href_int == remove_oid ) {
                // the anchor is wrapped by a div; we want to remove the whole thing
                anchor.parentNode.parentNode.removeChild(anchor.parentNode);
            }
        });
        return connected_html.innerHTML;
    },
    onDestroy: function() {
        this.callParent(arguments);
        if ( this.dialog ){this.dialog.destroy();}
    },
    _disconnectFrom: function(other_defect) {
        this.logger.log("_disconnectFrom",other_defect);
        var html_of_target_links = this.getHtmlAfterRemove(this.record,other_defect.get('ObjectID'));
        var html_of_links_on_target = this.getHtmlAfterRemove(other_defect,this.record.get('ObjectID'));
        
        this._updateRecord(this.record,html_of_target_links,true);
        this._updateRecord(other_defect,html_of_links_on_target,false)
    }
    
});