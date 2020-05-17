const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const yosys2digitaljs = require('yosys2digitaljs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

Promise.resolve((async () => {
    app.use(bodyParser.json({limit: '50mb'}));

    app.post('/api/yosys2digitaljs', async (req, res) => {
        console.log("SERVER");
        try {
            console.log("SERVER");
            console.log(req.body.files)
            const data = await yosys2digitaljs.process_files(req.body.files, req.body.options);
            console.log('---')
            console.log(data)
            yosys2digitaljs.io_ui(data.output);
            return res.json(data);
        } catch(ret) {
            console.log(ret);
            return res.status(500).json({
                error: ret.message,
                yosys_stdout: ret.yosys_stdout,
                yosys_stderr: ret.yosys_stderr
            });
        }
    });

    app.listen(8080, 'localhost');
})());

