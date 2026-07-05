import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence } from '@langchain/core/runnables';
import { AIService } from './ai.service';

describe('AIService', () => {
  const createMockConfig = (
    values: Record<string, string | undefined> = {},
  ): ConfigService =>
    ({
      get: jest.fn((key: string, defaultValue?: string) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          return values[key];
        }
        return defaultValue;
      }),
    }) as unknown as ConfigService;

  const createService = async (
    configValues: Record<string, string | undefined> = {},
  ): Promise<AIService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: createMockConfig(configValues),
        },
      ],
    }).compile();

    return module.get<AIService>(AIService);
  };

  const enableLiveChainMode = (
    service: AIService,
    invoke: jest.Mock = jest.fn().mockResolvedValue('AI generated summary'),
  ): jest.Mock => {
    const internal = service as unknown as {
      useMockSummary: boolean;
      llm: object;
      summarizationChain: { invoke: jest.Mock };
    };
    internal.useMockSummary = false;
    internal.llm = {};
    internal.summarizationChain = { invoke };
    return invoke;
  };

  describe('initialization', () => {
    it('should use mock summaries when AI_PROVIDER is unknown', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      const summary = await service.summarizeDocument('hello world', 'topic');

      expect(summary).toContain('[Mock Query Summary]');
      expect(summary).toContain('AI summarization is disabled');
    });

    it('should use mock summaries when GROQ_API_KEY is missing or placeholder', async () => {
      const service = await createService({
        AI_PROVIDER: 'groq',
        GROQ_API_KEY: 'your-groq-api-key-here',
      });
      const summary = await service.generateSummary('one two three');

      expect(summary).toContain('[Mock Summary]');
      expect(summary).toContain('approximately 3 words');
    });

    it('should initialize without throwing when mock mode is active', async () => {
      await expect(
        createService({ AI_PROVIDER: 'invalid-provider' }),
      ).resolves.toBeDefined();
    });
  });

  describe('summarizeDocument', () => {
    it('should return a mock query summary when useMockSummary is true', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });

      const result = await service.summarizeDocument(
        'alpha beta',
        'key points',
      );

      expect(result).toMatch(/^\[Mock Query Summary\]/);
      expect(result).toContain('approximately 2 words');
    });

    it('should include the user query in the mock summary', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });

      const result = await service.summarizeDocument(
        'content',
        'quarterly revenue',
      );

      expect(result).toContain('Query: "quarterly revenue"');
    });

    it('should invoke summarizationChain when not in mock mode', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      const invoke = enableLiveChainMode(service);
      invoke.mockResolvedValue('Chain summary result');

      const result = await service.summarizeDocument('short doc', 'overview');

      expect(invoke).toHaveBeenCalledWith({
        query: 'overview',
        content: 'short doc',
      });
      expect(result).toBe('Chain summary result');
    });

    it('should truncate content longer than 8000 characters before invoking chain', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      const invoke = enableLiveChainMode(service);
      const longContent = 'x'.repeat(8001);

      await service.summarizeDocument(longContent, 'q');

      expect(invoke).toHaveBeenCalledWith({
        query: 'q',
        content: 'x'.repeat(8000) + '...',
      });
    });

    it('should throw "Failed to generate summary" when chain invoke fails', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      const invoke = enableLiveChainMode(service);
      invoke.mockRejectedValue(new Error('API unavailable'));

      await expect(
        service.summarizeDocument('content', 'query'),
      ).rejects.toThrow('Failed to generate summary');
    });
  });

  describe('generateSummary', () => {
    it('should return a mock summary when useMockSummary is true', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });

      const result = await service.generateSummary('hello world test');

      expect(result).toMatch(/^\[Mock Summary\]/);
    });

    it('should include word count and content preview in mock summary', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      const content = 'a'.repeat(250);

      const result = await service.generateSummary(content);

      expect(result).toContain('approximately 1 words');
      expect(result).toContain('Preview: "' + 'a'.repeat(200));
      expect(result).toContain('..."');
    });

    it('should invoke LLM chain when not in mock mode', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      enableLiveChainMode(service);
      const invoke = jest.fn().mockResolvedValue('Generated summary');
      jest.spyOn(RunnableSequence, 'from').mockReturnValue({
        invoke,
      } as unknown as RunnableSequence);

      const result = await service.generateSummary('document body');

      expect(RunnableSequence.from).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith({ content: 'document body' });
      expect(result).toBe('Generated summary');

      jest.restoreAllMocks();
    });

    it('should truncate content longer than 8000 characters before invoking chain', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      enableLiveChainMode(service);
      const invoke = jest.fn().mockResolvedValue('ok');
      jest.spyOn(RunnableSequence, 'from').mockReturnValue({
        invoke,
      } as unknown as RunnableSequence);
      const longContent = 'y'.repeat(9000);

      await service.generateSummary(longContent);

      expect(invoke).toHaveBeenCalledWith({
        content: 'y'.repeat(8000) + '...',
      });

      jest.restoreAllMocks();
    });

    it('should throw "Failed to generate summary" when chain invoke fails', async () => {
      const service = await createService({ AI_PROVIDER: 'unknown' });
      enableLiveChainMode(service);
      jest.spyOn(RunnableSequence, 'from').mockReturnValue({
        invoke: jest.fn().mockRejectedValue(new Error('rate limited')),
      } as unknown as RunnableSequence);

      await expect(service.generateSummary('content')).rejects.toThrow(
        'Failed to generate summary',
      );

      jest.restoreAllMocks();
    });
  });
});
