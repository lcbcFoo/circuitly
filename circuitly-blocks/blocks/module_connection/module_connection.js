import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    // Define module_connection block
    Blockly.Blocks['module_connection'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([["input","TYPE_INPUT"], ["output","TYPE_OUTPUT"]]), "TYPE_SELECTION")
                .appendField(new Blockly.FieldDropdown([["1-bit","SIGNAL_1BIT"], ["2-bit","SIGNAL_2BIT"], ["4-bit","SIGNAL_4BIT"], ["8-bit","SIGNAL_8BIT"], ["16-bit","SIGNAL_16BIT"], ["32-bit","SIGNAL_32BIT"], ["64-bit","SIGNAL_64BIT"]]), "SIZE_SELECTION")
                .appendField(new Blockly.FieldTextInput("connection_name"), "NAME");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "CONNECTION");
            this.setNextStatement(true, "CONNECTION");
            this.setColour(utils.COLOUR_1BIT);
            this.setTooltip("");
            this.setHelpUrl("");
        },
        onchange: function() {
            var size = this.getFieldValue('SIZE_SELECTION');
            var colour = utils.getSignalColour(size);

            this.setColour(colour);
        }
    };

    Blockly.Python['module_connection'] = function(block) {
        var dropdown_type_selection = block.getFieldValue('TYPE_SELECTION');
        var dropdown_size_selection = block.getFieldValue('SIZE_SELECTION');
        var value_name = block.getFieldValue('NAME');
        var bitLen = utils.getSignalBitLen(dropdown_size_selection);
        // TODO: Assemble Python into code variable.
        var code = '';
        return code;
    };
}
