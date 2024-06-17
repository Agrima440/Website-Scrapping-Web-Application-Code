const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
const companySchema = new mongoose.Schema({
    name: String,
    description: String,
    logo: String,
    facebook: String,
    linkedin: String,
    twitter: String,
    instagram: String,
    address: String,
    phone: String,
    email: String,
    screenshot: String
});

const Company = mongoose.model('Company', companySchema);

// Helper function to scrape data
const scrapeData = async (url) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            console.log('Starting scraping process...');

            // Fetch the HTML of the website
            console.log('Fetching HTML from:', url);
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 5000 // Set timeout to 5 seconds
            });
            console.log('HTML fetched successfully.');

            const $ = cheerio.load(data);

            // Extract details
            console.log('Extracting company details...');
            const name = $('meta[property="og:site_name"]').attr('content') || $('title').text();
            const description = $('meta[name="description"]').attr('content');
            const logo = $('meta[property="og:image"]').attr('content') || $('link[rel="icon"]').attr('href');
            const facebook = $('a[href*="facebook.com"]').attr('href');
            const linkedin = $('a[href*="linkedin.com"]').attr('href');
            const twitter = $('a[href*="twitter.com"]').attr('href');
            const instagram = $('a[href*="instagram.com"]').attr('href');
            const address = $('address').text();
            const phone = $('a[href^="tel:"]').text();
            const email = $('a[href^="mailto:"]').text();

            // Capture screenshot using Puppeteer
            console.log('Capturing screenshot...');
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });
            const screenshotPath = path.join(__dirname, 'screenshots', `${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath });
            await browser.close();
            console.log('Screenshot captured:', screenshotPath);

            // Read screenshot as base64
            const screenshot = fs.readFileSync(screenshotPath, { encoding: 'base64' });

            console.log('Scraping process completed.');

            return {
                name,
                description,
                logo,
                facebook,
                linkedin,
                twitter,
                instagram,
                address,
                phone,
                email,
                screenshot: `data:image/png;base64,${screenshot}`
            };
        } catch (error) {
            attempt++;
            console.error(`Error during scraping (attempt ${attempt}):`, error.message);

            if (attempt >= maxRetries) {
                console.error('Max retries reached. Failing...');
                throw new Error('Failed to scrape the website');
            } else {
                console.log('Retrying...');
            }
        }
    }
};

// Scraping route
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    try {
        console.log('Received scrape request for URL:', url);

        const companyData = await scrapeData(url);
        console.log('Scraped data:', companyData);

        const company = new Company(companyData);
        await company.save();
        console.log('Company data saved to MongoDB.');

        res.json({ message: 'Data scraped and saved', company });
    } catch (error) {
        console.error('Error scraping data:', error);
        res.status(500).json({ message: `Error scraping data: ${error.message}` });
    }
});

// Get all companies
app.get('/api/companies', async (req, res) => {
    try {
        console.log('Fetching all companies...');
        const companies = await Company.find();
        console.log('Companies fetched successfully.');

        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ message: 'Error fetching companies' });
    }
});

// Get company details by ID
app.get('/api/companies/:id', async (req, res) => {
    try {
        console.log('Fetching company details for ID:', req.params.id);
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        console.log('Company details fetched successfully.');

        res.json(company);
    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({ message: 'Error fetching company details' });
    }
});

// Delete company by ID
app.delete('/api/companies/:id', async (req, res) => {
    try {
        console.log('Deleting company with ID:', req.params.id);
        await Company.findByIdAndDelete(req.params.id);

        console.log('Company deleted successfully.');

        res.json({ message: 'Company deleted' });
    } catch (error) {
        console.error('Error deleting company:', error);
        res.status(500).json({ message: 'Error deleting company' });
    }
});

// Download all records as CSV
app.get('/api/companies/csv', async (req, res) => {
    try {
        console.log('Exporting all companies to CSV...');
        const companies = await Company.find();

        // Prepare CSV data
        const csvData = companies.map(company => ({
            Name: company.name,
            Description: company.description,
            Logo: company.logo,
            Facebook: company.facebook,
            LinkedIn: company.linkedin,
            Twitter: company.twitter,
            Instagram: company.instagram,
            Address: company.address,
            Phone: company.phone,
            Email: company.email
        }));

        // Convert to CSV string
        const csvString = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(item => Object.values(item).join(','))
        ].join('\n');

        // Send CSV file as attachment
        res.header('Content-Type', 'text/csv');
        res.attachment('companies.csv');
        res.send(csvString);

        console.log('CSV export completed.');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ message: 'Error exporting CSV' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
