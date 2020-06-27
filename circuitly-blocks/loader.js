import  * as utils  from './utils/utils.js'
import { load as module_load } from './blocks/module/module.js';
import { load as module_connection_load } from './blocks/module_connection/module_connection.js';
import { load as create_signal_load } from './blocks/create_signal/create_signal.js';
import { load as signal_getter_load } from './blocks/signal_getter/signal_getter.js'
import { load as connections_designer_load } from './blocks/connections_designer/connections_designer.js'
import { load as splitter_loader } from './blocks/splitter/splitter.js'
import { load as concat_loader } from './blocks/concat/concat.js'
import { load as assign_loader } from './blocks/assign/assign.js'
import { load as NAND_loader } from './blocks/NAND/NAND.js'

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
// TODO: create a more suitable theme. Reference 
// https://developers.google.com/blockly/guides/configure/web/themes
workspace.setTheme(Blockly.Themes.Dark);

// Load circuitly blocks
module_load(workspace);
module_connection_load(workspace);
create_signal_load(workspace);
signal_getter_load(workspace);
connections_designer_load(workspace);
splitter_loader(workspace);
concat_loader(workspace);
assign_loader(workspace);
NAND_loader(workspace);

// TODO: this should be able to search for logic models in logic directory
import { load as AND_loader } from './logic/AND/AND.js'
import { load as OR_loader } from './logic/OR/OR.js'
import { load as XOR_loader } from './logic/XOR/XOR.js'
import { load as NOR_loader } from './logic/NOR/NOR.js'
import { load as NOT_loader } from './logic/NOT/NOT.js'
AND_loader(workspace);
NOT_loader(workspace);
OR_loader(workspace);
XOR_loader(workspace);
NOR_loader(workspace);

// Load blocks to workspace
Blockly.Xml.domToWorkspace(workspaceBlocks, workspace);
