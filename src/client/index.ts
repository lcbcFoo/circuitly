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
import "bootstrap/dist/css/bootstrap.min.css";
import * as Blockly from 'blockly/core';
import 'blockly/python';
import '../../circuitly-blocks/loader.js'

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
    var allConnections = null;

    /***/
    let testbench: Testbench = new Testbench(appendTestbenchRow);
    let needToRecreateTable: boolean = true;

    let runningTb: JQueryDeferred<void>;
    let successDeferred: JQueryDeferred<void>;

    // TODO: remove this block
    // Debug - Code generated
    // document.querySelector('#run').addEventListener('click', runCode);
    function myUpdateFunction() {
        let workspace = Blockly.getMainWorkspace();
        let topBlocks: any[] = workspace.getTopBlocks(false);
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
        let code = Blockly['Python'].workspaceToCode(workspace);
        svFiles["_input.sv"] = code;
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
            return;
        }
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

    function updateUi() {
        let circuitCreated = !(circuit == undefined);
        if (circuitCreated) {
            $("#monitorbox").show();
            $(".digitaljs-area").show();
            let table = $("#tb-result-table");
            if (table.length) {
                $("#tb-result-summary").show();
                $("#testbench-result-wrapper").show();
            } else {
                $("#testbench-result-wrapper").hide();
                $("#tb-result-summary").hide();
            }
        } else {
            $("#monitorbox").hide();
            $(".digitaljs-area").hide();
            $("#testbench-result-wrapper").hide();
            $("#tb-result-summary").hide();
        }
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
        destroyTestbench();
        updatebuttons();
        updateUi();
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
            updateUi();
        });
        circuit.on("changeRunning", () => {
            updatebuttons();
            updateUi();
        });
        updatebuttons();
        updateUi();
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
        let delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        await delay(1000);
        let devs = identifyCircuitElements(data);
        testbench.setIoDevices(devs);
        testbench.setCircuit(circuit);
        enableRunTbButton();
    }

    function runquery() {
        const data = myUpdateFunction();
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
                updateUi();
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
        updateUi();
        updatebuttons();
    });

    $("button[name=next]").click(() => {
        circuit.updateGatesNext();
        updateUi();
        updatebuttons();
    });

    $("button[name=fastfw]").click(() => {
        circuit.startFast();
        updateUi();
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
            selectFileDom.accept = ".xml";

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
        // Create File Reader event listener function
        var parseInputXMLfile = function(e: Event) {
            var xmlFile = (<HTMLInputElement>e.target).files[0];

            var reader = new FileReader();
            reader.onload = function() {
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
                        return newValue;
                    };

                    var dom = Blockly.Xml.textToDom(<string>reader.result);
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

                    var dom = Blockly.Xml.textToDom(<string>reader.result);
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

    function destroyTestbench() {
        $("#tb-result-table").remove();
        $("#tb-result-summary").hide();

    }

    function recreateTbResultTableDiv(rowSample: types.TestbenchRow) {
        destroyTestbench();
        let tableMarkup = 
            '<table id="tb-result-table" class="table">';
        tableMarkup += '<thead id="tb-result-thead"><tr>';
        rowSample.inputs.forEach((input) => {
            tableMarkup += '<th scope="col">in ' + input.name + '</th>'; 
        });
        rowSample.tbResults.forEach((result) => {
            tableMarkup += '<th scope="col">out ' + result.signalName + '</th>';
        });
        tableMarkup += '</tr></thead><tbody id="tb-tbody"></tbody></table>';
        $("#testbench-result-wrapper").append(tableMarkup);
        updateUi();
    }

    function appendTestbenchRow(row: types.TestbenchRow) {
        if (needToRecreateTable) {
            recreateTbResultTableDiv(row);
            needToRecreateTable = false;
        }
        let markup = "<tr>";
        row.inputs.forEach((input) => {
            markup += "<td>" + input.val + "</td>";
        });
        row.tbResults.forEach((result) => {
            let cls = '';
            let title = '';
            if (result.success){
                cls = 'result-success';
                title = 'correct';
            }
            else {
                cls = 'result-error';
                title = 'Error: ' + result.failDescription;
            }
            markup += '<td class="' + cls + '" title="' + title +'">';
            markup += result.value + "</td>";
        });
        markup += "</tr>";
        $("#tb-tbody").append(markup);
    }

    // Receive object data returned from yosys2digitaljs
    // Populates following global variables with relevant data:
    function identifyCircuitElements(data: {
        [id: string]: types.Device;
    }): types.IODevice[] {
        let ioDevices: types.IODevice[] = [];
        for (let [key, value] of Object.entries(data["devices"])) {
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
            } else if (celltype === "$clock") {
                let child = $(parentElement).find('input')[0];
                typeofelement = "$clock";
                element = child;
                ioType = "clock";
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
        return ioDevices;
    }

    $(".tb-file-input").change((e: JQuery.ChangeEvent) => {
        let csvFile = (<HTMLInputElement>e.target).files[0];
        let read: Object[] = [];
        fileReaderStream(csvFile)
            .pipe(csv())
            .on("data", (data: Object): number => read.push(data))
            .on("end", () => {
                testbench.setStatements(read);
            });
    });

    // Automatic update tb filename span text
    $(document).ready(function() {
        $('.tb-file-input input[type="file"]').change(function() {
            var filename = (<string>$(this).val())
                .replace(/\\/g, "/")
                .replace(/.*\//, "");
            $(".tb-filename").html(filename);
        });
    });

    function cleanTbSummary() {
        $("#tb-result-summary").removeClass("summary-passed");
        $("#tb-result-summary").removeClass("summary-failed");
        $("#tb-result-summary").text("Testbench running...");
    }

    $("button[name=run-tb]").click(() => {
        // TODO: study better syncronism mechanism
        if (runningTb && runningTb.state() === "pending") {
            runningTb.reject();
        }
        // Disable run-tb button until tb run is finished or cancelled
        disableRunTbButton();
        needToRecreateTable = true;
        runningTb = JQuery.Deferred();
        successDeferred = JQuery.Deferred();
        cleanTbSummary();

        successDeferred.done(function() {
            console.log("Testbench passed");
            $('#tb-result-summary').addClass("summary-passed");
            $("#tb-result-summary").text("Testbench passed!");
            $("#tb-result-summary").prop("disabled", false);
            runningTb.resolve();
        });
        successDeferred.fail(function() {
            console.log("Testbench failed");
            $('#tb-result-summary').addClass("summary-failed");
            $("#tb-result-summary").text("Testbench failed!");
            $("#tb-result-summary").prop("disabled", false);
            runningTb.reject();
        });
        successDeferred.always(function() {
            console.log("Testbench finished");
            // Pause circuit
            $("button[name=pause]").trigger("click");
            // Allow users to run testbench again
            enableRunTbButton();
        });

        // Run testbench
        testbench.runTestbench(successDeferred, runningTb.promise());
    });

    window.onpopstate = () => {
        const hash = window.location.hash.slice(1);
        if (loading || !hash) return;
        destroycircuit();
    };

    updatebuttons();
    updateUi();
    $("#monitorbox button")
        .prop("disabled", true)
        .off();

    // if (window.location.hash.slice(1)) window.onpopstate();

    // Expose testbench as window object so it can be accessed by puppeteer
    (<any>window).testbench = testbench;

    //////////////////////////////////////////////////////////////////////////////////
});
