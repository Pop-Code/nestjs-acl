import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { AccessControl } from 'accesscontrol';
import Debug from 'debug';

import { InjectRolesBuilder } from './decorators';
import { AclRulesCreator, IAclCheckOptions, IAclRule } from './interfaces';

@Injectable()
export class AclService {
    /**
     * The log function
     */
    protected log = Debug('acl:' + AclService.name);

    /**
     * A Map of IAclRules
     */
    protected rules: Map<string, AclRulesCreator> = new Map();

    constructor(@InjectRolesBuilder() protected readonly rolesBuilder: AccessControl) { }

    /**
     * Get the role builder instance
     */
    getRolesBuilder() {
        return this.rolesBuilder;
    }

    /**
     * A key/value pair object of the global options to pass to rule creator during check.
     * All rules would be able to read those object keys
     */
    protected globalOptions: { [key: string]: any } = {};

    /**
     * Set the global options
     * @see globalOptions
     */
    setGlobalOptions(globalOptions: { [key: string]: any }) {
        this.globalOptions = globalOptions;
    }

    /**
     * Register an AclRulesCreator
     * @param id The id of this rules creator
     * @param creator The creator function
     */
    registerRules(id: string, creator: AclRulesCreator): AclService {
        this.log('Register acl rule %s', id);
        this.rules.set(id, creator);
        return this;
    }

    /**
     * This method will check that each rules returned are granted.
     * @throws Error|ForbiddenException If access is not granted
     */
    async check<D = any, S = any>(options: IAclCheckOptions<D, S>): Promise<{ rule?: IAclRule; data?: D }> {
        const log = this.log.extend(options.id);
        log('Check rule creator');
        const rulesCreator = this.rules.get(options.id);
        if (!rulesCreator) {
            this.log('No rule creator found');
            return { data: options.data };
        }
        let rules: IAclRule[] = [];
        try {
            rules = await rulesCreator({
                ...this.globalOptions,
                ...options,
                rolesBuilder: this.rolesBuilder
            });
            log('Creator returns %d rule(s)', rules.length);
        } catch (e) {
            log('Error %o', e);
            if (!(e instanceof HttpException)) {
                throw new ForbiddenException(e.message);
            }
            throw e;
        }

        const errors: Error[] = [];
        let rule: IAclRule;
        for (const [index, r] of rules.entries()) {
            log('Check rule at index %d', index);
            const isValid = await this.isValidRule(r);
            if (isValid === true) {
                log('Valid rule found at index %s', index);
                rule = r;
                break;
            } else if (isValid instanceof Error) {
                log('Invalid rule with custom message error found at index %s %s', index, isValid);
                errors.push(isValid);
                break;
            }
        }

        if (!rule) {
            log('Fail, creator did not return any valid rule');
            if (errors.length && !options.message) {
                options.message = errors.map((e) => e.message).join(', ');
            }
            throw new ForbiddenException(options.message);
        }

        log('Success');

        return { rule, data: options.data };
    }

    /**
     * Check if an IAclRule is valid
     */
    protected async isValidRule(rule: IAclRule) {
        if (!rule.req.granted) {
            return false;
        }
        if (!rule.check) {
            return true;
        }
        const valid = await rule.check();
        if (valid === true) {
            return true;
        }
        return valid;
    }
}
