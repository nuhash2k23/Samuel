FLOW-FOIL Pricing Management System
Integration Guide for WooCommerce/WordPress on SiteGround VPS
This document provides comprehensive instructions for integrating the FLOW-FOIL Pricing Management System with a WordPress/WooCommerce site hosted on SiteGround VPS Cloud.
Table of Contents

System Overview
Architecture
Implementation Options
Prerequisites
Installation
Configuration
WooCommerce Integration
Security Considerations
Troubleshooting
Maintenance

System Overview
The FLOW-FOIL Pricing Management System provides an admin interface for managing product pricing for the FLOW-FOIL Luminous Freestanding Display Kit. Key features:

Admin dashboard for price management (separate from WordPress admin)
Real-time price updates in the 3D product configurator
Secure authentication for price management
Server-side price storage for consistent pricing across all users

This system consists of a Node.js/Express server for price management and API endpoints, plus client-side JavaScript for the configurator and admin dashboard.
Architecture
The system uses a client-server architecture:
┌─────────────────────────┐       ┌───────────────────────┐
│ WordPress/WooCommerce   │       │ Node.js Price Server  │
│                         │       │                       │
│ ┌─────────────────────┐ │       │ ┌─────────────────┐   │
│ │ Product Page with   │ │       │ │ Express Server  │   │
│ │ 3D Configurator     │◄┼───────┼─┤ - Price API     │   │
│ └─────────────────────┘ │   API │ │ - Auth API      │   │
│                         │  Calls │ └─────────────────┘   │
│ ┌─────────────────────┐ │       │                       │
│ │ Admin Dashboard     │◄┼───────┤ ┌─────────────────┐   │
│ │ (standalone HTML)   │ │       │ │ Price Storage   │   │
│ └─────────────────────┘ │       │ └─────────────────┘   │
└─────────────────────────┘       └───────────────────────┘
Implementation Options
There are two main approaches for implementation in a WooCommerce environment:
Option A: WordPress Plugin Integration (Recommended)
Create a custom WordPress plugin that:

Launches the Node.js server
Provides admin menu integration
Handles authentication via WordPress users
Uses WordPress database for price storage

Option B: Standalone Service
Run the Node.js server as a separate service:

Install Node.js on the VPS
Configure Nginx/Apache to proxy API requests
Use PM2 to keep the service running
Create separate authentication system

This guide covers Option B (Standalone Service) which provides better separation of concerns.
Prerequisites

SiteGround VPS with SSH access
Node.js 16+ installed on the server
Nginx or Apache web server
WordPress with WooCommerce installed
Admin access to the WordPress site
Basic knowledge of server management

Installation
1. Server Setup
bash# Connect to your SiteGround VPS via SSH
ssh username@your-vps-hostname

# Create directory for the price server (outside public_html)
mkdir -p /home/username/flow-foil-price-server
cd /home/username/flow-foil-price-server

# Install required tools if not already installed
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
2. Create Application Files
Create the following files in the /home/username/flow-foil-price-server directory:
server.js
javascript// server.js - Simple Express server for storing FLOW-FOIL pricing data
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// CORS middleware to allow requests from WordPress site
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.WP_SITE || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

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
Create package.json
bash# Create package.json
cat > package.json << 'EOF'
{
  "name": "flow-foil-price-server",
  "version": "1.0.0",
  "description": "Price management server for FLOW-FOIL configurator",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "body-parser": "^1.20.2"
  }
}
EOF

# Install dependencies
npm install
Create environment variables file
bashcat > .env << 'EOF'
PORT=3000
ADMIN_PASSWORD=your_secure_password_here
WP_SITE=https://your-wordpress-site.com
EOF
3. Setup Admin Dashboard
Create the public directory and add the admin dashboard:
bash# Create public directory
mkdir -p public

# Create admin.html in the public directory
cat > public/admin.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FLOW-FOIL Admin Dashboard</title>
  <!-- HTML content here from the admin-server-side artifact -->
</head>
<body>
  <!-- Rest of admin dashboard HTML -->
</body>
</html>
EOF
Place the complete admin dashboard HTML content in the admin.html file.
4. Configure PM2 for Production
bash# Start the server with PM2
pm2 start server.js --name flow-foil-price-server

# Configure PM2 to start on system boot
pm2 startup
# Follow the instructions provided by the command above

# Save the PM2 configuration
pm2 save
5. Configure Nginx as Reverse Proxy
Create a new Nginx configuration file:
bashsudo nano /etc/nginx/sites-available/flow-foil-api
Add the following configuration:
server {
    listen 80;
    server_name api.your-domain.com;  # Choose a subdomain for the API

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
Enable the site and restart Nginx:
bashsudo ln -s /etc/nginx/sites-available/flow-foil-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl restart nginx
Configuration
1. Set Up DNS
In SiteGround Site Tools or cPanel, add a new subdomain (e.g., api.your-domain.com) pointing to your server.
2. Install SSL Certificate
bashsudo certbot --nginx -d api.your-domain.com
WooCommerce Integration
1. Modify the Product Configurator
Edit your WordPress template files or use a custom plugin to add the 3D configurator to your product page.
Add API URL to Configurator Script
In your configurator JavaScript, update the price fetching function:
javascript// Near the top of your script in index.html/configurator.js
const API_BASE_URL = 'https://api.your-domain.com';

async function fetchPrices() {
  try {
    console.log("Fetching prices from server...");
    const response = await fetch(`${API_BASE_URL}/api/prices`);
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }
    const data = await response.json();
    
    // IMPORTANT: Make sure these are declared with 'let' and not 'const'
    basePrice = data.basePrice || 100;
    materialExtra = data.materialExtra || { metal: 0, glass: 10 };
    sheetPrices = data.sheetPrices || {
      a4vertical: 15,
      a4landscape: 17,
      a5vertical: 12,
      a5landscape: 14,
      a3vertical: 21,
      a3landscape: 27
    };
    
    console.log('Prices updated from server');
    updatePrice();
  } catch (error) {
    console.error('Error fetching prices:', error);
    // Continue with default prices
  }
}
2. Update the Admin Dashboard URL
Update the link to the admin dashboard in your configurator:
html<a href="https://api.your-domain.com/admin.html" class="admin-link">Admin</a>
3. Optional: Create WooCommerce Admin Menu Link
Add a link in the WordPress admin to the price management dashboard.
Create a simple plugin file wp-content/plugins/flow-foil-admin-link/flow-foil-admin-link.php:
php<?php
/*
Plugin Name: FLOW-FOIL Admin Link
Description: Adds a link to the FLOW-FOIL price management dashboard in the admin menu
Version: 1.0
Author: Your Name
*/

// Add menu item
function flow_foil_admin_menu() {
    add_menu_page(
        'FLOW-FOIL Price Management',
        'FLOW-FOIL Prices',
        'manage_options',
        'flow-foil-prices',
        'flow_foil_admin_page',
        'dashicons-money-alt',
        30
    );
}
add_action('admin_menu', 'flow_foil_admin_menu');

// Create the admin page that redirects to the external dashboard
function flow_foil_admin_page() {
    ?>
    <div class="wrap">
        <h1>FLOW-FOIL Price Management</h1>
        <p>Click the button below to access the FLOW-FOIL price management dashboard.</p>
        <a href="https://api.your-domain.com/admin.html" class="button button-primary" target="_blank">Open Price Dashboard</a>
    </div>
    <?php
}
Security Considerations

Password Protection:

Change the default password in the .env file
Consider implementing a more robust authentication system


Rate Limiting:

Add rate limiting to prevent brute force attacks:

bashnpm install express-rate-limit

Add to server.js:

javascriptconst rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoint
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth', authLimiter, (req, res) => {
  // Auth logic
});

HTTPS:

Ensure all communication uses HTTPS
Configure Nginx with proper SSL settings


IP Restrictions:

Consider restricting admin access by IP
Add to Nginx configuration:

location /admin.html {
    allow 123.123.123.123; # Your IP
    deny all;
    proxy_pass http://localhost:3000;
    # other proxy settings
}


Troubleshooting
Common Issues

Prices Not Updating in Configurator

Check browser console for errors
Verify the API URL is correct
Ensure price variables are defined with let not const
Test API endpoint directly: curl https://api.your-domain.com/api/prices


Admin Dashboard Not Loading

Check Nginx error logs: sudo tail -f /var/log/nginx/error.log
Ensure the Node.js server is running: pm2 status
Verify the admin.html file exists in the public directory


Authentication Errors

Verify the correct password is set in .env
Check if the server was restarted after updating .env



Logs
Check these logs for troubleshooting:
bash# PM2 logs
pm2 logs flow-foil-price-server

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
Maintenance
Updating the Application
bash# Pull latest code (if using Git)
cd /home/username/flow-foil-price-server
git pull

# Or manually update files as needed

# Restart the server
pm2 restart flow-foil-price-server
Backup Data
Set up a cron job to backup the prices.json file:
bash# Edit crontab
crontab -e

# Add a daily backup job
0 0 * * * cp /home/username/flow-foil-price-server/data/prices.json /home/username/backups/prices-$(date +\%Y\%m\%d).json
Monitoring
Set up monitoring with PM2:
bash# View metrics
pm2 monit

# Enable PM2's built-in moni