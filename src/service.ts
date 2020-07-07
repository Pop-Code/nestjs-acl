import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { AccessControl } from 'accesscontrol';
import Debug from 'debug';

import { InjectOptions, InjectRolesBuilder } from './decorators';
import { AclCheckOptions, AclModuleOptions, AclRule, AclRulesCreator } from './interfaces';

@Injectable()
export class AclService {
    /**
     * The log function
     */
    protected log = Debug('acl:' + AclService.name);

    /**
     * A Map of AclRules
     */
    protected rules: Map<string, AclRulesCreator> = new Map();


    constructor(@InjectRolesBuilder() protected readonly rolesBuilder: AccessControl, @InjectOptions() protected options: AclModuleOptions){
        this.globalOptions.rejectIfNoRule = options.rejectIfNoRule;
    }

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
    protected globalOptions: AclModuleOptions & { [key: string]: any } = {};

    /**
     * Set the global options
     * @see globalOptions
     */
    setGlobalOptions(globalOptions: AclModuleOptions & { [key: string]: any }) {
        this.globalOptions = Object.assign({}, this.options, globalOptions);
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
    async check<D = any, S = any>(options: AclCheckOptions<D, S>): Promise<{ rule?: AclRule; data?: D }> {
        
        const opts = {
            ...this.globalOptions,
            ...options,
            rolesBuilder: this.rolesBuilder
        };
        const log = this.log.extend(opts.id);
        log('Check rule creator');
        const rulesCreator = this.rules.get(opts.id);
        let rules: AclRule[] = [];
        try {
            if (!rulesCreator) {
                this.log('No rule creator found');
                if(opts.rejectIfNoRule){
                    throw new ForbiddenException(`No acl rule creator found for "${opts.id}" context`);
                }
                return { data: opts.data };
            }
            rules = await rulesCreator(opts);
            log('Creator returns %d rule(s)', rules.length);
            if(rules.length === 0 && opts.rejectIfNoRule){
                log('Fail, creator did not return any rule');
                throw new ForbiddenException(`Acl creator did not return any acl rule for "${opts.id}" context`);
            }
        } catch (e) {
            log('Error %o', e);
            if (!(e instanceof HttpException)) {
                throw new ForbiddenException(e.message);
            }
            throw e;
        }

        const errors: Error[] = [];
        let rule: AclRule;
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
     * Check if an AclRule is valid
     */
    protected async isValidRule(rule: AclRule) {
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
