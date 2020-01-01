import { UnauthorizedException } from '@nestjs/common';
import { AclService } from '../service';
import { AclRulesCreator, IAclRulesCreatorOptions } from '../interfaces';

export function initAcl(service: AclService) {
    service.registerRules('canDoSomething', canDoSomething);
}

export const canDoSomething: AclRulesCreator = (opts: IAclRulesCreatorOptions) => {
    const {
        context: { user },
        rolesBuilder,
        data
    } = opts;

    if (!user) {
        throw new UnauthorizedException();
    }

    return [
        {
            req: rolesBuilder.can(user.roles).createAny('Something')
        },
        {
            req: rolesBuilder.can(user.roles).createOwn('Something'),
            check: () => user.id === data.userId
        },
        {
            req: rolesBuilder.can(user.roles).createOwn('SomethingError'),
            check: () => new Error('custom error')
        }
    ];
};
