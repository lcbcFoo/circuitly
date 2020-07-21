import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    // Define connections_designer (for module mutator)
    Blockly.Blocks['connections_designer'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("Connections");
            this.appendStatementInput("CONNECTIONS")
                .setCheck("CONNECTION");
            this.setColour(utils.COLOUR_MODULE);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Python['connections_designer'] = function(block) {
        var statements_connections = Blockly.Python.statementToCode(block, 'CONNECTIONS');
        // TODO: Assemble Python into code variable.
        var code = 'designer';
        return code;
    };
}
