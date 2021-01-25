const cors = require('fastify-cors')
const fastify = require('fastify')()
fastify.register(cors)
const PORT = process.env.PORT || 3000
const logger = require('pino')()

fastify.register(require('fastify-mongodb'), {
    // force to close the mongodb connection when app stopped
    // the default value is false
    forceClose: true,
    url: 'mongodb://localhost:27017'
})

const avg = (array) => array.reduce((a, b) => a + b) / array.length

fastify.get('/report', (request, reply) => {
    const db = fastify.mongo.client.db('npm-packages-quality-analysis')

    db.collection('reports').find({}).sort({ _id: -1 }).toArray((err, result) => {
        if (err) return reply.send({ data: null })

        const quality = []
        const npmsFinal = []
        const npmsQuality = []

        for (const packageName in result[0]) {
            if (packageName === '_id') continue
            const currentPackage = result[0][packageName]
            try {
                currentPackage.qualscan = JSON.parse(currentPackage.qualscan)
                // delete result[0][packageName].qualscan.data.cmds

                // for (let i = 0; i < result[0][packageName].qualscan.data.cmds.length; i++) {
                //     const currentCmd = result[0][packageName].qualscan.data.cmds[i]
                //     delete currentCmd.data
                // }
                // console.log(result[0][packageName])
                quality.push(currentPackage.qualscan.data.score)
                npmsFinal.push(currentPackage.npms.final)
                npmsQuality.push(currentPackage.npms.quality)
            } catch (err) {
                delete result[0][packageName].qualscan
            }
        }

        reply.send({
            data: {
                quality: avg(quality),
                npms: {
                    final: avg(npmsFinal),
                    quality: avg(npmsQuality)
                }
            }
        })
    })
})

fastify.listen(PORT, (err, address) => {
    if (err) throw err
    logger.info(`Server listening on ${address}`)
})
