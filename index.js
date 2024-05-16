#!/usr/bin/env node


const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2))

function dbMain() {
    const apis = [];

    const app = express();

    app.use(bodyParser.json())

    app.use(bodyParser.urlencoded({ extended: true }))

    app.all('*', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader("Content-Type", "application/json;charset=utf-8");
        next();
    })

    const envs = {
        port: args.port || 3000,
    }

    const config = {
        host: args.host?.toString() || '127.0.0.1',
        port: args.dport || 3306,
        user: args.user?.toString() || 'root',
        password: args.password?.toString() || '123456',
        database: args.database?.toString() || 'db'
    }

    if (typeof envs.port !== "number") {
        console.error('Error: Port must be a number');
        process.exit(1);
    }

    if (envs.port <= 1024 || envs.port >= 65535) {
        console.error('Error: Port must be between 1024 and 65535');
        process.exit(1);
    }

    const connection = mysql.createConnection(config);

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to database:', err.sqlMessage);
            process.exit(1);
        }
    });

    connection.query('show tables', (err, result) => {
        if (err) {
            console.error('Error querying database:', err.sqlMessage);
            process.exit(1);
        }

        result.map(e => Object.values(e)[0]).forEach(table => {
            apis.push(`${table}  http://127.0.0.1:${envs.port}/${table}`);
            app.get(`/${table}`, (req, res) => {
                const page = req.query.page || 1;
                const limit = req.query.limit || 10;
                const query = Object.fromEntries(Object.entries(req.query).filter(([key]) => key !== 'limit' && key !== 'page'));
                connection.query(`SELECT * FROM ${table} WHERE ` + (Object.entries(query).map(([key, value]) => `\`${key}\` = '${value}'`).join(' and ') || 1) + ` LIMIT ${(page - 1) * limit}, ${limit}`, (err, result) => {
                    if (err) {
                        res.send({
                            code: 403,
                            msg: err.sqlMessage,
                            data: null
                        });
                        return;
                    }
                    res.send({
                        code: 200,
                        msg: 'success',
                        data: result
                    });
                });
            });

            app.get(`/${table}/delete`, (req, res) => {
                connection.query(`DELETE FROM ${table} WHERE ` + (Object.entries(req.query).map(([key, value]) => `\`${key}\` = '${value}'`).join(' and ') || 1), (err, result) => {
                    if (err) {
                        res.send({
                            code: 403,
                            msg: err.sqlMessage,
                            data: null
                        });
                        return;
                    }
                    res.send({
                        code: 200,
                        msg: 'success',
                        data: true
                    });
                });
            });

            app.post(`/${table}/create`, (req, res) => {
                connection.query(`INSERT INTO ${table} (${Object.keys(req.body).map(e => `\`${e}\``).join(', ')}) VALUES (${Object.values(req.body).map(e => `'${e}'`).join(', ')})`, (err, result) => {
                    if (err) {
                        res.send({
                            code: 403,
                            msg: err.sqlMessage,
                            data: null
                        });
                        return;
                    }
                    res.send({
                        code: 200,
                        msg: 'success',
                        data: true
                    });
                });
            });

            app.post(`/${table}/update`, (req, res) => {
                connection.query(`UPDATE ${table} SET ` + Object.entries(req.body).map(([key, value]) => `\`${key}\` = '${value}'`).join(', ') + ` WHERE ` + (Object.entries(req.query).map(([key, value]) => `\`${key}\` = '${value}'`).join(' and ') || 1), (err, result) => {
                    if (err) {
                        res.send({
                            code: 403,
                            msg: err.sqlMessage,
                            data: null
                        });
                        return;
                    }
                    res.send({
                        code: 200,
                        msg: 'success',
                        data: true
                    });
                });
            });

            app.get(`/${table}/count`, (req, res) => {
                connection.query(`SELECT COUNT(*) FROM ${table} WHERE ` + (Object.entries(req.query).map(([key, value]) => `\`${key}\` = '${value}'`).join(' and ') || 1), (err, result) => {
                    if (err) {
                        res.send({
                            code: 403,
                            msg: err.sqlMessage,
                            data: null
                        });
                        return;
                    }
                    res.send({
                        code: 200,
                        msg: 'success',
                        data: result[0]['COUNT(*)']
                    });
                });
            });
        });

        app.listen(envs.port, () => {
            console.log(`
Server is running on port ${envs.port}

♡⸜(˶˃ ᵕ ˂˶)⸝♡

Available APIs:

${apis.join('\n')}
        `);
        });
    });
}

function main() {
    const apis = []

    const envs = {
        filePath: args.file?.toString() || 'db.json',
        port: args.port || 3000
    }

    if (typeof args._[0] === "string") {
        envs.filePath = args._[0];
    }

    if (envs.filePath.split('.')[1] !== 'json') {
        console.error('Error: File must be a JSON file');
        process.exit(1);
    }

    if (typeof envs.port !== "number") {
        console.error('Error: Port must be a number');
        process.exit(1);
    }

    if (envs.port <= 1024 || envs.port >= 65535) {
        console.error('Error: Port must be between 1024 and 65535');
        process.exit(1);
    }

    const app = express();

    app.use(bodyParser.json())

    app.use(bodyParser.urlencoded({ extended: true }))

    app.all('*', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader("Content-Type", "application/json;charset=utf-8");
        next();
    })

    try {
        var file = fs.readFileSync(envs.filePath, {
            encoding: 'utf-8'
        });
    } catch (e) {
        console.error('File not found');
        process.exit(1);
    }

    try {
        var entries = Object.entries(JSON.parse(file.toString()));
    } catch (e) {
        console.error('File is not a valid JSON file');
        process.exit(1);
    }

    entries.forEach(([key, value]) => {
        apis.push(`${key}  http://127.0.0.1:${envs.port}/${key}`);
        app.get(`/${key}`, (req, res) => {
            res.send(value);
        });
    });

    app.listen(envs.port, () => {
        console.log(`
Server is running on port ${envs.port}

♡⸜(˶˃ ᵕ ˂˶)⸝♡

Available APIs:

${apis.join('\n')}
        `);
    });
}

if (args.help) {
    console.log(`
Title: A toolkit that automatically generates APIs based on JSON or DATABASE.
Version: 1.2.3.
Params: [
    --help: Displays this help message.
    --version: Displays the version of the toolkit.
    --mode: The mode to run the toolkit in. ['json', 'database'] default = json.
    --file: The path to the JSON file. default = db.json.
    --port: The port to run the server on. default = 3000.
    --host: The host to connect to the database. default = 127.0.0.1.
    --dport: The dport to connect to the database. default = 3306.
    --user: The user to connect to the database. default = root.
    --password: The password to connect to the database. default = 123456.
    --database: The database to connect to the database. default = db.
]
    `);
    process.exit(1);
}

if (args.version) {
    console.log(`v1.2.3`);
    process.exit(1);
}

if (args.mode === 'database') {
    dbMain();
} else {
    main();
}
