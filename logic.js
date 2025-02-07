const fs = require("fs");

// Read and parse all JSON files
const service = JSON.parse(fs.readFileSync("./service.json", "utf-8"));
const filteredData = JSON.parse(
  fs.readFileSync("./filtered_data.json", "utf-8")
);
const wallet = JSON.parse(fs.readFileSync("./wallet.json", "utf-8"));

// Process each transaction in filtered_data
filteredData.forEach((transaction) => {
  // Check if account number exists in service's settlement accounts
  const accountMatch = service.settlementAcc.some(
    (acc) => acc.accountNumber === transaction.accountNo
  );

  if (accountMatch) {
    const clientId = service.clientId;

    // Verify clientId in wallet
    if (wallet.clientId === clientId) {
      // Calculate wallet balance
      const walletBalance = wallet.credited - wallet.debited;

      // Check against bank transfer amount
      if (walletBalance < transaction.bankTransfer) {
        transaction.clientId = clientId;
        transaction.status = "transaction is successful";
      } else {
        transaction.status = "insufficient funds";
      }
    } else {
      transaction.status = "clientId mismatch with wallet";
    }
  }
});

// Save updated filtered data
fs.writeFileSync(
  "./updated_filtered_data.json",
  JSON.stringify(filteredData, null, 2)
);
console.log("Processing completed. Check updated_filtered_data.json");
