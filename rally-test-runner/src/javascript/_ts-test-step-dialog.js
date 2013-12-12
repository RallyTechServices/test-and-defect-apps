Ext.define('Rally.technicalservices.TestStepDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tssettingsdialog',
    config: {
        /**
         * 
         * The test case record (the kind from a wsapi datastore, reponds to a "get")
         * {@TestCase} test_case  
         */
        test_case: null,
        test_steps: [],
        current_index: -1,
        title: 'Test Step Runner',
        width: 500
    },
    items: [{
        xtype: 'panel',
        border: false,
        defaults: {
            padding: 5,
            margin: 5
        },
        items: [
            {
                xtype: 'container',
                itemId: 'case_summary_box'
            },
            {
                xtype:'container',
                itemId: 'case_step_box'
            }
        ]
    }],
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
        
    },
    initComponent: function() {
        this.callParent(arguments);
//        this.addEvents(
//            /**
//             * @event settingsChosen
//             * Fires when user clicks done after making settings choices
//             * @param {Rally.technicalservices.SettingsDialog} this
//             * @param {hash} config settings
//             */
//            'settingsChosen',
//            /**
//             * @event cancelChosen
//             * Fires when user clicks the cancel button
//             */
//            'cancelChosen'
//        );
        this._buildButtons();
        this._setSummary();
        //this._addChoosers();
    },
    _setSummary: function() {
        var me = this;
        
        var summary_box = this.down('#case_summary_box');
        this.test_case.getCollection('Steps').load({
            fetch: ['Input', 'ExpectedResult'],
            callback: function(steps, operation, success) {
                me.test_steps = steps;
                summary_box.add({
                    xtype:'container',
                    html: me.test_case.get('FormattedID') + ": " + me.test_case.get('Name')
                });
                summary_box.add({
                    xtype:'container',
                    itemId:'explanation_box',
                    html: "There are " + steps.length + " steps in this test case.  Press 'OK' to begin executing the test steps."
                });
                me.down('#ok_button').setDisabled(false);
            }
        });
    },
    _displayStep: function() {
        this.down('#explanation_box').removeAll();
        this.down('#case_step_box').removeAll();

        if ( this.current_index < this.test_steps.length ) {
            var step = this.test_steps[this.current_index];
            var display_index = this.current_index + 1;
            
            this.down('#case_step_box').add({
                xtype:'container',
                layout: { type: 'hbox' },
                padding: 10,
                margin: 10,
                defaults: { padding: 10 },
                items: [
                    { 
                        xtype:'container', 
                        layout: { type: 'vbox' },
                        items: [
                            {xtype:'container',html:'Step'},
                            {xtype:'container',html:display_index + "."}
                        ]
                    },
                    { 
                        xtype:'container', 
                        layout: { type: 'vbox' },
                        items: [
                            {xtype:'container',html:'Input'},
                            {xtype:'container',html:step.get('Input')}
                        ]
                    },
                    { 
                        xtype:'container', 
                        layout: { type: 'vbox' },
                        items: [
                            {xtype:'container',html:'Expected Result'},
                            {xtype:'container',html:step.get('ExpectedResult')}
                        ]
                    }
                ]
            });
            
            this.down('#ok_button').setDisabled(false);
            this.down('#fail_button').setDisabled(false);
            if ( this.current_index > 0 ) {
                this.down('#back_button').setDisabled(false);
            }
        }
        this.down('#cancel_button').setDisabled(false);
    },
    _disableAllButtons: function() {
        var buttons = this.query('rallybutton');
        Ext.Array.each(buttons, function(button) { button.setDisabled(true);});
    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    itemId: 'back_button',
                    text: '< Back',
                    disabled: true,
                    scope: this,
                    userAction: 'clicked back in dialog',
                    handler: function() {
                        //this._disableAllButtons();
                        this.current_index -= 1;
                        this._displayStep();
                    }
                },                {
                    xtype: 'rallybutton',
                    itemId: 'fail_button',
                    text: 'FAIL',
                    disabled: true,
                    scope: this,
                    userAction: 'clicked failed in dialog',
                    handler: function() {
                        //this._disableAllButtons();
                        this.close();
                    }
                },
                {
                    xtype: 'rallybutton',
                    itemId: 'ok_button',
                    text: 'OK',
                    disabled: true,
                    scope: this,
                    userAction: 'clicked OK in dialog',
                    handler: function(btn) {
                        //this._disableAllButtons();
                        this.current_index += 1;
                        this._displayStep();
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    itemId:'cancel_button',
                    userAction: 'clicked Cancel in dialog',
                    handler: function() {
                        //this._disableAllButtons();
                        this.close()
                    },
                    scope: this
                }
            ]
        });
    }
});