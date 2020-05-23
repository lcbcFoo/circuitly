import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['NOT'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("NOT");
            this.appendValueInput("a")
                .setCheck("SIGNAL")
                .appendField("in a");
            this.appendValueInput("b")
                .setCheck("SIGNAL")
                .appendField("out b");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "LOGIC");
            this.setNextStatement(true, "LOGIC");
            this.setColour(utils.COLOUR_LOGIC);
            this.setTooltip("NOT");
            this.setHelpUrl("");
        }
    };

    Blockly.Python["NOT"] = function(block) {
        var outSignalBlock = block.getInput('b').connection.targetBlock();
        if (outSignalBlock) {
            var sizeOut = outSignalBlock.getFieldValue('SIZE_SELECTION');
            var outBitLen = utils.getSignalBitLen(sizeOut);
        }
        else {
            var outBitLen = 1;
        }
        var block_name = utils.get_temp_name("NOT");
        var code = "  NOT #(" + outBitLen + ") "+ block_name + " (";
        var val_a = Blockly.Python.valueToCode(block, "a", Blockly.Python.ORDER_ATOMIC);
        code += val_a;
        code += ", "
        var val_b = Blockly.Python.valueToCode(block, "b", Blockly.Python.ORDER_ATOMIC);
        code += val_b;
        code += ");\n";
        return code;
    }
}
