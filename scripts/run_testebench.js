const puppeteer = require('puppeteer');
const fs = require('fs');
const page_url = "http://localhost:3000/public/index.html";

const argv = require('yargs')
    .usage('Usage: $0 [options] -w <workspace>.xml -i <testbench_input>.csv'
        + ' -o <output_file>')
    .option('verbose', {
        alias: 'V',
        description: 'Print steps in console'
    })
    .option('debug', {
        alias: 'd',
        description: 'Run in debug mode - redirects circuitly console'
    })
    .option('workspace', {
        alias: 'w',
        description: 'Path to XML file containing circuitly module'
    })
    .option('input', {
        alias: 'i',
        description: 'Path to testbench input CSV file'
    })
    .option('output', {
        alias: 'o',
        description: 'Path of output file'
    })
    .example('node $0 dff.xml dff_tb.csv dff_result.res', 'Run testbench for' +
        ' module in dff.xml using dff_tb.csv as testbench input and writes' + 
        ' result to dff_result.res')
    .demandOption(['workspace', 'input', 'output'])
    .argv;

(async () => {

    // Get input XML blockly workspace and testbench CSV table
    const file_workspace = argv.workspace;
    const input_csv = argv.input;
    const output_csv = argv.output;
    const verbose = argv.verbose;
    const debug = argv.debug;
    let xmlData;

    // Read workspace XML
    fs.readFile(file_workspace, "utf8", (err, data) => {
        if (err) {
            console.error('could not open input file: ' + file_workspace);
        }
        xmlData = data.toString();
    });

    // Open puppeteer headless browser and go to our homepage
    if (verbose) {
        process.stdout.write('>> Starting headless browser in background\n');
    }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(page_url);
    // Redirect console to node

    if (debug) {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    }

    ///////////////////////////////////////////////////////////
    // TODO check next Blockly version cf issue
    // https://github.com/google/blockly/issues/2926
    // Temporary disable dropdown validation as we use dynamic
    // one.
    // see https://github.com/lcbcFoo/circuitly/issues/3
    function loadWorkspace(xml) {
        const fieldDropdownDoClassValidation_ =
            Blockly.FieldDropdown.prototype.doClassValidation_;
        Blockly.FieldDropdown.prototype.doClassValidation_ = function(
            newValue
        ) {
            return newValue;
        };

        var dom = Blockly.Xml.textToDom(xml);
        Blockly.Xml.clearWorkspaceAndLoadFromXml(
            dom,
            Blockly.getMainWorkspace()
        );
        Blockly.FieldDropdown.prototype.doClassValidation_ = fieldDropdownDoClassValidation_;
    }
    ///////////////////////////////////////////////////////////
    if (verbose) {
        process.stdout.write('>> Waiting page to load\n');
    }
    delay = (ms) => new Promise(res => setTimeout(res, ms));

    // Wait blockly load
    // TODO: better sync mechanism 
    await delay(1500);

    // Load Blockly workspace
    if (verbose) {
        process.stdout.write('>> Loading workspace\n');
    }
    await page.evaluate(loadWorkspace, xmlData);

    // Load testbench CSV input
    if (verbose) {
        process.stdout.write('>> Loading testbench input CSV\n');
    }
    await page.click('.tb-file-input');
    const input = await page.$('input[type="file"]');
    await input.uploadFile(input_csv);
    await input.evaluate(upload => upload.dispatchEvent(new Event('change', { bubbles: true })));
    if (verbose) {
        process.stdout.write('>> Compiling circuitly workspace\n');
    }
    await page.click('button[name=compile]');

    // Expose a testbench finish callaback to the page
    let finished = false;
    let result = false;
    await page.exposeFunction('testbenchFinishedCallback', (r) => {
        finished = true;
        result = r;
    });

    // Add listener for testbench finish event
    await page.evaluate(() => {
        $(window).on('testbenchFinished', (e, r) => {
            testbenchFinishedCallback(r);
        });
    });

    // TODO: better sync mechanism 
    await delay(2000);
    // Run testbench
    if (verbose) {
        process.stdout.write('>> Running testbench\n');
    }
    await page.click('button[name=run-tb]');
    // Wait testbench to finish
    while (!finished) {
        if (verbose) {
            process.stdout.write('.');
        }
        await delay(200);
    }
    if (verbose) {
        process.stdout.write('\n');
    }

    // TODO: return
    let text = result ? 'passed\n' : 'failed\n';
    if (verbose) {
        process.stdout.write('>> Testbench ' + text);
    }
    fs.writeFile(output_csv, text, {flag: 'w'}, (err) => {
        if (err) {
            console.error('failed to write output file');
        }
    });
    await browser.close();
})();
