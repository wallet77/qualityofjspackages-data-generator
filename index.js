const fastify = require('fastify')()
const logger = require('pino')()

fastify.register(require('fastify-mongodb'), {
    // force to close the mongodb connection when app stopped
    // the default value is false
    forceClose: true,
    url: 'mongodb://localhost:27017'
})

fastify.get('/report', (request, reply) => {
    const db = fastify.mongo.client.db('npm-packages-quality-analysis')

    db.collection('reports').find({}).sort({ _id: 1 }).toArray((err, result) => {
        if (err) return reply.send({ data: null })
        reply.send({ data: result })
    })
})

fastify.listen(3000, (err, address) => {
    if (err) throw err
    logger.info(`Server listening on ${address}`)
})
