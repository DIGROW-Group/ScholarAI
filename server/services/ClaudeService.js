const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  }

  async generateResponse(systemPrompt, messages, maxTokens = 4096) {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages
      });

      return {
        content: response.content[0].text,
        usage: response.usage,
        stopReason: response.stop_reason
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Claude API failed: ${error.message}`);
    }
  }

  async streamResponse(systemPrompt, messages, onChunk) {
    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          onChunk(chunk.delta.text);
        }
      }

      const finalMessage = await stream.finalMessage();
      return {
        content: finalMessage.content[0].text,
        usage: finalMessage.usage
      };
    } catch (error) {
      console.error('Claude Streaming Error:', error);
      throw new Error(`Claude streaming failed: ${error.message}`);
    }
  }
}

module.exports = new ClaudeService();

