const fs = require("fs");
const { MongoClient } = require("mongodb");

// MongoDB connection URI
const uri = "mongodb://localhost:27017"; // Replace with your MongoDB URI
const dbName = "yourDatabaseName"; // Replace with your database name
const collectionName = "transactions"; // Replace with your collection name

// Read and parse all JSON files
const service = JSON.parse(fs.readFileSync("./service.json", "utf-8"));
const filteredData = JSON.parse(
  fs.readFileSync("./filtered_data.json", "utf-8")
);
const wallet = JSON.parse(fs.readFileSync("./wallet.json", "utf-8"));
const clientdata = JSON.parse(fs.readFileSync("./client.json", "utf-8"));

// Convert paisa to rupee (divide by 100)
const convertPaisaToRupee = (paisa) => paisa / 100;

// Function to process transactions and update filtered data
const processTransactions = async () => {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Process each transaction in filtered_data
    filteredData.forEach((transaction) => {
      // Check if account number exists in service's settlement accounts
      const accountMatch = service.settlementAcc.some(
        (acc) => acc.accountNumber === transaction.accountNo
      );

      if (accountMatch) {
        const serviceClientId = service.clientId;
        const clientClientId = clientdata.clientId;
        console.log(client)
        console.log(serviceClientId)
        console.log(clientClientId)
        // Verify clientId matches between service and client
        if (serviceClientId === clientClientId) {
          // Verify clientId in wallet
          if (wallet.clientId === clientClientId) {
            // Convert wallet amounts to rupees
            const creditedRupees = convertPaisaToRupee(wallet.credited);
            const debitedRupees = convertPaisaToRupee(wallet.debited);

            // Calculate wallet balance in rupees
            const walletBalance = creditedRupees - debitedRupees;

            // Compare with bankTransfer (already in rupees)
            if (walletBalance < transaction.bankTransfer) {
              transaction.clientId = clientClientId; // Append clientId from client.json
              transaction.status = "transaction is successful";
            } else {
              transaction.status = "insufficient funds";
            }
          } else {
            transaction.status = "clientId mismatch with wallet";
          }
        } else {
          transaction.status = "clientId mismatch between service and client";
        }
      }
    });

    // Insert processed transactions into MongoDB
    if (filteredData.length > 0) {
      const result = await collection.insertMany(filteredData);
      console.log(`${result.insertedCount} transactions inserted into MongoDB`);
    } else {
      console.log("No transactions to insert.");
    }
  } catch (err) {
    console.error(
      "Error processing transactions or connecting to MongoDB:",
      err
    );
  } finally {
    // Close the MongoDB connection
    await client.close();
    console.log("MongoDB connection closed");
  }
};

// Run the process
processTransactions();
