const axios = require('axios');
const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');
const http = require('http');
const app = require('../app');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let server;
let mockContentServer;
let mockContentBaseUrl;

describe('Integration Tests', () => {
  // Modify the app to use a test port
  beforeAll(async () => {
    // Mock external HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');

    // Start a local HTTP server to serve the sample Yale HTML
    mockContentServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(sampleHtmlWithYale);
    });

    await new Promise(resolve => {
      mockContentServer.listen(0, '127.0.0.1', () => {
        const { port } = mockContentServer.address();
        mockContentBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Start the app server on the test port
    server = await new Promise(resolve => {
      const listener = app.listen(TEST_PORT, () => resolve(listener));
    });
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (mockContentServer) {
      await new Promise(resolve => mockContentServer.close(resolve));
    }
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Make a request to our proxy app using the local mock content server
    const response = await axios.post(`http://127.0.0.1:${TEST_PORT}/fetch`, {
      url: `${mockContentBaseUrl}/`
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.data.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
    
    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    try {
      await axios.post(`http://127.0.0.1:${TEST_PORT}/fetch`, {
        url: 'not-a-valid-url'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(500);
    }
  });

  test('Should handle missing URL parameter', async () => {
    try {
      await axios.post(`http://127.0.0.1:${TEST_PORT}/fetch`, {});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('URL is required');
    }
  });
});
