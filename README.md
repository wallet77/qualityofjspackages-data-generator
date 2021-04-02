# Quality of JS packages - report generator

## Purpose

This project is a simple script that will generate a readable report for the website [Quality of JS packages](https://github.com/wallet77/qualityofjspackages-website).
The input must be a report file generated by the [Quality of JS packages crawler](https://github.com/wallet77/qualityofjspackages-crawler).  
One of the purpose is to reduce the size of the report so that the website loads faster.

The algorithm can be sum up like this:

1. load the report generated by the crawler

2. for each package
    - 1. Get qualscan results and for each metrics calculate min/max/mean
    - 2. Save general metrics (npms, consumtion, etc)

3. For each metrics calculate percentiles

4. Save the report in a file

## Project setup
```
npm install
```

### Generate JSON file from a full report
```
INPUT=./report/report.json OUTPUT=./report/data.json node index.js
```

### Debug with pino-pretty
```
INPUT=./report/report.json OUTPUT=./report/data.json node index.js | pino-pretty -c -t
```

### Lints and fixes files
```
npm run linter
```
