"use strict";

import JQuery from "jquery";
import * as digitaljs from "digitaljs";
import "./scss/app.scss";
import * as utils from "../../circuitly-blocks/utils/utils.js";
import FileSaver from "file-saver";
import csv from "csv-parser";
import fileReaderStream from "filereader-stream";
import * as types from "./types/types";
import { Testbench } from "./testbench/testbench";
import 'bootstrap/dist/css/bootstrap.min.css';

//import { saveAs } from 'file-saver';

$(window).on("load", () => {
    var globalFileData = "";
    function readTextFile(file: string) {
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4) {
                if (rawFile.status === 200 || rawFile.status == 0) {
                    var allText = rawFile.responseText;
                    globalFileData = allText;
                }
            }
        };
        rawFile.send(null);
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Move to circuitly in future
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    var allConnections = null;
    var simTimescaleMs = 1000;

    /***/
    let testbench: Testbench = null;
    let ioDevices: types.IODevice[] = [];
    var testbenchStatements: Object[] = [];
    var testbenchResults: Object[] = [];

    let runningTb: JQueryDeferred<void>;
    let successDeferred: JQueryDeferred<void>;

    // TODO: remove this block
    // Debug - Code generated
    // document.querySelector('#run').addEventListener('click', runCode);
    function myUpdateFunction() {
        let workspace = Blockly.getMainWorkspace();
        let topBlocks: any[] = workspace.getTopBlocks();
        let svDependencies: any[] = [];
        // Update allConnections
        allConnections = [];
        for (let i = 0; i < topBlocks.length; i++) {
            if (topBlocks[i].type != "module") {
                continue;
            }
            allConnections.push(topBlocks[i].getConnections());
        }
        // Get SV all dependencies to compile workspace
        for (let i = 0; i < topBlocks.length; i++) {
            if (topBlocks[i].type != "module") {
                continue;
            }
            let deps = topBlocks[i].getSvDependencies();
            for (let j = 0; j < deps.length; j++) {
                svDependencies.push(deps[j]);
            }
        }
        // Filter repeated dependencies
        let filtered: string[] = [];
        for (let i = 0; i < svDependencies.length; i++) {
            if (
                !(
                    utils.reservedTypes.includes(svDependencies[i]) ||
                    filtered.includes(svDependencies[i])
                )
            ) {
                filtered.push(svDependencies[i]);
            }
        }
        // List depencies SV files to pass to yosystodigitaljs
        let svFiles: { [id: string]: string } = {};
        for (let i = 0; i < filtered.length; i++) {
            let name: string = filtered[i];
            let file =
                "../../circuitly-blocks/logic/" + name + "/" + name + ".sv";
            readTextFile(file);
            let data = globalFileData;
            svFiles[name + ".sv"] = data;
        }
        let code = Blockly.Python.workspaceToCode(workspace);
        svFiles["_input.sv"] = code;
        (<HTMLTextAreaElement>(
            document.getElementById("text-code")
        )).value = code;
        return svFiles;
    }
    //workspace.addChangeListener(myUpdateFunction);

    //////////////////////////////////////////////////////////////////////////////////
    // Digitaljs
    //

    let loading = false;
    let circuit: digitaljs.Circuit;
    let monitorview: digitaljs.MonitorView;
    let monitor: digitaljs.Monitor;
    let paper: HTMLElement;
    let monitormem: HTMLElement;

    function updatebuttons() {
        if (circuit == undefined) {
            $("#toolbar")
                .find("button")
                .prop("disabled", true);
            if (!loading)
                $("#toolbar")
                    .find("button[name=load]")
                    .prop("disabled", false);
            return;
        }
        $("#toolbar")
            .find("button[name=load]")
            .prop("disabled", false);
        $("#toolbar")
            .find("button[name=save]")
            .prop("disabled", false);
        $("#toolbar")
            .find("button[name=link]")
            .prop("disabled", false);
        const running = circuit.running;
        $("#toolbar")
            .find("button[name=pause]")
            .prop("disabled", !running);
        $("#toolbar")
            .find("button[name=resume]")
            .prop("disabled", running);
        $("#toolbar")
            .find("button[name=single]")
            .prop("disabled", running);
        $("#toolbar")
            .find("button[name=next]")
            .prop("disabled", running || !circuit.hasPendingEvents);
        $("#toolbar")
            .find("button[name=fastfw]")
            .prop("disabled", running || !circuit.hasPendingEvents);
        monitorview.autoredraw = !running;
    }

    function destroycircuit() {
        if (monitor) {
            // remember which signals were monitored
            monitormem = monitor.getWiresDesc();
        }
        if (circuit) {
            circuit.shutdown();
            circuit = undefined;
        }
        if (paper) {
            paper.remove();
            paper = undefined;
        }
        if (monitorview) {
            monitorview.shutdown();
            monitorview = undefined;
        }
        if (monitor) {
            monitor.stopListening();
            monitor = undefined;
        }
        loading = true;
        updatebuttons();
        $("#monitorbox button")
            .prop("disabled", true)
            .off();
    }

    async function mkcircuit(data: any) {
        loading = false;
        $("form")
            .find("input, textarea, button, select")
            .prop("disabled", false);
        circuit = new digitaljs.Circuit(data);
        circuit.on("postUpdateGates", (tick: number) => {
            $("#tick").val(tick);
        });
        circuit.start();
        monitor = new digitaljs.Monitor(circuit);
        if (monitormem) {
            monitor.loadWiresDesc(monitormem);
            monitormem = undefined;
        }
        monitorview = new digitaljs.MonitorView({
            model: monitor,
            el: $("#monitor")
        });
        paper = circuit.displayOn($("<div>").appendTo($("#paper")));
        circuit.on("userChange", () => {
            updatebuttons();
        });
        circuit.on("changeRunning", () => {
            updatebuttons();
        });
        updatebuttons();
        $("#monitorbox button").prop("disabled", false);
        $("#monitorbox button[name=ppt_up]").on("click", () => {
            monitorview.pixelsPerTick *= 2;
        });
        $("#monitorbox button[name=ppt_down]").on("click", () => {
            monitorview.pixelsPerTick /= 2;
        });
        $("#monitorbox button[name=left]").on("click", () => {
            monitorview.live = false;
            monitorview.start -=
                monitorview.width / monitorview.pixelsPerTick / 4;
        });
        $("#monitorbox button[name=right]").on("click", () => {
            monitorview.live = false;
            monitorview.start +=
                monitorview.width / monitorview.pixelsPerTick / 4;
        });
        $("#monitorbox button[name=live]")
            .toggleClass("active", monitorview.live)
            .on("click", () => {
                monitorview.live = !monitorview.live;
                if (monitorview.live)
                    monitorview.start =
                        circuit.tick -
                        monitorview.width / monitorview.pixelsPerTick;
            });
        monitorview.on("change:live", (live: boolean) => {
            $("#monitorbox button[name=live]").toggleClass("active", live);
        });
        monitor.on("add", () => {
            if ($("#monitorbox").height() == 0)
                $("html > body > div").css(
                    "grid-template-rows",
                    (_1: any, old: string) => {
                        const z = old.split(" ");
                        z[1] = "3fr";
                        z[3] = "1fr";
                        return z.join(" ");
                    }
                );
        });
        const show_range = () => {
            $("#monitorbox input[name=rangel]").val(
                Math.round(monitorview.start)
            );
            $("#monitorbox input[name=rangeh]").val(
                Math.round(
                    monitorview.start +
                        monitorview.width / monitorview.pixelsPerTick
                )
            );
        };
        const show_scale = () => {
            $("#monitorbox input[name=scale]").val(monitorview.gridStep);
        };
        show_range();
        show_scale();
        monitorview.on("change:start", show_range);
        monitorview.on("change:pixelsPerTick", show_scale);
        // Update information about the circuit / components and UI in case
        // testbench is run later
        // TODO: better way to wait for digitaljs load circuit into UI
        await delay(2000);
        identifyCircuitElements(data);
	testbench = new Testbench(ioDevices);
        enableRunTbButton();
    }

    function runquery() {
        const data = myUpdateFunction();
        console.log(data);
        const opts = { optimize: false, fsm: false, fsmexpand: false };
        // TODO: get necessary SV files for used models or include them in
        // blockly code generator
        destroycircuit();
        $.ajax({
            type: "POST",
            url: "/api/yosys2digitaljs",
            contentType: "application/json",
            data: JSON.stringify({ files: data, options: opts }),
            dataType: "json",
            success: (responseData: any) => {
                mkcircuit(responseData.output);
            },
            error: (_request: any, _status: any, _error: any) => {
                console.log("Server error");
                loading = false;
                updatebuttons();
            }
        });
    }

    function disableRunTbButton() {
        $("button[name=run-tb]").prop("disabled", true);
        $("button[name=run-tb]").addClass("btn-disabled");
        $("button[name=run-tb]").removeClass("btn-enabled");
    }

    function enableRunTbButton() {
        $("button[name=run-tb]").prop("disabled", false);
        $("button[name=run-tb]").addClass("btn-enabled");
        $("button[name=run-tb]").removeClass("btn-disabled");
    }

    $("button[name=compile]").click((e: JQuery.Event) => {
        // TODO: study better syncronism mechanism
        // Ensure there is no testbench running
        if (runningTb && runningTb.state() === "pending") {
            runningTb.reject();
        }
        e.preventDefault();
        // Disable testbench button until circuit is properly loaded
        disableRunTbButton();
        runquery();
    });

    $("button[name=pause]").click(() => {
        circuit.stop();
    });

    $("button[name=resume]").click(() => {
        circuit.start();
    });

    $("button[name=single]").click(() => {
        circuit.updateGates();
        updatebuttons();
    });

    $("button[name=next]").click(() => {
        circuit.updateGatesNext();
        updatebuttons();
    });

    $("button[name=fastfw]").click(() => {
        circuit.startFast();
        updatebuttons();
    });

    function createInvisibleInput(callback: (ev?: Event) => any) {
        // Create once invisible browse button with event listener, and click it
        var selectFile = document.getElementById("select_file");
        if (selectFile === null) {
            var selectFileDom = <HTMLInputElement>(
                document.createElement("INPUT")
            );
            selectFileDom.type = "file";
            selectFileDom.id = "select_file";

            var selectFileWrapperDom = document.createElement("DIV");
            selectFileWrapperDom.id = "select_file_wrapper";
            selectFileWrapperDom.style.display = "none";
            selectFileWrapperDom.appendChild(selectFileDom);

            document.body.appendChild(selectFileWrapperDom);
            selectFile = <HTMLInputElement>(
                document.getElementById("select_file")
            );
            selectFile.addEventListener("change", callback, false);
        }
        selectFile.click();
        // Remove select file to force the recreation every time load button
        // is clicked
        selectFile.parentNode.removeChild(selectFile);
    }

    $("button[name=load_block]").click(() => {
        console.log("onclick");
        // Create File Reader event listener function
        var parseInputXMLfile = function(e: Event) {
            console.log("parseInputXMLfile");
            var xmlFile = (<HTMLInputElement>e.target).files[0];

            var reader = new FileReader();
            reader.onload = function() {
                console.log("reader onload");
                try {
                    ///////////////////////////////////////////////////////////
                    // TODO check next Blockly version cf issue
                    // https://github.com/google/blockly/issues/2926
                    // Temporary disable dropdown validation as we use dynamic one
                    // see https://github.com/lcbcFoo/circuitly/issues/3
                    const fieldDropdownDoClassValidation_ =
                        Blockly.FieldDropdown.prototype.doClassValidation_;
                    Blockly.FieldDropdown.prototype.doClassValidation_ = function(
                        newValue: any
                    ) {
                        console.log(newValue);
                        return newValue;
                    };

                    var dom = Blockly.Xml.textToDom(reader.result);
                    Blockly.Xml.domToWorkspace(dom, Blockly.getMainWorkspace());

                    Blockly.FieldDropdown.prototype.doClassValidation_ = fieldDropdownDoClassValidation_;
                } catch (e) {
                    console.log(e);
                    window.onerror = function(_msg, _url, _linenumber) {
                        alert("Invalid file, does not contain a workspace.");
                        return true;
                    };
                }
            };
            reader.readAsText(xmlFile);
        };
        createInvisibleInput(parseInputXMLfile);
    });

    $("button[name=load_workspace]").click(() => {
        // Create File Reader event listener function
        var parseInputXMLfile = function(e: Event) {
            var xmlFile = (<HTMLInputElement>e.target).files[0];

            var reader = new FileReader();
            reader.onload = function() {
                try {
                    ///////////////////////////////////////////////////////////
                    // TODO check next Blockly version cf issue
                    // https://github.com/google/blockly/issues/2926
                    // Temporary disable dropdown validation as we use dynamic
                    // one.
                    // see https://github.com/lcbcFoo/circuitly/issues/3
                    const fieldDropdownDoClassValidation_ =
                        Blockly.FieldDropdown.prototype.doClassValidation_;
                    Blockly.FieldDropdown.prototype.doClassValidation_ = function(
                        newValue: any
                    ) {
                        return newValue;
                    };

                    var dom = Blockly.Xml.textToDom(reader.result);
                    Blockly.Xml.clearWorkspaceAndLoadFromXml(
                        dom,
                        Blockly.getMainWorkspace()
                    );

                    Blockly.FieldDropdown.prototype.doClassValidation_ = fieldDropdownDoClassValidation_;
                    ///////////////////////////////////////////////////////////
                } catch (e) {
                    console.log(e);
                    window.onerror = function(_msg, _url, _linenumber) {
                        alert("Invalid file, does not contain a workspace.");
                        return true;
                    };
                }
            };
            reader.readAsText(xmlFile);
        };
        createInvisibleInput(parseInputXMLfile);
    });

    $("button[name=save]").click(() => {
        var xmlDom = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
        var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
        const blob = new Blob([xmlText], {
            type: "application/xml;charset=utf-8"
        });
        FileSaver.saveAs(blob, "circuitly_workspace.xml");
    });

    // Receive object data returned from yosys2digitaljs
    // Populates following global variables with relevant data:
    // - inputDevices: dict of {'label' : {'net', 'bits', 'element', 'typeofelement'}}
    // - outputDevices: list of {'label' : {'net', 'bits', 'element', 'typeofelement'}}
    function identifyCircuitElements(data: { [id: string]: types.Device }) {
        ioDevices = [];
        for (let [key, value] of Object.entries(data["devices"])) {
            console.log(key);
            console.log(value);
            let celltype: string = <string>value["celltype"];
            let net: string = value["net"];
            let label: string = value["label"];
            let bits: number = value["bits"];
            let element: HTMLElement = null;
            let typeofelement: string = null;
            let ioType: string = "";
            // Find label related to this device
            let textElement = $("text").filter(function() {
                return $(this).hasClass("label") && $(this).text() === label;
            });
            // Get label parent
            let parentElement = $(textElement[0]).parent()[0];
            // Identify the celltype
            if (celltype === "$button") {
                let child = $(parentElement)
                    .children("rect")
                    .filter(function() {
                        return $(this).hasClass("btnface");
                    })[0];
                typeofelement = "btnface";
                element = child;
                ioType = "input";
            } else if (celltype === "$lamp") {
                let child = $(parentElement)
                    .children("circle")
                    .filter(function() {
                        return $(this).hasClass("led");
                    })[0];
                typeofelement = "led";
                element = child;
                ioType = "output";
            } else if (celltype === "$numentry") {
                let child = $(parentElement)
                    .find("input")
                    .filter(function() {
                        return $(this).hasClass("numvalue");
                    })[0];
                typeofelement = "numvalue";
                element = child;
                ioType = "input";
            } else if (celltype === "$numdisplay") {
                let child = $(parentElement)
                    .children("text")
                    .filter(function() {
                        return $(this).hasClass("numvalue");
                    })[0];
                typeofelement = "numvalue_out";
                element = child;
                ioType = "output";
                // This is not an IO component
            } else {
                continue;
            }
            ioDevices.push({
                label: label,
                net: net,
                bits: bits,
                element: element,
                typeofelement: typeofelement,
                ioType: ioType
            });
        }
    }

    /* Set circuit input button to high (bool=true) / low (bool=false)
     */
    function setIOButtonValue(button: HTMLElement, bool: boolean) {
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

    /* Set a numvalue input element to hexval (hex string)
     */
    function setIONumValue(numvalue: HTMLElement, hexval: string) {
        $(numvalue).val(hexval);
        $(numvalue).trigger("change");
    }

    /* Return '1' if lamp is high, '0' otherwise
     */
    function getIOLampValue(lamp: HTMLElement) {
        return $(lamp).hasClass("live") ? "0x1" : "0x0";
    }

    /* Return value showing in numvalue_out element (assuming it is
     * in hex format)
     */
    function getIONumValueOut(numvalue_out: HTMLElement) {
        return "0x" + $(numvalue_out).text();
    }

    /* Given a array of {'name' : inputName, 'val' : inputVal], set all
     * listed input to the corresponding values
     */

    function setInputs(inputConnections: types.NameVal[]) {
        inputConnections.forEach(inputConnection => {
            let name = inputConnection["name"];
            let val = inputConnection["val"];
            let device = ioDevices.find(function(device) {
                return device.label === name && device.ioType === "input";
            });
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
                        setIOButtonValue(circuitElement, bool);
                        break;
                    case "numvalue":
                        // Remove '0x'
                        let inpVal = (<string>val).slice(2);
                        setIONumValue(circuitElement, inpVal);
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
    function getOutputs(outputConnections: types.NameOnly[]): types.NameVal[] {
        let values: types.NameVal[] = [];
        outputConnections.forEach(outputConnection => {
            let name = outputConnection["name"];
            let device = ioDevices.find(function(device) {
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
                        val = getIOLampValue(circuitElement);
                        break;
                    case "numvalue_out":
                        val = getIONumValueOut(circuitElement);
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

    function validateResults(
        expectedResults: types.NameVal[]
    ): types.TestbenchResult {
        let outputsList: types.NameOnly[] = [];
        var returnVal: types.TestbenchResult = <types.TestbenchResult>{};
        returnVal.failDescription = "";

        // Create a list of {'name'} of the output signals
        if (expectedResults) {
            expectedResults.forEach(function(output) {
                outputsList.push({ name: output["name"] });
            });
            let results: types.NameVal[] = getOutputs(outputsList);

            // Compare results with expected. Outputs not listed are ignored.
            for (let i = 0; i < expectedResults.length; i++) {
                const expected = expectedResults[i];
                const result = results.filter(obj => {
                    return obj.name === expected.name;
                })[0];

                if (!result) {
                    returnVal.success = false;
                    returnVal.failDescription =
                        'There is no output signal named "';
                    returnVal.failDescription +=
                        expected.name + '" in the circuit.';
                    returnVal.failLine = i + 1;
                    return returnVal;
                }

                // Testbench failed
                if (+expected.val !== +result.val) {
                    returnVal.success = false;
                    returnVal.failDescription =
                        'Different value detected for output "';
                    returnVal.failDescription += expected.name + '". Expected ';
                    returnVal.failDescription += expected.val;
                    returnVal.failDescription += ". Found: " + result.val + ".";
                    returnVal.failLine = i + 1;
                    return returnVal;
                }
            }
        }

        returnVal.success = true;
        return returnVal;
    }

    function getIODeviceByName(name: string): types.IODevice {
        for (let i = 0; i < ioDevices.length; i++) {
            if (ioDevices[i].label === name) {
                return ioDevices[i];
            }
        }
        return null;
    }

    // Parse a boolean, number or string value to hex string (without starting '0x')
    // For example: 0x10 -> 0x10, 10 -> 0xa, true -> '0x1'
    function parseValue(value: boolean | string | number): string {
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

    async function runTestbench(
        successDeferred: JQueryDeferred<void>,
        runningPromise: JQueryPromise<void>
    ) {
        let timedInputs: types.NameVal[][] = [];
        let timedExpectedResults: types.NameVal[][] = [];
        // Create a list of {'name', 'value'} for the input signals
        testbenchStatements.forEach(function(statement) {
            let clockTickInputs = [];
            let clockTickOutputs = [];
            for (let [key, value] of Object.entries(statement)) {
                let device: types.IODevice = getIODeviceByName(key);
                let parsed: string = parseValue(value);
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
        for (let i = 0; i < timedInputs.length; i++) {
            if (runningPromise.state() === "rejected") {
                successDeferred.reject();
                return;
            }
            await delay(simTimescaleMs / 2);
            setInputs(timedInputs[i]);
            await delay(simTimescaleMs / 2);
            let tbResults: types.TestbenchResult = validateResults(
                timedExpectedResults[i]
            );
            if (!tbResults.success) {
                // TODO: move this report to deferred callback
                console.log(tbResults.failDescription);
                $("#testbench-console").text(tbResults.failDescription);
                // Pause circuit
                $("button[name=pause]").trigger("click");
                successDeferred.reject();
            }
        }

        $("#testbench-console").text("Testbench succeded!");
        successDeferred.resolve();
    }

    // TODO: implement csv loader for inputs / expeted values
    $(".tb-file-input").change((e: JQuery.ChangeEvent) => {
        let csvFile = (<HTMLInputElement>e.target).files[0];
        let read: Object[] = [];
        fileReaderStream(csvFile)
            .pipe(csv())
            .on("data", (data: Object): number => read.push(data))
            .on("end", () => {
                testbenchStatements = read;
            });
    });
    
    // Automatic update tb filename span text
    $(document).ready( function() {
		$('.tb-file-input input[type="file"]').change( function() {
			var filename = (<string>$(this).val()).replace(/\\/g, '/').replace(/.*\//, '');
			$('.tb-filename').html(filename);
		});
	});

    $("button[name=run-tb]").click(() => {
        $("#testbench-console").text("Running testbench...");
        // TODO: study better syncronism mechanism
        if (runningTb && runningTb.state() === "pending") {
            runningTb.reject();
        }
        // Disable run-tb button until tb run is finished or cancelled
        disableRunTbButton();
        runningTb = JQuery.Deferred();
        successDeferred = JQuery.Deferred();

        successDeferred.done(function() {
            console.log("Testbench passed");
            runningTb.resolve();
        });
        successDeferred.fail(function() {
            console.log("Testbench failed");
            runningTb.reject();
        });
        successDeferred.always(function() {
            console.log("Testbench finished");
            // Allow users to run testbench
            enableRunTbButton();
        });

        runTestbench(successDeferred, runningTb.promise());
    });

    window.onpopstate = () => {
        const hash = window.location.hash.slice(1);
        if (loading || !hash) return;
        destroycircuit();
    };

    updatebuttons();
    $("#monitorbox button")
        .prop("disabled", true)
        .off();

    // if (window.location.hash.slice(1)) window.onpopstate();

    //////////////////////////////////////////////////////////////////////////////////
});
