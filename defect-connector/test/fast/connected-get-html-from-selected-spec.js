describe("Connection Container Make HTML", function() {
    var source_defect = Ext.create('mockDefect',{
        FormattedID:'DE1',
        _ref: '/defect/123',
        ObjectID: 123,
        Name: 'Abc'
    });
    
    it("should determine saving string for a connected item",function(){
        var other_defect = Ext.create('mockDefect',{
            FormattedID:'DE2',
            _ref: '/defect/345',
            ObjectID: 345,
            Name: 'Abcdef',
            Severity: 'High'
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect
        });
        
        expect(connector.getConnectionHtml([other_defect])).
            toBe("<div><a target='_blank' href='/#/detail/defect/345'>DE2 Abcdef (High)</a></div>");
    });
    
    it("should determine saving string for multiple connected items",function(){
        var other_defect1 = Ext.create('mockDefect',{
            FormattedID:'DE2',
            _ref: '/defect/345',
            ObjectID: 345,
            Name: 'Abcdef'
        });
        var other_defect2 = Ext.create('mockDefect',{
            FormattedID:'DE3',
            _ref: '/defect/678',
            ObjectID: 678,
            Name: 'la la la',
            Severity: 'Low'
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect
        });
        
        var html = connector.getConnectionHtml([other_defect1,other_defect2]);
        expect(html).toBe("<div><a target='_blank' href='/#/detail/defect/345'>DE2 Abcdef</a></div>" +
                "\r\n" +
                "<div><a target='_blank' href='/#/detail/defect/678'>DE3 la la la (Low)</a></div>");
    });
    
        
    it("should not repeat for existing items",function(){
        source_defect.set("Notes", "<div><a target='_blank' href='/#/detail/defect/789'>DE4</a></div>" );
        
        var other_defect1 = Ext.create('mockDefect',{
            FormattedID:'DE2',
            _ref: '/defect/345',
            ObjectID: 345,
            Name: 'Abcdef'
        });
        var other_defect2 = Ext.create('mockDefect',{
            FormattedID:'DE4',
            _ref: '/defect/789',
            ObjectID: 789,
            Name: 'la la '
        });
        
        var connector = Ext.create('Rally.technicalservices.ui.ConnectionContainer',{
            record:source_defect
        });
        
        var html = connector.getConnectionHtml([other_defect1,other_defect2]);
        expect(html).toBe("<div><a target='_blank' href='/#/detail/defect/789'>DE4</a></div>" +
                "\r\n" +
                "<div><a target='_blank' href='/#/detail/defect/345'>DE2 Abcdef</a></div>");
    });
    
});
