const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCC Lost & Found API',
      version: '1.0.0',
      description: 'API documentation for MCC Lost & Found system',
    },
    servers: [
      {
        url: 'https://lost-found-79xn.onrender.com',
        description: 'Production server',
      },
      {
        url: 'http://localhost:10000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };