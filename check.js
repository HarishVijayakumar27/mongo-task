const fs = require("fs");

// Read and parse all JSON files
const service = JSON.parse(fs.readFileSync("./service.json", "utf-8"));
const filteredData = JSON.parse(
  fs.readFileSync("./filtered_data.json", "utf-8")
);
const wallet = JSON.parse(fs.readFileSync("./wallet.json", "utf-8"));
const client = JSON.parse(fs.readFileSync("./client.json", "utf-8"));

// Convert paisa to rupee (divide by 100)
const convertPaisaToRupee = (paisa) => paisa / 100;

// Process each transaction in filtered_data
filteredData.forEach((transaction) => {
  // Check if account number exists in service's settlement accounts
  const accountMatch = service.settlementAcc.some(
    (acc) => acc.accountNumber === transaction.accountNo
  );

  if (accountMatch) {
    const serviceClientId = service.clientId;
    const clientClientId = client.clientId;

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

// Save updated filtered data
fs.writeFileSync(
  "./updated_filtered_data.json",
  JSON.stringify(filteredData, null, 2)
);
console.log("Processing completed. Check updated_filtered_data.json");
