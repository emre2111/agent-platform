import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators";
import { RequestUser } from "../common/types";
import { ProviderConnectionsService } from "./provider-connections.service";

@Controller("provider-connections")
@UseGuards(JwtAuthGuard)
export class ProviderConnectionsController {
  constructor(
    private readonly providerConnectionsService: ProviderConnectionsService,
  ) {}

  @Post()
  create(@Body() payload: unknown, @CurrentUser() user: RequestUser) {
    return this.providerConnectionsService.createForUser(payload, user.userId);
  }
}
