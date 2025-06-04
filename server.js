// server.js - Simple Express server for storing FLOW-FOIL pricing data
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('./')); // Serve static files from 'public' directory

// Data file path
const PRICES_FILE = path.join(__dirname, 'data', 'prices.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize default prices if file doesn't exist
if (!fs.existsSync(PRICES_FILE)) {
  const defaultPrices = {
    basePrice: 100,
    materialExtra: {
      metal: 0,
      glass: 10
    },
    sheetPrices: {
      a4vertical: 15,
      a4landscape: 17,
      a5vertical: 12,
      a5landscape: 14,
      a3vertical: 21,
      a3landscape: 27
    }
  };
  
  fs.writeFileSync(PRICES_FILE, JSON.stringify(defaultPrices, null, 2));
  console.log('Default prices file created');
}

// GET endpoint to retrieve prices
app.get('/api/prices', (req, res) => {
  try {
    const pricesData = fs.readFileSync(PRICES_FILE, 'utf8');
    res.json(JSON.parse(pricesData));
  } catch (error) {
    console.error('Error reading prices:', error);
    res.status(500).json({ error: 'Failed to retrieve prices' });
  }
});

// POST endpoint to update prices
app.post('/api/prices', (req, res) => {
  try {
    // Basic validation
    const prices = req.body;
    if (!prices || !prices.basePrice || !prices.materialExtra || !prices.sheetPrices) {
      return res.status(400).json({ error: 'Invalid price data format' });
    }

    // Write to file
    fs.writeFileSync(PRICES_FILE, JSON.stringify(prices, null, 2));
    res.json({ success: true, message: 'Prices updated successfully' });
  } catch (error) {
    console.error('Error saving prices:', error);
    res.status(500).json({ error: 'Failed to save prices' });
  }
});

// Authentication middleware (basic for demo)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'flowfoil2024'; //this is the password for now, you can change

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});  

