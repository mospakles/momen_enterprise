import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MediaAssetsService } from './media-assets.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { mediaMulterOptions } from './media-storage.config';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';
import { CreateExternalMediaDto } from './dto/create-external-media.dto';

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly service: MediaAssetsService) {}

  @Get()
  @Permissions('content', 'view')
  findAll(@Query('folder') folder?: string) {
    return this.service.findAll(folder);
  }

  @Post()
  @Permissions('content', 'create')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', mediaMulterOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.service.create(file, dto.folder, dto.alt, user.id, user.name);
  }

  @Post('external')
  @Permissions('content', 'create')
  createExternal(
    @Body() dto: CreateExternalMediaDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.service.createExternal(dto, user.id, user.name);
  }

  @Delete(':id')
  @Permissions('content', 'delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
