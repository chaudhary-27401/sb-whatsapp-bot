const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { Pool } = require("pg");
const fs = require("fs");
// PostgreSQL database configuration
// console.log('Script starting...');
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tempdb",
  password: "root",
  port: 5432, // Default PostgreSQL port
});
console.log("Script starting...");
// WhatsApp bot configuration
const client = new Client({
  authStrategy: new LocalAuth(),
});
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

console.log("Script running 1...");
client.on("message", async (message) => {
  const { body, from } = message;
  // Perform CRUD operations based on the message received
  if (body.startsWith("/add")) {
    const [command, name, age] = body.split(" ");
    await addCustomer(name, parseInt(age));
    await client.sendMessage(from, "Customer added successfully.");
  } else if (body.startsWith("/get")) {
    const customers = await getCustomers();
    const customerList = customers
      .map((customer) => `${customer.name}, ${customer.age}`)
      .join("\n");
    await client.sendMessage(from, `Customer List:\n${customerList}`);
  } else if (body.startsWith("/delete")) {
    const [command, customerName] = body.split(" ");
    await deleteCustomer(customerName);
    await client.sendMessage(from, "Customer deleted successfully.");
  } else if (body.startsWith("/update")) {
    const [command, customerName, newAge] = body.split(" ");
    // console.log("working");
    await updateCustomer(customerName, parseInt(newAge));
    await client.sendMessage(from, "Customer updated successfully.");
  } else if (message.body.startsWith("/fetchallimg")) {
    await fetchAllImages(message.from);
  } else if (message.hasMedia) {
    const media = await message.downloadMedia();

    // Save image to the database
    await saveImageToDatabase(message.from, media);
    await client.sendMessage(message.from, "Image received and saved.");
  }
  // Add other CRUD operations (/update, /delete) as needed
});
console.log("Script running 2...");
// Function to add a customer to the database
async function addCustomer(name, age) {
  const query = "INSERT INTO customer (name, age) VALUES ($1, $2)";
  await pool.query(query, [name, age]);
}

// Function to get all customers from the database
async function getCustomers() {
  const query = "SELECT * FROM customer";
  const result = await pool.query(query);
  return result.rows;
}
//Function to add image to the database
async function saveImageToDatabase(filename, data) {
  const query =
    "INSERT INTO images (filename, data) VALUES ($1, $2) RETURNING id";
  const result = await pool.query(query, [filename, data]);
  console.log("Image saved with ID:", result.rows[0].id);
}

// Function to fetch all stored images from the database
// Function to fetch all stored images from the database   

async function fetchAllImages(user) {
  try {
    const query = "SELECT id, filename, data FROM images";
    const result = await pool.query(query);

    // Prepare an array to store image messages
    const imageMessages = [];

    // Process each row and add images to the array
    for (const row of result.rows) {
      const { id, filename, data } = row;

      // Add image to the array
      imageMessages.push({
        url: `data:image/png;base64,${data.toString("base64")}`,
        caption: `Image ${id} - ${filename}`,
      });
    }

    // Send all images in a single message
    await client.sendMessage(user, imageMessages);

    // Send a final message
    await client.sendMessage(user, "Images fetched and sent.");
  } catch (error) {
    console.error("Error fetching images:", error);
    await client.sendMessage(
      user,
      "Error fetching images. Please try again later."
    );
  }
}

//Delete the customer
// Delete operation: Delete a customer from the database by name
async function deleteCustomer(customerName) {
  try {
    const deleteQuery = "DELETE FROM customer WHERE name = $1";
    const result = await pool.query(deleteQuery, [customerName]);

    if (result.rowCount === 0) {
      // If no rows were affected, the customer with the given name doesn't exist
      console.log(`Customer with name ${customerName}' not found.`);
      return; // Optionally, you can throw an error or handle it differently
    }

    console.log(`Customer ${customerName}' deleted successfully.`);
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
}
//Update age for name
async function updateCustomer(customerName, newAge) {
  try {
    const query = "UPDATE customer SET age = $1 WHERE name = $2";
    await pool.query(query, [newAge, customerName]);
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
}

console.log("Script running 3...");
// Connect to WhatsApps
client.initialize();