const OpenAI = require('openai');

let openai = null;

if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI API configured for Vector Search');
} else {
    console.warn('⚠️ OPENAI_API_KEY not found. Falling back to MongoDB Text Search.');
}

/**
 * Generates a 1536-dimensional vector embedding for the given text.
 * Returns undefined if OpenAI is not configured or an error occurs.
 * 
 * @param {string} text - The combined text (title + description + category + location)
 * @returns {Promise<number[]|undefined>} The embedding vector
 */
async function generateEmbedding(text) {
    if (!openai || !text) return undefined;

    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            encoding_format: 'float',
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('❌ Error generating OpenAI embedding:', error.message);
        // Return undefined so the system automatically falls back to text search
        return undefined;
    }
}

module.exports = {
    generateEmbedding,
    isConfigured: () => !!openai
};
