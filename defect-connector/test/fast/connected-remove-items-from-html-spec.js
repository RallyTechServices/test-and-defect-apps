describe("Connection Container Remove Items", function() {    
    it("should return empty html when removing only item",function(){
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
        
        expect(connector.getHtmlAfterRemove(source_defect,345)).toEqual("");
    });
    
    it("should remove only the one that got removed",function(){
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
        
        expect(connector.getHtmlAfterRemove(source_defect,345).replace(/\"/g,"'")).toEqual("\n" +
                "<div><a target='_blank' href='/#/detail/defect/678'>DE3 ad adf (Medium)</a></div>" );

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
        
        expect(connector.getHtmlAfterRemove(source_defect,345)).toEqual("adfds asdf sdfsaddasfd ");
    });
    
});
