import { request, type APIRequestContext } from '@playwright/test';
import jsonwebtoken from 'jsonwebtoken';
import { awsSecretsManager } from '../aws';
import { appDb } from '../database/app-db';
import { myUsers } from '../utilities';
import { utilities as automationUtilities } from '../utilities/utilities';
import tokenPayload from './jwt-payload.json' with { type: 'json' };

interface JwtUserDetails {
    DIRECTORY_KEY: string | number;
    SCRTY_SVC_USER_ID: string | number;
    PRSN_SEQ_NUM: string | number;
    ORG_SEQ_NUM: string | number;
    XTRNL_PRSN_RLTN_LKUP_CODE: string | number;
    LAST_NAME: string;
    FIRST_NAME: string;
}

interface JwtSecret {
    password: string;
}

export class JWT {
    jwtSecretKey = 'your_app/xxx-jwt';

    /** Helper Functions */

    /**
     * Creates an APIRequestContext with an authorization header containing a token for the given user.
     * The context can then be used to make API requests
     * @deprecated Please use the function other functions
     * @param user the user to authenticate
     * @returns - a request context containing the bearer token for the user
     */
    async getRequestContextWithToken(user: string): Promise<APIRequestContext> {
        const token = await this.getJwtForUser(user);

        return request.newContext({
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    /**
     * Generate a JWT token for the given user
     * @param user
     * @returns jwt token
     */
    async getJwtForUser(user: string): Promise<string> {
        const data: Record<string, unknown> = tokenPayload;
        const secretObj = await awsSecretsManager.getSecretFromAws(
            automationUtilities.requireEnv('SECRET_ROLE_ARN'),
            `${automationUtilities.requireEnv('AWS_ENV')}/${this.jwtSecretKey}`,
        );

        const userDetails = await this.getDetailsForToken(user);

        data.sub = userDetails.DIRECTORY_KEY;
        data.ssui = userDetails.SCRTY_SVC_USER_ID;
        data.psn = userDetails.PRSN_SEQ_NUM;
        data.org = userDetails.ORG_SEQ_NUM;
        data.xpr = userDetails.XTRNL_PRSN_RLTN_LKUP_CODE;
        data.dun = `${userDetails.LAST_NAME}, ${userDetails.FIRST_NAME}`;

        try {
            const secret: JwtSecret = JSON.parse(secretObj);
            return jsonwebtoken.sign(data, secret.password);
        } catch (error) {
            const message = error instanceof Error ? `${error.message}, ${error.stack}` : String(error);
            throw new Error(`Unable to generate a JWT for ${user}: ${message}`);
        }
    }

    /**
     * Get user details for JWT from database
     * @param user
     * @returns - sql query result
     * @throws user not found error
     */
    async getDetailsForToken(user: string): Promise<JwtUserDetails> {
        const scrtySvcId = myUsers.getScrtySvcId(user);

        const sql = `
        select p.directory_key,
        p.scrty_svc_user_id,
        p.prsn_seq_num,
        p.last_name,
        p.first_name,
        p.XTRNL_PRSN_RLTN_LKUP_CODE,
        o.org_seq_num,
        o.jde_fcc_high_lvl_org_seq_num
        from person_active_vw p
        left join org o on o.org_seq_num = p.org_seq_num
        where scrty_svc_user_id = '${scrtySvcId}'`;

        const result = await appDb.runQuery<unknown>(sql);
        if (result.length > 0 && this.isJwtUserDetails(result[0])) {
            return result[0];
        } else {
            throw new Error(`${user} not found in the database`);
        }
    }

    private isJwtUserDetails(value: unknown): value is JwtUserDetails {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const row = value as Record<string, unknown>;
        return (
            this.isStringOrNumber(row.DIRECTORY_KEY) &&
            this.isStringOrNumber(row.SCRTY_SVC_USER_ID) &&
            this.isStringOrNumber(row.PRSN_SEQ_NUM) &&
            this.isStringOrNumber(row.ORG_SEQ_NUM) &&
            this.isStringOrNumber(row.XTRNL_PRSN_RLTN_LKUP_CODE) &&
            typeof row.LAST_NAME === 'string' &&
            typeof row.FIRST_NAME === 'string'
        );
    }

    private isStringOrNumber(value: unknown): value is string | number {
        return typeof value === 'string' || typeof value === 'number';
    }
}
