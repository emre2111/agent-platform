import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SenderType } from '@prisma/client';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser } from '../common/decorators';
import { RequestUser } from '../common/types';
import { InterventionDto } from './dto/intervention.dto';

@Controller('workspaces/:workspaceId/rooms/:roomId/messages')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.listByRoom(roomId, cursor, limit);
  }

  @Post('intervene')
  intervene(
    @Param('roomId') roomId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: InterventionDto,
  ) {
    return this.messagesService.create({
      roomId,
      senderType: SenderType.USER,
      senderUserId: user.userId,
      turnNumber: dto.turnNumber,
      content: dto.content,
    });
  }
}
