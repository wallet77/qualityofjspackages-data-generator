const cors = require('fastify-cors')
const fastify = require('fastify')()
fastify.register(cors)
const PORT = process.env.PORT || 3000
const logger = require('pino')()
const percentile = require("percentile")

fastify.register(require('fastify-mongodb'), {
    // force to close the mongodb connection when app stopped
    // the default value is false
    forceClose: true,
    url: 'mongodb://localhost:27017'
})

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
    return {max, min, avg: sum/arr.length, total: arr.length}
}

fastify.get('/report', (request, reply) => {
    const db = fastify.mongo.client.db('npm-packages-quality-analysis')

    db.collection('reports').find({}).sort({ _id: -1 }).toArray((err, result) => {
        if (err) return reply.send({ data: null })

        const metrics = {
            general: {
                npmsFinal: [],
                npmsQuality: [],
                npmsMaintenance: [],
                npmsPopularity: [],
                qualscan: []
            }
        }
        const packages = result[0].packages
        let duration = 0

        for (const packageName in packages) {
            if (packageName === '_id') continue
            const currentPackage = packages[packageName]
            try {
                currentPackage.qualscan = JSON.parse(currentPackage.qualscan)

                for (let i = 0; i < packages[packageName].qualscan.data.cmds.length; i++) {
                    const currentCmd = packages[packageName].qualscan.data.cmds[i]
                    if(!currentCmd.budget) continue
                    for(const metric in currentCmd.budget.fail) {
                        if(!metrics[currentCmd.title]) metrics[currentCmd.title] = {}
                        if(!metrics[currentCmd.title][metric]) metrics[currentCmd.title][metric] = []
                        metrics[currentCmd.title][metric].push(currentCmd.budget.fail[metric].value)
                        metrics[currentCmd.title][metric].push(currentCmd.budget.fail[metric].value)
                        
                    }
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

        for(const cmdName in metrics) {
            const currentCmd = metrics[cmdName]
            for(const metric in currentCmd) {
                const result = percentile(
                    [90, 95, 99],
                    currentCmd[metric]
                )
                const minMaxAvg = minMaxMean(currentCmd[metric])
                currentCmd[metric] = {
                    ...minMaxAvg,
                    percentiles: {
                        90: result[0],
                        95: result[1],
                        99: result[2]
                    }
                }
            }
        }

        reply.send({
            data: {
                time: result[0].time,
                duration,
                metrics
            }
        })
    })
})

fastify.listen(PORT, (err, address) => {
    if (err) throw err
    logger.info(`Server listening on ${address}`)
})
