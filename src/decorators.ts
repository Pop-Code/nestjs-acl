import { Inject } from '@nestjs/common';

import { OPTIONS_TOKEN, ROLES_BUILDER_TOKEN } from './constants';

/**
 * A nestjs param decorator to inject the role builder instance into providers
 */
export function InjectRolesBuilder() {
    return Inject(ROLES_BUILDER_TOKEN);
}

/**
 * A nestjs param decorator to inject the options into providers
 */
export function InjectOptions() {
    return Inject(OPTIONS_TOKEN);
}
