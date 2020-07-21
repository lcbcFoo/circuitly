import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['OR'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("OR");
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
            this.setTooltip("OR");
            this.setHelpUrl("");
        }
    };

    Blockly.Python["OR"] = function(block) {
        let outSignalBlock = block.getInput('c').connection.targetBlock();
        let val_b = Blockly.Python.valueToCode(block, "b", Blockly.Python.ORDER_ATOMIC);
        let val_a = Blockly.Python.valueToCode(block, "a", Blockly.Python.ORDER_ATOMIC);
        let val_c = Blockly.Python.valueToCode(block, "c", Blockly.Python.ORDER_ATOMIC);

        if (utils.isPrettySimMode()) {
            return 'assign ' + val_c + ' = ' + val_a + ' | ' + val_b + ';\n';
        }

        let outBitLen;
        if (outSignalBlock) {
            let sizeOut = outSignalBlock.getFieldValue('SIZE_SELECTION');
            outBitLen = utils.getSignalBitLen(sizeOut);
        }
        else {
            outBitLen = 1;
        }
        let block_name = utils.get_temp_name("OR");
        let code = "  OR #(" + outBitLen + ") "+ block_name + " (";
        code += val_a;
        code += ", "
        code += val_b;
        code += ", "
        code += val_c;
        code += ");\n";
        return code;
    }
}
