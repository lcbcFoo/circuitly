import * as types from "../types/types";
import * as digitaljs from "digitaljs";

export class Testbench {
    circuit: digitaljs.Circuit;
    ioDevices: types.IODevice[];
    testbenchStatements: Object[] = [];
    testbenchResults: Object[] = [];
    delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    clockRisingEdgeListeners: (() => void)[] = [];
    clockFallingEdgeListeners: (() => void)[] = [];
    fullRun: boolean = true;
    iterationCallback: (row: types.TestbenchRow) => void;
    clockTick: number = 0;
    // For now only supports a single clock
    clockDevice: types.IODevice = null;
    tbClockCycleInTicks: number = 200;
    DEFAULT_CLOCK_CYCLE_TICKS: number = 100;

    constructor(iterationCallback: (row: types.TestbenchRow) => void) {
        this.iterationCallback = iterationCallback;
        this.circuit = null;
    }

    setStatements(statements: Object[]) {
        this.testbenchStatements = statements;
        console.log(this.testbenchStatements);
    }

    setIoDevices(ioDevices: types.IODevice[]) {
        this.ioDevices = ioDevices;
        this.clockDevice = this.findClockDevice(ioDevices);
        console.log(this.ioDevices);
        console.log(this.clockDevice);
    }

    findClockDevice(ioDevices: types.IODevice[]): types.IODevice {
        let clocks = ioDevices.filter((device) => {
            return device.typeofelement === "$clock";
        });
        if (clocks.length > 0) {
            return clocks[0];
        } else {
            return null;
        }
    }

    subscribe(event: string, callback: () => void) {
        switch (event) {
            /* Subscribe for a single rising edge event */
            case "risingEdge":
                this.clockRisingEdgeListeners.push(callback);
                break;
            /* Subscribe for a single falling edge event */
            case "fallingEdge":
                this.clockFallingEdgeListeners.push(callback);
                break;
            default:
                break;
        }
    }

    /* Trigger event */
    trigger(event: string) {
        switch (event) {
            case "risingEdge":
                this.clockRisingEdgeListeners.forEach(listener => {
                    listener();
                });
                // Clear rising edge listeners
                this.clockRisingEdgeListeners = [];
                break;
            case "fallingEdge":
                this.clockFallingEdgeListeners.forEach(listener => {
                    listener();
                });
                // Clear falling edge listeners
                this.clockFallingEdgeListeners = [];
                break;
            default:
                break;
        }
    }

    setCircuit(circuit: digitaljs.Circuit) {
        this.circuit = circuit;
        this.clockTick = 0;
        // Register callback for circuit tick counter
        this.circuit.on("postUpdateGates", (tick: number) => {
            this.clockTick = tick;
            if (this.clockTick === 0) {
                return;
            }
            if ((this.clockTick - this.DEFAULT_CLOCK_CYCLE_TICKS)
                % (2 * this.tbClockCycleInTicks) === 0) {
                // rising-edge
                console.log(this.clockTick);
                console.log('rising edge');
                this.trigger("risingEdge");
            }
            if (
                (this.clockTick - this.DEFAULT_CLOCK_CYCLE_TICKS)
                 % (2 * this.tbClockCycleInTicks) === this.tbClockCycleInTicks
            ) {
                // falling-edge
                console.log(this.clockTick);
                console.log('falling edge');
                this.trigger("fallingEdge");
            }
        });
    }

    /* Set circuit input button to high (bool=true) / low (bool=false)
     */
    setIOButtonValue(button: HTMLElement, bool: boolean) {
        // Set signal to high
        if (bool) {
            // If not already high
            if (!$(button).hasClass("live")) {
                $(button).trigger("click");
            }
        }
        // Set signal to low
        else {
            // If not already low
            if ($(button).hasClass("live")) {
                $(button).trigger("click");
            }
        }
    }

    /* Set clock frequency in ticks */
    setClockFreqTicks(clockDevice: types.IODevice, freqInTicks: number) {
        if (clockDevice) {
            // We must divide by 2 since the input is related to half-cycle
            $(clockDevice.element).val(Math.round(freqInTicks));
            $(clockDevice.element).trigger("change");
        }
    }

    /* Set a numvalue input element to hexval (hex string)
     */
    setIONumValue(numvalue: HTMLElement, hexval: string) {
        $(numvalue).val(hexval);
        $(numvalue).trigger("change");
    }

    /* Return '1' if lamp is high, '0' otherwise
     */
    getIOLampValue(lamp: HTMLElement) {
        let onColor = "#03c03c";
        let offColor = "#fc7c68";
        return $(lamp).attr("fill") === onColor ? "0x1" : "0x0";
    }

    /* Return value showing in numvalue_out element (assuming it is
     * in hex format)
     */
    getIONumValueOut(numvalue_out: HTMLElement) {
        return "0x" + $(numvalue_out).text();
    }

    /* Given a array of {'name' : inputName, 'val' : inputVal], set all
     * listed input to the corresponding values
     */

    setInputs(inputConnections: types.NameVal[]) {
        inputConnections.forEach(inputConnection => {
            let name = inputConnection["name"];
            let val = inputConnection["val"];
            let device = this.ioDevices.find(function(device) {
                return device.label === name && device.ioType === "input";
            });
            console.log(this.ioDevices);
            console.log(inputConnection);
            console.log(device);
            // Check if input actually exists and is loaded, if not just
            // ignore testbench input entry
            if (device) {
                let circuitElement = device["element"];
                let type = device["typeofelement"];

                switch (type) {
                    case "btnface":
                        let bool: boolean;
                        if (val === 0 || val === "0x0" || val === false) {
                            bool = false;
                        } else {
                            bool = true;
                        }
                        this.setIOButtonValue(circuitElement, bool);
                        break;
                    case "numvalue":
                        // Remove '0x'
                        let inpVal = (<string>val).slice(2);
                        this.setIONumValue(circuitElement, inpVal);
                        break;
                    default:
                        console.log("invalid circuit type at testbench");
                        break;
                }
            }
        });
    }

    /* Given a array of {'name' : outputName} returns a list of [{'name', 'val'}]
     * corresponding to the current values of the circuit elements
     */
    getOutputs(outputConnections: types.NameOnly[]): types.NameVal[] {
        let values: types.NameVal[] = [];
        outputConnections.forEach(outputConnection => {
            let name = outputConnection["name"];
            let device = this.ioDevices.find(function(device) {
                return device.label === name && device.ioType === "output";
            });
            // Check if output actually exists and is loaded, if not just
            // ignore testbench output entry
            if (device) {
                let circuitElement = device["element"];
                let type = device["typeofelement"];
                let val: string = "";
                switch (type) {
                    case "led":
                        val = this.getIOLampValue(circuitElement);
                        break;
                    case "numvalue_out":
                        val = this.getIONumValueOut(circuitElement);
                        break;
                    default:
                        console.log("invalid circuit type at testbench");
                        break;
                }
                if (val) {
                    values.push({ name: name, val: val });
                }
            }
        });
        return values;
    }

    validateResults(
        expectedResults: types.NameVal[],
        line: number
    ): types.TestbenchOutputResult[] {
        let outputsList: types.NameOnly[] = [];
        let fullRunResult: types.TestbenchOutputResult[] = [];

        // Create a list of {'name'} of the output signals
        if (expectedResults) {
            expectedResults.forEach(output => {
                outputsList.push({ name: output["name"] });
            });
            let results: types.NameVal[] = this.getOutputs(outputsList);

            // Compare results with expected. Outputs not listed are ignored.
            for (let i = 0; i < expectedResults.length; i++) {
                let entryResult: types.TestbenchOutputResult = <
                    types.TestbenchOutputResult
                >{};
                entryResult.failDescription = "";
                entryResult.success = true;
                const expected = expectedResults[i];
                const result = results.filter(obj => {
                    return obj.name === expected.name;
                })[0];

                if (!result) {
                    entryResult.success = false;
                    entryResult.signalName = "<invalid>";
                    entryResult.value = "x";
                    entryResult.failDescription =
                        'There is no output signal named "';
                    entryResult.failDescription +=
                        expected.name + '" in the circuit.';
                    entryResult.failLine = line;
                    continue;
                }
                entryResult.value = <string>result.val;
                entryResult.signalName = result.name;

                // Testbench failed
                if (+expected.val !== +result.val) {
                    entryResult.success = false;
                    entryResult.failDescription =
                        "Different value detected for output '";
                    entryResult.failDescription +=
                        expected.name + "'. Expected ";
                    entryResult.failDescription += expected.val;
                    entryResult.failDescription +=
                        ". Found: " + result.val + ".";
                    entryResult.failLine = line;
                }
                // If running in stop at first error mode
                if (!this.fullRun && !entryResult.success) {
                    return [entryResult];
                }
                fullRunResult.push(entryResult);
            }
        }

        return fullRunResult;
    }

    getIODeviceByName(name: string): types.IODevice {
        for (let i = 0; i < this.ioDevices.length; i++) {
            if (this.ioDevices[i].label === name) {
                return this.ioDevices[i];
            }
        }
        return null;
    }

    // Parse a boolean, number or string value to hex string (without starting '0x')
    // For example: 0x10 -> 0x10, 10 -> 0xa, true -> '0x1'
    parseValue(value: boolean | string | number): string {
        if (typeof value === "boolean") {
            return value ? "0x1" : "0x0";
        } else if (typeof value === "number") {
            return "0x" + value.toString(16);
        } else {
            if (value.match(/0x[0-9a-fA-F]+/)) {
                return value;
            } else if (value.match(/[0-9]+/)) {
                return "0x" + (+value).toString(16);
            }
        }
        // Invalid input
        console.error("invalid: " + value);
        return "";
    }

    genResultTableRow(
        inputs: types.NameVal[],
        tbResults: types.TestbenchOutputResult[]
    ): types.TestbenchRow {
        let rowObj: types.TestbenchRow = new types.TestbenchRow();
        rowObj.inputs = inputs;
        rowObj.tbResults = tbResults;
        return rowObj;
    }

    async runTestbench(
        successDeferred: JQueryDeferred<void>,
        runningPromise: JQueryPromise<void>
    ) {
        let timedInputs: types.NameVal[][] = [];
        let timedExpectedResults: types.NameVal[][] = [];
        let resultTable: types.TestbenchRow[] = [];
        let tbResults: types.TestbenchOutputResult[][] = [];
        // Create a list of {'name', 'value'} for the input signals and
        // expected results
        this.testbenchStatements.forEach(statement => {
            let clockTickInputs = [];
            let clockTickOutputs = [];
            for (let [key, value] of Object.entries(statement)) {
                let device: types.IODevice = this.getIODeviceByName(key);
                let parsed: string = this.parseValue(value);
                if (parsed === "") {
                    console.log("Warning - invalid statement in CSV");
                }
                // In case the signal does not exist
                if (device === null) {
                    continue;
                }
                if (device.ioType === "input") {
                    clockTickInputs.push({ name: key, val: parsed });
                } else {
                    clockTickOutputs.push({ name: key, val: parsed });
                }
            }
            if (!(clockTickInputs === [] || clockTickOutputs === [])) {
                timedInputs.push(clockTickInputs);
                timedExpectedResults.push(clockTickOutputs);
            }
        });

        // Set clock to tbTimescaleInTicks during testbench run
        this.setClockFreqTicks(this.clockDevice, this.tbClockCycleInTicks);

        // Resolvers to promise that waits rising edge to occur
        let outsideResolve: () => void;
        let outsideReject: () => void;

        // Callback to edge event
        let waitClockEdgeCallback = () => {
            if (runningPromise.state() === "rejected") {
                return outsideReject();
            }
            return outsideResolve();
        };
        // Subscribe and wait for rising edge auxiliar function
        let waitRisingEdge = () => {
            return new Promise(
                (resolve, reject) => {
                    outsideResolve = resolve;
                    outsideReject = reject;
                    this.subscribe("risingEdge", waitClockEdgeCallback);
                }
            );
        };
        // Subscribe and wait for falling edge auxiliar function
        let waitFallingEdge = () => {
            return new Promise(
                (resolve, reject) => {
                    outsideResolve = resolve;
                    outsideReject = reject;
                    this.subscribe("fallingEdge", waitClockEdgeCallback);
                }
            );
        };
        // Subscribe and wait for entire cycle auxiliar function
        let waitClockCycle = async () => {
            await waitRisingEdge();
            await waitRisingEdge();
        };

        // Ensure we wait at least full clock cycle (2 rising edges)
        // it initializes the circuit signals
        this.circuit.start();
        await waitClockCycle();

        // Run testbench statements and collect results produced
        for (let i = 0; i < timedInputs.length; i++) {
            // Check if testbench was cancelled
            if (runningPromise.state() === "rejected") {
                this.failed(successDeferred);
                return;
            }

            // Set inputs and wait for next rising edge to collect results
            this.setInputs(timedInputs[i]);
            await waitRisingEdge();
            let rowResults = this.validateResults(timedExpectedResults[i], i);
            tbResults.push(rowResults);
            let tbRow = this.genResultTableRow(timedInputs[i], rowResults);
            resultTable.push(tbRow);

            // Call external callback to update UI
            this.iterationCallback(tbRow);

            // We want to check if we should stop testbench because of an error
            // (when in stop at first eror mode). It is enough to check the
            // first item of the last tb results row, it is guaranteed it will
            // be an error if an error occurred in this mode
            let lastEntry: types.TestbenchOutputResult = rowResults[0];
            if (!this.fullRun && !lastEntry.success) {
                this.failed(successDeferred);
                return;
            }
        }

        // Check if any error was found
        for (let i = 0; i < resultTable.length; i++) {
            let outputs = resultTable[i].tbResults;
            for (let j = 0; j < outputs.length; j++) {
                // If any signal failed
                if (!outputs[j].success) {
                    this.failed(successDeferred);
                    return;
                }
            }
        }
        successDeferred.resolve();
        this.finishTb(true);
    }

    failed(successDeferred: JQueryDeferred<void>) {
        successDeferred.reject();
        this.finishTb(false);
    }

    finishTb(isSuccess: boolean) {
        // Return clock to default tick freq
        this.setClockFreqTicks(this.clockDevice, this.DEFAULT_CLOCK_CYCLE_TICKS);
        $(window).trigger('testbenchFinished', [isSuccess]);
        console.log('finishtb function: ' + isSuccess);
    }
}
