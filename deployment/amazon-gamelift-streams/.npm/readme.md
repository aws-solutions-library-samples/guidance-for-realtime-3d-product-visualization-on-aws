The files in this folder are responsible for defining dependencies in the NPM ecosystem. 

A few notes:
* package.json is generated from these files
* package.json is broken apart into separate files, one for each application component (instead of creating separate folders in `./packages` with unique package.json files)
* instead of JSON, use TypeScript