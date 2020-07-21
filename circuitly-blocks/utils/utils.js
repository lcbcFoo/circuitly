import * as Blockly from 'blockly/core';
import 'blockly/python';
// Define signal size constants
export const SIGNAL_INVALID = -1;
export const SIGNAL_1BIT = 0;
export const SIGNAL_2BIT = 1;
export const SIGNAL_4BIT = 2;
export const SIGNAL_8BIT = 3;
export const SIGNAL_16BIT = 4;
export const SIGNAL_32BIT = 5;
export const SIGNAL_64BIT = 6;

// Define colours constants
export const COLOUR_ERROR = 0;
export const COLOUR_MODULE = 10;
export const COLOUR_LOGIC = 30;
export const COLOUR_INSTANTIATION = 90;
export const COLOUR_SPLITTER = 100;
export const COLOUR_CONCAT = 100;
export const COLOUR_1BIT = 250;
export const COLOUR_2BIT = 230;
export const COLOUR_4BIT = 210;
export const COLOUR_8BIT = 190;
export const COLOUR_16BIT = 170;
export const COLOUR_32BIT = 150;
export const COLOUR_64BIT = 130;
export const COLOUR_ASSIGN = 200;
export const COLOUR_BITS_SELECT = 200;

export const signalTypesDefinitions = [
    {'type' : 'SIGNAL_1BIT', 'val' : SIGNAL_1BIT, 'colour' : COLOUR_1BIT},
    {'type' : 'SIGNAL_2BIT', 'val' : SIGNAL_2BIT, 'colour' : COLOUR_2BIT},
    {'type' : 'SIGNAL_4BIT', 'val' : SIGNAL_4BIT, 'colour' : COLOUR_4BIT},
    {'type' : 'SIGNAL_8BIT', 'val' : SIGNAL_8BIT, 'colour' : COLOUR_8BIT},
    {'type' : 'SIGNAL_16BIT', 'val' : SIGNAL_16BIT, 'colour' : COLOUR_16BIT},
    {'type' : 'SIGNAL_32BIT', 'val' : SIGNAL_32BIT, 'colour' : COLOUR_32BIT},
    {'type' : 'SIGNAL_64BIT', 'val' : SIGNAL_64BIT, 'colour' : COLOUR_64BIT},
    {'type' : 'SIGNAL_INVALID', 'val' : SIGNAL_INVALID, 'colour' : COLOUR_ERROR}
];

export const reservedTypes = [
    'module', 'splitter', 'concat', 'NAND', 'signal_getter',
    'connections_designer', 'create_signal', 'module_connection',
    'assign'
];

// Receives a 'type' of signal - for example string "SIGNAL_1BIT"
export function getSignalBitLen(type) {
    for (var i = 0; i < signalTypesDefinitions.length; i++) {
        if (signalTypesDefinitions[i].type === type) {
            return (2 ** signalTypesDefinitions[i].val);
        }
    }
    return 0;
}

// Receives a 'type' of signal - for example string "SIGNAL_1BIT"
export function getSignalColour(type) {
    for (var i = 0; i < signalTypesDefinitions.length; i++) {
        if (signalTypesDefinitions[i].type === type) {
            return signalTypesDefinitions[i].colour;
        }
    }
    return 0;
}

export function isSameSignal(sig1, sig2) {
    return sig1['name'] === sig2.name && sig1['size'] === sig2['size'];
}

var temp_counter = 0;

export function get_temp_name(name) {
    var temp = temp_counter;
    temp_counter = temp_counter + 1;
    return name + '_' + temp;
}

// Synthesize primitive systemverilog logic blocks (will show the common used
// gates on digitaljs instead of a square box that allows to look inside it)
let PRETTY_SIM = true;

export function setPrettySimMode(bool) {
    PRETTY_SIM = bool;
}

export function isPrettySimMode() {
    return PRETTY_SIM;
}

