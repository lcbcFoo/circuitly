import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['NAND'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("NAND");
            this.appendValueInput("a")
                .setCheck("SIGNAL")
                .appendField("in a");
            this.appendValueInput("b")
                .setCheck("SIGNAL")
                .appendField("in b");
            this.appendValueInput("c")
                .setCheck("SIGNAL")
                .appendField("out c");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "LOGIC");
            this.setNextStatement(true, "LOGIC");
            this.setColour(utils.COLOUR_LOGIC);
            this.setTooltip("NAND");
            this.setHelpUrl("");
        }
    };

    Blockly.Python['NAND'] = function(block) {
        var value_a = Blockly.Python.valueToCode(block, 'a', Blockly.Python.ORDER_ATOMIC);
        var value_b = Blockly.Python.valueToCode(block, 'b', Blockly.Python.ORDER_ATOMIC);
        var value_c = Blockly.Python.valueToCode(block, 'c', Blockly.Python.ORDER_ATOMIC);
        // nand must be used in lower case to invoke the SV primitive
        var name = utils.get_temp_name('nand');
        var code = '  nand ' + name + '(' + value_c + ', ' + value_b + 
            ', ' + value_a + ');\n';
        return code;
    }
}
