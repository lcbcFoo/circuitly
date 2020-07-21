import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['splitter'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("split");
            this.appendValueInput("source")
                .setCheck("SIGNAL");
            this.appendDummyInput()
                .appendField("into");
            this.appendValueInput("target_1")
                .setCheck("SIGNAL");
            this.appendDummyInput()
                .appendField("+");
            this.appendValueInput("target_2")
                .setCheck("SIGNAL");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "LOGIC");
            this.setNextStatement(true, "LOGIC");
            this.setColour(utils.COLOUR_SPLITTER);
            this.setTooltip("Split in half a signal into 2 other signals.");
            this.setHelpUrl("");

            // TODO: add sizes validator
        }
    };

    Blockly.Python['splitter'] = function(block) {
        var value_source = Blockly.Python.valueToCode(block, 'source', Blockly.Python.ORDER_ATOMIC);
        var value_target_1 = Blockly.Python.valueToCode(block, 'target_1', Blockly.Python.ORDER_ATOMIC);
        var value_target_2 = Blockly.Python.valueToCode(block, 'target_2', Blockly.Python.ORDER_ATOMIC);

        var sourceBlock = block.getInput('source').connection.targetBlock();
        var t1_block = block.getInput('target_1').connection.targetBlock();
        var t2_block = block.getInput('target_2').connection.targetBlock();

        if (sourceBlock) {
            var sizeSource = sourceBlock.getFieldValue('SIZE_SELECTION');
            var sourceBitLen = utils.getSignalBitLen(sizeSource);
        }
        else {
            return '';
        }
        if (t1_block) {
            var size_t1 = t1_block.getFieldValue('SIZE_SELECTION');
        }
        else {
            return '';
        }
        if (t2_block) {
            var size_t2 = t2_block.getFieldValue('SIZE_SELECTION');
        }
        else {
            return '';
        }

        var code =  '  assign ' + value_target_1 + ' = ' + value_source +
                    '[' + (sourceBitLen - 1) + ':' + (sourceBitLen / 2) + '];\n';
        code += '  assign ' + value_target_2 + ' = ' + value_source +
                    '[' + ((sourceBitLen / 2) - 1) + ':0];\n';
        return code;
    };
}
