//
Ext.define('mockWsapiDataStore',{
    extend: 'Rally.data.custom.Store',
    alias: 'widget.mockwsapidatastore',
    getRecords: function() {
        var records = [];
        var data = this.getData();
        data.each(function(record){
            records.push(record);
        });
        return records;
    }
});

var simple_store = Ext.create('mockWsapiDataStore',{
    data: [
        { Name: 'first',  _ref: '/mock/12345', ObjectID: 12345 },
        { Name: 'second', _ref: '/mock/12346', ObjectID: 12346 }
    ]
});

var alternate_name_store = Ext.create('mockWsapiDataStore',{
    data: [
        { DisplayName: 'first',  _ref: '/mock/12345', ObjectID:12345 },
        { DisplayName: 'second', _ref: '/mock/12346', ObjectID:12346 }
    ]
});

var simple_store_without_objectID = Ext.create('mockWsapiDataStore',{
    data: [
        { Name: 'first',  _ref: '/mock/12345' },
        { Name: 'second', _ref: '/mock/12346' }
    ]
});

var ugly_store = Ext.create('mockWsapiDataStore',{
    data: [
        { Name: '1234 1234 1234 1234 1234 1234 1234 1234 1234 1234 ', _ref: '/mock 1347', ObjectID:137 }
    ]
});

var simple_custom_store = Ext.create('Rally.data.custom.Store',{
    data: [
        { Name: 'first',  _ref: '/mock/12345', ObjectID:12345 },
        { Name: 'second', _ref: '/mock/12346', ObjectID:12346 }
    ]
});