import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  controllers: [RolesController, AdminUsersController],
  providers: [RolesService, AdminUsersService],
  exports: [RolesService, AdminUsersService],
})
export class RbacModule {}
