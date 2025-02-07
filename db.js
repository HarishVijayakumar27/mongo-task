const {MongoClient} = require('mongodb')

const uri = "mongodb://localhost:27017"

const dbName = "settlement"

async function connectToMongo() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("connected to MongoDB")

        const db = client.db(dbName)

        return db;
    } catch (error) {
        console.log("Error connecting to MongoDB:", error)
    }
}

module.exports = connectToMongo;