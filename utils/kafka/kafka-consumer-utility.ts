import type { Admin, Consumer, EachMessagePayload } from 'kafkajs';
import { awsSecretsManager as aws } from '../aws';
import { customLogger as logger, utilities } from '../utilities';
import { KafkaUtility } from './kafka-utility';

type KafkaAuthMechanism = 'aws' | 'oauthbearer' | 'SCRAM-SHA-512';

interface KafkaConsumerSettings {
    broker: string[];
    authMechanism: KafkaAuthMechanism;
    timeout: number;
    sessionTimeout: number;
    clientId?: string;
    topic?: string;
    password?: string;
    userName?: string;
    [key: string]: unknown;
}

interface KafkaConnection {
    username?: string;
    password?: string;
    authorizationIdentity?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    [key: string]: unknown;
}

interface KafkaMessage {
    metadata: {
        eventGeneratedTimestamp: string | number | Date;
    };
    [key: string]: unknown;
}

type KafkaMessages = KafkaMessage | KafkaMessage[];

/**
 * Represents a utility class for consuming messages from Kafka.
 */
export class KafkaConsumerUtility extends KafkaUtility {
    readonly secretName: string;
    private admin?: Admin;
    private consumer?: Consumer;
    private groupId?: string;

    private get consumerSettings(): KafkaConsumerSettings {
        return this.settings as KafkaConsumerSettings;
    }

    /**
     * Creates a Kafka consumer utility.
     *
     * If settings are omitted, the default brokers, authentication mechanism,
     * and timeout values are used:
     *
     * The default settings are:
     * broker: [
     *     'BROKER_1',
     *     'BROKER_2',
     *     'BROKER_3',
     * ]
     * authMechanism: 'SCRAM-SHA-512'
     * timeout: 10000
     * sessionTimeout: 30000
     *
     * @param settings - Kafka consumer settings that override the defaults.
     * @param connection - KafkaJS SASL connection properties. When omitted, credentials
     * are loaded from AWS Secrets Manager. For IAM or OAuth bearer authentication,
     * provide `clientId` in `settings`.
     *
     * @see https://kafka.js.org/docs/configuration#sasl
     */
    constructor(settings: Partial<KafkaConsumerSettings> = {}, connection: KafkaConnection = {}) {
        super(settings, connection);

        // Check for a valid authMechanism
        const validAuthMechanisms: KafkaAuthMechanism[] = ['aws', 'oauthbearer', 'SCRAM-SHA-512'];
        if (!validAuthMechanisms.includes(this.consumerSettings.authMechanism)) {
            throw new Error(`Invalid authMechanism: ${this.consumerSettings.authMechanism}. Must be one of: ${validAuthMechanisms.join(', ')}`);
        }

        this.connection = connection;
        this.secretName = `${process.env.AWS_ENV}/qeautomationengine/AmazonMSK_consumer_whole-bat`;
    }

    /**
     * Creates a unique consumer group ID from the topic name and current timestamp.
     *
     * @param topicName - Topic used to construct the group ID.
     * @returns The generated consumer group ID.
     * @throws Error when `topicName` is not provided.
     */
    defaultGroupId(topicName?: string): string {
        const uniqueId = Date.now().toString().slice(-7);
        if (topicName) {
            return `${topicName}-playwright-${uniqueId}`;
        }

        throw new Error('Topic name is required');
    }

    /**
     * Retrieves the default connection object for the Kafka consumer utility.
     * This is used when the connection object is not provided.
     *
     * @returns SASL credentials loaded from AWS Secrets Manager.
     * @throws Error when `SECRET_ROLE_ARN` is not configured.
     */
    async getdefaultConnectionObject(): Promise<KafkaConnection> {
        const roleArn = process.env.SECRET_ROLE_ARN;
        if (!roleArn) {
            throw new Error('SECRET_ROLE_ARN is required');
        }

        const secretString = JSON.parse(await aws.getSecretFromAws(roleArn, this.secretName)) as {
            password: string;
            username: string;
        };
        this.consumerSettings.password = secretString.password;
        this.consumerSettings.userName = secretString.username;
        return {
            username: this.consumerSettings.userName,
            password: this.consumerSettings.password,
        };
    }

    /**
     * Opens a connection to Kafka and performs necessary setup operations to subscribe to the topic.
     *
     * @param topic - Topic to subscribe to.
     */
    async initializeAndSubscribe(topic: string): Promise<void> {
        //connect to kafka
        await this.createKafka();

        if (!this.kafka) {
            throw new Error('Kafka client was not initialized');
        }

        this.consumerSettings.topic = topic;
        this.groupId = this.defaultGroupId(this.consumerSettings.topic);
        this.admin = this.kafka.admin();
        this.consumer = this.kafka.consumer({
            groupId: this.groupId,
            sessionTimeout: this.consumerSettings.sessionTimeout,
        });

        // Connect to the Kafka broker
        await this.connectConsumer();

        // Subscribe to the Kafka topic
        await this.subscribeToTopic();
    }

    /**
     * Closes the connection to the Kafka broker.
     * Stops the consumer, resets offsets for the Kafka topic,
     * deletes the consumer group, and disconnects from the Kafka broker.
     */
    async closeConnection(): Promise<void> {
        if (!this.admin || !this.groupId || !this.consumerSettings.topic) {
            throw new Error('Kafka consumer is not initialized');
        }

        // Stop the consumer
        await this.stopConsumer();

        // Reset offsets for the Kafka topic
        await this.admin.resetOffsets({ groupId: this.groupId, topic: this.consumerSettings.topic, earliest: true });

        // Delete the consumer group
        await this.admin.deleteGroups([this.groupId]);

        // Disconnect from the Kafka broker
        await this.disconnectConsumer();
    }

    /**
     * Runs the Kafka consumer and retrieves messages from the specified topic.
     *
     * @param topic - Kafka topic from which to consume messages.
     * @param timeout - Milliseconds to consume before closing the connection. Defaults to the configured timeout.
     * @returns The deserialized messages consumed from the topic.
     */
    async runConsumer(topic: string, timeout?: number): Promise<Record<string, unknown>[]> {
        if (timeout) {
            this.consumerSettings.timeout = timeout;
            this.consumerSettings.sessionTimeout = timeout + 20000;
        }
        const messages: Record<string, unknown>[] = [];

        await this.initializeAndSubscribe(topic);

        if (!this.consumer) {
            throw new Error('Kafka consumer was not initialized');
        }

        // Run the consumer, search for message, and push the found message to the messages array
        await this.consumer.run({
            eachMessage: async ({ message }: EachMessagePayload): Promise<void> => {
                const messageString = message.value?.toString();
                if (!messageString) {
                    return;
                }

                const messageJson = JSON.parse(messageString) as Record<string, unknown>;
                messages.push(messageJson);
                logger.log('info', `received message from kafka topic ${this.consumerSettings.topic}: ${messageString}`);
            },
        });

        // Delay execution of close connection for a set time to wait for new messages to arrive
        await utilities.delay(this.consumerSettings.timeout);

        await this.closeConnection();

        // Return the array of messages
        return messages;
    }

    /**
     * Creates the Kafka client, loading default credentials when no connection was provided.
     */
    async createKafka(): Promise<void> {
        //if connection is not provided, build connection object from settings
        if (Object.keys(this.connection).length === 0) {
            this.connection = await this.getdefaultConnectionObject();
        }
        this.kafka = await this.getKafka();
    }

    /**
     * Connects the Kafka consumer to the broker.
     */
    async connectConsumer(): Promise<void> {
        if (!this.consumer) {
            throw new Error('Kafka consumer was not initialized');
        }

        await this.performConsumerOperation(
            () => this.consumer.connect(),
            `connected to kafka broker: ${this.consumerSettings.broker.toString()}`,
            `connection attempt failed to kafka broker(s): ${this.consumerSettings.broker.toString()}`,
        );
    }

    /**
     * Subscribes the Kafka consumer to the specified topic.
     */
    async subscribeToTopic(): Promise<void> {
        if (!this.consumer || !this.consumerSettings.topic) {
            throw new Error('Kafka consumer and topic must be initialized');
        }

        await this.performConsumerOperation(
            () => this.consumer.subscribe({ topic: this.consumerSettings.topic!, fromBeginning: true }),
            `subscribed to kafka topic(s): ${this.consumerSettings.topic}`,
            `subscribe failed to kafka topic(s): ${this.consumerSettings.topic}`,
        );
    }

    /**
     * Stops the Kafka consumer.
     */
    async stopConsumer(): Promise<void> {
        if (!this.consumer) {
            throw new Error('Kafka consumer was not initialized');
        }

        await this.performConsumerOperation(() => this.consumer.stop(), 'stopped consumer', 'failed to stop consumer');
    }

    /**
     * Disconnects the Kafka consumer from the broker.
     */
    async disconnectConsumer(): Promise<void> {
        if (!this.consumer) {
            throw new Error('Kafka consumer was not initialized');
        }

        await this.performConsumerOperation(() => this.consumer.disconnect(), 'disconnected from broker', 'failed to disconnect to broker');
    }

    /**
     * Runs a consumer operation and logs whether it succeeded or failed.
     *
     * @param operation - Asynchronous Kafka operation to execute.
     * @param successMessage - Message logged after a successful operation.
     * @param errorMessage - Message logged when the operation fails.
     */
    async performConsumerOperation(operation: () => Promise<unknown>, successMessage: string, errorMessage: string): Promise<void> {
        try {
            await operation();
            logger.log('info', successMessage);
        } catch (error) {
            logger.log('error', `${errorMessage} - error: ${error}`);
        }
    }

    /**
     * Filters Kafka messages by whether their generated timestamp falls within a time threshold.
     *
     * @param messages - A message, an array of messages, or no message.
     * @param minutesThreshold - Age threshold in minutes. Defaults to five; `null` disables filtering.
     * @returns The qualifying message or messages, or `null` when a single or absent message does not qualify.
     */
    filterMessagesByTime(messages?: KafkaMessages | null, minutesThreshold: number | null = 5): KafkaMessages | null {
        if (minutesThreshold === null) {
            return messages;
        }
        const thresholdTime = Date.now() - minutesThreshold * 60 * 1000;
        const isAfterThresholdTime = (message: KafkaMessage, timeThreshold: number): boolean => {
            const messageUtcTimeStamp = new Date(message.metadata.eventGeneratedTimestamp);
            const messageTime = new Date(messageUtcTimeStamp.getTime() - messageUtcTimeStamp.getTimezoneOffset() * 60 * 1000).getTime();
            return messageTime >= timeThreshold;
        };
        if (Array.isArray(messages)) {
            return messages.filter((messageJson) => isAfterThresholdTime(messageJson, thresholdTime));
        } else if (messages === null || messages === undefined) {
            return null;
        } else {
            return isAfterThresholdTime(messages, thresholdTime) ? messages : null;
        }
    }
}
