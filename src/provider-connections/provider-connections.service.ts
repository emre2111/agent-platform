import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Agent } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { CryptoService } from "../crypto/crypto.service";
import { createProviderConnectionSchema } from "./dto/create-provider-connection.schema";

type ProviderConnectionSafeDto = {
  id: string;
  provider: string;
  keyHint: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProviderConnectionsService {
  private readonly logger = new Logger(ProviderConnectionsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly crypto: CryptoService,
  ) {}

  async createForUser(
    payload: unknown,
    userId: string,
  ): Promise<ProviderConnectionSafeDto> {
    const parsed = createProviderConnectionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid provider connection payload",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { provider, apiKey } = parsed.data;
    const encryptedApiKey = this.crypto.encrypt(apiKey);
    const keyHint = this.crypto.fingerprint(apiKey);

    const connection = await this.db.$transaction(async (tx) => {
      const existing = await tx.providerConnection.findFirst({
        where: { userId, provider },
        orderBy: { createdAt: "asc" },
      });

      if (existing) {
        return tx.providerConnection.update({
          where: { id: existing.id },
          data: {
            encryptedApiKey,
            keyHint,
            isActive: true,
          },
        });
      }

      return tx.providerConnection.create({
        data: {
          userId,
          provider,
          encryptedApiKey,
          keyHint,
          isActive: true,
        },
      });
    });

    return {
      id: connection.id,
      provider: connection.provider,
      keyHint: connection.keyHint,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Resolves an execution API key for an agent.
   *
   * If no provider connection is configured, returns null so callers can
   * gracefully fall back to legacy credential resolution.
   */
  async getDecryptedKeyForAgent(
    agent: Pick<
      Agent,
      "id" | "ownerId" | "modelProvider" | "providerConnectionId"
    >,
  ): Promise<string | null> {
    if (!agent.providerConnectionId) {
      return null;
    }

    const connection = await this.db.providerConnection.findFirst({
      where: {
        id: agent.providerConnectionId,
        userId: agent.ownerId,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        encryptedApiKey: true,
      },
    });

    if (!connection) {
      this.logger.warn(
        `Agent ${agent.id} has invalid or inactive provider connection; falling back`,
      );
      return null;
    }

    if (connection.provider !== agent.modelProvider) {
      this.logger.warn(
        `Agent ${agent.id} provider mismatch (agent=${agent.modelProvider}, connection=${connection.provider}); falling back`,
      );
      return null;
    }

    try {
      return this.crypto.decrypt(connection.encryptedApiKey);
    } catch {
      this.logger.error(
        `Failed to decrypt provider connection key for agent ${agent.id}`,
      );
      throw new InternalServerErrorException(
        "Provider connection could not be decrypted",
      );
    }
  }
}
