const { MongoClient, ObjectId, WithId, Document: MongoDocument } = require('mongodb');

// Define TypeScript interfaces
interface SettlementAccount {
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  // ... other fields
}

interface Service extends Document {
  _id: ObjectId;
  clientId: string;
  settlementAcc: SettlementAccount[];
  // ... other fields
}

interface Client extends Document {
  _id: ObjectId;
  clientId: string;
  // ... other fields
}

interface Wallet extends Document {
  _id: ObjectId;
  clientId: string;
  debited: number; // in paisa
  credited: number; // in paisa
  // ... other fields
}

interface Transaction extends Document {
  _id: ObjectId;
  accountNo: string;
  bankTransfer: number; // in rupees
  // ... other fields
}

interface ProcessedTransaction extends Transaction {
  clientId?: string;
  status: string;
  processedAt: Date;
}

// MongoDB configuration
const uri = 'mongodb://localhost:27017';
const dbName = 'testing';

// Currency conversion functions
const paisaToRupee = (paisa: number): number => paisa / 100;
const rupeeToPaisa = (rupee: number): number => Math.round(rupee * 100);

const processTransactions = async (): Promise<void> => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    // Fetch all necessary data
    const services = await db.collection<Service>('service').find().toArray();
    const clients = await db.collection<Client>('client').find().toArray();
    const wallets = await db.collection<Wallet>('wallet').find().toArray();
    const transactions = await db.collection<Transaction>('filtered_data').find().toArray();

    // Process transactions
    const processedTransactions: ProcessedTransaction[] = [];

    for (const transaction of transactions) {
      let status = "no matching service found";
      let clientId: string | undefined;

      // Find matching service
      const service = services.find(s =>
        s.settlementAcc.some(acc => acc.accountNumber === transaction.accountNo)
      );

      if (service) {
        // Find matching client
        const client = clients.find(c => c.clientId === service.clientId);

        // Find matching wallet
        const wallet = wallets.find(w => w.clientId === service.clientId);

        if (client && wallet) {
          // Calculate balance in rupees
          const balance = paisaToRupee(wallet.credited - wallet.debited);

          if (balance < transaction.bankTransfer) {
            clientId = client.clientId;
            status = "transaction successful";

            // Calculate the difference between credited and debited in paisa
            const difference = wallet.credited - wallet.debited;

            // Update the debited field in the wallet with the difference
            await db.collection<Wallet>('wallet').updateOne(
              { _id: wallet._id },
              { $set: { debited: wallet.debited + difference } }
            );

            console.log(`Updated wallet ${wallet._id} with new debited value: ${wallet.debited + difference} paisa`);
          } else {
            status = "insufficient funds";
          }
        } else {
          status = client ? "wallet not found" : "client not found";
        }
      }

      // Create processed transaction
      const processedTransaction: ProcessedTransaction = {
        ...transaction,
        clientId,
        status,
        processedAt: new Date()
      };

      processedTransactions.push(processedTransaction);
    }

    // Save processed transactions
    if (processedTransactions.length > 0) {
      const result = await db.collection<ProcessedTransaction>('transactions')
        .insertMany(processedTransactions);
      console.log(`Inserted ${result.insertedCount} transactions`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
};

// Run the processor
processTransactions();