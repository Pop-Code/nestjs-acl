import { DynamicModule, Global, Module } from '@nestjs/common';
import { AccessControl } from 'accesscontrol';

import { OPTIONS_TOKEN, ROLES_BUILDER_TOKEN } from './constants';
import { AclModuleOptions } from './interfaces';
import { AclService } from './service';

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
    static async register(roles: AccessControl, options: AclModuleOptions = {}): Promise<DynamicModule> {
        const rolesBuilderProvider = {
            provide: ROLES_BUILDER_TOKEN,
            useValue: roles
        };
        const optionsProvider = {
            provide: OPTIONS_TOKEN,
            useValue: options
        };

        return {
            module: AclModule,
            providers: [rolesBuilderProvider, optionsProvider, AclService],
            exports: [rolesBuilderProvider, optionsProvider, AclService]
        };
    }
}
