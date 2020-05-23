import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['XOR'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("XOR");
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
            this.setTooltip("XOR");
            this.setHelpUrl("");
        }
    };

    Blockly.Python["XOR"] = function(block) {
        var outSignalBlock = block.getInput('c').connection.targetBlock();
        if (outSignalBlock) {
            var sizeOut = outSignalBlock.getFieldValue('SIZE_SELECTION');
            var outBitLen = utils.getSignalBitLen(sizeOut);
        }
        else {
            var outBitLen = 1;
        }
        var block_name = utils.get_temp_name("XOR");
        var code = "  XOR #(" + outBitLen + ") "+ block_name + " (";
        var val_a = Blockly.Python.valueToCode(block, "a", Blockly.Python.ORDER_ATOMIC);
        code += val_a;
        code += ", "
        var val_b = Blockly.Python.valueToCode(block, "b", Blockly.Python.ORDER_ATOMIC);
        code += val_b;
        code += ", "
        var val_c = Blockly.Python.valueToCode(block, "c", Blockly.Python.ORDER_ATOMIC);
        code += val_c;
        code += ");\n";
        return code;
    }
}
