interface TestUser {
    userEmail: string;
    internalUser: boolean;
    [property: string]: unknown;
}

export const microsoftUsers: Record<string, TestUser> = {
    USER_NAME_EXAMPLE: {
        userEmail: 'user@email.com',
        internalUser: true,
    },
};
