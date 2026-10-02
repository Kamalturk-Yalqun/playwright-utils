import { Kafka } from 'kafkajs';

/* Default values for Kafka connection */
const defaultTimeout = 10000;
const defaultKafkaSessionTimeout = 30000;

type KafkaAuthMechanism = 'aws' | 'oauthbearer' | 'SCRAM-SHA-512';

interface KafkaUtilitySettings {
    broker: string[];
    authMechanism: KafkaAuthMechanism;
    timeout: number;
    sessionTimeout: number;
    clientId?: string;
    [key: string]: unknown;
}

interface KafkaConnection {
    username?: string;
    password?: string;
    [key: string]: unknown;
}

/**
 * Represents a utility class for interacting with Kafka.
 */
export class KafkaUtility {
    protected settings: KafkaUtilitySettings;
    protected connection: KafkaConnection;
    protected kafka: Kafka | null;

    /**
     * Creates an instance of KafkaUtility.
     * @param settings - The settings for the Kafka utility.
     * If not provided, the default settings for the brokers, auth mechanism and timeouts are used.
     */
    constructor(settings: Partial<KafkaUtilitySettings> = {}, connection: KafkaConnection = {}) {
        this.settings = {
            broker: [
                'BROKER_1',
                'BROKER_2',
                'BROKER_3',
            ],
            authMechanism: 'SCRAM-SHA-512',
            timeout: defaultTimeout,
            sessionTimeout: defaultKafkaSessionTimeout,
            ...settings,
        } as KafkaUtilitySettings;

        this.connection = connection;
        this.kafka = null;
    }

    /**
     * Retrieves the Kafka instance using the values from the settings object and connection object.
     * The settings and connection object are set in the constructor of the class.
     */
    async getKafka(): Promise<Kafka> {
        const kafkaConfig: {
            brokers: string[];
            ssl: boolean;
            sasl: {
                mechanism: KafkaAuthMechanism;
                username?: string;
                password?: string;
                [key: string]: unknown;
            };
            clientId?: string;
        } = {
            brokers: this.settings.broker,
            ssl: true,
            sasl: {
                mechanism: this.settings.authMechanism,
                ...this.connection,
            },
        };

        if (this.settings.authMechanism === 'aws' || this.settings.authMechanism === 'oauthbearer') {
            kafkaConfig.clientId = this.settings.clientId;
        }

        this.kafka = new Kafka(kafkaConfig as any);

        return this.kafka;
    }
}
