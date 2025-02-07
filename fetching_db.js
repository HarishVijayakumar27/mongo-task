const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const dbName = "testing";

const convertPaisaToRupee = (paisa) => paisa / 100;

const processTransactions = async () => {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);

    // Fetch all relevant documents
    const services = await db.collection("service").find({}).toArray();
    const clients = await db.collection("client").find({}).toArray();
    const wallets = await db.collection("wallet").find({}).toArray();
    const filteredData = await db
      .collection("settlement")
      .find({})
      .toArray();

    if (
      !services.length ||
      !clients.length ||
      !wallets.length ||
      !filteredData.length
    ) {
      throw new Error("One or more collections are empty");
    }

    // Process transactions
    const processedTransactions = filteredData.map((transaction) => {
      let status = "no matching service found";
      let clientId = null;

      // Find matching service
      const matchingService = services.find((service) =>
        service.settlementAcc.some(
          (acc) => acc.accountNumber === transaction.accountNo
        )
      );

      if (matchingService) {
        // Find matching client
        const matchingClient = clients.find(
          (c) => c.clientId === matchingService.clientId
        );

        // Find matching wallet
        const matchingWallet = wallets.find(
          (w) => w.clientId === matchingService.clientId
        );

        if (matchingClient && matchingWallet) {
          // Convert wallet amounts
          const credited = convertPaisaToRupee(matchingWallet.credited);
          const debited = convertPaisaToRupee(matchingWallet.debited);
          const balance = credited - debited;

          // Check funds
          if (balance < transaction.bankTransfer) {
            clientId = matchingClient.clientId;
            status = "transaction successful";
          } else {
            status = "insufficient funds";
          }
        } else {
          status = matchingClient ? "wallet not found" : "client not found";
        }
      }

      return {
        ...transaction,
        clientId,
        status,
        processedAt: new Date(),
      };
    });

    // Save to transactions collection
    const result = await db
      .collection("transactions")
      .insertMany(processedTransactions);
    console.log(`Inserted ${result.insertedCount} transactions`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
};

processTransactions();
