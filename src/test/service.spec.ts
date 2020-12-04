import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessControl } from 'accesscontrol';

import { AclRulesCreator, AclRulesCreatorOptions } from '../interfaces';
import { AclModule } from '../module';
import { AclService } from '../service';

export const canDoSomething: AclRulesCreator = (opts: AclRulesCreatorOptions) => {
    const {
        context: { user },
        rolesBuilder,
        data
    } = opts;

    if (user === undefined) {
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

export const creatorWithNoRule: AclRulesCreator = () => {
    return [];
}


let mod: TestingModule;
let service: AclService;
const roleBuilder = new AccessControl({
    USER: {
        Something: {
            'create:own': ['*']
        }
    },
    ADMIN: {
        Something: {
            'create:any': ['*']
        }
    }
});



describe('AclService', () => {
    beforeAll(async () => {    
        mod = await Test.createTestingModule({
            imports: [AclModule.register(roleBuilder)]
        }).compile();
        service = mod.get<AclService>(AclService);
        service.registerRules('canDoSomething', canDoSomething);
        service.registerRules('creatorWithNoRule', creatorWithNoRule);
    });
    it('should has a role builder', () => {
        const rb = service.getRolesBuilder();
        expect(rb).toBeInstanceOf(AccessControl);
    });
    it('should set/get a global option', async () => {
        const rb = service.getRolesBuilder();
        service.setGlobalOptions({
            foo: 'bar'
        });
        service.registerRules('canReadGlobalOptions', (opts) => {
            expect(opts).toHaveProperty('foo');
            expect(opts.foo).toBe('bar');
            return [
                {
                    req: rb.can('ADMIN').createAny('Something')
                }
            ];
        });
        const data = { foo: 'bar' };
        const response = await service.check({
            id: 'canReadGlobalOptions',
            context: {},
            data
        });
        expect(response.data).toEqual(data);
        expect(response.rule).toBeDefined();
    });
    describe('Checker', () => {
        it('should pass the checker for a missing acl rule', async () => {
            const data = { foo: 'bar' };
            const response = await service.check({
                id: 'a_missing_key',
                data,
                context: {
                    user: {
                        roles: ['USER']
                    }
                }
            });
            expect(response.data).toEqual(data);
            expect(response.rule).toBeUndefined();
        });
        it('should pass the checker for an existing acl rule', async () => {
            const data = { foo: 'bar', userId: 'test' };
            const response = await service.check({
                id: 'canDoSomething',
                data,
                context: {
                    user: {
                        id: 'test',
                        roles: ['USER']
                    }
                }
            });
            expect(response.data).toEqual(data);
            expect(response.rule).toBeDefined();
        });
        it('should pass the checker cause user have access', async () => {
            const data = { foo: 'bar', userId: 'test' };
            const response = await service.check({
                id: 'canDoSomething',
                data,
                context: {
                    user: {
                        id: 'test',
                        roles: ['USER']
                    }
                }
            });
            expect(response.data).toEqual(data);
            expect(response.rule).toBeDefined();
        });
        it('should pass the checker cause user have access but is not the owner', async () => {
            const data = { foo: 'bar', userId: 'test' };
            const response = await service.check({
                id: 'canDoSomething',
                data,
                context: {
                    user: {
                        id: 'test2',
                        roles: ['ADMIN']
                    }
                }
            });
            expect(response.data).toEqual(data);
            expect(response.rule).toBeDefined();
        });
        it('should not pass the checker cause user does not have access', async () => {
            const data = { foo: 'bar', userId: 'test' };
            await expect(
                service.check({
                    id: 'canDoSomething',
                    data,
                    context: {
                        user: {
                            id: 'test2',
                            roles: ['USER']
                        }
                    }
                })
            ).rejects.toThrow(ForbiddenException);
        });
        it('should not pass the checker cause user is missing', async () => {
            const data = { foo: 'bar', userId: 'test' };
            await expect(
                service.check({
                    id: 'canDoSomething',
                    data,
                    context: {}
                })
            ).rejects.toThrow(UnauthorizedException);
        });
        it('should not pass the checker cause user does not have any compatible role', async () => {
            const data = { foo: 'bar', userId: 'test' };
            await expect(
                service.check({
                    id: 'canDoSomething',
                    data,
                    context: {
                        user: {
                            id: 'test',
                            roles: ['DUMMY']
                        }
                    }
                })
            ).rejects.toThrow(ForbiddenException);
        });
        it('should not pass the checker with a custom error', async () => {
            service.registerRules('ruleWithCustomError', () => {
                return [
                    {
                        req: service.getRolesBuilder().can('ADMIN').createAny('Something'),
                        check: () => new Error('Custom error message')
                    }
                ];
            });
            expect.assertions(2);
            try {
                await service.check({
                    id: 'ruleWithCustomError',
                    context: {}
                });
            } catch (e) {
                expect(e).toBeInstanceOf(ForbiddenException);
                expect(e.message).toContain('Custom error message');
            }
        });
        it('should not pass the checker with a custom http error', async () => {
            const error = new ForbiddenException('Custom error message');
            service.registerRules('ruleWithCustomError', () => {
                return [
                    {
                        req: service.getRolesBuilder().can('ADMIN').createAny('Something'),
                        check: () => error
                    }
                ];
            });
            expect.assertions(3);
            try {
                await service.check({
                    id: 'ruleWithCustomError',
                    context: {}
                });
            } catch (e) {
                expect(e).toBeInstanceOf(ForbiddenException);
                expect(e).toStrictEqual(error);
                expect(e.message).toContain('Custom error message');
            }
        });
        it('should not pass the checker for a missing acl rule creator cause rejectIfNoRule is true', async () => {
            const data = { foo: 'bar' };
            await expect(service.check({
                id: 'creatorWithNoRule_rejectIfNoRule',
                data,
                rejectIfNoRule: true,
                context: {
                    user: {
                        roles: ['USER']
                    }
                }
            })).rejects.toThrow('No acl rule creator found for "creatorWithNoRule_rejectIfNoRule" context');
        });
        it('should not pass the checker for an acl rule creator returning no rule cause rejectIfNoRule is true', async () => {
            const data = { foo: 'bar' };
            await expect(service.check({
                id: 'creatorWithNoRule',
                data,
                rejectIfNoRule: true,
                context: {
                    user: {
                        roles: ['USER']
                    }
                }
            })).rejects.toThrow('Acl creator did not return any acl rule for "creatorWithNoRule" context');
        });
    });
});

describe('AclService with options', () => {
    beforeAll(async () => {
        mod = await Test.createTestingModule({
            imports: [AclModule.register(roleBuilder, {rejectIfNoRule: true})]
        }).compile();
        service = mod.get<AclService>(AclService);
        service = mod.get<AclService>(AclService);
        service.registerRules('canDoSomething', canDoSomething);
        service.registerRules('creatorWithNoRule_globalOptions', creatorWithNoRule);
    });
    describe('Checker', () => {
        it('should not pass the checker for a missing acl rule creator cause global option rejectIfNoRule is true', async () => {
            const data = { foo: 'bar' };
            await expect(service.check({
                id: 'creatorWithNoRule_rejectIfNoRule_globalOptions',
                data,
                context: {
                    user: {
                        roles: ['USER']
                    }
                }
            })).rejects.toThrow('No acl rule creator found for "creatorWithNoRule_rejectIfNoRule_globalOptions" context');
        });
        it('should not pass the checker for an acl rule creator returning no rule cause global option rejectIfNoRule is true', async () => {
            const data = { foo: 'bar' };
            await expect(service.check({
                id: 'creatorWithNoRule_globalOptions',
                data,
                context: {
                    user: {
                        roles: ['USER']
                    }
                }
            })).rejects.toThrow('Acl creator did not return any acl rule for "creatorWithNoRule_globalOptions" context');
        });
    });
})
