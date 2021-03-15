const logger = require('pino')()
const percentile = require('percentile')
const fs = require('fs')

const minMaxMean = (arr) => {
    let max = arr[0]
    let min = typeof arr[0] !== 'number' ? 0 : arr[0]
    let sum = typeof arr[0] !== 'number' ? 0 : arr[0]
    for (let i = 1; i < arr.length; i++) {
        if (typeof arr[i] !== 'number') continue
        if (arr[i] > max) {
            max = arr[i]
        }
        if (arr[i] < min) {
            min = arr[i]
        }
        sum = sum + arr[i]
    }
    return { max, min, avg: sum / arr.length, total: arr.length }
}

const generateJSON = async (request, reply) => {
    const rawdata = await fs.promises.readFile(process.env.INPUT)
    const data = JSON.parse(rawdata)

    const metrics = {
        general: {
            npmsFinal: [],
            npmsQuality: [],
            npmsMaintenance: [],
            npmsPopularity: [],
            qualscan: []
        },
        consumption: {
            npm: [],
            host: []
        }
    }
    const qualscanMetrics = {}

    const packages = data.packages

    for (const packageName in packages) {
        if (packageName === '_id') continue
        const currentPackage = packages[packageName]
        try {
            currentPackage.qualscan = JSON.parse(currentPackage.qualscan)

            for (let i = 0; i < packages[packageName].qualscan.data.cmds.length; i++) {
                const currentCmd = packages[packageName].qualscan.data.cmds[i]
                if (!currentCmd.budget) continue
                for (const metric in currentCmd.budget.fail) {
                    if (!metrics[currentCmd.title]) metrics[currentCmd.title] = {}
                    if (!metrics[currentCmd.title][metric]) metrics[currentCmd.title][metric] = []
                    metrics[currentCmd.title][metric].push(currentCmd.budget.fail[metric].value)
                }

                if (!qualscanMetrics[currentCmd.title]) qualscanMetrics[currentCmd.title] = {}
                if (!qualscanMetrics[currentCmd.title][currentCmd.level]) qualscanMetrics[currentCmd.title][currentCmd.level] = 0
                qualscanMetrics[currentCmd.title][currentCmd.level]++
            }

            metrics.general.qualscan.push(currentPackage.qualscan.data.score)
            metrics.general.npmsFinal.push(currentPackage.npms.score.final)
            metrics.general.npmsQuality.push(currentPackage.npms.score.detail.quality)
            metrics.general.npmsMaintenance.push(currentPackage.npms.score.detail.maintenance)
            metrics.general.npmsPopularity.push(currentPackage.npms.score.detail.popularity)

            if (currentPackage.consumption) {
                metrics.consumption.npm.push(currentPackage.consumption.npm)
                metrics.consumption.host.push(currentPackage.consumption.host)
            }
        } catch (err) {
            delete packages[packageName].qualscan
        }
    }

    for (const cmdName in metrics) {
        const currentCmd = metrics[cmdName]
        for (const metric in currentCmd) {
            const result = percentile(
                [25, 50, 75, 90, 95, 99],
                currentCmd[metric]
            )
            const minMaxAvg = minMaxMean(currentCmd[metric])
            currentCmd[metric] = {
                ...minMaxAvg,
                percentiles: {
                    25: result[0],
                    50: result[1],
                    75: result[2],
                    90: result[3],
                    95: result[4],
                    99: result[5]
                }
            }
        }
    }

    metrics.qualscanMetrics = qualscanMetrics

    const payload = {
        time: data.time,
        duration: data.duration,
        metrics,
        machine: data.machine
    }

    try {
        await fs.promises.writeFile(process.env.OUTPUT, JSON.stringify(payload), 'utf8')
        logger.info('Data generated!')
    } catch (err) {
        logger.error(err)
    }
}

generateJSON()
