"use strict";

import $ from 'jquery';
import * as digitaljs from 'digitaljs';
import './scss/app.scss';
import  * as utils  from '../../circuitly/utils/utils.js'
import * as FileSaver from 'file-saver';

//import { saveAs } from 'file-saver';

$(window).on('load', () => {
    var globalFileData = '';
    function readTextFile(file) {
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function () {
            if(rawFile.readyState === 4)
            {
                if(rawFile.status === 200 || rawFile.status == 0)
                {
                    var allText = rawFile.responseText;
                    globalFileData = allText;
                }
            }
        };
        rawFile.send(null);
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Move to circuitly in future
    const delay = ms => new Promise(res => setTimeout(res, ms));
    var allConnections = null;
    var simTimescaleMs = 1000;
    let circuitData = {};
    let inputDevices = [];
    let outputDevices = [];
    let runningTb;
    let successDeferred;

    // TODO: remove this block
    // Debug - Code generated
    // document.querySelector('#run').addEventListener('click', runCode);
    function myUpdateFunction(event) {
        var workspace = Blockly.getMainWorkspace();
        var topBlocks = workspace.getTopBlocks();
        var svDependencies = [];
        // Update allConnections
        allConnections = [];
        for (var i = 0; i < topBlocks.length; i++) {
            if (topBlocks[i].type != "module") {
                continue;
            }
            allConnections.push(topBlocks[i].getConnections());
        }
        // Get SV all dependencies to compile workspace
        for (var i = 0; i < topBlocks.length; i++) {
            if (topBlocks[i].type != "module") {
                continue;
            }
            var deps = topBlocks[i].getSvDependencies();
            for (var j = 0; j < deps.length; j++) {
                svDependencies.push(deps[j]);
            }
        }
        // Filter repeated dependencies
        var filtered = [];
        for (var i = 0; i < svDependencies.length; i++) {
            if (!(utils.reservedTypes.includes(svDependencies[i])
                || filtered.includes(svDependencies[i]))) {

                filtered.push(svDependencies[i]);
            }
        }
        // List depencies SV files to pass to yosystodigitaljs
        var svFiles = {}
        for (var i = 0; i < filtered.length; i++) {
            var name = filtered[i];
            var file = '../../circuitly/logic/' + name + '/' + name + '.sv';
            readTextFile(file);
            var data = globalFileData;
            svFiles[name + '.sv'] = data;
        }
        var code = Blockly.Python.workspaceToCode(workspace);
        svFiles['_input.sv'] = code;
        document.getElementById('text-code').value = code;
        return svFiles;
    }
    //workspace.addChangeListener(myUpdateFunction);



    //////////////////////////////////////////////////////////////////////////////////
    // Digitaljs
    //

    let loading = false, circuit, paper, monitor, monitorview, monitormem, filedata, filenum;
    let jsonData = ""

    function updatebuttons() {
        if (circuit == undefined) {
            $('#toolbar').find('button').prop('disabled', true);
            if (!loading) $('#toolbar').find('button[name=load]').prop('disabled', false);
            return;
        }
        $('#toolbar').find('button[name=load]').prop('disabled', false);
        $('#toolbar').find('button[name=save]').prop('disabled', false);
        $('#toolbar').find('button[name=link]').prop('disabled', false);
        const running = circuit.running;
        $('#toolbar').find('button[name=pause]').prop('disabled', !running);
        $('#toolbar').find('button[name=resume]').prop('disabled', running);
        $('#toolbar').find('button[name=single]').prop('disabled', running);
        $('#toolbar').find('button[name=next]').prop('disabled', running || !circuit.hasPendingEvents);
        $('#toolbar').find('button[name=fastfw]').prop('disabled', running || !circuit.hasPendingEvents);
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
        $('#monitorbox button').prop('disabled', true).off();
    }

    async function mkcircuit(data) {
        circuitData = data;
        loading = false;
        $('form').find('input, textarea, button, select').prop('disabled', false);
        circuit = new digitaljs.Circuit(data);
        circuit.on('postUpdateGates', (tick) => {
            $('#tick').val(tick);
        });
        circuit.start();
        monitor = new digitaljs.Monitor(circuit);
        if (monitormem) {
            monitor.loadWiresDesc(monitormem);
            monitormem = undefined;
        }
        monitorview = new digitaljs.MonitorView({model: monitor, el: $('#monitor') });
        paper = circuit.displayOn($('<div>').appendTo($('#paper')));
        circuit.on('userChange', () => {
            updatebuttons();
        });
        circuit.on('changeRunning', () => {
            updatebuttons();
        });
        updatebuttons();
        $('#monitorbox button').prop('disabled', false);
        $('#monitorbox button[name=ppt_up]').on('click', (e) => { monitorview.pixelsPerTick *= 2; });
        $('#monitorbox button[name=ppt_down]').on('click', (e) => { monitorview.pixelsPerTick /= 2; });
        $('#monitorbox button[name=left]').on('click', (e) => { 
            monitorview.live = false; monitorview.start -= monitorview.width / monitorview.pixelsPerTick / 4;
        });
        $('#monitorbox button[name=right]').on('click', (e) => { 
            monitorview.live = false; monitorview.start += monitorview.width / monitorview.pixelsPerTick / 4;
        });
        $('#monitorbox button[name=live]')
            .toggleClass('active', monitorview.live)
            .on('click', (e) => { 
                monitorview.live = !monitorview.live;
                if (monitorview.live) monitorview.start = circuit.tick - monitorview.width / monitorview.pixelsPerTick;
            });
        monitorview.on('change:live', (live) => { $('#monitorbox button[name=live]').toggleClass('active', live) });
        monitor.on('add', () => {
            if ($('#monitorbox').height() == 0)
                $('html > body > div').css('grid-template-rows', (idx, old) => {
                    const z = old.split(' ');
                    z[1] = '3fr';
                    z[3] = '1fr';
                    return z.join(' ');
                });
        });
        const show_range = () => {
            $('#monitorbox input[name=rangel]').val(Math.round(monitorview.start));
            $('#monitorbox input[name=rangeh]').val(Math.round(monitorview.start + monitorview.width / monitorview.pixelsPerTick));
        };
        const show_scale = () => {
            $('#monitorbox input[name=scale]').val(monitorview.gridStep);
        };
        show_range();
        show_scale();
        monitorview.on('change:start', show_range);
        monitorview.on('change:pixelsPerTick', show_scale);
        // Update information about the circuit / components and UI in case
        // testbench is run later
        // TODO: better way to wait for digitaljs load circuit into UI
        await delay(2000);
        identifyCircuitElements(data);
        // Allow users to run testbench
        $('button[name=run-tb]').prop('disabled', false);
    }

    function runquery() {
        const data = myUpdateFunction();
        console.log(data);
        const opts = { optimize: false,
            fsm: false,
            fsmexpand: false };
        // TODO: get necessary SV files for used models or include them in
        // blockly code generator
        destroycircuit();
        $.ajax({
            type: 'POST',
            url: '/api/yosys2digitaljs',
            contentType: "application/json",
            data: JSON.stringify({ files: data, options: opts }),
            dataType: 'json',
            success: (responseData, status, xhr) => {
                mkcircuit(responseData.output);
            },
            error: (request, status, error) => {
                console.log('Server error');
                loading = false;
                updatebuttons();
            }
        });
    }

    $('button[name=compile]').click(e => {
        // TODO: study better syncronism mechanism
        // Ensure there is no testbench running
        if (runningTb && runningTb.state() === 'pending') {
            runningTb.reject();
        }
        e.preventDefault();
        // Disable testbench button until circuit is properly loaded
        $('button[name=run-tb]').prop('disabled', true);
        runquery();
    });

    $('button[name=pause]').click(e => {
        circuit.stop();
    });

    $('button[name=resume]').click(e => {
        circuit.start();
    });

    $('button[name=single]').click(e => {
        circuit.updateGates();
        updatebuttons();
    });

    $('button[name=next]').click(e => {
        circuit.updateGatesNext();
        updatebuttons();
    });

    $('button[name=fastfw]').click(e => {
        circuit.startFast();
        updatebuttons();
    });

    function createInvisibleInput(callback) {
        // Create once invisible browse button with event listener, and click it
        var selectFile = document.getElementById('select_file');
        if (selectFile === null) {
            var selectFileDom = document.createElement('INPUT');
            selectFileDom.type = 'file';
            selectFileDom.id = 'select_file';

            var selectFileWrapperDom = document.createElement('DIV');
            selectFileWrapperDom.id = 'select_file_wrapper';
            selectFileWrapperDom.style.display = 'none';
            selectFileWrapperDom.appendChild(selectFileDom);

            document.body.appendChild(selectFileWrapperDom);
            selectFile = document.getElementById('select_file');
            selectFile.addEventListener('change', callback, false);
        }
        selectFile.click();
        // Remove select file to force the recreation every time load button
        // is clicked
        selectFile.parentNode.removeChild(selectFile);
    }

    $('button[name=load_block]').click(e => {
        console.log('onclick');
        // Create File Reader event listener function
        var parseInputXMLfile = function(e) {
            console.log('parseInputXMLfile');
            var xmlFile = e.target.files[0];
            var filename = xmlFile.name;
            var extensionPosition = filename.lastIndexOf('.');
            // if (extensionPosition !== -1) {
            //     filename = filename.substr(0, extensionPosition);
            // }

            var reader = new FileReader();
            reader.onload = function() {
                console.log('reader onload');
                try {
                    ///////////////////////////////////////////////////////////
                    // TODO check next Blockly version cf issue 
                    // https://github.com/google/blockly/issues/2926
                    // Temporary disable dropdown validation as we use dynamic one
                    // see https://github.com/lcbcFoo/circuitly/issues/3
                    const fieldDropdownDoClassValidation_ = 
                        Blockly.FieldDropdown.prototype.doClassValidation_;
                    Blockly.FieldDropdown.prototype.doClassValidation_ = 
                        function (newValue) {
                            console.log(newValue);
                            return newValue;
                        }

                    var dom = Blockly.Xml.textToDom(reader.result);
                    Blockly.Xml.domToWorkspace(dom, Blockly.getMainWorkspace());

                    Blockly.FieldDropdown.prototype.doClassValidation_ =
                        fieldDropdownDoClassValidation_;
                }
                catch (e) {
                    console.log(e);
                    window.onerror = function(msg, url, linenumber) {
                        alert('Invalid file, does not contain a workspace.');
                        return true;
                    }
                }
            };
            reader.readAsText(xmlFile);
        };
        createInvisibleInput(parseInputXMLfile);
    });

    $('button[name=load_workspace]').click(e => {
        // Create File Reader event listener function
        var parseInputXMLfile = function(e) {
            var xmlFile = e.target.files[0];
            var filename = xmlFile.name;
            var extensionPosition = filename.lastIndexOf('.');

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
                    Blockly.FieldDropdown.prototype.doClassValidation_ = 
                        function (newValue) {
                            return newValue;
                        }

                    var dom = Blockly.Xml.textToDom(reader.result);
                    Blockly.Xml.clearWorkspaceAndLoadFromXml(dom,
                        Blockly.getMainWorkspace());
                    
                    Blockly.FieldDropdown.prototype.doClassValidation_ =
                        fieldDropdownDoClassValidation_;
                    ///////////////////////////////////////////////////////////
                }
                catch (e) {
                    console.log(e);
                    window.onerror = function(msg, url, linenumber) {
                        alert('Invalid file, does not contain a workspace.');
                        return true;
                    }
                }
            };
            reader.readAsText(xmlFile);
        };
        createInvisibleInput(parseInputXMLfile);
    });

    $('button[name=save]').click(e => {
        var xmlDom = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
        var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
        const blob = new Blob([xmlText], {type: "application/xml;charset=utf-8"});
        FileSaver.saveAs(blob, 'circuitly_workspace.xml');
    });

    // Receive object data returned from yosys2digitaljs
    // Populates following global variables with relevant data:
    // - inputDevices: list of {'label', 'element', 'typeofelement'}
    // - outputDevices: list of {'label', 'element', 'typeofelement'}
    function identifyCircuitElements(data) {
        inputDevices = [];
        outputDevices = [];
        for (let [key, value] of Object.entries(data['devices'])) {
            console.log(key);
            console.log(value);
            var celltype = value['celltype'];
            var net = value['net'];
            var label = value['label'];
            var bits = value['bits'];
            var element = null;
            var typeofelement = null;
            // Find label related to this device
            var textElement = $('text').filter(function() {
                return $(this).hasClass('label') && $(this).text() === label;
            });
            var listToPush = null
            // Get label parent
            var parentElement = $(textElement[0]).parent()[0];
            // Identify the celltype
            if (celltype === '$button') {
                var child = $(parentElement)
                    .children('rect').filter(function() {
                        return $(this).hasClass('btnface');
                    })[0];
                console.log(child);
                typeofelement = 'btnface';
                element = child;
                listToPush = inputDevices;
            }
            else if (celltype === '$lamp') {
                var child = $(parentElement)
                    .children('circle').filter(function() {
                        return $(this).hasClass('led');
                    })[0];
                console.log(child);
                typeofelement = 'led';
                element = child;
                listToPush = outputDevices;
            }
            else if (celltype === '$numentry') {
                var child = $(parentElement)
                    .find('input').filter(function() {
                        return $(this).hasClass('numvalue');
                    })[0];
                console.log(child);
                typeofelement = 'numvalue';
                element = child;
                listToPush = inputDevices;
            }

            else if (celltype === '$numdisplay') {
                var child = $(parentElement)
                    .children('text').filter(function() {
                        return $(this).hasClass('numvalue');
                    })[0];
                console.log(child);
                typeofelement = 'numvalue_out';
                element = child;
                listToPush = outputDevices;
            }

            if (listToPush) {
                listToPush.push({
                    'label' : label,
                    'net' : net,
                    'bits' : bits,
                    'element' : element,
                    'typeofelement' : typeofelement
                });
            }
        }
    }

    // Set circuit input button to high (bool=true) / low (bool=false)
    function setIOButtonValue(button, bool) {
        // Set signal to high
        if (bool) {
            // If not already high
            if (! $(button).hasClass('live')) {
                $(button).trigger('click');
            }
        }
        // Set signal to low
        else {
            // If not already low
            if ($(button).hasClass('live')) {
                $(button).trigger('click');
            }
        }
    }

    function setIONumValue(numvalue, hexval) {
        var strval = hexval.toString(16);
        console.log(strval);
        $(numvalue).val(strval);
        $(numvalue).trigger('change');
    }

    // Return true if lamp is high, false otherwise
    function getIOLampValue(lamp) {
        return $(lamp).hasClass('live');
    }

    // Return integer value showing in numvalue_out element (assuming it is 
    // in hex format)
    function getIONumValueOut(numvalue_out) {
        var intval = parseInt($(numvalue_out).text(), 16);
        console.log(intval);
        return intval;
    }

    async function runTestbench(successDeferred, runningPromise) {
        console.log(inputDevices);
        console.log(outputDevices);
        const delay = ms => new Promise(res => setTimeout(res, ms));
        var val = 'a5';
        while (true) {
            if (runningPromise.state() === 'rejected') {
                successDeferred.reject();
                return;
            }
            await delay(simTimescaleMs / 2);
            setIONumValue(inputDevices[0].element, val);
            if (val === 'a5')
                val = '5a';
            else
                val = 'a5';
            await delay(simTimescaleMs / 2);
            var res = getIONumValueOut(outputDevices[0].element);
            console.log(res);
        }

        successDeferred.resolve();
    }

    $('button[name=run-tb]').click(e => {
        // TODO: study better syncronism mechanism
        if (runningTb && runningTb.state() === 'pending') {
            runningTb.reject();
        }
        // Disable run-tb button until tb run is finished or cancelled
        $('button[name=run-tb]').prop('disabled', true);
        runningTb = new $.Deferred();
        successDeferred = new $.Deferred();

        runningTb.done(function() {
            console.log('Testbench passed');
        });
        runningTb.fail(function() {
            console.log('Testbench failed');
        });
        runningTb.always(function() {
            console.log('Testbench finished');
            // Allow users to run testbench
            $('button[name=run-tb]').prop('disabled', false);
        });

        runTestbench(successDeferred, runningTb.promise());
    });

    window.onpopstate = () => {
        const hash = window.location.hash.slice(1);
        if (loading || !hash) return;
        destroycircuit();
    };

    updatebuttons();
    $('#monitorbox button').prop('disabled', true).off();

    if (window.location.hash.slice(1))
        window.onpopstate();

    //////////////////////////////////////////////////////////////////////////////////

});


