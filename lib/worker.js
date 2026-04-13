import { pipeline, env } from '@xenova/transformers';

// Skip local model check - we want to load from Hugging Face
env.allowLocalModels = false;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    try {
      // Initialize the pipeline with distilgpt2 model
      const extractor = await pipeline('feature-extraction', 'distilgpt2');

      self.postMessage({
        type: 'ready',
        status: 'Model Ready!'
      });

      // Keep the worker alive and ready for tokenization requests
      self.onmessage = async (event) => {
        const { type, payload } = event.data;

        if (type === 'tokenize') {
          try {
            const output = await extractor(payload.text, {
              pooling: 'mean',
              normalize: true
            });

            self.postMessage({
              type: 'tokens',
              data: output
            });
          } catch (error) {
            self.postMessage({
              type: 'error',
              error: error.message
            });
          }
        }
      };
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};
