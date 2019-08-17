const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const inquirer = require('inquirer');

inquirer
  .prompt([
    {
      type: 'string',
      name: 'fileNamePath',
      message: 'full path to js file',
      validate: function(input) {
        const done = this.async();
        if (input) done(null, true);
        else done('you need to specify full path to file!');
      }
    }
  ])
  .then(firstAnswers => {
    fs.readFile(firstAnswers.fileNamePath, (err, fileData) => {
      if (err) throw err;
      const fileDataStr = fileData.toString();
      let fileName = path.basename(firstAnswers.fileNamePath, '.js');
      const dirName = path.basename(path.dirname(firstAnswers.fileNamePath));
      let dirPath = path.dirname(firstAnswers.fileNamePath);
      if (fileName != 'index') dirPath += `/${fileName}`;
      else fileName = dirName;
      let parsenedFunctions;
      try {
        parsenedFunctions = babylon.parse(fileDataStr, {
          sourceType: 'module',
          plugins: [
            'objectRestSpread',
            /* 'estree',
            'jsx',
            'flow',
            'doExpressions',
            'decorators',
            'classProperties',
            'exportExtensions',
            'asyncGenerators',
            'functionBind',
            'functionSent',
            'dynamicImport',
            'templateInvalidEscapes', */
          ]
        });
      }
      catch (e) {
        console.error('js fils parsed error:', e);
      }
      if ( ! parsenedFunctions) {
        console.error('js fils parsed error!');
        return;
      }
      let generatedFuncListStr = generatedTestsListStr = '';
      parsenedFunctions.program.body.forEach(func => {
        if (func.type == 'ExportNamedDeclaration') {
          const nameFunc = func.declaration.declarations[0].id.name;
          generatedFuncListStr += `      ${nameFunc},\n`;
          generatedTestsListStr += generateTest(nameFunc);
        }
      });
      const generatedTestStr = generatedTestTemplate(fileName, generatedFuncListStr, generatedTestsListStr);
      console.log(generatedTestStr);
      const testDirPath = `${dirPath}/__test__/`;
      const newGeneratedTestFilePath = `${testDirPath}index.test.js`;
      inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'saveTestInFile',
            message: `save test in file? (${newGeneratedTestFilePath})`,
          }
        ])
        .then(secondAnswers => {
          if (secondAnswers.saveTestInFile) {
            if ( ! fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
            if ( ! fs.existsSync(testDirPath)) fs.mkdirSync(testDirPath);
            fs.writeFile(newGeneratedTestFilePath, generatedTestStr, (err) => {
              if (err) throw err;
              console.log('The generated test was saved!');
              inquirer
                .prompt([
                  {
                    type: 'confirm',
                    name: 'moveJsTestedFile',
                    message: `move js tested file (${firstAnswers.fileNamePath} to ${dirPath}/index.js) ?`,
                  }
                ])
                .then(thirdAnswers => {
                  if (thirdAnswers.moveJsTestedFile) {
                    fs.renameSync(firstAnswers.fileNamePath, `${dirPath}/index.js`);
                    console.log('The js tested file moved!');
                  }
                });
            });
          }
        });
    });
  });

const generatedTestTemplate = (fileName, funcList, tests) => {
  return `
    import state from '../../__test__/state';
    import {
    ${funcList}
    } from '../index';

    describe('Application/Selectors/${fileName}', () => {
      ${tests}
    });
  `
};

const generateTest = nameFunc => {
  const nameFuncHumanFormat = camelCase(nameFunc);
  const templateTest = `
      it('${nameFuncHumanFormat}', () => {
        const received = ${nameFunc}(state);
        const expected = undefined;

        expect(received).toEqual(expected);
      });
  `;
  return templateTest;
};

const camelCase = str => {
  return str.replace(/([A-Z])/g, function(_m, l) {
    return ` ${l.toLowerCase()}`;
  });
}
