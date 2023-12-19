const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { Pool } = require("pg");
const fs = require("fs");

// PostgreSQL database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tempdb",
  password: "root",
  port: 5432, // Default PostgreSQL port
});

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

client.on("message", async (message) => {
  console.log("Received message:", message.body);

  const { body, from } = message;

  // Check if the sender's phone number is registered in the user table
  const senderIdentifier = from;
  console.log("Sender identifier:", senderIdentifier);

  try {
    const isAuthorized = await isPhoneNumberAuthorized(senderIdentifier);

    if (!isAuthorized) {
      console.log("User not authorized:", senderIdentifier);
      await client.sendMessage(from, "You are not authorized to use this bot.");
      return;
    }

    // Perform CRUD operations based on the message received
    if (body.startsWith("/add")) {
      const [command, name, age] = body.split(" ");
      console.log("Adding customer:", name, age);
      await addCustomer(name, parseInt(age));
      await client.sendMessage(from, "Customer added successfully.");
    } else if (body.startsWith("/get")) {
      console.log("Fetching customers");
      const customers = await getCustomers();
      const customerList = customers
        .map((customer) => ${customer.name}, ${customer.age})
        .join("\n");
      await client.sendMessage(from, Customer List:\n${customerList});
    } else if (body.startsWith("/delete")) {
      const [command, customerName] = body.split(" ");
      console.log("Deleting customer:", customerName);
      await deleteCustomer(customerName);
      await client.sendMessage(from, "Customer deleted successfully.");
    } else if (body.startsWith("/update")) {
      const [command, customerName, newAge] = body.split(" ");
      console.log("Updating customer:", customerName, newAge);
      await updateCustomer(customerName, parseInt(newAge));
      await client.sendMessage(from, "Customer updated successfully.");
    } else if (message.body.startsWith("/fetchallimg")) {
      console.log("Fetching all images");
      await fetchAllImages(from);
    } else if (message.hasMedia) {
      console.log("Received media");
      const media = await message.downloadMedia();

      // Save image to the database
      await saveImageToDatabase(from, media);
      await client.sendMessage(from, "Image received and saved.");
    }
  } catch (error) {
    console.error("Error processing message:", error);
    await client.sendMessage(from, "An error occurred while processing your message.");
  }
});

// Function to add a customer to the database
async function addCustomer(name, age) {
  try {
    const query = "INSERT INTO customer (name, age) VALUES ($1, $2)";
    await pool.query(query, [name, age]);
    console.log("Customer added:", name, age);
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
}

// Function to get all customers from the database
async function getCustomers() {
  try {
    const query = "SELECT * FROM customer";
    const result = await pool.query(query);
    console.log("Fetched customers:", result.rows);
    return result.rows;
  } catch (error) {
    console.error("Error getting customers:", error);
    throw error;
  }
}

// Function to save image to the database
async function saveImageToDatabase(filename, data) {
  try {
    const query = "INSERT INTO images (filename, data) VALUES ($1, $2) RETURNING id";
    const result = await pool.query(query, [filename, data]);
    console.log("Image saved with ID:", result.rows[0].id);
  } catch (error) {
    console.error("Error saving image:", error);
    throw error;
  }
}

// Authorization of user
async function isPhoneNumberAuthorized(phoneNumber) {
  try {
    const query = "SELECT user_id FROM users WHERE phone_number = $1";
    const result = await pool.query(query, [phoneNumber]);
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking authorization:", error);
    throw error;
  }
}

// Update operation: Update the age of a customer in the database
async function updateCustomer(customerName, newAge) {
  try {
    const query = "UPDATE customer SET age = $1 WHERE name = $2";
    const result = await pool.query(query, [newAge, customerName]);

    if (result.rowCount === 0) {
      console.log(Customer with name '${customerName}' not found.);
    } else {
      console.log(Customer '${customerName}' details updated successfully.);
    }
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
}

// Delete operation: Delete a customer from the database by name
async function deleteCustomer(customerName) {
  try {
    const query = "DELETE FROM customer WHERE name = $1";
    const result = await pool.query(query, [customerName]);

    if (result.rowCount === 0) {
      console.log(Customer with name '${customerName}' not found.);
    } else {
      console.log(Customer '${customerName}' deleted successfully.);
    }
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
}

// Function to fetch all stored images from the database
async function fetchAllImages(user) {
  try {
    const query = "SELECT id, filename, data FROM images";
    const result = await pool.query(query);

    const imageMessages = result.rows.map((row) => ({
      url: data:image/png;base64,${row.data.toString("base64")},
      caption: Image ${row.id} - ${row.filename},
    }));

    await client.sendMessage(user, imageMessages);
    await client.sendMessage(user, "Images fetched and sent.");
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
}

// Connect to WhatsApp
client.initialize();
