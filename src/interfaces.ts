import { AccessControl, Permission } from 'accesscontrol';

/**
 * The options of the module
 */
export interface AclModuleOptions {
    /**
     * Will reject the check if no rule creator found or if the creator returns no rule
     */
    rejectIfNoRule?: boolean
}

/**
 * The interface of the entity implementing roles. Usually this is your user entity
 */
export interface AclRoles<Role> {
    roles?: Role[];
}

export type CheckReturnType = (boolean | Error | undefined) | Promise<(boolean | Error | undefined)>;

/**
 * An Acl Rule
 */
export interface AclRule {
    req?: Permission;
    res?: Permission;
    check?: () => CheckReturnType;
}

/**
 * The context of a request
 */
export interface AclContext<R = any, User extends AclRoles<R> = any> {
    user?: User;
}

/**
 * The options to pass to the checker
 */
export interface AclCheckOptions<Data = any, Source = any, Context extends AclContext = any> {
    /**
     * The id of the rule
     */
    id: string;

    /**
     * The context
     */
    context: Context;

    /**
     * The data to check
     */
    data?: Data;

    /**
     * The source data, used to represent the data that are modified
     */
    sourceData?: Source;

    /**
     * A custom message to pass to the ForbiddenException
     */
    message?: string;

    /**
     * Will reject the check if no rule creator found or if the creator returns no rule
     */
    rejectIfNoRule?: boolean;

    /**
     * Any other key/value you want to pass to the checker, those options will be readable in the rule creator function
     */
    [key: string]: any;
}

/**
 * Th options the checker will receive as argument
 */
export interface AclRulesCreatorOptions<Data = any, Source = any, Context extends AclContext = any>
    extends AclCheckOptions<Data, Source, Context> {
    rolesBuilder: AccessControl;
}

/**
 * The signature of a acl rule creator
 */
export type AclRulesCreator<Data = any, Source = any, Context extends AclContext = any> = (
    options: AclRulesCreatorOptions<Data, Source, Context>
) => AclRule[] | Promise<AclRule[]>;
