interface TestUser {
    username: string;
    internalUser: boolean;
    passwordName: string;
    [property: string]: unknown;
}

export const users: Record<string, TestUser> = {
    YOUR_USERNAME: {
        username: 'username',
        internalUser: true,
        passwordName: 'xxxxx',
    },
};
