import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    // Define signal_getter
    Blockly.Blocks['signal_getter'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("")
                .appendField(new Blockly.FieldDropdown([["1-bit","SIGNAL_1BIT"], ["2-bit","SIGNAL_2BIT"], ["4-bit","SIGNAL_4BIT"], ["8-bit","SIGNAL_8BIT"], ["16-bit","SIGNAL_16BIT"], ["32-bit","SIGNAL_32BIT"], ["64-bit","SIGNAL_64BIT"]]), "SIZE_SELECTION");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown(this.makeSignalList.bind(this)),
                    "SIGNAL_NAME");
            this.setInputsInline(true);
            this.setOutput(true, null);
            this.setColour(utils.COLOUR_1BIT);
            this.setTooltip("");
            this.setHelpUrl("");
        },
        onchange: function() {
            var size = this.getFieldValue('SIZE_SELECTION');
            var colour = utils.getSignalColour(size);

            this.setColour(colour);
        },
        makeSignalList: function() {
            // Is attached to a module
            var root = this.getRootBlock();
            if (root != this) {
                return root.makeSignalList(this.getFieldValue("SIZE_SELECTION"));
            }

            // Not attached to any module yet
            return [['<invalid signal>', 'SIGNAL_INVALID']];
        }
    };

    Blockly.Python['signal_getter'] = function(block) {
        var dropdown_size_selection = block.getFieldValue('SIZE_SELECTION');
        var dropdown_signal_name = block.getFieldValue('SIGNAL_NAME');
        // TODO: Assemble Python into code variable.
        var code = dropdown_signal_name;
        // TODO: Change ORDER_NONE to the correct strength.
        return [code, Blockly.Python.ORDER_ATOMIC];
    };
}
