import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    // Define signal declaration
    Blockly.Blocks['create_signal'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("create")
                .appendField(new Blockly.FieldTextInput("name"), "NAME");
            this.appendDummyInput()
                .appendField("with size")
                .appendField(new Blockly.FieldDropdown([["1-bit","SIGNAL_1BIT"], ["2-bit","SIGNAL_2BIT"], ["4-bit","SIGNAL_4BIT"], ["8-bit","SIGNAL_8BIT"], ["16-bit","SIGNAL_16BIT"], ["32-bit","SIGNAL_32BIT"], ["64-bit","SIGNAL_64BIT"]]), "SIZE_SELECTION");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "SIGNAL");
            this.setNextStatement(true, "SIGNAL");
            this.setColour(utils.COLOUR_1BIT);
            this.setTooltip("Create a signal with specified size");
            this.setHelpUrl("");
            this.signal = {'name' : 'name', 'size' : 1};
        },
        onchange: function() {
            var size = this.getFieldValue('SIZE_SELECTION');
            var colour = utils.getSignalColour(size);

            this.setColour(colour);
        }
    };

    Blockly.Python['create_signal'] = function(block) {
        var text_name = block.getFieldValue('NAME');
        var dropdown_size_selector = block.getFieldValue('SIZE_SELECTION');
        // TODO: Assemble Python into code variable.
        var code = '';
        return code;
    };
}
