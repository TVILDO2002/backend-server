const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL connection
const connection = mysql.createConnection({
  host: "34.78.206.83", // Your Cloud SQL public IP address
  user: "root",
  password: "root",
  database: "mqtt_messages",
  connectTimeout: 10000, // 10 seconds
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// API route for registration
app.post("/register", (req, res) => {
  const { name, username, password, email, phoneNumber } = req.body;

  // Password validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long, start with a capital letter, and contain at least one number",
    });
  }

  // Check if email already exists
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  connection.query(checkEmailSql, [email], (err, emailResults) => {
    if (err) {
      console.error("Error checking email in MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (emailResults.length > 0) {
      // Email already exists
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Check if username already exists
    const checkUsernameSql = "SELECT * FROM users WHERE username = ?";
    connection.query(checkUsernameSql, [username], (err, usernameResults) => {
      if (err) {
        console.error("Error checking username in MySQL:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (usernameResults.length > 0) {
        // Username already exists
        return res.status(400).json({ error: "Username is already taken" });
      }

      // Check if phone number already exists
      const checkPhoneNumberSql = "SELECT * FROM users WHERE phoneNumber = ?";
      connection.query(checkPhoneNumberSql, [phoneNumber], (err, phoneResults) => {
        if (err) {
          console.error("Error checking phone number in MySQL:", err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }

        if (phoneResults.length > 0) {
          // Phone number already exists
          return res.status(400).json({ error: "Phone number is already registered" });
        }

        // All checks passed, proceed with registration
        const sql =
          "INSERT INTO users (name, username, password, email, phoneNumber) VALUES (?, ?, ?, ?, ?)";
        const values = [name, username, password, email, phoneNumber];

        connection.query(sql, values, (err, result) => {
          if (err) {
            console.error("Error inserting data into MySQL:", err);
            res.status(500).json({ error: "Internal Server Error" });
            return;
          }
          console.log("User registered successfully");
          res.status(200).json({ message: "Registration successful" });
        });
      });
    });
  });
});

// API route for login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Check if the email exists in the database
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  connection.query(checkEmailSql, [email], (err, results) => {
    if (err) {
      console.error("Error checking email in MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.length === 0) {
      // Email not found
      res.status(400).json({ error: "Email not found" });
      return;
    }

    // Email found, now check if the password matches
    const user = results[0];
    if (user.password !== password) {
      // Incorrect password
      res.status(400).json({ error: "Incorrect password" });
      return;
    }

    // Login successful
    res.status(200).json({ message: "Login successful" });
  });
});

// API route for fetching sensor data
app.get("/sensor-data", (req, res) => {
  const sql = `
    SELECT 
      temperature, 
      humidity, 
      fahrenheit, 
      co2, 
      eco2, 
      tvoc, 
      rawh2, 
      rawethanol,
      dust 
    FROM sensor_data 
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching sensor data from MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: "No sensor data found" });
      return;
    }
    
    res.status(200).json(results[0]);
  });
});

// getting profile
app.get("/profile-data", (req, res) => {
  const { email } = req.query; // Extract email from the query parameters

  const sql = `
    SELECT 
      name, 
      username, 
      email, 
      phoneNumber   
    FROM users
    WHERE email = ?;`;

  connection.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching profile data from MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    
    res.status(200).json(results[0]);
  });
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
