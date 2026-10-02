import { createDecipheriv, webcrypto } from 'node:crypto';

/**
 * Utility for encrypting and decrypting data.
 */
class EncryptData {
    private readonly key = Buffer.from('YOUR_KEY', 'base64');
    private readonly legacyIv = Buffer.from('YOUR_IV', 'base64');
    private readonly ivLength = 12;
    private readonly encoder = new TextEncoder();
    private readonly decoder = new TextDecoder();

    /**
     * Encrypts a string using AES-GCM and returns the encrypted base64 value.
     *
     * @param dataToEncrypt - The plain text value to encrypt.
     * @returns The encrypted base64 value.
     * @throws Error if encryption fails.
     */
    async encrypt(dataToEncrypt: string): Promise<string> {
        try {
            const iv = webcrypto.getRandomValues(new Uint8Array(this.ivLength));
            const keyBytes = new Uint8Array(this.key);
            const cryptoKey = await webcrypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);

            const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, this.encoder.encode(dataToEncrypt));
            const encryptedBytes = new Uint8Array(encrypted);
            const payload = new Uint8Array(iv.length + encryptedBytes.length);
            payload.set(iv, 0);
            payload.set(encryptedBytes, iv.length);

            return Buffer.from(payload).toString('base64');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Encryption failed. The error message returned is ${message}`);
        }
    }

    /**
     * Decrypts current AES-GCM/base64 and legacy AES-256-CBC/hex encrypted values.
     *
     * @param encryptedData - The encrypted base64 value to decrypt.
     * @returns The decrypted string.
     * @throws Error if decryption fails.
     */
    async decrypt(encryptedData: string): Promise<string> {
        try {
            if (/^(?:[0-9a-f]{32})+$/i.test(encryptedData)) {
                const decipher = createDecipheriv('aes-256-cbc', this.key, this.legacyIv);
                return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
            }

            const data = Buffer.from(encryptedData, 'base64');
            const iv = data.subarray(0, this.ivLength);
            const encrypted = data.subarray(this.ivLength);
            const keyBytes = new Uint8Array(this.key);

            const cryptoKey = await webcrypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);

            const decrypted = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);

            return this.decoder.decode(decrypted);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Decryption failed. The error message returned is ${message}`);
        }
    }
}

export const encryptDecrypt = new EncryptData();
