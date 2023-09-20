#!/usr/bin/env node

import fs from 'node:fs';
import { Readable } from 'node:stream';
import { Parse } from 'unzipper';
import opta from 'opta';

const templateName = 'template-for-jsar-widget';
const branch = 'main';

async function init() {
  const opts = opta({
    options: {
      'name': {
        type: 'string',
      },
    }
  });
  const yargsInstance = opts.cli();
  yargsInstance(process.argv.slice(2));

  const promptor = opts.prompt();
  await promptor();

  const values = opts.values();
  if (!values.name) {
    throw new Error('Project name is required');
  }

  return fetch(`https://github.com/M-CreativeLab/${templateName}/archive/refs/heads/${branch}.zip`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch template repository');
      }
      return response
    })
    .then(response => {
      const readable = Readable.fromWeb(response.body);
      readable.pipe(Parse())
        .on('entry', entry => {
          const filename = entry.path.replace(`${templateName}-${branch}/`, '');
          const type = entry.type; // 'Directory' or 'File'
          if (filename === '') {
            entry.autodrain();
            return;
          }
          if (type === 'File') {
            if (filename === 'package.json') {
              entry.buffer().then(buffer => {
                const packageJson = JSON.parse(buffer.toString());
                packageJson.name = values.name;
                entry.autodrain();
                fs.writeFileSync(filename, JSON.stringify(packageJson, null, 2));
              });
            } else {
              entry.pipe(fs.createWriteStream(filename));
              console.info(`Created ${filename} from template repository.`);
            }
          } else if (type === 'Directory') {
            fs.mkdirSync(filename, { recursive: true });
            entry.autodrain();
          }
        });
    })
    .catch(error => {
      throw new Error(`Failed to initialize your project: ${error}`);
    });
}

init();
