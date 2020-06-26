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
        let outSignalBlock = block.getInput('b').connection.targetBlock();
        let val_b = Blockly.Python.valueToCode(block, "b", Blockly.Python.ORDER_ATOMIC);
        let val_a = Blockly.Python.valueToCode(block, "a", Blockly.Python.ORDER_ATOMIC);

        if (utils.isPrettySimMode()) {
            return 'assign ' + val_b + ' = ~' + val_a + ';\n';
        }

        let outBitLen;
        if (outSignalBlock) {
            let sizeOut = outSignalBlock.getFieldValue('SIZE_SELECTION');
            outBitLen = utils.getSignalBitLen(sizeOut);
        }
        else {
            outBitLen = 1;
        }
        let block_name = utils.get_temp_name("NOT");
        let code = "  NOT #(" + outBitLen + ") "+ block_name + " (";
        code += val_a;
        code += ", "
        code += val_b;
        code += ");\n";
        return code;
    }
}
