// server.js - Simple Express server for FLOW-FOIL Configurator and Admin Dashboard
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
// Serve static files from the root directory where server.js resides
app.use(express.static(path.join(__dirname, './'))); 

// Data file path - Renamed to config.json for broader configuration
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize default configuration if file doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
        basePrice: 100,
        materialExtra: {
            metal: { price: 0, enabled: true },
            glass: { price: 10, enabled: true }
        },
        sheetFormats: [ // Changed from sheetPrices to sheetFormats for more data
            { id: 'a4vertical', displayName: 'A4 Vertical (30cm)', height: 21, price: 15, enabled: true, glbLeft: 'a4vertlf8', glbRight: 'a4vertr8' },
            { id: 'a4landscape', displayName: 'A4 Landscape (21cm)', height: 21, price: 17, enabled: true, glbLeft: 'a4landslf8', glbRight: 'a4landsr8' },
            { id: 'a5vertical', displayName: 'A5 Vertical (21cm)', height: 21, price: 12, enabled: true, glbLeft: 'a3vertlf8', glbRight: 'a3vertr8' },
            { id: 'a5landscape', displayName: 'A5 Landscape (15cm)', height: 21, price: 14, enabled: true, glbLeft: 'a3landslf8', glbRight: 'a3landsr8' },
            { id: 'a3vertical', displayName: 'A3 Vertical (42cm)', height: 30, price: 21, enabled: true, glbLeft: 'a5vertlf8', glbRight: 'a5vertr8' },
            { id: 'a3landscape', displayName: 'A3 Landscape (30cm)', height: 27, price: 27, enabled: true, glbLeft: 'a5landslf8', glbRight: 'a5landsr8' }
        ]
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    console.log('Default config file created');
}

// GET endpoint to retrieve configuration
app.get('/api/config', (req, res) => {
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        res.json(JSON.parse(configData));
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ error: 'Failed to retrieve configuration' });
    }
});

// POST endpoint to update configuration
app.post('/api/config', (req, res) => {
    try {
        const newConfig = req.body;
        // Basic validation for top-level keys
        if (!newConfig || typeof newConfig.basePrice === 'undefined' || !newConfig.materialExtra || !newConfig.sheetFormats) {
            return res.status(400).json({ error: 'Invalid configuration data format' });
        }

        // Deeper validation for sheetFormats structure
        if (!Array.isArray(newConfig.sheetFormats) || newConfig.sheetFormats.some(s => 
            typeof s.id !== 'string' || typeof s.displayName !== 'string' || 
            typeof s.height !== 'number' || typeof s.price !== 'number' || 
            typeof s.enabled !== 'boolean' || typeof s.glbLeft !== 'string' || 
            typeof s.glbRight !== 'string'
        )) {
            return res.status(400).json({ error: 'Invalid sheet format data structure' });
        }

        // Write to file
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
        console.error('Error saving configuration:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Authentication middleware (basic for demo)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'flowfoil2024';

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