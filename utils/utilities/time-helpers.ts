/** Provides utility methods for obtaining and formatting system and local times. */
class TimeHelper {
    /**
     * Gets the current system time using the `en-US` locale.
     *
     * @returns The current local time for the system.
     */
    getSystemTime(): string {
        return new Date().toLocaleTimeString('en-US').toString();
    }

    /**
     * Gets the current system time in 24-hour format.
     *
     * @returns The current system time formatted using a 24-hour clock.
     */
    get24HourTime(): string {
        return new Date().toLocaleTimeString('en-US', { hour12: false }).toString();
    }

    /**
     * Gets the current local time for an IANA time zone.
     *
     * @param timeZone - IANA time-zone name for which to obtain the local time.
     * @returns The current local time in the specified time zone.
     */
    getLocalTime(timeZone: string): string {
        return new Date().toLocaleString('en-US', { timeZone }).slice(-11).trim();
    }

    /**
     * Converts a UTC date string to the existing local-wall-clock ISO representation.
     *
     * @param utcDateStr - UTC date string to format.
     * @returns The date and time formatted as a local ISO string.
     */
    formatToLocalISOString(utcDateStr: string): string {
        const date = new Date(utcDateStr);
        const timeZoneOffset = date.getTimezoneOffset() * 60 * 1000;
        return new Date(date.getTime() - timeZoneOffset).toISOString();
    }
}

export const timeHelper = new TimeHelper();
