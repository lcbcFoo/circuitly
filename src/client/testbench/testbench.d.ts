/// <reference types="jquery" />
import * as types from "../types/types";
import * as digitaljs from "digitaljs";
export declare class Testbench {
    circuit: digitaljs.Circuit;
    ioDevices: types.IODevice[];
    testbenchStatements: Object[];
    testbenchResults: Object[];
    delay: (ms: number) => Promise<unknown>;
    clockFreqInTicks: number;
    clockRisingEdgeListeners: (() => void)[];
    clockFallingEdgeListeners: (() => void)[];
    fullRun: boolean;
    iterationCallback: (row: types.TestbenchRow) => void;
    clockTick: number;
    constructor(iterationCallback: (row: types.TestbenchRow) => void);
    setStatements(statements: Object[]): void;
    setIoDevices(ioDevices: types.IODevice[]): void;
    subscribe(event: string, callback: () => void): void;
    trigger(event: string): void;
    setCircuit(circuit: digitaljs.Circuit): void;
    setIOButtonValue(button: HTMLElement, bool: boolean): void;
    setIONumValue(numvalue: HTMLElement, hexval: string): void;
    getIOLampValue(lamp: HTMLElement): "0x1" | "0x0";
    getIONumValueOut(numvalue_out: HTMLElement): string;
    setInputs(inputConnections: types.NameVal[]): void;
    getOutputs(outputConnections: types.NameOnly[]): types.NameVal[];
    validateResults(expectedResults: types.NameVal[], line: number): types.TestbenchOutputResult[];
    getIODeviceByName(name: string): types.IODevice;
    parseValue(value: boolean | string | number): string;
    genResultTableRow(inputs: types.NameVal[], tbResults: types.TestbenchOutputResult[]): types.TestbenchRow;
    runTestbench(successDeferred: JQueryDeferred<void>, runningPromise: JQueryPromise<void>): Promise<void>;
    failed(successDeferred: JQueryDeferred<void>): void;
}
