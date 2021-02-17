# State Of Js Packages - report generator

## Project setup
```
npm install
```

### Generate JSON file from a full report
```
INPUT=./report/report.json OUPUT=./report/data.json node index.js
```

### Debug with pino-pretty
```
INPUT=./report/report.json OUPUT=./report/data.json node index.js | pino-pretty -c -t
```

### Lints and fixes files
```
npm run linter
```
