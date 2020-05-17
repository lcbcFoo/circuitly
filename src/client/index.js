"use strict";

import $ from 'jquery';
import * as digitaljs from 'digitaljs';
import './scss/app.scss';

//import { saveAs } from 'file-saver';

$(window).on('load', () => {
    //////////////////////////////////////////////////////////////////////////////////
    // Move to circuitly in future

    // TODO: remove this block
    // Debug - Code generated
    // document.querySelector('#run').addEventListener('click', runCode);
    function myUpdateFunction(event) {
        var workspace = Blockly.getMainWorkspace();
        var code = Blockly.Python.workspaceToCode(workspace);
        document.getElementById('text-code').value = code;
        return code;
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

    function mkcircuit(data) {
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
    }

    function runquery() {
        var systemVerilogCode = myUpdateFunction();
        const data = {'_input.sv': systemVerilogCode};
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
        e.preventDefault();
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

    $('button[name=load]').click(e => {
        $('#input_load').trigger('click');
    });

    $('#input_load').change(e => {
        const files = e.target.files;
        if (!files) return;
        const reader = new FileReader();
        destroycircuit();
        reader.onload = (e) => {
            mkcircuit(JSON.parse(e.target.result));
        };
        reader.readAsText(files[0]);
    });

    $('button[name=save]').click(e => {
        const json = circuit.toJSON();
        const blob = new Blob([JSON.stringify(json)], {type: "application/json;charset=utf-8"});
        saveAs(blob, 'circuit.json');
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


