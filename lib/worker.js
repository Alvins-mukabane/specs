import { AutoTokenizer, AutoModel, env } from '@xenova/transformers';

// Skip local model check - load from Hugging Face
env.allowLocalModels = false;

let tokenizer = null;
let model = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    try {
      self.postMessage({
        type: 'loading',
        status: 'Downloading AI Model to Browser...'
      });

      // Load tokenizer and model
      tokenizer = await AutoTokenizer.from_pretrained('Xenova/distilgpt2');
      model = await AutoModel.from_pretrained('Xenova/distilgpt2');

      self.postMessage({
        type: 'ready',
        status: 'Model Ready!'
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }

  if (type === 'teardown' && tokenizer && model) {
    try {
      const text = payload.text;

      // Tokenize
      const tokens = tokenizer.tokenize(text);
      const encoded = tokenizer.encode(text);
      const input_ids = encoded.slice(1, -1); // Remove BOS and EOS tokens
      const tokensWithIds = tokens.slice(1, -1).map((token, i) => ({
        token: token.replace(/Ġ/g, ' '), // Replace Ġ with space
        id: input_ids[i]
      }));

      // Run model with attention output
      const outputs = await model({
        input_ids: [input_ids],
        output_attentions: true
      });

      // Extract attention: [batch, layers, heads, seq_len, seq_len]
      // We want Layer 0, Head 0
      const attentions = outputs.attentions; // Array of layers
      const layer0 = attentions[0]; // First layer
      const head0 = layer0[0]; // First head [1, seq_len, seq_len]

      // Convert to 2D array
      const attentionMatrix = head0[0]; // Remove batch dimension

      self.postMessage({
        type: 'result',
        tokens: tokensWithIds,
        attention: attentionMatrix
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};
