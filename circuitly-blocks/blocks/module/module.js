import * as Blockly from 'blockly/core';
import 'blockly/python';
import  * as utils  from '../../utils/utils.js'

export function load(workspace) {
    // Define module
    Blockly.Blocks['module'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("module_name"), "NAME");
            this.appendDummyInput()
                .appendField("Connections");
            this.appendStatementInput("CONNECTIONS")
                .setCheck("CONNECTION");
            this.appendDummyInput()
                .appendField("Internal signals");
            this.appendStatementInput("SIGNALS")
                .setCheck("SIGNAL");
            this.appendDummyInput()
                .appendField("Implementation");
            this.appendStatementInput("IMPLEMENTATION")
                .setCheck("LOGIC");
            this.setInputsInline(false);
            this.setColour(utils.COLOUR_MODULE);
            this.setTooltip("Build an and block. Should output C = A AND B");
            this.setHelpUrl("");
            this.setMutator(new Blockly.Mutator(['module_connection']));

            this.connections = [];
            this.declaredSignals = [[], [], [], [], [], [], []];
            this.isMenuOpen = false;
            this.nameRegex = new RegExp('^[a-zA-Z\_\][\w\_]*$')
        },
        /**
         * Create XML to represent whether the 'pxchecked' should be present.
         * @return {Element} XML storage element.
         * @this Blockly.Block
         */
        mutationToDom: function() {
            var container = document.createElement('mutation');
            return container;
        },
        /**
         * Parse XML to restore the 'pxchecked'.
         * @param {!Element} xmlElement XML storage element.
         * @this Blockly.Block
         */
        domToMutation: function(xmlElement) {
        },
        decompose: function(workspace) {
            this.isMenuOpen = true;
            var topBlock = workspace.newBlock('connections_designer');
            topBlock.initSvg();
            var nextConn = topBlock.getInput('CONNECTIONS').connection

            var connections = this.connections;
            for (var i = 0; i < connections.length; i++) {
                var newBlock = workspace.newBlock('module_connection');
                newBlock.initSvg();
                newBlock.render();
                newBlock.getField('NAME').setValue(connections[i]['name']);
                newBlock.getField('TYPE_SELECTION').setValue(connections[i]['type']);
                newBlock.getField('SIZE_SELECTION').setValue(connections[i]['size']);
                nextConn.connect(newBlock.previousConnection);
                nextConn = newBlock.nextConnection;
            }

            return topBlock;
        },
        compose: function(topBlock) {
            this.isMenuOpen = false;
            var nextConn = topBlock.getInput('CONNECTIONS').connection;
            var connections = [];
            while (nextConn && nextConn.targetBlock()) {
                var connectionBlock = nextConn.targetBlock();
                var type = connectionBlock.getFieldValue('TYPE_SELECTION');
                var size = connectionBlock.getFieldValue('SIZE_SELECTION');
                var name = connectionBlock.getFieldValue('NAME');
                connections.push({'type' : type, 'size' : size, 'name' : name});
                nextConn = connectionBlock.nextConnection;
            }

            this.updateShape_(connections);
        },

        updateShape_: function(connections) {
            // Make sure there are no connections
            this.cleanOldConnections_();

            var nextConn = this.getInput('CONNECTIONS').connection;

            // Loop through all connections creating their blocks.
            for (var i = 0; i < connections.length; i++) {
                var newBlock = workspace.newBlock('module_connection');
                newBlock.initSvg();
                newBlock.render();
                newBlock.getField('NAME').setValue(connections[i]['name']);
                newBlock.getField('TYPE_SELECTION').setValue(connections[i]['type']);
                newBlock.getField('SIZE_SELECTION').setValue(connections[i]['size']);
                connections[i]['block'] = newBlock;
                nextConn.connect(newBlock.previousConnection);
                nextConn = newBlock.nextConnection;
            }

            // Lastly, register in the module block its connections
            this.connections = connections;
        },
        cleanOldConnections_: function() {
            for (var i = 0; i < this.connections.length; i++) {
                this.connections[i]['block'].dispose(true);
            }
        },
        saveConnections: function(containerBlock) {
        },
        onchange: function() {
            // Update connections (inputs/outputs)
            var connections = [];
            var nextConn = this.getInput('CONNECTIONS').connection;
            while (nextConn.targetBlock() != null) {
                var block = nextConn.targetBlock();
                var type = block.getFieldValue('TYPE_SELECTION');
                var size = block.getFieldValue('SIZE_SELECTION');
                var name = block.getFieldValue('NAME');
                connections.push({'type' : type, 'size' : size, 
                    'name' : name, 'block' : block});
                nextConn = block.nextConnection;
            }
            this.connections = connections;

            // Update declared signals
            var declaredSignals = [];
            nextConn = this.getInput('SIGNALS').connection;
            while (nextConn.targetBlock() != null) {
                var block = nextConn.targetBlock();
                var size = block.getFieldValue('SIZE_SELECTION');
                var name = block.getFieldValue('NAME');
                declaredSignals.push({'size' : size, 'name' : name,
                    'block' : block});
                nextConn = block.nextConnection;
            }
            this.declaredSignals = declaredSignals;
        },
        signalExists: function(name) {
            // Check if a declared signal has that name
            for (var i = 0; i < this.declaredSignals.length; i++) {
                for (var j = 0; j < this.declaredSignals[i].length; j++) {
                    if (this.declaredSignals[i][j].name === name) {
                        return [true, 'signal', this.declaredSignals[i][j]];
                    }
                }
            }

            // Check if a connection has that name
            for (var i = 0; i < this.connections.length; i++) {
                if (this.connections[i]['name'] === name) {
                    return [true, 'connection', this.connections[i]]; 
                }
            }

            return [false, 'none', {}];
        },
        isValidName: function(name) {
            if (!this.nameRegex.test(name)) {
                return false;
            }

            exists = this.signalExists(name);

            if (exists[0]) {
                return false;
            }
            return true;
        },
        getSvDependencies: function() {
            var descendants = this.getDescendants();
            console.log(descendants);
            var deps = [];

            // List types of descendants excluding those which are reserved
            // type.
            for (var i = 0; i < descendants.length; i++) {
                console.log(descendants[i].type)
                if (!utils.reservedTypes.includes(descendants[i].type)) {
                    deps.push(descendants[i].type);
                }
            }
            return deps;
        },
        getConnections: function() {
            return this.connections;
        },
        makeSignalList: function(size) {
            var signals = []
            // List connections
            for (var i = 0; i < this.connections.length; i++) {
                if (this.connections[i].size === size) {
                    name = this.connections[i].name;
                    signals.push([name, name]);
                }
            }
            // List signals
            for (var i = 0; i < this.declaredSignals.length; i++) {
                if (this.declaredSignals[i].size === size) {
                    name = this.declaredSignals[i].name;
                    signals.push([name, name]);
                }
            }

            // If there is at least one valid signal
            if (signals.length > 0) {
                return signals;
            }

            return [['<no valid signal>', 'SIGNAL_INVALID']];
        }
    };

    Blockly.Python['module'] = function(block) {
        console.log(block);
        var text_name = block.getFieldValue('NAME');
        var statements_connections = Blockly.Python.statementToCode(block, 'CONNECTIONS');
        var statements_signals = Blockly.Python.statementToCode(block, 'SIGNALS');
        var statements_implementation = Blockly.Python.statementToCode(block, 'IMPLEMENTATION');
        // TODO: Assemble Python into code variable.
        var code = 'module ' + text_name + '(\n';
        // Compose input/outputs declarations
        var conns = block.connections;
        for (var i = 0; i < conns.length; i++) {
            code += '    ';
            var type = conns[i]['type'];
            var size = conns[i]['size'];
            var name = conns[i]['name'];
            var bitLen = utils.getSignalBitLen(size);

            if (bitLen === 1) {
                if (type === "TYPE_INPUT") {
                    code += 'input ' + name;
                }
                else {
                    code += 'output ' + name;
                }
            }
            else {
                if (type === "TYPE_INPUT") {
                    code += 'input [' + (bitLen - 1) + ':0] ' + name;
                }
                else {
                    code += 'output [' + (bitLen - 1) + ':0] ' + name;
                }
            }

            if (i < conns.length - 1) {
                code += ',';
            }
            code += '\n';
        }
        code += ');\n\n';

        // Declare signals
        var signals = this.declaredSignals
        for (var i = 0; i < signals.length; i++) {
            var size = signals[i]['size'];
            var name = signals[i]['name'];
            var bitLen = utils.getSignalBitLen(size);
            code += '    wire ';
            if (bitLen === 1) {
                code += name;
            }
            else {
                code += '[' + (bitLen - 1) + ':0] ' + name;
            }
            code += ';\n'

        }
        if (signals.length >= 1) {
            code += '\n\n';
        }
        code += statements_implementation + '\n';
        code += 'endmodule';

        // Generate new blockly block to instantiate module
        // code += '\n\ntest block instantiation gen\n\n'

        // // Block definition
        // code += 'Blockly.Blocks[\'' + text_name + '\'] = {\n' +
        //         '   init: function() {\n' +
        //         '       this.appendDummyInput()\n' +
        //         '           .appendField(\"' + text_name + '\");\n';

        // for (var i = 0; i < conns.length; i++) {
        //     var type = conns[i]['type'];
        //     var size = conns[i]['size'];
        //     var name = conns[i]['name'];
        //     var bitLen = utils.getSignalBitLen(size);
        //     var tip = '';
        //     if (type === "TYPE_INPUT") {
        //         tip = 'in';
        //     }
        //     else {
        //         tip = 'out'
        //     }
        //     var label = tip + ' ' + name;
        //     code += '       this.appendValueInput(\"' + name + '\")\n';
        //     code += '           .setCheck(\"SIGNAL\")\n';
        //     code += '           .appendField(\"' + label + '\");\n';
        // }

        // code += '       this.setInputsInline(true);\n' +
        //         '       this.setPreviousStatement(true, "LOGIC");\n' +
        //         '       this.setNextStatement(true, "LOGIC");\n' +
        //         '       this.setColour(90);\n' + 
        //         '       this.setTooltip(\"' + text_name + '\");\n' + 
        //         '       this.setHelpUrl("");\n' + 
        //         '   }\n' + 
        //         '};\n\n';

        // // Block code generation
        // code += 'Blockly.Python[\"' + text_name + '\"] = function(block) {\n';
        // code += '    var block_name = utils.get_temp_name(\"' + text_name + '\");\n';
        // code += '    var code = \"  ' + text_name + ' \" + block_name + \"(\";\n';
        
        // // Generate all variables
        // for (var i = 0; i < conns.length; i++) {
        //     var type = conns[i]['type'];
        //     var size = conns[i]['size'];
        //     var name = conns[i]['name'];
        //     var bitLen = utils.getSignalBitLen(size);
        //     var varName = 'val_' + name;
        //     code += '    var ' + varName + ' = ' +
        //         'Blockly.Python.valueToCode(block, \"' + name + '\", ' +
        //         'Blockly.Python.ORDER_ATOMIC);\n';
        //     code += '    code += ' + varName + ';\n';

        //     if (i < conns.length - 1) {
        //         code += '    code += \", \"\n';
        //     }
        //     else {
        //         code += '    code += \");\n\";\n';
        //     }
        // }
        // code += '    return code';
        // code += '}'
        return code;
    };
}
