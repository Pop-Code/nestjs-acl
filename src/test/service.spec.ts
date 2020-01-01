// tslint:disable-next-line:no-implicit-dependencies
import { Test, TestingModule } from '@nestjs/testing';
import { AclModule } from '../module';
import { AclService } from '../service';
import { initAcl } from './acl';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessControl } from 'accesscontrol';

let mod: TestingModule;
let service: AclService;
beforeAll(async () => {
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
    mod = await Test.createTestingModule({
        imports: [AclModule.register(roleBuilder)]
    }).compile();
    service = mod.get<AclService>(AclService);
    initAcl(service);
});

describe('AclService', () => {
    it('should has a role builder', () => {
        const rb = service.getRolesBuilder();
        expect(rb).toBeInstanceOf(AccessControl);
    });
    it('should set/get a global option', async () => {
        const rb = service.getRolesBuilder();
        service.setGlobalOptions({
            foo: 'bar'
        });
        service.registerRules('canReadGlobalOptions', opts => {
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
            service.registerRules('ruleWithCustomError', opts => {
                return [
                    {
                        req: service
                            .getRolesBuilder()
                            .can('ADMIN')
                            .createAny('Something'),
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
                expect(e.message.message).toContain('Custom error message');
            }
        });
    });
});
