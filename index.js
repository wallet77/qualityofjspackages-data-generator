const cors = require('fastify-cors')
const fastify = require('fastify')()
fastify.register(cors)
const PORT = process.env.PORT || 3000
const logger = require('pino')()
const percentile = require('percentile')
const fs = require('fs')

const minMaxMean = (arr) => {
    let max = arr[0]
    let min = arr[0]
    let sum = arr[0]
    for (let i = 1; i < arr.length; i++) {
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

fastify.get('/report', async (request, reply) => {
    const rawdata = await fs.promises.readFile('./report/report.json')
    const data = JSON.parse(rawdata)

    const metrics = {
        general: {
            npmsFinal: [],
            npmsQuality: [],
            npmsMaintenance: [],
            npmsPopularity: [],
            qualscan: []
        }
    }
    const qualscanMetrics = {}

    const packages = data.packages
    let duration = 0

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

            duration += currentPackage.qualscan.time
            metrics.general.qualscan.push(currentPackage.qualscan.data.score)
            metrics.general.npmsFinal.push(currentPackage.npms.final)
            metrics.general.npmsQuality.push(currentPackage.npms.detail.quality)
            metrics.general.npmsMaintenance.push(currentPackage.npms.detail.maintenance)
            metrics.general.npmsPopularity.push(currentPackage.npms.detail.popularity)
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

    reply.send({
        data: {
            time: data.time,
            duration,
            metrics
        }
    })
})

fastify.listen(PORT, (err, address) => {
    if (err) throw err
    logger.info(`Server listening on ${address}`)
})
