import { Module, Global, DynamicModule } from '@nestjs/common';
import { AclService } from './service';
import { AccessControl } from 'accesscontrol';
import { ROLES_BUILDER_TOKEN } from './constants';

/**
 * The AclModule will do 2 things
 * 1. He will check acl depending on user roles
 * 2. He will check acl depending on custom rules
 */
@Global()
@Module({})
export class AclModule {
    /**
     * Register the AclModule.
     */
    static async register(roles: AccessControl): Promise<DynamicModule> {
        const rolesBuilderProvider = {
            provide: ROLES_BUILDER_TOKEN,
            useValue: roles
        };
        return {
            module: AclModule,
            providers: [rolesBuilderProvider, AclService],
            exports: [rolesBuilderProvider, AclService]
        };
    }
}
