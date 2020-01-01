import { Permission, AccessControl } from 'accesscontrol';

export interface IRoles<Role> {
    roles?: Role[];
}

export interface IAclRule {
    req?: Permission;
    res?: Permission;
    check?: () => (boolean | Error) | Promise<boolean | Error>;
}

export interface IAclContext<R = any, User extends IRoles<R> = any> {
    user?: User;
}

export interface IAclCheckOptions<Data = any, Source = any, Context extends IAclContext = any> {
    id: string;
    context: Context;
    data?: Data;
    sourceData?: Source;
    message?: string;
    [key: string]: any;
}

export interface IAclRulesCreatorOptions<Data = any, Source = any, Context extends IAclContext = any>
    extends IAclCheckOptions<Data, Source, Context> {
    rolesBuilder: AccessControl;
}

export type AclRulesCreator<Data = any, Source = any, Context extends IAclContext = any> = (
    options: IAclRulesCreatorOptions<Data, Source, Context>
) => IAclRule[] | Promise<IAclRule[]>;
