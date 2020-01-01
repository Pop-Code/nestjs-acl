import { ROLES_BUILDER_TOKEN } from './constants';
import { Inject } from '@nestjs/common';

/**
 * A nestjs param decorator to inject the role builder instance into providers
 */
export function InjectRolesBuilder() {
    return Inject(ROLES_BUILDER_TOKEN);
}
