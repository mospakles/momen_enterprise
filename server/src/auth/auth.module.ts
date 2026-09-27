import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [AdminAuthModule, CustomerAuthModule, RbacModule],
  exports: [AdminAuthModule, CustomerAuthModule, RbacModule],
})
export class AuthModule {}
