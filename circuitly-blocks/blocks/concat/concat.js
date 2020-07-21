import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    Blockly.Blocks['concat'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("concat");
            this.appendValueInput("source_1")
                .setCheck("SIGNAL");
            this.appendDummyInput()
                .appendField("+");
            this.appendValueInput("source_2")
                .setCheck("SIGNAL");
            this.appendDummyInput()
                .appendField("into");
            this.appendValueInput("target")
                .setCheck("SIGNAL");
            this.setInputsInline(true);
            this.setPreviousStatement(true, "LOGIC");
            this.setNextStatement(true, "LOGIC");
            this.setColour(utils.COLOUR_CONCAT);
            this.setTooltip("Merge two signals of same size into a 2 times larger one.");
            this.setHelpUrl("");
        }
    };

    Blockly.Python['concat'] = function(block) {
        var value_source_1 = Blockly.Python.valueToCode(block, 'source_1', Blockly.Python.ORDER_ATOMIC);
        var value_source_2 = Blockly.Python.valueToCode(block, 'source_2', Blockly.Python.ORDER_ATOMIC);
        var value_target = Blockly.Python.valueToCode(block, 'target', Blockly.Python.ORDER_ATOMIC);

        var targetBlock = block.getInput('target').connection.targetBlock();
        var s1_block = block.getInput('source_1').connection.targetBlock();
        var s2_block = block.getInput('source_2').connection.targetBlock();

        if (targetBlock) {
            var sizeTarget = targetBlock.getFieldValue('SIZE_SELECTION');
            var targetBitLen = utils.getSignalBitLen(sizeTarget);
        }
        else {
            return '';
        }
        if (s1_block) {
            var size_s1 = s1_block.getFieldValue('SIZE_SELECTION');
        }
        else {
            return '';
        }
        if (s2_block) {
            var size_s2 = s2_block.getFieldValue('SIZE_SELECTION');
        }
        else {
            return '';
        }

        var code =  '  assign ' + value_target + ' = {' + value_source_1 +
            ', ' + value_source_2 + '};\n';
        return code;
    };
}
