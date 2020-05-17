import  * as utils  from './utils/utils.js'
import { load as module_load } from './blocks/module/module.js';
import { load as module_connection_load } from './blocks/module_connection/module_connection.js';
import { load as create_signal_load } from './blocks/create_signal/create_signal.js';
import { load as signal_getter_load } from './blocks/signal_getter/signal_getter.js'
import { load as connections_designer_load } from './blocks/connections_designer/connections_designer.js'

//////////////////////////////////////////////////////////////////////////////
// Blockly setup

// Get script inputs
var thisScript = document.getElementById('circuitly-loader');
var blocklyDiv = thisScript.getAttribute('blockly_div');
var workspaceId = thisScript.getAttribute('workspace_id');
var toolboxId = thisScript.getAttribute('toolbox_id');

// Get toolbox and workspace
var toolbox = document.getElementById(toolboxId);
var workspaceBlocks = document.getElementById(workspaceId); 

// Inject blockly workspace 
var options = { 
    toolbox : toolbox, 
    collapse : true, 
    comments : true, 
    disable : true, 
    maxBlocks : Infinity, 
    trashcan : true, 
    horizontalLayout : false, 
    toolboxPosition : 'start', 
    css : true, 
    media : 'https://blockly-demo.appspot.com/static/media/', 
    rtl : false, 
    scrollbars : true, 
    sounds : true, 
    oneBasedIndex : true
};

var workspace = Blockly.inject(blocklyDiv, options);

// Load circuitly blocks
module_load(workspace);
module_connection_load(workspace);
create_signal_load(workspace);
signal_getter_load(workspace);
connections_designer_load(workspace);

// Load blocks to workspace
Blockly.Xml.domToWorkspace(workspaceBlocks, workspace);

//////////////////////////////////////////////////////////////////////////////////
// Logic gates
//

var temp_counter = 0;

function get_temp_name(name) {
    var temp = temp_counter;
    temp_counter = temp_counter + 1;
    return name + '_' + temp;
}

Blockly.Blocks['nand'] = {
    init: function() {
        this.appendValueInput("in_X")
            .setCheck(null)
            .appendField("NAND - in A");
        this.appendValueInput("in_Y")
            .setCheck(null)
            .appendField("in B");
        this.appendValueInput("out_Z")
            .setCheck(null)
            .appendField("out C");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(90);
        this.setTooltip("NAND gate. Gives C = A NAND B");
        this.setHelpUrl("");
    }
};

Blockly.Python['nand'] = function(block) {
    var value_x = Blockly.Python.valueToCode(block, 'in_X', Blockly.Python.ORDER_ATOMIC);
    var value_y = Blockly.Python.valueToCode(block, 'in_Y', Blockly.Python.ORDER_ATOMIC);
    var value_z = Blockly.Python.valueToCode(block, 'out_Z', Blockly.Python.ORDER_ATOMIC);
    // TODO: Assemble Python into code variable.
    var code = 'nand ' + '(' + value_z + ', ' + value_y + 
        ', ' + value_x + ')\n';
    // TODO: Change ORDER_NONE to the correct strength.
    return code;
}

