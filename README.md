# Nestjs ACL

[![Actions Status](https://github.com/Pop-Code/nestjs-acl/workflows/CI/badge.svg)](https://github.com/Pop-Code/nestjs-acl/actions)
[![codecov](https://codecov.io/gh/Pop-Code/nestjs-acl/branch/master/graph/badge.svg)][codecov]
[![NPM Downloads](https://img.shields.io/npm/dm/nestjs-acl.svg?style=flat)][npmchart]
![node](https://img.shields.io/node/v/nestjs-acl)
![npm (tag)](https://img.shields.io/npm/v/nestjs-acl/latest)
![npm peer dependency version (scoped)](https://img.shields.io/npm/dependency-version/nestjs-console/peer/@nestjs/core)

## Why the nestjs-acl module?

The [nestjs-acl][npm] module purpose is to check several access rules at the same time, depending on the current context.  
It allows to store, manage and check scenarios of access rules and to check them at any time.

In our case, we needed to finely filter access to different types of resources for different types of users.
Because some scenarios are repetitive, it was important to store these rules without repeating tones of code lines.

[nestjs-acl][npm] does not replace the nest-access-control module, they are fully compatible and complementary.
nest-access-control is a module to protect methods using decorators. It also allows you to implement your own access logic using the Nestjs Guards, which covers most cases.

## Install

#### Using npm

`npm install nestjs-acl --save`

#### Using yarn

`yarn add nestjs-acl`

### Prepare the roles

Create a file that exports an AccessControl instance.
You can refer to the npm package [accesscontrol] to learn how to manipulate roles

_Note: The roles instance could be manipulate at runtime_

```ts
// roles.ts
import { AccessControl } from 'nestjs-acl';

// See npm package accesscontrol for details
export const roles = new AccessControl({
    ADMIN: {
        doSomething: {
            'create:any': ['*']
        },
        doSomethingElse: {
            'create:any': ['*']
        }
    },
    USER: {
        doSomething: {
            'create:own': ['*']
        }
    }
});
```

### Create and register AclRulesCreators

1. The AclService will search for matching AclRulesCreator and execute them passing the context.
2. If a AclRulesCreator is not found, the check passes (only if option rejectIfNoRule === false)
3. If a AclRulesCreator is found, The creator is executed. if option rejectIfNoRule === true and no rule was returned by the creator, the check will fail.
4. Returned Rules from AclRulesCreator are tested
    - The first rule that is granted will validate the test.
    - The first rule that throw an Error will stop the chain and invalidate the test.
    - Rules returning false are ignored
    - Rules returning Error are concatenated, returned as a single Error if no granted rule was found

```ts
// rules.ts

/**
 * Based on roles
 * users with the USER role will pass this scenarios only if they own the data (check returns true)
 * users with the ADMIN role will pass this scenarios
 */
export const userCanDoSomething = (opts) => {
    const {
        context: { user }, // the context passed to the test
        data, // the data passed to the test
        sourceData // the source data passed to the test
    } = opts;
    return [
        // rule 1
        {
            req: opts.rolesBuilder.can(opts.context.user.roles).createOwn('doSomething'),
            // do an extra check if with context
            check: () => opts.data.user === context.user
        },
        // rule 2
        {
            req: opts.rolesBuilder.can(opts.context.user.roles).createAny('doSomething')
        }
    ];
};

/**
 * Based on roles, only users with ADMIN role will be ale to pass this scenarios
 */
export const userCanDoSomethingElse = (opts) => {
    return [
        {
            req: opts.rolesBuilder.can(opts.context.user.roles).createAny('doSomethingElse')
        }
    ];
};
```

### Import and register the AclModule module

The AclModule is global and need to be registered once, imported modules can inject the AclService without the need to register the module again.

```ts
// mymodule.ts
import { AclModule, AclService } from 'nestjs-acl';
import { roles } from './roles';
import { userCanDoSomething, userCanDoSomethingElse } from './rules';
import { MyProvider } from './provider';

@Module({
    imports: [AclModule.register(roles), MyProvider]
})
export class MyModule {
    construtor(protected acl: AclService) {
        // register acl rules creators
        this.acl
            .registerRules('userCanDoSomething', userCanDoSomething)
            .registerRules('userCanDoSomethingElse', userCanDoSomethingElse);
    }
}
```

### Using the AclService

In your modules, providers or controllers you can now inject the AclService instance and use it to check acl rules.

```ts
// myprovider.ts
import { Injectable } from '@nestjs/common';
import { AclService } from 'nestjs-acl';

@Injectable()
export class MyProvider {
    constructor(protected acl: AclService) {}

    /**
     * This method is protected by a rule with id userCanDoSomething
     */
    async doSomething(user: AclRoles<string>) {
        const data = { foo: 'bar', user };

        // The AclService will throw a ForbiddenException if the check fails.
        const { rule, data } = await this.acl.check({
            id: 'userCanDoSomething',
            data,
            context: {
                user: {
                    roles: user.roles
                }
            }
        });

        // Do something...
    }

    /**
     * This method is protected by a rule with id userCanDoSomethingElse
     */
    async doSomethingElse(user: AclRoles<string>) {
        const { rule, data } = await this.acl.check({
            id: 'userCanDoSomethingElse',
            context: {
                user: {
                    roles: user.roles
                }
            }
        });

        // Do something else...
    }
}
```

### [API DOCUMENTATION][doclink]

[npm]: https://www.npmjs.com/package/nestjs-acl
[npmchart]: https://npmcharts.com/compare/nestjs-acl?minimal=true
[ci]: https://circleci.com/gh/Pop-Code/nestjs-acl
[codecov]: https://codecov.io/gh/Pop-Code/nestjs-acl
[doclink]: https://pop-code.github.io/nestjs-acl
[accesscontrol]: https://www.npmjs.com/package/commander
