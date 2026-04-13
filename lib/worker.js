import { AutoTokenizer, AutoModel, Tensor, env } from '@xenova/transformers';

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
        status: 'Downloading AI Model to Browser (One time only)...'
      });

      // Load both in parallel to save time
      const [t, m] = await Promise.all([
        AutoTokenizer.from_pretrained('Xenova/distilgpt2'),
        AutoModel.from_pretrained('Xenova/distilgpt2')
      ]);
      tokenizer = t;
      model = m;

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

      // --- TOKENIZATION ---
      const wordChunks = tokenizer.tokenize(text);
      const ids = tokenizer.encode(text);

      // Map tokens with their IDs, replace Ġ with space for readability
      const tokensWithIds = wordChunks.map((token, i) => ({
        token: token.replace(/Ġ/g, ' '),
        id: ids[i]
      }));

      // --- ATTENTION EXTRACTION ---
      // Convert to Tensor for the WebAssembly model
      const inputIdsTensor = new Tensor(
        'int64',
        BigInt64Array.from(ids.map(BigInt)),
        [1, ids.length]
      );

      // Run model with attention output forced
      const output = await model({
        input_ids: inputIdsTensor,
        output_attentions: true
      });

      // output.attentions: array of layers, each [Batch, Heads, SeqLen, SeqLen]
      // We want Layer 0, Batch 0, Head 0
      const layerZero = output.attentions[0];
      const headZero = layerZero[0][0]; // [SeqLen, SeqLen]

      // Convert WebAssembly Tensor to standard JS array
      const attentionMatrix = headZero.toArray();

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