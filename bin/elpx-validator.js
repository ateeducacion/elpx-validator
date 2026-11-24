#!/usr/bin/env node
'use strict';

// Process entry point: wires the real streams, environment and exit status to main().
require('../js/cli')
    .main(process.argv.slice(2), {
        stdout: function (text) { process.stdout.write(text); },
        stderr: function (text) { process.stderr.write(text); },
        env: process.env,
        color: process.stdout.isTTY === true && !process.env.NO_COLOR
    })
    .then(function (code) { process.exitCode = code; });
