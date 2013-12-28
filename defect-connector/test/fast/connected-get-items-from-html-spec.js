describe("Connection Container Get Items", function() {    
    it("should determine known item from connector field",function(){
         var source_defect = Ext.create('mockDefect',{
            FormattedID:'DE1',
            _ref: '/defect/123',
            ObjectID: 123,
            Name: 'Abc',
            Severity: 'High',
            Notes: "<div><a target='_blank' href='/#/detail/defect/345'>DE2 Abc (High)</a></div>" 
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect,
            connector_field: 'Notes'
        });
        
        expect(connector.getConnectedObjectIDs(source_defect)).toEqual([345]);
    });
    
    it("should determine known items from connector field",function(){
        var source_defect = Ext.create('mockDefect',{
            FormattedID:'DE1',
            _ref: '/defect/123',
            ObjectID: 123,
            Name: 'Abc',
            Severity: 'Low',
            Notes: "<div><a target='_blank' href='/#/detail/defect/345'>DE2 xyz (Low)</a></div>" +
                "\r\n" +
                "<div><a target='_blank' href='/#/detail/defect/678'>DE3 ad adf (Medium)</a></div>" 
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect,
            connector_field:'Notes'
        });
        
        expect(connector.getConnectedObjectIDs(source_defect)).toEqual([345,678]);

    });
    
    it("should not choke when extra characters in field",function(){
        var source_defect = Ext.create('mockDefect',{
            FormattedID:'DE1',
            _ref: '/defect/123',
            ObjectID: 123,
            Name: 'Abc',
            Notes: "adfds asdf sdfsaddasfd " +
                "<div><a target='_blank' href='/#/detail/defect/345'>DE2</a></div>" +
                "\r\n" +
                "<div><a target='_blank' href='/#/detail/defect/678'>DE3</a></div>" 
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect,
            connector_field:'Notes'
        });
        
        expect(connector.getConnectedObjectIDs(source_defect)).toEqual([345,678]);

    });
    
    it("should not choke when field is empty of any anchor tags",function(){
        var source_defect = Ext.create('mockDefect',{
            FormattedID:'DE1',
            _ref: '/defect/123',
            ObjectID: 123,
            Name: 'Abc',
            Notes: "adfds asdf sdfsaddasfd "  
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect,
            connector_field:'Notes'
        });
        
        expect(connector.getConnectedObjectIDs(source_defect)).toEqual([]);
    });
    
        
    it("should not choke when wrong kind of anchor is provided",function(){
        var source_defect = Ext.create('mockDefect',{
            FormattedID:'DE1',
            _ref: '/defect/123',
            ObjectID: 123,
            Name: 'Abc',
            Notes: "<div><a target='_blank' href='http://www.google.com'>Search</a></div>"  
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect,
            connector_field:'Notes'
        });
        
        expect(connector.getConnectedObjectIDs(source_defect)).toEqual([]);
    });
    
});
