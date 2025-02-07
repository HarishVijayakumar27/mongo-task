const connectToMongo = require('./db')

async function main() {
    const db = await connectToMongo();
    console.log("db:",db)
    if (db) {
        const collection = db.collection("myCollection");
        const data = await collection.find().toArray();
        console.log(data)
    }
}

main()


