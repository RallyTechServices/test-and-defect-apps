Ext.define('CustomApp', {
    extend: 'Rally.app.App',

    requires: [
        'Rally.data.util.Sorter',
        'Rally.data.wsapi.Filter',
        'Rally.ui.grid.Grid',
        'Rally.data.ModelFactory',
        'Rally.ui.grid.plugin.PercentDonePopoverPlugin'
    ],
    
    link_field: 'c_LinkedDefects',

    items: [
        { xtype:'container',itemId:'settings_box',margin: 10 },
        { xtype:'container', itemId:'grid_box',margin: 10 }
    ],
    config: {
        defaultSettings: {
            type: 'Defect',
            fetch: "FormattedID,Name,c_LinkedDefects",
            pageSize: 20
        }
    },
    logger: new Rally.technicalservices.Logger(),

    launch: function() {
        var me = this;
        
        Rally.data.PreferenceManager.load({
            appID: this.getAppId(),
            filterByUser: true,
            success: function(prefs) {
                me.logger.log("got prefs ", prefs);
                var key = "rally.technicalservices.defectconnect.settings";
                if ( prefs && prefs[key] ) {
                    me.config = Ext.JSON.decode(prefs[key]);
                }
                me.logger.log("config is now ", me.config);
                                
                me.down('#settings_box').add({
                    xtype: 'rallybutton',
                    text: 'Settings',
                    handler: function() {
                        me._showSettingsDialog();
                    },
                    scope: me
                });    
                me._makeAndDisplayGrid();
            }
        });  
    },
    _makeAndDisplayGrid: function() {
        var me = this;
        this.logger.log("_makeAndDisplayGrid",this.config);
        var context = this.getContext(),
            pageSize = this.getSetting('pageSize'),
            fetch = this.getSetting('fetch'),
            columns = this._getColumns(fetch);

        var fetch_array = fetch.split(',');
        if ( Ext.Array.indexOf(fetch_array,me.link_field) == -1 ) {
            fetch_array.push(me.link_field);
            fetch = fetch_array.join(',');
        }
        
        if ( this.down('rallygrid') ) {
            this.down('rallygrid').destroy();
        }
        
        this.logger.log("make grid with ", fetch, columns);
        
        var grid = this.down('#grid_box').add({
            xtype: 'rallygrid',
            columnCfgs: columns,
            enableColumnHide: false,
            enableRanking: false,
            enableBulkEdit: true,
            autoScroll: true,
            storeConfig: {
                fetch: fetch,
                models: this.getSetting('type'),
                filters: this._getFilters(),
                pageSize: pageSize,
                autoLoad: true,
                sorters: Rally.data.util.Sorter.sorters(this.getSetting('order')),
                listeners: {
                    load: this._loaded,
                    scope: this
                }
            },
            pagingToolbarCfg: {
                stateful: true,
                stateId: 'rally-techservices-defectconnect-toolbar',
                stateEvents: ['change'],
                pageSizes: [pageSize, 50, 100, 200, 1000],
                listeners: {
                    change: function(toolbar,pageData) {
                        me.logger.log('change',pageData);
                    },
                    statesave: function(toolbar,state){
                        me.logger.log('statesave',state);
                    },
                    staterestore: function(toolbar,state){
                        me.logger.log('staterestore',state);
                        var store = this.getStore();
                        if ( store ) {
                            if ( state && state.currentPage ) {
                                store.currentPage = state.currentPage;
                            }
                            if ( state && state.pageSize ) {
                                store.pageSize = state.pageSize;
                            }
                        }
                    }
                },
                getState: function() {
                    return this._getPageData();
                }
            },
            listeners: {
                scope: this,
                beforeedit: function (editor,e) {
                    if ( e.field === this.link_field ) {
                        return false;
                    }
                    return true;
                }
            }
        });

    },
    
    _loaded: function() { },

    _getFilters: function() {
        var filters = [],
            query_string = this.getSetting('query_string');
        filters = Ext.create('TSStringFilter',{query_string:query_string});
        return filters;
    },

    _isSchedulableType: function(type) {
        return _.contains(['hierarchicalrequirement', 'task', 'defect', 'defectsuite', 'testset'], type.toLowerCase());
    },
    _getColumns: function(fetch){
        var me = this;
        this.logger.log("_getColumns",fetch,this.getSetting('columns'));
        var link_renderer = function(value,cellData,record,rowIndex,colIndex,store,view) {
            return me._renderLinks(value,cellData,record,rowIndex,colIndex,store,view,me);
        }
        
        if ( this.getSetting('columns') ) {
            var columns = this.getSetting('columns');
            this.logger.log("Using column definitions",columns);
            if ( ! this._includesField(columns,this.link_field) ) {
                columns.push({
                    dataIndex: this.link_field,
                    text: 'Links',
                    renderer: link_renderer
                });
            }
            return columns;
        }
        if (fetch) {
            var fields = Ext.Array.remove(fetch.split(','),me.link_field);
            var columns = fields;
            columns.push({
                dataIndex: this.link_field,
                text: 'Links',
                renderer: link_renderer
            });
            
            this.logger.log("setting columns to ", columns);
            return columns;
        }
        return [];
    },
    _includesField:function(columns,field_name) {
        var includes = false;
        Ext.Array.each(columns,function(column){
            if ( column.dataIndex == field_name ) {
                includes = true;
            }
        });
        return includes;
    },
    _showSettingsDialog: function() {
        if ( this.dialog ) { this.dialog.destroy(); }
        var config = this.config;
        
        this.dialog = Ext.create('Rally.technicalservices.SettingsDialog',{
            type: this.getSetting('type'),
            query_string: this.getSetting('query_string'),
            multi_field_list: this.multi_field_list,
            fetch_list: this.getSetting('fetch'),
            listeners: {
                settingsChosen: function(dialog,returned_config) {
                    var me = this;
                    this.config = Ext.Object.merge(config,returned_config);
                    this._saveConfig(this.config);
                    this._makeAndDisplayGrid();
                },
                scope: this
            }
        });
        this.dialog.show();
    },
    _saveConfig: function(config) {
        var me = this;
        this.logger.log("new config",config);
        delete config["config"];
        delete config["context"];
        delete config["settings"];
        
        Rally.data.PreferenceManager.update({
            appID: this.getAppId(),
            filterByUser: true,
            settings: { 
                'rally.technicalservices.defectconnect.settings': Ext.JSON.encode(config)
            },
            success: function() {
                me.logger.log("Saved settings",config);
            }
        });
    },
    // override until we figure out problem with getSettingsFields
    getSetting: function(field){
        config = this.config;
        if ( config[field] ) {
            return config[field];
        }
        if ( config.defaultSettings[field] ) {
            return config.defaultSettings[field];
        }
        return null;
    },
    _renderLinks: function(value,cellData,record,rowIndex,colIndex,store,view,scope) {
        var me = scope;
        
        me.logger.log("_renderLinks",value,record);
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:record,
            connector_field: me.link_field
        });
        
        var oids = connector.getConnectedObjectIDs(record);
        var oid  = record.get('ObjectID');
        
        var display_text = "";
        
        if ( oids.length > 0 ) { 
            // make space for the items to go after we grab them
            display_text = "<span id='links_" + oid + "'>";
            for(var i=0;i<oids.length;i++) {
                display_text += "<span id='" + oid + "_" + oids[i] + "'></span><br/>";
            }
            display_text += "</span>";
            
            Rally.data.ModelFactory.getModel({
                type: 'Defect',
                success: function(model) {
                    me.logger.log( "successful getting of that there model" );
                    Ext.Array.each( oids, function(linked_oid){
                        me.logger.log( oids, linked_oid );
                        me.logger.log("linked: ", linked_oid);
                        model.load(linked_oid, {
                            fetch: ['FormattedID', 'State'],
                            callback: function(result, operation) {
                                if(operation.wasSuccessful()) {
                                    var fid = result.get('FormattedID');
                                    var state = result.get('State');
                                    var spanner_id = oid + "_" + linked_oid;
                                    var spanner = Ext.dom.Query.select('#' + spanner_id);
                                    if ( spanner ) {
                                        var existing_text = spanner[0].innerHTML;
                                        var inside_text = "";
                                        if ( existing_text ) {
                                            inside_text = existing_text + "<br/>";
                                        }
                                        inside_text += fid + ": " + state;
                                        spanner[0].innerHTML = inside_text;
                                    } 
                                }
                            }
                        });  
                    });
                }
            });
        }
        return display_text;
    }
});