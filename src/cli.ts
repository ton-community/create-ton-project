#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { execSync, ExecSyncOptionsWithBufferEncoding } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';

const FILES_WITH_NAME_TEMPLATE = ['package.json', 'README.md'];
const NAME_TEMPLATE = '{{name}}';

async function main() {
    console.log();

    const name: string =
        process.argv.length > 2
            ? process.argv[2]
            : (
                  await inquirer.prompt({
                      name: 'name',
                      message: 'Project name',
                  })
              ).name.trim();

    if (name.length === 0) throw new Error('Cannot initialize a project with an empty name');

    const contractName: string = (
        await inquirer.prompt({
            name: 'contractName',
            message: 'First created contract name (PascalCase)',
        })
    ).contractName.trim();

    if (contractName.length === 0) throw new Error(`Cannot create a contract with an empty name`);

    if (contractName.toLowerCase() === 'contract' || !/^[A-Z][a-zA-Z0-9]*$/.test(contractName))
        throw new Error(`Cannot create a contract with the name '${contractName}'`);

    const { variant }: { variant: string } = await inquirer.prompt([
        {
            name: 'variant',
            message: 'Choose the project template',
            type: 'list',
            choices: [
                {
                    name: 'An empty contract (FunC)',
                    value: 'func-empty',
                },
                {
                    name: 'A simple counter contract (FunC)',
                    value: 'func-counter',
                },
                {
                    name: 'An empty contract (TACT)',
                    value: 'tact-empty',
                },
                {
                    name: 'A simple counter contract (TACT)',
                    value: 'tact-counter',
                },
            ],
        },
    ]);

    await fs.mkdir(name);

    const steps = 3;

    console.log(`\n[1/${steps}] Copying files...`);

    const basePath = path.join(__dirname, 'template');
    for (const file of await fs.readdir(basePath)) {
        if (FILES_WITH_NAME_TEMPLATE.includes(file)) continue;
        await fs.copy(path.join(basePath, file), path.join(name, file));
    }

    await fs.writeFile(
        path.join(name, '.gitignore'),
        `node_modules
temp
build
dist
`
    );

    for (const file of FILES_WITH_NAME_TEMPLATE) {
        await fs.writeFile(
            path.join(name, file),
            (await fs.readFile(path.join(basePath, file))).toString().replace(NAME_TEMPLATE, name)
        );
    }

    console.log(`[2/${steps}] Installing dependencies...\n`);

    const execOpts: ExecSyncOptionsWithBufferEncoding = {
        stdio: 'inherit',
        cwd: name,
    };

    const pkgManager = (process.env.npm_config_user_agent ?? 'npm/').split(' ')[0].split('/')[0];

    switch (pkgManager) {
        case 'yarn':
            execSync('yarn', execOpts);
            break;
        case 'pnpm':
            execSync('pnpm install', execOpts);
            break;
        default:
            execSync('npm install', execOpts);
            break;
    }

    console.log(`\n[3/${steps}] Creating your first contract...`);

    let execCommand = 'npm';
    switch (pkgManager) {
        case 'yarn':
            execCommand = 'yarn';
            break;
        case 'pnpm':
            execCommand = 'pnpm';
            break;
    }
    execSync(
        `${execCommand} exec blueprint${pkgManager === 'pnpm' ? '' : ' --'} create ${contractName} --type ${variant}`,
        execOpts
    );

    try {
        execSync('git init', execOpts);
    } catch (e) {
        console.error('Failed to initialize git repository:', (e as any).toString());
    }

    console.log(`Success!`);
    console.log(
        chalk.blueBright(`
     ____  _    _   _ _____ ____  ____  ___ _   _ _____ 
    | __ )| |  | | | | ____|  _ \\|  _ \\|_ _| \\ | |_   _|
    |  _ \\| |  | | | |  _| | |_) | |_) || ||  \\| | | |  
    | |_) | |__| |_| | |___|  __/|  _ < | || |\\  | | |  
    |____/|_____\\___/|_____|_|   |_| \\_\\___|_| \\_| |_|  `)
    );
    console.log(chalk.blue(`                     TON development for professionals`));
    console.log(``);
    console.log(`Your new project is ready, available commands:`);
    console.log(``);
    console.log(chalk.greenBright(` >  `) + chalk.cyanBright(`cd ${name}`));
    console.log(` change directory to your new project`);
    console.log(``);
    console.log(chalk.greenBright(` >  `) + chalk.cyanBright(`npx blueprint build`));
    console.log(` choose a smart contract and build it`);
    console.log(``);
    console.log(chalk.greenBright(` >  `) + chalk.cyanBright(`npx blueprint test`));
    console.log(` run the default project test suite`);
    console.log(``);
    console.log(chalk.greenBright(` >  `) + chalk.cyanBright(`npx blueprint run`));
    console.log(` choose a script and run it (eg. a deploy script)`);
    console.log(``);
    console.log(chalk.greenBright(` >  `) + chalk.cyanBright(`npx blueprint create AnotherContract`));
    console.log(` create all the necessary files for another new contract`);
    console.log(``);
    console.log(`For help and docs visit https://github.com/ton-community/blueprint`);
    console.log(``);
}

main().catch(console.error);
